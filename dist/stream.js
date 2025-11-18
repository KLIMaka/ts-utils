import { sum } from "./mathutils";
export class Stream {
    view;
    offset;
    littleEndian;
    aligned = true;
    currentBit = 0;
    currentByte = 0;
    utfDecoder = new TextDecoder('latin1');
    utfEncoder = new TextEncoder();
    constructor(buf, isLE = true) {
        this.view = new DataView(buf);
        this.offset = 0;
        this.littleEndian = isLE;
    }
    checkBitAlignment() {
        if (!this.aligned)
            throw new Error(`Unaligned offset: ${this.offset}:${this.currentBit}`);
    }
    buffer() {
        return this.view.buffer;
    }
    eoi() {
        return this.offset >= this.view.byteLength;
    }
    skip(n) {
        this.checkBitAlignment();
        this.offset += n;
    }
    setOffset(off) {
        this.checkBitAlignment();
        this.offset = off;
    }
    mark() {
        this.checkBitAlignment();
        return this.offset;
    }
    readByte() {
        this.checkBitAlignment();
        return this.view.getInt8(this.offset++);
    }
    writeByte(byte) {
        this.checkBitAlignment();
        this.view.setInt8(this.offset++, byte);
    }
    readUByte() {
        this.checkBitAlignment();
        return this.view.getUint8(this.offset++);
    }
    writeUByte(byte) {
        this.checkBitAlignment();
        this.view.setUint8(this.offset++, byte);
    }
    readShort() {
        this.checkBitAlignment();
        const ret = this.view.getInt16(this.offset, this.littleEndian);
        this.offset += 2;
        return ret;
    }
    writeShort(short) {
        this.checkBitAlignment();
        this.view.setInt16(this.offset, short, this.littleEndian);
        this.offset += 2;
    }
    readUShort() {
        this.checkBitAlignment();
        const ret = this.view.getUint16(this.offset, this.littleEndian);
        this.offset += 2;
        return ret;
    }
    writeUShort(short) {
        this.checkBitAlignment();
        this.view.setUint16(this.offset, short, this.littleEndian);
        this.offset += 2;
    }
    readInt() {
        this.checkBitAlignment();
        const ret = this.view.getInt32(this.offset, this.littleEndian);
        this.offset += 4;
        return ret;
    }
    writeInt(int) {
        this.checkBitAlignment();
        this.view.setInt32(this.offset, int, this.littleEndian);
        this.offset += 4;
    }
    readUInt() {
        this.checkBitAlignment();
        const ret = this.view.getUint32(this.offset, this.littleEndian);
        this.offset += 4;
        return ret;
    }
    writeUInt(int) {
        this.checkBitAlignment();
        this.view.setUint32(this.offset, int, this.littleEndian);
        this.offset += 4;
    }
    readFloat() {
        this.checkBitAlignment();
        const ret = this.view.getFloat32(this.offset, this.littleEndian);
        this.offset += 4;
        return ret;
    }
    writeFloat(float) {
        this.checkBitAlignment();
        this.view.setFloat32(this.offset, float, this.littleEndian);
        this.offset += 4;
    }
    readByteString(len) {
        this.checkBitAlignment();
        const str = this.utfDecoder.decode(this.readArrayBuffer(len));
        const zero = str.indexOf('\0');
        return zero === -1 ? str : str.substring(0, zero);
    }
    writeByteString(len, str) {
        this.checkBitAlignment();
        const buff = new Uint8Array(len);
        buff.set(this.utfEncoder.encode(str).subarray(0, len));
        this.writeArrayBuffer(buff.buffer, len);
    }
    subView() {
        this.checkBitAlignment();
        const ret = new Stream(this.view.buffer, this.littleEndian);
        ret.setOffset(this.offset);
        return ret;
    }
    readArrayBuffer(bytes) {
        this.checkBitAlignment();
        const slice = this.view.buffer.slice(this.offset, this.offset + bytes);
        this.offset += bytes;
        return slice;
    }
    writeArrayBuffer(buffer, len) {
        const dst = new Uint8Array(this.view.buffer, this.offset);
        dst.set(new Uint8Array(buffer, 0, len));
        this.offset += len;
    }
    readBit() {
        if (this.aligned)
            this.currentByte = this.readUByte();
        const bit = ((this.currentByte >> (this.currentBit)) & 1);
        this.currentBit = (this.currentBit + 1) % 8;
        this.aligned = this.currentBit === 0;
        return bit;
    }
    writeBit(bit) {
        if (this.aligned)
            this.currentByte = 0;
        if (bit)
            this.currentByte |= (1 << this.currentBit);
        else
            this.currentByte &= (~(1 << this.currentBit) & 0xff);
        this.currentBit = (this.currentBit + 1) % 8;
        this.aligned = this.currentBit === 0;
        if (this.aligned)
            this.writeUByte(this.currentByte);
    }
    readBitsSigned(bits) {
        return this.readBits(-bits);
    }
    readBits(bits) {
        let value = 0;
        const signed = bits < 0;
        bits = signed ? -bits : bits;
        for (let i = 0; i < bits; i++) {
            let b = this.readBit();
            value = value | (b << i);
        }
        return signed ? toSigned(value, bits) : value;
    }
    writeBits(bits, value) {
        const signed = bits < 0;
        bits = signed ? -bits : bits;
        value = signed ? fromSigned(value, bits) : value;
        for (let i = 0; i < bits; i++)
            this.writeBit(((value >> i) & 1) === 1);
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
    return { read, write, size };
}
function atomicReader(read, write, size, atomicArrayConstructor) {
    return { read, write, size, atomicArrayConstructor };
}
export const byte = atomicReader(s => s.readByte(), (s, v) => s.writeByte(v), 1, Int8Array);
export const ubyte = atomicReader(s => s.readUByte(), (s, v) => s.writeUByte(v), 1, Uint8Array);
export const short = atomicReader(s => s.readShort(), (s, v) => s.writeShort(v), 2, Int16Array);
export const ushort = atomicReader(s => s.readUShort(), (s, v) => s.writeUShort(v), 2, Uint16Array);
export const int = atomicReader(s => s.readInt(), (s, v) => s.writeInt(v), 4, Int32Array);
export const uint = atomicReader(s => s.readUInt(), (s, v) => s.writeUInt(v), 4, Uint32Array);
export const float = atomicReader(s => s.readFloat(), (s, v) => s.writeFloat(v), 4, Float32Array);
export const string = (len) => accessor(s => s.readByteString(len), (s, v) => s.writeByteString(len, v), len);
export const bits = (len) => accessor(s => s.readBits(len), (s, v) => s.writeBits(len, v), Math.abs(len) / 8);
export const bits_signed = (len) => accessor(s => s.readBitsSigned(len), (s, v) => s.writeBits(len, v), Math.abs(len) / 8);
export const bit = accessor(s => s.readBits(1) === 1, (s, v) => s.writeBits(1, v ? 1 : 0), 1 / 8);
export const array = (type, len) => accessor(s => readArray(s, type, len), (s, v) => writeArray(s, type, len, v), type.size * len);
export const atomic_array = (type, len) => accessor(s => readAtomicArray(s, type, len), (s, v) => writeAtomicArray(s, type, len, v), type.size * len);
export const struct = (type) => new StructBuilderFromType(type);
export const builder = () => new StructBuilder();
export const transformed = (stored, to, from) => accessor(s => from(stored.read(s)), (s, v) => stored.write(s, to(v)), stored.size);
const readArray = (s, type, len) => {
    const arr = new Array();
    for (let i = 0; i < len; i++)
        arr[i] = type.read(s);
    return arr;
};
const writeArray = (s, type, len, value) => {
    for (let i = 0; i < len; i++)
        type.write(s, value[i]);
};
const readAtomicArray = (s, type, len) => {
    const ctr = type.atomicArrayConstructor;
    const buffer = s.readArrayBuffer(len * type.size);
    return new ctr(buffer, 0, len);
};
const writeAtomicArray = (s, type, len, value) => {
    s.writeArrayBuffer(value.buffer, len);
};
class StructBuilderFromType {
    ctr;
    fields = [];
    size = 0;
    constructor(ctr) {
        this.ctr = ctr;
    }
    field(f, r) {
        this.fields.push([f, r]);
        this.size += r.size;
        return this;
    }
    read(s) {
        const struct = this.ctr?.() ?? {};
        this.fields.forEach(([name, reader]) => struct[name] = reader.read(s));
        return struct;
    }
    write(s, value) {
        this.fields.forEach(([name, accessor]) => accessor.write(s, value[name]));
    }
}
class StructBuilder {
    fields;
    constructor(fields = []) {
        this.fields = fields;
    }
    field(name, accessor) {
        this.fields.push([name, accessor]);
        return new StructBuilder(this.fields);
    }
    build() {
        const read = (s) => {
            const struct = {};
            this.fields.forEach(([name, reader]) => struct[name] = reader.read(s));
            return struct;
        };
        const write = (s, value) => this.fields.forEach(([name, accessor]) => accessor.write(s, value[name]));
        const size = this.fields.map(([_, r]) => r.size).reduce(sum);
        return { read, write, size };
    }
}
//# sourceMappingURL=stream.js.map