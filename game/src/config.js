// Pipe Runner - global configuration (single source of truth)
const CONFIG = {
    // Virtual layout size for menu screens; they are scaled to fit the real screen.
    width: 800,
    height: 600,

    // Isometric projection: half-size of a tile diamond in pixels, and pixels per unit of height
    tileHalfW: 32,
    tileHalfH: 16,
    zScale: 32,
    levelZ: 0.5, // z per terrain height level (16px)

    // Player physics, in tiles and seconds.
    // Jump peak v^2/2g = 0.9: clears one terrain level (0.5) but not two (1.0) - the generator relies on this.
    playerSpeed: 4.5,
    playerRadius: 0.25,
    jumpVelocity: 6,
    gravity: 20,
    stepTolerance: 0.02,
    maxHealth: 3,
    invulnerableMs: 1500,

    // Camera zoom limits; below minZoom the camera follows the player instead of showing the whole level.
    zoom: { min: 0.55, max: 2.2, refSize: 650 },

    scores: {
        coin: 100,
        stomp: 200,
        timeBonusPerSecond: 10,
        coinBonus: 50
    }
};

if (typeof module !== 'undefined') module.exports = { CONFIG };
