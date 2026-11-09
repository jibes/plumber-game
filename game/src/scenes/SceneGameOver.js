// SceneGameOver - Game over screen

class SceneGameOver extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneGameOver' });
    }

    init(data) {
        this.level = data.level || 1;
        this.score = data.score || 0;
    }

    create() {
        // Background
        this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, 0x000000)
            .setOrigin(0, 0);
        
        // Title
        this.add.text(CONFIG.width / 2, 150, 'GAME OVER', {
            font: '64px monospace',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        
        // Stats
        this.add.text(CONFIG.width / 2, 280, `Level: ${this.level}`, {
            font: '24px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 340, `Score: ${this.score}`, {
            font: '32px monospace',
            fill: '#ffff00'
        }).setOrigin(0.5);
        
        // Messages
        const messages = [
            'Better luck next time!',
            'Keep trying!',
            'Rusty needs repairs...',
            'System failure detected',
            'Try again, Engineer!'
        ];
        
        this.add.text(CONFIG.width / 2, 420, messages[Math.floor(Math.random() * messages.length)], {
            font: '20px monospace',
            fill: '#00ffff'
        }).setOrigin(0.5);
        
        // Buttons
        const retryText = this.add.text(CONFIG.width / 2 - 100, CONFIG.height - 150, 'RETRY', {
            font: '28px monospace',
            fill: '#00ff00'
        }).setOrigin(0.5);
        
        const menuText = this.add.text(CONFIG.width / 2 + 100, CONFIG.height - 150, 'MENU', {
            font: '28px monospace',
            fill: '#ff0000'
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: retryText,
            alpha: 0.7,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        this.tweens.add({
            targets: menuText,
            alpha: 0.7,
            duration: 500,
            yoyo: true,
            repeat: -1,
            delay: 250
        });
        
        // Touch/click areas
        const retryZone = this.add.zone(CONFIG.width / 2 - 100, CONFIG.height - 150, 100, 50)
            .setInteractive()
            .setAlpha(0.01);
        
        const menuZone = this.add.zone(CONFIG.width / 2 + 100, CONFIG.height - 150, 100, 50)
            .setInteractive()
            .setAlpha(0.01);
        
        retryZone.on('pointerdown', () => this.retry());
        menuZone.on('pointerdown', () => this.menu());
        
        // Keyboard
        this.input.keyboard.on('keydown-SPACE', () => this.retry());
        this.input.keyboard.on('keydown-ESC', () => this.menu());
        
        // Play sound
        if (window.PIPE_RUNNER this.sound.play('hurt');this.sound.play('hurt'); window.PIPE_RUNNER.hurtSound) window.PIPE_RUNNER.hurtSound();
    }

    retry() {
        this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
            if (progress === 1) {
                this.scene.start('SceneGame', {
                    level: this.level,
                    score: 0
                });
            }
        });
    }

    menu() {
        this.cameras.main.fadeOut(300, 0, 0, 0, (camera, progress) => {
            if (progress === 1) {
                this.scene.start('SceneTitle');
            }
        });
    }
}
