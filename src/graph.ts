import { match } from 'ts-pattern';
import { chain, getOrCreate, map, slidingPairs, reduce } from './collections';
import { iter } from './iter';
import { memoize } from './mathutils';
import { checkNotUndefined, field } from './objects';
import { Fn, Pred, true_ } from './types';

export type Links<T> = { to: Set<T>, from: Set<T> };
export type Direction = 'from' | 'to';
export function direction<T>(dir: Direction): Fn<Links<T>, Set<T>> {
  return match(dir)
    .returnType<Fn<Links<T>, Set<T>>>()
    .with('from', () => l => l.from)
    .with('to', () => l => l.to)
    .exhaustive();
}
export function opposite(dir: Direction): Direction {
  return dir === 'from' ? 'to' : 'from';
}

export class DirectionalGraph<T> {
  readonly nodes = new Map<T, Links<T>>();

  addNode(label: T) {
    return getOrCreate(this.nodes, label, _ => { return { to: new Set(), from: new Set() } });
  }

  add(from: T, to: T) {
    this.addNode(to).from.add(from)
    this.addNode(from).to.add(to);
  }

  addChain(chain: T[]) {
    for (const [c1, c2] of slidingPairs(chain)) this.add(c1, c2);
  }

  remove(n: T) {
    const node = this.nodes.get(n);
    if (node === undefined) return;
    node.to.forEach(n1 => this.nodes.get(n1)?.from.delete(n));
    node.from.forEach(n1 => this.nodes.get(n1)?.to.delete(n));
    this.nodes.delete(n);
  }

  orderNamed(start: T, dir: Direction = 'to'): number {
    return this.order(start, direction(dir));
  }

  order(start: T, dir = direction<T>('to')): number {
    const links = this.nodes.get(start);
    if (links === undefined) return 0;
    const flinks = dir(links);
    if (flinks.size === 0) return 0;
    return reduce(map(flinks, n => this.order(n, dir)), Math.max, 0) + 1;
  }

  orderedTo(node: T): T[] {
    return this.ordered(node, 'from')
      .sort(({ order: l }, { order: r }) => r - l)
      .map(field('node'));
  }


  ordered(start: T, dir: Direction): { node: T, order: number }[] {
    const result = new Set<T>();
    result.add(start);
    const dirf = direction<T>(dir);
    const oppositeDirF = direction<T>(opposite(dir));
    for (const n of result)
      dirf(checkNotUndefined(this.nodes.get(n)))
        .forEach(n => result.add(n));
    const order = memoize((n: T) => this.order(n, oppositeDirF));
    return [...result].map(node => ({ node, order: order(node) }));
  }

  orderedAll(dir: Direction = 'to') {
    return this.orderedOnly(true_(), dir);
  }

  orderedOnly(pred: Pred<T>, dir: Direction = 'to') {
    const dirF = direction<T>(dir);
    const order = memoize((n: T) => this.order(n, dirF));
    return [...this.nodes.keys().filter(pred)].sort((l, r) => order(r) - order(l));
  }

  findCycle(): T[] {
    const colors = new Map<T, 'black' | 'gray'>();
    const paint = (node: T, links: Links<T>): T[] => {
      colors.set(node, 'gray');
      for (const child of links.to) {
        const c = colors.get(child);
        if (c === undefined) {
          const cycle = paint(child, this.nodes.get(child) as Links<T>);
          if (cycle.length !== 0) { cycle.unshift(child); return cycle; }
        } else if (c === 'gray') return [child];
      }
      colors.set(node, 'black');
      return [];
    }
    for (const [node, links] of this.nodes.entries()) {
      if (colors.has(node)) continue;
      const cycle = paint(node, links);
      if (cycle !== null) return cycle;
    }
    return [];
  }

  subgraphs(): T[][] {
    const visited = new Set();
    const nodes = this.nodes;
    const collect: (node: T) => T[] = node => {
      if (visited.has(node)) return [];
      const { to, from } = nodes.get(node) as Links<T>;
      visited.add(node);
      const links = iter(chain(to, from))
        .map(collect)
        .flatten();
      return [node, ...links];
    }
    return iter(nodes.keys())
      .map(collect)
      .filter(a => a.length !== 0)
      .collect();
  }
}