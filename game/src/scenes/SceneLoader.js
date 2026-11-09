// SceneLoader - Creates all game assets programmatically

class SceneLoader extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneLoader' });
    }

    preload() {
        // Create loading bar
        const progress = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);

        const loadingText = this.make.text({
            x: CONFIG.width / 2,
            y: 240,
            text: 'Building Assets...',
            style: { font: '20px monospace', fill: '#ffffff' }
        });
        loadingText.setOrigin(0.5);

        const percentText = this.make.text({
            x: CONFIG.width / 2,
            y: 290,
            text: '0%',
            style: { font: '18px monospace', fill: '#00ff00' }
        });
        percentText.setOrigin(0.5);

        // Generate all assets
        this.generateSprites();
        
        // Simulate loading progress
        let progressValue = 0;
        const timer = this.time.addEvent({
            delay: 50,
            callback: () => {
                progressValue += 0.05;
                progress.clear();
                progress.fillStyle(0x00ff00, 1);
                progress.fillRect(250, 280, 300 * progressValue, 30);
                percentText.setText(parseInt(progressValue * 100) + '%');
                
                if (progressValue >= 1) {
                    timer.destroy();
                    progress.destroy();
                    progressBox.destroy();
                    loadingText.destroy();
                    percentText.destroy();
                    this.createAnimations();
                    this.scene.start('SceneTitle');
                }
            },
            loop: true
        });
    }

    generateSprites() {
        // Create texture atlas for all sprites
        const tileSize = CONFIG.tileSize;
        
        // Player spritesheet (12 frames: 4 idle, 4 run, 2 jump, 2 hurt)
        this.createPlayerSpritesheet();
        
        // Tiles spritesheet (floor, wall, pipe, etc.)
        this.createTileSpritesheet();
        
        // Objects spritesheet (coin, portal, etc.)
        this.createObjectSpritesheet();
        
        // Enemies spritesheet (drone, blob)
        this.createEnemySpritesheet();
        
        // UI elements
        this.createUISpritesheet();
        
        // Create simple audio using Web Audio API
        this.createAudio();
    }

    createPlayerSpritesheet() {
        const size = 64;
        const texture = this.textures.add('player', 0, 0, size, size * 12);
        const canvas = texture.source[0].canvas;
        const ctx = canvas.getContext('2d');
        
        // Player colors
        const bodyColor = '#ff6600';
        const eyeColor = '#000000';
        const lightColor = '#ffaa00';
        const darkColor = '#cc3300';
        
        // Frame 0-3: Idle animation
        for (let i = 0; i < 4; i++) {
            this.drawPlayer(ctx, i * size, 0, size, bodyColor, eyeColor, lightColor, darkColor, i * 0.2);
        }
        
        // Frame 4-7: Run animation
        for (let i = 0; i < 4; i++) {
            this.drawPlayer(ctx, i * size, size * 4, size, bodyColor, eyeColor, lightColor, darkColor, 0.5 + i * 0.2, true);
        }
        
        // Frame 8-9: Jump
        for (let i = 0; i < 2; i++) {
            this.drawPlayer(ctx, i * size, size * 8, size, bodyColor, eyeColor, lightColor, darkColor, 0, false, i === 1 ? -10 : -15);
        }
        
        // Frame 10-11: Hurt
        for (let i = 0; i < 2; i++) {
            const hurtColor = i % 2 === 0 ? '#ff0000' : '#ff6600';
            this.drawPlayer(ctx, i * size, size * 10, size, hurtColor, '#ffffff', lightColor, darkColor, 0);
        }
        
        texture.refresh();
    }

    drawPlayer(ctx, x, y, size, bodyColor, eyeColor, lightColor, darkColor, legOffset = 0, running = false, jumpOffset = 0) {
        const cx = x + size / 2;
        const cy = y + size / 2 + jumpOffset;
        
        // Body (circle)
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.arc(cx, cy - 5, size / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Body shadow
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.arc(cx + 2, cy - 3, size / 3 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Body highlight
        ctx.fillStyle = lightColor;
        ctx.beginPath();
        ctx.arc(cx - 2, cy - 7, size / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = eyeColor;
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 10, size / 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye highlight
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx + 10, cy - 12, size / 16, 0, Math.PI * 2);
        ctx.fill();
        
        // Wrench arm
        ctx.fillStyle = '#888888';
        ctx.fillRect(cx - 8, cy - 2, 16, 8);
        ctx.fillRect(cx + 8, cy - 2, 8, 4);
        
        // Legs
        if (running) {
            // Running legs
            ctx.fillStyle = darkColor;
            ctx.beginPath();
            ctx.arc(cx - 10, cy + 15 + legOffset, size / 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 10, cy + 15 - legOffset, size / 6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Standing legs
            ctx.fillStyle = darkColor;
            ctx.beginPath();
            ctx.arc(cx - 8, cy + 12, size / 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx + 8, cy + 12, size / 6, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Base shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 10, y + size - 8, size - 20, 8);
    }

    createTileSpritesheet() {
        const size = 64;
        const texture = this.textures.add('tiles', 0, 0, size, size * 4);
        const canvas = texture.source[0].canvas;
        const ctx = canvas.getContext('2d');
        
        // Frame 0: Floor 1 (darker)
        this.drawFloorTile(ctx, 0, 0, size, '#333333', '#222222', '#444444');
        
        // Frame 1: Floor 2 (lighter)
        this.drawFloorTile(ctx, 0, size, size, '#444444', '#333333', '#555555');
        
        // Frame 2: Wall
        this.drawWallTile(ctx, 0, size * 2, size, '#555555', '#333333', '#777777');
        
        // Frame 3: Pipe
        this.drawPipeTile(ctx, 0, size * 3, size, '#666666', '#444444', '#888888');
        
        texture.refresh();
    }

    drawFloorTile(ctx, x, y, size, baseColor, darkColor, lightColor) {
        // Isometric diamond
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size, y + size / 2);
        ctx.lineTo(x + size / 2, y + size);
        ctx.lineTo(x, y + size / 2);
        ctx.closePath();
        ctx.fill();
        
        // Top highlight
        ctx.fillStyle = lightColor;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + 2);
        ctx.lineTo(x + size - 2, y + size / 2);
        ctx.lineTo(x + size / 2, y + size / 2 + 2);
        ctx.lineTo(x + 2, y + size / 2);
        ctx.closePath();
        ctx.fill();
        
        // Bottom shadow
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y + size - 2);
        ctx.lineTo(x + size - 2, y + size / 2);
        ctx.lineTo(x + size / 2, y + size / 2 - 2);
        ctx.lineTo(x + 2, y + size / 2);
        ctx.closePath();
        ctx.fill();
        
        // Grid lines
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x, y + size / 2);
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size, y + size / 2);
        ctx.moveTo(x, y + size / 2);
        ctx.lineTo(x + size / 2, y + size);
        ctx.moveTo(x + size, y + size / 2);
        ctx.lineTo(x + size / 2, y + size);
        ctx.stroke();
    }

    drawWallTile(ctx, x, y, size, baseColor, darkColor, lightColor) {
        // Wall (taller isometric)
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y - size / 4);
        ctx.lineTo(x + size, y + size / 4);
        ctx.lineTo(x + size / 2, y + size / 2 + size / 4);
        ctx.lineTo(x, y + size / 4);
        ctx.closePath();
        ctx.fill();
        
        // Top
        ctx.fillStyle = lightColor;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y - size / 4);
        ctx.lineTo(x + size, y + size / 4);
        ctx.lineTo(x + size / 2, y + size / 4);
        ctx.lineTo(x, y + size / 4);
        ctx.closePath();
        ctx.fill();
        
        // Side shadows
        ctx.fillStyle = darkColor;
        ctx.beginPath();
        ctx.moveTo(x + size, y + size / 4);
        ctx.lineTo(x + size / 2, y + size / 2 + size / 4);
        ctx.lineTo(x + size / 2, y + size / 4);
        ctx.lineTo(x + size, y + size / 4);
        ctx.closePath();
        ctx.fill();
    }

    drawPipeTile(ctx, x, y, size, baseColor, darkColor, lightColor) {
        // Pipe
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.moveTo(x + size / 2, y);
        ctx.lineTo(x + size, y + size / 2);
        ctx.lineTo(x + size / 2, y + size);
        ctx.lineTo(x, y + size / 2);
        ctx.closePath();
        ctx.fill();
        
        // Pipe rim (top)
        ctx.fillStyle = lightColor;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 4, size / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Pipe connection
        ctx.fillStyle = darkColor;
        ctx.fillRect(x + size / 4, y + size / 4, size / 2, size / 4);
    }

    createObjectSpritesheet() {
        const size = 64;
        const texture = this.textures.add('objects', 0, 0, size, size * 8);
        const canvas = texture.source[0].canvas;
        const ctx = canvas.getContext('2d');
        
        // Frame 0-3: Power Core (spinning)
        for (let i = 0; i < 4; i++) {
            this.drawPowerCore(ctx, i * size, 0, size, i * 45);
        }
        
        // Frame 4-7: Portal (spinning)
        for (let i = 0; i < 4; i++) {
            this.drawPortal(ctx, i * size, size * 4, size, i * 45);
        }
        
        texture.refresh();
    }

    drawPowerCore(ctx, x, y, size, rotation = 0) {
        const cx = x + size / 2;
        const cy = y + size / 2;
        
        // Outer glow
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner core
        ctx.fillStyle = '#00aaff';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Center
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotation effect - draw lines
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation * Math.PI / 180);
        
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, size / 6);
            ctx.lineTo(0, size / 3);
            ctx.stroke();
            ctx.rotate(Math.PI / 4);
        }
        
        ctx.restore();
        
        // Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 10, y + size - 8, size - 20, 8);
    }

    drawPortal(ctx, x, y, size, rotation = 0) {
        const cx = x + size / 2;
        const cy = y + size / 2;
        
        // Outer ring
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner void
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Rotation effect
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rotation * Math.PI / 180);
        
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(size / 4, 0);
            ctx.lineTo(size / 3, 0);
            ctx.stroke();
            ctx.rotate(Math.PI / 3);
        }
        
        ctx.restore();
        
        // Glow effect
        ctx.fillStyle = '#ff00ff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, size / 3 + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    createEnemySpritesheet() {
        const size = 64;
        const texture = this.textures.add('enemies', 0, 0, size, size * 8);
        const canvas = texture.source[0].canvas;
        const ctx = canvas.getContext('2d');
        
        // Frame 0-3: Spark Drone
        for (let i = 0; i < 4; i++) {
            this.drawDrone(ctx, i * size, 0, size, i * 0.2);
        }
        
        // Frame 4-7: Leak Blob
        for (let i = 0; i < 4; i++) {
            this.drawBlob(ctx, i * size, size * 4, size, i * 0.2);
        }
        
        texture.refresh();
    }

    drawDrone(ctx, x, y, size, phase = 0) {
        const cx = x + size / 2;
        const cy = y + size / 2;
        
        // Body
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(cx + 8, cy - 4, size / 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings (animated)
        const wingOffset = Math.sin(phase * Math.PI * 2) * 5;
        
        ctx.fillStyle = '#cccc00';
        ctx.fillRect(cx - 16, cy - 4 + wingOffset, 12, 8);
        ctx.fillRect(cx + 4, cy - 4 - wingOffset, 12, 8);
        
        // Propeller
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 12);
        ctx.lineTo(cx, cy - 20);
        ctx.moveTo(cx - 4, cy - 16);
        ctx.lineTo(cx + 4, cy - 16);
        ctx.stroke();
        
        // Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 10, y + size - 8, size - 20, 8);
    }

    drawBlob(ctx, x, y, size, phase = 0) {
        const cx = x + size / 2;
        const cy = y + size / 2;
        
        // Body (pulsing)
        const pulse = Math.sin(phase * Math.PI * 2) * 3;
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(cx, cy, size / 4 + pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(cx + 6, cy - 4, size / 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Drips
        ctx.fillStyle = '#00aa00';
        ctx.beginPath();
        ctx.arc(cx - 8, cy + 8, size / 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + 10, cy + 6, size / 16, 0, Math.PI * 2);
        ctx.fill();
        
        // Shadow
        ctx.fillStyle = '#000000';
        ctx.fillRect(x + 10, y + size - 8, size - 20, 8);
    }

    createUISpritesheet() {
        const size = 64;
        const texture = this.textures.add('ui', 0, 0, size, size);
        const canvas = texture.source[0].canvas;
        const ctx = canvas.getContext('2d');
        
        // Simple button
        ctx.fillStyle = '#333333';
        ctx.fillRect(10, 10, size - 20, size - 20);
        
        ctx.fillStyle = '#555555';
        ctx.fillRect(15, 15, size - 30, size - 30);
        
        texture.refresh();
    }

    createAudio() {
        // Create simple audio using Web Audio API
        // This will be called when audio is needed
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Store audio context for later
        window.PIPE_RUNNER = window.PIPE_RUNNER || {};
        window.PIPE_RUNNER.audioContext = audioContext;
        
        // Create audio buffers
        this.createJumpSound(audioContext);
        this.createCollectSound(audioContext);
        this.createHurtSound(audioContext);
        this.createCompleteSound(audioContext);
        this.createMusic(audioContext);
    }

    createJumpSound(audioContext) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        // Store for later playback
        window.PIPE_RUNNER.jumpSound = () => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.1);
        };
    }

    createCollectSound(audioContext) {
        window.PIPE_RUNNER.collectSound = () => {
            const osc1 = audioContext.createOscillator();
            const osc2 = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioContext.destination);
            
            osc1.type = 'sine';
            osc2.type = 'sine';
            osc1.frequency.setValueAtTime(880, audioContext.currentTime);
            osc2.frequency.setValueAtTime(1320, audioContext.currentTime);
            
            gain.gain.setValueAtTime(0.1, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            osc1.start(audioContext.currentTime);
            osc2.start(audioContext.currentTime);
            osc1.stop(audioContext.currentTime + 0.1);
            osc2.stop(audioContext.currentTime + 0.1);
        };
    }

    createHurtSound(audioContext) {
        window.PIPE_RUNNER.hurtSound = () => {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, audioContext.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.2);
            
            gain.gain.setValueAtTime(0.1, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.2);
        };
    }

    createCompleteSound(audioContext) {
        window.PIPE_RUNNER.completeSound = () => {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, i) => {
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioContext.currentTime + i * 0.1);
                
                gain.gain.setValueAtTime(0.05, audioContext.currentTime + i * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + i * 0.1 + 0.3);
                
                osc.start(audioContext.currentTime + i * 0.1);
                osc.stop(audioContext.currentTime + i * 0.1 + 0.3);
            });
        };
    }

    createMusic(audioContext) {
        window.PIPE_RUNNER.playMusic = () => {
            // Simple looping melody
            const notes = [
                {freq: 261.63, duration: 0.2}, // C4
                {freq: 293.66, duration: 0.2}, // D4
                {freq: 329.63, duration: 0.2}, // E4
                {freq: 349.23, duration: 0.2}, // F4
                {freq: 392.00, duration: 0.4}, // G4
                {freq: 349.23, duration: 0.2}, // F4
                {freq: 329.63, duration: 0.4}, // E4
                {freq: 293.66, duration: 0.4}, // D4
            ];
            
            let index = 0;
            let musicPlaying = true;
            
            const playNote = () => {
                if (!musicPlaying) return;
                
                const note = notes[index];
                const osc = audioContext.createOscillator();
                const gain = audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(audioContext.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(note.freq, audioContext.currentTime);
                
                gain.gain.setValueAtTime(0.05, audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.duration);
                
                osc.start(audioContext.currentTime);
                osc.stop(audioContext.currentTime + note.duration);
                
                index = (index + 1) % notes.length;
                setTimeout(playNote, note.duration * 1000);
            };
            
            playNote();
            
            return () => { musicPlaying = false; };
        };
    }

    createAnimations() {
        // Player animations
        this.anims.create({
            key: 'player_idle',
            frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
            frameRate: 4,
            repeat: -1
        });

        this.anims.create({
            key: 'player_run',
            frames: this.anims.generateFrameNumbers('player', { start: 4, end: 7 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'player_jump',
            frames: this.anims.generateFrameNumbers('player', { start: 8, end: 9 }),
            frameRate: 4,
            repeat: 0
        });

        this.anims.create({
            key: 'player_hurt',
            frames: this.anims.generateFrameNumbers('player', { start: 10, end: 11 }),
            frameRate: 8,
            repeat: 0
        });

        // Enemy animations
        this.anims.create({
            key: 'drone_move',
            frames: this.anims.generateFrameNumbers('enemies', { start: 0, end: 3 }),
            frameRate: 6,
            repeat: -1
        });

        this.anims.create({
            key: 'blob_move',
            frames: this.anims.generateFrameNumbers('enemies', { start: 4, end: 7 }),
            frameRate: 4,
            repeat: -1
        });

        // Object animations
        this.anims.create({
            key: 'core_spin',
            frames: this.anims.generateFrameNumbers('objects', { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'portal_spin',
            frames: this.anims.generateFrameNumbers('objects', { start: 4, end: 7 }),
            frameRate: 6,
            repeat: -1
        });
    }
}
