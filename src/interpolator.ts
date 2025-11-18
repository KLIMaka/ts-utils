import { linear, quadratic, smothstep } from "./mathutils";

export type Interpolator<T> = (lh: T, rh: T, t: number) => T;

export function left<T>(): Interpolator<T> { return (lh, rh, t) => lh }
export function right<T>(): Interpolator<T> { return (lh, rh, t) => rh }

export const LinearInterpolator = (lh: number, rh: number, t: number) => linear(lh, rh, t);
export const SmothstepInterpolator = (lh: number, rh: number, t: number) => lh + smothstep(lh + (rh - lh) * t, lh, rh) * (rh - lh);

export function quadraticInterpolator(mid: number): Interpolator<number> {
  return (lh, rh, t) => quadratic(lh, lh + (rh - lh) * mid, rh, t);
}

export function vector2(inter: Interpolator<number>): Interpolator<[number, number]> {
  return (lh, rh, t) => [inter(lh[0], rh[0], t), inter(lh[1], rh[1], t)]
}

export function vector3(inter: Interpolator<number>): Interpolator<[number, number, number]> {
  return (lh, rh, t) => [
    inter(lh[0], rh[0], t),
    inter(lh[1], rh[1], t),
    inter(lh[2], rh[2], t),
  ]
}

export function vector4(inter: Interpolator<number>): Interpolator<[number, number, number, number]> {
  return (lh, rh, t) => [
    inter(lh[0], rh[0], t),
    inter(lh[1], rh[1], t),
    inter(lh[2], rh[2], t),
    inter(lh[3], rh[3], t),
  ]
}