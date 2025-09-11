import { transformedBuilder, tuple, value } from "./callbacks";
import { Err, Ok, second } from "./types";
export class TaskInerruptedError extends Error {
    constructor() { super('Task Interrupted'); }
}
export const NOOP_TASK_HANDLE = {
    plan: (count) => { },
    incProgress: (count) => { },
    wait: (info, count) => Promise.resolve(),
    waitMaybe: () => Promise.resolve(),
    waitFor: (promise, info, count) => promise,
    waitForBatchTask: async (batch, info, time) => batch.forEach(b => b()),
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
    id = 0;
    infos = value('', []);
    planCount = value('', 0);
    currentCount = value('', 0);
    info = transformedBuilder({
        value: '',
        source: this.infos,
        transformer: is => is.map(second).toString()
    });
    progress = transformedBuilder({
        value: 0,
        source: tuple(this.planCount, this.currentCount),
        transformer: ([plan, current]) => (plan === 0 ? 0 : current / plan) * 100
    });
    plan(dc) {
        this.planCount.mod(c => c + dc);
    }
    inc(dc) {
        this.currentCount.mod(c => c + dc);
    }
    beginTask(label) {
        const id = this.id++;
        this.infos.mod(is => [...is, [id, label]]);
        return id;
    }
    endTask(id) {
        this.infos.mod(is => is.filter(([itemId, _]) => id !== itemId));
    }
}
class TaskDescriptor {
    scheduler;
    tickStart;
    timer;
    stopped = false;
    pauseBarrier = new Barrier(false);
    taskImpl;
    progressImpl = new PropgressInfoImpl();
    paused = value('', false);
    task = value('', progress(this.progressImpl));
    info = this.progressImpl.info;
    progress = this.progressImpl.progress;
    constructor(scheduler, tickStart, timer) {
        this.scheduler = scheduler;
        this.tickStart = tickStart;
        this.timer = timer;
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
        const infoId = this.progressImpl.beginTask(info);
        const result = await promise;
        this.progressImpl.endTask(infoId);
        this.progressImpl.inc(count);
        await this.pauseBarrier.wait();
        this.checkStopped();
        return result;
    }
    async waitForBatchTask(batch, info, time = 10) {
        this.checkStopped();
        const infoId = this.progressImpl.beginTask(info ?? '');
        this.plan(batch.length);
        let start = this.timer();
        for (const task of batch) {
            task();
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
        this.progressImpl.endTask(infoId);
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
    nextTick;
    tickStart = 0;
    constructor(eventloop, timer) {
        this.eventloop = eventloop;
        this.timer = timer;
        this.nextTick = this.createNextTick();
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
    exec(task) {
        const descriptor = new TaskDescriptor(() => this.nextTick, () => this.tickStart, this.timer);
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
        });
        descriptor.setTask(wrappedTask);
        return descriptor;
    }
}
export function DefaultScheduler(eventloop, timer) {
    return new SchedulerImpl(eventloop, timer);
}
//# sourceMappingURL=scheduler.js.map