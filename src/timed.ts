import { Interpolator } from "./interpolator";

export type TimedValue<T> = (time: number) => T;

export function constTimed<T>(value: T): TimedValue<T> { return () => value }

export function timed<T>(startTime: number, startValue: T, endTime: number, endValue: T, interpolator: Interpolator<T>): TimedValue<T> {
  const dt = endTime - startTime;
  return (time: number) => {
    if (time < startTime) return startValue;
    if (time > endTime) return endValue;
    const t = (time - startTime) / dt;
    return interpolator(startValue, endValue, t);
  }
}

export function delayed<T>(dt: number, last: T, next: T, inter: Interpolator<T>): TimedValue<T> {
  const now = performance.now();
  return timed(now, last, now + dt, next, inter);
}

export class DelayedValue<T> {
  private startValue: T;
  private endValue: T;
  private time: number;

  constructor(
    private delay: number,
    value: T,
    private inter: Interpolator<T>,
    private timer: () => number
  ) {
    this.endValue = value;
    this.startValue = value;
    this.time = 0;
  }

  public set(val: T) {
    if (this.endValue === val) return;
    this.startValue = this.get();
    this.time = this.timer();
    this.endValue = val;
  }

  public get() {
    const t = this.timer() - this.time;
    if (t < 0) return this.startValue;
    if (t > this.delay) return this.endValue;
    return this.inter(this.startValue, this.endValue, t / this.delay);
  }
}