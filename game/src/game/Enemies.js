// Enemies and turret projectiles. Positions are in tile space; the scene provides terrain queries.

class Enemies {
    constructor(scene) {
        this.scene = scene;
        this.orbs = [];
        this.list = scene.level.enemies.map(def => this.create(def));
    }

    create(def) {
        const s = this.scene;
        const e = {
            type: def.type, x: def.x + 0.5, y: def.y + 0.5, home: { x: def.x + 0.5, y: def.y + 0.5 },
            hover: 0, dir: 1, speed: 0, axis: null, alive: true, t: Math.random() * 6, chasing: false, fireT: 1.5 + Math.random()
        };
        const kinds = {
            drone: { axis: 'x', speed: 1.8, hover: 0.35, frame: 0, anim: 'drone_move' },
            blob: { axis: 'y', speed: 1.1, frame: 4, anim: 'blob_move' },
            rustbot: { speed: 2.1, frame: 8, anim: 'rustbot_move' },
            turret: { frame: 12 }
        };
        const kind = kinds[def.type];
        Object.assign(e, kind);
        e.shadow = s.add.image(0, 0, 'shadow').setScale(0.8);
        e.sprite = s.add.sprite(0, 0, 'enemies', kind.frame).setOrigin(0.5, 0.875).setScale(0.85);
        if (kind.anim) e.sprite.play(kind.anim);
        this.sync(e);
        return e;
    }

    // Enemies stay on plain floor: no pits, crates, springs, vents or crumbling tiles.
    walkable(x, y) {
        return this.scene.tileChar(Math.floor(x), Math.floor(y)) === '.';
    }

    update(dt) {
        const P = this.scene.player;
        this.list.forEach(e => {
            if (!e.alive) return;
            e.t += dt;
            if (e.axis) this.patrol(e, dt);
            else if (e.type === 'rustbot') this.chase(e, P, dt);
            else if (e.type === 'turret') this.aim(e, P, dt);
            this.sync(e);
        });
        this.updateOrbs(dt, P);
    }

    patrol(e, dt) {
        const next = e[e.axis] + e.dir * e.speed * dt;
        const lead = next + e.dir * 0.5;
        const ok = e.axis === 'x' ? this.walkable(lead, e.y) : this.walkable(e.x, lead);
        if (ok) e[e.axis] = next;
        else e.dir *= -1;
        e.sprite.setFlipX(e.axis === 'x' ? e.dir < 0 : e.dir > 0);
    }

    chase(e, P, dt) {
        const dx = P.x - e.x, dy = P.y - e.y;
        const dist = Math.hypot(dx, dy);
        const wasChasing = e.chasing;
        e.chasing = dist < 5 && Math.abs(P.z) < 1.2 && this.scene.state === 'playing';
        if (e.chasing && !wasChasing) {
            const p = IsoUtils.cartToIso(e.x, e.y, 1.6);
            this.scene.fx.popup(p.x, p.y, '!', '#ff3300', 26);
        }
        let tx = e.home.x - e.x, ty = e.home.y - e.y;
        let speed = e.speed * 0.5;
        if (e.chasing) { tx = dx; ty = dy; speed = e.speed; }
        const len = Math.hypot(tx, ty);
        if (len < 0.05) return;
        const step = Math.min(len, speed * dt);
        const mx = tx / len * step, my = ty / len * step;
        const r = 0.3;
        if (this.walkable(e.x + mx + Math.sign(mx) * r, e.y)) e.x += mx;
        if (this.walkable(e.x, e.y + my + Math.sign(my) * r)) e.y += my;
        if (Math.abs(mx - my) > 0.001) e.sprite.setFlipX(mx - my < 0);
        e.sprite.anims.timeScale = e.chasing ? 2 : 1;
    }

    aim(e, P, dt) {
        e.fireT -= dt;
        const dx = P.x - e.x, dy = P.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (e.fireT > 0 || dist > 7 || this.scene.state !== 'playing') return;
        e.fireT = 2.2;
        e.sprite.setFrame(13);
        this.scene.time.delayedCall(180, () => e.alive && e.sprite.setFrame(12));
        const speed = 3.2;
        this.orbs.push({
            x: e.x + dx / dist * 0.4, y: e.y + dy / dist * 0.4, z: 0.4,
            vx: dx / dist * speed, vy: dy / dist * speed, life: 5,
            sprite: this.scene.add.image(0, 0, 'orb').setBlendMode('ADD')
        });
        if (dist < 6) Sfx.play('shoot');
    }

    sync(e) {
        const s = this.scene;
        const bob = e.type === 'drone' ? Math.sin(e.t * 4) * 0.08 : 0;
        const p = IsoUtils.cartToIso(e.x, e.y, e.hover + bob);
        const g = IsoUtils.cartToIso(e.x, e.y, 0);
        const depth = s.depthFor(e.x, e.y, 0);
        e.sprite.setPosition(p.x, p.y).setDepth(depth);
        e.shadow.setPosition(g.x, g.y).setDepth(depth - 1);
    }

    updateOrbs(dt, P) {
        const s = this.scene;
        this.orbs = this.orbs.filter(o => {
            o.x += o.vx * dt;
            o.y += o.vy * dt;
            o.life -= dt;
            const p = IsoUtils.cartToIso(o.x, o.y, o.z);
            o.sprite.setPosition(p.x, p.y).setDepth(s.depthFor(o.x, o.y, o.z) + 1);

            const hitWall = s.heightAt(o.x, o.y) > o.z;
            const hitPlayer = s.state === 'playing' && Math.hypot(P.x - o.x, P.y - o.y) < 0.4 && P.z < o.z + 0.45 && P.z > o.z - 0.9;
            if (hitPlayer) {
                if (P.dashT > 0) {
                    s.fx.popup(p.x, p.y - 10, 'DEFLECT', '#00ffff', 14);
                    s.addPoints(50, o.x, o.y, false);
                } else {
                    s.hurtPlayer(o.x - o.vx, o.y - o.vy, 'Fried by a turret orb');
                }
            }
            if (hitWall || hitPlayer || o.life <= 0) {
                s.fx.burst('boom', p.x, p.y, 6);
                o.sprite.destroy();
                return false;
            }
            return true;
        });
    }

    // Contact with the player: dash or stomp kills, anything else hurts.
    checkPlayer(P) {
        for (const e of this.list) {
            if (!e.alive) continue;
            if (Math.hypot(P.x - e.x, P.y - e.y) > 0.55) continue;
            if (P.z > e.hover + 0.9 || P.z < e.hover - 0.6) continue;

            if (P.dashT > 0) {
                this.kill(e, 'dash');
            } else if (P.vz < 0 && P.z > e.hover + 0.25) {
                this.kill(e, 'stomp');
                this.scene.bounce();
            } else {
                const names = { drone: 'Zapped by a Spark Drone', blob: 'Slimed by a Leak Blob', rustbot: 'Crushed by a Rust Bot', turret: 'Bumped into a turret' };
                this.scene.hurtPlayer(e.x, e.y, names[e.type]);
            }
        }
    }

    kill(e, how) {
        e.alive = false;
        this.scene.onKill(e, how);
        e.shadow.destroy();
        this.scene.tweens.add({
            targets: e.sprite, scaleY: 0.1, scaleX: 1.3, alpha: 0, duration: 250,
            onComplete: () => e.sprite.destroy()
        });
    }
}
