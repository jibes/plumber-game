# Pipe Runner - Isometric Platformer Game

A free, open-source isometric platformer game inspired by classic Game Boy platformers. Features a maintenance robot navigating a space station, collecting Power Cores, and avoiding hazards.

## Game Concept

**Story:** You play as **Rusty**, a brave maintenance robot navigating a leaky industrial space station. Collect Power Cores to restore systems, avoid Spark Drones and Leak Blobs, and reach the exit portal before time runs out.

**Features:**
- Isometric 2.5D perspective
- Touch and keyboard controls
- 3 unique levels
- Score system with time and core bonuses
- Sound effects and music
- Mobile-friendly design

## Play the Game

### Web Version (GitHub Pages)

1. Build the web version:
   ```bash
   cd game
   npm install
   npm run build:web
   ```

2. The built files will be in `build/web/`

3. Deploy to GitHub Pages:
   ```bash
   # From the repo root
   git checkout -b gh-pages
   cp -r game/build/web/* .
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

4. Enable GitHub Pages in your repository settings for the `gh-pages` branch

### Android APK

#### Prerequisites:
- Node.js
- Java JDK 8+
- Android Studio & SDK (API 21+)
- Cordova CLI

#### Build Steps:

1. Install Cordova globally:
   ```bash
   npm install -g cordova
   ```

2. Navigate to the Cordova directory:
   ```bash
   cd game/cordova
   npm install
   ```

3. Add Android platform:
   ```bash
   cordova platform add android
   ```

4. Build the APK:
   ```bash
   cordova build android --release
   ```

5. The APK will be at: `game/cordova/platforms/android/app/build/outputs/apk/release/app-release.apk`

#### Debug Build:
```bash
cordova build android
cordova run android  # Installs on connected device
```

## Project Structure

```
game/
├── index.html              # Main HTML entry point
├── package.json            # Node.js dependencies
├── src/
│   ├── boot.js             # Game initialization
│   ├── scenes/
│   │   ├── SceneLoader.js  # Asset generation & loading
│   │   ├── SceneTitle.js   # Main menu
│   │   ├── SceneGame.js    # Main gameplay
│   │   ├── SceneLevelComplete.js
│   │   └── SceneGameOver.js
│   └── utils/
│       └── IsoUtils.js     # Isometric math utilities
├── cordova/
│   ├── config.xml          # Cordova configuration
│   └── package.json        # Cordova dependencies
└── build/
    └── web/                # Built web files
```

## Development

### Run locally:
```bash
cd game
npm install
npm start
```

This will start a local server at `http://localhost:3000`

### Controls

**Keyboard:**
- Arrow Keys: Move
- Space: Jump

**Touch (Mobile):**
- Left side of screen: Move (swipe)
- Right side of screen: Jump (tap)

## Game Mechanics

### Player
- Health: 3 hits
- Can jump on enemies to defeat them (Mario-style)
- Collect Power Cores for points
- Must reach portal to complete level

### Enemies
- **Spark Drone**: Flying hazard, moves in patrol pattern
- **Leak Blob**: Acid puddle, moves slowly

### Collectibles
- **Power Core**: 100 points each
- **Time Bonus**: 10 points per second remaining
- **Core Bonus**: 50 points per core collected

### Levels
- Level 1: Basic introduction
- Level 2: More platforms and enemies
- Level 3: Complex layout with all hazards

## Technical Details

### Isometric Rendering
The game uses a custom isometric projection system with:
- Cartesian to isometric coordinate conversion
- Depth sorting based on X+Y position
- Tile-based collision detection

### Asset Generation
All sprites are generated programmatically using HTML5 Canvas, eliminating the need for external image files. This makes the game completely self-contained.

### Audio
Uses Web Audio API for sound generation, no external audio files required.

### Performance
- Target: 60 FPS on modern devices
- Optimized for mobile browsers
- Lightweight (~500KB total)

## License

MIT License - Feel free to use, modify, and distribute.

## Credits

- **Concept**: Inspired by classic Game Boy platformers
- **Engine**: Phaser 3
- **Audio**: Web Audio API
- **Graphics**: Programmatically generated

## Troubleshooting

### Android Build Issues

1. **Java not found**: Install Java JDK 8 or 11
2. **Android SDK not found**: Install Android Studio and ensure SDK is configured
3. **Cordova errors**: Try `npm install -g cordova@latest`

### Web Version Issues

1. **Blank screen**: Check browser console for errors
2. **No sound**: Some browsers require user interaction before audio can play
3. **Touch controls not working**: Ensure touch-action is not being blocked

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Changelog

### v1.0.0 (Initial Release)
- 3 complete levels
- Touch and keyboard controls
- Sound effects and music
- Web and Android builds
- GitHub Pages deployment ready
