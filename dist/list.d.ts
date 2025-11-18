export type Node<T> = {
    obj: T;
    next: Node<T>;
    prev: Node<T>;
};
export declare class List<T> implements Iterable<T> {
    private nil;
    constructor();
    first(): Node<T>;
    last(): Node<T>;
    terminator(): Node<T>;
    pop(): T;
    push(value: T): Node<T>;
    pushForward(value: T): Node<T>;
    pushAll(values: T[]): Node<T>[];
    isEmpty(): boolean;
    insertNodeBefore(node: Node<T>, ref?: Node<T>): Node<T>;
    insertBefore(val: T, ref?: Node<T>): Node<T>;
    insertNodeAfter(node: Node<T>, ref?: Node<T>): Node<T>;
    insertAfter(val: T, ref?: Node<T>): Node<T>;
    remove(ref: Node<T>): Node<T>;
    clear(): void;
    [Symbol.iterator](): Iterator<T>;
}
export declare class FastList<T> implements Iterable<T> {
    private values;
    private ptrs;
    length: number;
    constructor();
    private static nextOff;
    private static lastOff;
    insertAfter(value: T, after?: number): number;
    insertBefore(value: T, before?: number): number;
    remove(idx: number): T;
    clear(): void;
    get(idx: number): T;
    next(idx: number): number;
    last(idx: number): number;
    push(value: T): number;
    pop(): T;
    first(): number;
    isEmpty(): boolean;
    [Symbol.iterator](): Iterator<T>;
}
//# sourceMappingURL=list.d.ts.map