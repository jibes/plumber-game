// SceneLevelComplete - Level completion screen

class SceneLevelComplete extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneLevelComplete' });
    }

    init(data) {
        this.level = data.level || 1;
        this.score = data.score || 0;
        this.timeLeft = data.timeLeft || 0;
        this.coins = data.coins || 0;
        this.totalCoins = data.totalCoins || 0;
    }

    create() {
        // Background
        this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, 0x000000)
            .setOrigin(0, 0);
        
        // Title
        this.add.text(CONFIG.width / 2, 100, 'LEVEL COMPLETE!', {
            font: '48px monospace',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Stats
        this.add.text(CONFIG.width / 2, 200, `Level: ${this.level}`, {
            font: '24px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 250, `Score: ${this.score}`, {
            font: '24px monospace',
            fill: '#ffff00'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 300, `Time Left: ${this.timeLeft}s`, {
            font: '24px monospace',
            fill: '#00ffff'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 350, `Power Cores: ${this.coins}/${this.totalCoins}`, {
            font: '24px monospace',
            fill: '#ff00ff'
        }).setOrigin(0.5);
        
        // Bonus calculation
        const timeBonus = Math.floor(this.timeLeft * 10);
        const coinBonus = this.coins * 50;
        const totalBonus = timeBonus + coinBonus;
        
        this.add.text(CONFIG.width / 2, 420, `Time Bonus: +${timeBonus}`, {
            font: '20px monospace',
            fill: '#00ffff'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 460, `Core Bonus: +${coinBonus}`, {
            font: '20px monospace',
            fill: '#ff00ff'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 500, `Total Bonus: +${totalBonus}`, {
            font: '24px monospace',
            fill: '#ffff00'
        }).setOrigin(0.5);
        
        // Next level or finish
        if (this.level < CONFIG.maxLevels) {
            this.add.text(CONFIG.width / 2, 560, `Level ${this.level + 1} Ready!`, {
                font: '20px monospace',
                fill: '#00ff00'
            }).setOrigin(0.5);
        } else {
            this.add.text(CONFIG.width / 2, 560, 'All Levels Complete!', {
                font: '20px monospace',
                fill: '#00ff00'
            }).setOrigin(0.5);
        }
        
        // Continue button
        const continueText = this.add.text(CONFIG.width / 2, CONFIG.height - 100, 
            this.level < CONFIG.maxLevels ? 'CONTINUE' : 'PLAY AGAIN', {
            font: '32px monospace',
            fill: '#00ffff'
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: continueText,
            alpha: 0.7,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // Input
        this.input.keyboard.on('keydown-SPACE', () => {
            this.continue();
        });
        
        this.input.on('pointerdown', () => {
            this.continue();
        });
        
        // Play sound
        if (window.PIPE_RUNNER this.sound.play('complete');this.sound.play('complete'); window.PIPE_RUNNER.completeSound) window.PIPE_RUNNER.completeSound();
    }

    continue() {
        this.cameras.main.fadeOut(500, 0, 0, 0, (camera, progress) => {
            if (progress === 1) {
                const nextLevel = this.level < CONFIG.maxLevels ? this.level + 1 : 1;
                this.scene.start('SceneGame', {
                    level: nextLevel,
                    score: this.score
                });
            }
        });
    }
}
