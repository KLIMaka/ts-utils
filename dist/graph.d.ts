import { Function } from './types';
export type Links<T> = {
    to: Set<T>;
    from: Set<T>;
};
export declare class DirectionalGraph<T> {
    readonly nodes: Map<T, Links<T>>;
    addNode(label: T): {
        to: Set<unknown>;
        from: Set<unknown>;
    };
    add(from: T, to: T): void;
    addChain(chain: T[]): void;
    remove(n: T): void;
    order(node: T, f?: Function<Links<T>, Set<T>>): number;
    orderedTo(node: T): T[];
    orderedAll(f?: Function<Links<T>, Set<T>>): T[];
    findCycle(): T[];
    subgraphs(): T[][];
}
//# sourceMappingURL=graph.d.ts.map