// Pipe Runner - Isometric Platformer Game
// Main boot file

// Load config first
const CONFIG = {
    width: 800,
    height: 600,
    zoom: 1,
    tileSize: 64,
    isoTileWidth: 128,
    isoTileHeight: 64,
    gravity: 800,
    jumpForce: 350,
    playerSpeed: 200,
    maxLevels: 3
};

// Wait for DOM to be ready
window.addEventListener('load', () => {
    const loadingEl = document.getElementById('loading');
    
    const config = {
        type: Phaser.AUTO,
        width: CONFIG.width,
        height: CONFIG.height,
        backgroundColor: '#000000',
        parent: 'game-container',
        scene: [
            SceneLoader,
            SceneTitle,
            SceneGame,
            SceneLevelComplete,
            SceneGameOver
        ],
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: CONFIG.gravity },
                debug: false
            }
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    };

    const game = new Phaser.Game(config);
    
    // Hide loading screen when game is ready
    game.events.on('ready', () => {
        if (loadingEl) loadingEl.style.display = 'none';
    });
    
    // Global game reference
    window.PIPE_RUNNER = { game, config: CONFIG };
});
