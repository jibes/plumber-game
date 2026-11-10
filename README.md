# Pipe Runner

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A small isometric platformer built with [Phaser 3](https://phaser.io/). All graphics are drawn on canvas and all sound is synthesised with the Web Audio API, so there are no asset files.

**Play:** https://jibes.github.io/plumber-game/ (deployed from `main`, see [DEPLOYMENT.md](DEPLOYMENT.md))

## Gameplay

You are **Rusty**, a maintenance robot on a leaking space station.

- Collect every **Power Core** — the **Portal** only opens once all are collected.
- **Spark Drones** and **Leak Blobs** cost a life on contact; land on them from a jump to destroy them.
- **Pits** cost a life and respawn you on the last safe tile. Jumps clear gaps up to 2 tiles.
- 3 lives and a time limit per level. 3 levels.

| Action | Keyboard | Touch |
|---|---|---|
| Move | Arrows / WASD (screen directions) | Drag on the left half |
| Jump | Space | Tap the right half |
| Mute | M | – |
| Quit to menu | Esc | – |

Scoring: core 100, stomp 200, level bonus = 10 × seconds left + 50 × cores. Retrying after game over restarts the level with the score you had when entering it.

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
│   ├── boot.js              # Phaser game setup
│   ├── utils/IsoUtils.js    # projection and depth sorting
│   └── scenes/              # Loader (procedural art), Title, Game, LevelComplete, GameOver
└── cordova/                 # Android wrapper (www/ is generated)
```

### How it works

Game state lives in tile space: `(x, y)` on the grid plus height `z`. Each frame, sprites are projected with `IsoUtils.cartToIso` and depth-sorted by `x + y`. There is no physics engine. Walls block movement with a circle-vs-grid test. Jumping is a simple vertical velocity with gravity, and falling is checked against the tile under the player's centre.

### Adding a level

Add an entry to `LEVELS` in `game/src/levels.js`:

```
#  wall          .  floor        (space)  pit
S  start         E  exit portal  C  power core
D  drone (patrols along x)       B  blob (patrols along y)
```

The border must be walls. `npm test` fails if any core or the exit can't be reached by walking or by jumping gaps of up to 2 tiles.

## License

MIT — see [LICENSE](LICENSE).
