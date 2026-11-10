// SceneLevelSelect - pick any unlocked level; shows stars and best scores

class SceneLevelSelect extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneLevelSelect' });
    }

    create() {
        const w = CONFIG.width;
        UI.backdrop(this);
        this.cameras.main.fadeIn(250);
        this.progress = Progress.load();
        this.selected = Math.min(this.progress.unlocked, LEVELS.length) - 1;

        UI.text(this, w / 2, 60, 'SELECT LEVEL', 40, '#00ffff');
        UI.text(this, w / 2, 100, `★ ${Progress.totalStars()} / ${LEVELS.length * 3}`, 20, '#ffd700');

        this.cards = LEVELS.map((level, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const x = w / 2 + (col - 1) * 240, y = 230 + row * 190;
            const unlocked = i < this.progress.unlocked;
            const saved = this.progress.levels[i + 1] || { stars: 0, best: 0 };
            const box = this.add.rectangle(x, y, 210, 160, 0x111122, 0.9).setStrokeStyle(3, 0x334466);
            UI.text(this, x, y - 50, unlocked ? `${i + 1}` : 'LOCKED', unlocked ? 34 : 20, unlocked ? '#ffffff' : '#555555');
            UI.text(this, x, y - 12, level.name, 15, unlocked ? '#00ff00' : '#555555');
            if (unlocked) {
                UI.stars(this, x, y + 25, saved.stars, 3, 0.55);
                UI.text(this, x, y + 58, saved.best ? `BEST ${saved.best}` : 'NEW', 13, '#aaaaaa', false);
            }
            box.setInteractive().on('pointerdown', () => {
                if (!unlocked) return;
                if (this.selected === i) this.play();
                else this.select(i);
            });
            return { box, unlocked };
        });
        this.select(this.selected, true);

        const touch = this.sys.game.device.input.touch;
        UI.text(this, w / 2, 560, touch ? 'Tap a level twice to play' : 'Arrows choose · Space play · Esc back', 15, '#888888', false);

        this.leaving = false;
        const move = (d) => {
            const next = Phaser.Math.Clamp(this.selected + d, 0, LEVELS.length - 1);
            if (this.cards[next].unlocked) this.select(next);
        };
        this.input.keyboard.on('keydown-LEFT', () => move(-1));
        this.input.keyboard.on('keydown-RIGHT', () => move(1));
        this.input.keyboard.on('keydown-UP', () => move(-3));
        this.input.keyboard.on('keydown-DOWN', () => move(3));
        this.input.keyboard.on('keydown-A', () => move(-1));
        this.input.keyboard.on('keydown-D', () => move(1));
        this.input.keyboard.on('keydown-W', () => move(-3));
        this.input.keyboard.on('keydown-S', () => move(3));
        this.time.delayedCall(200, () => {
            this.input.keyboard.on('keydown-SPACE', () => this.play());
            this.input.keyboard.on('keydown-ENTER', () => this.play());
        });
        this.input.keyboard.on('keydown-ESC', () => UI.leave(this, 'SceneTitle'));
        if (this.input.gamepad) {
            this.input.gamepad.on('down', (pad, button) => {
                const actions = { 0: () => this.play(), 1: () => UI.leave(this, 'SceneTitle'), 14: () => move(-1), 15: () => move(1), 12: () => move(-3), 13: () => move(3) };
                if (actions[button.index]) actions[button.index]();
            });
        }
    }

    select(i, silent = false) {
        this.selected = i;
        this.cards.forEach((c, j) => c.box.setStrokeStyle(3, j === i ? 0x00ffff : 0x334466).setFillStyle(j === i ? 0x1a2a44 : 0x111122, 0.9));
        if (!silent) Sfx.play('select');
    }

    play() {
        UI.leave(this, 'SceneGame', { level: this.selected + 1 });
    }
}
