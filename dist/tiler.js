export class Tiler {
    tiles = new Map();
    put(x, y, tileId) {
        this.tiles.set(`${x},${y}`, tileId);
        return this;
    }
    get(x, y) {
        return this.tiles.get(`${x},${y}`);
    }
    size() {
        return this.tiles.size;
    }
    tile(cb) {
        for (const [key, tileId] of this.tiles.entries()) {
            const [x, y] = key.split(',').map(Number.parseFloat);
            cb(x, y, tileId);
        }
    }
}
//# sourceMappingURL=tiler.js.map