import Optional from "optional-js";
import { filter, map, reduce, forEach, all, enumerate, take, findFirst, chain, butLast, skip, any, iterIsEmpty, skipWhile, flatten, Deiterable, zip, join, length, toMap, reduceFirst, group, toObject, groupEntries, range, flatMap, zipTuple } from "./collections";
import { Fn } from "./types";

export class Iter<T> implements Iterable<T> {
  public static of<T>(iter: Iterable<T>) { return new Iter(iter) }
  static range(start: number, end: number): Iter<number> { return new Iter(range(start, end)) }

  constructor(public iter: Iterable<T>) { };
  [Symbol.iterator]() { return this.iter[Symbol.iterator]() }

  filter(f: (t: T) => boolean): Iter<T> { return new Iter(filter(this.iter, f)) }
  map<U>(f: (t: T) => U): Iter<U> { return new Iter(map(this.iter, f)) }
  zip<T1>(it: Iterable<T1>): Iter<[T, T1]> { return new Iter(zip(this.iter, it)) }
  zip2<T1, T2>(it1: Iterable<T1>, it2: Iterable<T2>): Iter<[T, T1, T2]> { return new Iter(zipTuple<[T, T1, T2]>(this.iter, it1, it2)) }
  zip3<T1, T2, T3>(it1: Iterable<T1>, it2: Iterable<T2>, it3: Iterable<T3>): Iter<[T, T1, T2, T3]> { return new Iter(zipTuple<[T, T1, T2, T3]>(this.iter, it1, it2, it3)) }
  join(separator: T): Iter<T> { return new Iter(join(this.iter, separator)) }
  forEach(f: (t: T) => void): Iter<T> { forEach(this.iter, f); return this }
  enumerate(): Iter<[T, number]> { return new Iter(enumerate(this.iter)) }
  take(count: number): Iter<T> { return new Iter(take(this.iter, count)) }
  skip(count: number): Iter<T> { return new Iter(skip(this.iter, count)) }
  skipWhile(f: (t: T) => boolean): Iter<T> { return new Iter(skipWhile(this.iter, f)) }
  reduce(f: (lh: T, rh: T) => T, start: T): T { return reduce(this.iter, f, start) }
  reduceFirst(f: (lh: T, rh: T) => T): Optional<T> { return reduceFirst(this.iter, f) }
  all(f: (t: T) => boolean): boolean { return all(this.iter, f) }
  any(f: (t: T) => boolean): boolean { return any(this.iter, f) }
  isEmpty(): boolean { return iterIsEmpty(this.iter) }
  first(f: (t: T) => boolean = _ => true): Optional<T> { return findFirst(this.iter, f) }
  chain(i: Iterable<T>): Iter<T> { return new Iter(chain(this.iter, i)) }
  butLast(): Iter<T> { return new Iter(butLast(this.iter)) }
  flatten(): Iter<Deiterable<T>> { return new Iter(flatten(this.iter as Iterable<Iterable<Deiterable<T>>>)) }
  flatMap<U>(f: (t: T) => Iterable<U>): Iter<U> { return new Iter(flatMap(this.iter, f)) }
  collect(): T[] { return [...this.iter] }
  set(): Set<T> { return new Set(this.iter) }
  length(): number { return length(this.iter) }
  toMap<K, V>(keyMapper: Fn<T, K>, valueMapper: Fn<T, V>): Map<K, V> { return toMap(this.iter, keyMapper, valueMapper) }
  toObject<U>(keyMapper: Fn<T, keyof U>, valueMapper: Fn<T, any>): U { return toObject(this.iter, keyMapper, valueMapper) }
  group<K, V>(keyMapper: Fn<T, K>, valueMapper: Fn<T, V>): Map<K, V[]> { return group(this.iter, keyMapper, valueMapper) }
  groupEntries<K, V>(keyMapper: Fn<T, K>, valueMapper: Fn<T, V>): Iter<[K, V[]]> { return new Iter(groupEntries(this.iter, keyMapper, valueMapper)) }
  async await_(): Promise<Iter<Awaited<T>>> { return new Iter(await Promise.all([...this.iter])) }
}

export function iter<T>(iter: Iterable<T>) {
  return Iter.of(iter);
}

