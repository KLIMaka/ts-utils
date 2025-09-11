import { clamp, cyclic, int } from './mathutils';
export function palRasterizer(pal, trans = 255, transColor = [0, 0, 0, 255]) {
    return (raster, out) => {
        const w = raster.width;
        const h = raster.height;
        let off = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const color = raster.pixel(x, y);
                if (color !== trans) {
                    const palIdx = color * 3;
                    out[off + 0] = pal[palIdx + 0];
                    out[off + 1] = pal[palIdx + 1];
                    out[off + 2] = pal[palIdx + 2];
                    out[off + 3] = 255;
                }
                else {
                    out[off + 0] = transColor[0];
                    out[off + 1] = transColor[1];
                    out[off + 2] = transColor[2];
                    out[off + 3] = transColor[3];
                }
                off += 4;
            }
        }
    };
}
export function pluTransform(plu) {
    return c => c === 255 ? 255 : plu[c];
}
export function rasterizeRGBA8(raster, out) {
    const u32 = new Uint32Array(out);
    let off = 0;
    for (let y = 0; y < raster.height; y++) {
        for (let x = 0; x < raster.width; x++) {
            u32[off++] = raster.pixel(x, y);
        }
    }
}
export class ConstRaster {
    width;
    height;
    color;
    constructor(width, height, color) {
        this.width = width;
        this.height = height;
        this.color = color;
    }
    pixel(x, y) { return this.color; }
    ;
}
export class ArrayRaster {
    width;
    height;
    pixels;
    constructor(width, height, pixels) {
        this.width = width;
        this.height = height;
        this.pixels = pixels;
        if (pixels.length !== width * height)
            throw new Error(`Invalid dimensions`);
    }
    pixel(x, y) { return this.pixels[int(y) * this.width + int(x)]; }
    ;
}
export class F32RGBAArrayRaster {
    width;
    height;
    pixels;
    mapper;
    constructor(width, height, pixels, mapper) {
        this.width = width;
        this.height = height;
        this.pixels = pixels;
        this.mapper = mapper;
        if (pixels.length !== width * height * 4)
            throw new Error('Invalid dimensions');
    }
    pixel(x, y) {
        const idx = 4 * (int(y) * this.width + int(x));
        return this.mapper(this.pixels[idx], this.pixels[idx + 1], this.pixels[idx + 2], this.pixels[idx + 3]);
    }
}
export class TransformRaster {
    src;
    transform;
    width;
    height;
    constructor(src, transform) {
        this.src = src;
        this.transform = transform;
        this.width = src.width;
        this.height = src.height;
    }
    pixel(x, y) { return this.transform(this.src.pixel(x, y)); }
    ;
}
export class AxisSwapRaster {
    src;
    width;
    height;
    constructor(src) {
        this.src = src;
        this.width = src.height;
        this.height = src.width;
    }
    pixel(x, y) { return this.src.pixel(y, x); }
    ;
}
export class Mirror {
    src;
    xmirrored;
    ymirrored;
    width;
    height;
    constructor(src, xmirrored, ymirrored) {
        this.src = src;
        this.xmirrored = xmirrored;
        this.ymirrored = ymirrored;
        this.width = src.width;
        this.height = src.height;
    }
    pixel(x, y) { return this.src.pixel(this.xmirrored ? this.width - x : x, this.ymirrored ? this.height - y : y); }
    ;
}
export class RectRaster {
    src;
    sx;
    sy;
    padd;
    width;
    height;
    constructor(src, sx, sy, ex, ey, padd) {
        this.src = src;
        this.sx = sx;
        this.sy = sy;
        this.padd = padd;
        this.width = ex - sx;
        this.height = ey - sy;
    }
    pixel(x, y) {
        const nx = this.sx + x;
        const ny = this.sy + y;
        if (nx < 0 || ny < 0 || nx >= this.src.width || ny >= this.src.height)
            return this.padd(cyclic(nx, this.src.width), cyclic(ny, this.src.height), this.src);
        return this.src.pixel(nx, ny);
    }
}
export class ResizeRaster {
    src;
    width;
    height;
    dx;
    dy;
    constructor(src, width, height) {
        this.src = src;
        this.width = width;
        this.height = height;
        this.dx = src.width / this.width;
        this.dy = src.height / this.height;
    }
    pixel(x, y) { return this.src.pixel(x * this.dx, y * this.dy); }
}
const DITH = [
    0.0, 0.5, 0.125, 0.625,
    0.75, 0.25, 0.875, 0.375,
    0.1875, 0.6875, 0.0625, 0.5625,
    0.9375, 0.4375, 0.8125, 0.3125
];
function dithOffset(x, y) {
    const idx = int(x) % 4 * 4 + int(y) % 4;
    return DITH[idx];
}
export class SuperResizeRaster {
    src;
    width;
    height;
    op1;
    op2;
    dx;
    dy;
    maxw;
    maxh;
    constructor(src, width, height, op1, op2) {
        this.src = src;
        this.width = width;
        this.height = height;
        this.op1 = op1;
        this.op2 = op2;
        this.dx = src.width / this.width;
        this.dy = src.height / this.height;
        this.maxw = src.width - 1;
        this.maxh = src.height - 1;
    }
    pixel(x, y) {
        const nx = x * this.dx;
        const ny = y * this.dy;
        const inx = int(nx);
        const iny = int(ny);
        const doff = dithOffset(x, y);
        const fracx = nx - inx;
        const fracy = ny - iny;
        const dx = fracx <= 0.5 ? -1 : +1;
        const dy = fracy <= 0.5 ? -1 : +1;
        const addSample1 = this.src.pixel(clamp(inx + dx, 0, this.maxw), clamp(iny, 0, this.maxh));
        const addSample2 = this.src.pixel(clamp(inx, 0, this.maxw), clamp(iny + dy, 0, this.maxh));
        const newSample = this.op1(addSample1, addSample2, doff);
        const origSample = this.src.pixel(inx, iny);
        return newSample == null ? origSample : this.op2(origSample, newSample, doff);
    }
}
export function array(arr, w, h) {
    return new ArrayRaster(w, h, arr);
}
export function f32array(arr, w, h, mapper) {
    return new F32RGBAArrayRaster(w, h, arr, mapper);
}
export function transform(src, transform) {
    return new TransformRaster(src, transform);
}
export function axisSwap(src) {
    return new AxisSwapRaster(src);
}
export function rect(src, sx, sy, ex, ey, padd) {
    if (sx === 0 && sy === 0 && src.height === ey && src.width === ex)
        return src;
    return new RectRaster(src, sx, sy, ex, ey, (x, y, r) => padd);
}
export function rectRepeat(src, sx, sy, ex, ey) {
    if (sx === 0 && sy === 0 && src.height === ey && src.width === ex)
        return src;
    return new RectRaster(src, sx, sy, ex, ey, (x, y, r) => r.pixel(x, y));
}
export function center(src, w, h, padd) {
    const dw = int((src.width - w) / 2);
    const dh = int((src.height - h) / 2);
    return rect(src, dw, dh, w + dw, h + dh, padd);
}
export function resize(src, w, h) {
    if (src.height === h && src.width === w)
        return src;
    return new ResizeRaster(src, w, h);
}
export function superResize(src, w, h, op1, op2) {
    if (src.height === h && src.width === w)
        return src;
    return new SuperResizeRaster(src, w, h, op1, op2);
}
export function constColor(w, h, color) {
    return new ConstRaster(w, h, color);
}
export function mirrorX(src) {
    return new Mirror(src, true, false);
}
export function mirrorY(src) {
    return new Mirror(src, false, true);
}
export function mirrorXY(src) {
    return new Mirror(src, true, true);
}
export function fit(w, h, src, padd, upscale = false) {
    const aspect = src.width / src.height;
    if (src.height === h && src.width === w) {
        return src;
    }
    else if (upscale && src.width < w && src.height < h) {
        const wsf = w / src.width;
        const hsf = h / src.height;
        const sf = Math.min(wsf, hsf);
        const nw = int(src.width * sf);
        const nh = int(src.height * sf);
        const sx = int((nw - w) / 2);
        const sy = int((nh - h) / 2);
        return rect(resize(src, nw, nh), sx, sy, w + sx, h + sy, padd);
    }
    else if (src.width <= w && src.height <= h) {
        const sx = int((src.width - w) / 2);
        const sy = int((src.height - h) / 2);
        return rect(src, sx, sy, w + sx, h + sy, padd);
    }
    else {
        let nw = src.width;
        let nh = src.height;
        let r = false;
        if (nw > w) {
            nw = w;
            nh = int(nw / aspect);
            r = true;
        }
        if (nh > h) {
            nh = h;
            nw = int(nh * aspect);
            r = true;
        }
        if (r) {
            const sx = int((nw - w) / 2);
            const sy = int((nh - h) / 2);
            return rect(resize(src, nw, nh), sx, sy, w + sx, h + sy, padd);
        }
        else {
            return resize(src, w, h);
        }
    }
}
//# sourceMappingURL=pixelprovider.js.map