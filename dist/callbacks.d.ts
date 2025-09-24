import { Draft } from "immer";
import Optional from "optional-js";
import { DirectionalGraph } from "./graph";
import { BiConsumer, BiFunction, BiPredicate, Consumer, Function, MultiFunction, SingleTuple, Supplier, Transform } from "./types";
export type ChangeCallback<T> = BiConsumer<T, number>;
export type Disconnector = Consumer<void>;
export declare function arrayEq<T>(arr1: T[], arr2: T[], eqf?: BiPredicate<T, T>): boolean;
export declare function objectEq(obj1: any, obj2: any): boolean;
export type Signal<Args extends any[] = []> = {
    call(...args: Args): void;
    subscribe(handler: Consumer<Args>): Disconnector;
};
export interface Source<T> {
    readonly name: string;
    get(): T;
    mods(): number;
    subscribe(cb: ChangeCallback<T>, lastMods?: number): Disconnector;
    depends(value: any): Optional<number>;
}
export interface Destination<T> {
    set(value: T): void;
    setPromiseOrDispose(mod: Function<T, Promise<T>>): Promise<boolean>;
    modImmer(mod: Consumer<Draft<T>>): void;
    mod(mod: Transform<T>): void;
}
export type Disposable = {
    dispose(): Promise<void>;
};
export declare function disposer<T extends Disposable>(): Function<T, Promise<void>>;
export declare function disposable(disconnector: Disconnector): Disposable;
export declare function dispose(...disp: Disposable[]): void;
declare abstract class BaseSource<T> implements Source<T> {
    readonly name: string;
    private handlers;
    constructor(name?: string);
    subscribe(cb: ChangeCallback<T>, lastMods?: number): Disconnector;
    protected firstSubscribe(): void;
    protected lastDisconnect(): void;
    protected hasSubscriptions(): boolean;
    protected notify(value: T, mods: number): void;
    abstract get(): T;
    abstract mods(): number;
    abstract depends(value: any): Optional<number>;
}
declare class ConstSource<T> implements Source<T>, Disposable {
    readonly name: string;
    private value;
    private disposer;
    constructor(name: string | undefined, value: T, disposer: Consumer<T>);
    get(): T;
    mods(): number;
    depends(value: any): Optional<number>;
    subscribe(_: ChangeCallback<T>): Disconnector;
    dispose(): Promise<void>;
}
export declare function constSource<T>(name: string, val: T, disposer?: Consumer<T>): ConstSource<T>;
export interface ValueBuilder<T> {
    readonly name?: string;
    readonly value: T;
    readonly disposer?: Consumer<T>;
    readonly eq?: BiPredicate<T, T>;
    readonly setter?: BiFunction<T, T, T>;
}
export declare class BaseValue<T> extends BaseSource<T> implements Disposable {
    protected value: T;
    private disposer;
    private eq;
    private settter;
    private modsCount;
    constructor(builder: ValueBuilder<T>, value?: T, disposer?: Consumer<T>, eq?: BiPredicate<T, T>, settter?: BiFunction<T, T, T>, modsCount?: number);
    set(newValue: T): void;
    setPromiseOrDispose(mod: Function<T, Promise<T>>): Promise<boolean>;
    private setImpl;
    protected setOrDispose(newValue: T): void;
    protected isSameValue(value: T): boolean;
    dispose(): Promise<void>;
    get(): T;
    modImmer(mod: Consumer<Draft<T>>): void;
    mod(mod: Transform<T>): void;
    mods(): number;
    depends(value: any): Optional<number>;
    protected disposeValue(value: T): void;
}
export declare class Value<T> extends BaseValue<T> implements Destination<T>, Source<T> {
}
export declare class ValuesMap<T> {
    private map;
    constructor(map: Map<keyof T, Value<T[keyof T]>>);
    get<K extends keyof T>(key: K): Value<T[K]>;
    getObject(): T;
    set(values: T): void;
    handle(values: ValuesContainer, handler: Consumer<T>): void;
}
export declare function toValuesMap<T>(obj: T, def: T, values: ValuesContainer): ValuesMap<T>;
export declare function valueBuilder<T>(builder: ValueBuilder<T>): Value<T>;
export declare function value<T>(name: string, value: T): Value<T>;
export interface ProxyValueBuilder<T> extends ValueBuilder<T> {
    readonly source: Supplier<T>;
    readonly signalConnector: Function<Consumer<void>, Disconnector>;
}
declare class ProxyValue<T> extends BaseValue<T> {
    private source;
    private signalConnector;
    private disconnector;
    constructor(builder: ProxyValueBuilder<T>);
    protected firstSubscribe(): void;
    protected lastDisconnect(): void;
}
export declare function proxyBuilder<T>(builder: ProxyValueBuilder<T>): ProxyValue<T>;
export declare function proxy<T>(source: Supplier<T>, signalConnector: Function<Consumer<void>, Disconnector>): ProxyValue<T>;
export interface ProxyValueAsyncBuilder<T> extends ValueBuilder<T> {
    readonly source: Supplier<Promise<T>>;
    readonly signalConnector: Function<Consumer<void>, Disconnector>;
}
declare class ProxyValueAsync<T> extends Value<T> {
    private source;
    private signalConnector;
    private disconnector;
    constructor(builder: ProxyValueAsyncBuilder<T>);
    protected firstSubscribe(): void;
    protected lastDisconnect(): void;
}
export declare function proxyAsyncBuilder<T>(builder: ProxyValueAsyncBuilder<T>): ProxyValueAsync<T>;
export declare function proxyAsync<T>(source: Supplier<Promise<T>>, signalConnector: Function<Consumer<void>, Disconnector>): Promise<ProxyValueAsync<T>>;
export declare function proxyAsyncImmediate<T>(value: T, source: Supplier<Promise<T>>, signalConnector: Function<Consumer<void>, Disconnector>): ProxyValueAsync<T>;
export interface TransformValueBuilder<S extends any[], D> extends ValueBuilder<D> {
    readonly source: Source<SingleTuple<S>>;
    readonly transformer: MultiFunction<[SingleTuple<S>, D], D>;
    readonly srcConnector?: BiFunction<SingleTuple<S>, BaseValue<D>, Disconnector>;
}
export declare const TRANSFORM_PLACEHOLDER: {};
export declare class TransformValue<S extends any[], D> extends BaseValue<D> {
    private source;
    private transformer;
    private srcValueConnector;
    private srcValueDisconnector;
    private disconnector;
    private lastSrcMods;
    constructor(builder: TransformValueBuilder<S, D>);
    firstSubscribe(): void;
    lastDisconnect(): void;
    set(newValue: D): void;
    protected setOrDispose(newValue: D): void;
    protected disposeValue(value: D): void;
    private transform;
    private actualize;
    mods(): number;
    get(): D;
    depends(value: any): Optional<number>;
}
export declare function transformedBuilder<S extends any[], D>(builder: TransformValueBuilder<S, D>): TransformValue<S, D>;
export declare function transformed<S, D>(source: Source<S>, transformer: Function<S, D>, srcConnector?: BiFunction<S, BaseValue<D>, Disconnector>): TransformValue<[S], D>;
export type TransformedInitialValue<T> = {
    value: T;
    mods: number;
};
export declare function initial<T>(value: T): TransformedInitialValue<T>;
export interface TransformValueAsyncBuilder<S extends any[], D> extends Omit<ValueBuilder<D>, 'value'> {
    readonly source: Source<SingleTuple<S>>;
    readonly initialValue?: TransformedInitialValue<D>;
    readonly transformer: Function<SingleTuple<S>, Promise<D>>;
    readonly srcConnector?: BiFunction<SingleTuple<S>, BaseValue<D>, Disconnector>;
}
export declare class TransformValueAsync<S extends any[], D> extends BaseValue<D> {
    private source;
    private transformer;
    private srcValueConnector;
    private disconnector;
    private srcValueDisconnector;
    private lastSrcMods;
    private currentId;
    constructor(builder: TransformValueAsyncBuilder<S, D>);
    firstSubscribe(): void;
    lastDisconnect(): void;
    dispose(): Promise<void>;
    forceReload(): Promise<void>;
    private reloadImpl;
    private actualize;
    mods(): number;
    get(): D;
    depends(value: any): Optional<number>;
    set(newValue: D): void;
    protected setOrDispose(newValue: D): void;
    protected disposeValue(value: D): void;
}
export declare function transformedAsyncBuilder<S extends any[], D>(builder: TransformValueAsyncBuilder<S, D>): TransformValueAsync<S, D>;
export declare function transformedAsync<S, D>(name: string, source: Source<S>, transformer: Function<S, Promise<D>>, srcConnector?: BiFunction<S, BaseValue<D>, Disconnector>): Promise<TransformValueAsync<[S], D>>;
type SourcefyArray<T> = {
    [P in keyof T]: Source<T[P]>;
};
export interface TupleBuilder<Args extends any[]> extends Omit<ValueBuilder<Args>, 'value'> {
    sources: SourcefyArray<Args>;
}
declare class Tuple<Args extends any[]> extends BaseValue<Args> {
    private sources;
    private lastSrcMods;
    private disconnectors;
    private order;
    constructor(builder: TupleBuilder<Args>);
    firstSubscribe(): void;
    private actualize;
    set(newValue: Args): void;
    protected setOrDispose(newValue: Args): void;
    get(): Args;
    mods(): number;
    depends(value: any): Optional<number>;
    lastDisconnect(): void;
}
export declare function tuple<Args extends any[]>(...sources: SourcefyArray<Args>): Tuple<Args>;
export declare class ValuesContainer implements Disposable {
    readonly name: string;
    readonly parent?: ValuesContainer | undefined;
    private tupleCache;
    readonly graph: DirectionalGraph<Disposable>;
    readonly children: Map<string, ValuesContainer>;
    constructor(name: string, parent?: ValuesContainer | undefined);
    tuple<Tuple extends any[]>(srcs: SourcefyArray<Tuple>): Source<SingleTuple<Tuple>>;
    private find;
    size(): number;
    addDisconnector(disconnector: Disconnector): void;
    addDisposable<T extends Disposable>(value: T): T;
    createChild(name: string): ValuesContainer;
    addSubscribed<T>(value: Source<T>, cb: ChangeCallback<T>): void;
    depends(value: any): Optional<number>;
    const<T>(name: string, v: T, disposer?: Consumer<T>): Source<T>;
    value<T>(name: string, v: T): Value<T>;
    valueBuilder<T>(builder: ValueBuilder<T>): Value<T>;
    proxyBuilder<T>(builder: ProxyValueBuilder<T>): ProxyValue<T>;
    proxyAsyncBuilder<T>(builder: ProxyValueAsyncBuilder<T>): ProxyValueAsync<T>;
    transformedSelf<S, D>(name: string, source: Source<S>, init: D, transformer: BiFunction<S, D, D>, valueBuilder?: Omit<ValueBuilder<D>, 'value'>): TransformValue<[S], D>;
    transformed<S, D>(name: string, source: Source<S>, transformer: Function<S, D>, valueBuilder?: Omit<ValueBuilder<D>, 'value'>): TransformValue<[S], D>;
    fields<S, Keys extends keyof S>(name: string, source: Source<S>, ...fields: Keys[]): TransformValue<[S], Pick<S, Keys>>;
    field<S, Key extends keyof S>(name: string, source: Source<S>, field: Key, valueBuilder?: Omit<ValueBuilder<S[Key]>, 'value'>): TransformValue<[S], S[Key]>;
    transformedSelfTuple<S extends any[], D>(name: string, srcs: SourcefyArray<S>, init: D, transformer: BiFunction<S, D, D>, valueBuilder?: Omit<ValueBuilder<D>, 'value'>): TransformValue<S, D>;
    transformedTuple<S extends any[], D>(name: string, srcs: SourcefyArray<S>, transformer: Function<S, D>, valueBuilder?: Omit<ValueBuilder<D>, 'value'>): TransformValue<S, D>;
    transformedAsyncBuilder<S, D>(builder: TransformValueAsyncBuilder<[S], D>): TransformValueAsync<[S], D>;
    transformedAsyncTupleBuilder<S extends any[], D>(builder: TransformValueAsyncBuilder<S, D>): TransformValueAsync<S, D>;
    transformedAsyncTuple<S extends any[], D>(name: string, srcs: SourcefyArray<S>, transformer: Function<S, Promise<D>>, disposer?: Consumer<D>, srcConnector?: BiFunction<S, BaseValue<D>, Disconnector>): Promise<TransformValueAsync<S, D>>;
    transformedAsync<S, D>(name: string, source: Source<S>, transformer: Function<S, Promise<D>>, disposer?: Consumer<D>, srcConnector?: BiFunction<S, BaseValue<D>, Disconnector>): Promise<TransformValueAsync<[S], D>>;
    handle<Srcs extends any[]>(srcs: SourcefyArray<Srcs>, handler: Consumer<SingleTuple<Srcs>>): Disconnector;
    handleStandalone<Srcs extends any[]>(srcs: SourcefyArray<Srcs>, handler: Consumer<SingleTuple<Srcs>>): void;
    signal<Args extends any[]>(): Signal<Args>;
    initialize<T>(init: Function<ValuesContainer, T>): T;
    initializeAsync<T>(init: Function<ValuesContainer, Promise<T>>): Promise<T>;
    remove(value: Disposable): Promise<void>;
    dispose(): Promise<void>;
}
export {};
//# sourceMappingURL=callbacks.d.ts.map