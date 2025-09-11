export type InstanceProvider<T> = (i: Injector) => Promise<T>;
export type Plugin<T> = {
    start: InstanceProvider<T>;
    stop: InstanceProvider<void>;
};
export declare class Dependency<_T> {
    readonly name: string;
    readonly isVoid: boolean;
    constructor(name: string, isVoid?: boolean);
}
export type SubModule = (module: Module) => void;
export declare function provider<T>(start: InstanceProvider<T>): Plugin<T>;
export declare function instance<T>(value: T): Plugin<T>;
export declare function plugin(name: string): Dependency<unknown>;
export type Lifecycle = <T>(value: T, cleaner: (value: T) => Promise<void>) => T;
export declare function lifecycle<T>(start: (i: Injector, lifecycle: Lifecycle) => Promise<T>): Plugin<T>;
export interface Module {
    bind<T>(dependency: Dependency<T>, provider: Plugin<T>): void;
    install(submodule: SubModule): void;
}
export interface Injector {
    getInstance<T>(dependency: Dependency<T>): Promise<T>;
}
export interface Runtime extends Injector {
    stop(): Promise<void>;
    replaceInstance<T>(dependency: Dependency<T>, provider: Plugin<T>): Promise<void>;
}
export declare class DependencyError extends Error {
    cause: Error;
    constructor(message: string, cause: Error);
}
export interface LifecycleListener {
    start<T>(dep: Dependency<T>, promise: Promise<T>): Promise<T>;
    stop<T>(dep: Dependency<T>, promise: Promise<void>): Promise<void>;
}
export declare class App implements Module {
    private listener;
    private plugins;
    constructor(listener?: LifecycleListener);
    bind<T>(dependency: Dependency<T>, plugin: Plugin<T>): void;
    install(submodule: SubModule): void;
    start(): Promise<Runtime>;
    private doStart;
}
export declare const RUNTIME: Dependency<Runtime>;
type Dependencyfy<T> = {
    [P in keyof T]: Dependency<T[P]>;
};
export declare function create<U, T extends any[]>(injector: Injector, ctr: {
    new (...args: T): U;
}, ...args: Dependencyfy<T>): Promise<U>;
export declare function getInstances<T extends any[]>(injector: Injector, ...args: Dependencyfy<T>): Promise<T>;
export {};
//# sourceMappingURL=injector.d.ts.map