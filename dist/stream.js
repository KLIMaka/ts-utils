import { iter } from "./iter";
import { sum, int as toInt } from "./mathutils";
import { pair } from "./types";
const DECODER = new TextDecoder();
const ENCODER = new TextEncoder();
export class View {
    arr;
    LE;
    viewImpl;
    constructor(arr, LE = true) {
        this.arr = arr;
        this.LE = LE;
        this.viewImpl = new DataView(this.arr.buffer, this.arr.byteOffset, this.arr.byteLength);
    }
    getOff(off, check = true) {
        const byte = toInt(off);
        const bit = toInt((off - byte) * 8);
        if (check && bit !== 0)
            throw new Error(`Unaligned offset: ${byte}:${bit}`);
        return [byte, bit];
    }
    readByte(off) {
        const [byteOff] = this.getOff(off);
        return this.viewImpl.getInt8(byteOff);
    }
    writeByte(off, byte) {
        const [byteOff] = this.getOff(off);
        this.viewImpl.setInt8(byteOff, byte);
    }
    readUByte(off) {
        const [byteOff] = this.getOff(off);
        return this.viewImpl.getUint8(byteOff);
    }
    writeUByte(off, byte) {
        const [byteOff] = this.getOff(off);
        this.viewImpl.setUint8(byteOff, byte);
    }
    readShort(off) {
        const [byteOff] = this.getOff(off);
        return this.viewImpl.getInt16(byteOff, this.LE);
    }
    writeShort(off, short) {
        const [byteOff] = this.getOff(off);
        this.viewImpl.setInt16(byteOff, short, this.LE);
    }
    readUShort(off) {
        const [byteOff] = this.getOff(off);
        return this.viewImpl.getUint16(byteOff, this.LE);
    }
    writeUShort(off, short) {
        const [byteOff] = this.getOff(off);
        this.viewImpl.setUint16(byteOff, short, this.LE);
    }
    readInt(off) {
        const [byteOff] = this.getOff(off);
        return this.viewImpl.getInt32(byteOff, this.LE);
    }
    writeInt(off, int) {
        const [byteOff] = this.getOff(off);
        this.viewImpl.setInt32(byteOff, int, this.LE);
    }
    readUInt(off) {
        const [byteOff] = this.getOff(off);
        return this.viewImpl.getUint32(byteOff, this.LE);
    }
    writeUInt(off, int) {
        const [byteOff] = this.getOff(off);
        this.viewImpl.setUint32(byteOff, int, this.LE);
    }
    readFloat(off) {
        const [byteOff] = this.getOff(off);
        return this.viewImpl.getFloat32(byteOff, this.LE);
    }
    writeFloat(off, float) {
        const [byteOff] = this.getOff(off);
        this.viewImpl.setFloat32(byteOff, float, this.LE);
    }
    readRaw(off, len, ctr) {
        const [byteOff,] = this.getOff(off);
        if (toInt(len) !== len)
            throw new Error(`Invalid size: ${len}`);
        return new ctr(this.arr.buffer, this.arr.byteOffset + byteOff, len);
    }
    writeArray(off, arr) {
        const [byteOff] = this.getOff(off);
        this.arr.set(arr, byteOff);
    }
    readByteString(off, len) {
        const [byteOff] = this.getOff(off);
        const str = DECODER.decode(this.arr.subarray(byteOff, byteOff + len));
        const zero = str.indexOf('\0');
        return zero === -1 ? str : str.substring(0, zero);
    }
    writeByteString(off, len, str) {
        const [byteOff] = this.getOff(off);
        this.writeArray(byteOff, ENCODER.encode(str + '\0').subarray(0, len));
    }
    readBits(off, bits) {
        let value = 0;
        let [byteOff, bitOff] = this.getOff(off, false);
        let word = this.viewImpl.getUint8(byteOff);
        for (let i = 0; i < bits; i++) {
            if (i !== 0 && bitOff === 0)
                word = this.viewImpl.getUint8(byteOff);
            const bit = ((word >> bitOff) & 1);
            value |= bit << i;
            bitOff = (bitOff + 1) & 7;
            if (bitOff === 0)
                byteOff++;
        }
        return value;
    }
    writeBits(off, bits, value) {
        let [byteOff, bitOff] = this.getOff(off, false);
        let word = this.viewImpl.getUint8(byteOff);
        for (let i = 0; i < bits; i++) {
            if (i !== 0 && bitOff === 0)
                word = this.viewImpl.getUint8(byteOff);
            const bit = ((value >> i) & 1) === 1;
            if (bit)
                word |= (1 << bitOff);
            else
                word &= (~(1 << bitOff) & 0xffffffff);
            bitOff = (bitOff + 1) & 7;
            if (bitOff === 0)
                this.viewImpl.setUint8(byteOff++, word);
        }
        if (bitOff !== 0)
            this.viewImpl.setUint8(byteOff, word);
    }
    stream() {
        return new Stream(this);
    }
    read(off, acc) {
        return acc.read(this, off);
    }
    view(off, acc) {
        return acc.view(this, off);
    }
    raw(off, size) {
        return this.readRaw(off, size, Uint8Array);
    }
    write(off, acc, value) {
        acc.write(this, off, value);
    }
}
export class Stream {
    viewImpl;
    off = 0;
    constructor(viewImpl) {
        this.viewImpl = viewImpl;
    }
    read(acc) {
        const value = acc.read(this.viewImpl, this.off);
        this.off += acc.size;
        return value;
    }
    view(acc) {
        const value = this.viewImpl.view(this.off, acc);
        this.off += acc.size;
        return value;
    }
    write(acc, value) {
        this.viewImpl.write(this.off, acc, value);
        this.off += acc.size;
    }
    raw(size) {
        const raw = this.viewImpl.raw(this.off, size);
        this.off += size;
        return raw;
    }
    setOffset(off) {
        this.off = off;
    }
    eoi() {
        return this.off >= this.viewImpl.arr.length;
    }
    skip(off) {
        this.off += off;
    }
    mark() {
        return this.off;
    }
}
function toSigned(value, bits) {
    return value & (1 << (bits - 1))
        ? -(~value & ((1 << bits) - 1)) - 1
        : value;
}
function fromSigned(value, bits) {
    const mask = ((1 << bits) - 1);
    return value > 0
        ? value & mask
        : (~(-value) & mask) + 1;
}
export class AtomicAccessor {
    view;
    read;
    write;
    size;
    typedArrayCtor;
    constructor(view, read, write, size, typedArrayCtor) {
        this.view = view;
        this.read = read;
        this.write = write;
        this.size = size;
        this.typedArrayCtor = typedArrayCtor;
    }
}
function accessor(read, write, size) {
    return { read, view: (v, off) => read(v, off), write, size };
}
function viewAccessor(read, view, write, size) {
    return { read, view, write, size };
}
function atomicReader(read, write, size, typedArrayCtor) {
    return new AtomicAccessor((v, off) => read(v, off), read, write, size, typedArrayCtor);
}
export const transformed = (stored, toStored, fromStored) => accessor((view, off) => fromStored(stored.read(view, off)), (view, off, v) => stored.write(view, off, toStored(v)), stored.size);
export const byte = atomicReader((v, off) => v.readByte(off), (view, off, v) => view.writeByte(off, v), 1, Int8Array);
export const ubyte = atomicReader((v, off) => v.readUByte(off), (view, off, v) => view.writeUByte(off, v), 1, Uint8Array);
export const short = atomicReader((view, off) => view.readShort(off), (view, off, v) => view.writeShort(off, v), 2, Int16Array);
export const ushort = atomicReader((view, off) => view.readUShort(off), (view, off, v) => view.writeUShort(off, v), 2, Uint16Array);
export const int = atomicReader((view, off) => view.readInt(off), (view, off, v) => view.writeInt(off, v), 4, Int32Array);
export const uint = atomicReader((view, off) => view.readUInt(off), (view, off, v) => view.writeUInt(off, v), 4, Uint32Array);
export const float = atomicReader((view, off) => view.readFloat(off), (view, off, v) => view.writeFloat(off, v), 4, Float32Array);
export const string = (len) => accessor((view, off) => view.readByteString(off, len), (view, off, v) => view.writeByteString(off, len, v), len);
export const bits_unsigned = (len) => accessor((view, off) => view.readBits(off, len), (view, off, v) => view.writeBits(off, len, v), len / 8);
export const bits_signed = (len) => transformed(bits_unsigned(len), x => fromSigned(x, len), x => toSigned(x, len));
export const bits = (len) => len < 0 ? bits_signed(-len) : bits_unsigned(len);
export const bit = transformed(bits_unsigned(1), x => x ? 1 : 0, x => x === 1);
export const array = (type, len) => viewAccessor((view, off) => readArray(view, off, type, len), (view, off) => viewArray(view, off, type, len), (view, off, v) => writeArray(view, off, type, len, v), type.size * len);
export const builder = () => new StructBuilder();
export const value = (type) => builder().field('value', type).build();
function readArray(v, off, accessor, len) {
    if (accessor instanceof AtomicAccessor)
        return tryToViewOrCopy(v.readRaw(off, len * accessor.size, Uint8Array), accessor.typedArrayCtor);
    let offPtr = off;
    const arr = new Array(len);
    for (let i = 0; i < len; i++) {
        arr[i] = accessor.read(v, offPtr);
        offPtr += accessor.size;
    }
    return arr;
}
function viewArray(v, off, type, len) {
    if (type instanceof AtomicAccessor && isViewable(v.arr.byteOffset + off, type.typedArrayCtor))
        return v.readRaw(off, len, type.typedArrayCtor);
    const target = new Array(len);
    const getIndex = (prop) => {
        if (typeof prop !== 'string')
            return undefined;
        const index = Number(prop);
        return Number.isInteger(index) && index >= 0 && index < len && String(index) === prop
            ? index
            : undefined;
    };
    return new Proxy(target, {
        has: (target, prop) => { return getIndex(prop) !== undefined || Reflect.has(target, prop); },
        ownKeys: target => {
            const keys = Array.from({ length: len }, (_, index) => String(index));
            for (const key of Reflect.ownKeys(target))
                if (!keys.includes(key))
                    keys.push(key);
            return keys;
        },
        getOwnPropertyDescriptor: (target, prop) => {
            const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
            if (descriptor !== undefined)
                return descriptor;
            const index = getIndex(prop);
            if (index === undefined)
                return undefined;
            return {
                configurable: true,
                enumerable: true,
                get: () => type.view(v, off + index * type.size),
                set: value => type.write(v, off + index * type.size, value),
            };
        },
        get: (target, prop, receiver) => {
            if (prop === 'length')
                return len;
            const index = getIndex(prop);
            return (index !== undefined)
                ? type.view(v, off + index * type.size)
                : Reflect.get(target, prop, receiver);
        },
        set: (target, prop, newValue, receiver) => {
            if (typeof prop === 'string') {
                const index = getIndex(prop);
                if (index !== undefined)
                    type.write(v, off + index * type.size, newValue);
                return true;
            }
            return Reflect.set(target, prop, newValue, receiver);
        }
    });
}
function writeArray(v, off, type, len, value) {
    if (accessor instanceof AtomicAccessor && value.buffer !== undefined) {
        const arr = value;
        v.writeArray(off, new Uint8Array(arr.buffer, arr.byteOffset, len * arr.BYTES_PER_ELEMENT));
    }
    else {
        for (let i = 0; i < len; i++) {
            type.write(v, off, value[i]);
            off += type.size;
        }
    }
}
class StructBuilder {
    fields;
    off;
    constructor(fields = [], off = 0) {
        this.fields = fields;
        this.off = off;
    }
    field(name, accessor) {
        this.fields.push([[name, accessor], this.off]);
        return new StructBuilder(this.fields, this.off + accessor.size);
    }
    build() {
        const size = this.fields.map(([[_, r]]) => r.size).reduce(sum);
        if (size === 0 || toInt(size) !== size)
            throw new Error(`Invalid type size: ${size}`);
        const fieldsMap = iter(this.fields).toMap(([[name]]) => name, ([[_, acc], off]) => pair(acc, off));
        const read = (v, off) => {
            const struct = {};
            this.fields.forEach(([[name, accessor], fieldOff]) => struct[name] = accessor.read(v, off + fieldOff));
            return struct;
        };
        const view = (v, off) => {
            return new Proxy({ raw: v.raw(off, size) }, {
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
                    if (descriptor !== undefined)
                        return descriptor;
                    const field = fieldsMap.get(prop);
                    if (field === undefined)
                        return undefined;
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
                set: (target, prop, newValue, receiver) => {
                    const field = fieldsMap.get(prop);
                    if (field !== undefined) {
                        const [acc, fieldOff] = field;
                        acc.write(v, off + fieldOff, newValue);
                        return true;
                    }
                    return Reflect.set(target, prop, newValue, receiver);
                },
            });
        };
        const write = (v, off, value) => this.fields.forEach(([[name, accessor], fieldOff]) => accessor.write(v, off + fieldOff, value[name]));
        return { read, view, write, size };
    }
}
export function asRaw(obj) {
    return obj.raw;
}
export function isViewable(off, ctr) {
    return off % ctr.BYTES_PER_ELEMENT === 0;
}
export function tryToViewOrCopy(arr, ctr) {
    return isViewable(arr.byteOffset, ctr)
        ? new ctr(arr.buffer, arr.byteOffset, arr.byteLength / ctr.BYTES_PER_ELEMENT)
        : new ctr(arr.slice().buffer, 0, arr.byteLength / ctr.BYTES_PER_ELEMENT);
}
//# sourceMappingURL=stream.js.map