// Pipe Runner - global configuration (single source of truth)
const CONFIG = {
    width: 800,
    height: 600,

    // Isometric projection: half-size of a tile diamond in pixels, and pixels per unit of height
    tileHalfW: 32,
    tileHalfH: 16,
    zScale: 32,

    // Player movement, in tiles and seconds
    playerSpeed: 4.5,
    playerAccel: 14,          // velocity smoothing factor; higher = snappier
    playerRadius: 0.25,
    jumpVelocity: 7,
    jumpCutVelocity: 2.5,     // releasing jump early caps upward speed at this
    springVelocity: 11,
    gravity: 20,
    coyoteTime: 0.1,          // can still jump this long after walking off an edge
    jumpBuffer: 0.12,         // a jump pressed this long before landing still counts
    dashSpeed: 13,
    dashTime: 0.16,
    dashCooldown: 0.3,
    pitDepth: -1.2,           // z below which a fall counts as lost

    maxHealth: 3,
    invulnerableMs: 1500,

    comboWindow: 2.5,         // seconds to chain the next pickup/kill
    maxCombo: 5,

    scores: {
        coin: 100,
        kill: 200,
        gear: 500,
        kit: 250,             // when health is already full
        timeBonusPerSecond: 10,
        noDamageBonus: 500
    }
};
