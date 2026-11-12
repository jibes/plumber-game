// Lazily drawn textures for raised terrain and walls.
// A block of L levels is 64 x (32 + 16L): top diamond centred at y=16, side faces down to the ground.
// Place with origin (0.5, Blocks.originY(L)) at the projected centre of its top face.
const Blocks = {
    originY(levels) {
        return 16 / (32 + levels * 16);
    },

    shade(light) {
        return `hsl(205, 25%, ${light}%)`;
    },

    draw(scene, key, levels, faces, pipe) {
        if (scene.textures.exists(key)) return key;
        const px = levels * 16;
        const tex = scene.textures.createCanvas(key, 64, 32 + px);
        const ctx = tex.getContext();
        const poly = (color, pts) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
            ctx.closePath();
            ctx.fill();
        };
        poly(faces.left, [0, 16, 32, 32, 32, 32 + px, 0, 16 + px]);
        poly(faces.right, [64, 16, 32, 32, 32, 32 + px, 64, 16 + px]);
        poly(faces.top, [32, 0, 64, 16, 32, 32, 0, 16]);
        if (pipe && levels >= 2) {
            poly('#b86b2e', [0, 28, 32, 44, 32, 50, 0, 34]);
            poly('#8a4f22', [64, 28, 32, 44, 32, 50, 64, 34]);
        }
        // Level seams on the side faces make heights easy to read.
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        for (let i = 1; i < levels; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 16 + i * 16); ctx.lineTo(32, 32 + i * 16); ctx.lineTo(64, 16 + i * 16);
            ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.moveTo(32, 0.5); ctx.lineTo(63.5, 16); ctx.lineTo(32, 31.5); ctx.lineTo(0.5, 16); ctx.closePath();
        ctx.stroke();
        tex.refresh();
        return key;
    },

    // Raised floor: lighter and bluer the higher it is. variant 0/1 = checkerboard.
    floor(scene, levels, variant) {
        const l = 26 + Math.min(levels, 6) * 9 + variant * 3;
        return this.draw(scene, `block_${levels}_${variant}`, levels, {
            top: this.shade(l), left: this.shade(l - 12), right: this.shade(l - 18)
        }, false);
    },

    wall(scene, levels) {
        return this.draw(scene, `wall_${levels}`, levels, { top: '#6b7884', left: '#4a5560', right: '#353d46' }, true);
    }
};
