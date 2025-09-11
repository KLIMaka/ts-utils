import { List } from "./list";
export class Place {
    offset;
    size;
    data;
    static of(offset, size) { return new Place(offset, size); }
    constructor(offset, size, data = null) {
        this.offset = offset;
        this.size = size;
        this.data = data;
    }
}
export class Bag {
    size;
    holes = new List();
    constructor(size) {
        this.size = size;
        this.reset();
    }
    getSuitablePlace(size) {
        for (let hole = this.holes.first(); hole !== this.holes.terminator(); hole = hole.next)
            if (hole.obj.size >= size)
                return hole;
        return null;
    }
    tryMerge(node) {
        if (node !== this.holes.terminator() && node.next !== this.holes.terminator()) {
            if (node.obj.offset + node.obj.size === node.next.obj.offset) {
                node.obj.size += node.next.obj.size;
                this.holes.remove(node.next);
                this.tryMerge(node);
            }
        }
    }
    put(offset, size) {
        let hole = this.holes.first();
        if (hole === this.holes.terminator()) {
            this.holes.insertAfter(Place.of(offset, size));
            return;
        }
        while (hole.next !== this.holes.terminator()) {
            const next = hole.next;
            if (next.obj.offset >= size + offset)
                break;
            hole = next;
        }
        const end = hole.obj.offset + hole.obj.size;
        if (hole.obj.offset > offset) {
            const newHole = this.holes.insertBefore(Place.of(offset, size), hole);
            this.tryMerge(newHole);
        }
        else if (end === offset) {
            hole.obj.size += size;
            this.tryMerge(hole);
        }
        else {
            const newHole = this.holes.insertAfter(Place.of(offset, size), hole);
            this.tryMerge(newHole);
        }
    }
    get(size) {
        const hole = this.getSuitablePlace(size);
        if (hole == null)
            return null;
        if (hole.obj.size === size) {
            const prev = hole.prev;
            this.holes.remove(hole);
            this.tryMerge(prev);
            return hole.obj.offset;
        }
        else {
            const off = hole.obj.offset;
            hole.obj.offset += size;
            hole.obj.size -= size;
            return off;
        }
    }
    reset() {
        this.holes.clear();
        this.holes.insertAfter(Place.of(0, this.size));
    }
    getHoles() { return [...this.holes]; }
    freeSpace(segments) {
        const results = new Array(segments).fill(1);
        const ds = this.size / segments;
        for (const hole of this.holes) {
            const hstart = hole.offset;
            const hend = hstart + hole.size;
            for (let i = (hstart / ds | 0); i <= (hend / ds | 0) && i < segments; i++) {
                const start = i * ds;
                const end = start + ds;
                const dl = Math.max(0, hstart - start);
                const dr = Math.max(0, end - hend);
                results[i] -= 1 - (dl + dr) / ds;
            }
        }
        return results;
    }
}
export class BagController {
    bag;
    places = new Map();
    // private updater: (place: Place, noffset: number) => void;
    constructor(size /*, updater: (place: Place, noffset: number) => void*/) {
        this.bag = new Bag(size);
        // this.updater = updater;
    }
    get(size) {
        const offset = this.bag.get(size);
        // if (offset == null) {
        //   this.optimize();
        //   offset = this.bag.get(size);
        // }
        if (offset == null)
            return null;
        const result = Place.of(offset, size);
        this.places.set(offset, result);
        return result;
    }
    put(place) {
        this.bag.put(place.offset, place.size);
        this.places.delete(place.offset);
    }
    // public optimize() {
    //   const places = this.places;
    //   this.places = new Map();
    //   this.bag.reset();
    //   let offset = 0;
    //   for (const [_, place] of places) {
    //     this.places[offset] = place;
    //     if (place.offset !== offset) {
    //       this.updater(place, offset);
    //       place.offset = offset;
    //     }
    //     offset += place.size;
    //   }
    //   this.bag.get(offset);
    // }
    freeSpace(segments) {
        return this.bag.freeSpace(segments);
    }
}
export function create(size) {
    return new Bag(size);
}
export function createController(size, updater) {
    return new BagController(size);
}
//# sourceMappingURL=bag.js.map