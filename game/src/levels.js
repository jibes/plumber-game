// Level maps. Legend:
//   #  wall (blocks movement)      .  floor
//   (space) pit - falling in costs a life, jump over it
//   S  player start   E  exit portal   C  power core
//   D  spark drone (patrols along x)   B  leak blob (patrols along y)
const LEVELS = [
    {
        name: 'Boiler Room',
        time: 90,
        map: [
            '############',
            '#S...C.....#',
            '#..........#',
            '#..##...C..#',
            '#..##......#',
            '#....D.....#',
            '#C.........#',
            '#....  ....#',
            '#....  ..C.#',
            '#..........#',
            '#.......C.E#',
            '############'
        ]
    },
    {
        name: 'Leaky Junction',
        time: 100,
        map: [
            '############',
            '#S...#....C#',
            '#....#.....#',
            '#..C.#..B..#',
            '#..........#',
            '#          #',
            '#.....D....#',
            '#.C........#',
            '#....##..C.#',
            '#....##....#',
            '#C........E#',
            '############'
        ]
    },
    {
        name: 'Pressure Zone',
        time: 120,
        map: [
            '##############',
            '#S.....#....C#',
            '#......#.....#',
            '#..##..#..D..#',
            '#..##........#',
            '#            #',
            '#            #',
            '#C...........#',
            '#....####....#',
            '#..C.#..#.CB.#',
            '#....#E.#....#',
            '#....#.C#....#',
            '#..D.........#',
            '##############'
        ]
    }
];

// Parses and validates a level. Terrain grid holds only '#', '.' and ' '.
function parseLevel(level) {
    const rows = level.map;
    const width = rows[0].length;
    const grid = [];
    const parsed = { name: level.name, time: level.time, width, height: rows.length, grid, coins: [], enemies: [], start: null, exit: null };

    rows.forEach((row, y) => {
        if (row.length !== width) throw new Error(`${level.name}: row ${y} has length ${row.length}, expected ${width}`);
        grid.push([]);
        [...row].forEach((ch, x) => {
            const border = x === 0 || y === 0 || x === width - 1 || y === rows.length - 1;
            if (border && ch !== '#') throw new Error(`${level.name}: border at ${x},${y} must be a wall`);
            switch (ch) {
                case '#': case '.': case ' ': break;
                case 'S': if (parsed.start) throw new Error(`${level.name}: multiple starts`); parsed.start = { x, y }; break;
                case 'E': if (parsed.exit) throw new Error(`${level.name}: multiple exits`); parsed.exit = { x, y }; break;
                case 'C': parsed.coins.push({ x, y }); break;
                case 'D': parsed.enemies.push({ x, y, type: 'drone' }); break;
                case 'B': parsed.enemies.push({ x, y, type: 'blob' }); break;
                default: throw new Error(`${level.name}: unknown tile '${ch}' at ${x},${y}`);
            }
            grid[y].push(ch === '#' || ch === ' ' ? ch : '.');
        });
    });

    if (!parsed.start || !parsed.exit) throw new Error(`${level.name}: needs exactly one S and one E`);
    if (parsed.coins.length === 0) throw new Error(`${level.name}: needs at least one C`);
    return parsed;
}

if (typeof module !== 'undefined') module.exports = { LEVELS, parseLevel };
