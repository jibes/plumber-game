// SceneLevelComplete - score breakdown between levels

class SceneLevelComplete extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneLevelComplete' });
    }

    init(data) {
        this.result = {
            level: data.level || 1,
            score: data.score || 0,
            timeLeft: data.timeLeft || 0,
            coins: data.coins || 0,
            totalCoins: data.totalCoins || 0,
            timeBonus: data.timeBonus || 0,
            coinBonus: data.coinBonus || 0
        };
    }

    create() {
        const d = this.result;
        const w = CONFIG.width;
        const last = d.level >= LEVELS.length;
        this.cameras.main.fadeIn(300);

        UI.text(this, w / 2, 90, last ? 'ALL LEVELS COMPLETE!' : 'LEVEL COMPLETE!', 44, '#00ff00');
        UI.text(this, w / 2, 160, `Level ${d.level}: ${LEVELS[d.level - 1].name}`, 22, '#ffffff');
        UI.text(this, w / 2, 220, `Time Left: ${d.timeLeft}s   Time Bonus: +${d.timeBonus}`, 20, '#00ffff');
        UI.text(this, w / 2, 260, `Power Cores: ${d.coins}/${d.totalCoins}   Core Bonus: +${d.coinBonus}`, 20, '#ff00ff');
        UI.text(this, w / 2, 330, `Score: ${d.score}`, 36, '#ffff00');
        if (!last) UI.text(this, w / 2, 400, `Next: ${LEVELS[d.level].name}`, 20, '#00ff00');

        const cont = UI.text(this, w / 2, CONFIG.height - 100, last ? 'BACK TO MENU' : 'CONTINUE', 32, '#00ffff');
        UI.blink(this, cont);

        UI.onInput(this, ['SPACE', 'ENTER'], () => {
            if (last) UI.leave(this, 'SceneTitle');
            else UI.leave(this, 'SceneGame', { level: d.level + 1, score: d.score });
        }, 600);
    }
}
