import { Fn } from './types';
export interface Raster<P> {
    readonly width: number;
    readonly height: number;
    pixel(x: number, y: number): P;
}
export type Rasterizer<P> = (raster: Raster<P>, out: Uint8Array | Uint8ClampedArray | number[]) => void;
export declare function palRasterizer(pal: ArrayLike<number>, trans?: number, transColor?: number[]): Rasterizer<number>;
export declare function pluTransform(plu: Uint8Array): Fn<number, number>;
export declare function rasterizeRGBA8(raster: Raster<number>, out: ArrayBuffer): void;
export declare class ConstRaster<P> implements Raster<P> {
    readonly width: number;
    readonly height: number;
    private color;
    constructor(width: number, height: number, color: P);
    pixel(x: number, y: number): P;
}
export declare class ArrayRaster<P> implements Raster<P> {
    readonly width: number;
    readonly height: number;
    private pixels;
    constructor(width: number, height: number, pixels: ArrayLike<P>);
    pixel(x: number, y: number): P;
}
export type Mapper = (r: number, g: number, b: number, a: number) => number;
export declare class F32RGBAArrayRaster implements Raster<number> {
    readonly width: number;
    readonly height: number;
    private pixels;
    private mapper;
    constructor(width: number, height: number, pixels: Float32Array, mapper: Mapper);
    pixel(x: number, y: number): number;
}
export declare class TransformRaster<S, D> implements Raster<D> {
    private src;
    private transform;
    readonly width: number;
    readonly height: number;
    constructor(src: Raster<S>, transform: Fn<S, D>);
    pixel(x: number, y: number): D;
}
export declare class AxisSwapRaster<P> implements Raster<P> {
    private src;
    readonly width: number;
    readonly height: number;
    constructor(src: Raster<P>);
    pixel(x: number, y: number): P;
}
export declare class Mirror<P> implements Raster<P> {
    private src;
    private xmirrored;
    private ymirrored;
    readonly width: number;
    readonly height: number;
    constructor(src: Raster<P>, xmirrored: boolean, ymirrored: boolean);
    pixel(x: number, y: number): P;
}
export declare class RectRaster<P> implements Raster<P> {
    private src;
    private sx;
    private sy;
    private padd;
    readonly width: number;
    readonly height: number;
    constructor(src: Raster<P>, sx: number, sy: number, ex: number, ey: number, padd: (x: number, y: number, r: Raster<P>) => P);
    pixel(x: number, y: number): P;
}
export declare class ResizeRaster<P> implements Raster<P> {
    private src;
    readonly width: number;
    readonly height: number;
    private readonly dx;
    private readonly dy;
    constructor(src: Raster<P>, width: number, height: number);
    pixel(x: number, y: number): P;
}
export type PixelOperator<P> = (lh: P, rh: P, off: number) => P;
export declare class SuperResizeRaster<P> implements Raster<P> {
    private src;
    readonly width: number;
    readonly height: number;
    private op1;
    private op2;
    private dx;
    private dy;
    private maxw;
    private maxh;
    constructor(src: Raster<P>, width: number, height: number, op1: PixelOperator<P>, op2: PixelOperator<P>);
    pixel(x: number, y: number): P;
}
export declare function array<P>(arr: ArrayLike<P>, w: number, h: number): Raster<P>;
export declare function f32array(arr: Float32Array, w: number, h: number, mapper: Mapper): Raster<number>;
export declare function transform<S, D>(src: Raster<S>, transform: Fn<S, D>): Raster<D>;
export declare function axisSwap<P>(src: Raster<P>): AxisSwapRaster<P>;
export declare function rect<P>(src: Raster<P>, sx: number, sy: number, ex: number, ey: number, padd: P): Raster<P>;
export declare function rectRepeat<P>(src: Raster<P>, sx: number, sy: number, ex: number, ey: number): Raster<P>;
export declare function center<P>(src: Raster<P>, w: number, h: number, padd: P): Raster<P>;
export declare function resize<P>(src: Raster<P>, w: number, h: number): Raster<P>;
export declare function superResize<P>(src: Raster<P>, w: number, h: number, op1: PixelOperator<P>, op2: PixelOperator<P>): Raster<P>;
export declare function constColor<P>(w: number, h: number, color: P): ConstRaster<P>;
export declare function mirrorX<P>(src: Raster<P>): Mirror<P>;
export declare function mirrorY<P>(src: Raster<P>): Mirror<P>;
export declare function mirrorXY<P>(src: Raster<P>): Mirror<P>;
export declare function fit<P>(w: number, h: number, src: Raster<P>, padd: P, upscale?: boolean): Raster<P>;
//# sourceMappingURL=pixelprovider.d.ts.map