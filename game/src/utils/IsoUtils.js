// Isometric helpers. Cartesian (x, y) are in tiles; z is height in tiles.
const IsoUtils = {
    cartToIso(x, y, z = 0) {
        return {
            x: (x - y) * CONFIG.tileHalfW,
            y: (x + y) * CONFIG.tileHalfH - z * CONFIG.zScale
        };
    },

    // Ground-level floor tiles live in a low band so every standing object draws above them.
    floorDepth(tileX, tileY) {
        return tileX + tileY;
    },

    // Raised blocks, walls, actors and pickups sort by cell diagonal (tileX + tileY);
    // within one diagonal blocks (layer 2) draw before objects (layer 6).
    cellDepth(diagonal, layer) {
        return 1000 + diagonal * 10 + layer;
    }
};
