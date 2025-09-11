import Optional from "optional-js";
import { cyclic } from "./mathutils";
import { BiFunction, Function, MultiFunction } from "./types";

export interface Collection<T> extends Iterable<T> {
  get(i: number): T;
  length(): number;
}

export function last<T>(c: Collection<T>): T { return c.get(c.length() - 1) }
export function first<T>(c: Collection<T>): T { return c.get(0) }
export function isEmpty<T>(c: Collection<T>): boolean { return c.length() === 0 }

export interface MutableCollection<T> extends Collection<T> {
  set(idx: number, value: T): void;
}

export function ITERATOR_RESULT<T>(value: T): IteratorResult<T> { return { value, done: false } };
export const TERMINAL_ITERATOR_RESULT: IteratorResult<any> = { value: null, done: true };
export const EMPTY_ITERATOR = { next: () => TERMINAL_ITERATOR_RESULT };
export const EMPTY_COLLECTION: Collection<any> = {
  get: (i: number) => undefined,
  length: () => 0,
  [Symbol.iterator]: () => EMPTY_ITERATOR
}
const EMPTY_MAP = new Map();
export function emptyMap<K, V>(): Map<K, V> {
  return EMPTY_MAP;
}

export const EMPTY_SET = new Set();
export function emptySet<T>(): Set<T> {
  return EMPTY_SET as Set<T>;
}

export function singletonIterable<T>(value: T): Iterator<T> {
  let done = false;
  return {
    next: () => {
      const result = iteratorResult(done, value);
      done = true;
      return result;
    }
  }
}

export function singleton<T>(value: T): Iterable<T> {
  return { [Symbol.iterator]: () => singletonIterable(value) }
}

export function iteratorResult<T>(isDone: boolean, val: T): IteratorResult<T> {
  return isDone ? TERMINAL_ITERATOR_RESULT : ITERATOR_RESULT(val);
}

export class ArrayWrapper<T> implements MutableCollection<T> {
  constructor(readonly array: T[]) { };
  get(i: number) { return this.array[i] }
  length() { return this.array.length }
  [Symbol.iterator]() { return this.array.values(); }
  set(i: number, value: T) { this.array[i] = value }
}
export function wrap<T>(array: T[]) { return new ArrayWrapper(array) }

export class Deck<T> implements MutableCollection<T> {
  private array: T[] = [];
  private size = 0;

  public get(i: number) { return this.array[i] }

  public set(i: number, value: T) {
    if (i < 0 || i >= this.size) throw new Error(`Invalid set position: ${i}, size:${this.size}`);
    this.array[i] = value;
  }

  public push(value: T): Deck<T> {
    this.array[this.size++] = value;
    return this;
  }

  public pushAll(values: Iterable<T>): Deck<T> {
    for (const val of values) this.push(val);
    return this;
  }

  public pop(): T {
    return this.array[--this.size];
  }

  public top(): T {
    return this.array[this.size - 1];
  }

  public clear(): Deck<T> {
    this.size = 0;
    return this;
  }

  public length() {
    return this.size;
  }

  public clone() {
    const copy = new Deck<T>();
    copy.array = [...take(this.array, this.size)];
    copy.size = this.size;
    return copy;
  }

  public [Symbol.iterator]() {
    let i = 0;
    return this.size === 0
      ? EMPTY_ITERATOR
      : { next: () => { return iteratorResult(i === this.size, this.array[i++]) } }
  }
}

export class Ring<T> implements Collection<T> {
  private data: T[];
  private head = 0;
  private size = 0;

  constructor(private maxSize: number) {
    this.data = new Array(maxSize);
  }

  get(i: number): T { return this.data[cyclic(this.head + i, this.maxSize)] }
  length(): number { return this.size }

  private getHeadOff(off: number) {
    return cyclic(this.head + off, this.maxSize);
  }

  push(value: T) {
    if (this.length() === this.maxSize) throw new Error();
    this.data[this.getHeadOff(this.size)] = value;
    this.size++;
  }

  pop(): T {
    if (this.length() === 0) throw new Error();
    const off = this.getHeadOff(this.size - 1);
    const value = this.data[off];
    this.data[off] = null as T;
    this.size--;
    return value;
  }

  pushHead(value: T) {
    if (this.length() === this.maxSize) throw new Error();
    this.head = cyclic(this.head - 1, this.maxSize);
    this.data[this.getHeadOff(0)] = value;
    this.size++;
  }

  popHead() {
    if (this.length() === 0) throw new Error();
    const value = this.data[this.head];
    this.data[this.head] = null as T;
    this.head = cyclic(this.head + 1, this.maxSize);
    this.size--;
    return value;
  }

  [Symbol.iterator](): Iterator<T, any, any> {
    let i = 0;
    return this.size === 0
      ? EMPTY_ITERATOR
      : { next: () => iteratorResult(i === this.size, this.get(i++)) }
  }
}

export class IndexedDeck<T> extends Deck<T> {
  private index = new Map<T, number>();

  public push(value: T): IndexedDeck<T> {
    if (this.index.has(value)) return this;
    super.push(value);
    this.index.set(value, this.length() - 1);
    return this;
  }

  public set(i: number, value: T) {
    const last = this.get(i);
    super.set(i, value);
    this.index.delete(last);
    this.index.set(value, i);
  }

  public clear(): IndexedDeck<T> {
    super.clear();
    this.index.clear();
    return this;
  }

  public indexOf(value: T) {
    return getOrDefault(this.index, value, -1);
  }

  public hasAny(i: Iterable<T>): boolean {
    for (const v of i) if (this.indexOf(v) !== -1) return true;
    return false;
  }
}

export function reverse<T>(c: Collection<T>): Collection<T> {
  return isEmpty(c)
    ? EMPTY_COLLECTION
    : {
      get: (i: number) => c.get(c.length() - 1 - i),
      length: () => c.length(),
      [Symbol.iterator]: () => reversed(c)
    }
}

export function length<T>(it: Iterable<T>): number {
  let length = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of it) length++;
  return length;
}

export function* filter<T>(i: Iterable<T>, f: (t: T) => boolean): Generator<T> {
  for (const v of i) if (f(v)) yield v;
}

export function* map<T, V>(i: Iterable<T>, f: (t: T) => V): Generator<V> {
  for (const v of i) yield f(v);
}

export function* zip<T1, T2>(i1: Iterable<T1>, i2: Iterable<T2>): Generator<[T1, T2]> {
  const iter1 = i1[Symbol.iterator]();
  const iter2 = i2[Symbol.iterator]();
  let v1 = iter1.next();
  let v2 = iter2.next();
  while (!v1.done && !v2.done) {
    yield [v1.value, v2.value];
    v1 = iter1.next();
    v2 = iter2.next();
  }
}

export function forEach<T>(i: Iterable<T>, f: (t: T) => void): void {
  for (const v of i) f(v);
}

export function reduce<T>(i: Iterable<T>, f: (lh: T, rh: T) => T, start: T): T {
  for (const v of i) start = f(start, v);
  return start;
}

export function reduceFirst<T>(i: Iterable<T>, f: BiFunction<T, T, T>): Optional<T> {
  const ii = i[Symbol.iterator]();
  const first = ii.next();
  if (first.done) return Optional.empty();
  let start = first.value;
  for (let v = ii.next(); !v.done; v = ii.next()) {
    start = f(start, v.value);
  }
  return Optional.of(start);
}

export function* sub<T>(c: Collection<T>, start: number, length: number): Generator<T> {
  for (let i = 0; i < length; i++) yield c.get(start + i);
}

export function all<T>(i: Iterable<T>, f: (t: T) => boolean): boolean {
  for (const t of i) if (!f(t)) return false;
  return true;
}

export function any<T>(i: Iterable<T>, f: (t: T) => boolean): boolean {
  for (const t of i) if (f(t)) return true;
  return false;
}

export function iterIsEmpty<T>(i: Iterable<T>): boolean {
  const ii = i[Symbol.iterator]();
  return ii.next().done ?? false;
}

export function findFirst<T>(i: Iterable<T>, f: (t: T) => boolean = _ => true): Optional<T> {
  for (const t of i) if (f(t)) return Optional.of(t);
  return Optional.empty();
}

export function* chain<T>(i1: Iterable<T>, i2: Iterable<T>): Generator<T> {
  for (const i of i1) yield i;
  for (const i of i2) yield i;
}

export function* butLast<T>(i: Iterable<T>): Generator<T> {
  const iter = i[Symbol.iterator]();
  let v1 = iter.next();
  if (v1.done) return;
  let v2 = iter.next();
  while (!v2.done) {
    yield v1.value;
    v1 = v2;
    v2 = iter.next();
  }
}

export function* reversed<T>(c: Collection<T>): Generator<T> {
  for (let i = c.length() - 1; i >= 0; i--) yield c.get(i);
}

export function* enumerate<T>(c: Iterable<T>): Generator<[T, number]> {
  let i = 0;
  for (const t of c) yield [t, i++];
}

export function* range(start: number, end: number): Generator<number> {
  const di = start > end ? -1 : 1;
  for (let i = start; i !== end; i += di) yield i;
}

export function* repeat<T>(value: T, count: number): Generator<T> {
  if (count <= 0) return;
  for (let i = 0; i < count; i++) yield value;
}

export function* cyclicRange(start: number, length: number) {
  if (start >= length) throw new Error(`${start} >= ${length}`);
  for (let i = 0; i < length; i++) yield cyclic(start + i, length);
}

export function* cyclicPairs(length: number): Generator<[number, number]> {
  if (length < 0) throw new Error(`${length} < 0`)
  for (let i = 0; i < length; i++) yield [i, cyclic(i + 1, length)];
}

export function* loopPairs<T>(i: Iterable<T>): Generator<[T, T]> {
  const iter = i[Symbol.iterator]();
  const first = iter.next();
  if (first.done) return;
  let lh = first;
  let rh = iter.next();
  while (!rh.done) {
    yield [lh.value, rh.value];
    lh = rh;
    rh = iter.next();
  }
  yield [lh.value, first.value];
}

export function* slidingPairs<T>(i: Iterable<T>): Generator<[T, T]> {
  const iter = i[Symbol.iterator]();
  const first = iter.next();
  if (first.done) return;
  let lh = first;
  let rh = iter.next();
  while (!rh.done) {
    yield [lh.value, rh.value];
    lh = rh;
    rh = iter.next();
  }
}

export function* slidingWindow<T>(i: Iterable<T>, size: number): Generator<T[]> {
  const iter = i[Symbol.iterator]();
  let window = [...takeIterator(iter, size)];
  if (window.length < size) return;
  yield window;
  for (; ;) {
    const item = iter.next();
    if (item.done) return;
    window = [...window.slice(1), item.value];
    yield window;
  }
}

export function* join<T>(i: Iterable<T>, delim: T): Generator<T> {
  const iter = i[Symbol.iterator]();
  let item = iter.next();
  if (item.done) return;
  for (; ;) {
    yield item.value;
    item = iter.next();
    if (item.done) return
    yield delim;
  }
}

export function take<T>(i: Iterable<T>, count: number): Generator<T> {
  const iter = i[Symbol.iterator]();
  return takeIterator(iter, count);
}

export function* takeIterator<T>(iter: Iterator<T>, count: number): Generator<T> {
  if (count < 0) return;
  while (count > 0) {
    const next = iter.next();
    if (next.done) return;
    yield next.value;
    count--;
  }
}

export function* groups<T>(i: Iterable<T>, size: number): Generator<T[]> {
  const iter = i[Symbol.iterator]();
  for (; ;) {
    const next = [...takeIterator(iter, size)];
    if (next.length === 0) return;
    else if (next.length !== size) throw Error();
    yield next;
  }
}

export function takeFirst<T>(i: Iterable<T>): Optional<T> {
  const iter = i[Symbol.iterator]();
  const item = iter.next();
  return item.done ? Optional.empty() : Optional.of(item.value);
}

export function toIterable<T>(iter: Iterator<T>): Iterable<T> {
  return {
    [Symbol.iterator]: () => {
      return {
        next: () => { return iter.next() }
      }
    }
  }
}

export function skip<T>(i: Iterable<T>, count: number): Iterable<T> {
  const iter = i[Symbol.iterator]();
  while (count > 0) {
    const v = iter.next();
    if (v.done) break;
    count--;
  }
  return toIterable(iter);
}

export function skipWhile<T>(i: Iterable<T>, f: (t: T) => boolean): Iterable<T> {
  const iter = i[Symbol.iterator]();
  for (; ;) {
    const v = iter.next();
    if (v.done || !f(v.value)) break;
  }
  return toIterable(iter);
}

export function* prefixNotEmpty<T>(prefix: Iterable<T>, i: Iterable<T>): Generator<T> {
  const iter = i[Symbol.iterator]();
  let item = iter.next();
  if (item.done) return;
  for (const p of prefix) yield p;
  while (!item.done) {
    yield item.value;
    item = iter.next();
  }
}

export function* rect(w: number, h: number): Generator<[number, number]> {
  if (w < 0) throw new Error(`${w} < 0`)
  if (h < 0) throw new Error(`${h} < 0`)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      yield [x, y]
}

export function intersect<T>(lh: Set<T>, rh: Set<T>): Set<T> {
  return new Set([...lh].filter(t => rh.has(t)));
}

export function* interpolate<T>(ii: Iterable<T>, f: MultiFunction<[T, T, number], T>, points = [0.5]): Generator<T> {
  const i = ii[Symbol.iterator]();
  let lh = i.next();
  if (lh.done) return;
  yield lh.value;
  let rh = i.next();
  while (!rh.done) {
    for (const p of points) yield f(lh.value, rh.value, p);
    yield rh.value;
    lh = rh;
    rh = i.next();
  }
}

export type Deiterable<T> = T extends Iterable<infer T1> ? T1 : never;

export function* flatten<T>(i: Iterable<Iterable<T>>): Generator<T> {
  const ii = i[Symbol.iterator]();
  let item = ii.next();
  while (!item.done) {
    for (const v of item.value) yield v;
    item = ii.next();
  }
}

export function toMap<T, K, V>(i: Iterable<T>, keyMapper: Function<T, K>, valueMapper: Function<T, V>): Map<K, V> {
  const map = new Map<K, V>();
  for (const item of i) map.set(keyMapper(item), valueMapper(item))
  return map;
}

export function toObject<T, U>(i: Iterable<T>, keyMapper: Function<T, keyof U>, valueMapper: Function<T, any>): U {
  const result = {} as U;
  for (const item of i) result[keyMapper(item)] = valueMapper(item);
  return result;
}

export function group<T, K, V>(i: Iterable<T>, keyMapper: Function<T, K>, valueMapper: Function<T, V>): Map<K, V[]> {
  const map = new Map<K, V[]>();
  for (const item of i) getOrCreate(map, keyMapper(item), _ => []).push(valueMapper(item));
  return map;
}

export function* groupEntries<T, K, V>(i: Iterable<T>, keyMapper: Function<T, K>, valueMapper: Function<T, V>): Generator<[K, V[]]> {
  const map = new Map<K, V[]>();
  for (const item of i) getOrCreate(map, keyMapper(item), _ => []).push(valueMapper(item));
  for (const e of map.entries()) yield e;
}

export function getOrCreate<K, V>(map: Map<K, V>, key: K, value: Function<K, V>) {
  let v = map.get(key);
  if (v === undefined) {
    v = value(key);
    map.set(key, v);
  }
  return v;
}

export function getOrDefault<K, V>(map: Map<K, V>, key: K, def: V) {
  const v = map.get(key);
  return v === undefined ? def : v;
}

export function getOrDefaultF<K, V>(map: Map<K, V>, key: K, def: Function<K, V>) {
  const v = map.get(key);
  return v === undefined ? def(key) : v;
}

export interface MapBuilder<K, V> {
  add(k: K, v: V): this;
  build(): Map<K, V>;
}

export function mapBuilder<K, V>(): MapBuilder<K, V> {
  const map = new Map<K, V>();
  const builder: MapBuilder<K, V> = {
    add: (k, v) => { map.set(k, v); return builder },
    build: () => map
  }
  return builder;
}

export function reverseMap<K, V>(map: Map<K, V>): Map<V, K> {
  const nmap = new Map<V, K>();
  map.forEach((v, k) => nmap.set(v, k));
  return nmap;
}