import { iter } from "./iter";
import { sum, int as toInt } from "./mathutils";
import { pair } from "./types";
const DECODER = new TextDecoder();
const ENCODER = new TextEncoder();
export class View {
    buff;
    LE;
    arr;
    view;
    constructor(buff, LE = true) {
        this.buff = buff;
        this.LE = LE;
        this.arr = new Uint8Array(buff);
        this.view = new DataView(buff);
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
        return this.view.getInt8(byteOff);
    }
    writeByte(off, byte) {
        const [byteOff] = this.getOff(off);
        this.view.setInt8(byteOff, byte);
    }
    readUByte(off) {
        const [byteOff] = this.getOff(off);
        return this.view.getUint8(byteOff);
    }
    writeUByte(off, byte) {
        const [byteOff] = this.getOff(off);
        this.view.setUint8(byteOff, byte);
    }
    readShort(off) {
        const [byteOff] = this.getOff(off);
        return this.view.getInt16(byteOff, this.LE);
    }
    writeShort(off, short) {
        const [byteOff] = this.getOff(off);
        this.view.setInt16(byteOff, short, this.LE);
    }
    readUShort(off) {
        const [byteOff] = this.getOff(off);
        return this.view.getUint16(byteOff, this.LE);
    }
    writeUShort(off, short) {
        const [byteOff] = this.getOff(off);
        this.view.setUint16(byteOff, short, this.LE);
    }
    readInt(off) {
        const [byteOff] = this.getOff(off);
        return this.view.getInt32(byteOff, this.LE);
    }
    writeInt(off, int) {
        const [byteOff] = this.getOff(off);
        this.view.setInt32(byteOff, int, this.LE);
    }
    readUInt(off) {
        const [byteOff] = this.getOff(off);
        return this.view.getUint32(byteOff, this.LE);
    }
    writeUInt(off, int) {
        const [byteOff] = this.getOff(off);
        this.view.setUint32(byteOff, int, this.LE);
    }
    readFloat(off) {
        const [byteOff] = this.getOff(off);
        return this.view.getFloat32(byteOff, this.LE);
    }
    writeFloat(off, float) {
        const [byteOff] = this.getOff(off);
        this.view.setFloat32(byteOff, float, this.LE);
    }
    readArrayBuffer(off, bytes) {
        const [byteOff] = this.getOff(off);
        return this.view.buffer.slice(byteOff, off + bytes);
    }
    writeArrayBuffer(off, buffer, bytes = buffer.byteLength) {
        const [byteOff] = this.getOff(off);
        this.arr.set(new Uint8Array(buffer, 0, bytes), byteOff);
    }
    readByteString(off, len) {
        const [byteOff] = this.getOff(off);
        const str = DECODER.decode(this.readArrayBuffer(byteOff, len));
        const zero = str.indexOf('\0');
        return zero === -1 ? str : str.substring(0, zero);
    }
    writeByteString(off, len, str) {
        const [byteOff] = this.getOff(off);
        const buff = new Uint8Array(len);
        buff.set(ENCODER.encode(str).subarray(0, len));
        this.writeArrayBuffer(byteOff, buff.buffer);
    }
    readBits(off, bits) {
        let value = 0;
        let [byteOff, bitOff] = this.getOff(off, false);
        let word = this.view.getUint8(byteOff);
        for (let i = 0; i < bits; i++) {
            if (i !== 0 && bitOff === 0)
                word = this.view.getUint8(byteOff);
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
        let word = this.view.getUint8(byteOff);
        for (let i = 0; i < bits; i++) {
            if (i !== 0 && bitOff === 0)
                word = this.view.getUint8(byteOff);
            const bit = ((value >> i) & 1) === 1;
            if (bit)
                word |= (1 << bitOff);
            else
                word &= (~(1 << bitOff) & 0xffffffff);
            bitOff = (bitOff + 1) & 7;
            if (bitOff === 0)
                this.view.setUint8(byteOff++, word);
        }
        if (bitOff !== 0)
            this.view.setUint8(byteOff, word);
    }
    stream() {
        return new Stream(this);
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
        const value = acc.view(this.viewImpl, this.off);
        this.off += acc.size;
        return value;
    }
    write(acc, value) {
        acc.write(this.viewImpl, this.off, value);
        this.off += acc.size;
    }
    setOffset(off) {
        this.off = off;
    }
    eoi() {
        return this.off >= this.viewImpl.buff.byteLength;
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
function accessor(read, write, size) {
    return { read, view: read, write, size };
}
function viewAccessor(read, view, write, size) {
    return { read, view, write, size };
}
function atomicReader(read, write, size, atomicArrayConstructor) {
    return { read, view: read, write, size, atomicArrayConstructor };
}
export const transformed = (stored, to, from) => accessor((view, off) => from(stored.read(view, off)), (view, off, v) => stored.write(view, off, to(v)), stored.size);
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
export const atomic_array = (type, len) => viewAccessor((view, off) => readAtomicArray(view, off, type, len), (view, off) => viewAtomicArray(view, off, type, len), (view, off, v) => writeAtomicArray(view, off, type, len, v), type.size * len);
export const builder = () => new StructBuilder();
function readArray(v, off, accessor, len) {
    let offPtr = off;
    const arr = new Array(len);
    for (let i = 0; i < len; i++) {
        arr[i] = accessor.read(v, offPtr);
        offPtr += accessor.size;
    }
    return arr;
}
function viewArray(v, off, type, len) {
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
        has: (target, prop) => {
            const index = getIndex(prop);
            return index !== undefined || Reflect.has(target, prop);
        },
        ownKeys: target => {
            const keys = Array.from({ length: len }, (_, index) => String(index));
            for (const key of Reflect.ownKeys(target)) {
                if (!keys.includes(key))
                    keys.push(key);
            }
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
            if (index !== undefined)
                return type.view(v, off + index * type.size);
            return Reflect.get(target, prop, receiver);
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
    for (let i = 0; i < len; i++) {
        type.write(v, off, value[i]);
        off += type.size;
    }
}
function readAtomicArray(v, off, type, len) {
    return viewAtomicArray(v, off, type, len).slice();
}
function viewAtomicArray(v, off, type, len) {
    const ctr = type.atomicArrayConstructor;
    return new ctr(v.buff, off, len * type.size);
}
function writeAtomicArray(v, off, type, len, value) {
    v.writeArrayBuffer(off, value.buffer, len);
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
            return new Proxy({}, {
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
//# sourceMappingURL=stream.js.map