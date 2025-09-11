import { Source, transformedBuilder, tuple, value } from "./callbacks";
import { Consumer, Err, Ok, Result, second, Supplier } from "./types";

export class TaskInerruptedError extends Error {
  constructor() { super('Task Interrupted') }
}

export type EventLoop = Consumer<Consumer<number>>;

export type ProgressInfo = {
  readonly progress: Source<number>;
  readonly info: Source<string>;
}

export interface TaskHandle {
  plan(count: number): void;
  incProgress(inc: number): void;
  wait(info?: string, count?: number): Promise<void>;
  waitMaybe(dt?: number): Promise<void>;
  waitFor<T>(promise: Promise<T>, info?: string, count?: number): Promise<T>;
  waitForBatchTask(batch: Consumer<void>[], info?: string, time?: number): Promise<void>;
}

export const NOOP_TASK_HANDLE: TaskHandle = {
  plan: (count: number) => { },
  incProgress: (count: number) => { },
  wait: (info?: string, count?: number) => Promise.resolve(),
  waitMaybe: () => Promise.resolve(),
  waitFor: <T>(promise: Promise<T>, info?: string, count?: number) => promise,
  waitForBatchTask: async (batch: Consumer<void>[], info?: string, time?: number) => batch.forEach(b => b()),
}

export type TaskValue<T> = {
  isDone(): boolean;
  progress(): ProgressInfo;
  result(): Result<T>;
}

export function progress<T>(info: ProgressInfo): TaskValue<T> {
  return { isDone: () => false, result: () => { throw new Error() }, progress: () => info }
}

export function done<T>(result: Result<T>): TaskValue<T> {
  return { isDone: () => true, progress: () => { throw new Error() }, result: () => result }
}

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

const RESOLVED = Promise.resolve();

class Barrier {
  private promise = RESOLVED;
  private ok: Consumer<void> | undefined;
  private err: Consumer<Error> | undefined;

  constructor(private blocked = true) {
    if (blocked) this.createBarrier();
  }

  private createBarrier() {
    const { promise, resolve, reject } = Promise.withResolvers<void>();
    this.promise = promise;
    this.ok = resolve;
    this.err = reject;
    this.blocked = true;
  }

  private releaseBarrier() {
    if (this.ok === undefined) throw new Error('');
    this.ok();
    this.promise = RESOLVED;
    this.blocked = false;
  }

  wait(): Promise<void> { return this.promise }
  block() { if (!this.blocked) this.createBarrier() }
  unblock() { if (this.blocked) this.releaseBarrier() }
  error(err: Error) { if (this.blocked) { if (this.err === undefined) throw new Error(''); this.err(err) } }
}

class PropgressInfoImpl implements ProgressInfo {
  private id = 0;
  private infos = value<[number, string][]>('', []);
  private planCount = value('', 0);
  private currentCount = value('', 0);
  readonly info = transformedBuilder({
    value: '',
    source: this.infos,
    transformer: is => is.map(second).toString()
  });
  readonly progress = transformedBuilder({
    value: 0,
    source: tuple(this.planCount, this.currentCount),
    transformer: ([plan, current]) => (plan === 0 ? 0 : current / plan) * 100
  });

  plan(dc: number) {
    this.planCount.mod(c => c + dc);
  }

  inc(dc: number) {
    this.currentCount.mod(c => c + dc);
  }

  beginTask(label: string): number {
    const id = this.id++;
    this.infos.mod(is => [...is, [id, label]]);
    return id;
  }

  endTask(id: number): void {
    this.infos.mod(is => is.filter(([itemId, _]) => id !== itemId));
  }
}

class TaskDescriptor<T> implements TaskController<T>, TaskHandle {
  private stopped = false;
  private pauseBarrier = new Barrier(false);
  private taskImpl: Promise<Result<T>> | undefined;
  private progressImpl = new PropgressInfoImpl();

  readonly paused = value('', false);
  readonly task = value('', progress<T>(this.progressImpl));
  readonly info = this.progressImpl.info;
  readonly progress = this.progressImpl.progress;

  constructor(
    private scheduler: Supplier<Promise<void>>,
    private tickStart: Supplier<number>,
    private timer: Supplier<number>
  ) { }

  private checkStopped() { if (this.stopped) throw new TaskInerruptedError() }

  plan(count: number): void {
    this.progressImpl.plan(count);
  }

  incProgress(inc: number): void {
    this.progressImpl.inc(inc);
  }

  async wait(info: string = '', count: number = 1): Promise<void> {
    this.checkStopped();
    this.progressImpl.info.set(info);
    await this.scheduler();
    await this.pauseBarrier.wait();
    this.checkStopped();
    this.progressImpl.inc(count);
  }

  async waitMaybe(dt = 10): Promise<void> {
    this.checkStopped();
    if (this.timer() - this.tickStart() < dt) return Promise.resolve();
    await this.scheduler();
    await this.pauseBarrier.wait();
    this.checkStopped();
  }

  async waitFor<T>(promise: Promise<T>, info: string = '', count: number = 1): Promise<T> {
    this.checkStopped();
    const infoId = this.progressImpl.beginTask(info);
    const result = await promise;
    this.progressImpl.endTask(infoId);
    this.progressImpl.inc(count);
    await this.pauseBarrier.wait();
    this.checkStopped();
    return result;
  }

  async waitForBatchTask(batch: Consumer<void>[], info?: string, time = 10): Promise<void> {
    this.checkStopped();
    const infoId = this.progressImpl.beginTask(info ?? '');
    this.plan(batch.length);
    let start = this.timer();
    for (const task of batch) {
      task();
      this.incProgress(1);

      if (this.timer() - start < time) continue;
      else {
        await this.scheduler();
        await this.pauseBarrier.wait();
        this.checkStopped();
        start = this.timer();
      }
    }
    await this.pauseBarrier.wait();
    this.checkStopped();
    this.progressImpl.endTask(infoId);
  }

  pause() { this.paused.set(true); this.pauseBarrier.block() }
  unpause() { this.paused.set(false); this.pauseBarrier.unblock() }
  setTask(task: Promise<Result<T>>) { this.taskImpl = task }
  end() { if (this.taskImpl === undefined) throw new Error(''); return this.taskImpl }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.paused.get()) this.pauseBarrier.error(new TaskInerruptedError());
    await this.taskImpl;
  }
}

export class SchedulerImpl implements Scheduler {
  private nextTick: Promise<void>;
  private tickStart = 0;

  constructor(
    private eventloop: EventLoop,
    private timer: Supplier<number>
  ) {
    this.nextTick = this.createNextTick();
  }

  private createNextTick() {
    return new Promise<void>(ok => {
      const eventloop = this.eventloop;
      eventloop(() => this.run(ok));
    });
  }

  private run(cb: Consumer<void>) {
    this.tickStart = this.timer();
    cb();
    this.nextTick = this.createNextTick();
  }

  exec<T>(task: Task<T>): TaskController<T> {
    const descriptor = new TaskDescriptor<T>(() => this.nextTick, () => this.tickStart, this.timer);
    const wrappedTask = task(descriptor)
      .then(result => {
        const ok = new Ok<T>(result);
        descriptor.task.set(done(ok));
        return ok;
      })
      .catch(error => {
        const err = new Err(error);
        descriptor.task.set(done(err));
        return err;
      })
    descriptor.setTask(wrappedTask);
    return descriptor;
  }

}

export function DefaultScheduler(eventloop: EventLoop, timer: Supplier<number>): Scheduler {
  return new SchedulerImpl(eventloop, timer);
}