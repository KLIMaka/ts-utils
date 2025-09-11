import { FastList } from "./list";
import { Collection } from "./collections";
export type Interpolator<T> = (lh: T, rh: T, t: number) => T;
export declare function left<T>(): Interpolator<T>;
export declare function right<T>(): Interpolator<T>;
export declare const LinearInterpolator: (lh: number, rh: number, t: number) => number;
export declare const SmothstepInterpolator: (lh: number, rh: number, t: number) => number;
export declare function quadraticInterpolator(mid: number): Interpolator<number>;
export declare function vector2(inter: Interpolator<number>): Interpolator<[number, number]>;
export declare function vector3(inter: Interpolator<number>): Interpolator<[number, number, number]>;
export declare function vector4(inter: Interpolator<number>): Interpolator<[number, number, number, number]>;
export declare class Point<T> {
    val: T;
    pos: number;
    interpolator: Interpolator<T>;
    constructor(val: T, pos: number, interpolator: Interpolator<T>);
}
export type Comparator<T> = (lh: T, rh: T) => number;
export declare function PointComparator<T>(lh: Point<T>, rh: Point<T>): number;
export declare class Range<T> {
    private points;
    constructor(start: T, end: T, interpolator: Interpolator<T>);
    insert(val: T, t: number, interpolator: Interpolator<T>): void;
    get(t: number): T;
}
export declare function binaryIndexOf1<T>(list: FastList<T>, searchElement: T, cmp: Comparator<T>): number;
export declare function binaryIndexOf<T>(arr: Collection<T>, searchElement: T, cmp: Comparator<T>, minIndex?: number, maxIndex?: number): number;
//# sourceMappingURL=interpolator.d.ts.map