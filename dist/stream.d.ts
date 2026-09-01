import { Fn } from "./types";
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
    readAtomicArray<T extends TypedView<T>>(off: number, len: number, ctr: AtomicArrayConstructor<T>): T;
    writeArray(off: number, arr: Uint8Array): void;
    readByteString(off: number, len: number): string;
    writeByteString(off: number, len: number, str: string): void;
    readBits(off: number, bits: number): number;
    writeBits(off: number, bits: number, value: number): void;
    stream(): Stream;
    read<T>(off: number, acc: Accessor<T>): T;
    view<T>(off: number, acc: Accessor<T>): T;
    raw<T>(off: number, acc: Accessor<T>): Uint8Array;
    write<T>(off: number, acc: Accessor<T>, value: T): void;
}
export declare class Stream {
    private viewImpl;
    private off;
    constructor(viewImpl: View);
    read<T>(acc: Accessor<T>): T;
    view<T>(acc: Accessor<T>): T;
    write<T>(acc: Accessor<T>, value: T): void;
    raw<T>(acc: Accessor<T>): Uint8Array;
    setOffset(off: number): void;
    eoi(): boolean;
    skip(off: number): void;
    mark(): number;
}
type ScalarReader<T> = (v: View, off: number) => T;
type ScalarWriter<T> = (v: View, off: number, value: T) => void;
export type Accessor<T> = Readonly<{
    view: ScalarReader<T>;
    read: ScalarReader<T>;
    write: ScalarWriter<T>;
    size: number;
}>;
export type AccessorType<T> = T extends Accessor<infer T1> ? T1 : never;
type TypedView<T> = {
    buffer: ArrayBuffer;
    byteOffset: number;
    slice(): T;
} & ArrayLike<number>;
type AtomicArrayConstructor<T extends TypedView<T>> = {
    new (buffer: ArrayBufferLike, byteOffset: number, length: number): T;
    readonly BYTES_PER_ELEMENT: number;
};
export declare class AtomicAccessor<T, AT extends TypedView<AT>> implements Accessor<T> {
    readonly view: ScalarReader<T>;
    readonly read: ScalarReader<T>;
    readonly write: ScalarWriter<T>;
    readonly size: number;
    readonly atomicArrayConstructor: AtomicArrayConstructor<AT>;
    constructor(view: ScalarReader<T>, read: ScalarReader<T>, write: ScalarWriter<T>, size: number, atomicArrayConstructor: AtomicArrayConstructor<AT>);
}
export declare const transformed: <Stored, Actual>(stored: Accessor<Stored>, to: Fn<Actual, Stored>, from: Fn<Stored, Actual>) => Readonly<{
    view: ScalarReader<Actual>;
    read: ScalarReader<Actual>;
    write: ScalarWriter<Actual>;
    size: number;
}>;
export declare const byte: AtomicAccessor<number, Int8Array<ArrayBuffer>>;
export declare const ubyte: AtomicAccessor<number, Uint8Array<ArrayBuffer>>;
export declare const short: AtomicAccessor<number, Int16Array<ArrayBuffer>>;
export declare const ushort: AtomicAccessor<number, Uint16Array<ArrayBuffer>>;
export declare const int: AtomicAccessor<number, Int32Array<ArrayBuffer>>;
export declare const uint: AtomicAccessor<number, Uint32Array<ArrayBuffer>>;
export declare const float: AtomicAccessor<number, Float32Array<ArrayBuffer>>;
export declare const string: (len: number) => Readonly<{
    view: ScalarReader<string>;
    read: ScalarReader<string>;
    write: ScalarWriter<string>;
    size: number;
}>;
export declare const bits_unsigned: (len: number) => Readonly<{
    view: ScalarReader<number>;
    read: ScalarReader<number>;
    write: ScalarWriter<number>;
    size: number;
}>;
export declare const bits_signed: (len: number) => Readonly<{
    view: ScalarReader<number>;
    read: ScalarReader<number>;
    write: ScalarWriter<number>;
    size: number;
}>;
export declare const bits: (len: number) => Readonly<{
    view: ScalarReader<number>;
    read: ScalarReader<number>;
    write: ScalarWriter<number>;
    size: number;
}>;
export declare const bit: Readonly<{
    view: ScalarReader<boolean>;
    read: ScalarReader<boolean>;
    write: ScalarWriter<boolean>;
    size: number;
}>;
export declare const array: <T>(type: Accessor<T>, len: number) => Readonly<{
    view: ScalarReader<ReadOnlyArray<T>>;
    read: ScalarReader<ReadOnlyArray<T>>;
    write: ScalarWriter<ReadOnlyArray<T>>;
    size: number;
}>;
export declare const builder: () => StructBuilder<object>;
type ReadOnlyArray<T> = Omit<T[], 'pop' | 'push' | 'concat' | 'shift' | 'unshift' | 'flatMap' | 'splice' | 'flat' | 'toSpliced' | typeof Symbol.unscopables>;
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
export {};
//# sourceMappingURL=stream.d.ts.map