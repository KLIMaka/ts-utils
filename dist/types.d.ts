import Optional from "optional-js";
export type MultiFunction<Args extends any[], Res> = (...args: Args) => Res;
export type Function<T, U> = MultiFunction<[T], U>;
export type BiFunction<T1, T2, U> = MultiFunction<[T1, T2], U>;
export type Predicate<T> = Function<T, boolean>;
export type BiPredicate<T1, T2> = MultiFunction<[T1, T2], boolean>;
export type Supplier<T> = Function<void, T>;
export type MultiConsumer<Args extends any[]> = MultiFunction<Args, void>;
export type Consumer<T> = MultiConsumer<[T]>;
export type BiConsumer<T1, T2> = MultiConsumer<[T1, T2]>;
export type Transform<T> = Function<T, T>;
export type SingleTuple<T> = T extends [infer Item] ? Item : T;
export type First<T> = T extends [infer First, ...any] ? First : T extends Array<infer Item> ? Item : never;
export type Second<T> = T extends [any, infer Second, ...any] ? Second : T extends Array<infer Item> ? Item : never;
export type Rest<T> = T extends [any, ...infer Rest] ? Rest : never;
export type Last<T> = T extends [...any, infer Last] ? Last : never;
export type Iter<N extends number, IT extends any[] = []> = Length<IT> extends N ? IT : Iter<N, [any, ...IT]>;
export type Next<IT extends any[]> = [any, ...IT];
export type Prev<IT extends any[]> = IT extends readonly [any, ...infer Tail] ? Tail : [];
export type Length<IT extends readonly any[]> = IT['length'];
export type Take<T extends readonly any[], IT extends any[], O extends any[] = []> = Length<IT> extends 0 ? O : T extends readonly [infer Head, ...infer Tail] ? Take<Tail, Prev<IT>, [...O, Head]> : O;
export type Get<T extends readonly any[], N extends number> = Last<Take<T, Iter<N>>>;
export type Padd<T extends readonly any[], N extends number> = [...Iter<N>, ...T];
export type PaddRight<T extends readonly any[], N extends number> = [...T, ...Iter<N>];
export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;
export interface Result<T, E extends Error = Error> {
    onErr(consumer: Consumer<E>): this;
    onOk(consumer: Consumer<T>): this;
    isOk(): boolean;
    isErr(): boolean;
    getOk(): T;
    getErr(): E;
    unwrap(): T;
    map<U>(consumer: Function<T, U>): Result<U, E>;
    mapFlat<U>(consumer: Function<T, Result<U, E>>): Result<U, E>;
    mapAsync<U>(consumer: Function<T, Promise<U>>): Promise<Result<U, E>>;
    mapFlatAsync<U>(consumer: Function<T, Promise<Result<U, E>>>): Promise<Result<U, E>>;
    optional(): Optional<T>;
}
export declare class Err<E extends Error> implements Result<any, E> {
    private error;
    constructor(error: E);
    onErr(consumer: Consumer<E>): this;
    onOk(_: Consumer<any>): this;
    unwrap(): any;
    isOk(): boolean;
    isErr(): boolean;
    getOk(): any;
    getErr(): E;
    map(_: Function<any, any>): Result<any, E>;
    mapFlat(_: Function<any, Result<any, E>>): Result<any, E>;
    mapAsync(_: Function<any, Promise<any>>): Promise<Result<any, E>>;
    mapFlatAsync(_: Function<any, Promise<Result<any, E>>>): Promise<Result<any, E>>;
    optional(): Optional<any>;
}
export declare class Ok<T> implements Result<T> {
    private ok;
    constructor(ok: T);
    onErr(_: Consumer<Error>): this;
    onOk(consumer: Consumer<T>): this;
    unwrap(): T;
    isOk(): boolean;
    isErr(): boolean;
    getOk(): any;
    getErr(): Error;
    map<U>(consumer: Function<T, U>): Result<U>;
    mapFlat<U>(consumer: Function<T, Result<U>>): Result<U>;
    mapAsync<U>(consumer: Function<T, Promise<U>>): Promise<Result<U>>;
    mapFlatAsync<U>(consumer: Function<T, Promise<Result<U>>>): Promise<Result<U>>;
    optional(): Optional<T>;
}
export declare function toResult<T>(opt: Optional<T>): Result<T>;
export declare function result<T>(supplier: Supplier<T>): Result<T>;
export declare function resultAsync<T>(supplier: Supplier<Promise<T>>): Promise<Result<T>>;
export declare function unwrapOptionalPromise<T>(opt: Optional<Promise<T>>): Promise<Optional<T>>;
export declare function true_<T>(): Predicate<T>;
export declare function false_<T>(): Predicate<T>;
export declare function not<T>(pred: Predicate<T>): Predicate<T>;
export declare function nil<T>(): Consumer<T>;
export declare function identity<T>(): Transform<T>;
export declare function seq(...acts: Consumer<void>[]): Consumer<void>;
export declare function first<T extends any[]>(tuple: T): First<T>;
export declare function firstArg<T1, T2>(): BiFunction<T1, T2, T1>;
export declare function secondArg<T1, T2>(): BiFunction<T1, T2, T2>;
export declare function second<T extends any[]>(tuple: T): Second<T>;
export declare function tuple<T extends any[]>(...t: T): T;
export declare function pair<T, U>(t: T, u: U): [T, U];
export declare function refEq<T>(): BiPredicate<T, T>;
export interface Union<T, U> {
    get(): T | U;
    left(): T;
    right(): U;
    isLeft(): boolean;
}
export declare function left<T, U>(value: T): Union<T, U>;
export declare function right<T, U>(value: U): Union<T, U>;
//# sourceMappingURL=types.d.ts.map