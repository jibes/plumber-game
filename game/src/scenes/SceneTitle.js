// SceneTitle - Main menu

class SceneTitle extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneTitle' });
    }

    create() {
        // Background
        this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, 0x000000)
            .setOrigin(0, 0);
        
        // Draw grid background
        for (let x = 0; x < CONFIG.width; x += 64) {
            for (let y = 0; y < CONFIG.height; y += 64) {
                const color = ((x / 64 + y / 64) % 2 === 0) ? 0x111111 : 0x080808;
                this.add.rectangle(x, y, 64, 64, color)
                    .setOrigin(0, 0)
                    .setDepth(-1);
            }
        }
        
        // Title
        this.add.text(CONFIG.width / 2, 100, 'PIPE RUNNER', {
            font: '48px monospace',
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        // Subtitle
        this.add.text(CONFIG.width / 2, 160, 'An Isometric Adventure', {
            font: '24px monospace',
            fill: '#00ff00'
        }).setOrigin(0.5);
        
        // Instructions
        this.add.text(CONFIG.width / 2, 240, 'Collect all Power Cores', {
            font: '18px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 280, 'Avoid Spark Drones & Leak Blobs', {
            font: '18px monospace',
            fill: '#ff0000'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 320, 'Reach the Portal to Advance', {
            font: '18px monospace',
            fill: '#00ffff'
        }).setOrigin(0.5);
        
        // Controls
        this.add.text(CONFIG.width / 2, 400, 'Controls:', {
            font: '20px monospace',
            fill: '#ffff00'
        }).setOrigin(0.5);
        
        this.add.text(CONFIG.width / 2, 440, 'Arrows - Move    Space - Jump', {
            font: '16px monospace',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Start button
        const startButton = this.add.text(CONFIG.width / 2, 520, 'PRESS SPACE OR TAP TO START', {
            font: '24px monospace',
            fill: '#00ff00'
        }).setOrigin(0.5);
        
        // Make button blink
        this.tweens.add({
            targets: startButton,
            alpha: 0.5,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // Input
        this.input.keyboard.on('keydown-SPACE', () => {
            this.startGame();
        });
        
        this.input.on('pointerdown', () => {
            this.startGame();
        });
        
        // Music
        if (!this.sound.locked) {
            this.music = this.sound.add('music', { loop: true, volume: 0.5 });
            this.music.play();
        }
    }

    startGame() {
        if (this.music) if (this.music) this.music();
        this.cameras.main.fadeOut(500, 0, 0, 0, (camera, progress) => {
            if (progress === 1) {
                this.scene.start('SceneGame', { level: 1, score: 0 });
            }
        });
    }
}
