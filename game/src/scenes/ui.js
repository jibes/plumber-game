// Shared helpers for the menu-style scenes. Menus are laid out on a virtual CONFIG.width x CONFIG.height
// canvas that is scaled and centred on the real screen; resizing the window re-lays out the scene.
const UI = {
    scaleFor(w, h) {
        return Phaser.Math.Clamp(Math.min(w / CONFIG.width, h / CONFIG.height), 0.5, 2);
    },

    // Call first in create(). Restarts the scene (with the same data) when the screen size changes.
    layout(scene, data) {
        const { width: w, height: h } = scene.scale;
        const s = UI.scaleFor(w, h);
        scene.ui = { s, ox: (w - CONFIG.width * s) / 2, oy: (h - CONFIG.height * s) / 2 };

        let timer = null;
        const onResize = () => {
            clearTimeout(timer);
            timer = setTimeout(() => { if (scene.sys.isActive()) scene.scene.restart(data); }, 150);
        };
        scene.scale.on('resize', onResize);
        scene.events.once('shutdown', () => {
            clearTimeout(timer);
            scene.scale.off('resize', onResize);
        });
    },

    // x, y and size are in virtual layout units.
    text(scene, x, y, str, size, color) {
        const { s, ox, oy } = scene.ui;
        return scene.add.text(ox + x * s, oy + y * s, str, {
            font: `${Math.round(size * s)}px monospace`, fill: color, stroke: '#000000', strokeThickness: Math.max(2, size * s / 8)
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
    },

    // Best run, kept in localStorage when available.
    best() {
        try { return JSON.parse(localStorage.getItem('pipeRunnerBest')) || { level: 0, score: 0 }; } catch (e) { return { level: 0, score: 0 }; }
    },

    recordRun(level, score) {
        const b = UI.best();
        const next = { level: Math.max(b.level, level), score: Math.max(b.score, score) };
        try { localStorage.setItem('pipeRunnerBest', JSON.stringify(next)); } catch (e) { /* storage unavailable */ }
        return next;
    }
};
