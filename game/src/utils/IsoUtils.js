// Isometric utilities for Pipe Runner

class IsoUtils {
    static getTileSize() {
        return CONFIG.tileSize;
    }

    static getIsoTileWidth() {
        return CONFIG.isoTileWidth;
    }

    static getIsoTileHeight() {
        return CONFIG.isoTileHeight;
    }

    // Convert cartestian coordinates to isometric screen coordinates
    static cartToIso(x, y, z = 0) {
        const tileSize = CONFIG.tileSize;
        const isoX = (x - y) * (tileSize / 2);
        const isoY = (x + y) * (tileSize / 4) - z * (tileSize / 2);
        return { x: isoX, y: isoY };
    }

    // Convert isometric screen coordinates to cartesian
    static isoToCart(screenX, screenY) {
        const tileSize = CONFIG.tileSize;
        // Approximate conversion for point checking
        const cartY = (screenY / (tileSize / 4) - screenX / (tileSize / 2)) / 2;
        const cartX = (screenY / (tileSize / 4) + screenX / (tileSize / 2)) / 2;
        return { x: Math.floor(cartX), y: Math.floor(cartY) };
    }

    // Get depth sorting value (lower Y in cartesian = higher depth)
    static getDepth(x, y) {
        return x + y;
    }

    // Check if two cartesian positions are adjacent
    static isAdjacent(pos1, pos2) {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        return (dx <= 1 && dy <= 1);
    }

    // Get all 8 neighboring positions
    static getNeighbors(x, y) {
        const neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                neighbors.push({ x: x + dx, y: y + dy });
            }
        }
        return neighbors;
    }

    // Snap cartesian position to grid
    static snapToGrid(x, y) {
        return { x: Math.floor(x), y: Math.floor(y) };
    }
}

// Global reference
window.IsoUtils = IsoUtils;
