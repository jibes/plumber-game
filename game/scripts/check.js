#!/usr/bin/env node
// Static checks run in CI: JS syntax of every source file, and that every level is valid and completable.
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

// 3. Levels: valid, and start can reach every core and the exit by walking or jumping up to 2 pit tiles
const { LEVELS, parseLevel } = require('../src/levels.js');
const MAX_JUMP_GAP = 2;
LEVELS.forEach((def) => {
    let level;
    try {
        level = parseLevel(def);
    } catch (e) {
        return fail(e.message);
    }
    const { grid, start } = level;
    const key = (x, y) => `${x},${y}`;
    const floor = (x, y) => grid[y] && grid[y][x] === '.';
    const seen = new Set([key(start.x, start.y)]);
    const queue = [start];
    while (queue.length) {
        const { x, y } = queue.shift();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            for (let gap = 0; gap <= MAX_JUMP_GAP; gap++) {
                const between = [...Array(gap)].map((_, i) => grid[y + dy * (i + 1)][x + dx * (i + 1)]);
                if (!between.every(t => t === ' ')) break;
                const nx = x + dx * (gap + 1), ny = y + dy * (gap + 1);
                if (floor(nx, ny) && !seen.has(key(nx, ny))) {
                    seen.add(key(nx, ny));
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }
    [...level.coins, level.exit].forEach(t => {
        if (!seen.has(key(t.x, t.y))) fail(`${level.name}: tile ${t.x},${t.y} is unreachable`);
    });
    level.enemies.forEach(e => {
        if (!floor(e.x, e.y)) return fail(`${level.name}: enemy at ${e.x},${e.y} not on floor`);
        const [dx, dy] = e.type === 'drone' ? [1, 0] : [0, 1];
        if (!floor(e.x + dx, e.y + dy) && !floor(e.x - dx, e.y - dy)) fail(`${level.name}: ${e.type} at ${e.x},${e.y} has no room to patrol`);
    });
    console.log(`ok   ${level.name}: ${level.width}x${level.height}, ${level.coins.length} cores, ${level.enemies.length} enemies`);
});

if (failed) process.exit(1);
console.log('All checks passed');
