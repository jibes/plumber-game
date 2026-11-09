# Quick Start Guide

Get **Pipe Runner** running in 5 minutes or less!

## 🎮 For Players (Just Want to Play)

### Option 1: Web Browser
1. Go to: **[https://jibes.github.io/plumber-game/](https://jibes.github.io/plumber-game/)**
2. Click "PRESS SPACE OR TAP TO START"
3. Use arrow keys or touch to play!

### Option 2: Android APK
1. Download `PipeRunner.apk` from [Releases](https://github.com/jibes/plumber-game/releases)
2. Install on your Android phone/tablet
3. Open and enjoy!

---

## 💻 For Developers (Want to Modify)

### Prerequisites
- Node.js 16+ ([Download](https://nodejs.org/))
- A text editor (VS Code recommended)

### Step 1: Clone the Repository
```bash
git clone https://github.com/jibes/plumber-game.git
cd plumber-game/game
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run Locally
```bash
npm start
```
Then open `http://localhost:3000` in your browser.

### Step 4: Build for Web
```bash
npm run build:web
```
Files will be in `build/web/` - ready to deploy anywhere!

### Step 5: Build for Android (Optional)

#### Install Android Tools:
- Install [Android Studio](https://developer.android.com/studio)
- Install Java JDK 8+
- Install Cordova: `npm install -g cordova`

#### Build APK:
```bash
cd cordova
npm install
cordova platform add android
cordova build android --release
```
APK will be at: `platforms/android/app/build/outputs/apk/release/app-release.apk`

---

## 📁 Project Structure

```
game/
├── index.html          # Main game file
├── package.json        # Dependencies
├── src/
│   ├── boot.js         # Game starter
│   ├── config.js       # Settings
│   └── scenes/         # Game screens
│       ├── SceneLoader.js
│       ├── SceneTitle.js
│       ├── SceneGame.js
│       ├── SceneLevelComplete.js
│       └── SceneGameOver.js
├── cordova/            # Android build
│   └── config.xml      # App settings
└── build/              # Output (generated)
```

---

## 🎨 Customizing the Game

### Change Colors
Edit `game/src/config.js`:
```javascript
colors: {
    player: '#ff6600',    // Robot color
    floor1: '#333333',    // Dark floor
    floor2: '#444444',    // Light floor
    // ... more colors
}
```

### Add a New Level
Edit `game/src/scenes/SceneGame.js`:
1. Increase `CONFIG.maxLevels` in config.js
2. Add level data in `generateLevel()` function

### Modify Game Mechanics
Edit `game/src/scenes/SceneGame.js`:
- Change `playerSpeed` for movement
- Change `jumpForce` for jumping
- Modify `gravity` for physics

---

## 🚀 Deploying

### Deploy to GitHub Pages
```bash
cd game
npm run build:web
cd build/web
git init
git add .
git commit -m "Deploy"
git branch -M gh-pages
git remote add origin https://github.com/YOUR_USERNAME/plumber-game.git
git push -u origin gh-pages -f
```

Then enable GitHub Pages in your repo settings.

### Deploy to Any Web Server
Just copy files from `game/build/web/` to your server!

---

## 🐛 Common Issues

### "Phaser is not defined"
- Make sure you have internet connection
- Phaser loads from CDN in index.html
- Or download Phaser and include locally

### Touch controls not working on desktop
- Touch controls only activate on mobile devices
- Use keyboard (arrow keys + space) on desktop

### Android build fails
- Ensure Java JDK is installed
- Ensure Android SDK is configured
- Try `cordova platform remove android` then `cordova platform add android`

---

## 📖 Full Documentation

For complete documentation, see:
- **[README.md](README.md)** - Full project details
- **[game/README.md](game/README.md)** - Game-specific docs

---

**Need help?** Open an issue on GitHub: [https://github.com/jibes/plumber-game/issues](https://github.com/jibes/plumber-game/issues)
