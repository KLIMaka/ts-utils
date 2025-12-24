import { sum } from "./mathutils";
import { Supplier, Fn } from "./types";

export class Stream {
  private view: DataView<ArrayBuffer>;
  private offset: number;
  private littleEndian: boolean;
  private aligned = true;
  private currentBit = 0;
  private currentByte = 0;
  private utfDecoder = new TextDecoder('latin1');
  private utfEncoder = new TextEncoder();

  constructor(buf: ArrayBuffer, isLE = true) {
    this.view = new DataView(buf);
    this.offset = 0;
    this.littleEndian = isLE;
  }

  private checkBitAlignment() {
    if (!this.aligned)
      throw new Error(`Unaligned offset: ${this.offset}:${this.currentBit}`);
  }

  buffer(): ArrayBuffer {
    return this.view.buffer;
  }

  eoi(): boolean {
    return this.offset >= this.view.byteLength;
  }

  skip(n: number) {
    this.checkBitAlignment();
    this.offset += n;
  }

  setOffset(off: number): void {
    this.checkBitAlignment();
    this.offset = off;
  }

  mark(): number {
    this.checkBitAlignment();
    return this.offset;
  }

  readByte(): number {
    this.checkBitAlignment();
    return this.view.getInt8(this.offset++);
  }

  writeByte(byte: number): void {
    this.checkBitAlignment();
    this.view.setInt8(this.offset++, byte);
  }

  readUByte(): number {
    this.checkBitAlignment();
    return this.view.getUint8(this.offset++);
  }

  writeUByte(byte: number): void {
    this.checkBitAlignment();
    this.view.setUint8(this.offset++, byte);
  }

  readShort(): number {
    this.checkBitAlignment();
    const ret = this.view.getInt16(this.offset, this.littleEndian);
    this.offset += 2;
    return ret;
  }

  writeShort(short: number): void {
    this.checkBitAlignment();
    this.view.setInt16(this.offset, short, this.littleEndian);
    this.offset += 2;
  }

  readUShort(): number {
    this.checkBitAlignment();
    const ret = this.view.getUint16(this.offset, this.littleEndian);
    this.offset += 2;
    return ret;
  }

  writeUShort(short: number): void {
    this.checkBitAlignment();
    this.view.setUint16(this.offset, short, this.littleEndian);
    this.offset += 2;
  }

  readInt(): number {
    this.checkBitAlignment();
    const ret = this.view.getInt32(this.offset, this.littleEndian);
    this.offset += 4;
    return ret;
  }

  writeInt(int: number): void {
    this.checkBitAlignment();
    this.view.setInt32(this.offset, int, this.littleEndian);
    this.offset += 4;
  }

  readUInt(): number {
    this.checkBitAlignment();
    const ret = this.view.getUint32(this.offset, this.littleEndian);
    this.offset += 4;
    return ret;
  }

  writeUInt(int: number): void {
    this.checkBitAlignment();
    this.view.setUint32(this.offset, int, this.littleEndian);
    this.offset += 4;
  }

  readFloat(): number {
    this.checkBitAlignment();
    const ret = this.view.getFloat32(this.offset, this.littleEndian);
    this.offset += 4;
    return ret;
  }

  writeFloat(float: number): void {
    this.checkBitAlignment();
    this.view.setFloat32(this.offset, float, this.littleEndian);
    this.offset += 4;
  }

  readByteString(len: number): string {
    this.checkBitAlignment();
    const str = this.utfDecoder.decode(this.readArrayBuffer(len));
    const zero = str.indexOf('\0');
    return zero === -1 ? str : str.substring(0, zero);
  }

  writeByteString(len: number, str: string): void {
    this.checkBitAlignment();
    const buff = new Uint8Array(len);
    buff.set(this.utfEncoder.encode(str).subarray(0, len));
    this.writeArrayBuffer(buff.buffer, len);
  }

  subView(): Stream {
    this.checkBitAlignment();
    const ret = new Stream(this.view.buffer, this.littleEndian);
    ret.setOffset(this.offset);
    return ret;
  }

  readArrayBuffer(bytes: number): ArrayBuffer {
    this.checkBitAlignment();
    const slice = this.view.buffer.slice(this.offset, this.offset + bytes);
    this.offset += bytes;
    return slice;
  }

  writeArrayBuffer(buffer: ArrayBuffer, len: number): void {
    const dst = new Uint8Array(this.view.buffer, this.offset);
    dst.set(new Uint8Array(buffer, 0, len));
    this.offset += len;
  }

  readBit(): number {
    if (this.aligned) this.currentByte = this.readUByte();
    const bit = ((this.currentByte >> (this.currentBit)) & 1);
    this.currentBit = (this.currentBit + 1) % 8;
    this.aligned = this.currentBit === 0;
    return bit;
  }

  writeBit(bit: boolean): void {
    if (this.aligned) this.currentByte = 0;
    if (bit) this.currentByte |= (1 << this.currentBit)
    else this.currentByte &= (~(1 << this.currentBit) & 0xff);
    this.currentBit = (this.currentBit + 1) % 8;
    this.aligned = this.currentBit === 0;
    if (this.aligned) this.writeUByte(this.currentByte);
  }

  readBitsSigned(bits: number): number {
    return this.readBits(-bits);
  }

  readBits(bits: number): number {
    let value = 0;
    const signed = bits < 0;
    bits = signed ? -bits : bits;
    for (let i = 0; i < bits; i++) {
      let b = this.readBit();
      value = value | (b << i);
    }
    return signed ? toSigned(value, bits) : value;
  }

  writeBits(bits: number, value: number): void {
    const signed = bits < 0;
    bits = signed ? -bits : bits;
    value = signed ? fromSigned(value, bits) : value;
    for (let i = 0; i < bits; i++)  this.writeBit(((value >> i) & 1) === 1);
  }
}

function toSigned(value: number, bits: number) {
  return value & (1 << (bits - 1))
    ? -(~value & ((1 << bits) - 1)) - 1
    : value
}

function fromSigned(value: number, bits: number) {
  const mask = ((1 << bits) - 1);
  return value > 0
    ? value & mask
    : (~(-value) & mask) + 1;
}

type ScalarReader<T> = (s: Stream) => T;
type ScalarWriter<T> = (s: Stream, value: T) => void;

export interface Accessor<T> {
  readonly read: ScalarReader<T>;
  readonly write: ScalarWriter<T>;
  readonly size: number;
}

export type AccessorType<T> = T extends Accessor<infer T1> ? T1 : never;

type AtomicArrayConstructor<T> = { new(buffer: ArrayBuffer, byteOffset: number, length: number): T };

export interface AtomicReader<T, AT> extends Accessor<T> {
  readonly atomicArrayConstructor: AtomicArrayConstructor<AT>;
}

function accessor<T>(read: ScalarReader<T>, write: ScalarWriter<T>, size: number): Accessor<T> {
  return { read, write, size };
}

function atomicReader<T, AT>(read: ScalarReader<T>, write: ScalarWriter<T>, size: number, atomicArrayConstructor: AtomicArrayConstructor<AT>): AtomicReader<T, AT> {
  return { read, write, size, atomicArrayConstructor };
}

export const byte = atomicReader<number, Int8Array<ArrayBuffer>>(s => s.readByte(), (s, v) => s.writeByte(v), 1, Int8Array);
export const ubyte = atomicReader<number, Uint8Array<ArrayBuffer>>(s => s.readUByte(), (s, v) => s.writeUByte(v), 1, Uint8Array);
export const short = atomicReader<number, Int16Array<ArrayBuffer>>(s => s.readShort(), (s, v) => s.writeShort(v), 2, Int16Array);
export const ushort = atomicReader<number, Uint16Array<ArrayBuffer>>(s => s.readUShort(), (s, v) => s.writeUShort(v), 2, Uint16Array);
export const int = atomicReader<number, Int32Array<ArrayBuffer>>(s => s.readInt(), (s, v) => s.writeInt(v), 4, Int32Array);
export const uint = atomicReader<number, Uint32Array<ArrayBuffer>>(s => s.readUInt(), (s, v) => s.writeUInt(v), 4, Uint32Array);
export const float = atomicReader<number, Float32Array<ArrayBuffer>>(s => s.readFloat(), (s, v) => s.writeFloat(v), 4, Float32Array);
export const string = (len: number) => accessor(s => s.readByteString(len), (s, v) => s.writeByteString(len, v), len);
export const bits = (len: number) => accessor(s => s.readBits(len), (s, v) => s.writeBits(len, v), Math.abs(len) / 8);
export const bits_signed = (len: number) => accessor(s => s.readBitsSigned(len), (s, v) => s.writeBits(len, v), Math.abs(len) / 8);
export const bit = accessor(s => s.readBits(1) === 1, (s, v) => s.writeBits(1, v ? 1 : 0), 1 / 8)
export const array = <T>(type: Accessor<T>, len: number) => accessor(s => readArray(s, type, len), (s, v) => writeArray(s, type, len, v), type.size * len);
export const atomic_array = <T>(type: AtomicReader<any, T>, len: number) => accessor(s => readAtomicArray(s, type, len), (s, v) => writeAtomicArray(s, type, len, v), type.size * len);
export const struct = <T>(type?: Supplier<T>) => new StructBuilderFromType(type);
export const builder = () => new StructBuilder();
export const transformed = <Stored, Actual>(stored: Accessor<Stored>, to: Fn<Actual, Stored>, from: Fn<Stored, Actual>) =>
  accessor(s => from(stored.read(s)), (s, v) => stored.write(s, to(v)), stored.size);

const readArray = <T>(s: Stream, type: Accessor<T>, len: number): Array<T> => {
  const arr = new Array<T>();
  for (let i = 0; i < len; i++)
    arr[i] = type.read(s);
  return arr;
}

const writeArray = <T>(s: Stream, type: Accessor<T>, len: number, value: Array<T>): void => {
  for (let i = 0; i < len; i++) type.write(s, value[i]);
}

const readAtomicArray = <T>(s: Stream, type: AtomicReader<any, T>, len: number) => {
  const ctr = type.atomicArrayConstructor;
  const buffer = s.readArrayBuffer(len * type.size);
  return new ctr(buffer, 0, len);
}

const writeAtomicArray = <T>(s: Stream, type: AtomicReader<any, T>, len: number, value: T) => {
  s.writeArrayBuffer((value as any).buffer, len);
}

type Field<T, F extends keyof T = any> = [keyof T, Accessor<T[F]>];

class StructBuilderFromType<T> implements Accessor<T> {
  private fields: Field<T>[] = [];
  public size = 0;
  constructor(private ctr?: Supplier<T>) { }

  field<V extends keyof T>(f: V, r: Accessor<T[V]>) {
    this.fields.push([f, r]);
    this.size += r.size;
    return this;
  }

  read(s: Stream) {
    const struct = this.ctr?.() ?? {} as T;
    this.fields.forEach(([name, reader]) => struct[name] = reader.read(s));
    return struct;
  }

  write(s: Stream, value: T) {
    this.fields.forEach(([name, accessor]) => accessor.write(s, value[name]));
  }
}

class StructBuilder<T> {
  constructor(private fields: Field<any>[] = []) { }

  field<K extends string, T1>(name: K, accessor: Accessor<T1>): StructBuilder<T & { [P in K]: T1 }> {
    this.fields.push([name, accessor]);
    return new StructBuilder<T & { [P in K]: T1 }>(this.fields);
  }

  build(): Accessor<T> {
    const read = (s: Stream) => {
      const struct = {} as T;
      this.fields.forEach(([name, reader]) => struct[name as keyof T] = reader.read(s));
      return struct;
    }
    const write = (s: Stream, value: T) => this.fields.forEach(([name, accessor]) => accessor.write(s, value[name as keyof T]));
    const size = this.fields.map(([_, r]) => r.size).reduce(sum);
    return { read, write, size };
  }
}

