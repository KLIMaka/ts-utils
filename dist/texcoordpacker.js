// Inspired by https://blackpawn.com/texts/lightmaps/default.html by blackpawn 
export class Rect {
    w;
    h;
    xoff;
    yoff;
    constructor(w, h, xoff = 0, yoff = 0) {
        this.w = w;
        this.h = h;
        this.xoff = xoff;
        this.yoff = yoff;
    }
}
export class Packer {
    width;
    height;
    wpad;
    hpad;
    xoff;
    yoff;
    p1;
    p2;
    sized = false;
    constructor(width, height, wpad = 0, hpad = 0, xoff = 0, yoff = 0) {
        this.width = width;
        this.height = height;
        this.wpad = wpad;
        this.hpad = hpad;
        this.xoff = xoff;
        this.yoff = yoff;
    }
    pack(w, h) {
        if (this.sized) {
            return this.p1?.pack(w, h) ?? this.p2?.pack(w, h);
        }
        else {
            const nw = w + this.wpad * 2;
            const nh = h + this.hpad * 2;
            const dw = this.width - nw;
            const dh = this.height - nh;
            if (dw < 0 || dh < 0)
                return undefined;
            else if (dw > dh)
                this.splitX(nw, nh);
            else
                this.splitY(nw, nh);
            const xoff = this.xoff + this.wpad;
            const yoff = this.yoff + this.hpad;
            this.sized = true;
            return { w, h, xoff, yoff };
        }
    }
    splitX(w, h) {
        if (this.width - w > 0)
            this.p1 = new Packer(this.width - w, this.height, this.wpad, this.hpad, this.xoff + w, this.yoff);
        if (this.height - h > 0)
            this.p2 = new Packer(w, this.height - h, this.wpad, this.hpad, this.xoff, this.yoff + h);
    }
    splitY(w, h) {
        if (this.width - w > 0)
            this.p1 = new Packer(this.width - w, h, this.wpad, this.hpad, this.xoff + w, this.yoff);
        if (this.height - h > 0)
            this.p2 = new Packer(this.width, this.height - h, this.wpad, this.hpad, this.xoff, this.yoff + h);
    }
}
//# sourceMappingURL=texcoordpacker.js.map