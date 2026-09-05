import { Fn, TypedArray } from "./types";
export declare class View {
    readonly arr: Uint8Array;
    private LE;
    private viewImpl;
    constructor(arr: Uint8Array, LE?: boolean);
    private getOff;
    readByte(off: number): number;
    writeByte(off: number, byte: number): void;
    readUByte(off: number): number;
    writeUByte(off: number, byte: number): void;
    readShort(off: number): number;
    writeShort(off: number, short: number): void;
    readUShort(off: number): number;
    writeUShort(off: number, short: number): void;
    readInt(off: number): number;
    writeInt(off: number, int: number): void;
    readUInt(off: number): number;
    writeUInt(off: number, int: number): void;
    readFloat(off: number): number;
    writeFloat(off: number, float: number): void;
    readRaw<T extends TypedArray>(off: number, len: number, ctr: TypedArrayConstructor<T>): T;
    writeArray(off: number, arr: Uint8Array): void;
    readByteString(off: number, len: number): string;
    writeByteString(off: number, len: number, str: string): void;
    readBits(off: number, bits: number): number;
    writeBits(off: number, bits: number, value: number): void;
    stream(): Stream;
    read<T>(off: number, acc: Accessor<T>): Immutable<T>;
    view<T>(off: number, acc: Accessor<T>): Mutable<T>;
    raw(off: number, size: number): Uint8Array;
    write<T, V extends T>(off: number, acc: Accessor<T>, value: V): void;
}
export declare class Stream {
    private viewImpl;
    private off;
    constructor(viewImpl: View);
    read<T>(acc: Accessor<T>): Immutable<T>;
    view<T>(acc: Accessor<T>): Mutable<T>;
    write<T, V extends T>(acc: Accessor<T>, value: V): void;
    raw<T>(size: number): Uint8Array;
    setOffset(off: number): void;
    eoi(): boolean;
    skip(off: number): void;
    mark(): number;
}
type PrimitiveType = number | string | boolean;
export type Mutable<T> = T extends PrimitiveType ? T : T extends object ? {
    -readonly [K in keyof T]: T[K];
} : T;
export type Immutable<T> = T extends PrimitiveType ? T : T extends object ? {
    readonly [K in keyof T]: Immutable<T[K]>;
} : T;
export type Reader<T> = (v: View, off: number) => Immutable<T>;
export type Viewer<T> = (v: View, off: number) => Mutable<T>;
export type Writer<T> = <V extends T>(v: View, off: number, value: V) => void;
export type Accessor<T> = Readonly<{
    view: Viewer<T>;
    read: Reader<T>;
    write: Writer<T>;
    size: number;
}>;
export type AccessorType<T> = T extends Accessor<infer T1> ? T1 : never;
type TypedArrayConstructor<T extends TypedArray> = {
    new (buffer: ArrayBufferLike, byteOffset: number, length: number): T;
    readonly BYTES_PER_ELEMENT: number;
};
export declare class AtomicAccessor<T, AT extends TypedArray> implements Accessor<T> {
    readonly view: Viewer<T>;
    readonly read: Reader<T>;
    readonly write: Writer<T>;
    readonly size: number;
    readonly typedArrayCtor: TypedArrayConstructor<AT>;
    constructor(view: Viewer<T>, read: Reader<T>, write: Writer<T>, size: number, typedArrayCtor: TypedArrayConstructor<AT>);
}
export declare const transformed: <Stored, Actual>(stored: Accessor<Stored>, toStored: Fn<Actual, Stored>, fromStored: Fn<Immutable<Stored>, Immutable<Actual>>) => Readonly<{
    view: Viewer<Actual>;
    read: Reader<Actual>;
    write: Writer<Actual>;
    size: number;
}>;
export declare const byte: AtomicAccessor<number, Int8Array<ArrayBufferLike>>;
export declare const ubyte: AtomicAccessor<number, Uint8Array<ArrayBufferLike>>;
export declare const short: AtomicAccessor<number, Int16Array<ArrayBufferLike>>;
export declare const ushort: AtomicAccessor<number, Uint16Array<ArrayBufferLike>>;
export declare const int: AtomicAccessor<number, Int32Array<ArrayBufferLike>>;
export declare const uint: AtomicAccessor<number, Uint32Array<ArrayBufferLike>>;
export declare const float: AtomicAccessor<number, Float32Array<ArrayBufferLike>>;
export declare const string: (len: number) => Readonly<{
    view: Viewer<string>;
    read: Reader<string>;
    write: Writer<string>;
    size: number;
}>;
export declare const bits_unsigned: (len: number) => Readonly<{
    view: Viewer<number>;
    read: Reader<number>;
    write: Writer<number>;
    size: number;
}>;
export declare const bits_signed: (len: number) => Readonly<{
    view: Viewer<number>;
    read: Reader<number>;
    write: Writer<number>;
    size: number;
}>;
export declare const bits: (len: number) => Readonly<{
    view: Viewer<number>;
    read: Reader<number>;
    write: Writer<number>;
    size: number;
}>;
export declare const bit: Readonly<{
    view: Viewer<boolean>;
    read: Reader<boolean>;
    write: Writer<boolean>;
    size: number;
}>;
export declare const array: <T>(type: Accessor<T>, len: number) => Readonly<{
    view: Viewer<T[]>;
    read: Reader<T[]>;
    write: Writer<T[]>;
    size: number;
}>;
export declare const builder: () => StructBuilder<object>;
export declare const value: <T>(type: Accessor<T>) => Readonly<{
    view: Viewer<object & {
        value: T;
    }>;
    read: Reader<object & {
        value: T;
    }>;
    write: Writer<object & {
        value: T;
    }>;
    size: number;
}>;
type Field<T, F extends keyof T = any> = [keyof T, Accessor<T[F]>];
declare class StructBuilder<T extends object> {
    private fields;
    private off;
    constructor(fields?: [Field<any>, number][], off?: number);
    field<K extends string, T1>(name: K, accessor: Accessor<T1>): StructBuilder<T & {
        [P in K]: T1;
    }>;
    build<Target extends T = T>(): Accessor<Target>;
}
export declare function asRaw(obj: any): Uint8Array | undefined;
export declare function isViewable<T extends TypedArray>(off: number, ctr: TypedArrayConstructor<T>): boolean;
export declare function tryToViewOrCopy<T extends TypedArray>(arr: TypedArray, ctr: TypedArrayConstructor<T>): T;
export {};
//# sourceMappingURL=stream.d.ts.map