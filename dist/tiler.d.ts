export declare class Tiler {
    private tiles;
    put(x: number, y: number, tileId: number): Tiler;
    get(x: number, y: number): number | undefined;
    size(): number;
    tile(cb: (x: number, y: number, tileId: number) => void): void;
}
//# sourceMappingURL=tiler.d.ts.map