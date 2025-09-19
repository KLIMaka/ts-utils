import { filter, map, reduce, forEach, all, enumerate, take, findFirst, chain, butLast, skip, any, iterIsEmpty, skipWhile, flatten, zip, join, length, toMap, reduceFirst, group, toObject, groupEntries, range, flatMap } from "./collections";
export class Iter {
    iter;
    static of(iter) { return new Iter(iter); }
    static range(start, end) { return new Iter(range(start, end)); }
    constructor(iter) {
        this.iter = iter;
    }
    ;
    [Symbol.iterator]() { return this.iter[Symbol.iterator](); }
    filter(f) { return new Iter(filter(this.iter, f)); }
    map(f) { return new Iter(map(this.iter, f)); }
    zip(it) { return new Iter(zip(this.iter, it)); }
    join(separator) { return new Iter(join(this.iter, separator)); }
    forEach(f) { forEach(this.iter, f); return this; }
    enumerate() { return new Iter(enumerate(this.iter)); }
    take(count) { return new Iter(take(this.iter, count)); }
    skip(count) { return new Iter(skip(this.iter, count)); }
    skipWhile(f) { return new Iter(skipWhile(this.iter, f)); }
    reduce(f, start) { return reduce(this.iter, f, start); }
    reduceFirst(f) { return reduceFirst(this.iter, f); }
    all(f) { return all(this.iter, f); }
    any(f) { return any(this.iter, f); }
    isEmpty() { return iterIsEmpty(this.iter); }
    first(f = _ => true) { return findFirst(this.iter, f); }
    chain(i) { return new Iter(chain(this.iter, i)); }
    butLast() { return new Iter(butLast(this.iter)); }
    flatten() { return new Iter(flatten(this.iter)); }
    flatMap(f) { return new Iter(flatMap(this.iter, f)); }
    collect() { return [...this.iter]; }
    set() { return new Set(this.iter); }
    length() { return length(this.iter); }
    toMap(keyMapper, valueMapper) { return toMap(this.iter, keyMapper, valueMapper); }
    toObject(keyMapper, valueMapper) { return toObject(this.iter, keyMapper, valueMapper); }
    group(keyMapper, valueMapper) { return group(this.iter, keyMapper, valueMapper); }
    groupEntries(keyMapper, valueMapper) { return new Iter(groupEntries(this.iter, keyMapper, valueMapper)); }
    async await_() { return new Iter(await Promise.all([...this.iter])); }
}
export function iter(iter) {
    return Iter.of(iter);
}
//# sourceMappingURL=iter.js.map