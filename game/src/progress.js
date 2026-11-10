// Per-browser save data: unlocked levels, best score and stars per level.
const Progress = {
    KEY: 'pipeRunner.progress.v1',

    load() {
        try {
            const data = JSON.parse(localStorage.getItem(this.KEY));
            if (data && data.levels) return data;
        } catch (e) { /* storage unavailable or corrupt */ }
        return { unlocked: 1, levels: {} };
    },

    save(data) {
        try {
            localStorage.setItem(this.KEY, JSON.stringify(data));
        } catch (e) { /* private mode etc. - progress just isn't kept */ }
    },

    level(n) {
        return this.load().levels[n] || { stars: 0, best: 0 };
    },

    // Stores a finished run and returns what improved.
    record(n, stars, score) {
        const data = this.load();
        const prev = data.levels[n] || { stars: 0, best: 0 };
        data.levels[n] = { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, score) };
        data.unlocked = Math.max(data.unlocked, Math.min(n + 1, LEVELS.length));
        this.save(data);
        return { newBest: score > prev.best, newStars: stars > prev.stars };
    },

    totalStars() {
        return Object.values(this.load().levels).reduce((sum, l) => sum + l.stars, 0);
    }
};
