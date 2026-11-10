// SceneTitle - main menu

class SceneTitle extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneTitle' });
    }

    create() {
        const w = CONFIG.width;
        for (let x = 0; x < w; x += 64) {
            for (let y = 0; y < CONFIG.height; y += 64) {
                this.add.rectangle(x, y, 64, 64, (x + y) / 64 % 2 === 0 ? 0x111111 : 0x080808).setOrigin(0);
            }
        }

        UI.text(this, w / 2, 100, 'PIPE RUNNER', 56, '#00ffff');
        UI.text(this, w / 2, 160, 'An Isometric Adventure', 24, '#00ff00');
        UI.text(this, w / 2, 240, 'Collect every Power Core to open the Portal', 18, '#ffffff');
        UI.text(this, w / 2, 275, 'Avoid Spark Drones & Leak Blobs - or jump on them', 18, '#ff5555');
        UI.text(this, w / 2, 310, 'Jump over pits', 18, '#00ffff');

        const touch = this.sys.game.device.input.touch;
        UI.text(this, w / 2, 380, 'Controls', 20, '#ffff00');
        UI.text(this, w / 2, 415, 'Arrows / WASD - move    Space - jump    M - mute', 16, '#ffffff');
        if (touch) UI.text(this, w / 2, 445, 'Touch: drag left side to move, tap right side to jump', 16, '#ffffff');

        const start = UI.text(this, w / 2, 520, touch ? 'TAP TO START' : 'PRESS SPACE OR CLICK TO START', 24, '#00ff00');
        UI.blink(this, start);

        UI.onInput(this, ['SPACE', 'ENTER'], () => UI.leave(this, 'SceneGame', { level: 1, score: 0 }), 200);
    }
}
