import { iter } from "./iter";
import { sum, int as toInt } from "./mathutils";
import { first, Fn, pair, Supplier } from "./types";

const DECODER = new TextDecoder();
const ENCODER = new TextEncoder();

export class View {
  private arr: Uint8Array;
  private view: DataView<ArrayBuffer>;

  constructor(
    readonly buff: ArrayBuffer,
    private LE = true,
  ) {
    this.arr = new Uint8Array(buff);
    this.view = new DataView(buff);
  }

  private getOff(off: number, check = true): [number, number] {
    const byte = toInt(off);
    const bit = toInt((off - byte) * 8);
    if (check && bit !== 0)
      throw new Error(`Unaligned offset: ${byte}:${bit}`);
    return [byte, bit];
  }

  readByte(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.view.getInt8(byteOff);
  }

  writeByte(off: number, byte: number): void {
    const [byteOff] = this.getOff(off);
    this.view.setInt8(byteOff, byte);
  }

  readUByte(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.view.getUint8(byteOff);
  }

  writeUByte(off: number, byte: number): void {
    const [byteOff] = this.getOff(off);
    this.view.setUint8(byteOff, byte);
  }

  readShort(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.view.getInt16(byteOff, this.LE);
  }

  writeShort(off: number, short: number): void {
    const [byteOff] = this.getOff(off);
    this.view.setInt16(byteOff, short, this.LE);
  }

  readUShort(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.view.getUint16(byteOff, this.LE);
  }

  writeUShort(off: number, short: number): void {
    const [byteOff] = this.getOff(off);
    this.view.setUint16(byteOff, short, this.LE);
  }

  readInt(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.view.getInt32(byteOff, this.LE);
  }

  writeInt(off: number, int: number): void {
    const [byteOff] = this.getOff(off);
    this.view.setInt32(byteOff, int, this.LE);
  }

  readUInt(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.view.getUint32(byteOff, this.LE);
  }

  writeUInt(off: number, int: number): void {
    const [byteOff] = this.getOff(off);
    this.view.setUint32(byteOff, int, this.LE);
  }

  readFloat(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.view.getFloat32(byteOff, this.LE);
  }

  writeFloat(off: number, float: number): void {
    const [byteOff] = this.getOff(off);
    this.view.setFloat32(byteOff, float, this.LE);
  }

  readArrayBuffer(off: number, bytes: number): ArrayBuffer {
    const [byteOff] = this.getOff(off);
    return this.view.buffer.slice(byteOff, off + bytes);
  }

  writeArrayBuffer(off: number, buffer: ArrayBuffer, bytes = buffer.byteLength): void {
    const [byteOff] = this.getOff(off);
    this.arr.set(new Uint8Array(buffer, 0, bytes), byteOff)
  }

  readByteString(off: number, len: number): string {
    const [byteOff] = this.getOff(off);
    const str = DECODER.decode(this.readArrayBuffer(byteOff, len));
    const zero = str.indexOf('\0');
    return zero === -1 ? str : str.substring(0, zero);
  }

  writeByteString(off: number, len: number, str: string): void {
    const [byteOff] = this.getOff(off);
    const buff = new Uint8Array(len);
    buff.set(ENCODER.encode(str).subarray(0, len));
    this.writeArrayBuffer(byteOff, buff.buffer);
  }

  readBits(off: number, bits: number): number {
    let value = 0;
    let [byteOff, bitOff] = this.getOff(off, false);
    let word = this.view.getUint8(byteOff);
    for (let i = 0; i < bits; i++) {
      const bit = ((word >> bitOff) & 1);
      value |= bit << i;
      if (bitOff === 7) {
        byteOff++;
        word = this.view.getUint8(byteOff);
        bitOff = 0;
      } else {
        bitOff++;
      }
    }
    return value;
  }

  writeBits(off: number, bits: number, value: number): void {
    let [byteOff, bitOff] = this.getOff(off, false);
    let word = this.view.getUint8(byteOff);
    for (let i = 0; i < bits; i++) {
      const bit = ((value >> i) & 1) === 1;
      if (bit) word |= (1 << bitOff)
      else word &= (~(1 << bitOff) & 0xffffffff);

      if (bitOff === 7) {
        this.view.setUint8(byteOff, word);
        byteOff++;
        word = this.view.getUint8(byteOff);
        bitOff = 0;
      } else {
        bitOff++;
      }
    }
    this.view.setUint8(byteOff, word);
  }

  stream(): Stream {
    return new Stream(this);
  }
}

export class Stream {
  private off = 0;

  constructor(private view: View) { }

  read<T>(acc: Accessor<T>): T {
    const value = acc.read(this.view, this.off);
    this.off += acc.size;
    return value;
  }

  write<T>(acc: Accessor<T>, value: T): void {
    acc.write(this.view, this.off, value);
    this.off += acc.size;
  }

  setOffset(off: number) {
    this.off = off;
  }

  eoi(): boolean {
    return this.off >= this.view.buff.byteLength;
  }

  skip(off: number) {
    this.off += off;
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

type ScalarReader<T> = (v: View, off: number) => T;
type ScalarWriter<T> = (v: View, off: number, value: T) => void;

export type Accessor<T> = Readonly<{
  read: ScalarReader<T>;
  write: ScalarWriter<T>;
  size: number;
}>

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

export const transformed = <Stored, Actual>(stored: Accessor<Stored>, to: Fn<Actual, Stored>, from: Fn<Stored, Actual>) =>
  accessor((view, off) => from(stored.read(view, off)), (view, off, v) => stored.write(view, off, to(v)), stored.size);
export const byte = atomicReader<number, Int8Array<ArrayBuffer>>((v, off) => v.readByte(off), (view, off, v) => view.writeByte(off, v), 1, Int8Array);
export const ubyte = atomicReader<number, Uint8Array<ArrayBuffer>>((v, off) => v.readUByte(off), (view, off, v) => view.writeUByte(off, v), 1, Uint8Array);
export const short = atomicReader<number, Int16Array<ArrayBuffer>>((view, off) => view.readShort(off), (view, off, v) => view.writeShort(off, v), 2, Int16Array);
export const ushort = atomicReader<number, Uint16Array<ArrayBuffer>>((view, off) => view.readUShort(off), (view, off, v) => view.writeUShort(off, v), 2, Uint16Array);
export const int = atomicReader<number, Int32Array<ArrayBuffer>>((view, off) => view.readInt(off), (view, off, v) => view.writeInt(off, v), 4, Int32Array);
export const uint = atomicReader<number, Uint32Array<ArrayBuffer>>((view, off) => view.readUInt(off), (view, off, v) => view.writeUInt(off, v), 4, Uint32Array);
export const float = atomicReader<number, Float32Array<ArrayBuffer>>((view, off) => view.readFloat(off), (view, off, v) => view.writeFloat(off, v), 4, Float32Array);
export const string = (len: number) => accessor((view, off) => view.readByteString(off, len), (view, off, v) => view.writeByteString(off, len, v), len);
export const bits_unsigned = (len: number) => accessor((view, off) => view.readBits(off, len), (view, off, v) => view.writeBits(off, len, v), len / 8);
export const bits_signed = (len: number) => transformed<number, number>(bits_unsigned(len), x => fromSigned(x, len), x => toSigned(x, len));
export const bits = (len: number) => len < 0 ? bits_signed(-len) : bits_unsigned(len);
export const bit = transformed<number, boolean>(bits_unsigned(1), x => x ? 1 : 0, x => x === 1);
export const array = <T>(type: Accessor<T>, len: number) =>
  accessor((view, off) => readArray(view, off, type, len), (view, off, v) => writeArray(view, off, type, len, v), type.size * len);
export const atomic_array = <T>(type: AtomicReader<any, T>, len: number) =>
  accessor((view, off) => readAtomicArray(view, off, type, len), (view, off, v) => writeAtomicArray(view, off, type, len, v), type.size * len);
export const builder = () => new StructBuilder();

const readArray = <T>(v: View, off: number, type: Accessor<T>, len: number): Array<T> => {
  let offPtr = off;
  const arr = new Array<T>(len);
  for (let i = 0; i < len; i++) {
    arr[i] = type.read(v, offPtr);
    offPtr += type.size;
  }
  return new Proxy(arr, {
    get: (target, prop, receiver) => {
      if (typeof prop === 'string') {
        const index = Number(prop);
        if (index >= 0 && index < len)
          return type.read(v, off + index * type.size);
      }
      return Reflect.get(target, prop, receiver);
    },
    set: (target, prop, newValue, receiver): boolean => {
      if (typeof prop === 'string') {
        const index = Number(prop);
        if (index >= 0 && index < len)
          type.write(v, off + index * type.size, newValue);
        return true;
      }
      return Reflect.set(target, prop, newValue, receiver);
    }
  });
}

const writeArray = <T>(v: View, off: number, type: Accessor<T>, len: number, value: Array<T>): void => {
  for (let i = 0; i < len; i++) {
    type.write(v, off, value[i]);
    off += type.size;
  }
}

const readAtomicArray = <T>(v: View, off: number, type: AtomicReader<any, T>, len: number) => {
  const ctr = type.atomicArrayConstructor;
  const buffer = v.readArrayBuffer(off, len * type.size);
  return new ctr(buffer, 0, len);
}

const writeAtomicArray = <T>(v: View, off: number, type: AtomicReader<any, T>, len: number, value: T) => {
  v.writeArrayBuffer(off, (value as any).buffer, len);
}

type Field<T, F extends keyof T = any> = [keyof T, Accessor<T[F]>];

class StructBuilder<T extends object> {
  constructor(
    private fields: [Field<any>, number][] = [],
    private off = 0
  ) { }

  field<K extends string, T1>(name: K, accessor: Accessor<T1>): StructBuilder<T & { [P in K]: T1 }> {
    this.fields.push([[name, accessor], this.off]);
    return new StructBuilder<T & { [P in K]: T1 }>(this.fields, this.off + accessor.size);
  }

  build(): Accessor<T> {
    const size = this.fields.map(([[_, r]]) => r.size).reduce(sum);
    if (size === 0 || toInt(size) !== size) throw new Error(`Invalid type size: ${size}`);
    const fieldsMap = iter(this.fields).toMap(([[name]]) => name, ([[_, acc], off]) => pair(acc, off));
    const read = (v: View, off: number) => {
      const struct = {} as T;
      this.fields.forEach(([[name, accessor], fieldOff]) => struct[name as keyof T] = accessor.read(v, off + fieldOff));
      return new Proxy(struct, {
        get: (target, prop, receiver) => {
          const field = fieldsMap.get(prop);
          if (field !== undefined) {
            const [acc, fieldOff] = field;
            return acc.read(v, off + fieldOff);
          }
          return Reflect.get(target, prop, receiver);
        },
        set: (target, prop, newValue, receiver): boolean => {
          const field = fieldsMap.get(prop);
          if (field !== undefined) {
            const [acc, fieldOff] = field;
            acc.write(v, off + fieldOff, newValue);
            return true;
          }
          return Reflect.set(target, prop, newValue, receiver);
        },
      });
    }
    const write = (v: View, off: number, value: T) => this.fields.forEach(([[name, accessor], fieldOff]) => accessor.write(v, off + fieldOff, value[name as keyof T]));
    return { read, write, size };
  }
}

