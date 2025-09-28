import { iter } from "./iter";
import { first as first1 } from "./types";
function work(title, task) {
    return async (handle, ...input) => await handle.waitFor(task(...input), title);
}
export function tuple(work) {
    return async (handle, ...input) => [await work(handle, ...input)];
}
function pass(work) {
    return async (handle, ...input) => [...input, await work(handle, ...input)];
}
function passTuple(work) {
    return async (handle, ...input) => [...input, ...(await work(handle, ...input))];
}
function seq(tasks, defaultInput) {
    return async (handle, ...input) => {
        let result = input.length === 0 ? (defaultInput ?? []) : input;
        handle.plan(tasks.length);
        for (const task of tasks)
            result = await task(handle, ...result);
        return result;
    };
}
function parallel(tasks) {
    return async (handle, ...input) => {
        handle.plan(tasks.length);
        return Promise.all(tasks.map(t => t(handle, ...input)));
    };
}
function mapParallel(items, mapper) {
    return parallel(iter(items).map(mapper).collect());
}
function mapSeq(items, mapper) {
    return seq(iter(items).map(mapper).collect());
}
function first(work) {
    return async (handle, ...input) => first1(await work(handle, ...input));
}
export class ParallelWorkBuilder {
    tasks = [];
    thread(title, task) {
        this.tasks.push(work(title, task));
        return this;
    }
    threadWork(work) {
        this.tasks.push(work);
        return this;
    }
}
export function begin() {
    return new WorkBuilder();
}
export class WorkBuilder {
    tasks = [];
    input() {
        return this;
    }
    multiInput() {
        return this;
    }
    append(items, appender) {
        for (const item of items)
            appender(this, item);
        return this;
    }
    then(title, task) {
        this.tasks.push(tuple(work(title, task)));
        return this;
    }
    thenPass(title, task) {
        this.tasks.push(pass(work(title, task)));
        return this;
    }
    thenWork(work) {
        this.tasks.push(work);
        return this;
    }
    thenWorkPass(work) {
        this.tasks.push(passTuple(work));
        return this;
    }
    stepSub(task) {
        this.tasks.push(task);
        return this;
    }
    factory(taskFactory) {
        this.tasks.push(async (handle, ...input) => {
            const work = taskFactory(new WorkBuilder(), ...input);
            return work(handle);
        });
        return this;
    }
    fork(b) {
        const w = parallel(b(new ParallelWorkBuilder()).tasks);
        this.tasks.push(w);
        return this;
    }
    forkPass(b) {
        this.tasks.push(pass(parallel(b(new ParallelWorkBuilder()).tasks)));
        return this;
    }
    forkItems(input, info, task) {
        this.tasks.push(tuple(mapParallel(input, i => handle => handle.waitFor(task(i), info(i)))));
        return this;
    }
    finish(defaultInput) {
        return seq(this.tasks, defaultInput);
    }
    finishUntuple(defaultInput) {
        return first(seq(this.tasks, defaultInput));
    }
}
//# sourceMappingURL=work.js.map