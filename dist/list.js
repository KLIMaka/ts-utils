import { EMPTY_ITERATOR, ITERATOR_RESULT, TERMINAL_ITERATOR_RESULT, map } from "./collections";
export class Node {
    obj;
    next;
    prev;
    constructor(obj = null, next = null, prev = null) {
        this.obj = obj;
        this.next = next;
        this.prev = prev;
    }
}
export class List {
    nil = new Node();
    constructor() {
        this.clear();
    }
    first() {
        return this.nil.next;
    }
    last() {
        return this.nil.prev;
    }
    terminator() {
        return this.nil;
    }
    pop() {
        const ret = this.last().obj;
        this.remove(this.last());
        return ret;
    }
    push(value) {
        return this.insertAfter(value);
    }
    pushForward(value) {
        return this.insertBefore(value);
    }
    pushAll(values) {
        const nodes = [];
        for (let i = 0; i < values.length; i++)
            nodes.push(this.insertAfter(values[i]));
        return nodes;
    }
    isEmpty() {
        return this.nil.next === this.nil;
    }
    insertNodeBefore(node, ref = this.nil.next) {
        node.next = ref;
        node.prev = ref.prev;
        node.prev.next = node;
        ref.prev = node;
        return node;
    }
    insertBefore(val, ref = this.nil.next) {
        return this.insertNodeBefore(new Node(val), ref);
    }
    insertNodeAfter(node, ref = this.nil.prev) {
        node.next = ref.next;
        node.next.prev = node;
        ref.next = node;
        node.prev = ref;
        return node;
    }
    insertAfter(val, ref = this.nil.prev) {
        return this.insertNodeAfter(new Node(val), ref);
    }
    remove(ref) {
        if (ref === this.nil)
            return;
        ref.next.prev = ref.prev;
        ref.prev.next = ref.next;
        return ref;
    }
    clear() {
        this.nil.next = this.nil;
        this.nil.prev = this.nil;
    }
    [Symbol.iterator]() {
        let pointer = this.first();
        return pointer === this.terminator()
            ? EMPTY_ITERATOR
            : {
                next: () => {
                    if (pointer === this.terminator())
                        return TERMINAL_ITERATOR_RESULT;
                    else {
                        const obj = pointer.obj;
                        pointer = pointer.next;
                        return ITERATOR_RESULT(obj);
                    }
                }
            };
    }
}
export class FastList {
    elements = [];
    constructor() {
        this.clear();
    }
    static nextOff(idx) { return idx * 3 + 1; }
    static lastOff(idx) { return idx * 3 + 2; }
    insertAfter(value, after = this.elements[1]) {
        const idx = this.length() + 1;
        const next = this.next(after);
        this.elements.push(value, next, after);
        this.elements[FastList.nextOff(after)] = idx;
        this.elements[FastList.lastOff(next)] = idx;
        return idx;
    }
    insertBefore(value, before = this.elements[2]) {
        const idx = this.length() + 1;
        const last = this.last(before);
        this.elements.push(value, before, last);
        this.elements[FastList.nextOff(last)] = idx;
        this.elements[FastList.lastOff(before)] = idx;
        return idx;
    }
    remove(idx) {
        if (idx <= 0 || idx >= this.length() || this.next(idx) === -1)
            return null;
        this.elements[FastList.nextOff(this.last(idx))] = this.next(idx);
        this.elements[FastList.lastOff(this.next(idx))] = this.last(idx);
        this.elements[FastList.nextOff(idx)] = -1;
        this.elements[FastList.lastOff(idx)] = -1;
        const elem = this.elements[idx * 3];
        this.elements[idx * 3] = null;
        return elem;
    }
    clear() { this.elements = [null, 0, 0]; }
    length() { return this.elements.length / 3 - 1; }
    get(idx) { return this.elements[idx * 3]; }
    next(idx) { return this.elements[FastList.nextOff(idx)]; }
    last(idx) { return this.elements[FastList.lastOff(idx)]; }
    push(value) { return this.insertAfter(value); }
    pop() { return this.remove(this.last(0)); }
    first() { return this.next(0); }
    isEmpty() { return this.length() === 0; }
    [Symbol.iterator]() {
        let ptr = this.first();
        return ptr === 0
            ? EMPTY_ITERATOR
            : {
                next: () => {
                    if (ptr === 0)
                        return TERMINAL_ITERATOR_RESULT;
                    else {
                        const obj = this.get(ptr);
                        ptr = this.next(ptr);
                        return ITERATOR_RESULT(obj);
                    }
                }
            };
    }
}
function advance(iter, list, steps) {
    for (let i = 0; i < steps; i++)
        iter = list.next(iter);
    return iter;
}
function length(list, from, to) {
    let length = 0;
    for (let i = from; i !== to; i = list.next(i))
        length++;
    return length;
}
export class SortedList {
    values = new FastList();
    add(value, sortValue) {
        const ptr = this.binaryIndexOf(sortValue);
        this.values.insertAfter([value, sortValue], ptr);
    }
    clear() {
        this.values.clear();
    }
    get() { return map(this.values, v => v[0]); }
    isEmpty() { return this.values.isEmpty(); }
    first() { return this.values.get(this.values.first())[0]; }
    binaryIndexOf(searchElement) {
        const values = this.values;
        if (values.isEmpty())
            return 0;
        let min = values.first();
        let max = values.last(0);
        if (searchElement < values.get(min)[1])
            return 0;
        if (searchElement >= values.get(max)[1])
            return max;
        let size = length(values, min, max);
        while (min !== max) {
            const ds = Math.ceil(size / 2);
            size -= ds;
            const current = advance(min, values, ds);
            const currentElement = values.get(current)[1];
            if (currentElement <= searchElement)
                min = current;
            else
                max = values.last(current);
        }
        return min;
    }
    [Symbol.iterator]() {
        const iter = this.values[Symbol.iterator]();
        return {
            next: () => {
                const v = iter.next();
                return v.done ? TERMINAL_ITERATOR_RESULT : ITERATOR_RESULT(v.value[0]);
            }
        };
    }
}
//# sourceMappingURL=list.js.map