import { getOrCreate, map, range } from "./collections";
import { LinearInterpolator } from "./interpolator";
import { FastList } from "./list";
export const radsInDeg = 180 / Math.PI;
export const degInRad = Math.PI / 180;
export const PI = Math.PI;
export const TWO_PI = Math.PI * 2;
export const HALF_PI = Math.PI / 2;
export const EPS = 1e-9;
export const HASH = (Math.sqrt(5) - 1) / 2;
export function eq(lh, rh) {
    return Math.abs(lh - rh) < EPS;
}
export function lse(lh, rh) {
    return eq(lh, rh) || lh < rh;
}
export function gte(lh, rh) {
    return eq(lh, rh) || lh > rh;
}
export function deg2rad(deg) {
    return deg * degInRad;
}
export function rad2deg(rad) {
    return rad * radsInDeg;
}
export function sign(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
}
export function int(x) {
    return x | 0;
}
export function clamp(x, min = 0.0, max = 1.0) {
    return x > max ? max : x < min ? min : x;
}
export function mix(x, y, d) {
    return x + (y - x) * d;
}
export function normalize(x, min, max) {
    const d = max - min;
    return (x - min) / d;
}
export function sum(lh, rh) {
    return lh + rh;
}
export function trz(x) {
    x = int(x);
    if (x === 0)
        return 32;
    let count = 0;
    while ((x & 1) === 0) {
        x = x >> 1;
        count++;
    }
    return count;
}
export function ispow2(x) {
    return (x & (x - 1)) === 0;
}
export function fract(x) {
    return x - int(x);
}
export function nextpow2(x) {
    --x;
    for (let i = 1; i < 32; i <<= 1) {
        x = x | (x >> i);
    }
    return x + 1;
}
export function sqrLen2d(x, y) {
    return x * x + y * y;
}
export function len2d(x, y) {
    return Math.sqrt(x * x + y * y);
}
export function lenPointToLine(px, py, l1x, l1y, l2x, l2y) {
    const ldx = l2x - l1x;
    const ldy = l2y - l1y;
    const pdx = px - l1x;
    const pdy = py - l1y;
    const dot = dot2d(ldx, ldy, pdx, pdy);
    if (dot <= 0)
        return len2d(pdx, pdy);
    const llensqr = sqrLen2d(ldx, ldy);
    if (dot >= llensqr)
        return len2d(px - l2x, py - l2y);
    const t = dot / llensqr;
    return len2d(px - (l1x + ldx * t), py - (l1y + ldy * t));
}
export function len3d(x, y, z) {
    return Math.sqrt(x * x + y * y + z * z);
}
export function dot2d(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
}
export function orto2d(x, y) {
    return [-y, x];
}
export function ortonorm2d(x, y) {
    const [ox, oy] = orto2d(x, y);
    const l = len2d(ox, oy);
    return [ox / l, oy / l];
}
export function cross2d(x1, y1, x2, y2) {
    return x1 * y2 - y1 * x2;
}
export function monoatan2(y, x) {
    const atan = Math.atan2(y, x);
    return atan < 0 ? (2 * Math.PI) + atan : atan;
}
export function angInArc(arcStart, arcEnd, ang) {
    return arcStart > arcEnd ? ang >= arcStart || ang <= arcEnd : ang >= arcStart && ang <= arcEnd;
}
export function arcsIntersects(a1s, a1e, a2s, a2e) {
    return angInArc(a1s, a1e, a2s) || angInArc(a1s, a1e, a2e) || angInArc(a2s, a2e, a1s) || angInArc(a2s, a2e, a1e);
}
export function cyclic(x, max) {
    const mod = x % max;
    return x >= 0 ? mod : mod === 0 ? max - 1 : max + mod;
}
export function linear(min, max, t) {
    return min + (max - min) * t;
}
const buf = new ArrayBuffer(4);
const int4 = new Int8Array(buf);
const float = new Float32Array(buf);
export function int4ToFloat(x, y, z, w) {
    int4[0] = x;
    int4[1] = y;
    int4[2] = z;
    int4[3] = w;
    return float[0];
}
export function cubic(x) {
    return 3 * x * x - 2 * x * x * x;
}
export function smothstep(x, min, max) {
    if (x <= min)
        return 0;
    if (x >= max)
        return 1;
    return cubic((x - min) / (max - min));
}
export function vec42int(x, y, z, w) {
    return x | (y << 8) | (z << 16) | (w << 24);
}
export function tuple(v0, v1) {
    return (v0 & 0xffff) | (v1 << 16);
}
export function detuple0(v) {
    return v & 0xffff;
}
export function detuple1(v) {
    return (v >>> 16) & 0xffff;
}
export function tuple2(value, v0, v1) {
    value[0] = v0;
    value[1] = v1;
    return value;
}
export function tuple3(value, v0, v1, v2) {
    value[0] = v0;
    value[1] = v1;
    value[2] = v2;
    return value;
}
export function tuple4(value, v0, v1, v2, v3) {
    value[0] = v0;
    value[1] = v1;
    value[2] = v2;
    value[3] = v3;
    return value;
}
export function productValue(start, f) {
    return {
        get: () => start,
        set: (v) => start = f(start, v)
    };
}
export function minValue(start) {
    return productValue(start, (lh, rh) => Math.min(rh, lh));
}
export function memoize(f) {
    const cache = new Map();
    return (t) => getOrCreate(cache, t, _ => f(t));
}
export function quadratic(x0, x1, x2, t) {
    // const a2 = (x2 - x0) * 2 - (x1 - x0) * 4;
    // const a1 = (x1 - x0) * 2 - a2 * 0.5;
    const a0 = x0;
    const a1 = x0 * -3 + x1 * 4 - x2;
    const a2 = x0 * 2 - x1 * 4 + x2 * 2;
    return a0 + a1 * t + a2 * t * t;
}
export function biquad(w, h, data, wrap = cyclic) {
    return (x, y) => {
        const sx = x * w;
        const sy = y * h;
        const cx = Math.round(sx - 0.5);
        const cy = Math.round(sy - 0.5);
        const cx0 = wrap(cx - 1, w);
        const cx1 = wrap(cx + 0, w);
        const cx2 = wrap(cx + 1, w);
        const cy0 = wrap(cy - 1, h) * w;
        const cy1 = wrap(cy + 0, h) * w;
        const cy2 = wrap(cy + 1, h) * w;
        const fracx = (0.25 + 0.5 * (sx - cx));
        const fracy = (0.25 + 0.5 * (sy - cy));
        const q0 = quadratic(data[cx0 + cy0], data[cx1 + cy0], data[cx2 + cy0], fracx);
        const q1 = quadratic(data[cx0 + cy1], data[cx1 + cy1], data[cx2 + cy1], fracx);
        const q2 = quadratic(data[cx0 + cy2], data[cx1 + cy2], data[cx2 + cy2], fracx);
        return quadratic(q0, q1, q2, fracy);
    };
}
export function bilinear(w, h, data, inter, wrap = cyclic) {
    return (x, y) => {
        const sx = x * w;
        const sy = y * h;
        const cx = Math.floor(sx - 0.5);
        const cy = Math.floor(sy - 0.5);
        const cx0 = wrap(cx, w);
        const cx1 = wrap(cx + 1, w);
        const cy0 = wrap(cy, h) * w;
        const cy1 = wrap(cy + 1, h) * w;
        const r1 = data[cx0 + cy0];
        const r2 = data[cx1 + cy0];
        const r3 = data[cx0 + cy1];
        const r4 = data[cx1 + cy1];
        const fracx = (sx - cx - 0.5);
        const fracy = (sy - cy - 0.5);
        return inter(inter(r1, r2, fracx), inter(r3, r4, fracx), fracy);
    };
}
const PERMUTATIONS = [151, 160, 137, 91, 90, 15,
    131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
];
const PERLIN = [...PERMUTATIONS, ...PERMUTATIONS];
function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}
const DIAG = Math.SQRT2;
const grads = [[1, 0], [-1, 0], [DIAG, -DIAG], [0, -1], [DIAG, DIAG], [0, 1], [-DIAG, DIAG], [-DIAG, -DIAG]];
function grad2d(hash, x, y) {
    const h = hash & 7;
    const grad = grads[h];
    return grad[0] * x + grad[1] * y;
}
export function perlin2d(x, y) {
    const intx = Math.floor(x);
    const inty = Math.floor(y);
    const X = intx & 255;
    const Y = inty & 255;
    x -= intx;
    y -= inty;
    const u = fade(x);
    const v = fade(y);
    const A = PERLIN[X] + Y;
    const AA = PERLIN[A];
    const AB = PERLIN[A + 1];
    const B = PERLIN[X + 1] + Y;
    const BA = PERLIN[B];
    const BB = PERLIN[B + 1];
    return LinearInterpolator(LinearInterpolator(grad2d(PERLIN[AA], x, y), grad2d(PERLIN[BA], x - 1, y), u), LinearInterpolator(grad2d(PERLIN[AB], x, y - 1), grad2d(PERLIN[BB], x - 1, y - 1), u), v);
}
const POWS = [...map(range(0, 20), x => 1 / Math.pow(2, x))];
export function octaves2d(f, octaves) {
    return (x, y) => {
        let sum = 0;
        let norm = 0;
        for (let i = 1; i <= octaves; i++) {
            const k = POWS[i - 1];
            sum += f(x * i, y * i) * k;
            norm += k;
        }
        return sum / norm;
    };
}
export const Vec2Hash = ([x, y]) => (x * 9834497) ^ (y * 8503057);
export const Vec2Eq = ([x1, y1], [x2, y2]) => x1 === x2 && y1 === y2;
function slope(f, x, d = 0.01) {
    const y1 = f(x - d);
    const y2 = f(x + d);
    return (y2 - y1) / (2 * d);
}
export function optimize(f, count = 2, eps = 0.001) {
    const x0 = f(0.5);
    let xp = x0;
    let xn = x0 - f(x0) / slope(f, x0);
    let i = 0;
    let dx = Math.abs(xp - xn);
    while (i < count && dx > eps) {
        xp = xn;
        xn = xp - f(xp) / slope(f, xp, dx);
        dx = Math.abs(xp - xn);
        i++;
    }
    return xn;
}
export function createSegment(start, end, value) {
    return { start, end, value };
}
export class RadialSegments {
    segments = new FastList();
    constructor() {
        this.clear();
    }
    clear() {
        this.segments.clear();
        this.segments.push({ start: 0, end: 1, value: Number.MAX_VALUE });
    }
    optimize() {
        const nsegments = new FastList();
        let lastSeg = null;
        for (const seg of this.segments) {
            if (lastSeg === null)
                lastSeg = seg;
            if (lastSeg.value === seg.value)
                lastSeg.end = seg.end;
            else {
                nsegments.push(lastSeg);
                lastSeg = seg;
            }
        }
        if (lastSeg !== null)
            nsegments.push(lastSeg);
        this.segments = nsegments;
    }
    getValue(x) {
        const seg = this.findSegment(this.segments.first(), x);
        return this.segments.get(seg).value;
    }
    scan(seg) {
        if (seg.start > seg.end) {
            return this.scan(createSegment(0, seg.start, seg.value))
                || this.scan(createSegment(seg.end, 1, seg.value));
        }
        else {
            const startSeg = this.findSegment(this.segments.first(), seg.start);
            const endSeg = this.findSegment(startSeg, seg.end);
            let curr = startSeg;
            for (;;) {
                if (seg.value <= this.segments.get(curr).value)
                    return true;
                if (curr === endSeg)
                    return false;
                curr = this.segments.next(curr);
            }
        }
    }
    add(seg) {
        if (seg.start > seg.end) {
            this.add(createSegment(0, seg.end, seg.value));
            this.add(createSegment(seg.start, 1, seg.value));
        }
        else {
            const startSeg = this.insertPoint(this.segments.first(), seg.start);
            const endSeg = this.insertPoint(startSeg, seg.end);
            let ptr = startSeg;
            while (ptr !== 0 && ptr !== endSeg) {
                const segment = this.segments.get(ptr);
                segment.value = Math.min(segment.value, seg.value);
                ptr = this.segments.next(ptr);
            }
        }
    }
    insertPoint(start, x) {
        const seg = this.findSegment(start, x);
        const segment = this.segments.get(seg);
        if (segment.start === x)
            return seg;
        if (segment.end === x)
            return this.segments.next(seg);
        const nseg = this.segments.insertAfter(createSegment(x, segment.end, segment.value), seg);
        segment.end = x;
        return nseg;
    }
    findSegment(start, x) {
        for (let seg = start;; seg = this.segments.next(seg))
            if (x >= this.segments.get(seg).start && x <= this.segments.get(seg).end)
                return seg;
    }
}
//# sourceMappingURL=mathutils.js.map