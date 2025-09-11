export declare function rgb2hsl(r: number, g: number, b: number): [number, number, number];
export declare function hsl2rgb(h: number, s: number, l: number): [number, number, number];
export declare function rgb2xyz(r: number, g: number, b: number): [number, number, number];
export declare function xyz2rgb(x: number, y: number, z: number): [number, number, number];
export declare function xyz2lab(x: number, y: number, z: number): [number, number, number];
export declare function convertPal(srcPal: ArrayLike<number>, conv: (a: number, b: number, c: number) => [number, number, number]): number[];
export declare function labDist(pal: number[], color: number, l: number, a: number, b: number): number;
export declare function palColorFinder(pal: ArrayLike<number>): (r: number, g: number, b: number) => number;
export declare function findLab(pal: number[], l: number, a: number, b: number): [number, number, number];
export declare function resizeIndexed(dstw: number, dsth: number, srcw: number, srch: number, src: Uint8Array, pal: number[], labpal: number[]): Uint8Array;
export declare function convoluteIndexed(cx: number, cy: number, w: number, h: number, imgw: number, img: Uint8Array, pal: number[], labpal: number[]): number;
export declare const ditherMatrix: number[];
export declare function dither(x: number, y: number, t: number, matrix: number[]): boolean;
export declare function rgb2lum(r: number, g: number, b: number): number;
export declare function scale2x(width: number, height: number, src: Uint8Array): Uint8Array;
//# sourceMappingURL=color.d.ts.map