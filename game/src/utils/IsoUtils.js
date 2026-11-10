// Isometric helpers. Cartesian (x, y) are in tiles; z is height in tiles.
const IsoUtils = {
    cartToIso(x, y, z = 0) {
        return {
            x: (x - y) * CONFIG.tileHalfW,
            y: (x + y) * CONFIG.tileHalfH - z * CONFIG.zScale
        };
    },

    // Floor tiles live in a low band so every standing object draws above them.
    floorDepth(tileX, tileY) {
        return tileX + tileY;
    },

    // Walls, actors and pickups are sorted together by distance from the back corner.
    actorDepth(x, y) {
        return 1000 + (x + y) * 10;
    }
};
