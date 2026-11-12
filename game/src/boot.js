// Pipe Runner - boot

window.addEventListener('load', () => {
    const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: '#000000',
        parent: 'game-container',
        audio: { noAudio: true }, // all sound is synthesised in audio.js
        scene: [SceneLoader, SceneTitle, SceneGame, SceneLevelComplete, SceneGameOver],
        // Canvas always fills the window; scenes lay themselves out from this.scale and listen for 'resize'.
        scale: {
            mode: Phaser.Scale.RESIZE,
            autoCenter: Phaser.Scale.NO_CENTER
        }
    });

    game.events.once('ready', () => {
        const loading = document.getElementById('loading');
        if (loading) loading.remove();
    });

    window.PIPE_RUNNER = { game };
});
