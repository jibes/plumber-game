// Procedural level generator: endless, deterministic per (seed, level number), difficulty ramps with the level.
// Grid cells: PIT, WALL, or a floor height in levels (0..maxH). One level = CONFIG.levelZ tiles of z.
//
// Movement model used to validate levels (mirrors the player physics, conservatively):
//   step to a neighbour that is at most 1 level higher (needs a jump) or any amount lower,
//   jump across 1 pit tile onto a neighbour at most 1 level higher,
//   jump across 2 pit tiles onto a neighbour no higher than the take-off tile.
// Only the region that is reachable from the start AND can get back to it is kept walkable:
// one-way pockets are turned into pits so the player can never get soft-locked.
const LevelGen = (() => {
    const PIT = -1;
    const WALL = 99;
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const PLAYER_SPEED = 4.5; // tiles/s, matches CONFIG.playerSpeed

    const ADJ = ['Rusty', 'Leaky', 'Steamy', 'Flooded', 'Twisted', 'Humming', 'Scalding', 'Clogged', 'Echoing', 'Forgotten', 'Rattling', 'Frozen'];
    const NOUN = ['Junction', 'Boiler Room', 'Sump', 'Valve Hall', 'Cistern', 'Manifold', 'Drain', 'Pump Works', 'Overflow', 'Gasworks', 'Condenser', 'Pipe Maze'];

    function hash(...parts) {
        let h = 2166136261;
        for (const ch of parts.join('|')) {
            h ^= ch.charCodeAt(0);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function rng(seed) {
        let a = seed;
        return () => {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // All difficulty knobs in one place. t ramps 0 -> 1 over levels 1..16, then stays; a few knobs keep growing.
    function difficulty(n) {
        const t = Math.min(n - 1, 15) / 15;
        return {
            size: 10 + Math.round(t * 8),
            maxH: Math.min(1 + Math.floor(n / 2), 5),
            terraces: 0.7 + t,                     // per 45 tiles
            walls: 0.4 + 0.6 * t,                  // per 60 tiles
            chasms: n < 2 ? 0 : 1 + Math.floor(t * 3),
            chasmWidth: n < 4 ? 1 : n < 7 ? 2 : 3, // max width; width 3 always gets stepping pillars
            holes: 0.03 * t,
            cores: Math.min(3 + Math.floor(n / 2), 10),
            enemies: Math.min(1 + Math.floor((n - 1) * 0.8), 14),
            enemySpeed: 1 + Math.min(n - 1, 20) * 0.04,
            slack: 3.2 - 1.2 * t                   // time limit = slack x estimated route time
        };
    }

    function name(n, seed) {
        const r = rng(hash(seed, n, 'name'));
        return `${ADJ[Math.floor(r() * ADJ.length)]} ${NOUN[Math.floor(r() * NOUN.length)]}`;
    }

    // Moves out of a floor cell, per the model in the header comment.
    function moves(g, x, y) {
        const h = g[y][x];
        const out = [];
        for (const [dx, dy] of DIRS) {
            for (let k = 1; k <= 3; k++) {
                const nx = x + dx * k, ny = y + dy * k;
                const t = g[ny] && g[ny][nx];
                if (t === undefined || t === WALL) break;
                if (t === PIT) continue;
                const gap = k - 1;
                if (t <= h + (gap < 2 ? 1 : 0)) out.push({ x: nx, y: ny, cost: k });
                break;
            }
        }
        return out;
    }

    // BFS distances (in tiles travelled) from (sx, sy); returns Map key -> dist.
    function distances(g, sx, sy, allowed) {
        const W = g[0].length;
        const dist = new Map([[sy * W + sx, 0]]);
        const queue = [[sx, sy]];
        for (let i = 0; i < queue.length; i++) {
            const [x, y] = queue[i];
            const d = dist.get(y * W + x);
            for (const m of moves(g, x, y)) {
                const key = m.y * W + m.x;
                if (dist.has(key) || (allowed && !allowed.has(key))) continue;
                dist.set(key, d + m.cost);
                queue.push([m.x, m.y]);
            }
        }
        return dist;
    }

    // Cells reachable from start that can also return to start.
    function safeRegion(g, start) {
        const W = g[0].length;
        const forward = distances(g, start.x, start.y);
        const reverse = new Map();
        for (const key of forward.keys()) {
            const x = key % W, y = Math.floor(key / W);
            for (const m of moves(g, x, y)) {
                const to = m.y * W + m.x;
                if (!reverse.has(to)) reverse.set(to, []);
                reverse.get(to).push(key);
            }
        }
        const back = new Set([start.y * W + start.x]);
        const queue = [start.y * W + start.x];
        for (let i = 0; i < queue.length; i++) {
            for (const from of reverse.get(queue[i]) || []) {
                if (!back.has(from)) { back.add(from); queue.push(from); }
            }
        }
        return { forward, safe: back };
    }

    function build(n, seed, attempt) {
        const D = difficulty(n);
        const r = rng(hash(seed, n, attempt));
        const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
        const W = D.size + ri(-1, 1), H = D.size + ri(-1, 1);
        const inner = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
        const g = [];
        for (let y = 0; y < H; y++) g.push(Array.from({ length: W }, (_, x) => inner(x, y) ? 0 : WALL));

        // Terraces: overlapping rectangles each raise the floor by one level -> natural stairs and plateaus.
        const terraces = Math.round(W * H / 45 * D.terraces);
        for (let i = 0; i < terraces; i++) {
            const w = ri(2, 5), h = ri(2, 5), x0 = ri(1, W - 1 - w), y0 = ri(1, H - 1 - h);
            for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
                if (g[y][x] >= 0 && g[y][x] < D.maxH) g[y][x]++;
            }
        }

        // Chasms: pit bands across much of the map. Wide ones get stepping pillars to hop across.
        for (let i = 0; i < D.chasms; i++) {
            const horizontal = r() < 0.5;
            const len = horizontal ? W : H, across = horizontal ? H : W;
            const width = ri(1, D.chasmWidth);
            const pos = ri(2, across - 3 - width);
            const from = ri(1, 3), to = len - 1 - ri(1, 3);
            const pillars = width === 3 || (width === 2 && r() < 0.5);
            for (let a = from; a < to; a++) for (let b = pos; b < pos + width; b++) {
                const [x, y] = horizontal ? [a, b] : [b, a];
                if (g[y][x] !== WALL) g[y][x] = PIT;
            }
            if (pillars) {
                const mid = pos + Math.floor(width / 2);
                for (let a = from + ri(0, 2); a < to; a += ri(2, 4)) {
                    const [x, y] = horizontal ? [a, mid] : [mid, a];
                    g[y][x] = ri(0, Math.min(D.maxH, 3));
                }
            }
        }

        // Scattered holes.
        for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
            if (r() < D.holes) g[y][x] = PIT;
        }

        // Wall segments.
        const walls = Math.round(W * H / 60 * D.walls);
        for (let i = 0; i < walls; i++) {
            const [dx, dy] = DIRS[ri(0, 3)];
            let x = ri(2, W - 3), y = ri(2, H - 3);
            for (let k = ri(2, 5); k > 0 && inner(x, y); k--, x += dx, y += dy) g[y][x] = WALL;
        }

        // Start in a random corner, with a clear 3x3 pad at its height.
        const cx = r() < 0.5, cy = r() < 0.5;
        const start = { x: cx ? ri(1, 3) : W - 1 - ri(1, 3), y: cy ? ri(1, 3) : H - 1 - ri(1, 3) };
        const startH = Math.max(0, g[start.y][start.x] === WALL ? 0 : g[start.y][start.x]);
        for (let y = start.y - 1; y <= start.y + 1; y++) for (let x = start.x - 1; x <= start.x + 1; x++) {
            if (inner(x, y)) g[y][x] = startH;
        }

        // Turn one-way pockets into pits until the walkable region is closed under "can get back".
        let region;
        for (let pass = 0; pass < 6; pass++) {
            region = safeRegion(g, start);
            let changed = false;
            for (const key of region.forward.keys()) {
                if (!region.safe.has(key)) { g[Math.floor(key / W)][key % W] = PIT; changed = true; }
            }
            if (!changed) break;
            if (pass === 5) return null;
        }
        const safe = region.safe;
        if (safe.size < (W - 2) * (H - 2) * 0.45) return null;

        const at = (key) => ({ x: key % W, y: Math.floor(key / W) });
        const startKey = start.y * W + start.x;
        const fromStart = distances(g, start.x, start.y, safe);

        // Exit: one of the farthest safe cells.
        const byDist = [...fromStart.entries()].sort((a, b) => b[1] - a[1]);
        const far = byDist.slice(0, Math.max(1, Math.floor(byDist.length * 0.1)));
        const exit = at(far[ri(0, far.length - 1)][0]);
        const exitKey = exit.y * W + exit.x;

        // Cores: favour raised cells so the player has to climb. Kept apart from each other.
        const used = new Set([startKey, exitKey]);
        const apart = (p, list, d) => list.every(q => Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y)) >= d);
        const pick = (candidates, weight, accept) => {
            const pool = candidates.filter(k => !used.has(k)).map(k => ({ k, w: weight(k) }));
            for (let tries = 0; tries < 60 && pool.length; tries++) {
                let roll = r() * pool.reduce((s, p) => s + p.w, 0);
                const i = Math.max(0, pool.findIndex(p => (roll -= p.w) < 0));
                const { k } = pool[i];
                pool.splice(i, 1);
                if (accept(at(k), k)) { used.add(k); return at(k); }
            }
            return null;
        };
        const safeKeys = [...safe];
        const coins = [];
        for (let i = 0; i < D.cores; i++) {
            const c = pick(safeKeys, k => 1 + 2 * Math.min(g[Math.floor(k / W)][k % W], 2), (p) => apart(p, coins, 2));
            if (!c) return null;
            coins.push(c);
        }

        // Enemies: away from the start, with room to patrol along their axis at the same height.
        const enemies = [];
        for (let i = 0; i < D.enemies; i++) {
            const type = r() < 0.5 ? 'drone' : 'blob';
            const [dx, dy] = type === 'drone' ? [1, 0] : [0, 1];
            const e = pick(safeKeys, () => 1, (p, k) => {
                const h = g[p.y][p.x];
                return fromStart.get(k) >= 5 && apart(p, enemies, 2) &&
                    (g[p.y + dy][p.x + dx] === h || g[p.y - dy][p.x - dx] === h);
            });
            if (e) enemies.push({ ...e, type });
        }

        // Time limit: greedy nearest-neighbour route start -> cores -> exit, scaled by slack.
        let route = 0, pos = start;
        const left = [...coins];
        while (left.length) {
            const d = distances(g, pos.x, pos.y, safe);
            left.sort((a, b) => d.get(a.y * W + a.x) - d.get(b.y * W + b.x));
            route += d.get(left[0].y * W + left[0].x);
            pos = left.shift();
        }
        route += distances(g, pos.x, pos.y, safe).get(exitKey);
        const time = Math.ceil((15 + route / PLAYER_SPEED * D.slack) / 5) * 5;

        let maxH = 0;
        g.forEach(row => row.forEach(v => { if (v !== WALL && v > maxH) maxH = v; }));

        return {
            number: n, name: name(n, seed), seed, time, width: W, height: H, grid: g, maxH,
            start, exit, coins, enemies, safe, enemySpeed: D.enemySpeed
        };
    }

    function generate(n, seed) {
        for (let attempt = 0; attempt < 50; attempt++) {
            const level = build(n, seed, attempt);
            if (level) return level;
        }
        throw new Error(`could not generate level ${n} for seed ${seed}`);
    }

    // Debug view: '#' wall, ' ' pit, 0-9 floor height, S/E/C/D/B entities.
    function toAscii(level) {
        const rows = level.grid.map(row => row.map(v => v === WALL ? '#' : v === PIT ? ' ' : String(v)));
        level.coins.forEach(c => { rows[c.y][c.x] = 'C'; });
        level.enemies.forEach(e => { rows[e.y][e.x] = e.type === 'drone' ? 'D' : 'B'; });
        rows[level.start.y][level.start.x] = 'S';
        rows[level.exit.y][level.exit.x] = 'E';
        return rows.map(r => r.join('')).join('\n');
    }

    return { PIT, WALL, generate, name, difficulty, moves, distances, safeRegion, toAscii };
})();

if (typeof module !== 'undefined') module.exports = { LevelGen };
