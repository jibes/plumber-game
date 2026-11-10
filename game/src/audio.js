// Synthesised sound effects and music via the Web Audio API.
// Browsers keep an AudioContext suspended until a user gesture, so unlock() is called from input handlers.
const Sfx = (() => {
    let ctx = null;
    let muted = false;
    let musicTimer = null;

    function context() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    function tone(c, { type = 'sine', freq, to = null, dur, vol = 0.1, at = 0 }) {
        const t = c.currentTime + at;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain).connect(c.destination);
        osc.start(t);
        osc.stop(t + dur);
    }

    const sounds = {
        jump: c => tone(c, { type: 'square', freq: 330, to: 660, dur: 0.12, vol: 0.05 }),
        collect: c => { tone(c, { freq: 880, dur: 0.08 }); tone(c, { freq: 1320, dur: 0.12, at: 0.06 }); },
        stomp: c => tone(c, { type: 'square', freq: 600, to: 150, dur: 0.15, vol: 0.06 }),
        hurt: c => tone(c, { type: 'sawtooth', freq: 220, to: 60, dur: 0.25, vol: 0.08 }),
        fall: c => tone(c, { type: 'triangle', freq: 600, to: 80, dur: 0.45, vol: 0.12 }),
        unlock: c => [660, 880, 1100].forEach((f, i) => tone(c, { freq: f, dur: 0.12, at: i * 0.07 })),
        complete: c => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, { freq: f, dur: 0.3, vol: 0.08, at: i * 0.1 })),
        gameover: c => [392, 330, 262, 196].forEach((f, i) => tone(c, { type: 'triangle', freq: f, dur: 0.3, vol: 0.1, at: i * 0.18 }))
    };

    const melody = [262, 294, 330, 349, 392, 349, 330, 294, 262, 330, 392, 523, 392, 330, 294, 247];

    return {
        unlock() { context(); },

        play(name) {
            if (muted) return;
            const c = context();
            if (c && sounds[name]) sounds[name](c);
        },

        startMusic() {
            this.stopMusic();
            let i = 0;
            const step = () => {
                const c = context();
                if (c && !muted) tone(c, { type: 'triangle', freq: melody[i], dur: 0.22, vol: 0.03 });
                i = (i + 1) % melody.length;
                musicTimer = setTimeout(step, 250);
            };
            step();
        },

        stopMusic() {
            clearTimeout(musicTimer);
            musicTimer = null;
        },

        toggleMute() {
            muted = !muted;
            return muted;
        }
    };
})();
