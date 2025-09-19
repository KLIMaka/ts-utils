import { produce } from "immer";
import Optional from "optional-js";
import { DirectionalGraph } from "./graph";
import { iter } from "./iter";
import { objectKeys } from "./objects";
import { identity, nil, refEq, result, resultAsync, second, secondArg } from "./types";
function arrayEqImpl(arr1, arr2, eqf = (l, r) => l === r) {
    if (arr1 === null || arr2 === null)
        return false;
    if (arr1.length !== arr2.length)
        return false;
    for (let i = 0; i < arr1.length; i++)
        if (!eqf(arr1[i], arr2[i]))
            return false;
    return true;
}
export function arrayEq(arr1, arr2, eqf = (l, r) => l === r) {
    return arrayEqImpl(arr1, arr2, eqf);
}
export function objectEq(obj1, obj2) {
    if (!arrayEqImpl(Object.keys(obj1), Object.keys(obj2)))
        return false;
    for (const k in obj1)
        if (obj1[k] !== obj2[k])
            return false;
    return true;
}
export function disposer() {
    return d => d.dispose();
}
;
export function disposable(disconnector) {
    return { dispose: async () => disconnector() };
}
export function dispose(...disp) {
    disp.forEach(d => d.dispose());
}
class BaseSource {
    name;
    handlers = new Set();
    constructor(name = '') {
        this.name = name;
    }
    subscribe(cb, lastMods) {
        if (!this.hasSubscriptions())
            this.firstSubscribe();
        if (lastMods) {
            const currentMods = this.mods();
            if (lastMods !== currentMods)
                cb(this.get(), currentMods);
        }
        this.handlers.add(cb);
        return () => {
            this.handlers.delete(cb);
            if (!this.hasSubscriptions())
                this.lastDisconnect();
        };
    }
    firstSubscribe() { }
    lastDisconnect() { }
    hasSubscriptions() { return this.handlers.size !== 0; }
    notify(value, mods) { this.handlers.forEach(h => h(value, mods)); }
}
class ConstSource {
    name;
    value;
    disposer;
    constructor(name = '', value, disposer) {
        this.name = name;
        this.value = value;
        this.disposer = disposer;
    }
    get() { return this.value; }
    mods() { return 0; }
    depends(value) { return false; }
    subscribe(_) { return nil(); }
    async dispose() { this.disposer(this.value); }
}
export function constSource(name, val, disposer = nil()) {
    return new ConstSource(name, val, disposer);
}
export class BaseValue extends BaseSource {
    value;
    disposer;
    eq;
    settter;
    modsCount;
    constructor(builder, value = builder.value, disposer = builder.disposer ?? nil(), eq = builder.eq ?? refEq(), settter = builder.setter ?? secondArg(), modsCount = 0) {
        super(builder.name);
        this.value = value;
        this.disposer = disposer;
        this.eq = eq;
        this.settter = settter;
        this.modsCount = modsCount;
    }
    set(newValue) {
        if (!this.isSameValue(newValue))
            this.setImpl(newValue);
    }
    async setPromiseOrDispose(mod) {
        const startMods = this.mods();
        const nvalue = await mod(this.get());
        if (this.mods() !== startMods) {
            this.disposeValue(nvalue);
            return false;
        }
        else {
            this.setOrDispose(nvalue);
            return true;
        }
    }
    setImpl(newValue) {
        this.disposeValue(this.value);
        this.value = this.settter(this.value, newValue);
        this.modsCount++;
        this.notify(this.value, this.modsCount);
    }
    setOrDispose(newValue) {
        if (this.value === newValue)
            return;
        else if (this.eq(this.value, newValue)) {
            this.disposeValue(newValue);
        }
        else
            this.setImpl(newValue);
    }
    isSameValue(value) {
        return this.value === value || this.eq(this.value, value);
    }
    async dispose() {
        if (this.hasSubscriptions())
            throw new Error(`Value '${this.name}' has subscriptions`);
        this.disposeValue(this.value);
        this.value = null;
    }
    get() { return this.value; }
    modImmer(mod) { this.set(produce(this.value, draft => { mod(draft); })); }
    mod(mod) { this.set(mod(this.value)); }
    mods() { return this.modsCount; }
    depends(value) { return false; }
    disposeValue(value) { this.disposer(value); }
}
export class Value extends BaseValue {
}
export class ValuesMap {
    map;
    constructor(map) {
        this.map = map;
    }
    get(key) { return this.map.get(key); }
    getObject() { return iter(this.map.keys()).toObject(identity(), k => this.map.get(k)?.get()); }
    set(values) { iter(this.map.entries()).forEach(([k, v]) => v.set(values[k])); }
    handle(values, handler) {
        iter(this.map.values()).forEach(v => values.handleStandalone([v], _ => handler(this.getObject())));
    }
}
export function toValuesMap(obj, def, values) {
    return new ValuesMap(iter(objectKeys(def)).toMap(identity(), k => values.value(k.toString(), obj[k] ?? def[k])));
}
export function valueBuilder(builder) {
    return new Value(builder);
}
export function value(name, value) {
    return valueBuilder({ name, value });
}
class ProxyValue extends BaseValue {
    source;
    signalConnector;
    disconnector = nil();
    constructor(builder) {
        super(builder);
        this.source = builder.source;
        this.signalConnector = builder.signalConnector;
    }
    firstSubscribe() { this.disconnector = this.signalConnector(() => this.set(this.source())); }
    lastDisconnect() { this.disconnector(); }
}
export function proxyBuilder(builder) {
    return new ProxyValue(builder);
}
export function proxy(source, signalConnector) {
    return proxyBuilder({ value: source(), source, signalConnector });
}
class ProxyValueAsync extends Value {
    source;
    signalConnector;
    disconnector = nil();
    constructor(builder) {
        super(builder);
        this.source = builder.source;
        this.signalConnector = builder.signalConnector;
    }
    firstSubscribe() { this.disconnector = this.signalConnector(async () => this.set(await this.source())); }
    lastDisconnect() { this.disconnector(); }
}
export function proxyAsyncBuilder(builder) {
    return new ProxyValueAsync(builder);
}
export async function proxyAsync(source, signalConnector) {
    return proxyAsyncBuilder({ value: await source(), source, signalConnector });
}
export function proxyAsyncImmediate(value, source, signalConnector) {
    return proxyAsyncBuilder({ value, source, signalConnector });
}
export const TRANSFORM_PLACEHOLDER = {};
export class TransformValue extends BaseValue {
    source;
    transformer;
    srcValueConnector;
    srcValueDisconnector = nil();
    disconnector = nil();
    lastSrcMods;
    constructor(builder) {
        super(builder);
        this.source = builder.source;
        this.transformer = builder.transformer;
        this.srcValueConnector = builder.srcConnector ?? (_ => nil());
    }
    firstSubscribe() {
        this.actualize();
        this.srcValueDisconnector = this.srcValueConnector(this.source.get(), this);
        this.disconnector = this.source.subscribe((v, mods) => this.transform(v, mods), this.lastSrcMods);
    }
    lastDisconnect() {
        this.disconnector();
        this.srcValueDisconnector();
    }
    set(newValue) {
        if (this.value === TRANSFORM_PLACEHOLDER)
            this.value = newValue;
        else
            super.set(newValue);
    }
    setOrDispose(newValue) {
        if (this.value === TRANSFORM_PLACEHOLDER)
            this.value = newValue;
        else
            super.setOrDispose(newValue);
    }
    disposeValue(value) {
        if (value === TRANSFORM_PLACEHOLDER)
            return;
        super.disposeValue(value);
    }
    transform(value, mods) {
        if (this.hasSubscriptions()) {
            this.srcValueDisconnector();
            this.srcValueDisconnector = this.srcValueConnector(value, this);
        }
        const nvalue = this.transformer(value, this.value);
        this.setOrDispose(nvalue);
        this.lastSrcMods = mods;
        return super.get();
    }
    actualize() {
        if (this.hasSubscriptions() && this.value !== TRANSFORM_PLACEHOLDER)
            return;
        const srcMods = this.source.mods();
        if (this.lastSrcMods !== srcMods)
            this.transform(this.source.get(), srcMods);
    }
    mods() {
        this.actualize();
        return super.mods();
    }
    get() {
        this.actualize();
        return super.get();
    }
    depends(value) {
        return this.source === value || this.source.depends(value);
    }
}
export function transformedBuilder(builder) {
    return new TransformValue(builder);
}
export function transformed(source, transformer, srcConnector) {
    return transformedBuilder({ source, transformer, srcConnector, value: TRANSFORM_PLACEHOLDER });
}
export function initial(value) {
    return { value, mods: -1 };
}
export class TransformValueAsync extends BaseValue {
    source;
    transformer;
    srcValueConnector;
    disconnector = nil();
    srcValueDisconnector = nil();
    lastSrcMods;
    currentId = 0;
    constructor(builder) {
        super({ ...builder, value: builder.initialValue?.value ?? TRANSFORM_PLACEHOLDER });
        this.source = builder.source;
        this.lastSrcMods = builder.initialValue?.mods ?? undefined;
        this.transformer = builder.transformer;
        this.srcValueConnector = builder.srcConnector ?? (_ => nil());
    }
    firstSubscribe() {
        this.actualize();
        this.srcValueDisconnector = this.srcValueConnector(this.source.get(), this);
        this.disconnector = this.source.subscribe((v, mods) => this.reloadImpl(v, mods), this.lastSrcMods);
    }
    lastDisconnect() {
        this.disconnector();
        this.srcValueDisconnector();
    }
    async dispose() {
        ++this.currentId;
        return super.dispose();
    }
    async forceReload() {
        await this.reloadImpl(this.source.get(), this.source.mods());
    }
    async reloadImpl(value, mods) {
        if (this.hasSubscriptions()) {
            this.srcValueDisconnector();
            this.srcValueDisconnector = this.srcValueConnector(value, this);
        }
        const id = ++this.currentId;
        this.lastSrcMods = mods;
        const nvalue = await this.transformer(value);
        if (id !== this.currentId)
            this.disposeValue(nvalue);
        else
            this.setOrDispose(nvalue);
    }
    actualize() {
        if (this.hasSubscriptions() && this.value !== TRANSFORM_PLACEHOLDER)
            return;
        if (this.lastSrcMods !== this.source.mods())
            this.forceReload();
    }
    mods() {
        this.actualize();
        return super.mods();
    }
    get() {
        this.actualize();
        return super.get();
    }
    depends(value) {
        return this.source === value || this.source.depends(value);
    }
    set(newValue) {
        if (this.value === TRANSFORM_PLACEHOLDER)
            this.value = newValue;
        else
            super.set(newValue);
    }
    setOrDispose(newValue) {
        if (this.value === TRANSFORM_PLACEHOLDER)
            this.value = newValue;
        else
            super.setOrDispose(newValue);
    }
    disposeValue(value) {
        if (value === TRANSFORM_PLACEHOLDER)
            return;
        super.disposeValue(value);
    }
}
export function transformedAsyncBuilder(builder) {
    return new TransformValueAsync(builder);
}
export async function transformedAsync(name, source, transformer, srcConnector = _ => nil()) {
    const value = await transformer(source.get());
    const mods = source.mods();
    return transformedAsyncBuilder({ name, source, transformer, srcConnector, initialValue: { value, mods } });
}
const TUPLE_PLACEHOLDER = [];
class Tuple extends BaseValue {
    sources;
    lastSrcMods;
    disconnectors = [];
    order;
    constructor(builder) {
        super({ ...builder, value: TUPLE_PLACEHOLDER });
        this.sources = builder.sources;
        this.order = builder.sources.toSorted((l, r) => l.depends(r) ? -1 : 1);
        this.lastSrcMods = new Array(builder.sources.length).fill(-1);
    }
    firstSubscribe() {
        this.actualize();
        this.disconnectors = iter(this.order)
            .enumerate()
            .map(([s, i]) => s.subscribe((v, mods) => this.actualize(true), this.lastSrcMods[i]))
            .collect();
    }
    actualize(forse = false) {
        if (!forse && this.hasSubscriptions() && this.value !== TUPLE_PLACEHOLDER)
            return;
        this.modImmer(draft => {
            iter(this.sources).enumerate()
                .forEach(([src, i]) => {
                const lastSrcMods = this.lastSrcMods[i];
                const srcMods = src.mods();
                if (srcMods !== lastSrcMods) {
                    draft[i] = src.get();
                    this.lastSrcMods[i] = srcMods;
                }
            });
        });
    }
    set(newValue) {
        if (this.value === TUPLE_PLACEHOLDER)
            this.value = newValue;
        else
            super.set(newValue);
    }
    setOrDispose(newValue) {
        if (this.value === TUPLE_PLACEHOLDER)
            this.value = newValue;
        else
            super.setOrDispose(newValue);
    }
    get() {
        this.actualize();
        return super.get();
    }
    mods() {
        this.actualize();
        return super.mods();
    }
    depends(value) {
        return iter(this.sources).any(s => s === value || s.depends(value));
    }
    lastDisconnect() { this.disconnectors.forEach(d => d()); }
}
export function tuple(...sources) {
    return new Tuple({ sources });
}
export const CONTAINERS = new Set();
export function createContainer(name, parent) {
    const values = new ValuesContainer(name, parent);
    CONTAINERS.add(values);
    values.addDisconnector(() => CONTAINERS.delete(values));
    return values;
}
function uniqueValues(tuple) {
    const set = new Set(tuple);
    return tuple.length === set.size;
}
function exactContent(tuple1, tuple2) {
    if (tuple1.length !== tuple2.length)
        return false;
    return tuple1.every(x => tuple2.includes(x));
}
function exactContentAndOrder(tuple1, tuple2) {
    if (tuple1.length !== tuple2.length)
        return false;
    return tuple1.every((x, i) => tuple2[i] === x);
}
export class ValuesContainer {
    name;
    parent;
    tupleCache = new Map();
    graph = new DirectionalGraph();
    children = new Map();
    constructor(name, parent) {
        this.name = name;
        this.parent = parent;
    }
    tuple(srcs) {
        if (!uniqueValues(srcs))
            throw new Error(`Duplicate sources`);
        const cached = iter(this.tupleCache.entries())
            .filter(([k, _]) => exactContentAndOrder(k, srcs))
            .map(second)
            .first();
        if (cached.isPresent())
            return cached.get();
        if (iter(this.tupleCache.keys()).any(t => exactContent(t, srcs)))
            throw new Error(`Tuple with different order already exist`);
        const result = srcs.length === 1 ? srcs[0] : tuple(...srcs);
        this.tupleCache.set(srcs, result);
        return result;
    }
    find(value) {
        return this.graph.nodes.has(value)
            ? Optional.of(value)
            : Optional.empty();
    }
    size() { return this.graph.nodes.size; }
    addDisconnector(disconnector) {
        this.addDisposable({ dispose: async () => disconnector() });
    }
    addDisposable(value) {
        this.graph.addNode(value);
        return value;
    }
    createChild(name) {
        const prevContainer = this.children.get(name);
        if (prevContainer !== undefined)
            prevContainer.dispose();
        const newContainer = createContainer(name, this);
        this.children.set(name, newContainer);
        return newContainer;
    }
    addSubscribed(value, cb) {
        const dispose = disposable(value.subscribe(cb));
        this.find(value).ifPresentOrElse(d => this.graph.add(dispose, d), () => this.addDisposable(dispose));
    }
    const(name, v, disposer) {
        return this.addDisposable(constSource(name, v, disposer));
    }
    value(name, v) {
        return this.addDisposable(value(name, v));
    }
    valueBuilder(builder) {
        return this.addDisposable(valueBuilder(builder));
    }
    proxyBuilder(builder) {
        return this.addDisposable(proxyBuilder(builder));
    }
    proxyAsyncBuilder(builder) {
        return this.addDisposable(proxyAsyncBuilder(builder));
    }
    transformedSelf(name, source, init, transformer, valueBuilder) {
        const srcDisposable = this.find(source);
        const value = this.addDisposable(transformedBuilder({ name, source, transformer, ...valueBuilder, value: init }));
        srcDisposable.ifPresent(d => this.graph.add(value, d));
        return value;
    }
    transformed(name, source, transformer, valueBuilder) {
        return this.transformedSelf(name, source, TRANSFORM_PLACEHOLDER, transformer, valueBuilder);
    }
    fields(name, source, ...fields) {
        const transformer = (s) => { const r = {}; fields.forEach(f => r[f] = s[f]); return r; };
        return this.transformed(name, source, transformer, { eq: objectEq });
    }
    field(name, source, field, valueBuilder) {
        const transformer = (s) => s[field];
        return this.transformed(name, source, transformer, valueBuilder);
    }
    transformedSelfTuple(name, srcs, init, transformer, valueBuilder) {
        const source = this.tuple(srcs);
        const srcDisposables = srcs.map(s => this.find(s));
        const value = this.addDisposable(transformedBuilder({ name, source, transformer, ...valueBuilder, value: init }));
        srcDisposables.forEach(d => d.ifPresent(d => this.graph.add(value, d)));
        return value;
    }
    transformedTuple(name, srcs, transformer, valueBuilder) {
        return this.transformedSelfTuple(name, srcs, TRANSFORM_PLACEHOLDER, transformer, valueBuilder);
    }
    transformedAsyncBuilder(builder) {
        const srcDisposable = this.find(builder.source);
        const value = this.addDisposable(transformedAsyncBuilder(builder));
        srcDisposable.ifPresent(d => this.graph.add(value, d));
        return value;
    }
    transformedAsyncTupleBuilder(builder) {
        const srcDisposable = this.find(builder.source);
        const value = this.addDisposable(transformedAsyncBuilder(builder));
        srcDisposable.ifPresent(d => this.graph.add(value, d));
        return value;
    }
    async transformedAsyncTuple(name, srcs, transformer, disposer, srcConnector = _ => nil()) {
        const source = this.tuple(srcs);
        const srcDisposables = srcs.map(s => this.find(s));
        const initialValue = { value: await transformer(source.get()), mods: source.mods() };
        const result = this.addDisposable(transformedAsyncBuilder({ name, source, transformer, initialValue, disposer, srcConnector }));
        srcDisposables.forEach(d => d.ifPresent(d => this.graph.add(result, d)));
        return result;
    }
    async transformedAsync(name, source, transformer, disposer, srcConnector = _ => nil()) {
        const srcDisposable = this.find(source);
        const initialValue = { value: await transformer(source.get()), mods: source.mods() };
        const result = this.addDisposable(transformedAsyncBuilder({ name, source, transformer, initialValue, disposer, srcConnector }));
        srcDisposable.ifPresent(d => this.graph.add(result, d));
        return result;
    }
    handle(srcs, handler) {
        const value = this.tuple(srcs);
        handler(value.get());
        return value.subscribe(handler);
    }
    handleStandalone(srcs, handler) {
        const dispose = disposable(this.handle(srcs, handler));
        srcs.map(s => this.find(s)).forEach(d => d.ifPresentOrElse(d => this.graph.add(dispose, d), () => this.addDisposable(dispose)));
    }
    signal() {
        const handlers = new Set();
        const subscribe = (handler) => { handlers.add(handler); return () => handlers.delete(handler); };
        const call = (...args) => handlers.forEach(h => h(args));
        this.addDisconnector(() => { if (handlers.size !== 0)
            throw new Error('Signal has subscriptions'); });
        return { subscribe, call };
    }
    initialize(init) {
        return result(() => init(this)).onErr(_ => this.dispose()).unwrap();
    }
    async initializeAsync(init) {
        return resultAsync(() => init(this)).then(r => r.onErr(_ => this.dispose()).unwrap());
    }
    async dispose() {
        const { promise, reject, resolve } = Promise.withResolvers();
        setTimeout(async () => {
            const result = await resultAsync(async () => {
                await iter(this.children.values()).forEach(c => c.dispose()).await_();
                await iter(this.graph.orderedAll()).forEach(d => d.dispose()).await_();
                this.graph.nodes.clear();
                this.tupleCache.clear();
            });
            result
                .onOk(resolve)
                .onErr(reject);
        });
        return promise;
    }
}
//# sourceMappingURL=callbacks.js.map