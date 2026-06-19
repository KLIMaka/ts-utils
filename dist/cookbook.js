import { DirectionalGraph } from "./graph";
import { iter } from "./iter";
import { checkNotUndefined, field } from "./objects";
import { second } from "./types";
export function cookbook() {
    const input = {};
    const book = new Cookbook(input);
    return { input, book };
}
function wrapRecepie(label, recepie) {
    return async (handle, ...args) => await handle.waitFor(recepie(...args), label);
}
export class Cookbook {
    input;
    recepiesGraph = new DirectionalGraph();
    args = new Map();
    constructor(input) {
        this.input = input;
        this.recepiesGraph.addNode(this.input);
    }
    recepie(label, args, recepie) {
        const wrapped = wrapRecepie(label, recepie);
        return this.paste(args, wrapped);
    }
    paste(args, work) {
        this.recepiesGraph.addNode(work);
        args.forEach(a => this.recepiesGraph.add(a, work));
        this.args.set(work, args);
        return work;
    }
    chapter(args, factory) {
        const { book, input } = cookbook();
        return this.paste(args, async (handle, ...args) => {
            const work = factory(book, input, ...args);
            return book.cook(work, args)(handle);
        });
    }
    async cookRecepie(handle, values, recepie) {
        const args = checkNotUndefined(this.args.get(recepie)).map(a => values.get(a));
        const result = await recepie(handle, ...args);
        values.set(recepie, result);
    }
    extractGroups(recepie) {
        return iter(this.recepiesGraph.ordered(recepie, 'from'))
            .groupEntries(field('order'), field('node'))
            .collect()
            .toSorted((l, r) => r[0] - l[0])
            .map(second)
            .filter(r => r[0] !== this.input);
    }
    async runGroups(handle, groups, values, recepie) {
        const recepieHandle = handle.fork(groups.length);
        for (const group of groups) {
            const h = recepieHandle.fork(group.length);
            await Promise.all(group.map(r => this.cookRecepie(h, values, r)));
        }
        return values.get(recepie);
    }
    cook(recepie, input) {
        const groups = this.extractGroups(recepie);
        const values = new Map();
        values.set(this.input, input);
        return async (handle) => this.runGroups(handle, groups, values, recepie);
    }
    extract(recepie) {
        const topoord = this.extractGroups(recepie);
        const values = new Map();
        return async (handle, ...args) => {
            values.set(this.input, args);
            return this.runGroups(handle, topoord, values, recepie);
        };
    }
}
//# sourceMappingURL=cookbook.js.map