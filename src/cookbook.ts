import { DirectionalGraph } from "./graph";
import { iter } from "./iter";
import { checkNotUndefined, field } from "./objects";
import { Task, TaskHandle } from "./scheduler";
import { BiFn, Fn, MultiFn, second } from "./types";

export type Recepie<Input extends any[], Output> = (...input: Input) => Promise<Output>
type Recepify<T> = { [P in keyof T]: Recepie<any, T[P]> }
type Arr<T> = T extends any[] ? T : never;

export function cookbook<Output>(factory: Fn<Cookbook<[]>, Task<Output, []>>): Task<Output, any> {
  const book = new Cookbook<[]>({} as any as Recepie<any, any>);
  const final = factory(book);
  return book.cook(final);
}

export function cookbookInput<Input extends any[], Output>(token: Input, factory: BiFn<Cookbook<Input>, Task<Input, any>, Task<Output, any>>): Task<Output, Arr<Input>> {
  const input = {} as any as Recepie<[], Input>;
  const book = new Cookbook<Input>(input);
  const final = factory(book, input);
  return book.cook(final);
}

function wrapRecepie<Input extends any[], Output>(label: string, recepie: Recepie<Input, Output>): Task<Output, Input> {
  return async (handle, ...args) => await handle.waitFor(recepie(...args), label);
}

export class Cookbook<GlobalInput> {
  private tasksGraph = new DirectionalGraph<Task<any, any>>();
  private args = new Map<Recepie<any, any>, Recepie<any, any>[]>();

  constructor(
    private input: Recepie<[], GlobalInput>
  ) {
    this.tasksGraph.addNode(this.input);
  }

  recepie<Input extends any[], Output>(label: string, args: Recepify<Input>, recepie: MultiFn<Input, Promise<Output>>): Task<Output, Input> {
    const wrapped = wrapRecepie(label, recepie);
    return this.paste(args, wrapped);
  }

  paste<Input extends any[], Output>(args: Recepify<Input>, task: Task<Output, Input>): Task<Output, Input> {
    this.tasksGraph.addNode(task);
    args.forEach(a => this.tasksGraph.add(a, task));
    this.args.set(task, args);
    return task;
  }

  private async cookRecepie(handle: TaskHandle, values: Map<Recepie<any, any>, any>, recepie: Recepie<any, any>): Promise<void> {
    const args = checkNotUndefined(this.args.get(recepie)).map(a => values.get(a));
    const result = await recepie(handle, ...args);
    values.set(recepie, result);
  }

  private extractGroups(recepie: Recepie<any, any>): Task<any, any>[][] {
    return iter(this.tasksGraph.ordered(recepie, 'from'))
      .groupEntries(field('order'), field('node'))
      .collect()
      .toSorted((l, r) => r[0] - l[0])
      .map(second)
      .filter(r => r[0] !== this.input);
  }

  private async runGroups<Output>(handle: TaskHandle, groups: Task<any, any>[][], values: Map<Recepie<any, any>, any>, recepie: Recepie<any, Output>) {
    const recepieHandle = handle.fork(groups.length);
    for (const group of groups) {
      const h = recepieHandle.fork(group.length);
      await Promise.all(group.map(r => this.cookRecepie(h, values, r)));
    }
    return values.get(recepie);
  }

  cook<Output>(recepie: Recepie<any, Output>): Task<Output, Arr<GlobalInput>> {
    const topoord = this.extractGroups(recepie);
    const values = new Map<Recepie<any, any>, any>();
    return async (handle, ...args) => {
      values.set(this.input, args);
      return this.runGroups(handle, topoord, values, recepie);
    }
  }
}