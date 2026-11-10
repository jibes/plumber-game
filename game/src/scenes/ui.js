// Shared helpers for the menu-style scenes.
const UI = {
    text(scene, x, y, str, size, color, bold = true) {
        return scene.add.text(x, y, str, {
            font: `${bold ? 'bold ' : ''}${size}px monospace`, fill: color, stroke: '#000000', strokeThickness: Math.max(3, size / 7)
        }).setOrigin(0.5);
    },

    blink(scene, target, delay = 0) {
        scene.tweens.add({ targets: target, alpha: 0.4, duration: 500, yoyo: true, repeat: -1, delay });
    },

    // Slowly drifting backdrop shared by all menus.
    backdrop(scene) {
        const bg = scene.add.tileSprite(0, 0, CONFIG.width, CONFIG.height, 'bg').setOrigin(0);
        const drift = (t, dt) => { bg.tilePositionX += dt * 0.01; bg.tilePositionY += dt * 0.005; };
        scene.events.on('update', drift);
        scene.events.once('shutdown', () => scene.events.off('update', drift));
        return bg;
    },

    // Fades out once, then starts the next scene. Repeated presses are ignored.
    leave(scene, key, data) {
        if (scene.leaving) return;
        scene.leaving = true;
        Sfx.unlock();
        Sfx.play('select');
        scene.cameras.main.fadeOut(250);
        scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start(key, data));
    },

    // Accepts input only after a short delay so a press from the previous scene can't skip this one.
    onInput(scene, keys, handler, delay = 400) {
        scene.leaving = false;
        scene.time.delayedCall(delay, () => {
            keys.forEach(k => scene.input.keyboard.on(`keydown-${k}`, () => handler(k)));
            scene.input.on('pointerdown', (p) => handler('POINTER', p));
            scene.input.on('pointerdownoutside', (p) => handler('POINTER', p));
        });
    },

    stars(scene, x, y, count, total = 3, scale = 0.6) {
        for (let i = 0; i < total; i++) {
            scene.add.image(x + (i - (total - 1) / 2) * 40 * scale * 1.1, y, 'star').setScale(scale)
                .setAlpha(i < count ? 1 : 0.2).setTint(i < count ? 0xffffff : 0x444444);
        }
    }
};
