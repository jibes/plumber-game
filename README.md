# Pipe Runner

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A small isometric platformer built with [Phaser 3](https://phaser.io/). All graphics are drawn on canvas and all sound is synthesised with the Web Audio API, so there are no asset files.

**Play:** https://jibes.github.io/plumber-game/ (deployed from `main`, see [DEPLOYMENT.md](DEPLOYMENT.md))

## Gameplay

You are **Rusty**, a maintenance robot on a leaking space station. There are 6 levels, unlocked one after another.

- Collect every **Power Core** to open the **Portal**. An arrow at the screen edge points to the next core, or to the open portal.
- **Stomp** enemies (land on them) or **dash** through them. Any other contact costs a heart.
- **Combo:** chain cores and kills within 2.5 s for up to ×5 points.
- **Stars per level:** finish the level, find the hidden **golden gear**, and beat the par time. Best scores and stars are saved in the browser.

| Thing | What it does |
|---|---|
| Crate | 1 high: jump on top. Walls are 2 high, and their tops are walkable too |
| Pit | Costs a heart; you respawn on the last safe tile |
| Spring pad | Launches you high enough to clear walls |
| Crumbling floor | Collapses half a second after you step on it and comes back 3 s later |
| Steam vent | Erupts in waves; don't stand on it when it fires |
| Repair kit | +1 heart |
| Spark Drone / Leak Blob | Patrol back and forth |
| Rust Bot | Chases you when you come close |
| Turret | Shoots orbs at you; jump over them or dash through them |

| Action | Keyboard | Touch | Gamepad |
|---|---|---|---|
| Move | Arrows / WASD (screen directions) | Drag on the left half | Left stick / D-pad |
| Jump (hold for height) | Space / J | Right half | A |
| Dash (one per jump) | Shift / X / K | DASH button | X / B |
| Pause | Esc / P | II button | Start |
| Mute | M | – | – |

Movement includes coyote time (you can still jump just after leaving a ledge), jump buffering and variable jump height.

## Development

Requires Node.js 18+.

```bash
cd game
npm install      # also copies Phaser into vendor/
npm start        # http://localhost:3000
npm test         # syntax check + level validation (run by CI)
npm run build    # -> build/web/
```

```
game/
├── index.html
├── scripts/check.js         # CI checks: JS syntax, script tags, level solvability
├── src/
│   ├── config.js            # all tunables (speeds, jump, scoring)
│   ├── levels.js            # ASCII level maps + parser
│   ├── audio.js             # synthesised SFX and music
│   ├── fx.js                # particles, score popups, afterimages
│   ├── progress.js          # localStorage save (stars, best scores, unlocks)
│   ├── boot.js              # Phaser game setup
│   ├── utils/IsoUtils.js    # projection and depth sorting
│   ├── game/                # Enemies (AI, turret orbs), Hazards (crumble, vents, springs)
│   └── scenes/              # Loader (procedural art), Title, LevelSelect, Game, LevelComplete, GameOver
└── cordova/                 # Android wrapper (www/ is generated)
```

### How it works

Game state lives in tile space: `(x, y)` on the grid plus height `z` (floor 0, crate 1, wall 2). Each frame, sprites are projected with `IsoUtils.cartToIso` and depth-sorted by `x + y`. Blocks that cover the player turn see-through. There is no physics engine:
- a tile blocks you when it is higher than your feet (circle-vs-grid test);
- gravity pulls you down to the surface under your centre;
- dropping below `pitDepth` is a fall.

All tunables are in `src/config.js`.

### Adding a level

Add an entry to `LEVELS` in `game/src/levels.js`. The full legend is at the top of that file:

```
.  floor   =  crate   #  wall   (space)  pit   ^  spring   ~  crumbling   V  vent
S  start   E  exit    C/c core  G/g gear  H/h repair kit   (lowercase = on a crate)
D  drone   B  blob    R  rust bot   T  turret
```

The border must be walls. `npm test` fails if any core, gear or the exit is unreachable. Its reachability model:
- jump up 1 level;
- jump gaps of up to 2 tiles onto ground no higher than the take-off;
- springs reach 4 tiles.

## License

MIT — see [LICENSE](LICENSE).
