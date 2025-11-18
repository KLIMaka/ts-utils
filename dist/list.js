import { EMPTY_ITERATOR, ITERATOR_RESULT, TERMINAL_ITERATOR_RESULT } from "./collections";
function createNil() {
    const node = { obj: null };
    node.next = node;
    node.prev = node;
    return node;
}
export class List {
    nil = createNil();
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
        if (this.last() === this.nil)
            throw new Error();
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
        return values.map(v => this.insertAfter(v));
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
        return this.insertNodeBefore({ obj: val }, ref);
    }
    insertNodeAfter(node, ref = this.nil.prev) {
        node.next = ref.next;
        node.next.prev = node;
        ref.next = node;
        node.prev = ref;
        return node;
    }
    insertAfter(val, ref = this.nil.prev) {
        return this.insertNodeAfter({ obj: val }, ref);
    }
    remove(ref) {
        if (ref === this.nil)
            throw new Error();
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
    values = [];
    ptrs = [];
    length = 0;
    constructor() {
        this.clear();
    }
    static nextOff(idx) { return idx * 2; }
    static lastOff(idx) { return idx * 2 + 1; }
    insertAfter(value, after = this.ptrs[1]) {
        if (after < 0 || after >= this.values.length || this.next(after) === -1)
            throw new Error();
        const idx = this.values.length;
        const next = this.next(after);
        this.values.push(value);
        this.ptrs.push(next, after);
        this.length++;
        this.ptrs[FastList.nextOff(after)] = idx;
        this.ptrs[FastList.lastOff(next)] = idx;
        return idx;
    }
    insertBefore(value, before = this.ptrs[0]) {
        if (before < 0 || before >= this.values.length || this.next(before) === -1)
            throw new Error();
        const idx = this.values.length;
        const last = this.last(before);
        this.values.push(value);
        this.ptrs.push(before, last);
        this.length++;
        this.ptrs[FastList.nextOff(last)] = idx;
        this.ptrs[FastList.lastOff(before)] = idx;
        return idx;
    }
    remove(idx) {
        if (idx <= 0 || idx >= this.values.length || this.next(idx) === -1)
            throw new Error();
        this.ptrs[FastList.nextOff(this.last(idx))] = this.next(idx);
        this.ptrs[FastList.lastOff(this.next(idx))] = this.last(idx);
        this.ptrs[FastList.nextOff(idx)] = -1;
        this.ptrs[FastList.lastOff(idx)] = -1;
        const elem = this.values[idx];
        this.values[idx] = null;
        this.length--;
        return elem;
    }
    clear() {
        this.values = [null];
        this.ptrs = [0, 0];
        this.length = 0;
    }
    get(idx) { if (idx <= 0 || idx >= this.values.length || this.next(idx) === -1)
        throw new Error(); return this.values[idx]; }
    next(idx) { return this.ptrs[FastList.nextOff(idx)]; }
    last(idx) { return this.ptrs[FastList.lastOff(idx)]; }
    push(value) { return this.insertAfter(value); }
    pop() { return this.remove(this.last(0)); }
    first() { return this.next(0); }
    isEmpty() { return this.length === 0; }
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
//# sourceMappingURL=list.js.map