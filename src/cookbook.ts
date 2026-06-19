import { range } from "./collections";
import { direction, DirectionalGraph } from "./graph";
import { iter } from "./iter";
import { checkNotUndefined, field } from "./objects";
import { TaskHandle } from "./scheduler";
import { BiFn, Fn, MultiFn, second } from "./types";
import { Work } from "./work";

export type Recepie<Input extends any[], Output> = (...input: Input) => Promise<Output>
type Recepify<T> = { [P in keyof T]: Recepie<any, T[P]> }
type Arr<T> = T extends any[] ? T : never;

export function cookbook<Input>(): { input: Recepie<[], Input>, book: Cookbook<Input> } {
  const input = {} as any as Recepie<[], Input>;
  const book = new Cookbook<Input>(input);
  return { input, book };
}

export function cookbookWork<Input extends any[], Output>(token: Input, factory: BiFn<Cookbook<Input>, Work<any, Input>, Work<any, Output>>): Work<Arr<Input>, Output> {
  const { book, input } = cookbook<Input>();
  const final = factory(book, input);
  return book.extract(final);
}

function wrapRecepie<Input extends any[], Output>(label: string, recepie: Recepie<Input, Output>): Work<Input, Output> {
  return async (handle, ...args) => await handle.waitFor(recepie(...args), label);
}

export class Cookbook<GlobalInput> {
  private recepiesGraph = new DirectionalGraph<Work<any, any>>();
  private args = new Map<Recepie<any, any>, Recepie<any, any>[]>();

  constructor(
    private input: Recepie<[], GlobalInput>
  ) {
    this.recepiesGraph.addNode(this.input);
  }

  recepie<Input extends any[], Output>(label: string, args: Recepify<Input>, recepie: MultiFn<Input, Promise<Output>>): Work<Input, Output> {
    const wrapped = wrapRecepie(label, recepie);
    return this.paste(args, wrapped);
  }

  paste<Input extends any[], Output>(args: Recepify<Input>, work: Work<Input, Output>): Work<Input, Output> {
    this.recepiesGraph.addNode(work);
    args.forEach(a => this.recepiesGraph.add(a, work));
    this.args.set(work, args);
    return work;
  }

  chapter<Input extends any[], Output>(args: Recepify<Input>, factory: MultiFn<[Cookbook<Input>, Work<any, Input>, ...Input], Work<any, Output>>): Work<Input, Output> {
    const { book, input } = cookbook<Input>();
    return this.paste(args, async (handle, ...args) => {
      const work = factory(book, input, ...args);
      return book.cook(work, args)(handle);
    });
  }

  private async cookRecepie(handle: TaskHandle, values: Map<Recepie<any, any>, any>, recepie: Recepie<any, any>): Promise<void> {
    const args = checkNotUndefined(this.args.get(recepie)).map(a => values.get(a));
    const result = await recepie(handle, ...args);
    values.set(recepie, result);
  }

  private extractGroups(recepie: Recepie<any, any>): Work<any, any>[][] {
    return iter(this.recepiesGraph.ordered(recepie, 'from'))
      .groupEntries(field('order'), field('node'))
      .collect()
      .toSorted((l, r) => r[0] - l[0])
      .map(second)
      .filter(r => r[0] !== this.input);
  }

  private async runGroups<Output>(handle: TaskHandle, groups: Work<any, any>[][], values: Map<Recepie<any, any>, any>, recepie: Recepie<any, Output>) {
    const recepieHandle = handle.fork(groups.length);
    for (const group of groups) {
      const h = recepieHandle.fork(group.length);
      await Promise.all(group.map(r => this.cookRecepie(h, values, r)));
    }
    return values.get(recepie);
  }

  cook<Output>(recepie: Recepie<any, Output>, input: GlobalInput,): Work<[], Output> {
    const groups = this.extractGroups(recepie);
    const values = new Map<Recepie<any, any>, any>();
    values.set(this.input, input);
    return async handle => this.runGroups(handle, groups, values, recepie);
  }

  extract<Output>(recepie: Recepie<any, Output>): Work<Arr<GlobalInput>, Output> {
    const topoord = this.extractGroups(recepie);
    const values = new Map<Recepie<any, any>, any>();
    return async (handle, ...args) => {
      values.set(this.input, args);
      return this.runGroups(handle, topoord, values, recepie);
    }
  }
}