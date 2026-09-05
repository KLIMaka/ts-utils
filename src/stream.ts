import { iter } from "./iter";
import { sum, int as toInt } from "./mathutils";
import { Fn, pair, TypedArray } from "./types";

const DECODER = new TextDecoder();
const ENCODER = new TextEncoder();

export class View {
  private viewImpl: DataView;

  constructor(
    readonly arr: Uint8Array,
    private LE = true,
  ) {
    this.viewImpl = new DataView(this.arr.buffer, this.arr.byteOffset, this.arr.byteLength);
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
    return this.viewImpl.getInt8(byteOff);
  }

  writeByte(off: number, byte: number): void {
    const [byteOff] = this.getOff(off);
    this.viewImpl.setInt8(byteOff, byte);
  }

  readUByte(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.viewImpl.getUint8(byteOff);
  }

  writeUByte(off: number, byte: number): void {
    const [byteOff] = this.getOff(off);
    this.viewImpl.setUint8(byteOff, byte);
  }

  readShort(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.viewImpl.getInt16(byteOff, this.LE);
  }

  writeShort(off: number, short: number): void {
    const [byteOff] = this.getOff(off);
    this.viewImpl.setInt16(byteOff, short, this.LE);
  }

  readUShort(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.viewImpl.getUint16(byteOff, this.LE);
  }

  writeUShort(off: number, short: number): void {
    const [byteOff] = this.getOff(off);
    this.viewImpl.setUint16(byteOff, short, this.LE);
  }

  readInt(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.viewImpl.getInt32(byteOff, this.LE);
  }

  writeInt(off: number, int: number): void {
    const [byteOff] = this.getOff(off);
    this.viewImpl.setInt32(byteOff, int, this.LE);
  }

  readUInt(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.viewImpl.getUint32(byteOff, this.LE);
  }

  writeUInt(off: number, int: number): void {
    const [byteOff] = this.getOff(off);
    this.viewImpl.setUint32(byteOff, int, this.LE);
  }

  readFloat(off: number): number {
    const [byteOff] = this.getOff(off);
    return this.viewImpl.getFloat32(byteOff, this.LE);
  }

  writeFloat(off: number, float: number): void {
    const [byteOff] = this.getOff(off);
    this.viewImpl.setFloat32(byteOff, float, this.LE);
  }

  readRaw<T extends TypedArray>(off: number, len: number, ctr: TypedArrayConstructor<T>): T {
    const [byteOff,] = this.getOff(off);
    if (toInt(len) !== len) throw new Error(`Invalid size: ${len}`);
    return new ctr(this.arr.buffer as ArrayBuffer, this.arr.byteOffset + byteOff, len) as T;
  }

  writeArray(off: number, arr: Uint8Array): void {
    const [byteOff] = this.getOff(off);
    this.arr.set(arr, byteOff)
  }

  readByteString(off: number, len: number): string {
    const [byteOff] = this.getOff(off);
    const str = DECODER.decode(this.arr.subarray(byteOff, byteOff + len));
    const zero = str.indexOf('\0');
    return zero === -1 ? str : str.substring(0, zero);
  }

  writeByteString(off: number, len: number, str: string): void {
    const [byteOff] = this.getOff(off);
    this.writeArray(byteOff, ENCODER.encode(str + '\0').subarray(0, len));
  }

  readBits(off: number, bits: number): number {
    let value = 0;
    let [byteOff, bitOff] = this.getOff(off, false);
    let word = this.viewImpl.getUint8(byteOff);
    for (let i = 0; i < bits; i++) {
      if (i !== 0 && bitOff === 0) word = this.viewImpl.getUint8(byteOff);
      const bit = ((word >> bitOff) & 1);
      value |= bit << i;
      bitOff = (bitOff + 1) & 7;
      if (bitOff === 0) byteOff++;
    }
    return value;
  }

  writeBits(off: number, bits: number, value: number): void {
    let [byteOff, bitOff] = this.getOff(off, false);
    let word = this.viewImpl.getUint8(byteOff);
    for (let i = 0; i < bits; i++) {
      if (i !== 0 && bitOff === 0) word = this.viewImpl.getUint8(byteOff);
      const bit = ((value >> i) & 1) === 1;
      if (bit) word |= (1 << bitOff)
      else word &= (~(1 << bitOff) & 0xffffffff);
      bitOff = (bitOff + 1) & 7;
      if (bitOff === 0) this.viewImpl.setUint8(byteOff++, word);
    }
    if (bitOff !== 0) this.viewImpl.setUint8(byteOff, word);
  }

  stream(): Stream {
    return new Stream(this);
  }

  read<T>(off: number, acc: Accessor<T>): Immutable<T> {
    return acc.read(this, off);
  }

  view<T>(off: number, acc: Accessor<T>): Mutable<T> {
    return acc.view(this, off);
  }

  raw(off: number, size: number): Uint8Array {
    return this.readRaw(off, size, Uint8Array);
  }

  write<T, V extends T>(off: number, acc: Accessor<T>, value: V): void {
    acc.write(this, off, value);
  }
}

export class Stream {
  private off = 0;

  constructor(private viewImpl: View) { }

  read<T>(acc: Accessor<T>): Immutable<T> {
    const value = acc.read(this.viewImpl, this.off);
    this.off += acc.size;
    return value;
  }

  view<T>(acc: Accessor<T>): Mutable<T> {
    const value = this.viewImpl.view(this.off, acc);
    this.off += acc.size;
    return value;
  }

  write<T, V extends T>(acc: Accessor<T>, value: V): void {
    this.viewImpl.write(this.off, acc, value)
    this.off += acc.size;
  }

  raw<T>(size: number): Uint8Array {
    const raw = this.viewImpl.raw(this.off, size);
    this.off += size;
    return raw;
  }


  setOffset(off: number) {
    this.off = off;
  }

  eoi(): boolean {
    return this.off >= this.viewImpl.arr.length;
  }

  skip(off: number) {
    this.off += off;
  }

  mark(): number {
    return this.off;
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

type PrimitiveType = number | string | boolean;
export type Mutable<T> = T extends PrimitiveType ? T : T extends object ? { -readonly [K in keyof T]: T[K] } : T;
export type Immutable<T> = T extends PrimitiveType ? T : T extends object ? { readonly [K in keyof T]: Immutable<T[K]> } : T;

export type Reader<T> = (v: View, off: number) => Immutable<T>;
export type Viewer<T> = (v: View, off: number) => Mutable<T>;
export type Writer<T> = <V extends T>(v: View, off: number, value: V) => void;

export type Accessor<T> = Readonly<{
  view: Viewer<T>;
  read: Reader<T>;
  write: Writer<T>;
  size: number;
}>

export type AccessorType<T> = T extends Accessor<infer T1> ? T1 : never;

type TypedArrayConstructor<T extends TypedArray> = { new(buffer: ArrayBufferLike, byteOffset: number, length: number): T, readonly BYTES_PER_ELEMENT: number };

export class AtomicAccessor<T, AT extends TypedArray> implements Accessor<T> {
  constructor(
    readonly view: Viewer<T>,
    readonly read: Reader<T>,
    readonly write: Writer<T>,
    readonly size: number,
    readonly typedArrayCtor: TypedArrayConstructor<AT>) { }
}

function accessor<T>(read: Reader<T>, write: Writer<T>, size: number): Accessor<T> {
  return { read, view: (v, off) => read(v, off) as Mutable<T>, write, size };
}

function viewAccessor<T>(read: Reader<T>, view: Viewer<T>, write: Writer<T>, size: number): Accessor<T> {
  return { read, view, write, size };
}

function atomicReader<T, AT extends TypedArray>(read: Reader<T>, write: Writer<T>, size: number, typedArrayCtor: TypedArrayConstructor<AT>): AtomicAccessor<T, AT> {
  return new AtomicAccessor((v, off) => read(v, off) as Mutable<T>, read, write, size, typedArrayCtor);
}

export const transformed = <Stored, Actual>(stored: Accessor<Stored>, toStored: Fn<Actual, Stored>, fromStored: Fn<Immutable<Stored>, Immutable<Actual>>) =>
  accessor((view, off) => fromStored(stored.read(view, off)), (view, off, v) => stored.write(view, off, toStored(v)), stored.size);
export const byte = atomicReader<number, Int8Array>((v, off) => v.readByte(off), (view, off, v) => view.writeByte(off, v), 1, Int8Array);
export const ubyte = atomicReader<number, Uint8Array>((v, off) => v.readUByte(off), (view, off, v) => view.writeUByte(off, v), 1, Uint8Array);
export const short = atomicReader<number, Int16Array>((view, off) => view.readShort(off), (view, off, v) => view.writeShort(off, v), 2, Int16Array);
export const ushort = atomicReader<number, Uint16Array>((view, off) => view.readUShort(off), (view, off, v) => view.writeUShort(off, v), 2, Uint16Array);
export const int = atomicReader<number, Int32Array>((view, off) => view.readInt(off), (view, off, v) => view.writeInt(off, v), 4, Int32Array);
export const uint = atomicReader<number, Uint32Array>((view, off) => view.readUInt(off), (view, off, v) => view.writeUInt(off, v), 4, Uint32Array);
export const float = atomicReader<number, Float32Array>((view, off) => view.readFloat(off), (view, off, v) => view.writeFloat(off, v), 4, Float32Array);
export const string = (len: number) => accessor((view, off) => view.readByteString(off, len), (view, off, v) => view.writeByteString(off, len, v), len);
export const bits_unsigned = (len: number) => accessor((view, off) => view.readBits(off, len), (view, off, v) => view.writeBits(off, len, v), len / 8);
export const bits_signed = (len: number) => transformed<number, number>(bits_unsigned(len), x => fromSigned(x, len), x => toSigned(x, len));
export const bits = (len: number) => len < 0 ? bits_signed(-len) : bits_unsigned(len);
export const bit = transformed<number, boolean>(bits_unsigned(1), x => x ? 1 : 0, x => x === 1);
export const array = <T>(type: Accessor<T>, len: number) =>
  viewAccessor<T[]>((view, off) => readArray(view, off, type, len), (view, off) => viewArray(view, off, type, len), (view, off, v) => writeArray(view, off, type, len, v), type.size * len);
export const builder = () => new StructBuilder();
export const value = <T>(type: Accessor<T>) => builder().field('value', type).build();

function readArray<T>(v: View, off: number, accessor: Accessor<T>, len: number): ReadonlyArray<Immutable<T>> {
  if (accessor instanceof AtomicAccessor)
    return tryToViewOrCopy(v.readRaw(off, len * accessor.size, Uint8Array), accessor.typedArrayCtor) as any as ReadonlyArray<Immutable<T>>
  let offPtr = off;
  const arr = new Array<Immutable<T>>(len);
  for (let i = 0; i < len; i++) {
    arr[i] = accessor.read(v, offPtr);
    offPtr += accessor.size;
  }
  return arr;
}

function viewArray<T>(v: View, off: number, type: Accessor<T>, len: number): Mutable<T>[] {
  if (type instanceof AtomicAccessor && isViewable(v.arr.byteOffset + off, type.typedArrayCtor))
    return v.readRaw(off, len, type.typedArrayCtor) as any as Mutable<T>[];
  const target = new Array<Mutable<T>>(len);
  const getIndex = (prop: PropertyKey): number | undefined => {
    if (typeof prop !== 'string') return undefined;
    const index = Number(prop);
    return Number.isInteger(index) && index >= 0 && index < len && String(index) === prop
      ? index
      : undefined;
  };
  return new Proxy(target, {
    has: (target, prop) => { return getIndex(prop) !== undefined || Reflect.has(target, prop) },
    ownKeys: target => {
      const keys: (string | symbol)[] = Array.from({ length: len }, (_, index) => String(index));
      for (const key of Reflect.ownKeys(target))
        if (!keys.includes(key))
          keys.push(key);
      return keys;
    },
    getOwnPropertyDescriptor: (target, prop) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
      if (descriptor !== undefined) return descriptor;
      const index = getIndex(prop);
      if (index === undefined) return undefined;

      return {
        configurable: true,
        enumerable: true,
        get: () => type.view(v, off + index * type.size),
        set: value => type.write(v, off + index * type.size, value),
      };
    },
    get: (target, prop, receiver) => {
      if (prop === 'length') return len;
      const index = getIndex(prop);
      return (index !== undefined)
        ? type.view(v, off + index * type.size)
        : Reflect.get(target, prop, receiver);
    },
    set: (target, prop, newValue, receiver): boolean => {
      if (typeof prop === 'string') {
        const index = getIndex(prop);
        if (index !== undefined) type.write(v, off + index * type.size, newValue);
        return true;
      }
      return Reflect.set(target, prop, newValue, receiver);
    }
  });
}

function writeArray<T>(v: View, off: number, type: Accessor<T>, len: number, value: ReadonlyArray<T>): void {
  if (accessor instanceof AtomicAccessor && (value as any).buffer !== undefined) {
    const arr = value as any as TypedArray;
    v.writeArray(off, new Uint8Array(arr.buffer, arr.byteOffset, len * arr.BYTES_PER_ELEMENT))
  } else {
    for (let i = 0; i < len; i++) {
      type.write(v, off, value[i] as T);
      off += type.size;
    }
  }
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

  build<Target extends T = T>(): Accessor<Target> {
    const size = this.fields.map(([[_, r]]) => r.size).reduce(sum);
    if (size === 0 || toInt(size) !== size) throw new Error(`Invalid type size: ${size}`);
    const fieldsMap = iter(this.fields).toMap(([[name]]) => name, ([[_, acc], off]) => pair(acc, off));
    const read = (v: View, off: number) => {
      const struct = {} as Target;
      this.fields.forEach(([[name, accessor], fieldOff]) => struct[name as keyof T] = accessor.read(v, off + fieldOff));
      return struct as Immutable<Target>;
    }
    const view = (v: View, off: number) => {
      return new Proxy({ raw: v.raw(off, size) } as Mutable<Target>, {
        ownKeys: target => {
          const keys = Reflect.ownKeys(target);
          for (const name of fieldsMap.keys()) {
            const key = typeof name === 'number' ? String(name) : name;
            if (!keys.includes(key))
              keys.push(key);
          }
          return keys;
        },
        getOwnPropertyDescriptor: (target, prop) => {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
          if (descriptor !== undefined) return descriptor;

          const field = fieldsMap.get(prop);
          if (field === undefined) return undefined;

          const [acc, fieldOff] = field;
          return {
            configurable: true,
            enumerable: true,
            get: () => acc.view(v, off + fieldOff),
            set: value => acc.write(v, off + fieldOff, value),
          };
        },
        get: (target, prop, receiver) => {
          const field = fieldsMap.get(prop);
          if (field !== undefined) {
            const [acc, fieldOff] = field;
            return acc.view(v, off + fieldOff);
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
    return { read, view, write, size };
  }
}

export function asRaw(obj: any): Uint8Array | undefined {
  return (obj as any).raw
}

export function isViewable<T extends TypedArray>(off: number, ctr: TypedArrayConstructor<T>): boolean {
  return off % ctr.BYTES_PER_ELEMENT === 0;
}

export function tryToViewOrCopy<T extends TypedArray>(arr: TypedArray, ctr: TypedArrayConstructor<T>): T {
  return isViewable(arr.byteOffset, ctr)
    ? new ctr(arr.buffer, arr.byteOffset, arr.byteLength / ctr.BYTES_PER_ELEMENT)
    : new ctr(arr.slice().buffer, 0, arr.byteLength / ctr.BYTES_PER_ELEMENT);
}

