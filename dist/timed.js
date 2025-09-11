export function constTimed(value) { return () => value; }
export function timed(startTime, startValue, endTime, endValue, interpolator) {
    const dt = endTime - startTime;
    return (time) => {
        if (time < startTime)
            return startValue;
        if (time > endTime)
            return endValue;
        const t = (time - startTime) / dt;
        return interpolator(startValue, endValue, t);
    };
}
export function delayed(dt, last, next, inter) {
    const now = performance.now();
    return timed(now, last, now + dt, next, inter);
}
export class DelayedValue {
    delay;
    inter;
    timer;
    startValue;
    endValue;
    time;
    constructor(delay, value, inter, timer) {
        this.delay = delay;
        this.inter = inter;
        this.timer = timer;
        this.endValue = value;
        this.startValue = value;
        this.time = 0;
    }
    set(val) {
        if (this.endValue === val)
            return;
        this.startValue = this.get();
        this.time = this.timer();
        this.endValue = val;
    }
    get() {
        const t = this.timer() - this.time;
        if (t < 0)
            return this.startValue;
        if (t > this.delay)
            return this.endValue;
        return this.inter(this.startValue, this.endValue, t / this.delay);
    }
}
//# sourceMappingURL=timed.js.map