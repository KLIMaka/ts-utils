import { Fn, Pred } from './types';
export type Links<T> = {
    to: Set<T>;
    from: Set<T>;
};
export type Direction = 'from' | 'to';
export declare function direction<T>(dir: Direction): Fn<Links<T>, Set<T>>;
export declare function opposite(dir: Direction): Direction;
export declare class DirectionalGraph<T> {
    readonly nodes: Map<T, Links<T>>;
    addNode(label: T): {
        to: Set<unknown>;
        from: Set<unknown>;
    };
    add(from: T, to: T): void;
    addChain(chain: T[]): void;
    remove(n: T): void;
    orderNamed(start: T, dir?: Direction): number;
    order(start: T, dir?: Fn<Links<T>, Set<T>>, cache?: Map<T, number>): number;
    orderedTo(node: T): T[];
    ordered(start: T, dir: Direction): {
        node: T;
        order: number;
    }[];
    orderedAll(dir?: Direction): T[];
    orderedOnly(pred: Pred<T>, dir?: Direction): T[];
    findCycle(): T[];
    subgraphs(): T[][];
}
//# sourceMappingURL=graph.d.ts.map