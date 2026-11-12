# Pipe Runner

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A small isometric platformer built with [Phaser 3](https://phaser.io/). All graphics are drawn on canvas and all sound is synthesised with the Web Audio API, so there are no asset files.

**Play:** https://jibes.github.io/plumber-game/ (deployed from `main`, see [DEPLOYMENT.md](DEPLOYMENT.md))

## Gameplay

You are **Rusty**, a maintenance robot on a leaking space station.

- Collect every **Power Core** — the **Portal** only opens once all are collected.
- **Spark Drones** and **Leak Blobs** cost a life on contact; land on them from a jump to destroy them.
- **Raised platforms**: a jump climbs one height step; dropping down is free. Cores favour high ground.
- **Pits** cost a life and respawn you on the last safe tile. Jumps clear gaps up to 2 tiles.
- 3 lives and a time limit per level. **Endless**: every level is generated and harder than the last.
- The view fills any screen size/orientation; small levels are shown whole, large ones follow you.

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
npm test         # syntax, physics and generated-level validation (run by CI)
npm run build    # -> build/web/
```

```
game/
├── index.html
├── scripts/check.js         # CI checks: JS syntax, script tags, level solvability
├── src/
│   ├── config.js            # all tunables (speeds, jump, scoring)
│   ├── levels.js            # procedural level generator + solvability model
│   ├── blocks.js            # textures for raised terrain and walls
│   ├── audio.js             # synthesised SFX and music
│   ├── boot.js              # Phaser game setup
│   ├── utils/IsoUtils.js    # projection and depth sorting
│   └── scenes/              # Loader (procedural art), Title, Game, LevelComplete, GameOver
└── cordova/                 # Android wrapper (www/ is generated)
```

### How it works

Game state lives in tile space: `(x, y)` on the grid plus height `z`. Each cell is a pit, a wall, or floor at a height level (1 level = 0.5 z). Anything above the player's feet blocks movement; the ground is the highest surface under the player's footprint. Sprites are projected with `IsoUtils.cartToIso` and depth-sorted by cell diagonal, after every cell the actor stands on or above. World and HUD use separate cameras, so the world can zoom to fit the screen.

### Level generation

`LevelGen.generate(level, seed)` is deterministic: a run picks a random seed, retries replay the same level. All difficulty knobs (size, max height, terraces, chasms with stepping pillars, holes, walls, cores, enemies and their speed, time slack) are in `difficulty()` in `game/src/levels.js` and ramp up to level 16; enemy speed keeps rising to level 21.

Validation uses a movement model matching the physics (climb ≤1 level, jump 1 pit gap onto ≤+1, 2 pit gaps onto ≤ same height). Cells reachable from the start that can't get back are turned into pits, so the player can't soft-lock; cores, exit and enemies are placed only in the remaining region. `npm test` checks 1600 generated levels and that the jump height clears one level but not two.

## License

MIT — see [LICENSE](LICENSE).
