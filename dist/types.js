import Optional from "optional-js";
export class Err {
    error;
    constructor(error) {
        this.error = error;
    }
    onErr(consumer) { consumer(this.error); return this; }
    onOk(_) { return this; }
    unwrap() { throw this.error; }
    isOk() { return false; }
    isErr() { return true; }
    getOk() { throw this.error; }
    getErr() { return this.error; }
    map(_) { return this; }
    mapFlat(_) { return this; }
    async mapAsync(_) { return this; }
    async mapFlatAsync(_) { return this; }
    optional() { return Optional.empty(); }
}
export class Ok {
    ok;
    constructor(ok) {
        this.ok = ok;
    }
    onErr(_) { return this; }
    onOk(consumer) { consumer(this.ok); return this; }
    unwrap() { return this.ok; }
    isOk() { return true; }
    isErr() { return false; }
    getOk() { return this.ok; }
    getErr() { throw new Error(`Result is Ok`); }
    map(consumer) { return new Ok(consumer(this.ok)); }
    mapFlat(consumer) { return consumer(this.ok); }
    async mapAsync(consumer) { return new Ok(await consumer(this.ok)); }
    async mapFlatAsync(consumer) { return await consumer(this.ok); }
    optional() { return Optional.of(this.ok); }
}
export function toResult(opt) {
    return result(() => opt.get());
}
export function result(supplier) {
    try {
        return new Ok(supplier());
    }
    catch (e) {
        return new Err(e);
    }
}
export async function resultAsync(supplier) {
    try {
        return new Ok(await supplier());
    }
    catch (e) {
        return new Err(e);
    }
}
export async function unwrapOptionalPromise(opt) {
    return !opt.isPresent() ? Optional.empty() : Optional.of(await opt.get());
}
const truePredicate = (_) => true;
export function true_() {
    return truePredicate;
}
const falsePredicate = (_) => false;
export function false_() {
    return falsePredicate;
}
export function not(pred) {
    return (args) => !pred(args);
}
const nilConsumer = (v) => { };
export function nil() {
    return nilConsumer;
}
const identityTransformer = (x) => x;
export function identity() {
    return identityTransformer;
}
export function seq(...acts) {
    return () => { acts.forEach(a => a?.()); };
}
export function first(tuple) {
    return tuple[0];
}
export function firstArg() {
    return (first, _) => first;
}
export function secondArg() {
    return (_, second) => second;
}
export function second(tuple) {
    return tuple[1];
}
export function tuple(...t) {
    return [...t];
}
export function pair(t, u) {
    return tuple(t, u);
}
const eqImpl = (l, r) => l === r;
export function refEq() {
    return eqImpl;
}
export function left(value) {
    return { get: () => value, isLeft: () => true, left: () => value, right: () => { throw new Error(); } };
}
export function right(value) {
    return { get: () => value, isLeft: () => false, left: () => { throw new Error(); }, right: () => value };
}
export function notNull(value) {
    if (value === null)
        throw new Error();
    return value;
}
export function notUndefined(value) {
    if (value === undefined)
        throw new Error();
    return value;
}
export function notNullOrUndefined(value) {
    if (value === undefined || value === null)
        throw new Error();
    return value;
}
//# sourceMappingURL=types.js.map