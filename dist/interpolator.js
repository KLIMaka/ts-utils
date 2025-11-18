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
//# sourceMappingURL=interpolator.js.map