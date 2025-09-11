import { checkNotNull } from "./objects";
import { rect } from "./collections";
import { int } from "./mathutils";
export function createEmptyCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}
export function createCanvas(raster, rasterizer) {
    const canvas = document.createElement('canvas');
    canvas.width = raster.width;
    canvas.height = raster.height;
    drawToCanvas(raster, checkNotNull(canvas.getContext('2d'), ''), rasterizer, 0, 0);
    return canvas;
}
export function drawToCanvas(raster, ctx, rasterizer, x = 0, y = 0) {
    const data = new Uint8ClampedArray(raster.width * raster.height * 4);
    const id = new ImageData(data, raster.width, raster.height);
    rasterizer(raster, data);
    ctx.putImageData(id, x, y);
}
export function clearCanvas(canvas, style) {
    const ctx = checkNotNull(canvas.getContext('2d'), '');
    ctx.fillStyle = style;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}
export function axisSwap(data, w, h) {
    const result = new Uint8Array(w * h);
    for (const [x, y] of rect(w, h))
        result[x * h + y] = data[y * w + x];
    return result;
}
export function loadImageFromBuffer(buff) {
    return new Promise(resolve => {
        const blob = new Blob([buff]);
        const urlCreator = window.URL;
        const imageUrl = urlCreator.createObjectURL(blob);
        const img = new Image();
        img.src = imageUrl;
        img.onload = (evt) => {
            const img = evt.target;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = checkNotNull(canvas.getContext('2d'), '');
            ctx.drawImage(img, 0, 0);
            const data = new Uint8Array(ctx.getImageData(0, 0, img.width, img.height).data);
            urlCreator.revokeObjectURL(imageUrl);
            resolve([img.width, img.height, data]);
        };
    });
}
export function loadImage(name) {
    return new Promise(resolve => {
        const image = new Image();
        image.src = name;
        image.onload = (evt) => {
            const img = evt.target;
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = checkNotNull(canvas.getContext('2d'), '');
            ctx.drawImage(img, 0, 0);
            resolve([img.width, img.height, new Uint8Array(ctx.getImageData(0, 0, img.width, img.height).data)]);
        };
    });
}
function drawGrid(ctx, size, w, h, xoff, yoff, scale, goff) {
    const dg = size * scale;
    ctx.beginPath();
    const xcount = 2 + int(w / scale / size);
    const startx = xoff + Math.floor(-xoff / dg) * dg;
    for (let i = 0; i < xcount; i++) {
        const x = startx + i * dg;
        ctx.moveTo(x, 0.5 - goff);
        ctx.lineTo(x, goff + h + 0.5);
    }
    const ycount = 2 + int(h / scale / size);
    const starty = yoff + Math.floor(-yoff / dg) * dg;
    for (let i = 0; i < ycount; i++) {
        const y = starty + i * dg;
        ctx.moveTo(0.5 - goff, y);
        ctx.lineTo(goff + w + 0.5, y);
    }
    ctx.stroke();
}
export function renderGrid(canvas, xoff, yoff, scale, size, pixels) {
    if (canvas.width === 0 || canvas.height === 0)
        return;
    const ctx = checkNotNull(canvas.getContext('2d'), '');
    const w = canvas.width;
    const h = canvas.height;
    ctx.setLineDash([3, 3]);
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 0.9;
    if (size === 0)
        return;
    const gsize = pixels / size;
    ctx.strokeStyle = 'white';
    drawGrid(ctx, gsize, w, h, xoff, yoff, scale, 0);
    ctx.strokeStyle = 'black';
    drawGrid(ctx, gsize, w, h, xoff, yoff, scale, 3);
}
//# sourceMappingURL=imgutils.js.map