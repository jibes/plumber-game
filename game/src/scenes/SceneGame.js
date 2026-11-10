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
        this.levelStartScore = this.score;
        this.level = parseLevel(LEVELS[this.levelNumber - 1]);
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
    }

    create() {
        this.buildWorld();
        this.createPlayer();
        this.createEnemies();
        this.createHUD();
        this.createInput();

        this.cameras.main.setRoundPixels(true);
        this.cameras.main.startFollow(this.player.shadow, true, 0.12, 0.12);
        this.cameras.main.fadeIn(400);

        Sfx.startMusic();
        this.events.once('shutdown', () => Sfx.stopMusic());
    }

    // ---------- World ----------

    tileAt(x, y) {
        const row = this.level.grid[Math.floor(y)];
        const tile = row && row[Math.floor(x)];
        return tile === undefined ? '#' : tile;
    }

    buildWorld() {
        const { grid, coins, exit } = this.level;

        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile === ' ') return;
            const p = IsoUtils.cartToIso(x + 0.5, y + 0.5);
            if (tile === '#') {
                this.add.image(p.x, p.y, 'tiles', 2).setOrigin(0.5, 0.75)
                    .setDepth(IsoUtils.actorDepth(x + 0.5, y + 0.5));
            } else {
                this.add.image(p.x, p.y, 'tiles', (x + y) % 2).setOrigin(0.5, 0.625)
                    .setDepth(IsoUtils.floorDepth(x, y));
            }
        }));

        this.coins = coins.map(c => {
            const x = c.x + 0.5, y = c.y + 0.5;
            const p = IsoUtils.cartToIso(x, y, 0.6);
            const sprite = this.add.sprite(p.x, p.y, 'objects', 0).setScale(0.6)
                .setDepth(IsoUtils.actorDepth(x, y)).play('core_spin');
            this.tweens.add({ targets: sprite, y: p.y - 6, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            return { x, y, sprite, collected: false };
        });

        const ex = exit.x + 0.5, ey = exit.y + 0.5;
        const p = IsoUtils.cartToIso(ex, ey, 0.75);
        this.portal = {
            x: ex,
            y: ey,
            sprite: this.add.sprite(p.x, p.y, 'objects', 4).setScale(0.9).setAlpha(0.3)
                .setDepth(IsoUtils.actorDepth(ex, ey)).play('portal_spin')
        };
    }

    // ---------- Player ----------

    createPlayer() {
        const { start } = this.level;
        const x = start.x + 0.5, y = start.y + 0.5;
        this.player = {
            x, y, z: 0, vz: 0,
            lastSafe: { x, y },
            shadow: this.add.image(0, 0, 'shadow'),
            sprite: this.add.sprite(0, 0, 'player', 0).setOrigin(0.5, 0.875).setScale(0.8).play('player_idle')
        };
        this.syncPlayer();
    }

    syncPlayer() {
        const P = this.player;
        const ground = IsoUtils.cartToIso(P.x, P.y);
        const depth = IsoUtils.actorDepth(P.x, P.y);
        P.shadow.setPosition(ground.x, ground.y).setDepth(depth - 1)
            .setVisible(this.tileAt(P.x, P.y) === '.')
            .setScale(1 - Math.min(P.z, 1) * 0.4);
        P.sprite.setPosition(ground.x, ground.y - P.z * CONFIG.zScale).setDepth(depth);
    }

    hitsWall(x, y) {
        const r = CONFIG.playerRadius;
        return this.tileAt(x - r, y - r) === '#' || this.tileAt(x + r, y - r) === '#' ||
               this.tileAt(x - r, y + r) === '#' || this.tileAt(x + r, y + r) === '#';
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

        const step = CONFIG.playerSpeed * dt;
        if (!this.hitsWall(P.x + dx * step, P.y)) P.x += dx * step;
        if (!this.hitsWall(P.x, P.y + dy * step)) P.y += dy * step;

        if (input.jump && P.z === 0) {
            P.vz = CONFIG.jumpVelocity;
            Sfx.play('jump');
        }
        if (P.z > 0 || P.vz > 0) {
            P.vz -= CONFIG.gravity * dt;
            P.z = Math.max(0, P.z + P.vz * dt);
            if (P.z === 0) P.vz = 0;
        }

        if (P.z === 0) {
            if (this.tileAt(P.x, P.y) === ' ') {
                this.fallIntoPit();
                return;
            }
            P.lastSafe = { x: Math.floor(P.x) + 0.5, y: Math.floor(P.y) + 0.5 };
        }

        const anim = P.z > 0 ? 'player_jump' : (len > 0 ? 'player_run' : 'player_idle');
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
                P.x = P.lastSafe.x;
                P.y = P.lastSafe.y;
                P.z = 0;
                P.vz = 0;
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
            return {
                type: e.type,
                x: e.x + 0.5,
                y: e.y + 0.5,
                axis: drone ? 'x' : 'y',
                dir: 1,
                speed: drone ? 1.8 : 1.1,
                hover: drone ? 0.35 : 0,
                bob: Math.random() * Math.PI * 2,
                alive: true,
                sprite: this.add.sprite(0, 0, 'enemies', drone ? 0 : 4).setOrigin(0.5, 0.875)
                    .setScale(0.85).play(drone ? 'drone_move' : 'blob_move')
            };
        });
        this.enemies.forEach(e => this.syncEnemy(e));
    }

    updateEnemies(dt) {
        this.enemies.forEach(e => {
            if (!e.alive) return;
            const next = e[e.axis] + e.dir * e.speed * dt;
            const lead = next + e.dir * 0.5;
            const tile = e.axis === 'x' ? this.tileAt(lead, e.y) : this.tileAt(e.x, lead);
            if (tile === '.') e[e.axis] = next;
            else e.dir *= -1;
            e.bob += dt * 4;
            e.sprite.setFlipX(e.axis === 'x' ? e.dir < 0 : e.dir > 0);
            this.syncEnemy(e);
        });
    }

    syncEnemy(e) {
        const z = e.hover + (e.type === 'drone' ? Math.sin(e.bob) * 0.08 : 0);
        const p = IsoUtils.cartToIso(e.x, e.y, z);
        e.sprite.setPosition(p.x, p.y).setDepth(IsoUtils.actorDepth(e.x, e.y));
    }

    checkEnemies() {
        const P = this.player;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            if (Math.hypot(P.x - e.x, P.y - e.y) > 0.6 || Math.abs(P.z - e.hover) > 0.8) continue;

            if (P.vz < 0 && P.z > e.hover + 0.1) {
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
            if (c.collected || P.z > 1 || Math.hypot(P.x - c.x, P.y - c.y) > 0.5) return;
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
        const touching = P.z < 0.5 && Math.hypot(P.x - this.portal.x, P.y - this.portal.y) < 0.5;
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
            this.cameras.main.once('camerafadeoutcomplete', () => {
                this.scene.start('SceneLevelComplete', {
                    level: this.levelNumber,
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
                reason
            });
        });
    }

    // ---------- HUD ----------

    createHUD() {
        const style = (color) => ({ font: '20px monospace', fill: color, stroke: '#000000', strokeThickness: 3 });
        const fixed = (obj) => obj.setScrollFactor(0).setDepth(10000);

        this.scoreText = fixed(this.add.text(16, 12, '', style('#00ff00')));
        this.timeText = fixed(this.add.text(16, 40, '', style('#00ffff')));
        this.healthText = fixed(this.add.text(16, 68, '', style('#ff4444')));
        this.levelText = fixed(this.add.text(CONFIG.width - 16, 12, `Level ${this.levelNumber}: ${this.level.name}`, style('#ff00ff')).setOrigin(1, 0));
        this.coinText = fixed(this.add.text(CONFIG.width - 16, 40, '', style('#ffff00')).setOrigin(1, 0));
        this.messageText = fixed(this.add.text(CONFIG.width / 2, 120, '', {
            font: '24px monospace', fill: '#ffffff', stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0));

        this.updateHUD();
        this.flash(this.level.name);
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
        const fixed = (obj) => obj.setScrollFactor(0).setDepth(10000);
        const stickBase = fixed(this.add.circle(0, 0, 50, 0xffffff, 0.12).setVisible(false));
        const stickKnob = fixed(this.add.circle(0, 0, 22, 0xffffff, 0.35).setVisible(false));
        fixed(this.add.circle(CONFIG.width - 90, CONFIG.height - 90, 50, 0xffffff, 0.15));
        fixed(this.add.text(CONFIG.width - 90, CONFIG.height - 90, 'JUMP', { font: '18px monospace', fill: '#ffffff' }).setOrigin(0.5));
        fixed(this.add.text(20, CONFIG.height - 30, 'drag to move', { font: '14px monospace', fill: '#888888' }));

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
                if (p.x >= CONFIG.width / 2) {
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
                const len = Math.min(50, Math.hypot(vx, vy));
                const angle = Math.atan2(vy, vx);
                stickKnob.setPosition(this.stickOrigin.x + Math.cos(angle) * len, this.stickOrigin.y + Math.sin(angle) * len);
                this.touchVec = { x: Math.cos(angle) * len / 50, y: Math.sin(angle) * len / 50 };
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
