// SceneLoader - draws every texture procedurally, registers animations, then opens the title screen

class SceneLoader extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneLoader' });
    }

    create() {
        this.createBlocks();
        this.createPlayer();
        this.createEnemies();
        this.createObjects();
        this.createSmallTextures();
        this.createBackground();
        this.createAnimations();
        this.scene.start('SceneTitle');
    }

    // ---------- drawing helpers ----------

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

    makeTexture(key, w, h, draw) {
        const texture = this.textures.createCanvas(key, w, h);
        draw(texture.getContext());
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

    // ---------- terrain ----------

    // Block of `levels` height (0 = floor slab). Top diamond occupies y 0..32, sides hang below.
    // SceneGame positions these with IsoUtils.blockOriginY(levels).
    drawBlock(ctx, levels, top, left, right, decorate) {
        const side = 8 + levels * CONFIG.zScale;
        this.poly(ctx, left, [0, 16, 32, 32, 32, 32 + side, 0, 16 + side]);
        this.poly(ctx, right, [64, 16, 32, 32, 32, 32 + side, 64, 16 + side]);
        this.poly(ctx, top, [32, 0, 64, 16, 32, 32, 0, 16]);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(32, 0.5); ctx.lineTo(63.5, 16); ctx.lineTo(32, 31.5); ctx.lineTo(0.5, 16); ctx.closePath();
        ctx.stroke();
        if (decorate) decorate(ctx, side);
    }

    createBlocks() {
        const block = (key, levels, ...args) =>
            this.makeTexture(key, 64, 40 + levels * CONFIG.zScale, ctx => this.drawBlock(ctx, levels, ...args));

        block('floor0', 0, '#3a3a44', '#26262e', '#1c1c22');
        block('floor1', 0, '#46464f', '#2c2c34', '#202026');

        block('crate', 1, '#a0703c', '#7a5028', '#5c3c1e', (ctx) => {
            ctx.strokeStyle = '#4a2e14';
            ctx.lineWidth = 2;
            // Planks on the top face and an X brace on each side
            ctx.beginPath();
            ctx.moveTo(16, 8); ctx.lineTo(48, 24);
            ctx.moveTo(48, 8); ctx.lineTo(16, 24);
            ctx.moveTo(2, 20); ctx.lineTo(30, 66);
            ctx.moveTo(30, 36); ctx.lineTo(2, 50);
            ctx.moveTo(62, 20); ctx.lineTo(34, 66);
            ctx.moveTo(34, 36); ctx.lineTo(62, 50);
            ctx.stroke();
        });

        block('wall', 2, '#6b7884', '#4a5560', '#353d46', (ctx) => {
            // Two copper pipes running along both faces
            [30, 62].forEach(y => {
                this.poly(ctx, '#b86b2e', [0, y, 32, y + 16, 32, y + 22, 0, y + 6]);
                this.poly(ctx, '#8a4f22', [64, y, 32, y + 16, 32, y + 22, 64, y + 6]);
                this.circle(ctx, '#d98c4a', 16, y + 11, 3);
            });
        });

        block('spring', 0, '#46464f', '#2c2c34', '#202026', (ctx) => {
            ctx.fillStyle = '#ffdd00';
            ctx.fillRect(20, 10, 24, 12);
            this.poly(ctx, '#ff3333', [32, 6, 50, 15, 32, 24, 14, 15]);
            this.poly(ctx, '#ff8888', [32, 8, 44, 14, 32, 18, 20, 14]);
        });

        block('crumble', 0, '#5a5048', '#3a322c', '#2a2420', (ctx) => {
            ctx.strokeStyle = '#1a1410';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(14, 12); ctx.lineTo(26, 16); ctx.lineTo(30, 24); ctx.lineTo(42, 22);
            ctx.moveTo(26, 16); ctx.lineTo(36, 8); ctx.lineTo(48, 14);
            ctx.stroke();
        });

        block('vent', 0, '#3a3a44', '#26262e', '#1c1c22', (ctx) => {
            this.poly(ctx, '#111114', [32, 5, 54, 16, 32, 27, 10, 16]);
            ctx.strokeStyle = '#555560';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = -2; i <= 2; i++) {
                ctx.moveTo(22 + i * 5, 11 + i * 2.5 + 2);
                ctx.lineTo(42 + i * 5 - 10, 21 + i * 2.5 - 3);
            }
            ctx.stroke();
        });
    }

    // ---------- characters ----------

    // Player "Rusty": idle 0-3, run 4-7, jump 8. Feet rest at y≈56.
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
        // Antenna
        ctx.fillStyle = '#888888';
        ctx.fillRect(cx - 1, cy - 28, 2, 9);
        this.circle(ctx, '#00ffcc', cx, cy - 29, 3);
        // Visor
        this.circle(ctx, '#111111', cx + 9, cy - 5, 7);
        this.circle(ctx, '#ffffff', cx + 11, cy - 7, 2.5);
        // Wrench
        ctx.fillStyle = '#9aa0a6';
        ctx.fillRect(cx - 2, cy + 6, 22, 5);
        ctx.fillRect(cx + 18, cy + 2, 6, 4);
        ctx.fillRect(cx + 18, cy + 11, 6, 4);
    }

    // drone 0-3, blob 4-7, rust bot 8-11, turret 12-13 (idle, firing)
    createEnemies() {
        this.makeSheet('enemies', 64, 64, 14, (ctx, i) => {
            const phase = (i % 4) / 4;
            if (i < 4) this.drawDrone(ctx, phase);
            else if (i < 8) this.drawBlob(ctx, phase);
            else if (i < 12) this.drawRustbot(ctx, phase);
            else this.drawTurret(ctx, i === 13);
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
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 15);
        ctx.lineTo(cx, cy - 22);
        const a = phase * Math.PI;
        ctx.moveTo(cx - Math.cos(a) * 10, cy - 22);
        ctx.lineTo(cx + Math.cos(a) * 10, cy - 22);
        ctx.stroke();
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

    drawRustbot(ctx, phase) {
        const cx = 32;
        const step = Math.sin(phase * Math.PI * 2) * 3;
        // Treads
        ctx.fillStyle = '#222222';
        ctx.fillRect(cx - 18, 48 + step / 2, 14, 8);
        ctx.fillRect(cx + 4, 48 - step / 2, 14, 8);
        // Body
        ctx.fillStyle = '#7a3b1e';
        ctx.fillRect(cx - 16, 22, 32, 28);
        ctx.fillStyle = '#9c5530';
        ctx.fillRect(cx - 16, 22, 32, 6);
        // Rust spots
        this.circle(ctx, '#5a2a10', cx - 8, 40, 3);
        this.circle(ctx, '#5a2a10', cx + 9, 34, 2);
        // Angry eye slit
        ctx.fillStyle = '#000000';
        ctx.fillRect(cx - 10, 30, 22, 7);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(cx + 2 + step, 31, 8, 5);
        // Claws
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(cx - 24, 34, 8, 4);
        ctx.fillRect(cx + 16, 34, 8, 4);
    }

    drawTurret(ctx, firing) {
        const cx = 32;
        ctx.fillStyle = '#444455';
        ctx.beginPath();
        ctx.ellipse(cx, 50, 18, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#666677';
        ctx.fillRect(cx - 12, 30, 24, 20);
        this.circle(ctx, '#8888aa', cx, 30, 13);
        this.circle(ctx, firing ? '#ffff66' : '#ff3300', cx, 30, 6);
        if (firing) this.circle(ctx, 'rgba(255,200,0,0.5)', cx, 30, 11);
    }

    // ---------- objects ----------

    // core 0-3, portal 4-7, gear 8-11, repair kit 12 - all centred in their frame
    createObjects() {
        this.makeSheet('objects', 64, 64, 13, (ctx, i) => {
            const angle = (i % 4) * Math.PI / 8;
            if (i < 4) this.drawCore(ctx, angle);
            else if (i < 8) this.drawPortal(ctx, angle);
            else if (i < 12) this.drawGear(ctx, angle / 2);
            else this.drawKit(ctx);
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

    drawGear(ctx, angle) {
        const cx = 32, cy = 32;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = '#ffd700';
        for (let k = 0; k < 8; k++) {
            ctx.fillRect(-4, -22, 8, 10);
            ctx.rotate(Math.PI / 4);
        }
        ctx.restore();
        this.circle(ctx, '#ffd700', cx, cy, 15);
        this.circle(ctx, '#fff2a0', cx - 3, cy - 3, 8);
        this.circle(ctx, '#aa7700', cx, cy, 5);
    }

    drawKit(ctx) {
        ctx.fillStyle = '#eeeeee';
        ctx.fillRect(14, 20, 36, 26);
        ctx.fillStyle = '#cccccc';
        ctx.fillRect(14, 40, 36, 6);
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(28, 24, 8, 18);
        ctx.fillRect(23, 29, 18, 8);
        ctx.fillStyle = '#888888';
        ctx.fillRect(26, 14, 12, 6);
    }

    // ---------- small textures ----------

    createSmallTextures() {
        const g = this.make.graphics({ add: false });
        g.fillStyle(0x000000, 0.45);
        g.fillEllipse(16, 8, 32, 16);
        g.generateTexture('shadow', 32, 16);
        g.clear();

        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('px', 8, 8);
        g.clear();

        g.fillStyle(0xff3300, 0.35);
        g.fillCircle(12, 12, 12);
        g.fillStyle(0xff8800, 1);
        g.fillCircle(12, 12, 7);
        g.fillStyle(0xffffaa, 1);
        g.fillCircle(11, 10, 3);
        g.generateTexture('orb', 24, 24);
        g.clear();

        g.fillStyle(0xdddddd, 0.5);
        g.fillCircle(16, 16, 16);
        g.generateTexture('puff', 32, 32);
        g.destroy();

        this.makeTexture('star', 40, 40, ctx => {
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const r = i % 2 ? 8 : 18;
                const a = -Math.PI / 2 + i * Math.PI / 5;
                ctx.lineTo(20 + Math.cos(a) * r, 21 + Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
    }

    // Large dark backdrop with distant pipes and dust, scrolled slowly for parallax.
    createBackground() {
        this.makeTexture('bg', 1600, 1200, ctx => {
            const grad = ctx.createLinearGradient(0, 0, 0, 1200);
            grad.addColorStop(0, '#0a0614');
            grad.addColorStop(1, '#02080c');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1600, 1200);
            const rnd = new Phaser.Math.RandomDataGenerator(['pipes']);
            ctx.lineCap = 'round';
            for (let i = 0; i < 14; i++) {
                const y = rnd.between(0, 1200);
                const x = rnd.between(0, 1600);
                ctx.strokeStyle = `rgba(120, 70, 30, ${rnd.realInRange(0.08, 0.2)})`;
                ctx.lineWidth = rnd.between(10, 30);
                ctx.beginPath();
                ctx.moveTo(-50, y);
                ctx.lineTo(x, y);
                ctx.lineTo(x, y + rnd.between(-400, 400));
                ctx.stroke();
            }
            for (let i = 0; i < 220; i++) {
                ctx.fillStyle = `rgba(150, 200, 255, ${rnd.realInRange(0.05, 0.4)})`;
                ctx.fillRect(rnd.between(0, 1600), rnd.between(0, 1200), 2, 2);
            }
        });
    }

    createAnimations() {
        const anim = (key, texture, start, end, frameRate) => this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(texture, { start, end }),
            frameRate,
            repeat: -1
        });
        anim('player_idle', 'player', 0, 3, 4);
        anim('player_run', 'player', 4, 7, 12);
        anim('player_jump', 'player', 8, 8, 1);
        anim('drone_move', 'enemies', 0, 3, 12);
        anim('blob_move', 'enemies', 4, 7, 5);
        anim('rustbot_move', 'enemies', 8, 11, 8);
        anim('turret_idle', 'enemies', 12, 12, 1);
        anim('core_spin', 'objects', 0, 3, 8);
        anim('portal_spin', 'objects', 4, 7, 8);
        anim('gear_spin', 'objects', 8, 11, 6);
    }
}
