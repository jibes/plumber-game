// Interactive terrain: crumbling floor, steam vents and spring pads.

class Hazards {
    constructor(scene) {
        this.scene = scene;
        this.crumbles = new Map();
        this.vents = [];
        this.springs = new Map();
        this.time = 0;
    }

    // Called by the scene for every special tile it builds.
    add(type, x, y, sprite) {
        const key = `${x},${y}`;
        if (type === '~') this.crumbles.set(key, { x, y, sprite, baseX: sprite.x, baseY: sprite.y, state: 'solid', t: 0 });
        if (type === '^') this.springs.set(key, sprite);
        if (type === 'V') {
            const p = IsoUtils.cartToIso(x + 0.5, y + 0.5);
            const emitter = this.scene.add.particles(p.x, p.y - 4, 'puff', {
                speedY: { min: -170, max: -110 }, speedX: { min: -18, max: 18 },
                lifespan: 650, scale: { start: 0.35, end: 1.2 }, alpha: { start: 0.65, end: 0 },
                frequency: 40, emitting: false
            }).setDepth(IsoUtils.actorDepth(x + 0.5, y + 0.5) + 6);
            this.vents.push({ x, y, emitter, state: 'idle', offset: (x + y) * 0.4 });
        }
    }

    isGone(x, y) {
        const c = this.crumbles.get(`${x},${y}`);
        return !!c && c.state === 'gone';
    }

    bounceSpring(x, y) {
        const sprite = this.springs.get(`${x},${y}`);
        if (!sprite) return;
        this.scene.tweens.add({ targets: sprite, scaleY: 0.8, duration: 60, yoyo: true });
    }

    update(dt) {
        this.time += dt;
        const P = this.scene.player;
        this.updateCrumbles(dt, P);
        this.updateVents(P);
    }

    updateCrumbles(dt, P) {
        const s = this.scene;
        this.crumbles.forEach(c => {
            if (c.state === 'solid') {
                if (P.onGround && P.z === 0 && Math.floor(P.x) === c.x && Math.floor(P.y) === c.y) {
                    c.state = 'shaking';
                    c.t = 0.5;
                    Sfx.play('crack');
                }
            } else if (c.state === 'shaking') {
                c.t -= dt;
                c.sprite.setPosition(c.baseX + Phaser.Math.Between(-2, 2), c.baseY + Phaser.Math.Between(-1, 1));
                if (c.t <= 0) {
                    c.state = 'gone';
                    c.t = 3;
                    const p = IsoUtils.cartToIso(c.x + 0.5, c.y + 0.5);
                    c.sprite.x = c.baseX;
                    s.fx.burst('rubble', p.x, p.y, 10);
                    s.tweens.add({ targets: c.sprite, y: c.baseY + 60, alpha: 0, duration: 400, ease: 'Quad.easeIn' });
                }
            } else if (c.t > 0) {
                c.t -= dt;
            } else if (!this.overlapsPlayer(c.x, c.y, P)) {
                c.state = 'solid';
                s.tweens.killTweensOf(c.sprite);
                c.sprite.setY(c.baseY - 20).setAlpha(0);
                s.tweens.add({ targets: c.sprite, y: c.baseY, alpha: 1, duration: 300, ease: 'Back.easeOut' });
            }
        });
    }

    overlapsPlayer(x, y, P) {
        const r = CONFIG.playerRadius;
        return P.x + r > x && P.x - r < x + 1 && P.y + r > y && P.y - r < y + 1;
    }

    // Vents run on a 3s cycle offset by position, so eruptions sweep across the floor in waves.
    updateVents(P) {
        const s = this.scene;
        this.vents.forEach(v => {
            const phase = (this.time + v.offset) % 3;
            const state = phase < 1.9 ? 'idle' : phase < 2.3 ? 'warn' : 'active';
            if (state !== v.state) {
                v.state = state;
                if (state === 'idle') v.emitter.stop();
                if (state === 'warn') { v.emitter.setFrequency(160); v.emitter.start(); }
                if (state === 'active') {
                    v.emitter.setFrequency(25);
                    if (Math.hypot(P.x - v.x, P.y - v.y) < 5) Sfx.play('steam');
                }
            }
            if (state === 'active' && Math.floor(P.x) === v.x && Math.floor(P.y) === v.y && P.z < 1.8) {
                s.hurtPlayer(v.x + 0.5, v.y + 0.5, 'Scalded by steam');
            }
        });
    }
}
