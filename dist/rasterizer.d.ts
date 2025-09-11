export declare class Rasterizer {
    private img;
    private shader;
    private w;
    private h;
    private dx;
    private dy;
    private sx;
    private sy;
    private reg;
    private attrs;
    private attrparams;
    constructor(img: Uint8Array, w: number, h: number, shader: (a: number[]) => number[]);
    bindAttribute(id: number, buf: number[], offset: number, stride: number): void;
    bindAttributes(startid: number, buf: number[], numattrs: number): void;
    private getIntersectionsTri;
    private allocateRegisters;
    clear(color: number[], d: number): void;
    drawTriangles(indices: number[], start?: number, length?: number): IterableIterator<number[]>;
}
//# sourceMappingURL=rasterizer.d.ts.map