// SceneGameOver - shown when health or time runs out

class SceneGameOver extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneGameOver' });
    }

    init(data) {
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.reason = data.reason || '';
    }

    create() {
        const w = CONFIG.width;
        const h = CONFIG.height;
        UI.backdrop(this);
        this.cameras.main.fadeIn(300);

        const title = UI.text(this, w / 2, 150, 'GAME OVER', 68, '#ff3333');
        title.setScale(2).setAlpha(0);
        this.tweens.add({ targets: title, scale: 1, alpha: 1, duration: 400, ease: 'Back.easeOut' });
        UI.text(this, w / 2, 230, this.reason, 22, '#ffaa00');
        UI.text(this, w / 2, 290, `${this.level}. ${LEVELS[this.level - 1].name}`, 22, '#ffffff', false);
        UI.text(this, w / 2, 340, `Score ${this.score}`, 30, '#ffff00');

        const tips = [
            'Hold jump for a higher jump, tap it for a short hop',
            'Dashing makes you invincible for a moment',
            'Stomp enemies and keep moving to build a combo',
            'You can still jump for a split second after running off a ledge',
            'Steam vents erupt in a wave - wait for it to pass',
            'Holding jump when you stomp bounces you higher'
        ];
        UI.text(this, w / 2, 400, 'TIP: ' + Phaser.Utils.Array.GetRandom(tips), 15, '#00ffff', false);

        const touch = this.sys.game.device.input.touch;
        const retry = UI.text(this, w / 2 - 130, h - 130, 'RETRY', 30, '#00ff00');
        const menu = UI.text(this, w / 2 + 130, h - 130, 'LEVELS', 30, '#ff6666');
        UI.blink(this, retry);
        UI.blink(this, menu, 250);
        UI.text(this, w / 2, h - 80, touch ? 'Tap left: retry · tap right: levels' : 'Space retry · Esc levels', 15, '#888888', false);

        UI.onInput(this, ['SPACE', 'ENTER', 'R', 'ESC'], (key, pointer) => {
            if (key === 'ESC' || (pointer && pointer.x > w / 2)) UI.leave(this, 'SceneLevelSelect');
            else UI.leave(this, 'SceneGame', { level: this.level });
        }, 600);
    }
}
