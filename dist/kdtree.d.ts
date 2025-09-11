import { BiFunction, MultiFunction } from "./types";
export declare class KDTree {
    private points;
    private dims;
    private distanceFn;
    private inRangeFn;
    private tree;
    private top;
    constructor(points: number[], dims: number, distanceFn: BiFunction<number[], number[], number>, inRangeFn: MultiFunction<[number[], number[], number[]], boolean>);
    private insertNode;
    private point;
    private build;
    closest(pos: number[]): number;
    inRange(min: number[], max: number[]): number[];
    inRangeRadius(pos: number[], r: number): number[];
    private getPoint;
    private closestEstimation;
    private rangeSearch;
}
//# sourceMappingURL=kdtree.d.ts.map