import { Supplier } from "./types";
export declare class Stream {
    private view;
    private offset;
    private littleEndian;
    private aligned;
    private currentBit;
    private currentByte;
    private utfDecoder;
    private utfEncoder;
    constructor(buf: ArrayBuffer, isLE?: boolean);
    private checkBitAlignment;
    buffer(): ArrayBuffer;
    eoi(): boolean;
    skip(n: number): void;
    setOffset(off: number): void;
    mark(): number;
    readByte(): number;
    writeByte(byte: number): void;
    readUByte(): number;
    writeUByte(byte: number): void;
    readShort(): number;
    writeShort(short: number): void;
    readUShort(): number;
    writeUShort(short: number): void;
    readInt(): number;
    writeInt(int: number): void;
    readUInt(): number;
    writeUInt(int: number): void;
    readFloat(): number;
    writeFloat(float: number): void;
    readByteString(len: number): string;
    writeByteString(len: number, str: string): void;
    subView(): Stream;
    readArrayBuffer(bytes: number): ArrayBuffer;
    writeArrayBuffer(buffer: ArrayBuffer, len: number): void;
    readBit(): number;
    writeBit(bit: boolean): void;
    readBitsSigned(bits: number): number;
    readBits(bits: number): number;
    writeBits(bits: number, value: number): void;
}
type ScalarReader<T> = (s: Stream) => T;
type ScalarWriter<T> = (s: Stream, value: T) => void;
export interface Accessor<T> {
    readonly read: ScalarReader<T>;
    readonly write: ScalarWriter<T>;
    readonly size: number;
}
type AtomicArrayConstructor<T> = {
    new (buffer: ArrayBuffer, byteOffset: number, length: number): T;
};
export interface AtomicReader<T, AT> extends Accessor<T> {
    readonly atomicArrayConstructor: AtomicArrayConstructor<AT>;
}
export declare const byte: AtomicReader<number, Int8Array<ArrayBuffer>>;
export declare const ubyte: AtomicReader<number, Uint8Array<ArrayBuffer>>;
export declare const short: AtomicReader<number, Int16Array<ArrayBuffer>>;
export declare const ushort: AtomicReader<number, Uint16Array<ArrayBuffer>>;
export declare const int: AtomicReader<number, Int32Array<ArrayBuffer>>;
export declare const uint: AtomicReader<number, Uint32Array<ArrayBuffer>>;
export declare const float: AtomicReader<number, Float32Array<ArrayBuffer>>;
export declare const string: (len: number) => Accessor<string>;
export declare const bits: (len: number) => Accessor<number>;
export declare const bits_signed: (len: number) => Accessor<number>;
export declare const bit: () => Accessor<boolean>;
export declare const array: <T>(type: Accessor<T>, len: number) => Accessor<T[]>;
export declare const atomic_array: <T>(type: AtomicReader<any, T>, len: number) => Accessor<T>;
export declare const struct: <T>(type?: Supplier<T>) => StructBuilder<T>;
declare class StructBuilder<T> implements Accessor<T> {
    private ctr?;
    private fields;
    size: number;
    constructor(ctr?: Supplier<T> | undefined);
    field<V extends keyof T>(f: V, r: Accessor<T[V]>): this;
    read(s: Stream): T;
    write(s: Stream, value: T): void;
}
export {};
//# sourceMappingURL=stream.d.ts.map