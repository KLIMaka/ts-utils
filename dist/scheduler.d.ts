import { Source, ValuesContainer } from "./callbacks";
import { Consumer, MultiFunction, Result, Supplier } from "./types";
export declare class TaskInerruptedError extends Error {
    constructor();
}
export type EventLoop = Consumer<Consumer<number>>;
export type ProgressInfo = {
    readonly progress: Source<number>;
    readonly info: Source<string>;
};
export type TaskProgressPoint = Readonly<{
    progress: number;
    info?: string;
}>;
export interface TaskHandle {
    readonly values: ValuesContainer;
    fork(count: number): TaskHandle;
    wait<T>(task: Generator<TaskProgressPoint, T>, info?: string, dt?: number): Promise<T>;
    waitMaybe<T>(task: Generator<TaskProgressPoint, T>, info?: string, dt?: number): Promise<T>;
    waitFor<T>(promise: Promise<T>, info?: string): Promise<T>;
}
export declare function gen<T>(steps: Supplier<T>[], valueCurrentTotal: MultiFunction<[T, number, number], string>): Generator<TaskProgressPoint, T[]>;
export declare const NOOP_TASK_HANDLE: TaskHandle;
export type TaskValue<T> = {
    isDone(): boolean;
    progress(): ProgressInfo;
    result(): Result<T>;
};
export declare function progress<T>(info: ProgressInfo): TaskValue<T>;
export declare function done<T>(result: Result<T>): TaskValue<T>;
export interface TaskController<T> extends ProgressInfo {
    readonly name: string;
    readonly paused: Source<boolean>;
    readonly task: Source<TaskValue<T>>;
    pause(): void;
    unpause(): void;
    stop(): Promise<void>;
    end(): Promise<Result<T>>;
}
export type Task<T> = (handle: TaskHandle) => Promise<T>;
export interface Scheduler {
    exec<T>(task: Task<T>, name?: string): TaskController<T>;
    tasks: Source<TaskController<any>[]>;
}
export declare class SchedulerImpl implements Scheduler {
    private eventloop;
    private timer;
    private localValues;
    private nextTick;
    private tickStart;
    readonly tasks: Source<TaskController<any>[]>;
    private tasksImpl;
    private lastLaskId;
    constructor(eventloop: EventLoop, timer: Supplier<number>, localValues: ValuesContainer);
    private createNextTick;
    private run;
    exec<T>(task: Task<T>, name?: string): TaskController<T>;
}
export declare function DefaultScheduler(eventloop: EventLoop, timer: Supplier<number>, values: ValuesContainer): Scheduler;
//# sourceMappingURL=scheduler.d.ts.map