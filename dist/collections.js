import Optional from "optional-js";
import { cyclic } from "./mathutils";
export function last(c) { return c.get(c.length() - 1); }
export function first(c) { return c.get(0); }
export function isEmpty(c) { return c.length() === 0; }
export function ITERATOR_RESULT(value) { return { value, done: false }; }
;
export const TERMINAL_ITERATOR_RESULT = { value: null, done: true };
export const EMPTY_ITERATOR = { next: () => TERMINAL_ITERATOR_RESULT };
export const EMPTY_COLLECTION = {
    get: (i) => undefined,
    length: () => 0,
    [Symbol.iterator]: () => EMPTY_ITERATOR
};
const EMPTY_MAP = new Map();
export function emptyMap() {
    return EMPTY_MAP;
}
export const EMPTY_SET = new Set();
export function emptySet() {
    return EMPTY_SET;
}
export function singletonIterable(value) {
    let done = false;
    return {
        next: () => {
            const result = iteratorResult(done, value);
            done = true;
            return result;
        }
    };
}
export function singleton(value) {
    return { [Symbol.iterator]: () => singletonIterable(value) };
}
export function iteratorResult(isDone, val) {
    return isDone ? TERMINAL_ITERATOR_RESULT : ITERATOR_RESULT(val);
}
export class ArrayWrapper {
    array;
    constructor(array) {
        this.array = array;
    }
    ;
    get(i) { return this.array[i]; }
    length() { return this.array.length; }
    [Symbol.iterator]() { return this.array.values(); }
    set(i, value) { this.array[i] = value; }
}
export function wrap(array) { return new ArrayWrapper(array); }
export class Deck {
    array = [];
    size = 0;
    get(i) { return this.array[i]; }
    set(i, value) {
        if (i < 0 || i >= this.size)
            throw new Error(`Invalid set position: ${i}, size:${this.size}`);
        this.array[i] = value;
    }
    push(value) {
        this.array[this.size++] = value;
        return this;
    }
    pushAll(values) {
        for (const val of values)
            this.push(val);
        return this;
    }
    pop() {
        return this.array[--this.size];
    }
    top() {
        return this.array[this.size - 1];
    }
    clear() {
        this.size = 0;
        return this;
    }
    length() {
        return this.size;
    }
    clone() {
        const copy = new Deck();
        copy.array = [...take(this.array, this.size)];
        copy.size = this.size;
        return copy;
    }
    [Symbol.iterator]() {
        let i = 0;
        return this.size === 0
            ? EMPTY_ITERATOR
            : { next: () => { return iteratorResult(i === this.size, this.array[i++]); } };
    }
}
export class Ring {
    maxSize;
    data;
    head = 0;
    size = 0;
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.data = new Array(maxSize);
    }
    get(i) { return this.data[cyclic(this.head + i, this.maxSize)]; }
    length() { return this.size; }
    getHeadOff(off) {
        return cyclic(this.head + off, this.maxSize);
    }
    push(value) {
        if (this.length() === this.maxSize)
            throw new Error();
        this.data[this.getHeadOff(this.size)] = value;
        this.size++;
    }
    pop() {
        if (this.length() === 0)
            throw new Error();
        const off = this.getHeadOff(this.size - 1);
        const value = this.data[off];
        this.data[off] = null;
        this.size--;
        return value;
    }
    pushHead(value) {
        if (this.length() === this.maxSize)
            throw new Error();
        this.head = cyclic(this.head - 1, this.maxSize);
        this.data[this.getHeadOff(0)] = value;
        this.size++;
    }
    popHead() {
        if (this.length() === 0)
            throw new Error();
        const value = this.data[this.head];
        this.data[this.head] = null;
        this.head = cyclic(this.head + 1, this.maxSize);
        this.size--;
        return value;
    }
    [Symbol.iterator]() {
        let i = 0;
        return this.size === 0
            ? EMPTY_ITERATOR
            : { next: () => iteratorResult(i === this.size, this.get(i++)) };
    }
}
export class IndexedDeck extends Deck {
    index = new Map();
    push(value) {
        if (this.index.has(value))
            return this;
        super.push(value);
        this.index.set(value, this.length() - 1);
        return this;
    }
    set(i, value) {
        const last = this.get(i);
        super.set(i, value);
        this.index.delete(last);
        this.index.set(value, i);
    }
    clear() {
        super.clear();
        this.index.clear();
        return this;
    }
    indexOf(value) {
        return getOrDefault(this.index, value, -1);
    }
    hasAny(i) {
        for (const v of i)
            if (this.indexOf(v) !== -1)
                return true;
        return false;
    }
}
export function reverse(c) {
    return isEmpty(c)
        ? EMPTY_COLLECTION
        : {
            get: (i) => c.get(c.length() - 1 - i),
            length: () => c.length(),
            [Symbol.iterator]: () => reversed(c)
        };
}
export function length(it) {
    let length = 0;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for (const _ of it)
        length++;
    return length;
}
export function* filter(i, f) {
    for (const v of i)
        if (f(v))
            yield v;
}
export function* map(i, f) {
    for (const v of i)
        yield f(v);
}
export function* zip(i1, i2) {
    const iter1 = i1[Symbol.iterator]();
    const iter2 = i2[Symbol.iterator]();
    let v1 = iter1.next();
    let v2 = iter2.next();
    while (!v1.done && !v2.done) {
        yield [v1.value, v2.value];
        v1 = iter1.next();
        v2 = iter2.next();
    }
}
export function* zipTuple(...its) {
    const iters = its.map(i => i[Symbol.iterator]());
    let vs = iters.map(i => i.next());
    while (vs.every(v => !v.done)) {
        yield vs.map(v => v.value);
        vs = iters.map(i => i.next());
    }
}
export function forEach(i, f) {
    for (const v of i)
        f(v);
}
export function reduce(i, f, start) {
    for (const v of i)
        start = f(start, v);
    return start;
}
export function reduceFirst(i, f) {
    const ii = i[Symbol.iterator]();
    const first = ii.next();
    if (first.done)
        return Optional.empty();
    let start = first.value;
    for (let v = ii.next(); !v.done; v = ii.next()) {
        start = f(start, v.value);
    }
    return Optional.of(start);
}
export function* sub(c, start, length) {
    for (let i = 0; i < length; i++)
        yield c.get(start + i);
}
export function all(i, f) {
    for (const t of i)
        if (!f(t))
            return false;
    return true;
}
export function any(i, f) {
    for (const t of i)
        if (f(t))
            return true;
    return false;
}
export function iterIsEmpty(i) {
    const ii = i[Symbol.iterator]();
    return ii.next().done ?? false;
}
export function findFirst(i, f = _ => true) {
    for (const t of i)
        if (f(t))
            return Optional.of(t);
    return Optional.empty();
}
export function* chain(i1, i2) {
    for (const i of i1)
        yield i;
    for (const i of i2)
        yield i;
}
export function* butLast(i) {
    const iter = i[Symbol.iterator]();
    let v1 = iter.next();
    if (v1.done)
        return;
    let v2 = iter.next();
    while (!v2.done) {
        yield v1.value;
        v1 = v2;
        v2 = iter.next();
    }
}
export function* reversed(c) {
    for (let i = c.length() - 1; i >= 0; i--)
        yield c.get(i);
}
export function* enumerate(c) {
    let i = 0;
    for (const t of c)
        yield [t, i++];
}
export function* range(start, end) {
    const di = start > end ? -1 : 1;
    for (let i = start; i !== end; i += di)
        yield i;
}
export function* repeat(value, count) {
    if (count <= 0)
        return;
    for (let i = 0; i < count; i++)
        yield value;
}
export function* cyclicRange(start, length) {
    if (start >= length)
        throw new Error(`${start} >= ${length}`);
    for (let i = 0; i < length; i++)
        yield cyclic(start + i, length);
}
export function* cyclicPairs(length) {
    if (length < 0)
        throw new Error(`${length} < 0`);
    for (let i = 0; i < length; i++)
        yield [i, cyclic(i + 1, length)];
}
export function* loopPairs(i) {
    const iter = i[Symbol.iterator]();
    const first = iter.next();
    if (first.done)
        return;
    let lh = first;
    let rh = iter.next();
    while (!rh.done) {
        yield [lh.value, rh.value];
        lh = rh;
        rh = iter.next();
    }
    yield [lh.value, first.value];
}
export function* slidingPairs(i) {
    const iter = i[Symbol.iterator]();
    const first = iter.next();
    if (first.done)
        return;
    let lh = first;
    let rh = iter.next();
    while (!rh.done) {
        yield [lh.value, rh.value];
        lh = rh;
        rh = iter.next();
    }
}
export function* slidingWindow(i, size) {
    const iter = i[Symbol.iterator]();
    let window = [...takeIterator(iter, size)];
    if (window.length < size)
        return;
    yield window;
    for (;;) {
        const item = iter.next();
        if (item.done)
            return;
        window = [...window.slice(1), item.value];
        yield window;
    }
}
export function* join(i, delim) {
    const iter = i[Symbol.iterator]();
    let item = iter.next();
    if (item.done)
        return;
    for (;;) {
        yield item.value;
        item = iter.next();
        if (item.done)
            return;
        yield delim;
    }
}
export function take(i, count) {
    const iter = i[Symbol.iterator]();
    return takeIterator(iter, count);
}
export function* takeIterator(iter, count) {
    if (count < 0)
        return;
    while (count > 0) {
        const next = iter.next();
        if (next.done)
            return;
        yield next.value;
        count--;
    }
}
export function* groups(i, size) {
    const iter = i[Symbol.iterator]();
    for (;;) {
        const next = [...takeIterator(iter, size)];
        if (next.length === 0)
            return;
        else if (next.length !== size)
            throw Error();
        yield next;
    }
}
export function takeFirst(i) {
    const iter = i[Symbol.iterator]();
    const item = iter.next();
    return item.done ? Optional.empty() : Optional.of(item.value);
}
export function toIterable(iter) {
    return {
        [Symbol.iterator]: () => {
            return {
                next: () => { return iter.next(); }
            };
        }
    };
}
export function skip(i, count) {
    const iter = i[Symbol.iterator]();
    while (count > 0) {
        const v = iter.next();
        if (v.done)
            break;
        count--;
    }
    return toIterable(iter);
}
export function skipWhile(i, f) {
    const iter = i[Symbol.iterator]();
    for (;;) {
        const v = iter.next();
        if (v.done || !f(v.value))
            break;
    }
    return toIterable(iter);
}
export function* prefixNotEmpty(prefix, i) {
    const iter = i[Symbol.iterator]();
    let item = iter.next();
    if (item.done)
        return;
    for (const p of prefix)
        yield p;
    while (!item.done) {
        yield item.value;
        item = iter.next();
    }
}
export function* rect(w, h) {
    if (w < 0)
        throw new Error(`${w} < 0`);
    if (h < 0)
        throw new Error(`${h} < 0`);
    for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
            yield [x, y];
}
export function intersect(lh, rh) {
    return new Set([...lh].filter(t => rh.has(t)));
}
export function* interpolate(ii, f, points = [0.5]) {
    const i = ii[Symbol.iterator]();
    let lh = i.next();
    if (lh.done)
        return;
    yield lh.value;
    let rh = i.next();
    while (!rh.done) {
        for (const p of points)
            yield f(lh.value, rh.value, p);
        yield rh.value;
        lh = rh;
        rh = i.next();
    }
}
export function* flatten(i) {
    const ii = i[Symbol.iterator]();
    let item = ii.next();
    while (!item.done) {
        for (const v of item.value)
            yield v;
        item = ii.next();
    }
}
export function* flatMap(i, f) {
    const ii = i[Symbol.iterator]();
    let item = ii.next();
    while (!item.done) {
        for (const v of f(item.value))
            yield v;
        item = ii.next();
    }
}
export function toMap(i, keyMapper, valueMapper) {
    const map = new Map();
    for (const item of i)
        map.set(keyMapper(item), valueMapper(item));
    return map;
}
export function toObject(i, keyMapper, valueMapper) {
    const result = {};
    for (const item of i)
        result[keyMapper(item)] = valueMapper(item);
    return result;
}
export function group(i, keyMapper, valueMapper) {
    const map = new Map();
    for (const item of i)
        getOrCreate(map, keyMapper(item), _ => []).push(valueMapper(item));
    return map;
}
export function* groupEntries(i, keyMapper, valueMapper) {
    const map = new Map();
    for (const item of i)
        getOrCreate(map, keyMapper(item), _ => []).push(valueMapper(item));
    for (const e of map.entries())
        yield e;
}
export function getOrCreate(map, key, value) {
    let v = map.get(key);
    if (v === undefined) {
        v = value(key);
        map.set(key, v);
    }
    return v;
}
export function getOrDefault(map, key, def) {
    const v = map.get(key);
    return v === undefined ? def : v;
}
export function getOrDefaultF(map, key, def) {
    const v = map.get(key);
    return v === undefined ? def(key) : v;
}
export function mapBuilder() {
    const map = new Map();
    const builder = {
        add: (k, v) => { map.set(k, v); return builder; },
        build: () => map
    };
    return builder;
}
export function reverseMap(map) {
    const nmap = new Map();
    map.forEach((v, k) => nmap.set(v, k));
    return nmap;
}
//# sourceMappingURL=collections.js.map