// Isometric helpers. Cartesian (x, y) are in tiles; z is height in tiles.
const IsoUtils = {
    cartToIso(x, y, z = 0) {
        return {
            x: (x - y) * CONFIG.tileHalfW,
            y: (x + y) * CONFIG.tileHalfH - z * CONFIG.zScale
        };
    },

    // Flat tiles live in a low band so every standing object draws above them.
    floorDepth(tileX, tileY) {
        return tileX + tileY;
    },

    // Blocks, actors and pickups are sorted together by distance from the back corner.
    actorDepth(x, y) {
        return 1000 + (x + y) * 10;
    },

    // Block textures are drawn with the top diamond at the top of the frame and `height`
    // levels of side wall below it (+8px slab). Returns the origin that puts ground level on the anchor.
    blockOriginY(height) {
        return (16 + height * CONFIG.zScale) / (40 + height * CONFIG.zScale);
    }
};
