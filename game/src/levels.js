// Level maps.
//
// Terrain                          Things (stand on floor unless noted)
//   .  floor                         S  start          E  exit portal
//   =  crate (1 high, climbable)     C  power core     c  power core on a crate
//   #  wall  (2 high)                G  golden gear    g  golden gear on a crate
//   (space) pit                      H  repair kit     h  repair kit on a crate
//   ^  spring pad                    D  spark drone (patrols along x)
//   ~  crumbling floor               B  leak blob   (patrols along y)
//   V  steam vent                    R  rust bot    (chases you)
//                                    T  turret      (shoots at you)
//
// Collect every core to open the portal. The gear is an optional secret (one star).
// `par` is the target completion time in seconds (one star).
// Hint tokens {move} {jump} {dash} are replaced with keyboard or touch wording.
const LEVELS = [
    {
        name: 'Boiler Room',
        time: 90,
        par: 40,
        hints: ['{move} to move, {jump} to jump', 'Grab every Power Core to open the portal'],
        map: [
            '############',
            '#S...C.....#',
            '#..........#',
            '#..##...C..#',
            '#..##......#',
            '#....D.....#',
            '#C.........#',
            '#....  ..==#',
            '#....  ..Cg#',
            '#..........#',
            '#.......C.E#',
            '############'
        ]
    },
    {
        name: 'Crate Stacks',
        time: 90,
        par: 45,
        hints: ['Crates are climbable - jump on top', '{dash} dashes, even in mid-air. Dash through enemies!'],
        map: [
            '############',
            '#S..=......#',
            '#...=..B...#',
            '#.C.=......#',
            '#====..=c=.#',
            '#......===.#',
            '#..C.......#',
            '#.==....D..#',
            '#.=g.....C.#',
            '#.==..  ...#',
            '#H....  .CE#',
            '############'
        ]
    },
    {
        name: 'Leaky Junction',
        time: 100,
        par: 55,
        hints: ['Spring pads launch you over walls', 'Rust Bots chase you - stomp or dash them'],
        map: [
            '##############',
            '#S...#...#..C#',
            '#....#..^#...#',
            '#..C.#.B.#^.g#',
            '#....#...#####',
            '#....#.......#',
            '#            #',
            '#.....D......#',
            '#.C......==..#',
            '#....R...=c..#',
            '#.##.........#',
            '#.##..C...#..#',
            '#H........#.E#',
            '##############'
        ]
    },
    {
        name: 'Crumbling Catwalk',
        time: 110,
        par: 60,
        hints: ['Cracked floor crumbles - keep moving!', 'Turrets shoot orbs - jump over them'],
        map: [
            '##############',
            '#S..#....C..T#',
            '#...#........#',
            '#...~~~~~~...#',
            '#.C.#....D...#',
            '#####........#',
            '#      ~     #',
            '#      ~     #',
            '#..~~~~~~~~..#',
            '#..~..=g...~.#',
            '#C.~ ==  H ~.#',
            '#..~~~~~~~~~C#',
            '#..........E.#',
            '##############'
        ]
    },
    {
        name: 'Steam Works',
        time: 150,
        par: 80,
        hints: ['Steam vents erupt in waves - watch the rhythm', 'Wall tops are walkable, if you can get up there'],
        map: [
            '################',
            '#S....V....=..C#',
            '#.....V....=...#',
            '#..C..V..T.=...#',
            '#VVVVVV....=...#',
            '#..........====#',
            '#.=====..R.....#',
            '#.=c..=........#',
            '#.=...=..VVV...#',
            '#.==.==..VHV.C.#',
            '#........VVV...#',
            '#..T..........##',
            '#C....B...=g=..#',
            '#..........===E#',
            '################'
        ]
    },
    {
        name: 'Pressure Zone',
        time: 180,
        par: 110,
        hints: ['Everything at once. Good luck, Rusty!'],
        map: [
            '################',
            '#S..#.....~~~.C#',
            '#...#..D..~ ~..#',
            '#.C.^.....~~~..#',
            '#####..==......#',
            '#   #..=g..T...#',
            '# C #..==......#',
            '#   #......VVV.#',
            '#.^.#####..VCV.#',
            '#...~~~~~..VVV.#',
            '#...#   ~.....H#',
            '#.R.#   ~..=c=.#',
            '#...#   ~..===.#',
            '#.B.~~~~~.....##',
            '#.......T....E.#',
            '################'
        ]
    }
];

const TERRAIN_HEIGHT = { '#': 2, '=': 1, '.': 0, '^': 0, '~': 0, 'V': 0 };

// Parses and validates a level. The returned grid holds terrain only (see TERRAIN_HEIGHT, ' ' = pit).
function parseLevel(level) {
    const rows = level.map;
    const width = rows[0].length;
    const p = {
        name: level.name, time: level.time, par: level.par, hints: level.hints || [],
        width, height: rows.length, grid: [],
        start: null, exit: null, coins: [], gears: [], kits: [], enemies: []
    };
    const item = (list, x, y, z) => list.push({ x, y, z });
    const ENEMIES = { D: 'drone', B: 'blob', R: 'rustbot', T: 'turret' };

    rows.forEach((row, y) => {
        if (row.length !== width) throw new Error(`${level.name}: row ${y} has length ${row.length}, expected ${width}`);
        p.grid.push([...row].map((ch, x) => {
            const border = x === 0 || y === 0 || x === width - 1 || y === rows.length - 1;
            if (border && ch !== '#') throw new Error(`${level.name}: border at ${x},${y} must be a wall`);
            if (ch in TERRAIN_HEIGHT || ch === ' ') return ch;
            if (ch === 'S' || ch === 'E') {
                const key = ch === 'S' ? 'start' : 'exit';
                if (p[key]) throw new Error(`${level.name}: more than one '${ch}'`);
                p[key] = { x, y };
            } else if (ch === 'C' || ch === 'c') item(p.coins, x, y, ch === 'c' ? 1 : 0);
            else if (ch === 'G' || ch === 'g') item(p.gears, x, y, ch === 'g' ? 1 : 0);
            else if (ch === 'H' || ch === 'h') item(p.kits, x, y, ch === 'h' ? 1 : 0);
            else if (ENEMIES[ch]) p.enemies.push({ x, y, type: ENEMIES[ch] });
            else throw new Error(`${level.name}: unknown tile '${ch}' at ${x},${y}`);
            return ch === ch.toLowerCase() ? '=' : '.';
        }));
    });

    if (!p.start || !p.exit) throw new Error(`${level.name}: needs exactly one S and one E`);
    if (p.coins.length === 0) throw new Error(`${level.name}: needs at least one core`);
    return p;
}

if (typeof module !== 'undefined') module.exports = { LEVELS, parseLevel, TERRAIN_HEIGHT };
