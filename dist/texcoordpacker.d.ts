export declare class Rect {
    w: number;
    h: number;
    xoff: number;
    yoff: number;
    constructor(w: number, h: number, xoff?: number, yoff?: number);
}
export declare class Packer {
    private width;
    private height;
    private wpad;
    private hpad;
    private xoff;
    private yoff;
    private p1;
    private p2;
    private sized;
    constructor(width: number, height: number, wpad?: number, hpad?: number, xoff?: number, yoff?: number);
    pack(w: number, h: number): Rect | undefined;
    private splitX;
    private splitY;
}
//# sourceMappingURL=texcoordpacker.d.ts.map