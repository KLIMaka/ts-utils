import { range } from "./collections";
export class KDTree {
    points;
    dims;
    distanceFn;
    inRangeFn;
    tree = [];
    top;
    constructor(points, dims, distanceFn, inRangeFn) {
        this.points = points;
        this.dims = dims;
        this.distanceFn = distanceFn;
        this.inRangeFn = inRangeFn;
        this.top = this.build([...range(0, points.length / dims)], 0);
    }
    insertNode(pointIdx, left, right) {
        const idx = this.tree.length;
        this.tree.push(pointIdx, left, right);
        return idx;
    }
    point(idx, dim) {
        return this.points[idx * this.dims + dim];
    }
    build(idxs, depth) {
        if (idxs.length === 1)
            return this.insertNode(idxs[0], -1, -1);
        if (idxs.length === 0)
            return -1;
        const dim = depth % this.dims;
        const sorted = idxs.sort((lh, rh) => this.point(lh, dim) - this.point(rh, dim));
        const mid = Math.floor(sorted.length / 2);
        return this.insertNode(idxs[mid], this.build(sorted.slice(0, mid), depth + 1), this.build(sorted.slice(mid + 1), depth + 1));
    }
    closest(pos) {
        const estIdx = this.closestEstimation(pos, this.top, Number.MAX_VALUE, 0);
        const d = this.distanceFn(this.getPoint(estIdx), pos);
        let mind = d;
        let minIdx = estIdx;
        for (const idx of this.inRangeRadius(pos, d)) {
            const d = this.distanceFn(this.getPoint(idx), pos);
            if (d < mind) {
                mind = d;
                minIdx = idx;
            }
        }
        return minIdx;
    }
    inRange(min, max) {
        const result = [];
        this.rangeSearch(min, max, this.top, 0, result);
        return result;
    }
    inRangeRadius(pos, r) {
        const result = [];
        this.rangeSearch(pos.map(x => x - r), pos.map(x => x + r), this.top, 0, result);
        return result;
    }
    getPoint(idx) {
        return this.points.slice(idx * this.dims, idx * this.dims + this.dims);
    }
    closestEstimation(pos, node, mind, depth) {
        if (node === -1)
            return -1;
        const idx = this.tree[node];
        const left = this.tree[node + 1];
        const right = this.tree[node + 2];
        const d = this.distanceFn(this.getPoint(idx), pos);
        const dim = depth % this.dims;
        const dd = pos[dim] - this.point(idx, dim);
        const nextNode = dd <= 0 ? left : right;
        const nmind = Math.min(mind, d);
        const closest = this.closestEstimation(pos, nextNode, nmind, depth + 1);
        return closest === -1 ? idx : closest;
    }
    rangeSearch(min, max, node, depth, result) {
        if (node === -1)
            return;
        const idx = this.tree[node];
        const left = this.tree[node + 1];
        const right = this.tree[node + 2];
        const dim = depth % this.dims;
        if (this.point(idx, dim) > min[dim] && this.point(idx, dim) > max[dim])
            return this.rangeSearch(min, max, left, depth + 1, result);
        if (this.point(idx, dim) < min[dim] && this.point(idx, dim) < max[dim])
            return this.rangeSearch(min, max, right, depth + 1, result);
        if (this.inRangeFn(this.getPoint(idx), min, max))
            result.push(idx);
        this.rangeSearch(min, max, left, depth + 1, result);
        this.rangeSearch(min, max, right, depth + 1, result);
    }
}
//# sourceMappingURL=kdtree.js.map