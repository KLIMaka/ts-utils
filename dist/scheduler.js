import { value, ValuesContainer } from "./callbacks";
import { Err, Ok, second } from "./types";
export class TaskInerruptedError extends Error {
    constructor() { super('Task Interrupted'); }
}
export function* gen(steps, valueCurrentTotal) {
    const result = [];
    let i = 0;
    const total = steps.length;
    const progress = 1 / total;
    for (const step of steps) {
        const value = step();
        result.push(value);
        yield { progress, info: valueCurrentTotal(value, i++, total) };
    }
    return result;
}
export const NOOP_TASK_HANDLE = {
    values: new ValuesContainer(''),
    fork: (count) => NOOP_TASK_HANDLE,
    wait: (task, info, dt) => Promise.resolve(undefined),
    waitMaybe: (task, info, dt) => Promise.resolve(undefined),
    waitFor: (promise, info) => promise,
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
    current;
    info;
    progress;
    constructor(values) {
        this.infos = values.value('infos', []);
        this.current = value('current', 0);
        this.progress = values.transformed('progress', this.current, c => c * 100);
        this.info = values.transformedTuple('info', [this.current, this.infos], ([current, is]) => is.map(second).toString());
    }
    inc(dc) {
        this.current.mod(c => c + dc);
    }
    beginSubTask(label) {
        const subtaskId = this.subtaskId++;
        this.infos.mod(is => [...is, [subtaskId, label]]);
        return subtaskId;
    }
    changeSubtaskInfo(id, label) {
        this.infos.mod(is => is.map(ent => ent[0] === id ? [id, label] : ent));
    }
    endSubTask(id) {
        this.infos.mod(is => is.filter(([itemId, _]) => id !== itemId));
    }
}
class ForkedTaskHandle {
    handle;
    weight;
    values;
    constructor(handle, weight, values = handle.values) {
        this.handle = handle;
        this.weight = weight;
        this.values = values;
    }
    fork(count) {
        return new ForkedTaskHandle(this.handle, this.weight / count);
    }
    wait(task, info) {
        return this.handle.wait(task, this.weight, info);
    }
    waitMaybe(task, info, dt) {
        return this.handle.waitMaybe(task, this.weight, info, dt);
    }
    waitFor(promise, info) {
        return this.handle.waitFor(this.weight, promise, info);
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
    async wait(task, weight, info = '') {
        if (this.stopped)
            return Promise.reject(new TaskInerruptedError());
        const infoId = this.progressImpl.beginSubTask(info);
        let totalProgress = 0;
        let it = task.next();
        while (!it.done) {
            totalProgress += it.value.progress;
            this.progressImpl.inc(it.value.progress * weight);
            this.progressImpl.changeSubtaskInfo(infoId, it.value.info ?? '');
            await this.scheduler();
            await this.pauseBarrier.wait();
            if (this.stopped)
                return Promise.reject(new TaskInerruptedError());
            it = task.next();
        }
        this.progressImpl.endSubTask(infoId);
        this.progressImpl.inc((1 - totalProgress) * weight);
        return it.value;
    }
    async waitMaybe(task, weight, info = '', dtMs = 10) {
        if (this.stopped)
            return Promise.reject(new TaskInerruptedError());
        const infoId = this.progressImpl.beginSubTask(info);
        let totalProgress = 0;
        let it = task.next();
        while (!it.done) {
            totalProgress += it.value.progress;
            this.progressImpl.inc(it.value.progress * weight);
            if (this.timer() - this.tickStart() >= dtMs) {
                this.progressImpl.changeSubtaskInfo(infoId, it.value.info ?? '');
                await this.scheduler();
                await this.pauseBarrier.wait();
                if (this.stopped)
                    return Promise.reject(new TaskInerruptedError());
            }
            it = task.next();
        }
        this.progressImpl.endSubTask(infoId);
        this.progressImpl.inc((1 - totalProgress) * weight);
        return it.value;
    }
    async waitFor(weight, promise, info = '') {
        if (this.stopped)
            return Promise.reject(new TaskInerruptedError());
        const infoId = this.progressImpl.beginSubTask(info);
        const result = await promise;
        this.progressImpl.endSubTask(infoId);
        this.progressImpl.inc(weight);
        await this.pauseBarrier.wait();
        if (this.stopped)
            return Promise.reject(new TaskInerruptedError());
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
        const wrappedTask = task(new ForkedTaskHandle(descriptor, 1))
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