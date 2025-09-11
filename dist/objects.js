import Optional from "optional-js";
import { cyclic } from "./mathutils";
import { iter } from "./iter";
export class LazyValue {
    initializer;
    initialized = false;
    value;
    constructor(initializer) {
        this.initializer = initializer;
    }
    get() {
        if (!this.initialized) {
            this.value = this.initializer();
            this.initialized = true;
        }
        return this.value;
    }
}
export class Toggler {
    onValue;
    offValue;
    value;
    constructor(onValue, offValue, value = false) {
        this.onValue = onValue;
        this.offValue = offValue;
        this.value = value;
    }
    toggle() { this.value = !this.value; }
    get() { return this.value ? this.onValue : this.offValue; }
    set(value) { this.value = value; }
}
export function toggler(onValue, offValue, value = false) {
    return new Toggler(onValue, offValue, value);
}
export class CyclicToggler {
    values;
    index;
    constructor(values, index = 0) {
        this.values = values;
        this.index = index;
    }
    toggleNext() { this.index = cyclic(this.index + 1, this.values.length); return this.get(); }
    togglePrev() { this.index = cyclic(this.index - 1, this.values.length); return this.get(); }
    get() { return this.values[this.index]; }
    set(value) {
        const idx = this.values.indexOf(value);
        if (idx !== -1)
            this.index = idx;
        return value;
    }
}
export function cyclicToggler(values, currentValue) {
    const toggler = new CyclicToggler(values);
    toggler.set(currentValue);
    return toggler;
}
export function promisify(f) {
    return async () => f();
}
export function firstNot(t1, t2, ref) {
    return t1 !== ref ? Optional.of(t1) : t2 !== ref ? Optional.of(t2) : Optional.empty();
}
export function firstNotNull(t1, t2) {
    return firstNot(t1, t2, null);
}
export function objectKeys(obj) {
    return Object.keys(obj);
}
export function applyDefaults(value, def) {
    return { ...def, ...value };
}
export function applyNotNullish(value, f) {
    if (value != null)
        f(value);
}
export function applyNotNullishOr(value, f, supplier) {
    return value != null ? f(value) : supplier();
}
export function field(field) {
    return x => x[field];
}
export function andOptional(...opts) {
    if (opts.find(o => !o.isPresent()) !== undefined)
        return Optional.empty();
    return Optional.of(opts.map(o => o.get()));
}
export async function asyncMapOptional(src, mapper) {
    if (!src.isPresent())
        return Optional.empty();
    return Optional.of(await mapper(src.get()));
}
export async function asyncOptional(src) {
    if (!src.isPresent())
        return Optional.empty();
    return Optional.of(await src.get());
}
export function zipOptional(l, r) {
    return l.flatMap(l => r.map(r => [l, r]));
}
export async function asyncFlatMapOptional(src, mapper) {
    if (!src.isPresent())
        return Optional.empty();
    return await mapper(src.get());
}
export function strcmpci(str1, str2) {
    return str1.toLowerCase() === str2.toLowerCase();
}
export function checkNotNull(value, message) {
    if (value === null)
        throw new Error(message);
    return value;
}
export class UniqueIds {
    ids = new Set();
    getEmpty() {
        if (this.ids.size === 0)
            return 0;
        let id = 0;
        for (;;) {
            const currentId = id;
            if (!iter(this.ids.values()).first(id => id === currentId).isPresent())
                return currentId;
            id++;
        }
    }
    get() {
        const value = this.getEmpty();
        this.ids.add(value);
        const dispose = async () => { this.ids.delete(value); };
        return { value, dispose };
    }
}
//# sourceMappingURL=objects.js.map