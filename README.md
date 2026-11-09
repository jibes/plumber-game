# Pipe Runner - Isometric Platformer Game

![Pipe Runner Logo](https://img.shields.io/badge/Status-Active-green.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**A free, open-source isometric platformer game inspired by classic Game Boy platformers.**

## 🎮 Play Now

### Web Version
👉 **[Play in Browser](https://jibes.github.io/plumber-game/)** (Coming soon after deployment)

### Android APK
Download the APK from the [Releases](https://github.com/jibes/plumber-game/releases) page.

---

## 📖 Game Story

You play as **Rusty**, a brave maintenance robot navigating a leaky industrial space station. The station's systems are failing, and Rusty must:

- 🔋 Collect **Power Cores** to restore energy
- ⚡ Avoid **Spark Drones** (flying electrical hazards)
- 💧 Dodge **Leak Blobs** (acid puddles)
- 🚪 Reach the **Portal** before time runs out

## ⌨️ Controls

### Desktop (Keyboard)
- **Arrow Keys** - Move Rusty
- **Space** - Jump

### Mobile (Touch)
- **Left side** - Swipe to move
- **Right side** - Tap to jump

## 🎯 Game Features

✅ **Isometric 2.5D Perspective** - Classic Game Boy-style isometric view
✅ **3 Unique Levels** - Increasing difficulty with new challenges
✅ **Score System** - Points for cores, time bonuses, and defeating enemies
✅ **Sound Effects** - All audio generated with Web Audio API
✅ **Mobile & Desktop** - Works on both platforms
✅ **No External Dependencies** - All assets generated programmatically
✅ **Offline Play** - No internet required after loading

## 🚀 Quick Start

### For Players

#### Web Version
1. Visit **[the game page](https://jibes.github.io/plumber-game/)**
2. Click or tap to start
3. Use arrow keys or touch to play

#### Android APK
1. Download `PipeRunner.apk` from [Releases](https://github.com/jibes/plumber-game/releases)
2. Install on your Android device (API 21+)
3. Open and play!

### For Developers

#### Prerequisites
- Node.js 16+
- npm 8+

#### Clone & Run
```bash
# Clone the repository
git clone https://github.com/jibes/plumber-game.git
cd plumber-game/game

# Install dependencies
npm install

# Start development server
npm start
```

Then open `http://localhost:3000` in your browser.

## 📦 Project Structure

```
plumber-game/
├── game/                          # Main game directory
│   ├── index.html                 # HTML entry point
│   ├── package.json               # Node.js dependencies
│   ├── README.md                  # Game documentation
│   ├── src/
│   │   ├── boot.js                # Game initialization
│   │   ├── config.js              # Game configuration
│   │   ├── utils/
│   │   │   └── IsoUtils.js        # Isometric math utilities
│   │   └── scenes/
│   │       ├── SceneLoader.js     # Asset generation & loading
│   │       ├── SceneTitle.js      # Main menu
│   │       ├── SceneGame.js       # Main gameplay
│   │       ├── SceneLevelComplete.js
│   │       └── SceneGameOver.js
│   ├── cordova/                   # Android APK build
│   │   ├── config.xml             # Cordova configuration
│   │   └── package.json           # Cordova dependencies
│   └── build/                     # Built files (generated)
│       ├── web/                   # Web build
│       └── android/               # Android APK
└── README.md                      # This file
```

## 🔧 Building

### Web Version

```bash
cd game
npm run build:web
```

Built files will be in `game/build/web/`

#### Deploy to GitHub Pages

```bash
# From repo root
cd game
npm run build:web
cd build/web
git init
git add .
git commit -m "Deploy to GitHub Pages"
git branch -M gh-pages
git remote add origin https://github.com/jibes/plumber-game.git
git push -u origin gh-pages -f
```

Then enable GitHub Pages in repository settings for the `gh-pages` branch.

### Android APK

#### Prerequisites
- Java JDK 8+
- Android Studio & SDK (API 21+)
- Cordova CLI

#### Build Steps

```bash
# Install Cordova globally
npm install -g cordova

# Navigate to cordova directory
cd game/cordova

# Install dependencies
npm install

# Add Android platform (first time only)
cordova platform add android

# Build release APK
cordova build android --release
```

The APK will be at:
`game/cordova/platforms/android/app/build/outputs/apk/release/app-release.apk`

#### Debug Build

```bash
# Build debug APK
cordova build android

# Run on connected device
cordova run android
```

## 🎨 Technical Details

### Engine
- **Phaser 3** - HTML5 game framework loaded from CDN
- **No external image files** - All sprites generated with Canvas API
- **Web Audio API** - All sounds generated programmatically

### Isometric Rendering
- Custom coordinate conversion (Cartesian ↔ Isometric)
- Depth sorting based on X+Y position
- Tile-based collision detection
- Optimized for mobile performance

### Performance
- Target: 60 FPS on modern devices
- Lightweight: ~500KB total (including Phaser)
- Works offline after initial load

### Asset Generation
All game assets are created programmatically:
- **Player**: Orange maintenance robot with wrench
- **Tiles**: Floor, walls, pipes in isometric view
- **Objects**: Power Cores, Portal
- **Enemies**: Spark Drones, Leak Blobs
- **Sounds**: Jump, collect, hurt, complete, music

## 📊 Game Mechanics

### Scoring
- **Power Core**: 100 points
- **Defeat Enemy**: 200 points
- **Time Bonus**: 10 points per second remaining
- **Core Bonus**: 50 points per core collected

### Health System
- Player has 3 health points
- Jump on enemies to defeat them (Mario-style)
- Touching enemies from sides/bottom hurts player

### Time Limit
- 120 seconds per level
- Time bonuses awarded at level completion

### Levels
1. **Level 1** - Basic introduction, simple layout
2. **Level 2** - More platforms, first enemies
3. **Level 3** - Complex layout with all hazards

## 🎵 Audio

All sounds are generated using Web Audio API:
- **Jump**: Rising pitch sine wave
- **Collect**: Dual sine wave chord
- **Hurt**: Sawtooth wave with pitch drop
- **Complete**: Ascending musical notes
- **Music**: Simple looping melody

## 📱 Mobile Optimization

- Touch controls with left/right screen division
- Prevent default touch behaviors
- Optimized for landscape orientation
- Responsive design for different screen sizes
- No scroll, full-screen gameplay

## 🐛 Troubleshooting

### Web Version Issues

**Blank screen**:
- Check browser console (F12) for errors
- Ensure internet connection (Phaser loads from CDN)
- Try a different browser

**No sound**:
- Some browsers require user interaction before playing audio
- Click/tap anywhere on the screen first

**Touch controls not working**:
- Ensure `touch-action: none` is set on body
- Check for CSS that might block touch events

### Android Build Issues

**Java not found**:
```bash
# Install Java JDK
sudo apt install openjdk-11-jdk  # Ubuntu/Debian
brew install openjdk             # macOS
```

**Android SDK not found**:
- Install Android Studio
- Ensure SDK is configured in `~/.android/`
- Set `ANDROID_HOME` environment variable

**Cordova errors**:
```bash
# Reinstall Cordova
npm uninstall -g cordova
npm install -g cordova@latest
```

## 🤝 Contributing

1. **Fork** the repository
2. **Clone** your fork
3. **Create** a feature branch (`git checkout -b feature/your-feature`)
4. **Commit** your changes (`git commit -m 'Add some feature'`)
5. **Push** to the branch (`git push origin feature/your-feature`)
6. **Open** a Pull Request

### Development Guidelines

- Follow existing code style
- Keep changes focused and minimal
- Test on both desktop and mobile
- Generate assets programmatically when possible
- Document new features in README

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2024 Jibes

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🙏 Credits

- **Concept**: Inspired by classic Game Boy platformers (Super Mario Land, etc.)
- **Engine**: [Phaser 3](https://phaser.io/) - HTML5 Game Framework
- **Audio**: [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- **Graphics**: Programmatically generated with [HTML5 Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/jibes/plumber-game/issues)
- **Discussions**: [GitHub Discussions](https://github.com/jibes/plumber-game/discussions)
- **Email**: (Not provided - use GitHub)

## 🎉 Special Thanks

- To all the open-source contributors
- To the Phaser community
- To anyone who plays and enjoys the game!

---

**Made with ❤️ and JavaScript**

*Copyright © 2024 Jibes - All Rights Reserved*
