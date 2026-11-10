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

// 3. Levels: valid, and every core and the exit reachable from the start.
// Movement model (conservative vs. the real physics in config.js):
//   step down any height, jump up 1 level onto a neighbour,
//   jump across up to 2 tiles of lower terrain/pit landing no higher than you,
//   spring pads launch up to 4 tiles in a straight line onto anything solid (including wall tops).
const { LEVELS, parseLevel, TERRAIN_HEIGHT } = require('../src/levels.js');
const MAX_GAP = 2;
const SPRING_RANGE = 4;
LEVELS.forEach((def) => {
    let level;
    try {
        level = parseLevel(def);
    } catch (e) {
        return fail(e.message);
    }
    const { grid, start } = level;
    const h = (x, y) => {
        const t = grid[y] && grid[y][x];
        return t === undefined || t === ' ' ? -Infinity : TERRAIN_HEIGHT[t];
    };
    const key = (x, y) => `${x},${y}`;
    const seen = new Set([key(start.x, start.y)]);
    const queue = [start];
    const visit = (x, y) => {
        if (h(x, y) === -Infinity || seen.has(key(x, y))) return;
        seen.add(key(x, y));
        queue.push({ x, y });
    };
    while (queue.length) {
        const { x, y } = queue.shift();
        const here = h(x, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (h(x + dx, y + dy) <= here + 1) visit(x + dx, y + dy);
            for (let d = 2; d <= MAX_GAP + 1; d++) {
                if (h(x + dx * (d - 1), y + dy * (d - 1)) > here) break;
                if (h(x + dx * d, y + dy * d) <= here) visit(x + dx * d, y + dy * d);
            }
            if (grid[y][x] === '^') {
                for (let d = 1; d <= SPRING_RANGE; d++) visit(x + dx * d, y + dy * d);
            }
        }
    }
    const things = [...level.coins.map(c => ['core', c]), ['exit', level.exit], ...level.gears.map(g => ['gear', g])];
    things.forEach(([what, t]) => {
        if (!seen.has(key(t.x, t.y))) fail(`${level.name}: ${what} at ${t.x},${t.y} is unreachable`);
    });
    level.enemies.forEach(e => {
        if (grid[e.y][e.x] !== '.') return fail(`${level.name}: enemy at ${e.x},${e.y} must stand on plain floor`);
        if (e.type !== 'drone' && e.type !== 'blob') return;
        const [dx, dy] = e.type === 'drone' ? [1, 0] : [0, 1];
        const open = (x, y) => grid[y][x] === '.';
        if (!open(e.x + dx, e.y + dy) && !open(e.x - dx, e.y - dy)) fail(`${level.name}: ${e.type} at ${e.x},${e.y} has no room to patrol`);
    });
    if (!(def.par > 0 && def.par < def.time)) fail(`${level.name}: par must be between 0 and time`);
    console.log(`ok   ${level.name}: ${level.width}x${level.height}, ${level.coins.length} cores, ${level.gears.length} gears, ${level.enemies.length} enemies, ${seen.size} reachable tiles`);
});

if (failed) process.exit(1);
console.log('All checks passed');
