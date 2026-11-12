// SceneTitle - main menu

class SceneTitle extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneTitle' });
    }

    create() {
        UI.layout(this);
        const w = CONFIG.width;
        for (let x = 0; x < this.scale.width; x += 64) {
            for (let y = 0; y < this.scale.height; y += 64) {
                this.add.rectangle(x, y, 64, 64, (x + y) / 64 % 2 === 0 ? 0x111111 : 0x080808).setOrigin(0);
            }
        }

        UI.text(this, w / 2, 90, 'PIPE RUNNER', 56, '#00ffff');
        UI.text(this, w / 2, 150, 'An Endless Isometric Adventure', 24, '#00ff00');
        UI.text(this, w / 2, 215, 'Collect every Power Core to open the Portal', 18, '#ffffff');
        UI.text(this, w / 2, 245, 'Jump onto raised platforms and across pits', 18, '#00ffff');
        UI.text(this, w / 2, 275, 'Avoid Spark Drones & Leak Blobs - or jump on them', 18, '#ff5555');
        UI.text(this, w / 2, 305, 'Every level is new, and harder than the last', 18, '#ffaa00');

        const touch = this.sys.game.device.input.touch;
        UI.text(this, w / 2, 365, 'Controls', 20, '#ffff00');
        UI.text(this, w / 2, 400, 'Arrows / WASD - move    Space - jump    M - mute', 16, '#ffffff');
        if (touch) UI.text(this, w / 2, 430, 'Touch: drag left side to move, tap right side to jump', 16, '#ffffff');

        const best = UI.best();
        if (best.level > 0) UI.text(this, w / 2, 470, `Best: level ${best.level}, ${best.score} points`, 18, '#ff00ff');

        const start = UI.text(this, w / 2, 530, touch ? 'TAP TO START' : 'PRESS SPACE OR CLICK TO START', 24, '#00ff00');
        UI.blink(this, start);

        UI.onInput(this, ['SPACE', 'ENTER'], () => UI.leave(this, 'SceneGame', {
            level: 1, score: 0, seed: Math.floor(Math.random() * 1e9)
        }), 200);
    }
}
