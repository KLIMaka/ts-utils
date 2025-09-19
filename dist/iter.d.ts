import Optional from "optional-js";
import { Deiterable } from "./collections";
import { Function } from "./types";
export declare class Iter<T> implements Iterable<T> {
    iter: Iterable<T>;
    static of<T>(iter: Iterable<T>): Iter<T>;
    static range(start: number, end: number): Iter<number>;
    constructor(iter: Iterable<T>);
    [Symbol.iterator](): Iterator<T, any, any>;
    filter(f: (t: T) => boolean): Iter<T>;
    map<U>(f: (t: T) => U): Iter<U>;
    zip<T1>(it: Iterable<T1>): Iter<[T, T1]>;
    join(separator: T): Iter<T>;
    forEach(f: (t: T) => void): Iter<T>;
    enumerate(): Iter<[T, number]>;
    take(count: number): Iter<T>;
    skip(count: number): Iter<T>;
    skipWhile(f: (t: T) => boolean): Iter<T>;
    reduce(f: (lh: T, rh: T) => T, start: T): T;
    reduceFirst(f: (lh: T, rh: T) => T): Optional<T>;
    all(f: (t: T) => boolean): boolean;
    any(f: (t: T) => boolean): boolean;
    isEmpty(): boolean;
    first(f?: (t: T) => boolean): Optional<T>;
    chain(i: Iterable<T>): Iter<T>;
    butLast(): Iter<T>;
    flatten(): Iter<Deiterable<T>>;
    flatMap<U>(f: (t: T) => Iterable<U>): Iter<U>;
    collect(): T[];
    set(): Set<T>;
    length(): number;
    toMap<K, V>(keyMapper: Function<T, K>, valueMapper: Function<T, V>): Map<K, V>;
    toObject<U>(keyMapper: Function<T, keyof U>, valueMapper: Function<T, any>): U;
    group<K, V>(keyMapper: Function<T, K>, valueMapper: Function<T, V>): Map<K, V[]>;
    groupEntries<K, V>(keyMapper: Function<T, K>, valueMapper: Function<T, V>): Iter<[K, V[]]>;
    await_(): Promise<Iter<Awaited<T>>>;
}
export declare function iter<T>(iter: Iterable<T>): Iter<T>;
//# sourceMappingURL=iter.d.ts.map