import Optional from "optional-js";
import { BiFn, Fn, MultiFn } from "./types";
export interface Collection<T> extends Iterable<T> {
    get(i: number): T;
    length(): number;
}
export declare function last<T>(c: Collection<T>): T;
export declare function first<T>(c: Collection<T>): T;
export declare function isEmpty<T>(c: Collection<T>): boolean;
export interface MutableCollection<T> extends Collection<T> {
    set(idx: number, value: T): void;
}
export declare function ITERATOR_RESULT<T>(value: T): IteratorResult<T>;
export declare const TERMINAL_ITERATOR_RESULT: IteratorResult<any>;
export declare const EMPTY_ITERATOR: {
    next: () => IteratorReturnResult<any>;
};
export declare const EMPTY_COLLECTION: Collection<any>;
export declare function emptyMap<K, V>(): Map<K, V>;
export declare const EMPTY_SET: Set<unknown>;
export declare function emptySet<T>(): Set<T>;
export declare function singletonIterable<T>(value: T): Iterator<T>;
export declare function singleton<T>(value: T): Iterable<T>;
export declare function iteratorResult<T>(isDone: boolean, val: T): IteratorResult<T>;
export declare class ArrayWrapper<T> implements MutableCollection<T> {
    readonly array: T[];
    constructor(array: T[]);
    get(i: number): T;
    length(): number;
    [Symbol.iterator](): ArrayIterator<T>;
    set(i: number, value: T): void;
}
export declare function wrap<T>(array: T[]): ArrayWrapper<T>;
export declare class Deck<T> implements MutableCollection<T> {
    private array;
    private size;
    get(i: number): T;
    set(i: number, value: T): void;
    push(value: T): Deck<T>;
    pushAll(values: Iterable<T>): Deck<T>;
    pop(): T;
    top(): T;
    clear(): Deck<T>;
    length(): number;
    clone(): Deck<T>;
    [Symbol.iterator](): {
        next: () => IteratorResult<T, any>;
    };
}
export declare class Ring<T> implements Collection<T> {
    private maxSize;
    private data;
    private head;
    private size;
    constructor(maxSize: number);
    get(i: number): T;
    length(): number;
    private getHeadOff;
    push(value: T): void;
    pop(): T;
    pushHead(value: T): void;
    popHead(): T;
    [Symbol.iterator](): Iterator<T, any, any>;
}
export declare class IndexedDeck<T> extends Deck<T> {
    private index;
    push(value: T): IndexedDeck<T>;
    set(i: number, value: T): void;
    clear(): IndexedDeck<T>;
    indexOf(value: T): number;
    hasAny(i: Iterable<T>): boolean;
}
export declare function reverse<T>(c: Collection<T>): Collection<T>;
export declare function length<T>(it: Iterable<T>): number;
export declare function filter<T>(i: Iterable<T>, f: (t: T) => boolean): Generator<T>;
export declare function map<T, V>(i: Iterable<T>, f: (t: T) => V): Generator<V>;
export declare function zip<T1, T2>(i1: Iterable<T1>, i2: Iterable<T2>): Generator<[T1, T2]>;
export declare function zipTuple<T extends any[]>(...its: Iterable<any>[]): Generator<T>;
export declare function forEach<T>(i: Iterable<T>, f: (t: T) => void): void;
export declare function reduce<T>(i: Iterable<T>, f: (lh: T, rh: T) => T, start: T): T;
export declare function reduceFirst<T>(i: Iterable<T>, f: BiFn<T, T, T>): Optional<T>;
export declare function sub<T>(c: Collection<T>, start: number, length: number): Generator<T>;
export declare function all<T>(i: Iterable<T>, f: (t: T) => boolean): boolean;
export declare function any<T>(i: Iterable<T>, f: (t: T) => boolean): boolean;
export declare function iterIsEmpty<T>(i: Iterable<T>): boolean;
export declare function findFirst<T>(i: Iterable<T>, f?: (t: T) => boolean): Optional<T>;
export declare function chain<T>(i1: Iterable<T>, i2: Iterable<T>): Generator<T>;
export declare function butLast<T>(i: Iterable<T>): Generator<T>;
export declare function reversed<T>(c: Collection<T>): Generator<T>;
export declare function enumerate<T>(c: Iterable<T>): Generator<[T, number]>;
export declare function range(start: number, end: number): Generator<number>;
export declare function repeat<T>(value: T, count: number): Generator<T>;
export declare function cyclicRange(start: number, length: number): Generator<number, void, unknown>;
export declare function cyclicPairs(length: number): Generator<[number, number]>;
export declare function loopPairs<T>(i: Iterable<T>): Generator<[T, T]>;
export declare function slidingPairs<T>(i: Iterable<T>): Generator<[T, T]>;
export declare function slidingWindow<T>(i: Iterable<T>, size: number): Generator<T[]>;
export declare function join<T>(i: Iterable<T>, delim: T): Generator<T>;
export declare function take<T>(i: Iterable<T>, count: number): Generator<T>;
export declare function takeIterator<T>(iter: Iterator<T>, count: number): Generator<T>;
export declare function groups<T>(i: Iterable<T>, size: number): Generator<T[]>;
export declare function takeFirst<T>(i: Iterable<T>): Optional<T>;
export declare function toIterable<T>(iter: Iterator<T>): Iterable<T>;
export declare function skip<T>(i: Iterable<T>, count: number): Iterable<T>;
export declare function skipWhile<T>(i: Iterable<T>, f: (t: T) => boolean): Iterable<T>;
export declare function prefixNotEmpty<T>(prefix: Iterable<T>, i: Iterable<T>): Generator<T>;
export declare function rect(w: number, h: number): Generator<[number, number]>;
export declare function intersect<T>(lh: Set<T>, rh: Set<T>): Set<T>;
export declare function interpolate<T>(ii: Iterable<T>, f: MultiFn<[T, T, number], T>, points?: number[]): Generator<T>;
export type Deiterable<T> = T extends Iterable<infer T1> ? T1 : never;
export declare function flatten<T>(i: Iterable<Iterable<T>>): Generator<T>;
export declare function flatMap<T, U>(i: Iterable<T>, f: (t: T) => Iterable<U>): Generator<U>;
export declare function toMap<T, K, V>(i: Iterable<T>, keyMapper: Fn<T, K>, valueMapper: Fn<T, V>): Map<K, V>;
export declare function toObject<T, U>(i: Iterable<T>, keyMapper: Fn<T, keyof U>, valueMapper: Fn<T, any>): U;
export declare function group<T, K, V>(i: Iterable<T>, keyMapper: Fn<T, K>, valueMapper: Fn<T, V>): Map<K, V[]>;
export declare function groupEntries<T, K, V>(i: Iterable<T>, keyMapper: Fn<T, K>, valueMapper: Fn<T, V>): Generator<[K, V[]]>;
export declare function getOrCreate<K, V>(map: Map<K, V>, key: K, value: Fn<K, V>): V;
export declare function getOrDefault<K, V>(map: Map<K, V>, key: K, def: V): V;
export declare function getOrDefaultF<K, V>(map: Map<K, V>, key: K, def: Fn<K, V>): V;
export interface MapBuilder<K, V> {
    add(k: K, v: V): this;
    build(): Map<K, V>;
}
export declare function mapBuilder<K, V>(): MapBuilder<K, V>;
export declare function reverseMap<K, V>(map: Map<K, V>): Map<V, K>;
//# sourceMappingURL=collections.d.ts.map