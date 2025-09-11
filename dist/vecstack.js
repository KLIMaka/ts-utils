export class VecStack {
    stack;
    sp = 0;
    spStack = new Uint32Array(1024);
    ssp = 0;
    gp;
    one;
    zero;
    half;
    constructor(size) {
        this.stack = new Float32Array(size * 4);
        this.gp = (size - 1) * 4;
        this.one = this.pushGlobal(1, 1, 1, 1);
        this.zero = this.pushGlobal(0, 0, 0, 0);
        this.half = this.pushGlobal(0.5, 0.5, 0.5, 0.5);
    }
    allocate() { const id = this.sp; this.sp += 4; return id; }
    allocateGlobal() { const id = this.gp; this.gp -= 4; return id; }
    call(f, ...args) { this.begin(); return this.return(f(this, ...args)); }
    callScalar(f, ...args) { this.begin(); return this.x(this.return(f(this, ...args))); }
    begin() { this.spStack[this.ssp++] = this.sp; return this; }
    end() { this.sp = this.spStack[--this.ssp]; }
    return(id) { this.end(); return this.copy(this.allocate(), id); }
    push(x, y, z, w) { return this.set(this.allocate(), x, y, z, w); }
    pushScalar(x) { return this.set(this.allocate(), x, 0, 0, 0); }
    pushSpread(x) { return this.spread(this.allocate(), x); }
    spread(v, x) { return this.set(v, x, x, x, x); }
    pushGlobal(x, y, z, w) { return this.set(this.allocateGlobal(), x, y, z, w); }
    length(id) { return Math.hypot(this.stack[id], this.stack[id + 1], this.stack[id + 2], this.stack[id + 3]); }
    reflect(toPoint, normal) { return this.sub(toPoint, this.scale(normal, this.dot(toPoint, normal) * 2)); }
    sqrlength(id) { return this.dot(id, id); }
    dot(lh, rh) { return this.stack[lh] * this.stack[rh] + this.stack[lh + 1] * this.stack[rh + 1] + this.stack[lh + 2] * this.stack[rh + 2] + this.stack[lh + 3] * this.stack[rh + 3]; }
    distance(lh, rh) { return Math.hypot(this.stack[lh] - this.stack[rh], this.stack[lh + 1] - this.stack[rh + 1], this.stack[lh + 2] - this.stack[rh + 2], this.stack[lh + 3] - this.stack[rh + 3]); }
    sqrdistance(lh, rh) { return this.sqrlength(this.sub(lh, rh)); }
    normalize(id) { return this.scale(id, 1 / this.length(id)); }
    eqz(id) { return this.stack[id] === 0 && this.stack[id + 1] === 0 && this.stack[id + 2] === 0 && this.stack[id + 3] === 0; }
    x(ptr) { return this.stack[ptr]; }
    y(ptr) { return this.stack[ptr + 1]; }
    z(ptr) { return this.stack[ptr + 2]; }
    w(ptr) { return this.stack[ptr + 3]; }
    setx(ptr, v) { this.stack[ptr] = v; return this; }
    sety(ptr, v) { this.stack[ptr + 1] = v; return this; }
    setz(ptr, v) { this.stack[ptr + 2] = v; return this; }
    setw(ptr, v) { this.stack[ptr + 3] = v; return this; }
    copy(dst, src) {
        this.stack[dst] = this.stack[src];
        this.stack[dst + 1] = this.stack[src + 1];
        this.stack[dst + 2] = this.stack[src + 2];
        this.stack[dst + 3] = this.stack[src + 3];
        return dst;
    }
    set(id, x, y, z, w) {
        this.stack[id] = x;
        this.stack[id + 1] = y;
        this.stack[id + 2] = z;
        this.stack[id + 3] = w;
        return id;
    }
    add(lh, rh) {
        const result = this.allocate();
        this.stack[result] = this.stack[lh] + this.stack[rh];
        this.stack[result + 1] = this.stack[lh + 1] + this.stack[rh + 1];
        this.stack[result + 2] = this.stack[lh + 2] + this.stack[rh + 2];
        this.stack[result + 3] = this.stack[lh + 3] + this.stack[rh + 3];
        return result;
    }
    sub(lh, rh) {
        const result = this.allocate();
        this.stack[result] = this.stack[lh] - this.stack[rh];
        this.stack[result + 1] = this.stack[lh + 1] - this.stack[rh + 1];
        this.stack[result + 2] = this.stack[lh + 2] - this.stack[rh + 2];
        this.stack[result + 3] = this.stack[lh + 3] - this.stack[rh + 3];
        return result;
    }
    mul(lh, rh) {
        const result = this.allocate();
        this.stack[result] = this.stack[lh] * this.stack[rh];
        this.stack[result + 1] = this.stack[lh + 1] * this.stack[rh + 1];
        this.stack[result + 2] = this.stack[lh + 2] * this.stack[rh + 2];
        this.stack[result + 3] = this.stack[lh + 3] * this.stack[rh + 3];
        return result;
    }
    div(lh, rh) {
        const result = this.allocate();
        this.stack[result] = this.stack[lh] / this.stack[rh];
        this.stack[result + 1] = this.stack[lh + 1] / this.stack[rh + 1];
        this.stack[result + 2] = this.stack[lh + 2] / this.stack[rh + 2];
        this.stack[result + 3] = this.stack[lh + 3] / this.stack[rh + 3];
        return result;
    }
    scale(id, scale) {
        const result = this.allocate();
        this.stack[result] = this.stack[id] * scale;
        this.stack[result + 1] = this.stack[id + 1] * scale;
        this.stack[result + 2] = this.stack[id + 2] * scale;
        this.stack[result + 3] = this.stack[id + 3] * scale;
        return result;
    }
    lerp(lh, rh, t) {
        const result = this.allocate();
        const t1 = 1 - t;
        this.stack[result] = this.stack[rh] * t + this.stack[lh] * t1;
        this.stack[result + 1] = this.stack[rh + 1] * t + this.stack[lh + 1] * t1;
        this.stack[result + 2] = this.stack[rh + 2] * t + this.stack[lh + 2] * t1;
        this.stack[result + 3] = this.stack[rh + 3] * t + this.stack[lh + 3] * t1;
        return result;
    }
    apply(id, f) {
        return this.push(f(this.stack[id]), f(this.stack[id + 1]), f(this.stack[id + 2]), f(this.stack[id + 3]));
    }
    apply2(lh, rh, f) {
        return this.push(f(this.stack[lh], this.stack[rh]), f(this.stack[lh + 1], this.stack[rh + 1]), f(this.stack[lh + 2], this.stack[rh + 2]), f(this.stack[lh + 3], this.stack[rh + 3]));
    }
}
//# sourceMappingURL=vecstack.js.map