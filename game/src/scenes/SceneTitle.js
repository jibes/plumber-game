// SceneTitle - main menu

class SceneTitle extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneTitle' });
    }

    create() {
        const w = CONFIG.width;
        UI.backdrop(this);
        this.cameras.main.fadeIn(300);

        // A little diorama: Rusty bouncing on a floor tile, surrounded by cores
        for (let i = -2; i <= 2; i++) {
            this.add.image(w / 2 + i * 64, 330 + Math.abs(i) * 0, `floor${(i + 10) % 2}`).setOrigin(0.5, 0.4);
        }
        const rusty = this.add.sprite(w / 2, 320, 'player', 0).setOrigin(0.5, 0.875).play('player_run');
        this.tweens.add({ targets: rusty, y: 270, duration: 380, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
        [-150, -100, 100, 150].forEach((dx, i) => {
            const core = this.add.sprite(w / 2 + dx, 300, 'objects', 0).setScale(0.5).play('core_spin');
            this.tweens.add({ targets: core, y: 285, duration: 600, yoyo: true, repeat: -1, delay: i * 150, ease: 'Sine.easeInOut' });
        });
        const drone = this.add.sprite(w / 2 + 240, 260, 'enemies', 0).setScale(0.8).play('drone_move');
        this.tweens.add({ targets: drone, x: w / 2 - 240, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => drone.toggleFlipX(), onRepeat: () => drone.toggleFlipX() });

        const title = UI.text(this, w / 2, 110, 'PIPE RUNNER', 72, '#00ffff');
        this.tweens.add({ targets: title, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        UI.text(this, w / 2, 175, 'An Isometric Adventure', 22, '#00ff00', false);

        const stars = Progress.totalStars();
        if (stars > 0) UI.text(this, w / 2, 400, `★ ${stars} / ${LEVELS.length * 3}`, 22, '#ffd700');

        const touch = this.sys.game.device.input.touch;
        UI.text(this, w / 2, 450, touch
            ? 'Drag left to move · tap right to jump · DASH button'
            : 'Arrows/WASD move · Space jump · Shift dash · Esc pause', 15, '#aaaaaa', false);
        UI.text(this, w / 2, 475, 'Gamepads work too', 13, '#666666', false);

        const start = UI.text(this, w / 2, 530, touch ? 'TAP TO START' : 'PRESS SPACE TO START', 28, '#00ff00');
        UI.blink(this, start);

        UI.onInput(this, ['SPACE', 'ENTER'], () => UI.leave(this, 'SceneLevelSelect'), 200);
        this.input.gamepad && this.input.gamepad.once('down', () => UI.leave(this, 'SceneLevelSelect'));
    }
}
