// Pipe Runner - boot

window.addEventListener('load', () => {
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: CONFIG.width,
        height: CONFIG.height,
        backgroundColor: '#000000',
        parent: 'game-container',
        audio: { noAudio: true }, // all sound is synthesised in audio.js
        scene: [SceneLoader, SceneTitle, SceneGame, SceneLevelComplete, SceneGameOver],
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        }
    });

    game.events.once('ready', () => {
        const loading = document.getElementById('loading');
        if (loading) loading.remove();
    });

    window.PIPE_RUNNER = { game };
});
