export declare class Place {
    offset: number;
    size: number;
    data: any;
    static of(offset: number, size: number): Place;
    constructor(offset: number, size: number, data?: any);
}
export declare class Bag {
    readonly size: number;
    private holes;
    constructor(size: number);
    private getSuitablePlace;
    private tryMerge;
    put(offset: number, size: number): void;
    get(size: number): number | null;
    reset(): void;
    getHoles(): Place[];
    freeSpace(segments: number): number[];
}
export declare class BagController {
    private bag;
    private places;
    constructor(size: number);
    get(size: number): Place | null;
    put(place: Place): void;
    freeSpace(segments: number): number[];
}
export declare function create(size: number): Bag;
export declare function createController(size: number, updater: (place: Place, noffset: number) => void): BagController;
//# sourceMappingURL=bag.d.ts.map