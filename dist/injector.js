import { getOrCreate, map } from "./collections";
import { DirectionalGraph } from "./graph";
import { iter } from "./iter";
export class Dependency {
    name;
    isVoid;
    constructor(name, isVoid = false) {
        this.name = name;
        this.isVoid = isVoid;
    }
}
const STOP = async (i) => { };
export function provider(start) { return { start, stop: STOP }; }
export function instance(value) { return provider(async (i) => value); }
export function plugin(name) { return new Dependency(name, true); }
export function lifecycle(start) {
    const cleaners = [];
    const lifecycle = (value, cleaner) => { cleaners.push([value, cleaner]); return value; };
    return {
        async start(i) { return start(i, lifecycle); },
        async stop(i) { await Promise.all(iter(cleaners.reverse()).map(c => c[1](c[0])).collect()); }
    };
}
class ChildInjector {
    dependency;
    parent;
    constructor(dependency, parent) {
        this.dependency = dependency;
        this.parent = parent;
    }
    getInstanceParent(dependency, injector) { return this.parent.getInstanceParent(dependency, injector); }
    getInstance(dependency) { return this.parent.getInstanceParent(dependency, this); }
}
export class DependencyError extends Error {
    cause;
    constructor(message, cause) {
        super(`${message}:  ${cause.message}`);
        this.cause = cause;
    }
}
class NopListener {
    async start(dep, promise) { return await promise; }
    async stop(dep, promise) { return await promise; }
}
const NOP_LISTENER = new NopListener();
export class App {
    listener;
    plugins = new Map();
    constructor(listener = NOP_LISTENER) {
        this.listener = listener;
    }
    bind(dependency, plugin) {
        if (this.plugins.has(dependency))
            throw new Error(`Multiple bindings to dependency ${dependency.name}`);
        this.plugins.set(dependency, plugin);
    }
    install(submodule) {
        submodule(this);
    }
    async start() {
        return this.listener.start(RUNTIME, this.doStart());
    }
    async doStart() {
        const injector = new RootInjector(this.plugins, this.listener);
        try {
            const voidDeps = iter(this.plugins.keys())
                .filter(dep => dep.isVoid)
                .map(dep => injector.getInstance(dep))
                .collect();
            await Promise.all(voidDeps);
            return injector;
        }
        catch (e) {
            throw new DependencyError(`Error while starting App`, e);
        }
    }
}
function getDependencyChain(dependency, injector) {
    const chain = [dependency];
    let current = injector;
    while (current instanceof ChildInjector) {
        chain.unshift(current.dependency);
        current = current.parent;
    }
    return chain;
}
export const RUNTIME = new Dependency('Runtime');
class RootInjector {
    providers;
    listener;
    graph = new DirectionalGraph();
    instances = new Map();
    constructor(providers, listener) {
        this.providers = providers;
        this.listener = listener;
        this.instances.set(RUNTIME, Promise.resolve(this));
    }
    async stop() {
        await Promise.all([...map(this.graph.orderedAll(), d => this.stopInstance(d))]);
    }
    add(dependency, injector) {
        this.graph.addChain(getDependencyChain(dependency, injector));
        const cycle = this.graph.findCycle();
        if (cycle.length !== 0)
            throw new Error(`Found cycle: ${cycle.map(d => d.name)}`);
    }
    getInstanceParent(dependency, injector) {
        this.add(dependency, injector);
        return getOrCreate(this.instances, dependency, d => this.listener.start(d, this.create(d, injector)));
    }
    getInstance(dependency) {
        return this.getInstanceParent(dependency, this);
    }
    async replaceInstance(dependency, provider) {
        const toStop = this.graph.orderedTo(dependency);
        await Promise.all([...map(toStop, d => this.stopInstance(d))]);
        this.providers.set(dependency, provider);
        await Promise.all(iter(toStop).filter(d => d.isVoid).map(d => this.getInstance(d)).collect());
    }
    async create(dependency, parent) {
        const injector = new ChildInjector(dependency, parent);
        try {
            const instance = await this.getProvider(dependency).start(injector);
            return instance;
        }
        catch (e) {
            throw new DependencyError(`Error while creating ${dependency.name}`, e);
        }
    }
    async stopInstance(dependency) {
        return this.listener.stop(dependency, this.doStopInstance(dependency));
    }
    getProvider(dependency) {
        const provider = this.providers.get(dependency);
        if (provider === undefined)
            throw new Error(`No provider bound to ${dependency.name}`);
        return provider;
    }
    async doStopInstance(dependency) {
        try {
            await this.getProvider(dependency).stop(this);
            this.graph.remove(dependency);
            this.instances.delete(dependency);
        }
        catch (e) {
            throw new DependencyError(`Error while stopping ${dependency.name}`, e);
        }
    }
}
export async function create(injector, ctr, ...args) {
    return new ctr(...await getInstances(injector, ...args));
}
export async function getInstances(injector, ...args) {
    return await Promise.all(args.map(a => injector.getInstance(a)));
}
//# sourceMappingURL=injector.js.map