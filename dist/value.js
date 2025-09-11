import { int } from "./mathutils";
export function and(v1, v2) { return (v) => v1(v) && v2(v); }
export const IntParser = Number.parseInt;
export const FloatParser = Number.parseFloat;
export const IntParseValidator = (str) => !isNaN(IntParser(str));
export const FloatParseValidator = (str) => !isNaN(FloatParser(str));
export const numberRangeValidator = (min, max) => (v) => v <= max && v >= min;
export const intNumberValidator = (v) => int(v) == v;
const NUMBER_FMT = Intl.NumberFormat('en-US', { maximumFractionDigits: 4, useGrouping: false, }).format;
export function intValue(def, validator) {
    return { default: () => def, validator: and(intNumberValidator, validator), parseValidator: IntParseValidator, parser: IntParser, formatter: NUMBER_FMT };
}
export function floatValue(def, validator) {
    return { default: () => def, validator: validator, parseValidator: FloatParseValidator, parser: FloatParser, formatter: NUMBER_FMT };
}
//# sourceMappingURL=value.js.map