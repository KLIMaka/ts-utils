import { Source } from "./callbacks";
import { Consumer, Result, Supplier } from "./types";
export declare class TaskInerruptedError extends Error {
    constructor();
}
export type EventLoop = Consumer<Consumer<number>>;
export type ProgressInfo = {
    readonly progress: Source<number>;
    readonly info: Source<string>;
};
export interface TaskHandle {
    plan(count: number): void;
    incProgress(inc: number): void;
    wait(info?: string, count?: number): Promise<void>;
    waitMaybe(dt?: number): Promise<void>;
    waitFor<T>(promise: Promise<T>, info?: string, count?: number): Promise<T>;
    waitForBatchTask(batch: Consumer<void>[], info?: string, time?: number): Promise<void>;
}
export declare const NOOP_TASK_HANDLE: TaskHandle;
export type TaskValue<T> = {
    isDone(): boolean;
    progress(): ProgressInfo;
    result(): Result<T>;
};
export declare function progress<T>(info: ProgressInfo): TaskValue<T>;
export declare function done<T>(result: Result<T>): TaskValue<T>;
export interface TaskController<T> extends ProgressInfo {
    readonly paused: Source<boolean>;
    readonly task: Source<TaskValue<T>>;
    pause(): void;
    unpause(): void;
    stop(): Promise<void>;
    end(): Promise<Result<T>>;
}
export type Task<T> = (handle: TaskHandle) => Promise<T>;
export interface Scheduler {
    exec<T>(task: Task<T>): TaskController<T>;
}
export declare class SchedulerImpl implements Scheduler {
    private eventloop;
    private timer;
    private nextTick;
    private tickStart;
    constructor(eventloop: EventLoop, timer: Supplier<number>);
    private createNextTick;
    private run;
    exec<T>(task: Task<T>): TaskController<T>;
}
export declare function DefaultScheduler(eventloop: EventLoop, timer: Supplier<number>): Scheduler;
//# sourceMappingURL=scheduler.d.ts.map