import { FastList } from "./list";
import { linear, quadratic, smothstep } from "./mathutils";
export function left() { return (lh, rh, t) => lh; }
export function right() { return (lh, rh, t) => rh; }
export const LinearInterpolator = (lh, rh, t) => linear(lh, rh, t);
export const SmothstepInterpolator = (lh, rh, t) => lh + smothstep(lh + (rh - lh) * t, lh, rh) * (rh - lh);
export function quadraticInterpolator(mid) {
    return (lh, rh, t) => quadratic(lh, lh + (rh - lh) * mid, rh, t);
}
export function vector2(inter) {
    return (lh, rh, t) => [inter(lh[0], rh[0], t), inter(lh[1], rh[1], t)];
}
export function vector3(inter) {
    return (lh, rh, t) => [
        inter(lh[0], rh[0], t),
        inter(lh[1], rh[1], t),
        inter(lh[2], rh[2], t),
    ];
}
export function vector4(inter) {
    return (lh, rh, t) => [
        inter(lh[0], rh[0], t),
        inter(lh[1], rh[1], t),
        inter(lh[2], rh[2], t),
        inter(lh[3], rh[3], t),
    ];
}
export class Point {
    val;
    pos;
    interpolator;
    constructor(val, pos, interpolator) {
        this.val = val;
        this.pos = pos;
        this.interpolator = interpolator;
    }
}
export function PointComparator(lh, rh) { return lh.pos - rh.pos; }
export class Range {
    points = new FastList();
    constructor(start, end, interpolator) {
        this.points.push(new Point(start, 0, interpolator));
        this.points.push(new Point(end, 1, left()));
    }
    insert(val, t, interpolator) {
        const idx = binaryIndexOf1(this.points, new Point(null, t, null), PointComparator);
        this.points.insertAfter(new Point(val, t, interpolator), idx);
    }
    get(t) {
        if (t < 0)
            return this.points.get(this.points.next(0)).val;
        if (t > 1)
            return this.points.get(this.points.last(0)).val;
        const idx = binaryIndexOf1(this.points, new Point(null, t, null), PointComparator);
        const lh = this.points.get(idx);
        const rh = this.points.get(this.points.next(idx));
        const localT = (t - lh.pos) / (rh.pos - lh.pos);
        return lh.interpolator(lh.val, rh.val, localT);
    }
}
function advance(iter, list, steps) {
    for (let i = 0; i < steps; i++)
        iter = list.next(iter);
    return iter;
}
function length(list) {
    let length = 0;
    for (let i = 0; i !== list.last(0); i = list.next(i))
        length++;
    return length;
}
export function binaryIndexOf1(list, searchElement, cmp) {
    const refMin = list.next(0);
    let min = list.next(0);
    let max = list.last(0);
    if (cmp(searchElement, list.get(min)) < 0 || cmp(searchElement, list.get(max)) > 0)
        return -1;
    let current = min;
    let currentElement = null;
    while (min !== max) {
        current = advance(min, list, length(list) / 2 | 0);
        currentElement = list.get(current);
        let cmpVal = cmp(currentElement, searchElement);
        if (cmpVal < 0)
            min = list.next(current);
        else if (cmpVal > 0)
            max = list.last(current);
        else
            break;
    }
    return current === refMin ? refMin : current - 1;
}
export function binaryIndexOf(arr, searchElement, cmp, minIndex = 0, maxIndex = arr.length() - 1) {
    const refMinIndex = minIndex;
    if (cmp(searchElement, arr.get(minIndex)) < 0 || cmp(searchElement, arr.get(maxIndex)) > 0)
        return -1;
    let currentIndex = 0;
    let currentElement = null;
    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = arr.get(currentIndex);
        const cmpVal = cmp(currentElement, searchElement);
        if (cmpVal < 0)
            minIndex = currentIndex + 1;
        else if (cmpVal > 0)
            maxIndex = currentIndex - 1;
        else
            break;
    }
    return currentIndex === refMinIndex ? refMinIndex : currentIndex - 1;
}
//# sourceMappingURL=interpolator.js.map