// Game configuration
const CONFIG = {
    width: 800,
    height: 600,
    tileSize: 64,
    isoTileWidth: 128,
    isoTileHeight: 64,
    gravity: 800,
    jumpForce: 350,
    playerSpeed: 200,
    maxLevels: 3,
    
    // Colors
    colors: {
        background: '#000000',
        floor1: '#333333',
        floor2: '#444444',
        wall: '#555555',
        player: '#ff6600',
        playerLight: '#ffaa00',
        playerDark: '#cc3300',
        coin: '#00ffff',
        portal: '#ff00ff',
        drone: '#ffff00',
        blob: '#00ff00',
        text: '#ffffff',
        textHighlight: '#00ff00'
    }
};

// Make available globally
window.PIPE_RUNNER_CONFIG = CONFIG;
