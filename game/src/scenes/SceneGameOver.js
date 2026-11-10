// SceneGameOver - shown when health or time runs out

class SceneGameOver extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneGameOver' });
    }

    init(data) {
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.retryScore = data.retryScore || 0;
        this.reason = data.reason || '';
    }

    create() {
        const w = CONFIG.width;
        const h = CONFIG.height;
        this.cameras.main.fadeIn(300);

        UI.text(this, w / 2, 140, 'GAME OVER', 64, '#ff0000');
        UI.text(this, w / 2, 220, this.reason, 22, '#ffaa00');
        UI.text(this, w / 2, 290, `Level: ${this.level}`, 24, '#ffffff');
        UI.text(this, w / 2, 340, `Score: ${this.score}`, 32, '#ffff00');

        const retry = UI.text(this, w / 2 - 120, h - 150, 'RETRY', 28, '#00ff00');
        const menu = UI.text(this, w / 2 + 120, h - 150, 'MENU', 28, '#ff5555');
        UI.blink(this, retry);
        UI.blink(this, menu, 250);
        UI.text(this, w / 2, h - 100, 'Space - retry level    Esc - menu', 16, '#888888');

        const doRetry = () => UI.leave(this, 'SceneGame', { level: this.level, score: this.retryScore });
        const doMenu = () => UI.leave(this, 'SceneTitle');
        UI.onInput(this, ['SPACE', 'ENTER', 'ESC'], (key, pointer) => {
            if (key === 'ESC' || (pointer && pointer.x > w / 2)) doMenu();
            else doRetry();
        }, 600);
    }
}
