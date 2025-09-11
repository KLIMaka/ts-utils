import { chain, getOrCreate, map, slidingPairs, reduce } from './collections';
import { iter } from './iter';
import { memoize } from './mathutils';
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
    order(node, f = l => l.to) {
        const links = this.nodes.get(node);
        if (links === undefined)
            return 0;
        const flinks = f(links);
        if (flinks.size === 0)
            return 0;
        return reduce(map(flinks, n => this.order(n, f)), Math.max, 0) + 1;
    }
    orderedTo(node) {
        const result = new Set();
        result.add(node);
        for (const n of result)
            this.nodes.get(n)?.from.forEach(n => result.add(n));
        const order = memoize((n) => this.order(n));
        return [...result].sort((l, r) => order(r) - order(l));
    }
    orderedAll(f = l => l.to) {
        const order = memoize((n) => this.order(n, f));
        return [...this.nodes.keys()].sort((l, r) => order(r) - order(l));
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