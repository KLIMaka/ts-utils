import Optional from "optional-js";
import { Consumer, Function, Supplier } from "./types";
import { Disposable } from "./callbacks";
export declare class LazyValue<T> {
    private initializer;
    private initialized;
    private value;
    constructor(initializer: Supplier<T>);
    get(): T;
}
export declare class Toggler<T> {
    private onValue;
    private offValue;
    private value;
    constructor(onValue: T, offValue: T, value?: boolean);
    toggle(): void;
    get(): T;
    set(value: boolean): void;
}
export declare function toggler<T>(onValue: T, offValue: T, value?: boolean): Toggler<T>;
export declare class CyclicToggler<T> {
    private values;
    private index;
    constructor(values: T[], index?: number);
    toggleNext(): T;
    togglePrev(): T;
    get(): T;
    set(value: T): T;
}
export declare function cyclicToggler<T>(values: T[], currentValue: T): CyclicToggler<T>;
export declare function promisify<T>(f: Supplier<T>): Supplier<Promise<T>>;
export declare function firstNot<T>(t1: T, t2: T, ref: T | null): Optional<T>;
export declare function firstNotNull<T>(t1: T, t2: T): Optional<T>;
export declare function objectKeys<T>(obj: T): (keyof T)[];
export declare function applyDefaults<T>(value: T, def: T): T;
export declare function applyNotNullish<T>(value: T, f: Consumer<T>): void;
export declare function applyNotNullishOr<T, U>(value: T, f: Function<T, U>, supplier: Supplier<U>): U;
export declare function field<T, K extends keyof T>(field: K): Function<T, T[K]>;
type Optionalify<T> = {
    [P in keyof T]: Optional<T[P]>;
};
export declare function andOptional<T extends any[]>(...opts: Optionalify<T>): Optional<T>;
export declare function asyncMapOptional<T, U>(src: Optional<T>, mapper: Function<T, Promise<U>>): Promise<Optional<U>>;
export declare function asyncOptional<T>(src: Optional<Promise<T>>): Promise<Optional<T>>;
export declare function zipOptional<T, U>(l: Optional<T>, r: Optional<U>): Optional<[T, U]>;
export declare function asyncFlatMapOptional<T, U>(src: Optional<T>, mapper: Function<T, Promise<Optional<U>>>): Promise<Optional<U>>;
export declare function strcmpci(str1: string, str2: string): boolean;
export declare function checkNotNull<T>(value: T | null, message: string): T;
export type Id = {
    value: number;
} & Disposable;
export declare class UniqueIds {
    private ids;
    private getEmpty;
    get(): Id;
}
export {};
//# sourceMappingURL=objects.d.ts.map