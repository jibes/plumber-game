// Shared helpers for the menu-style scenes.
const UI = {
    text(scene, x, y, str, size, color) {
        return scene.add.text(x, y, str, {
            font: `${size}px monospace`, fill: color, stroke: '#000000', strokeThickness: Math.max(2, size / 8)
        }).setOrigin(0.5);
    },

    blink(scene, target, delay = 0) {
        scene.tweens.add({ targets: target, alpha: 0.4, duration: 500, yoyo: true, repeat: -1, delay });
    },

    // Fades out once, then starts the next scene. Repeated presses are ignored.
    leave(scene, key, data) {
        if (scene.leaving) return;
        scene.leaving = true;
        Sfx.unlock();
        scene.cameras.main.fadeOut(300);
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
    }
};
