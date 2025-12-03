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
  fork(count: number): TaskHandle;
  wait<T>(task: Generator<number, T>, info?: string, dt?: number): Promise<T>;
  waitMaybe<T>(task: Generator<number, T>, info?: string, dt?: number): Promise<T>;
  waitFor<T>(promise: Promise<T>, info?: string): Promise<T>;
}

export const NOOP_TASK_HANDLE: TaskHandle = {
  values: new ValuesContainer(''),
  fork: (count: number): TaskHandle => NOOP_TASK_HANDLE,
  wait: <T>(task: Generator<number, T>, info?: string, dt?: number) => Promise.resolve(undefined as T),
  waitMaybe: <T>(task: Generator<number, T>, info?: string, dt?: number) => Promise.resolve(undefined as T),
  waitFor: <T>(promise: Promise<T>, info?: string) => promise,
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
class PropgressInfoImpl implements ProgressInfo {
  private subtaskId = 0;
  private infos: Value<[number, string][]>;
  private current: Value<number>;
  readonly info: Value<string>;
  readonly progress: Source<number>;


  constructor(
    values: ValuesContainer,
  ) {
    this.infos = values.value<[number, string][]>('infos', []);
    this.current = value('current', 0);
    this.progress = values.transformed('progress', this.current, c => c * 100);
    this.info = values.transformedTuple('info', [this.current, this.infos], ([current, is]) => is.map(second).toString());
  }

  inc(dc: number) {
    this.current.mod(c => c + dc);
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

class ForkedTaskHandle implements TaskHandle {
  constructor(
    private handle: TaskDescriptor<any>,
    private weight: number,
    readonly values = handle.values,
  ) { }

  fork(count: number): TaskHandle {
    return new ForkedTaskHandle(this.handle, this.weight / count);
  }

  wait<T>(task: Generator<number, T>, info?: string): Promise<T> {
    return this.handle.wait(task, this.weight, info);
  }

  waitMaybe<T>(task: Generator<number, T>, info?: string, dt?: number): Promise<T> {
    return this.handle.waitMaybe(task, this.weight, info, dt);
  }

  waitFor<T>(promise: Promise<T>, info?: string): Promise<T> {
    return this.handle.waitFor(this.weight, promise, info);
  }
}

class TaskDescriptor<T> implements TaskController<T> {
  private stopped = false;
  private pauseBarrier = new Barrier(false);
  private taskImpl: Promise<Result<T>> | undefined;
  private progressImpl: PropgressInfoImpl;

  readonly paused: Value<boolean>;
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
    this.progressImpl = new PropgressInfoImpl(values);
    this.info = this.progressImpl.info;
    this.progress = this.progressImpl.progress;
    this.paused = values.value('paused', false);
    this.task = value('task', progress<T>(this.progressImpl))
  }


  async wait<T>(task: Generator<number, T>, weight: number, info: string = ''): Promise<T> {
    if (this.stopped) return Promise.reject(new TaskInerruptedError());
    const infoId = this.progressImpl.beginSubTask(info);
    let totalProgress = 0;
    let it = task.next();
    while (!it.done) {
      totalProgress += it.value;
      this.progressImpl.inc(it.value * weight);
      await this.scheduler();
      await this.pauseBarrier.wait();
      if (this.stopped) return Promise.reject(new TaskInerruptedError());
      it = task.next();
    }
    this.progressImpl.endSubTask(infoId);
    this.progressImpl.inc((1 - totalProgress) * weight);
    return it.value;
  }

  async waitMaybe<T>(task: Generator<number, T>, weight: number, info: string = '', dtMs = 10): Promise<T> {
    if (this.stopped) return Promise.reject(new TaskInerruptedError());
    const infoId = this.progressImpl.beginSubTask(info);
    let totalProgress = 0;
    let it = task.next();
    while (!it.done) {
      totalProgress += it.value;
      this.progressImpl.inc(it.value * weight);
      if (this.timer() - this.tickStart() >= dtMs) {
        await this.scheduler();
        await this.pauseBarrier.wait();
        if (this.stopped) return Promise.reject(new TaskInerruptedError());
      }
      it = task.next();
    }
    this.progressImpl.endSubTask(infoId);
    this.progressImpl.inc((1 - totalProgress) * weight);
    return it.value;
  }

  async waitFor<T>(weight: number, promise: Promise<T>, info: string = ''): Promise<T> {
    if (this.stopped) return Promise.reject(new TaskInerruptedError());
    const infoId = this.progressImpl.beginSubTask(info);
    const result = await promise;
    this.progressImpl.endSubTask(infoId);
    this.progressImpl.inc(weight);
    await this.pauseBarrier.wait();
    if (this.stopped) return Promise.reject(new TaskInerruptedError());
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
    const wrappedTask = task(new ForkedTaskHandle(descriptor, 1))
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