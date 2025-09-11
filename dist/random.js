import { int } from "./mathutils";
export function rand0(to) {
    return Math.random() * to;
}
export function randInt0(to) {
    return int(Math.random() * (to + 1));
}
export function rand(from, to) {
    return from + Math.random() * (to - from);
}
export function randInt(from, to) {
    return int(from + Math.random() * (to - from + 1));
}
export function coin() {
    return Math.random() > 0.5;
}
//# sourceMappingURL=random.js.map