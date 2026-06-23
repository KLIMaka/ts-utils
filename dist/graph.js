import { match } from 'ts-pattern';
import { chain, getOrCreate, map, slidingPairs, reduce } from './collections';
import { iter } from './iter';
import { checkNotUndefined, field } from './objects';
import { true_ } from './types';
export function direction(dir) {
    return match(dir)
        .returnType()
        .with('from', () => l => l.from)
        .with('to', () => l => l.to)
        .exhaustive();
}
export function opposite(dir) {
    return dir === 'from' ? 'to' : 'from';
}
export class DirectionalGraph {
    nodes = new Map();
    addNode(label) {
        return getOrCreate(this.nodes, label, _ => { return { to: new Set(), from: new Set() }; });
    }
    add(from, to) {
        this.addNode(to).from.add(from);
        this.addNode(from).to.add(to);
    }
    addChain(chain) {
        for (const [c1, c2] of slidingPairs(chain))
            this.add(c1, c2);
    }
    remove(n) {
        const node = this.nodes.get(n);
        if (node === undefined)
            return;
        node.to.forEach(n1 => this.nodes.get(n1)?.from.delete(n));
        node.from.forEach(n1 => this.nodes.get(n1)?.to.delete(n));
        this.nodes.delete(n);
    }
    orderNamed(start, dir = 'to') {
        return this.order(start, direction(dir));
    }
    order(start, dir = direction('to'), cache = new Map()) {
        const links = this.nodes.get(start);
        if (links === undefined) {
            cache.set(start, 0);
            return 0;
        }
        const flinks = dir(links);
        if (flinks.size === 0) {
            cache.set(start, 0);
            return 0;
        }
        const order = reduce(map(flinks, n => getOrCreate(cache, n, _ => this.order(n, dir, cache))), Math.max, 0) + 1;
        cache.set(start, order);
        return order;
    }
    orderedTo(node) {
        return this.ordered(node, 'from')
            .sort(({ order: l }, { order: r }) => r - l)
            .map(field('node'));
    }
    ordered(start, dir) {
        const result = new Set();
        result.add(start);
        const dirf = direction(dir);
        const oppositeDirF = direction(opposite(dir));
        for (const n of result)
            dirf(checkNotUndefined(this.nodes.get(n)))
                .forEach(n => result.add(n));
        const cache = new Map();
        return [...result].map(node => ({ node, order: this.order(node, oppositeDirF, cache) }));
    }
    orderedAll(dir = 'to') {
        return this.orderedOnly(true_(), dir);
    }
    orderedOnly(pred, dir = 'to') {
        const dirF = direction(dir);
        const cache = new Map();
        const order = (n) => this.order(n, dirF, cache);
        return [...this.nodes.keys().filter(pred)].sort((l, r) => order(r) - order(l));
    }
    findCycle() {
        const colors = new Map();
        const paint = (node, links) => {
            colors.set(node, 'gray');
            for (const child of links.to) {
                const c = colors.get(child);
                if (c === undefined) {
                    const cycle = paint(child, this.nodes.get(child));
                    if (cycle.length !== 0) {
                        cycle.unshift(child);
                        return cycle;
                    }
                }
                else if (c === 'gray')
                    return [child];
            }
            colors.set(node, 'black');
            return [];
        };
        for (const [node, links] of this.nodes.entries()) {
            if (colors.has(node))
                continue;
            const cycle = paint(node, links);
            if (cycle !== null)
                return cycle;
        }
        return [];
    }
    subgraphs() {
        const visited = new Set();
        const nodes = this.nodes;
        const collect = node => {
            if (visited.has(node))
                return [];
            const { to, from } = nodes.get(node);
            visited.add(node);
            const links = iter(chain(to, from))
                .map(collect)
                .flatten();
            return [node, ...links];
        };
        return iter(nodes.keys())
            .map(collect)
            .filter(a => a.length !== 0)
            .collect();
    }
}
//# sourceMappingURL=graph.js.map