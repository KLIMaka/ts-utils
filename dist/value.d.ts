export type ParseValidator = (str: string) => boolean;
export type Parser<T> = (str: string) => T;
export type Formatter<T> = (value: T) => string;
export type Validator<T> = (value: T) => boolean;
export type ValueProvider<T> = () => T;
export type Changer<T, C> = (value: T, change: C) => T;
export declare function and<T>(v1: Validator<T>, v2: Validator<T>): Validator<T>;
export declare const IntParser: Parser<number>;
export declare const FloatParser: Parser<number>;
export declare const IntParseValidator: ParseValidator;
export declare const FloatParseValidator: ParseValidator;
export declare const numberRangeValidator: (min: number, max: number) => Validator<number>;
export declare const intNumberValidator: Validator<number>;
export type BasicValue<T> = {
    parseValidator: ParseValidator;
    parser: Parser<T>;
    formatter: Formatter<T>;
    validator: Validator<T>;
    default: ValueProvider<T>;
};
export declare function intValue(def: number, validator: Validator<number>): BasicValue<number>;
export declare function floatValue(def: number, validator: Validator<number>): BasicValue<number>;
//# sourceMappingURL=value.d.ts.map