// Pipe Runner - global configuration (single source of truth)
const CONFIG = {
    width: 800,
    height: 600,

    // Isometric projection: half-size of a tile diamond in pixels, and pixels per unit of height
    tileHalfW: 32,
    tileHalfH: 16,
    zScale: 32,

    // Player physics, in tiles and seconds
    playerSpeed: 4.5,
    playerRadius: 0.25,
    jumpVelocity: 6.5,
    gravity: 20,
    maxHealth: 3,
    invulnerableMs: 1500,

    scores: {
        coin: 100,
        stomp: 200,
        timeBonusPerSecond: 10,
        coinBonus: 50
    }
};
