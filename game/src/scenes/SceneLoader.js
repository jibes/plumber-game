// SceneLoader - draws every texture procedurally, registers animations, then opens the title screen

class SceneLoader extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneLoader' });
    }

    create() {
        this.createTiles();
        this.createPlayer();
        this.createEnemies();
        this.createObjects();
        this.createShadow();
        this.createAnimations();
        this.scene.start('SceneTitle');
    }

    // Draws `count` frames side by side on one canvas texture and registers them as frames 0..count-1.
    makeSheet(key, frameW, frameH, count, draw) {
        const texture = this.textures.createCanvas(key, frameW * count, frameH);
        const ctx = texture.getContext();
        for (let i = 0; i < count; i++) {
            ctx.save();
            ctx.translate(i * frameW, 0);
            draw(ctx, i);
            ctx.restore();
            texture.add(i, 0, i * frameW, 0, frameW, frameH);
        }
        texture.refresh();
    }

    poly(ctx, color, points) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
        ctx.closePath();
        ctx.fill();
    }

    circle(ctx, color, x, y, r) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    // Tiles are 64x64 frames. Floor: ground diamond centred at (32,40) with an 8px slab.
    // Wall: one tile tall, ground diamond centred at (32,48). SceneGame sets origins to match.
    createTiles() {
        const floor = (ctx, top, left, right) => {
            this.poly(ctx, left, [0, 40, 32, 56, 32, 64, 0, 48]);
            this.poly(ctx, right, [64, 40, 32, 56, 32, 64, 64, 48]);
            this.poly(ctx, top, [32, 24, 64, 40, 32, 56, 0, 40]);
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(32, 24.5); ctx.lineTo(63.5, 40); ctx.lineTo(32, 55.5); ctx.lineTo(0.5, 40); ctx.closePath();
            ctx.stroke();
        };

        this.makeSheet('tiles', 64, 64, 3, (ctx, i) => {
            if (i === 0) floor(ctx, '#3a3a44', '#26262e', '#1c1c22');
            if (i === 1) floor(ctx, '#46464f', '#2c2c34', '#202026');
            if (i === 2) {
                this.poly(ctx, '#4a5560', [0, 16, 32, 32, 32, 64, 0, 48]);
                this.poly(ctx, '#353d46', [64, 16, 32, 32, 32, 64, 64, 48]);
                this.poly(ctx, '#6b7884', [32, 0, 64, 16, 32, 32, 0, 16]);
                // Copper pipe running along both faces
                this.poly(ctx, '#b86b2e', [0, 28, 32, 44, 32, 50, 0, 34]);
                this.poly(ctx, '#8a4f22', [64, 28, 32, 44, 32, 50, 64, 34]);
                this.circle(ctx, '#d98c4a', 16, 37, 3);
            }
        });
    }

    // Player "Rusty": 9 frames - idle 0-3, run 4-7, jump 8. Feet rest at y≈56.
    createPlayer() {
        const idleBob = [0, -1, -2, -1];
        const runLegs = [[-4, 4], [0, 0], [4, -4], [0, 0]];
        this.makeSheet('player', 64, 64, 9, (ctx, i) => {
            if (i < 4) this.drawPlayer(ctx, idleBob[i], 0, 0);
            else if (i < 8) this.drawPlayer(ctx, i % 2 ? 0 : -1, runLegs[i - 4][0], runLegs[i - 4][1]);
            else this.drawPlayer(ctx, -2, -4, -4);
        });
    }

    drawPlayer(ctx, bob, legA, legB) {
        const cx = 32;
        const cy = 30 + bob;
        this.circle(ctx, '#cc3300', cx - 9, cy + 19 + legA, 7);
        this.circle(ctx, '#cc3300', cx + 9, cy + 19 + legB, 7);
        this.circle(ctx, '#ff6600', cx, cy, 20);
        this.circle(ctx, '#cc4400', cx + 3, cy + 3, 17);
        this.circle(ctx, '#ff8a1a', cx - 3, cy - 3, 15);
        this.circle(ctx, '#ffaa00', cx - 7, cy - 8, 5);
        // Visor
        this.circle(ctx, '#111111', cx + 9, cy - 5, 7);
        this.circle(ctx, '#ffffff', cx + 11, cy - 7, 2.5);
        // Wrench
        ctx.fillStyle = '#9aa0a6';
        ctx.fillRect(cx - 2, cy + 6, 22, 5);
        ctx.fillRect(cx + 18, cy + 2, 6, 4);
        ctx.fillRect(cx + 18, cy + 11, 6, 4);
    }

    // Enemies: spark drone frames 0-3, leak blob frames 4-7.
    createEnemies() {
        this.makeSheet('enemies', 64, 64, 8, (ctx, i) => {
            const phase = (i % 4) / 4;
            if (i < 4) this.drawDrone(ctx, phase);
            else this.drawBlob(ctx, phase);
        });
    }

    drawDrone(ctx, phase) {
        const cx = 32, cy = 34;
        const wing = Math.sin(phase * Math.PI * 2) * 5;
        ctx.fillStyle = '#cccc00';
        ctx.fillRect(cx - 26, cy - 4 + wing, 12, 6);
        ctx.fillRect(cx + 14, cy - 4 - wing, 12, 6);
        this.circle(ctx, '#ffff33', cx, cy, 15);
        this.circle(ctx, '#ff2222', cx + 6, cy - 3, 6);
        this.circle(ctx, '#ffffff', cx + 7, cy - 5, 2);
        // Spinning rotor
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 15);
        ctx.lineTo(cx, cy - 22);
        const a = phase * Math.PI;
        ctx.moveTo(cx - Math.cos(a) * 10, cy - 22);
        ctx.lineTo(cx + Math.cos(a) * 10, cy - 22);
        ctx.stroke();
        // Spark
        ctx.strokeStyle = '#66ffff';
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy + 14);
        ctx.lineTo(cx + 2, cy + 20 + wing);
        ctx.lineTo(cx - 2, cy + 24);
        ctx.stroke();
    }

    drawBlob(ctx, phase) {
        const cx = 32;
        const squish = Math.sin(phase * Math.PI * 2) * 3;
        ctx.fillStyle = '#00cc44';
        ctx.beginPath();
        ctx.ellipse(cx, 44 - squish / 2, 19 + squish, 13 - squish, 0, 0, Math.PI * 2);
        ctx.fill();
        this.circle(ctx, '#33ff77', cx - 6, 40, 6);
        this.circle(ctx, '#000000', cx + 7, 40, 5);
        this.circle(ctx, '#ffffff', cx + 8, 38, 1.5);
        this.circle(ctx, '#009933', cx - 14, 54, 3);
        this.circle(ctx, '#009933', cx + 15, 53, 2);
    }

    // Objects: power core frames 0-3, portal frames 4-7. Both centred in their frame.
    createObjects() {
        this.makeSheet('objects', 64, 64, 8, (ctx, i) => {
            const angle = (i % 4) * Math.PI / 8;
            if (i < 4) this.drawCore(ctx, angle);
            else this.drawPortal(ctx, angle);
        });
    }

    drawCore(ctx, angle) {
        const cx = 32, cy = 32;
        this.circle(ctx, '#00ffff', cx, cy, 20);
        this.circle(ctx, '#00aaff', cx, cy, 15);
        this.circle(ctx, '#ffffff', cx, cy, 7);
        ctx.strokeStyle = '#ccffff';
        ctx.lineWidth = 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        for (let k = 0; k < 4; k++) {
            ctx.beginPath();
            ctx.moveTo(0, 9);
            ctx.lineTo(0, 18);
            ctx.stroke();
            ctx.rotate(Math.PI / 2);
        }
        ctx.restore();
    }

    drawPortal(ctx, angle) {
        const cx = 32, cy = 32;
        ctx.globalAlpha = 0.4;
        this.circle(ctx, '#ff00ff', cx, cy, 30);
        ctx.globalAlpha = 1;
        this.circle(ctx, '#ff00ff', cx, cy, 24);
        this.circle(ctx, '#220022', cx, cy, 17);
        ctx.strokeStyle = '#ff99ff';
        ctx.lineWidth = 3;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        for (let k = 0; k < 6; k++) {
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI / 6);
            ctx.stroke();
            ctx.rotate(Math.PI / 3);
        }
        ctx.restore();
    }

    createShadow() {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0x000000, 0.45);
        g.fillEllipse(16, 8, 32, 16);
        g.generateTexture('shadow', 32, 16);
        g.destroy();
    }

    createAnimations() {
        const anim = (key, texture, start, end, frameRate) => this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(texture, { start, end }),
            frameRate,
            repeat: -1
        });
        anim('player_idle', 'player', 0, 3, 4);
        anim('player_run', 'player', 4, 7, 10);
        anim('player_jump', 'player', 8, 8, 1);
        anim('drone_move', 'enemies', 0, 3, 12);
        anim('blob_move', 'enemies', 4, 7, 5);
        anim('core_spin', 'objects', 0, 3, 8);
        anim('portal_spin', 'objects', 4, 7, 8);
    }
}
