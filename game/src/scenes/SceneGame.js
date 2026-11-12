// SceneGame - grid-based isometric gameplay.
// World state lives in cartesian tile space (x, y) plus height z; sprites are projected each frame.

class SceneGame extends Phaser.Scene {
    constructor() {
        super({ key: 'SceneGame' });
    }

    // Scene instances are reused between runs, so every piece of per-run state is reset here.
    init(data) {
        this.levelNumber = data.level || 1;
        this.score = data.score || 0;
        this.seed = data.seed !== undefined ? data.seed : Math.floor(Math.random() * 1e9);
        this.levelStartScore = this.score;
        this.level = LevelGen.generate(this.levelNumber, this.seed);
        this.state = 'playing'; // playing | falling | over | done
        this.health = CONFIG.maxHealth;
        this.timeLeft = this.level.time;
        this.coinsCollected = 0;
        this.invulnerableMs = 0;
        this.portalActive = false;
        this.portalWarned = false;
        this.jumpQueued = false;
        this.stickId = null;
        this.touchVec = { x: 0, y: 0 };
        this.touchUI = null; // previous run's controls were destroyed with the scene
    }

    create() {
        // World and HUD live in separate layers seen by separate cameras, so zooming the world leaves the HUD alone.
        this.world = this.add.layer();
        this.hud = this.add.layer();
        this.buildWorld();
        this.createPlayer();
        this.createEnemies();
        this.createHUD();
        this.createInput();
        this.createCameras();

        Sfx.startMusic();
        this.events.once('shutdown', () => Sfx.stopMusic());
    }

    inWorld(obj) {
        this.world.add(obj);
        return obj;
    }

    inHud(obj) {
        this.hud.add(obj);
        return obj;
    }

    // ---------- World ----------

    cell(x, y) {
        const row = this.level.grid[Math.floor(y)];
        const v = row && row[Math.floor(x)];
        return v === undefined ? LevelGen.WALL : v;
    }

    // Height of the surface of a cell in z: -Infinity for pits, Infinity for walls.
    top(x, y) {
        const v = this.cell(x, y);
        if (v === LevelGen.PIT) return -Infinity;
        if (v === LevelGen.WALL) return Infinity;
        return v * CONFIG.levelZ;
    }

    corners(x, y, r) {
        return [[x - r, y - r], [x + r, y - r], [x - r, y + r], [x + r, y + r]];
    }

    // Highest surface under a footprint, so an actor stands on a ledge as long as any part of it is over it.
    groundAt(x, y, r = CONFIG.playerRadius) {
        return Math.max(...this.corners(x, y, r).map(([cx, cy]) => this.top(cx, cy)));
    }

    blocked(x, y, z, r = CONFIG.playerRadius) {
        return this.corners(x, y, r).some(([cx, cy]) => this.top(cx, cy) > z + CONFIG.stepTolerance);
    }

    // Draw after every cell the footprint is standing on or above; cells that rise above it still cover it.
    depthAt(x, y, z, r) {
        let diagonal = Math.floor(x) + Math.floor(y);
        for (const [cx, cy] of this.corners(x, y, r)) {
            const t = this.top(cx, cy);
            if (t > -Infinity && t <= z + 0.05) diagonal = Math.max(diagonal, Math.floor(cx) + Math.floor(cy));
        }
        return IsoUtils.cellDepth(diagonal, 6);
    }

    // Walls rise above the floor around them; border walls along the front edges stay low so they hide less.
    wallLevels(x, y) {
        const { grid, width, height } = this.level;
        let max = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const v = grid[y + dy] && grid[y + dy][x + dx];
            if (v !== undefined && v !== LevelGen.WALL && v > max) max = v;
        }
        return max + (x === width - 1 || y === height - 1 ? 1 : 2);
    }

    buildWorld() {
        const { grid, coins, exit, width: W, height: H } = this.level;
        let tallest = 0;

        grid.forEach((row, y) => row.forEach((v, x) => {
            if (v === LevelGen.PIT) return;
            if (v === 0) {
                const p = IsoUtils.cartToIso(x + 0.5, y + 0.5);
                this.inWorld(this.add.image(p.x, p.y, 'tiles', (x + y) % 2).setOrigin(0.5, 0.625)
                    .setDepth(IsoUtils.floorDepth(x, y)));
                return;
            }
            const levels = v === LevelGen.WALL ? this.wallLevels(x, y) : v;
            const key = v === LevelGen.WALL ? Blocks.wall(this, levels) : Blocks.floor(this, levels, (x + y) % 2);
            const p = IsoUtils.cartToIso(x + 0.5, y + 0.5, levels * CONFIG.levelZ);
            this.inWorld(this.add.image(p.x, p.y, key).setOrigin(0.5, Blocks.originY(levels))
                .setDepth(IsoUtils.cellDepth(x + y, 2)));
            tallest = Math.max(tallest, levels);
        }));

        // Projected extent of the whole level, used to fit the camera.
        const left = IsoUtils.cartToIso(0, H).x, right = IsoUtils.cartToIso(W, 0).x;
        const topY = IsoUtils.cartToIso(0, 0, tallest * CONFIG.levelZ).y, bottomY = IsoUtils.cartToIso(W, H).y + 8;
        this.bounds = new Phaser.Geom.Rectangle(left, topY, right - left, bottomY - topY);

        this.coins = coins.map(c => {
            const x = c.x + 0.5, y = c.y + 0.5;
            const p = IsoUtils.cartToIso(x, y, this.top(x, y) + 0.6);
            const sprite = this.inWorld(this.add.sprite(p.x, p.y, 'objects', 0).setScale(0.6)
                .setDepth(IsoUtils.cellDepth(c.x + c.y, 6)).play('core_spin'));
            this.tweens.add({ targets: sprite, y: p.y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            return { x, y, z: this.top(x, y), sprite, collected: false };
        });

        const ex = exit.x + 0.5, ey = exit.y + 0.5;
        const p = IsoUtils.cartToIso(ex, ey, this.top(ex, ey) + 0.75);
        this.portal = {
            x: ex,
            y: ey,
            z: this.top(ex, ey),
            sprite: this.inWorld(this.add.sprite(p.x, p.y, 'objects', 4).setScale(0.9).setAlpha(0.3)
                .setDepth(IsoUtils.cellDepth(exit.x + exit.y, 6)).play('portal_spin'))
        };
    }

    // ---------- Camera ----------

    createCameras() {
        const cam = this.cameras.main;
        this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
        cam.ignore(this.hud);
        this.uiCam.ignore(this.world);
        cam.setRoundPixels(true);
        this.fitCamera();
        cam.fadeIn(400);
        this.uiCam.fadeIn(400);

        this.scale.on('resize', this.onResize, this);
        this.events.once('shutdown', () => this.scale.off('resize', this.onResize, this));
    }

    onResize(gameSize) {
        this.uiCam.setSize(gameSize.width, gameSize.height);
        this.layoutHUD();
        this.fitCamera();
    }

    // Show the whole level when it fits at a readable zoom; otherwise zoom to the readable minimum and follow.
    fitCamera() {
        const cam = this.cameras.main;
        const { width: w, height: h } = this.scale;
        const b = this.bounds;
        const hudPad = 96 * UI.scaleFor(w, h);
        const fit = Math.min(w / b.width, (h - hudPad) / b.height) * 0.96;
        const readable = Phaser.Math.Clamp(Math.min(w, h) / CONFIG.zoom.refSize, CONFIG.zoom.min, 1.6);
        const zoom = Phaser.Math.Clamp(fit, readable, CONFIG.zoom.max);
        cam.setZoom(zoom);
        if (fit >= readable) {
            cam.stopFollow();
            cam.removeBounds();
            cam.centerOn(b.centerX, b.centerY - hudPad / 2 / zoom);
        } else {
            // Bounds at least as large as the view, centred on the level, so a level that fits along one
            // axis stays centred on that axis instead of sticking to the top or left edge.
            const vw = w / zoom, vh = h / zoom, top = hudPad / zoom;
            const bw = Math.max(b.width + 96, vw), bh = Math.max(b.height + 96 + top, vh);
            cam.setBounds(b.centerX - bw / 2, b.centerY - top / 2 - bh / 2, bw, bh);
            cam.startFollow(this.player.shadow, true, 0.12, 0.12);
        }
    }

    // ---------- Player ----------

    createPlayer() {
        const { start } = this.level;
        const x = start.x + 0.5, y = start.y + 0.5;
        const z = this.top(x, y);
        this.player = {
            x, y, z, vz: 0,
            lastSafe: { x, y, z },
            shadow: this.inWorld(this.add.image(0, 0, 'shadow')),
            sprite: this.inWorld(this.add.sprite(0, 0, 'player', 0).setOrigin(0.5, 0.875).setScale(0.8).play('player_idle'))
        };
        this.syncPlayer();
    }

    syncPlayer() {
        const P = this.player;
        const ground = this.groundAt(P.x, P.y);
        const depth = this.depthAt(P.x, P.y, P.z, CONFIG.playerRadius);
        if (ground > -Infinity) {
            const g = IsoUtils.cartToIso(P.x, P.y, ground);
            P.shadow.setPosition(g.x, g.y).setScale(1 - Math.min(P.z - ground, 1) * 0.4);
        }
        P.shadow.setVisible(ground > -Infinity).setDepth(depth - 1);
        const s = IsoUtils.cartToIso(P.x, P.y, P.z);
        P.sprite.setPosition(s.x, s.y).setDepth(depth);
    }

    readInput() {
        const k = this.keys;
        let sx = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
        let sy = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
        if (Math.hypot(this.touchVec.x, this.touchVec.y) > 0.25) {
            sx = this.touchVec.x;
            sy = this.touchVec.y;
        }
        const jump = Phaser.Input.Keyboard.JustDown(k.jump) || this.jumpQueued;
        this.jumpQueued = false;
        return { sx, sy, jump };
    }

    updatePlayer(dt) {
        const P = this.player;
        const input = this.readInput();

        // Screen-relative input -> cartesian direction (screen right = +x -y, screen down = +x +y)
        let dx = input.sx + input.sy;
        let dy = input.sy - input.sx;
        const len = Math.hypot(dx, dy);
        if (len > 0) { dx /= len; dy /= len; }

        // Anything higher than the player's feet blocks; jumping lifts the feet over ledges.
        const step = CONFIG.playerSpeed * dt;
        if (!this.blocked(P.x + dx * step, P.y, P.z)) P.x += dx * step;
        if (!this.blocked(P.x, P.y + dy * step, P.z)) P.y += dy * step;

        const ground = this.groundAt(P.x, P.y);
        const grounded = P.z <= ground + CONFIG.stepTolerance && P.vz <= 0;
        if (grounded) {
            P.z = ground;
            P.vz = 0;
        }
        if (input.jump && grounded) {
            P.vz = CONFIG.jumpVelocity;
            Sfx.play('jump');
        }
        if (!grounded || P.vz > 0) {
            P.vz -= CONFIG.gravity * dt;
            P.z += P.vz * dt;
            if (P.z <= ground) {
                P.z = ground;
                P.vz = 0;
            }
        }

        if (ground === -Infinity && P.z < -0.3) {
            this.fallIntoPit();
            return;
        }
        // Respawn points are only taken from the region that can always get back to the start.
        const cx = Math.floor(P.x), cy = Math.floor(P.y);
        if (P.z === ground && this.top(P.x, P.y) === ground && this.level.safe.has(cy * this.level.width + cx)) {
            P.lastSafe = { x: cx + 0.5, y: cy + 0.5, z: ground };
        }

        const anim = P.z > ground ? 'player_jump' : (len > 0 ? 'player_run' : 'player_idle');
        if (P.sprite.anims.getName() !== anim) P.sprite.play(anim);
        const screenDx = dx - dy;
        if (screenDx > 0.01) P.sprite.setFlipX(false);
        if (screenDx < -0.01) P.sprite.setFlipX(true);

        this.syncPlayer();
    }

    fallIntoPit() {
        const P = this.player;
        this.state = 'falling';
        Sfx.play('fall');
        P.shadow.setVisible(false);
        P.sprite.setDepth(IsoUtils.floorDepth(Math.floor(P.x), Math.floor(P.y)) - 0.5);

        this.tweens.add({
            targets: P.sprite,
            y: P.sprite.y + 90,
            scale: 0.3,
            alpha: 0,
            duration: 500,
            ease: 'Quad.easeIn',
            onComplete: () => {
                if (this.loseHealth('Fell into a pit')) return;
                Object.assign(P, P.lastSafe, { vz: 0 });
                P.sprite.setScale(0.8).setAlpha(1);
                this.syncPlayer();
                this.state = 'playing';
            }
        });
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
        const visible = this.invulnerableMs <= 0 || Math.floor(this.invulnerableMs / 100) % 2 === 0;
        this.player.sprite.setAlpha(visible ? 1 : 0.3);
    }

    // ---------- Enemies ----------

    createEnemies() {
        this.enemies = this.level.enemies.map(e => {
            const drone = e.type === 'drone';
            const h = this.level.grid[e.y][e.x];
            return {
                type: e.type,
                x: e.x + 0.5,
                y: e.y + 0.5,
                h, // patrols only across cells of this height
                baseZ: h * CONFIG.levelZ,
                axis: drone ? 'x' : 'y',
                dir: Math.random() < 0.5 ? 1 : -1,
                speed: (drone ? 1.8 : 1.1) * this.level.enemySpeed,
                hover: drone ? 0.35 : 0,
                bob: Math.random() * Math.PI * 2,
                alive: true,
                sprite: this.inWorld(this.add.sprite(0, 0, 'enemies', drone ? 0 : 4).setOrigin(0.5, 0.875)
                    .setScale(0.85).play(drone ? 'drone_move' : 'blob_move'))
            };
        });
        this.enemies.forEach(e => this.syncEnemy(e));
    }

    updateEnemies(dt) {
        this.enemies.forEach(e => {
            if (!e.alive) return;
            const next = e[e.axis] + e.dir * e.speed * dt;
            const lead = next + e.dir * 0.5;
            const cell = e.axis === 'x' ? this.cell(lead, e.y) : this.cell(e.x, lead);
            if (cell === e.h) e[e.axis] = next;
            else e.dir *= -1;
            e.bob += dt * 4;
            e.sprite.setFlipX(e.axis === 'x' ? e.dir < 0 : e.dir > 0);
            this.syncEnemy(e);
        });
    }

    syncEnemy(e) {
        const z = e.baseZ + e.hover + (e.type === 'drone' ? Math.sin(e.bob) * 0.08 : 0);
        const p = IsoUtils.cartToIso(e.x, e.y, z);
        e.sprite.setPosition(p.x, p.y).setDepth(this.depthAt(e.x, e.y, e.baseZ, 0.3));
    }

    checkEnemies() {
        const P = this.player;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const ez = e.baseZ + e.hover;
            if (Math.hypot(P.x - e.x, P.y - e.y) > 0.6 || Math.abs(P.z - ez) > 0.8) continue;

            if (P.vz < 0 && P.z > ez + 0.1) {
                this.stomp(e);
            } else if (this.invulnerableMs <= 0) {
                Sfx.play('hurt');
                this.cameras.main.shake(200, 0.01);
                P.sprite.setTint(0xff4444);
                this.time.delayedCall(200, () => P.sprite.clearTint());
                if (this.loseHealth(e.type === 'drone' ? 'Zapped by a Spark Drone' : 'Slimed by a Leak Blob')) return;
            }
        }
    }

    stomp(e) {
        e.alive = false;
        this.player.vz = CONFIG.jumpVelocity * 0.7;
        this.addScore(CONFIG.scores.stomp);
        Sfx.play('stomp');
        this.tweens.add({
            targets: e.sprite,
            scaleY: 0.1,
            alpha: 0,
            duration: 250,
            onComplete: () => e.sprite.destroy()
        });
    }

    // ---------- Pickups & portal ----------

    checkPickups() {
        const P = this.player;
        this.coins.forEach(c => {
            const dz = P.z - c.z;
            if (c.collected || dz > 1 || dz < -0.3 || Math.hypot(P.x - c.x, P.y - c.y) > 0.5) return;
            c.collected = true;
            this.coinsCollected++;
            this.addScore(CONFIG.scores.coin);
            Sfx.play('collect');
            this.tweens.killTweensOf(c.sprite);
            this.tweens.add({
                targets: c.sprite,
                y: c.sprite.y - 30,
                scale: 1,
                alpha: 0,
                duration: 300,
                onComplete: () => c.sprite.destroy()
            });
            if (this.coinsCollected === this.coins.length) {
                this.portalActive = true;
                this.portal.sprite.setAlpha(1);
                Sfx.play('unlock');
                this.flash('Portal open!');
            }
        });
    }

    checkPortal() {
        const P = this.player;
        const dz = P.z - this.portal.z;
        const touching = dz < 0.5 && dz > -0.3 && Math.hypot(P.x - this.portal.x, P.y - this.portal.y) < 0.5;
        if (!touching) {
            this.portalWarned = false;
            return;
        }
        if (this.portalActive) {
            this.completeLevel();
        } else if (!this.portalWarned) {
            this.portalWarned = true;
            this.flash('Collect all Power Cores first!');
        }
    }

    completeLevel() {
        this.state = 'done';
        Sfx.stopMusic();
        Sfx.play('complete');

        const timeBonus = Math.ceil(this.timeLeft) * CONFIG.scores.timeBonusPerSecond;
        const coinBonus = this.coinsCollected * CONFIG.scores.coinBonus;
        this.addScore(timeBonus + coinBonus);

        this.tweens.add({
            targets: this.player.sprite,
            x: this.portal.sprite.x,
            y: this.portal.sprite.y,
            scale: 0,
            angle: 360,
            duration: 600
        });
        this.player.shadow.setVisible(false);

        this.time.delayedCall(700, () => {
            this.cameras.main.fadeOut(500);
            this.uiCam.fadeOut(500);
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('SceneLevelComplete', {
                    level: this.levelNumber,
                    seed: this.seed,
                    name: this.level.name,
                    score: this.score,
                    timeLeft: Math.ceil(this.timeLeft),
                    coins: this.coinsCollected,
                    totalCoins: this.coins.length,
                    timeBonus,
                    coinBonus
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
            this.scene.start('SceneGameOver', {
                level: this.levelNumber,
                score: this.score,
                retryScore: this.levelStartScore,
                seed: this.seed,
                reason
            });
        });
    }

    // ---------- HUD ----------

    createHUD() {
        const style = (color) => ({ font: '20px monospace', fill: color, stroke: '#000000', strokeThickness: 3 });
        const add = (obj) => this.inHud(obj.setScrollFactor(0).setDepth(10000));

        this.scoreText = add(this.add.text(0, 0, '', style('#00ff00')));
        this.timeText = add(this.add.text(0, 0, '', style('#00ffff')));
        this.healthText = add(this.add.text(0, 0, '', style('#ff4444')));
        this.levelText = add(this.add.text(0, 0, `Level ${this.levelNumber}: ${this.level.name}`, style('#ff00ff')).setOrigin(1, 0));
        this.coinText = add(this.add.text(0, 0, '', style('#ffff00')).setOrigin(1, 0));
        this.messageText = add(this.add.text(0, 0, '', {
            font: '24px monospace', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0));

        this.layoutHUD();
        this.updateHUD();
        this.flash(`Level ${this.levelNumber}: ${this.level.name}`);
    }

    // Positions and sizes every HUD element for the current screen size.
    layoutHUD() {
        const { width: w, height: h } = this.scale;
        const s = UI.scaleFor(w, h);
        const font = (t, px) => t.setFontSize(Math.round(px * s)).setStroke('#000000', Math.max(2, 3 * s));
        [this.scoreText, this.timeText, this.healthText].forEach((t, i) => font(t, 20).setPosition(16 * s, (12 + 28 * i) * s));
        [this.levelText, this.coinText].forEach((t, i) => font(t, 20).setPosition(w - 16 * s, (12 + 28 * i) * s));
        font(this.messageText, 24).setPosition(w / 2, 120 * s);
        if (this.touchUI) {
            const t = this.touchUI;
            t.jump.setPosition(w - 90 * s, h - 90 * s).setRadius(50 * s);
            font(t.jumpLabel, 18).setPosition(w - 90 * s, h - 90 * s);
            font(t.hint, 14).setPosition(20 * s, h - 30 * s);
            t.base.setRadius(50 * s);
            t.knob.setRadius(22 * s);
        }
    }

    updateHUD() {
        this.scoreText.setText(`Score: ${this.score}`);
        this.timeText.setText(`Time: ${Math.max(0, Math.ceil(this.timeLeft))}s`);
        this.healthText.setText('Health: ' + '♥'.repeat(Math.max(0, this.health)) + '♡'.repeat(CONFIG.maxHealth - Math.max(0, this.health)));
        this.coinText.setText(`Cores: ${this.coinsCollected}/${this.coins.length}`);
    }

    addScore(points) {
        this.score += points;
        this.updateHUD();
    }

    flash(message) {
        this.tweens.killTweensOf(this.messageText);
        this.messageText.setText(message).setAlpha(1);
        this.tweens.add({ targets: this.messageText, alpha: 0, delay: 1200, duration: 400 });
    }

    // ---------- Input ----------

    createInput() {
        this.keys = this.input.keyboard.addKeys({
            up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
            w: 'W', a: 'A', s: 'S', d: 'D', jump: 'SPACE'
        });
        this.input.keyboard.on('keydown-M', () => this.flash(Sfx.toggleMute() ? 'Sound off' : 'Sound on'));
        this.input.keyboard.on('keydown-ESC', () => this.scene.start('SceneTitle'));

        if (this.sys.game.device.input.touch) this.createTouchControls();
    }

    // Left half: floating joystick. Right half: jump.
    // Native touch listeners on window (not Phaser pointers) so touches that start in the
    // letterbox bars around the canvas still steer; coordinates are mapped into game space.
    createTouchControls() {
        const fixed = (obj) => this.inHud(obj.setScrollFactor(0).setDepth(10000));
        const stickBase = fixed(this.add.circle(0, 0, 50, 0xffffff, 0.12).setVisible(false));
        const stickKnob = fixed(this.add.circle(0, 0, 22, 0xffffff, 0.35).setVisible(false));
        this.touchUI = {
            base: stickBase,
            knob: stickKnob,
            jump: fixed(this.add.circle(0, 0, 50, 0xffffff, 0.15)),
            jumpLabel: fixed(this.add.text(0, 0, 'JUMP', { font: '18px monospace', fill: '#ffffff' }).setOrigin(0.5)),
            hint: fixed(this.add.text(0, 0, 'drag to move', { font: '14px monospace', fill: '#888888' }))
        };
        this.layoutHUD();

        const toGame = (t) => ({ x: this.scale.transformX(t.pageX), y: this.scale.transformY(t.pageY) });
        const release = () => {
            this.stickId = null;
            this.touchVec = { x: 0, y: 0 };
            stickBase.setVisible(false);
            stickKnob.setVisible(false);
        };

        const onStart = (ev) => {
            Sfx.unlock();
            for (const t of ev.changedTouches) {
                const p = toGame(t);
                if (p.x >= this.scale.width / 2) {
                    this.jumpQueued = true;
                } else if (this.stickId === null) {
                    this.stickId = t.identifier;
                    this.stickOrigin = p;
                    stickBase.setPosition(p.x, p.y).setVisible(true);
                    stickKnob.setPosition(p.x, p.y).setVisible(true);
                }
            }
        };
        const onMove = (ev) => {
            for (const t of ev.changedTouches) {
                if (t.identifier !== this.stickId) continue;
                const p = toGame(t);
                const vx = p.x - this.stickOrigin.x;
                const vy = p.y - this.stickOrigin.y;
                const reach = stickBase.radius;
                const len = Math.min(reach, Math.hypot(vx, vy));
                const angle = Math.atan2(vy, vx);
                stickKnob.setPosition(this.stickOrigin.x + Math.cos(angle) * len, this.stickOrigin.y + Math.sin(angle) * len);
                this.touchVec = { x: Math.cos(angle) * len / reach, y: Math.sin(angle) * len / reach };
            }
        };
        const onEnd = (ev) => {
            for (const t of ev.changedTouches) {
                if (t.identifier === this.stickId) release();
            }
        };

        const listeners = { touchstart: onStart, touchmove: onMove, touchend: onEnd, touchcancel: onEnd };
        Object.entries(listeners).forEach(([type, fn]) => window.addEventListener(type, fn));
        this.events.once('shutdown', () => {
            Object.entries(listeners).forEach(([type, fn]) => window.removeEventListener(type, fn));
        });
    }

    // ---------- Loop ----------

    update(time, delta) {
        if (this.state !== 'playing') return;
        const dt = Math.min(delta, 50) / 1000;

        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.updateHUD();
            this.endRun('Out of time');
            return;
        }
        this.timeText.setText(`Time: ${Math.ceil(this.timeLeft)}s`);

        this.updatePlayer(dt);
        if (this.state !== 'playing') return;
        this.updateEnemies(dt);
        this.checkEnemies();
        if (this.state !== 'playing') return;
        this.checkPickups();
        this.checkPortal();
        this.updateInvulnerability(delta);
    }
}
