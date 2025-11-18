import { BiFunction } from "./types";
import { EMPTY_ITERATOR, ITERATOR_RESULT, TERMINAL_ITERATOR_RESULT, map } from "./collections";
import { int } from "./mathutils";

export type Node<T> = { obj: T, next: Node<T>, prev: Node<T> }

function createNil<T>(): Node<T> {
  const node = { obj: null } as Node<T>;
  node.next = node;
  node.prev = node;
  return node;
}

export class List<T> implements Iterable<T> {
  private nil = createNil<T>();

  constructor() {
    this.clear();
  }

  first(): Node<T> {
    return this.nil.next;
  }

  last(): Node<T> {
    return this.nil.prev;
  }

  terminator(): Node<T> {
    return this.nil;
  }

  pop(): T {
    if (this.last() === this.nil) throw new Error();
    const ret = this.last().obj;
    this.remove(this.last());
    return ret;
  }

  push(value: T): Node<T> {
    return this.insertAfter(value);
  }

  pushForward(value: T): Node<T> {
    return this.insertBefore(value);
  }

  pushAll(values: T[]): Node<T>[] {
    return values.map(v => this.insertAfter(v));
  }

  isEmpty(): boolean {
    return this.nil.next === this.nil;
  }

  insertNodeBefore(node: Node<T>, ref: Node<T> = this.nil.next): Node<T> {
    node.next = ref;
    node.prev = ref.prev;
    node.prev.next = node;
    ref.prev = node;
    return node;
  }

  insertBefore(val: T, ref: Node<T> = this.nil.next): Node<T> {
    return this.insertNodeBefore({ obj: val } as Node<T>, ref);
  }

  insertNodeAfter(node: Node<T>, ref: Node<T> = this.nil.prev): Node<T> {
    node.next = ref.next;
    node.next.prev = node;
    ref.next = node;
    node.prev = ref;
    return node;
  }

  insertAfter(val: T, ref: Node<T> = this.nil.prev): Node<T> {
    return this.insertNodeAfter({ obj: val } as Node<T>, ref);
  }

  remove(ref: Node<T>): Node<T> {
    if (ref === this.nil) throw new Error();
    ref.next.prev = ref.prev;
    ref.prev.next = ref.next;
    return ref;
  }

  clear() {
    this.nil.next = this.nil;
    this.nil.prev = this.nil;
  }

  [Symbol.iterator](): Iterator<T> {
    let pointer = this.first();
    return pointer === this.terminator()
      ? EMPTY_ITERATOR
      : {
        next: () => {
          if (pointer === this.terminator())
            return TERMINAL_ITERATOR_RESULT;
          else {
            const obj = pointer.obj;
            pointer = pointer.next;
            return ITERATOR_RESULT(obj);
          }
        }
      }
  }
}

export class FastList<T> implements Iterable<T> {
  private values: T[] = [];
  private ptrs: number[] = [];
  public length = 0;

  constructor() {
    this.clear();
  }

  private static nextOff(idx: number) { return idx * 2 }
  private static lastOff(idx: number) { return idx * 2 + 1 }

  insertAfter(value: T, after: number = this.ptrs[1]): number {
    if (after < 0 || after >= this.values.length || this.next(after) === -1) throw new Error();
    const idx = this.values.length;
    const next = this.next(after);
    this.values.push(value);
    this.ptrs.push(next, after);
    this.length++;
    this.ptrs[FastList.nextOff(after)] = idx;
    this.ptrs[FastList.lastOff(next)] = idx;
    return idx;
  }

  insertBefore(value: T, before: number = this.ptrs[0]): number {
    if (before < 0 || before >= this.values.length || this.next(before) === -1) throw new Error();
    const idx = this.values.length;
    const last = this.last(before);
    this.values.push(value);
    this.ptrs.push(before, last);
    this.length++;
    this.ptrs[FastList.nextOff(last)] = idx;
    this.ptrs[FastList.lastOff(before)] = idx;
    return idx;
  }

  remove(idx: number): T {
    if (idx <= 0 || idx >= this.values.length || this.next(idx) === -1) throw new Error();
    this.ptrs[FastList.nextOff(this.last(idx))] = this.next(idx);
    this.ptrs[FastList.lastOff(this.next(idx))] = this.last(idx);
    this.ptrs[FastList.nextOff(idx)] = -1;
    this.ptrs[FastList.lastOff(idx)] = -1;
    const elem = this.values[idx];
    this.values[idx] = null as T;
    this.length--;
    return elem;
  }

  clear() {
    this.values = [null as T];
    this.ptrs = [0, 0];
    this.length = 0;
  }

  get(idx: number): T { if (idx <= 0 || idx >= this.values.length || this.next(idx) === -1) throw new Error(); return this.values[idx] }
  next(idx: number): number { return this.ptrs[FastList.nextOff(idx)] }
  last(idx: number): number { return this.ptrs[FastList.lastOff(idx)] }
  push(value: T): number { return this.insertAfter(value) }
  pop() { return this.remove(this.last(0)) }
  first() { return this.next(0) }
  isEmpty() { return this.length === 0 }

  [Symbol.iterator](): Iterator<T> {
    let ptr = this.first();
    return ptr === 0
      ? EMPTY_ITERATOR
      : {
        next: () => {
          if (ptr === 0) return TERMINAL_ITERATOR_RESULT;
          else {
            const obj = this.get(ptr);
            ptr = this.next(ptr);
            return ITERATOR_RESULT(obj);
          }
        }
      }
  }
}