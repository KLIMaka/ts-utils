import { value, ValuesContainer } from "./callbacks";
import { Err, Ok, second } from "./types";
export class TaskInerruptedError extends Error {
    constructor() { super('Task Interrupted'); }
}
export const NOOP_TASK_HANDLE = {
    values: new ValuesContainer(''),
    plan: (count) => { },
    incProgress: (count) => { },
    wait: (info, count) => Promise.resolve(),
    waitMaybe: () => Promise.resolve(),
    waitFor: (promise, info, count) => promise,
    waitForBatchTask: async (batch, info, time) => batch.map(b => b()),
};
export function progress(info) {
    return { isDone: () => false, result: () => { throw new Error(); }, progress: () => info };
}
export function done(result) {
    return { isDone: () => true, progress: () => { throw new Error(); }, result: () => result };
}
const RESOLVED = Promise.resolve();
class Barrier {
    blocked;
    promise = RESOLVED;
    ok;
    err;
    constructor(blocked = true) {
        this.blocked = blocked;
        if (blocked)
            this.createBarrier();
    }
    createBarrier() {
        const { promise, resolve, reject } = Promise.withResolvers();
        this.promise = promise;
        this.ok = resolve;
        this.err = reject;
        this.blocked = true;
    }
    releaseBarrier() {
        if (this.ok === undefined)
            throw new Error('');
        this.ok();
        this.promise = RESOLVED;
        this.blocked = false;
    }
    wait() { return this.promise; }
    block() { if (!this.blocked)
        this.createBarrier(); }
    unblock() { if (this.blocked)
        this.releaseBarrier(); }
    error(err) { if (this.blocked) {
        if (this.err === undefined)
            throw new Error('');
        this.err(err);
    } }
}
class PropgressInfoImpl {
    subtaskId = 0;
    infos;
    planCount;
    currentCount;
    info;
    progress;
    constructor(values) {
        this.infos = values.value('infos', []);
        this.planCount = values.value('plan-count', 0);
        this.currentCount = value('current-count', 0);
        this.info = values.transformed('info', this.infos, is => is.map(second).toString());
        this.progress = values.transformedTuple('progress', [this.planCount, this.currentCount], ([plan, current]) => (plan === 0 ? 0 : current / plan) * 100);
    }
    plan(dc) {
        this.planCount.mod(c => c + dc);
    }
    inc(dc) {
        this.currentCount.mod(c => c + dc);
    }
    beginSubTask(label) {
        const subtaskId = this.subtaskId++;
        this.infos.mod(is => [...is, [subtaskId, label]]);
        return subtaskId;
    }
    endSubTask(id) {
        this.infos.mod(is => is.filter(([itemId, _]) => id !== itemId));
    }
}
class TaskDescriptor {
    name;
    values;
    scheduler;
    tickStart;
    timer;
    stopped = false;
    pauseBarrier = new Barrier(false);
    taskImpl;
    progressImpl;
    paused;
    ;
    task;
    info;
    progress;
    constructor(name, values, scheduler, tickStart, timer) {
        this.name = name;
        this.values = values;
        this.scheduler = scheduler;
        this.tickStart = tickStart;
        this.timer = timer;
        this.progressImpl = new PropgressInfoImpl(values);
        this.info = this.progressImpl.info;
        this.progress = this.progressImpl.progress;
        this.paused = values.value('paused', false);
        this.task = value('task', progress(this.progressImpl));
    }
    checkStopped() { if (this.stopped)
        throw new TaskInerruptedError(); }
    plan(count) {
        this.progressImpl.plan(count);
    }
    incProgress(inc) {
        this.progressImpl.inc(inc);
    }
    async wait(info = '', count = 1) {
        this.checkStopped();
        this.progressImpl.info.set(info);
        await this.scheduler();
        await this.pauseBarrier.wait();
        this.checkStopped();
        this.progressImpl.inc(count);
    }
    async waitMaybe(dt = 10) {
        this.checkStopped();
        if (this.timer() - this.tickStart() < dt)
            return Promise.resolve();
        await this.scheduler();
        await this.pauseBarrier.wait();
        this.checkStopped();
    }
    async waitFor(promise, info = '', count = 1) {
        this.checkStopped();
        const infoId = this.progressImpl.beginSubTask(info);
        const result = await promise;
        this.progressImpl.endSubTask(infoId);
        this.progressImpl.inc(count);
        await this.pauseBarrier.wait();
        this.checkStopped();
        return result;
    }
    async waitForBatchTask(batch, info, time = 10) {
        this.checkStopped();
        const result = [];
        const infoId = this.progressImpl.beginSubTask(info ?? '');
        this.plan(batch.length);
        let start = this.timer();
        for (const task of batch) {
            result.push(task());
            this.incProgress(1);
            if (this.timer() - start < time)
                continue;
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
    pause() { this.paused.set(true); this.pauseBarrier.block(); }
    unpause() { this.paused.set(false); this.pauseBarrier.unblock(); }
    setTask(task) { this.taskImpl = task; }
    end() { if (this.taskImpl === undefined)
        throw new Error(''); return this.taskImpl; }
    async stop() {
        this.stopped = true;
        if (this.paused.get())
            this.pauseBarrier.error(new TaskInerruptedError());
        await this.taskImpl;
    }
}
export class SchedulerImpl {
    eventloop;
    timer;
    localValues;
    nextTick;
    tickStart = 0;
    tasks;
    tasksImpl;
    lastLaskId = 0;
    constructor(eventloop, timer, localValues) {
        this.eventloop = eventloop;
        this.timer = timer;
        this.localValues = localValues;
        this.nextTick = this.createNextTick();
        this.tasksImpl = this.localValues.value('tasks', []);
        this.tasks = this.tasksImpl;
    }
    createNextTick() {
        return new Promise(ok => {
            const eventloop = this.eventloop;
            eventloop(() => this.run(ok));
        });
    }
    run(cb) {
        this.tickStart = this.timer();
        cb();
        this.nextTick = this.createNextTick();
    }
    exec(task, name) {
        const taskName = name ?? `task-${this.lastLaskId++}`;
        const taskValues = this.localValues.createChild(taskName);
        const descriptor = new TaskDescriptor(taskName, taskValues, () => this.nextTick, () => this.tickStart, this.timer);
        const wrappedTask = task(descriptor)
            .then(result => {
            const ok = new Ok(result);
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
        });
        descriptor.setTask(wrappedTask);
        this.tasksImpl.mod(t => [...t, descriptor]);
        return descriptor;
    }
}
export function DefaultScheduler(eventloop, timer, values) {
    return new SchedulerImpl(eventloop, timer, values);
}
//# sourceMappingURL=scheduler.js.map