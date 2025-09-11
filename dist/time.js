import { int } from "./mathutils";
const MS_IN_SEC = 1000;
const MS_IN_MIN = MS_IN_SEC * 60;
export function printTime(t) {
    if (t <= MS_IN_SEC * 0.5)
        return t.toFixed(2) + 'ms';
    if (t <= MS_IN_MIN)
        return (t / MS_IN_SEC).toFixed(2) + 's';
    return int(t / MS_IN_MIN) + 'min ' + ((t - int(t / MS_IN_MIN) * MS_IN_MIN) / MS_IN_SEC).toFixed(2) + 's';
}
export async function measure(f, timer) {
    const start = timer();
    const result = await f();
    return [result, timer() - start];
}
export class StopWatch {
    timer;
    time = 0;
    startTime = -1;
    constructor(timer) {
        this.timer = timer;
    }
    ;
    get() {
        return this.startTime !== -1
            ? this.timer() - this.startTime
            : this.time;
    }
    start() {
        if (this.startTime === -1)
            this.startTime = this.timer();
        return this;
    }
    restart() {
        this.startTime = this.timer();
        return this;
    }
    stop() {
        if (this.startTime !== -1) {
            this.time = this.timer() - this.startTime;
            this.startTime = -1;
        }
        return this;
    }
    print() {
        return printTime(this.get());
    }
}
export function debounced(f, delayMs) {
    let timeoutId;
    return () => {
        if (timeoutId)
            clearTimeout(timeoutId);
        timeoutId = setTimeout(f, delayMs);
    };
}
//# sourceMappingURL=time.js.map