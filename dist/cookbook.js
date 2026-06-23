import { DirectionalGraph } from "./graph";
import { iter } from "./iter";
import { checkNotUndefined, field } from "./objects";
import { second } from "./types";
export function cookbook(factory) {
    const book = new Cookbook({});
    const final = factory(book);
    return book.cook(final);
}
export function cookbookInput(token, factory) {
    const input = {};
    const book = new Cookbook(input);
    const final = factory(book, input);
    return book.cook(final);
}
function wrapRecepie(label, recepie) {
    return async (handle, ...args) => await handle.waitFor(recepie(...args), label);
}
export class Cookbook {
    input;
    tasksGraph = new DirectionalGraph();
    args = new Map();
    constructor(input) {
        this.input = input;
        this.tasksGraph.addNode(this.input);
    }
    recepie(label, args, recepie) {
        const wrapped = wrapRecepie(label, recepie);
        return this.paste(args, wrapped);
    }
    paste(args, task) {
        this.tasksGraph.addNode(task);
        args.forEach(a => this.tasksGraph.add(a, task));
        this.args.set(task, args);
        return task;
    }
    async cookRecepie(handle, values, recepie) {
        const args = checkNotUndefined(this.args.get(recepie)).map(a => values.get(a));
        const result = await recepie(handle, ...args);
        values.set(recepie, result);
    }
    extractGroups(recepie) {
        return iter(this.tasksGraph.ordered(recepie, 'from'))
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
    cook(recepie) {
        const topoord = this.extractGroups(recepie);
        const values = new Map();
        return async (handle, ...args) => {
            values.set(this.input, args);
            return this.runGroups(handle, topoord, values, recepie);
        };
    }
}
//# sourceMappingURL=cookbook.js.map