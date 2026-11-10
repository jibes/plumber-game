// SceneGame - isometric platforming.
// World state lives in tile space: (x, y) on the grid plus height z (floor 0, crate 1, wall 2).
// There is no physics engine; sprites are projected from that state every frame.

class SceneGame extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneGame' });
    }

    // Scene instances are reused between runs, so all per-run state is reset here.
    init(data) {
        this.levelNumber = data.level || 1;
        this.level = parseLevel(LEVELS[this.levelNumber - 1]);
        this.state = 'playing'; // playing | falling | over | done
        this.paused = false;
        this.score = 0;
        this.health = CONFIG.maxHealth;
        this.elapsed = 0;
        this.lastTick = null;
        this.damageTaken = false;
        this.gearFound = false;
        this.coinsCollected = 0;
        this.invulnerableMs = 0;
        this.hitStop = 0;
        this.combo = { count: 0, timer: 0 };
        this.portalActive = false;
        this.portalWarned = false;
        this.touch = { stickId: null, jumpId: null, vec: { x: 0, y: 0 }, jumpPressed: false, dashPressed: false };
        this.padPrev = [];
    }

    create() {
        this.time.paused = false; // a restart from the pause menu would otherwise inherit the paused clock
        this.tweens.resumeAll();
        this.fx = new Fx(this);
        this.hazards = new Hazards(this);
        this.buildWorld();
        this.createPlayer();
        this.enemies = new Enemies(this);
        this.createHUD();
        this.createInput();

        const cam = this.cameras.main;
        cam.setRoundPixels(true);
        this.camTarget = { x: this.player.sprite.x, y: this.player.sprite.y };
        cam.startFollow(this.camTarget, true, 0.1, 0.1);
        cam.centerOn(this.camTarget.x, this.camTarget.y);
        cam.fadeIn(400);

        Sfx.startMusic();
        const onBlur = () => this.setPaused(true);
        this.game.events.on('blur', onBlur);
        this.events.once('shutdown', () => {
            Sfx.stopMusic();
            this.game.events.off('blur', onBlur);
        });
    }

    // ---------- Terrain ----------

    tileChar(tx, ty) {
        const row = this.level.grid[ty];
        return row ? row[tx] : undefined;
    }

    // Height of the surface at a point; -Infinity for pits, collapsed floor and outside the map.
    heightAt(x, y) {
        const tx = Math.floor(x), ty = Math.floor(y);
        const c = this.tileChar(tx, ty);
        if (c === undefined || c === ' ') return -Infinity;
        if (c === '~' && this.hazards.isGone(tx, ty)) return -Infinity;
        return TERRAIN_HEIGHT[c];
    }

    // Sort key for something standing at (x, y, z). Things on top of a block draw above that
    // block but below the blocks in front of it; things sinking into a pit draw under the floor.
    depthFor(x, y, z) {
        const tx = Math.floor(x), ty = Math.floor(y);
        if (z < -0.05) return IsoUtils.floorDepth(tx, ty) - 0.5;
        const d = IsoUtils.actorDepth(x, y);
        const h = this.heightAt(x, y);
        if (h >= 1 && z >= h - 0.05) return Math.max(d, IsoUtils.actorDepth(tx + 0.5, ty + 0.5) + 5);
        return d;
    }

    buildWorld() {
        const { grid, width, height } = this.level;
        const centre = IsoUtils.cartToIso(width / 2, height / 2);
        this.add.image(400 + 0.15 * (centre.x - 400), 300 + 0.15 * (centre.y - 300), 'bg')
            .setScrollFactor(0.15).setDepth(-100);

        this.blocks = [];
        const textures = { '#': 'wall', '=': 'crate', '^': 'spring', '~': 'crumble', 'V': 'vent' };
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile === ' ') return;
            const h = TERRAIN_HEIGHT[tile];
            const p = IsoUtils.cartToIso(x + 0.5, y + 0.5);
            const key = textures[tile] || `floor${(x + y) % 2}`;
            const sprite = this.add.image(p.x, p.y, key).setOrigin(0.5, IsoUtils.blockOriginY(h))
                .setDepth(h > 0 ? IsoUtils.actorDepth(x + 0.5, y + 0.5) : IsoUtils.floorDepth(x, y));
            this.hazards.add(tile, x, y, sprite);
            if (h > 0) this.blocks.push({ x, y, h, sprite });
        }));

        const pickup = (def, texture, frame, anim, scale) => {
            const x = def.x + 0.5, y = def.y + 0.5;
            const sprite = this.add.sprite(0, 0, texture, frame).setScale(scale);
            if (anim) sprite.play(anim);
            const item = { x, y, z: def.z, sprite, taken: false, phase: Math.random() * 6 };
            this.placePickup(item);
            return item;
        };
        this.coins = this.level.coins.map(c => pickup(c, 'objects', 0, 'core_spin', 0.6));
        this.gears = this.level.gears.map(g => pickup(g, 'objects', 8, 'gear_spin', 0.55));
        this.kits = this.level.kits.map(k => pickup(k, 'objects', 12, null, 0.6));

        const ex = this.level.exit.x + 0.5, ey = this.level.exit.y + 0.5;
        const p = IsoUtils.cartToIso(ex, ey, 0.75);
        this.portal = {
            x: ex, y: ey,
            sprite: this.add.sprite(p.x, p.y, 'objects', 4).setScale(0.9).setAlpha(0.3).setTint(0x666666)
                .setDepth(IsoUtils.actorDepth(ex, ey)).play('portal_spin')
        };
    }

    placePickup(item) {
        const z = item.z + 0.55 + Math.sin(this.time.now / 250 + item.phase) * 0.08;
        const p = IsoUtils.cartToIso(item.x, item.y, z);
        item.sprite.setPosition(p.x, p.y).setDepth(this.depthFor(item.x, item.y, item.z) + 1);
    }

    // ---------- Player ----------

    createPlayer() {
        const { start } = this.level;
        const x = start.x + 0.5, y = start.y + 0.5;
        this.player = {
            x, y, z: 0, vx: 0, vy: 0, vz: 0,
            onGround: true, coyote: 0, jumpBuffer: 0, jumpCuttable: false,
            dashT: 0, dashCooldown: 0, canDash: true, dashDir: { x: 1, y: 0 }, ghostT: 0,
            facing: { x: 1, y: 0 }, stunT: 0,
            lastSafe: { x, y, z: 0 },
            shadow: this.add.image(0, 0, 'shadow'),
            sprite: this.add.sprite(0, 0, 'player', 0).setOrigin(0.5, 0.875).setScale(0.8).play('player_idle')
        };
        this.syncPlayer();
    }

    blocked(x, y, z) {
        const r = CONFIG.playerRadius;
        return this.heightAt(x - r, y - r) > z + 0.01 || this.heightAt(x + r, y - r) > z + 0.01 ||
               this.heightAt(x - r, y + r) > z + 0.01 || this.heightAt(x + r, y + r) > z + 0.01;
    }

    updatePlayer(dt, input) {
        const P = this.player;

        // Screen-relative input -> tile-space direction (screen right = +x -y, screen down = +x +y)
        let dx = input.sx + input.sy;
        let dy = input.sy - input.sx;
        const len = Math.hypot(dx, dy);
        const mag = Math.min(1, Math.hypot(input.sx, input.sy));
        if (len > 0.01) {
            dx = dx / len * mag;
            dy = dy / len * mag;
            P.facing = { x: dx / mag, y: dy / mag };
        }

        P.jumpBuffer = input.jumpPressed ? CONFIG.jumpBuffer : P.jumpBuffer - dt;
        P.dashCooldown -= dt;
        P.stunT -= dt;
        if (P.onGround && P.dashT <= 0) P.canDash = true;

        if (input.dashPressed && P.canDash && P.dashCooldown <= 0 && P.stunT <= 0) this.startDash(len > 0.01 ? { x: dx / mag, y: dy / mag } : P.facing);

        if (P.dashT > 0) {
            P.dashT -= dt;
            P.vx = P.dashDir.x * CONFIG.dashSpeed;
            P.vy = P.dashDir.y * CONFIG.dashSpeed;
            P.vz = Math.max(P.vz, 0);
            P.ghostT -= dt;
            if (P.ghostT <= 0) { this.fx.afterimage(P.sprite); P.ghostT = 0.025; }
            if (P.dashT <= 0) { P.vx *= 0.3; P.vy *= 0.3; }
        } else if (P.stunT <= 0) {
            const k = 1 - Math.exp(-CONFIG.playerAccel * dt);
            P.vx += (dx * CONFIG.playerSpeed - P.vx) * k;
            P.vy += (dy * CONFIG.playerSpeed - P.vy) * k;
        }

        // Horizontal movement, one axis at a time so you slide along walls
        const nx = P.x + P.vx * dt;
        if (this.blocked(nx, P.y, P.z)) { if (P.dashT > 0) P.dashT = 0; P.vx = 0; } else P.x = nx;
        const ny = P.y + P.vy * dt;
        if (this.blocked(P.x, ny, P.z)) { if (P.dashT > 0) P.dashT = 0; P.vy = 0; } else P.y = ny;

        // Vertical movement
        const ground = this.heightAt(P.x, P.y);
        if (P.onGround && ground < P.z - 0.01) {
            P.onGround = false;
            P.coyote = CONFIG.coyoteTime;
            P.vz = 0;
        }
        if (!P.onGround) {
            P.coyote -= dt;
            if (P.dashT <= 0) {
                P.vz -= CONFIG.gravity * dt;
                if (!input.jumpHeld && P.jumpCuttable && P.vz > CONFIG.jumpCutVelocity) P.vz = CONFIG.jumpCutVelocity;
            }
            P.z += P.vz * dt;
            if (P.vz <= 0 && P.z <= ground) this.land(ground);
        }

        if (P.jumpBuffer > 0 && (P.onGround || P.coyote > 0) && P.stunT <= 0) this.jump();

        if (P.z < CONFIG.pitDepth) {
            this.fallIntoPit();
            return;
        }

        if (P.onGround) {
            const tile = this.tileChar(Math.floor(P.x), Math.floor(P.y));
            if (tile === '^') this.spring(Math.floor(P.x), Math.floor(P.y));
            else if (tile !== '~' && tile !== 'V') P.lastSafe = { x: Math.floor(P.x) + 0.5, y: Math.floor(P.y) + 0.5, z: P.z };
        }

        const moving = Math.hypot(P.vx, P.vy) > 0.5;
        const anim = !P.onGround ? 'player_jump' : (moving ? 'player_run' : 'player_idle');
        if (P.sprite.anims.getName() !== anim) P.sprite.play(anim);
        const screenDx = P.vx - P.vy;
        if (screenDx > 0.1) P.sprite.setFlipX(false);
        if (screenDx < -0.1) P.sprite.setFlipX(true);

        this.syncPlayer();
    }

    jump() {
        const P = this.player;
        P.vz = CONFIG.jumpVelocity;
        P.onGround = false;
        P.coyote = 0;
        P.jumpBuffer = 0;
        P.jumpCuttable = true;
        Sfx.play('jump');
        this.squash(0.8, 1.25);
        const g = IsoUtils.cartToIso(P.x, P.y, P.z);
        this.fx.burst('dust', g.x, g.y, 5);
    }

    land(ground) {
        const P = this.player;
        const impact = -P.vz;
        P.z = ground;
        P.vz = 0;
        P.onGround = true;
        P.jumpCuttable = false;
        if (impact > 3) {
            const g = IsoUtils.cartToIso(P.x, P.y, P.z);
            this.fx.burst('dust', g.x, g.y, impact > 9 ? 14 : 6);
            Sfx.play('land');
            this.squash(1.3, 0.7);
            if (impact > 12) this.cameras.main.shake(120, 0.006);
        }
    }

    spring(tx, ty) {
        const P = this.player;
        P.vz = CONFIG.springVelocity;
        P.onGround = false;
        P.jumpCuttable = false;
        P.canDash = true;
        Sfx.play('spring');
        this.hazards.bounceSpring(tx, ty);
        this.squash(0.7, 1.4);
        const g = IsoUtils.cartToIso(tx + 0.5, ty + 0.5);
        this.fx.burst('sparkle', g.x, g.y, 10);
    }

    startDash(dir) {
        const P = this.player;
        P.dashT = CONFIG.dashTime;
        P.dashDir = { ...dir };
        P.canDash = false;
        P.dashCooldown = CONFIG.dashCooldown + CONFIG.dashTime;
        P.jumpCuttable = false;
        P.ghostT = 0;
        Sfx.play('dash');
        this.cameras.main.shake(80, 0.004);
    }

    // Stomp rebound; holding jump bounces higher.
    bounce() {
        const P = this.player;
        P.vz = CONFIG.jumpVelocity * 0.85;
        P.onGround = false;
        P.jumpCuttable = true;
        P.canDash = true;
        this.squash(0.8, 1.25);
    }

    squash(sx, sy) {
        const s = this.player.sprite;
        this.tweens.killTweensOf(s);
        s.setScale(0.8 * sx, 0.8 * sy);
        this.tweens.add({ targets: s, scaleX: 0.8, scaleY: 0.8, duration: 160, ease: 'Back.easeOut' });
    }

    syncPlayer() {
        const P = this.player;
        const ground = this.heightAt(P.x, P.y);
        const depth = this.depthFor(P.x, P.y, P.z);
        if (ground > -Infinity && P.z >= ground - 0.05) {
            const g = IsoUtils.cartToIso(P.x, P.y, ground);
            P.shadow.setVisible(true).setPosition(g.x, g.y).setDepth(this.depthFor(P.x, P.y, ground) - 1)
                .setScale(1 - Math.min(P.z - ground, 2) * 0.2);
        } else {
            P.shadow.setVisible(false);
        }
        const p = IsoUtils.cartToIso(P.x, P.y, P.z);
        P.sprite.setPosition(p.x, p.y).setDepth(depth);
    }

    // Blocks in front of the player that cover its sprite turn see-through.
    updateOcclusion() {
        const P = this.player;
        const s = P.sprite;
        this.blocks.forEach(b => {
            const front = b.x + b.y + 1 > P.x + P.y && b.h > P.z;
            const covers = front && Math.abs(b.sprite.x - s.x) < 52 &&
                b.sprite.y - 16 - b.h * CONFIG.zScale < s.y && b.sprite.y + 24 > s.y - 40;
            const alpha = covers ? 0.45 : 1;
            if (b.sprite.alpha !== alpha) b.sprite.setAlpha(alpha);
        });
    }

    fallIntoPit() {
        const P = this.player;
        this.state = 'falling';
        Sfx.play('fall');
        this.resetCombo();
        this.tweens.killTweensOf(P.sprite);
        this.tweens.add({
            targets: P.sprite, y: P.sprite.y + 60, alpha: 0, scale: 0.4, duration: 350, ease: 'Quad.easeIn',
            onComplete: () => {
                this.damageTaken = true;
                if (this.loseHealth('Fell into a pit')) return;
                Object.assign(P, { ...P.lastSafe, vx: 0, vy: 0, vz: 0, onGround: true, dashT: 0, stunT: 0 });
                P.sprite.setScale(0.8).setAlpha(1);
                this.syncPlayer();
                this.fx.burst('sparkle', P.sprite.x, P.sprite.y - 20, 12);
                this.state = 'playing';
            }
        });
    }

    hurtPlayer(fromX, fromY, reason) {
        const P = this.player;
        if (this.invulnerableMs > 0 || P.dashT > 0 || this.state !== 'playing') return;
        this.damageTaken = true;
        this.resetCombo();
        Sfx.play('hurt');
        this.cameras.main.shake(250, 0.012);
        this.cameras.main.flash(120, 255, 40, 40);
        this.hitStop = 0.08;

        let kx = P.x - fromX, ky = P.y - fromY;
        const len = Math.hypot(kx, ky) || 1;
        kx /= len; ky /= len;
        P.vx = kx * 6; P.vy = ky * 6; P.vz = 4;
        P.onGround = false;
        P.jumpCuttable = false;
        P.stunT = 0.3;
        P.sprite.setTint(0xff4444);
        this.time.delayedCall(250, () => P.sprite.clearTint());
        this.loseHealth(reason);
    }

    // Returns true when the hit ended the run.
    loseHealth(reason) {
        this.health--;
        this.updateHUD();
        if (this.health <= 0) {
            this.endRun(reason);
            return true;
        }
        this.invulnerableMs = CONFIG.invulnerableMs;
        return false;
    }

    updateInvulnerability(delta) {
        if (this.invulnerableMs <= 0) return;
        this.invulnerableMs -= delta;
        const visible = this.invulnerableMs <= 0 || Math.floor(this.invulnerableMs / 80) % 2 === 0;
        this.player.sprite.setAlpha(visible ? 1 : 0.3);
    }

    // ---------- Scoring ----------

    addCombo() {
        this.combo.count++;
        this.combo.timer = CONFIG.comboWindow;
        return Math.min(this.combo.count, CONFIG.maxCombo);
    }

    resetCombo() {
        this.combo.count = 0;
        this.combo.timer = 0;
    }

    // Adds points with an optional combo multiplier and shows them where they were earned.
    addPoints(base, x, y, combo = true, color = '#ffff00') {
        const mult = combo ? this.addCombo() : 1;
        const points = base * mult;
        this.score += points;
        const p = IsoUtils.cartToIso(x, y, 1.2);
        this.fx.popup(p.x, p.y, mult > 1 ? `+${points} x${mult}` : `+${points}`, color, mult > 1 ? 20 : 16);
        this.updateHUD();
        return mult;
    }

    onKill(e, how) {
        const p = IsoUtils.cartToIso(e.x, e.y, e.hover + 0.4);
        this.fx.burst('boom', p.x, p.y, 16);
        Sfx.play('kill');
        this.hitStop = 0.06;
        this.cameras.main.shake(100, 0.006);
        this.addPoints(CONFIG.scores.kill, e.x, e.y, true, how === 'dash' ? '#00ffff' : '#ffff00');
    }

    // ---------- Pickups & portal ----------

    updatePickups(dt) {
        const P = this.player;
        const near = (it, r) => Math.hypot(P.x - it.x, P.y - it.y) < r && Math.abs(P.z - it.z) < 1;

        this.coins.forEach(c => {
            if (c.taken) return;
            // Cores within reach drift towards you
            const d = Math.hypot(P.x - c.x, P.y - c.y);
            if (d > 0.01 && d < 1.4 && Math.abs(P.z - c.z) < 1.2) {
                const pull = Math.min(d, 6 * dt);
                c.x += (P.x - c.x) / d * pull;
                c.y += (P.y - c.y) / d * pull;
                c.z += (P.z - c.z) * Math.min(1, 6 * dt);
            }
            this.placePickup(c);
            if (!near(c, 0.45)) return;
            this.take(c, 'sparkle');
            this.coinsCollected++;
            const mult = this.addPoints(CONFIG.scores.coin, c.x, c.y, true, '#00ffff');
            Sfx.play('collect', mult);
            if (this.coinsCollected === this.coins.length) this.openPortal();
            this.updateHUD();
        });

        this.gears.forEach(g => {
            if (g.taken) return;
            this.placePickup(g);
            if (!near(g, 0.5)) return;
            this.take(g, 'gold');
            this.gearFound = true;
            this.addPoints(CONFIG.scores.gear, g.x, g.y, false, '#ffd700');
            Sfx.play('gear');
            this.flash('SECRET GEAR FOUND!', '#ffd700');
            this.updateHUD();
        });

        this.kits.forEach(k => {
            if (k.taken) return;
            this.placePickup(k);
            if (!near(k, 0.5)) return;
            this.take(k, 'heal');
            Sfx.play('heal');
            if (this.health < CONFIG.maxHealth) {
                this.health++;
                const p = IsoUtils.cartToIso(k.x, k.y, 1.2);
                this.fx.popup(p.x, p.y, '+1 ♥', '#ff4466', 20);
            } else {
                this.addPoints(CONFIG.scores.kit, k.x, k.y, false);
            }
            this.updateHUD();
        });
    }

    take(item, burst) {
        item.taken = true;
        this.fx.burst(burst, item.sprite.x, item.sprite.y, 14);
        this.tweens.add({
            targets: item.sprite, y: item.sprite.y - 30, scale: item.sprite.scale * 1.6, alpha: 0, duration: 250,
            onComplete: () => item.sprite.destroy()
        });
    }

    openPortal() {
        this.portalActive = true;
        const s = this.portal.sprite;
        s.setAlpha(1).clearTint();
        this.tweens.add({ targets: s, scale: 1.05, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.fx.burst('sparkle', s.x, s.y, 30);
        Sfx.play('unlock');
        this.flash('PORTAL OPEN!', '#ff66ff');
        const cam = this.cameras.main;
        cam.zoomTo(1.08, 120, 'Sine.easeOut', true, (c, progress) => {
            if (progress === 1) cam.zoomTo(1, 300);
        });
    }

    checkPortal() {
        const P = this.player;
        const touching = Math.abs(P.z) < 0.5 && Math.hypot(P.x - this.portal.x, P.y - this.portal.y) < 0.5;
        if (!touching) {
            this.portalWarned = false;
            return;
        }
        if (this.portalActive) {
            this.completeLevel();
        } else if (!this.portalWarned) {
            this.portalWarned = true;
            this.flash(`${this.coins.length - this.coinsCollected} more Power Cores needed!`, '#ffffff');
        }
    }

    // ---------- Run end ----------

    completeLevel() {
        this.state = 'done';
        Sfx.stopMusic();
        Sfx.play('complete');

        const timeLeft = Math.max(0, Math.ceil(this.level.time - this.elapsed));
        const timeBonus = timeLeft * CONFIG.scores.timeBonusPerSecond;
        const noDamageBonus = this.damageTaken ? 0 : CONFIG.scores.noDamageBonus;
        this.score += timeBonus + noDamageBonus;
        const stars = [true, this.gearFound, this.elapsed <= this.level.par];

        const P = this.player;
        P.shadow.setVisible(false);
        this.tweens.killTweensOf(P.sprite);
        this.tweens.add({ targets: P.sprite, x: this.portal.sprite.x, y: this.portal.sprite.y, scale: 0, angle: 720, duration: 700 });
        this.fx.burst('sparkle', this.portal.sprite.x, this.portal.sprite.y, 40);

        this.time.delayedCall(800, () => {
            this.cameras.main.fadeOut(400);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('SceneLevelComplete', {
                    level: this.levelNumber, score: this.score, elapsed: this.elapsed,
                    timeBonus, noDamageBonus, stars, gearFound: this.gearFound
                });
            });
        });
    }

    endRun(reason) {
        this.state = 'over';
        Sfx.stopMusic();
        Sfx.play('gameover');
        this.cameras.main.shake(400, 0.02);
        this.time.delayedCall(1200, () => {
            this.scene.start('SceneGameOver', { level: this.levelNumber, score: this.score, reason });
        });
    }

    // ---------- HUD ----------

    createHUD() {
        const style = (color, size = 20) => ({ font: `bold ${size}px monospace`, fill: color, stroke: '#000000', strokeThickness: 4 });
        const fixed = (obj) => obj.setScrollFactor(0).setDepth(10000);
        const w = CONFIG.width;

        this.scoreText = fixed(this.add.text(16, 10, '', style('#00ff00')));
        this.timeText = fixed(this.add.text(16, 38, '', style('#00ffff')));
        this.healthText = fixed(this.add.text(16, 66, '', style('#ff4466', 24)));
        this.levelText = fixed(this.add.text(w - 16, 10, `${this.levelNumber}. ${this.level.name}`, style('#ff66ff')).setOrigin(1, 0));
        this.coinText = fixed(this.add.text(w - 16, 38, '', style('#00ffff')).setOrigin(1, 0));
        this.gearIcon = fixed(this.add.image(w - 28, 86, 'objects', 8).setScale(0.4).setAlpha(this.gears.length ? 0.25 : 0));
        this.comboText = fixed(this.add.text(w / 2, 14, '', style('#ffaa00', 26)).setOrigin(0.5, 0));
        this.comboBar = fixed(this.add.rectangle(w / 2, 48, 0, 5, 0xffaa00).setOrigin(0.5, 0.5));
        this.messageText = fixed(this.add.text(w / 2, 130, '', style('#ffffff', 26)).setOrigin(0.5).setAlpha(0));
        this.hintText = fixed(this.add.text(w / 2, CONFIG.height - 70, '', {
            font: '18px monospace', fill: '#ffffff', stroke: '#000000', strokeThickness: 4, backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setAlpha(0));
        this.arrow = fixed(this.add.triangle(0, 0, 0, -10, 22, 0, 0, 10, 0x00ffff).setVisible(false));

        this.updateHUD();
        this.flash(`${this.levelNumber}. ${this.level.name}`, '#ff66ff');
        this.showHints([...this.level.hints]);
    }

    updateHUD() {
        const hp = Math.max(0, this.health);
        this.scoreText.setText(`SCORE ${this.score}`);
        this.healthText.setText('♥'.repeat(hp) + '♡'.repeat(CONFIG.maxHealth - hp));
        this.coinText.setText(`CORES ${this.coinsCollected}/${this.coins.length}`);
        if (this.gearFound) this.gearIcon.setAlpha(1);
    }

    updateHUDFrame(dt) {
        const left = Math.max(0, this.level.time - this.elapsed);
        const secs = Math.ceil(left);
        this.timeText.setText(`TIME ${secs}`).setColor(secs <= 10 ? '#ff3333' : '#00ffff');
        if (secs <= 10 && secs !== this.lastTick && this.state === 'playing') {
            this.lastTick = secs;
            Sfx.play('tick');
            Sfx.setTempo(1.35);
            this.tweens.add({ targets: this.timeText, scale: 1.3, duration: 100, yoyo: true });
        }

        if (this.combo.timer > 0) {
            this.combo.timer -= dt;
            if (this.combo.timer <= 0) this.resetCombo();
        }
        const mult = Math.min(this.combo.count, CONFIG.maxCombo);
        this.comboText.setText(mult > 1 ? `COMBO x${mult}` : '');
        this.comboBar.setSize(mult > 1 ? 160 * this.combo.timer / CONFIG.comboWindow : 0, 5);

        this.updateArrow();
    }

    // Points at the nearest remaining core (or the open portal) when it is off screen.
    updateArrow() {
        const P = this.player;
        let target = null;
        if (this.portalActive) target = this.portal;
        else {
            let best = Infinity;
            this.coins.forEach(c => {
                const d = Math.hypot(c.x - P.x, c.y - P.y);
                if (!c.taken && d < best) { best = d; target = c; }
            });
        }
        if (!target) return this.arrow.setVisible(false);
        const view = this.cameras.main.worldView;
        const p = IsoUtils.cartToIso(target.x, target.y, 0.5);
        const margin = 30;
        if (Phaser.Geom.Rectangle.Contains(view, p.x, p.y)) return this.arrow.setVisible(false);
        const sx = p.x - view.x, sy = p.y - view.y;
        const cx = CONFIG.width / 2, cy = CONFIG.height / 2;
        const angle = Math.atan2(sy - cy, sx - cx);
        const ax = Phaser.Math.Clamp(sx, margin, CONFIG.width - margin);
        const ay = Phaser.Math.Clamp(sy, margin + 80, CONFIG.height - margin);
        this.arrow.setVisible(true).setPosition(ax, ay).setRotation(angle)
            .setFillStyle(this.portalActive ? 0xff66ff : 0x00ffff)
            .setAlpha(0.6 + Math.sin(this.time.now / 150) * 0.3);
    }

    flash(message, color = '#ffffff') {
        this.tweens.killTweensOf(this.messageText);
        this.messageText.setText(message).setColor(color).setAlpha(1).setScale(0.6);
        this.tweens.add({ targets: this.messageText, scale: 1, duration: 250, ease: 'Back.easeOut' });
        this.tweens.add({ targets: this.messageText, alpha: 0, delay: 1400, duration: 400 });
    }

    showHints(hints) {
        if (!hints.length) return;
        const touch = this.sys.game.device.input.touch;
        const words = touch
            ? { move: 'Drag the left side', jump: 'tap the right side', dash: 'The DASH button' }
            : { move: 'Arrows / WASD', jump: 'SPACE', dash: 'SHIFT' };
        const hint = hints.shift().replace(/\{(\w+)\}/g, (m, k) => words[k] || m);
        this.hintText.setText(hint).setAlpha(0);
        this.tweens.add({
            targets: this.hintText, alpha: 1, duration: 300, delay: 600, hold: 3200, yoyo: true,
            onComplete: () => this.showHints(hints)
        });
    }

    // ---------- Input ----------

    createInput() {
        this.keys = this.input.keyboard.addKeys({
            up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
            jump: 'SPACE', jumpAlt: 'J', dash: 'SHIFT', dashAlt: 'X', dashAlt2: 'K'
        });
        this.input.keyboard.on('keydown-M', () => this.flash(Sfx.toggleMute() ? 'Sound off' : 'Sound on'));
        this.input.keyboard.on('keydown-ESC', () => this.setPaused(!this.paused));
        this.input.keyboard.on('keydown-P', () => this.setPaused(!this.paused));
        this.input.keyboard.on('keydown-R', () => this.paused && this.restart());
        this.input.keyboard.on('keydown-Q', () => this.paused && this.quit());

        this.createPauseOverlay();
        if (this.sys.game.device.input.touch) this.createTouchControls();
    }

    pad() {
        const gp = this.input.gamepad;
        return gp && gp.total > 0 ? gp.getPad(0) : null;
    }

    padPressed(pad, i) {
        const now = !!(pad && pad.buttons[i] && pad.buttons[i].pressed);
        const was = this.padPrev[i];
        this.padPrev[i] = now;
        return now && !was;
    }

    readInput() {
        const k = this.keys;
        const JD = Phaser.Input.Keyboard.JustDown;
        let sx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
        let sy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
        let jumpPressed = JD(k.jump) || JD(k.jumpAlt);
        let jumpHeld = k.jump.isDown || k.jumpAlt.isDown;
        let dashPressed = JD(k.dash) || JD(k.dashAlt) || JD(k.dashAlt2);

        const pad = this.pad();
        if (pad) {
            const stick = { x: pad.leftStick.x, y: pad.leftStick.y };
            if (Math.hypot(stick.x, stick.y) > 0.25) { sx = stick.x; sy = stick.y; }
            if (pad.left) sx = -1;
            if (pad.right) sx = 1;
            if (pad.up) sy = -1;
            if (pad.down) sy = 1;
            jumpPressed = this.padPressed(pad, 0) || jumpPressed;
            jumpHeld = jumpHeld || pad.A;
            dashPressed = this.padPressed(pad, 2) || this.padPressed(pad, 1) || dashPressed;
            if (this.padPressed(pad, 9)) this.setPaused(true);
        }

        const t = this.touch;
        if (Math.hypot(t.vec.x, t.vec.y) > 0.25) { sx = t.vec.x; sy = t.vec.y; }
        jumpPressed = jumpPressed || t.jumpPressed;
        jumpHeld = jumpHeld || t.jumpId !== null;
        dashPressed = dashPressed || t.dashPressed;
        t.jumpPressed = false;
        t.dashPressed = false;

        return { sx, sy, jumpPressed, jumpHeld, dashPressed };
    }

    // Left half: floating joystick. Right half: jump (hold for height), or the DASH button.
    // Native touch listeners on window so touches starting in the letterbox bars still work.
    createTouchControls() {
        const fixed = (obj) => obj.setScrollFactor(0).setDepth(10000);
        const w = CONFIG.width, h = CONFIG.height;
        const stickBase = fixed(this.add.circle(0, 0, 50, 0xffffff, 0.12).setVisible(false));
        const stickKnob = fixed(this.add.circle(0, 0, 22, 0xffffff, 0.35).setVisible(false));
        const jumpBtn = { x: w - 80, y: h - 90, r: 55 };
        const dashBtn = { x: w - 200, y: h - 60, r: 40 };
        const pauseBtn = { x: w / 2, y: h - 30, r: 28 };
        fixed(this.add.circle(jumpBtn.x, jumpBtn.y, jumpBtn.r, 0xffffff, 0.15));
        fixed(this.add.text(jumpBtn.x, jumpBtn.y, 'JUMP', { font: 'bold 18px monospace', fill: '#ffffff' }).setOrigin(0.5));
        fixed(this.add.circle(dashBtn.x, dashBtn.y, dashBtn.r, 0x00ffff, 0.15));
        fixed(this.add.text(dashBtn.x, dashBtn.y, 'DASH', { font: 'bold 16px monospace', fill: '#00ffff' }).setOrigin(0.5));
        fixed(this.add.text(pauseBtn.x, pauseBtn.y, 'II', { font: 'bold 22px monospace', fill: '#ffffff' }).setOrigin(0.5).setAlpha(0.6));
        this.hintText.setY(h - 150);

        const t = this.touch;
        const toGame = (touch) => ({ x: this.scale.transformX(touch.pageX), y: this.scale.transformY(touch.pageY) });
        const inside = (p, b) => Math.hypot(p.x - b.x, p.y - b.y) < b.r;

        const onStart = (ev) => {
            Sfx.unlock();
            for (const touch of ev.changedTouches) {
                const p = toGame(touch);
                if (this.paused) continue; // the pause overlay handles its own taps
                if (inside(p, pauseBtn)) this.setPaused(true);
                else if (inside(p, dashBtn)) t.dashPressed = true;
                else if (p.x >= w / 2) { t.jumpPressed = true; t.jumpId = touch.identifier; }
                else if (t.stickId === null) {
                    t.stickId = touch.identifier;
                    t.origin = p;
                    stickBase.setPosition(p.x, p.y).setVisible(true);
                    stickKnob.setPosition(p.x, p.y).setVisible(true);
                }
            }
        };
        const onMove = (ev) => {
            for (const touch of ev.changedTouches) {
                if (touch.identifier !== t.stickId) continue;
                const p = toGame(touch);
                const len = Math.min(50, Math.hypot(p.x - t.origin.x, p.y - t.origin.y));
                const angle = Math.atan2(p.y - t.origin.y, p.x - t.origin.x);
                stickKnob.setPosition(t.origin.x + Math.cos(angle) * len, t.origin.y + Math.sin(angle) * len);
                t.vec = { x: Math.cos(angle) * len / 50, y: Math.sin(angle) * len / 50 };
            }
        };
        const onEnd = (ev) => {
            for (const touch of ev.changedTouches) {
                if (touch.identifier === t.jumpId) t.jumpId = null;
                if (touch.identifier === t.stickId) {
                    t.stickId = null;
                    t.vec = { x: 0, y: 0 };
                    stickBase.setVisible(false);
                    stickKnob.setVisible(false);
                }
            }
        };

        const listeners = { touchstart: onStart, touchmove: onMove, touchend: onEnd, touchcancel: onEnd };
        Object.entries(listeners).forEach(([type, fn]) => window.addEventListener(type, fn));
        this.events.once('shutdown', () => {
            Object.entries(listeners).forEach(([type, fn]) => window.removeEventListener(type, fn));
        });
    }

    // ---------- Pause ----------

    createPauseOverlay() {
        const w = CONFIG.width, h = CONFIG.height;
        const style = (size, color) => ({ font: `bold ${size}px monospace`, fill: color, stroke: '#000000', strokeThickness: 4 });
        this.pauseButtons = [
            { label: 'RESUME', y: 290, action: () => this.setPaused(false) },
            { label: 'RESTART', y: 350, action: () => this.restart() },
            { label: 'QUIT', y: 410, action: () => this.quit() }
        ];
        this.pauseOverlay = this.add.container(0, 0, [
            this.add.rectangle(0, 0, w, h, 0x000000, 0.7).setOrigin(0),
            this.add.text(w / 2, 180, 'PAUSED', style(56, '#00ffff')).setOrigin(0.5),
            ...this.pauseButtons.map(b => this.add.text(w / 2, b.y, b.label, style(30, '#ffffff')).setOrigin(0.5)),
            this.add.text(w / 2, 490, 'Esc/P resume   R restart   Q quit', style(16, '#888888')).setOrigin(0.5)
        ]).setScrollFactor(0).setDepth(20000).setVisible(false);
        this.pauseOverlay.list[0].setInteractive().on('pointerdown', (p) => this.handlePauseTap(p));
    }

    handlePauseTap(p) {
        const hit = this.pauseButtons.find(b => Math.abs(p.y - b.y) < 25 && Math.abs(p.x - CONFIG.width / 2) < 120);
        if (hit) hit.action();
    }

    setPaused(paused) {
        if (paused === this.paused || (paused && this.state !== 'playing' && this.state !== 'falling')) return;
        this.paused = paused;
        this.pauseOverlay.setVisible(paused);
        this.time.paused = paused;
        if (paused) {
            this.tweens.pauseAll();
            Sfx.stopMusic();
        } else {
            this.tweens.resumeAll();
            Sfx.startMusic();
        }
    }

    restart() {
        this.scene.restart({ level: this.levelNumber });
    }

    quit() {
        this.scene.start('SceneLevelSelect');
    }

    // ---------- Loop ----------

    update(time, delta) {
        if (this.paused) return;
        const dt = Math.min(delta, 50) / 1000;
        if (this.hitStop > 0) {
            this.hitStop -= dt;
            return;
        }

        if (this.state === 'playing') {
            this.elapsed += dt;
            if (this.elapsed >= this.level.time) {
                this.updateHUDFrame(dt);
                this.endRun('Out of time');
                return;
            }
            this.updatePlayer(dt, this.readInput());
        }
        if (this.state === 'playing') {
            this.hazards.update(dt);
            this.enemies.update(dt);
            this.enemies.checkPlayer(this.player);
        }
        if (this.state === 'playing') {
            this.updatePickups(dt);
            this.checkPortal();
            this.updateInvulnerability(delta);
        }
        this.updateHUDFrame(dt);
        this.updateOcclusion();

        // Camera leads slightly in the direction of travel
        const P = this.player;
        const ground = Math.max(0, Math.min(P.z, this.heightAt(P.x, P.y)));
        const look = IsoUtils.cartToIso(P.x + P.vx * 0.25, P.y + P.vy * 0.25, ground);
        this.camTarget.x = look.x;
        this.camTarget.y = look.y;
    }
}
