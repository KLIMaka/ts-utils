import { range } from "./collections";
import { direction, DirectionalGraph } from "./graph";
import { iter } from "./iter";
import { checkNotUndefined, field } from "./objects";
import { TaskHandle } from "./scheduler";
import { Fn, MultiFn, second } from "./types";
import { Work } from "./work";

export type Recepie<Input extends any[], Output> = (...input: Input) => Promise<Output>
type Recepify<T> = { [P in keyof T]: Recepie<any, T[P]> }

export function cookbook<Input>(): { input: Recepie<[], Input>, book: Cookbook<Input> } {
  const input = {} as any as Recepie<[], Input>;
  const book = new Cookbook<Input>(input);
  return { input, book };
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
    return this.inject(args, wrapped);
  }

  inject<Input extends any[], Output>(args: Recepify<Input>, work: Work<Input, Output>): Work<Input, Output> {
    this.recepiesGraph.addNode(work);
    args.forEach(a => this.recepiesGraph.add(a, work));
    this.args.set(work, args);
    return work;
  }

  chapter<Input extends any[], Output>(args: Recepify<Input>, factory: MultiFn<[Cookbook<Input>, Work<any, Input>, ...Input], Work<any, Output>>): Work<Input, Output> {
    const { book, input } = cookbook<Input>();
    return this.inject(args, async (handle, ...args) => {
      const work = factory(book, input, ...args);
      return book.cook(work, args)(handle);
    });
  }

  private async cookRecepie(handle: TaskHandle, values: Map<Recepie<any, any>, any>, recepie: Recepie<any, any>): Promise<void> {
    const args = checkNotUndefined(this.args.get(recepie)).map(a => values.get(a));
    const result = await recepie(handle, ...args);
    values.set(recepie, result);
  }

  cook<Output>(recepie: Recepie<any, Output>, input: GlobalInput,): Work<[], Output> {
    const topoord = iter(this.recepiesGraph.ordered(recepie, 'from'))
      .groupEntries(field('order'), field('node'))
      .collect()
      .toSorted((l, r) => r[0] - l[0])
      .map(second)
      .filter(r => r[0] !== this.input);
    const values = new Map<Recepie<any, any>, any>();
    values.set(this.input, input);
    return async handle => {
      const recepieHandle = handle.fork(topoord.length);
      for (const group of topoord) {
        const h = recepieHandle.fork(group.length);
        await Promise.all(group.map(r => this.cookRecepie(h, values, r)));
      }
      return values.get(recepie);
    }
  }
}