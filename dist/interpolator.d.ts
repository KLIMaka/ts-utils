export type Interpolator<T> = (lh: T, rh: T, t: number) => T;
export declare function left<T>(): Interpolator<T>;
export declare function right<T>(): Interpolator<T>;
export declare const LinearInterpolator: (lh: number, rh: number, t: number) => number;
export declare const SmothstepInterpolator: (lh: number, rh: number, t: number) => number;
export declare function quadraticInterpolator(mid: number): Interpolator<number>;
export declare function vector2(inter: Interpolator<number>): Interpolator<[number, number]>;
export declare function vector3(inter: Interpolator<number>): Interpolator<[number, number, number]>;
export declare function vector4(inter: Interpolator<number>): Interpolator<[number, number, number, number]>;
//# sourceMappingURL=interpolator.d.ts.map