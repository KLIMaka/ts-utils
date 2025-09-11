import { Interpolator } from "./interpolator";
export type TimedValue<T> = (time: number) => T;
export declare function constTimed<T>(value: T): TimedValue<T>;
export declare function timed<T>(startTime: number, startValue: T, endTime: number, endValue: T, interpolator: Interpolator<T>): TimedValue<T>;
export declare function delayed<T>(dt: number, last: T, next: T, inter: Interpolator<T>): TimedValue<T>;
export declare class DelayedValue<T> {
    private delay;
    private inter;
    private timer;
    private startValue;
    private endValue;
    private time;
    constructor(delay: number, value: T, inter: Interpolator<T>, timer: () => number);
    set(val: T): void;
    get(): T;
}
//# sourceMappingURL=timed.d.ts.map