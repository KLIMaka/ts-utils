export declare class Bitvec {
    private arr;
    private offset;
    constructor(capacity: number);
    get(idx: number): boolean;
    set(idx: number, value: boolean): void;
    fill(idx: number, size: number, value: boolean): void;
    check(idx: number, value: boolean): number;
    push(value: boolean): void;
    private fillRange;
    private ensureSize;
    private grow;
}
//# sourceMappingURL=bitvec.d.ts.map