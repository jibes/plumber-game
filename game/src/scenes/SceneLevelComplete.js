// SceneLevelComplete - score breakdown, stars, and saving progress

class SceneLevelComplete extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneLevelComplete' });
    }

    init(data) {
        this.result = data;
    }

    create() {
        const r = this.result;
        const w = CONFIG.width;
        const last = r.level >= LEVELS.length;
        const level = LEVELS[r.level - 1];
        const starCount = r.stars.filter(Boolean).length;
        const saved = Progress.record(r.level, starCount, r.score);
        UI.backdrop(this);
        this.cameras.main.fadeIn(300);

        UI.text(this, w / 2, 70, last ? 'STATION RESTORED!' : 'LEVEL COMPLETE!', 44, '#00ff00');
        UI.text(this, w / 2, 120, `${r.level}. ${level.name}`, 22, '#ffffff');

        // Stars pop in one by one
        const labels = ['Complete', 'Secret gear', `Under ${level.par}s`];
        r.stars.forEach((earned, i) => {
            const x = w / 2 + (i - 1) * 130;
            const star = this.add.image(x, 200, 'star').setScale(0).setTint(earned ? 0xffffff : 0x333333);
            UI.text(this, x, 250, labels[i], 14, earned ? '#ffd700' : '#666666', false);
            this.tweens.add({
                targets: star, scale: 1.6, duration: 350, delay: 300 + i * 350, ease: 'Back.easeOut',
                onStart: () => earned && Sfx.play('star', i)
            });
        });

        const lines = [
            [`Time ${r.elapsed.toFixed(1)}s   Time bonus +${r.timeBonus}`, '#00ffff'],
            [r.noDamageBonus ? `No damage bonus +${r.noDamageBonus}` : 'Took damage - no bonus', r.noDamageBonus ? '#ff66ff' : '#666666']
        ];
        lines.forEach(([str, color], i) => UI.text(this, w / 2, 300 + i * 30, str, 18, color, false));

        const scoreText = UI.text(this, w / 2, 385, 'SCORE 0', 38, '#ffff00');
        this.tweens.addCounter({
            from: 0, to: r.score, duration: 900, delay: 1300, ease: 'Cubic.easeOut',
            onUpdate: (t) => scoreText.setText(`SCORE ${Math.round(t.getValue())}`),
            onComplete: () => {
                if (saved.newBest) {
                    const best = UI.text(this, w / 2, 425, 'NEW BEST!', 22, '#ff3366');
                    this.tweens.add({ targets: best, scale: 1.2, duration: 300, yoyo: true, repeat: -1 });
                }
            }
        });

        const touch = this.sys.game.device.input.touch;
        const next = last ? 'LEVEL SELECT' : 'NEXT LEVEL';
        const cont = UI.text(this, w / 2, 500, touch ? `TAP: ${next}` : `SPACE: ${next}`, 28, '#00ffff');
        UI.blink(this, cont);
        UI.text(this, w / 2, 550, touch ? 'tap left half to replay' : 'R replay · Esc level select', 15, '#888888', false);

        const goNext = () => last ? UI.leave(this, 'SceneLevelSelect') : UI.leave(this, 'SceneGame', { level: r.level + 1 });
        UI.onInput(this, ['SPACE', 'ENTER', 'R', 'ESC'], (key, pointer) => {
            if (key === 'R' || (pointer && pointer.x < w / 2)) UI.leave(this, 'SceneGame', { level: r.level });
            else if (key === 'ESC') UI.leave(this, 'SceneLevelSelect');
            else goNext();
        }, 800);
    }
}
