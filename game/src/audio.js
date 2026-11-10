// Synthesised sound effects and chiptune music via the Web Audio API.
// Browsers keep an AudioContext suspended until a user gesture, so unlock() is called from input handlers.
const Sfx = (() => {
    let ctx = null;
    let master = null;
    let noise = null;
    let muted = false;
    let musicTimer = null;
    let tempo = 1;

    function context() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            ctx = new AC();
            master = ctx.createGain();
            master.gain.value = 0.8;
            master.connect(ctx.destination);
            noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
            const data = noise.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
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
        osc.connect(gain).connect(master);
        osc.start(t);
        osc.stop(t + dur);
    }

    function hiss(c, { dur, vol = 0.1, at = 0, freq = 2000, q = 0.7, type = 'bandpass' }) {
        const t = c.currentTime + at;
        const src = c.createBufferSource();
        const filter = c.createBiquadFilter();
        const gain = c.createGain();
        src.buffer = noise;
        filter.type = type;
        filter.frequency.value = freq;
        filter.Q.value = q;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(filter).connect(gain).connect(master);
        src.start(t);
        src.stop(t + dur);
    }

    const sounds = {
        jump: c => tone(c, { type: 'square', freq: 300, to: 620, dur: 0.12, vol: 0.05 }),
        land: c => hiss(c, { dur: 0.06, vol: 0.06, freq: 400 }),
        dash: c => { hiss(c, { dur: 0.18, vol: 0.12, freq: 3000, q: 1.5 }); tone(c, { type: 'sawtooth', freq: 200, to: 500, dur: 0.12, vol: 0.03 }); },
        spring: c => tone(c, { type: 'square', freq: 200, to: 1200, dur: 0.3, vol: 0.06 }),
        collect: (c, combo = 1) => {
            const base = 880 * Math.pow(1.122, combo - 1); // rises a whole tone per combo step
            tone(c, { freq: base, dur: 0.08 });
            tone(c, { freq: base * 1.5, dur: 0.14, at: 0.06 });
        },
        gear: c => [784, 988, 1175, 1568].forEach((f, i) => tone(c, { type: 'triangle', freq: f, dur: 0.18, vol: 0.09, at: i * 0.06 })),
        heal: c => [523, 659, 784].forEach((f, i) => tone(c, { freq: f, dur: 0.15, at: i * 0.05 })),
        kill: c => { tone(c, { type: 'square', freq: 700, to: 120, dur: 0.18, vol: 0.06 }); hiss(c, { dur: 0.2, vol: 0.1, freq: 900 }); },
        hurt: c => { tone(c, { type: 'sawtooth', freq: 220, to: 60, dur: 0.3, vol: 0.09 }); hiss(c, { dur: 0.15, vol: 0.08, freq: 600 }); },
        fall: c => tone(c, { type: 'triangle', freq: 700, to: 70, dur: 0.5, vol: 0.12 }),
        crack: c => hiss(c, { dur: 0.12, vol: 0.1, freq: 1500, q: 3 }),
        steam: c => hiss(c, { dur: 0.5, vol: 0.035, freq: 5000, type: 'highpass' }),
        shoot: c => tone(c, { type: 'square', freq: 900, to: 300, dur: 0.1, vol: 0.03 }),
        unlock: c => [660, 880, 1100, 1320].forEach((f, i) => tone(c, { freq: f, dur: 0.15, at: i * 0.07 })),
        tick: c => tone(c, { type: 'square', freq: 1200, dur: 0.05, vol: 0.03 }),
        select: c => tone(c, { type: 'square', freq: 660, dur: 0.05, vol: 0.04 }),
        star: (c, i = 0) => tone(c, { type: 'triangle', freq: 880 * Math.pow(1.26, i), dur: 0.3, vol: 0.1 }),
        complete: c => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, { freq: f, dur: 0.3, vol: 0.08, at: i * 0.1 })),
        gameover: c => [392, 330, 262, 196].forEach((f, i) => tone(c, { type: 'triangle', freq: f, dur: 0.3, vol: 0.1, at: i * 0.18 }))
    };

    // Two-voice loop: 16 steps of bass + lead, with a hi-hat on off-beats.
    const BASS = [110, 0, 110, 0, 131, 0, 131, 0, 98, 0, 98, 0, 147, 0, 131, 0];
    const LEAD = [440, 523, 659, 523, 494, 0, 392, 494, 440, 523, 587, 659, 784, 659, 587, 494];

    return {
        unlock() { context(); },

        play(name, arg) {
            if (muted) return;
            const c = context();
            if (c && sounds[name]) sounds[name](c, arg);
        },

        startMusic() {
            this.stopMusic();
            tempo = 1;
            let step = 0;
            const tick = () => {
                const c = context();
                if (c && !muted) {
                    const i = step % 16;
                    if (BASS[i]) tone(c, { type: 'square', freq: BASS[i], dur: 0.2, vol: 0.025 });
                    if (LEAD[i] && Math.floor(step / 16) % 2 === 1) tone(c, { type: 'triangle', freq: LEAD[i], dur: 0.16, vol: 0.025 });
                    if (i % 2 === 1) hiss(c, { dur: 0.03, vol: 0.02, freq: 8000, type: 'highpass' });
                }
                step++;
                musicTimer = setTimeout(tick, 150 / tempo);
            };
            tick();
        },

        stopMusic() {
            clearTimeout(musicTimer);
            musicTimer = null;
        },

        setTempo(t) { tempo = t; },

        toggleMute() {
            muted = !muted;
            return muted;
        }
    };
})();
