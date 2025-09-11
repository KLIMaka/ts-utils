import { Raster, Rasterizer } from "./pixelprovider";
export declare function createEmptyCanvas(width: number, height: number): HTMLCanvasElement;
export declare function createCanvas<P>(raster: Raster<P>, rasterizer: Rasterizer<P>): HTMLCanvasElement;
export declare function drawToCanvas<P>(raster: Raster<P>, ctx: CanvasRenderingContext2D, rasterizer: Rasterizer<P>, x?: number, y?: number): void;
export declare function clearCanvas(canvas: HTMLCanvasElement, style: string): void;
export declare function axisSwap(data: Uint8Array, w: number, h: number): Uint8Array;
export declare function loadImageFromBuffer(buff: ArrayBuffer): Promise<[number, number, Uint8Array]>;
export declare function loadImage(name: string): Promise<[number, number, Uint8Array]>;
export declare function renderGrid(canvas: HTMLCanvasElement, xoff: number, yoff: number, scale: number, size: number, pixels: number): void;
//# sourceMappingURL=imgutils.d.ts.map