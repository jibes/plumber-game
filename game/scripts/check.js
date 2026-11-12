#!/usr/bin/env node
// Static checks run in CI: JS syntax, script tags, physics assumptions, and that generated levels are completable.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
let failed = false;
const fail = (msg) => { console.error('FAIL ' + msg); failed = true; };

// 1. Syntax
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
for (const file of walk(path.join(root, 'src'))) {
    try {
        execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    } catch (e) {
        fail(`syntax ${path.relative(root, file)}\n${e.stderr}`);
    }
}

// 2. Every script referenced by index.html exists
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const [, src] of html.matchAll(/<script src="([^"]+)"/g)) {
    if (!fs.existsSync(path.join(root, src))) fail(`index.html references missing ${src} (run npm install for vendor/)`);
}

// 3. Physics assumptions the generator relies on: a jump clears one terrain level but not two.
const { CONFIG } = require('../src/config.js');
const peak = CONFIG.jumpVelocity ** 2 / (2 * CONFIG.gravity);
if (!(peak > CONFIG.levelZ + 0.2 && peak + CONFIG.stepTolerance < 2 * CONFIG.levelZ)) {
    fail(`jump peak ${peak.toFixed(2)} must clear 1 level (${CONFIG.levelZ}) but not 2`);
}

// 4. Generated levels: deterministic, and every core, the exit and every enemy are in the safe region,
//    which must be reachable from the start and able to return to it.
const { LevelGen } = require('../src/levels.js');
const SEEDS = 40, LEVELS = 40;
let count = 0;
for (let seed = 0; seed < SEEDS; seed++) {
    for (let n = 1; n <= LEVELS; n++) {
        const tag = `seed ${seed} level ${n}`;
        let level;
        try {
            level = LevelGen.generate(n, seed);
        } catch (e) {
            fail(`${tag}: ${e.message}`);
            continue;
        }
        if (LevelGen.toAscii(LevelGen.generate(n, seed)) !== LevelGen.toAscii(level)) fail(`${tag}: not deterministic`);
        const { grid, width: W, start } = level;
        const { safe } = LevelGen.safeRegion(grid, start);
        const inSafe = (p) => safe.has(p.y * W + p.x);
        [...level.coins, level.exit].forEach(p => { if (!inSafe(p)) fail(`${tag}: ${p.x},${p.y} unreachable`); });
        level.enemies.forEach(e => {
            if (!inSafe(e)) fail(`${tag}: enemy at ${e.x},${e.y} outside safe region`);
            const [dx, dy] = e.type === 'drone' ? [1, 0] : [0, 1];
            const h = grid[e.y][e.x];
            if (grid[e.y + dy][e.x + dx] !== h && grid[e.y - dy][e.x - dx] !== h) fail(`${tag}: ${e.type} has no room to patrol`);
        });
        for (const key of LevelGen.distances(grid, start.x, start.y).keys()) {
            if (!safe.has(key)) fail(`${tag}: one-way pocket at ${key % W},${Math.floor(key / W)}`);
        }
        count++;
    }
}
console.log(`ok   ${count} generated levels (${SEEDS} seeds x ${LEVELS} levels)`);
for (const n of [1, 5, 15]) {
    const l = LevelGen.generate(n, 1);
    console.log(`\nlevel ${n} "${l.name}" ${l.width}x${l.height}, ${l.coins.length} cores, ${l.enemies.length} enemies, ${l.time}s\n${LevelGen.toAscii(l)}`);
}

if (failed) process.exit(1);
console.log('All checks passed');
