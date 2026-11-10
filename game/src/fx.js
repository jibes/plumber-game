// Visual feedback helpers: particle bursts, floating text, afterimages.
class Fx {
    constructor(scene) {
        this.scene = scene;
        const emitter = (config) => scene.add.particles(0, 0, 'px', { emitting: false, ...config }).setDepth(9000);
        this.sparkle = emitter({ speed: { min: 60, max: 180 }, lifespan: 450, scale: { start: 0.9, end: 0 }, tint: [0x00ffff, 0xffffff, 0x66ccff], blendMode: 'ADD' });
        this.gold = emitter({ speed: { min: 80, max: 220 }, lifespan: 700, scale: { start: 1.1, end: 0 }, tint: [0xffd700, 0xffffff, 0xffaa00], blendMode: 'ADD' });
        this.boom = emitter({ speed: { min: 90, max: 260 }, lifespan: 500, scale: { start: 1.3, end: 0 }, tint: [0xffff00, 0xff6600, 0xff2200], blendMode: 'ADD' });
        this.dust = emitter({ speed: { min: 20, max: 60 }, angle: { min: 160, max: 380 }, lifespan: 350, scale: { start: 0.8, end: 0 }, alpha: { start: 0.6, end: 0 }, tint: 0x999999 });
        this.heal = emitter({ speedY: { min: -120, max: -60 }, speedX: { min: -30, max: 30 }, lifespan: 600, scale: { start: 0.8, end: 0 }, tint: 0xff4466, blendMode: 'ADD' });
        this.rubble = emitter({ speedY: { min: 40, max: 140 }, speedX: { min: -40, max: 40 }, gravityY: 400, lifespan: 600, scale: { start: 0.9, end: 0.2 }, tint: [0x555560, 0x3a3a44] });
    }

    burst(name, x, y, count = 12) {
        this[name].explode(count, x, y);
    }

    popup(x, y, text, color = '#ffffff', size = 18) {
        const t = this.scene.add.text(x, y, text, {
            font: `bold ${size}px monospace`, fill: color, stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(9500);
        this.scene.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
    }

    afterimage(sprite, tint = 0x00ffff) {
        const ghost = this.scene.add.image(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
            .setOrigin(sprite.originX, sprite.originY).setScale(sprite.scaleX, sprite.scaleY)
            .setFlipX(sprite.flipX).setDepth(sprite.depth - 0.5).setTint(tint).setAlpha(0.6).setBlendMode('ADD');
        this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 220, onComplete: () => ghost.destroy() });
    }
}
