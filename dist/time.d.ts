import { Supplier } from "./types";
type Timer = () => number;
export declare function printTime(t: number): string;
export declare function measure<T>(f: Supplier<Promise<T>>, timer: Timer): Promise<[T, number]>;
export declare class StopWatch {
    private timer;
    private time;
    private startTime;
    constructor(timer: Timer);
    get(): number;
    start(): this;
    restart(): this;
    stop(): this;
    print(): string;
}
export {};
//# sourceMappingURL=time.d.ts.map