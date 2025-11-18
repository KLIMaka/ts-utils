import { printTime } from "./time";
import { Source, transformedBuilder, tuple, Value, value, ValuesContainer } from "./callbacks";
import { Consumer, Err, Function, Ok, Result, second, Supplier } from "./types";

export class TaskInerruptedError extends Error {
  constructor() { super('Task Interrupted') }
}

export type EventLoop = Consumer<Consumer<number>>;

export type ProgressInfo = {
  readonly progress: Source<number>;
  readonly info: Source<string>;
}

export interface TaskHandle {
  readonly values: ValuesContainer;
  plan(count: number): void;
  incProgress(inc: number): void;
  wait(info?: string, count?: number): Promise<void>;
  waitMaybe(dt?: number): Promise<void>;
  waitFor<T>(promise: Promise<T>, info?: string, count?: number): Promise<T>;
  waitForBatchTask<T>(batch: Supplier<T>[], info?: string, time?: number): Promise<T[]>;
}

export const NOOP_TASK_HANDLE: TaskHandle = {
  values: new ValuesContainer(''),
  plan: (count: number) => { },
  incProgress: (count: number) => { },
  wait: (info?: string, count?: number) => Promise.resolve(),
  waitMaybe: () => Promise.resolve(),
  waitFor: <T>(promise: Promise<T>, info?: string, count?: number) => promise,
  waitForBatchTask: async <T>(batch: Supplier<T>[], info?: string, time?: number) => batch.map(b => b()),
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

class ProgressEstimator {
  private ema: number | undefined;
  private sumDone: number = 0;
  private countDone: number = 0;
  private lastPercent: number = 0;

  constructor(
    private alpha = 0.2
  ) { }

  observeTask(duration: number) {
    if (this.ema === undefined) this.ema = duration;
    else this.ema = this.alpha * duration + (1 - this.alpha) * this.ema;
    this.sumDone += duration;
    this.countDone += 1;
  }

  progress(remainingCount: number): number {
    if (this.countDone === 0) return 0;
    const estRemaining = (this.ema === undefined ? (this.sumDone / this.countDone) : this.ema) * remainingCount;
    const pct = this.sumDone / (this.sumDone + estRemaining) * 100;
    const capped = Math.max(this.lastPercent, pct);
    this.lastPercent = capped;
    return capped;
  }
}

class PropgressInfoImpl implements ProgressInfo {
  private subtaskId = 0;
  private infos: Value<[number, string][]>;
  private planCount: Value<number>;
  private currentCount: Value<number>;
  readonly info: Value<string>;
  readonly progress: Source<number>;

  private lastTime: number;
  private totalTime = 0;
  private ema: number | undefined;

  constructor(
    values: ValuesContainer,
    private timer: Supplier<number>,
    private alpha = 0.2,
  ) {
    this.lastTime = timer();
    this.infos = values.value<[number, string][]>('infos', []);
    this.planCount = values.value('plan-count', 0);
    this.currentCount = value('current-count', 0);
    this.progress = values.transformedTuple('progress', [this.planCount, this.currentCount], ([plan, current]) => {
      const remaining = plan - current;
      const now = this.timer();
      const dt = now - this.lastTime;
      this.lastTime = now;
      if (this.ema === undefined) this.ema = dt;
      else this.ema = this.alpha * dt + (1 - this.alpha) * this.ema;
      this.totalTime += dt;
      const estRemaining = (this.ema === undefined ? (this.totalTime / current) : this.ema) * remaining;
      return this.totalTime / (this.totalTime + estRemaining) * 100;
    });
    this.info = values.transformedTuple('info', [this.planCount, this.currentCount, this.infos], ([plan, current, is]) => {
      const remaining = plan - current;
      const now = this.timer();
      const dt = now - this.lastTime;
      this.lastTime = now;
      if (this.ema === undefined) this.ema = dt;
      else this.ema = this.alpha * dt + (1 - this.alpha) * this.ema;
      this.totalTime += dt;
      const estRemaining = (this.ema === undefined ? (this.totalTime / current) : this.ema) * remaining;
      const prc = this.totalTime / (this.totalTime + estRemaining) * 100;
      return `${prc.toFixed(0)}% rem=${remaining}, ema=${printTime(this.ema)} per Task,  total=${printTime(this.totalTime)}, estRem=${printTime(estRemaining)}`

      // is.map(second).toString());
    });
  }

  plan(dc: number) {
    this.planCount.mod(c => c + dc);
  }

  inc(dc: number) {
    this.currentCount.mod(c => c + dc);
  }

  beginSubTask(label: string): number {
    const subtaskId = this.subtaskId++;
    this.infos.mod(is => [...is, [subtaskId, label]]);
    return subtaskId;
  }

  endSubTask(id: number): void {
    this.infos.mod(is => is.filter(([itemId, _]) => id !== itemId));
  }
}

class TaskDescriptor<T> implements TaskController<T>, TaskHandle {
  private stopped = false;
  private pauseBarrier = new Barrier(false);
  private taskImpl: Promise<Result<T>> | undefined;
  private progressImpl: PropgressInfoImpl;

  readonly paused: Value<boolean>;;
  readonly task: Value<TaskValue<T>>;
  readonly info: Source<string>;
  readonly progress: Source<number>;

  constructor(
    readonly name: string,
    readonly values: ValuesContainer,
    private scheduler: Supplier<Promise<void>>,
    private tickStart: Supplier<number>,
    private timer: Supplier<number>
  ) {
    this.progressImpl = new PropgressInfoImpl(values, timer);
    this.info = this.progressImpl.info;
    this.progress = this.progressImpl.progress;
    this.paused = values.value('paused', false);
    this.task = value('task', progress<T>(this.progressImpl))

  }

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
    const infoId = this.progressImpl.beginSubTask(info);
    const result = await promise;
    this.progressImpl.endSubTask(infoId);
    this.progressImpl.inc(count);
    await this.pauseBarrier.wait();
    this.checkStopped();
    return result;
  }

  async waitForBatchTask<T>(batch: Supplier<T>[], info?: string, time = 10): Promise<T[]> {
    this.checkStopped();
    const result: T[] = [];
    const infoId = this.progressImpl.beginSubTask(info ?? '');
    this.plan(batch.length);
    let start = this.timer();
    for (const task of batch) {
      result.push(task());
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
    this.progressImpl.endSubTask(infoId);
    return result;
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
  readonly tasks: Source<TaskController<any>[]>;
  private tasksImpl: Value<TaskController<any>[]>;
  private lastLaskId = 0;

  constructor(
    private eventloop: EventLoop,
    private timer: Supplier<number>,
    private localValues: ValuesContainer,
  ) {
    this.nextTick = this.createNextTick();
    this.tasksImpl = this.localValues.value<TaskController<any>[]>('tasks', []);
    this.tasks = this.tasksImpl;
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

  exec<T>(task: Task<T>, name?: string): TaskController<T> {
    const taskName = name ?? `task-${this.lastLaskId++}`;
    const taskValues = this.localValues.createChild(taskName);
    const descriptor = new TaskDescriptor<T>(taskName, taskValues, () => this.nextTick, () => this.tickStart, this.timer);
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
      .finally(() => {
        this.tasksImpl.mod(ts => ts.filter(t => t !== descriptor));
        taskValues.dispose();
      })
    descriptor.setTask(wrappedTask);
    this.tasksImpl.mod(t => [...t, descriptor]);
    return descriptor;
  }

}

export function DefaultScheduler(eventloop: EventLoop, timer: Supplier<number>, values: ValuesContainer): Scheduler {
  return new SchedulerImpl(eventloop, timer, values);
}