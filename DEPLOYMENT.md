# Deployment Guide

This guide explains how to deploy **Pipe Runner** to different platforms.

---

## 🌐 Web Deployment (GitHub Pages)

### Method 1: Using GitHub Actions (Recommended)

1. Create a file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: cd game && npm install
      
      - name: Build web version
        run: cd game && npm run build:web
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./game/build/web
```

2. Push to `main` branch
3. Go to Settings > Pages > Select `gh-pages` branch
4. Your game will be live at `https://YOUR_USERNAME.github.io/plumber-game/`

### Method 2: Manual Deployment

```bash
# From repo root
cd game
npm install
npm run build:web

# Create gh-pages branch
cd build/web
git init
git add .
git commit -m "Deploy to GitHub Pages"
git branch -M gh-pages
git remote add origin https://github.com/YOUR_USERNAME/plumber-game.git
git push -u origin gh-pages -f

# Enable GitHub Pages in repo settings
```

### Method 3: Deploy to Any Web Server

1. Build the web version:
```bash
cd game
npm run build:web
```

2. Copy files from `game/build/web/` to your web server

3. Access via your domain

---

## 🤖 Android APK Deployment

### Prerequisites

- **Java JDK 8+** - [Download](https://adoptium.net/)
- **Android Studio** - [Download](https://developer.android.com/studio)
- **Android SDK** - API 21+ (Android 5.0 Lollipop)
- **Node.js** - [Download](https://nodejs.org/)
- **Cordova CLI** - `npm install -g cordova`

### Setup

```bash
# Install Cordova globally
npm install -g cordova

# Navigate to cordova directory
cd game/cordova

# Install Cordova dependencies
npm install

# Add Android platform
cordova platform add android
```

### Build Debug APK

```bash
# Build debug APK (for testing)
cordova build android

# Run on connected device
cordova run android
```

APK location: `game/cordova/platforms/android/app/build/outputs/apk/debug/app-debug.apk`

### Build Release APK

```bash
# Build release APK (for distribution)
cordova build android --release
```

APK location: `game/cordova/platforms/android/app/build/outputs/apk/release/app-release.apk`

### Signing the APK (Required for Release)

1. **Generate a keystore** (do this once):

```bash
keytool -genkey -v -keystore pipe-runner-release.keystore \
    -alias pipe-runner -keyalg RSA -keysize 2048 -validity 10000
```

2. **Sign the APK**:

```bash
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
    -keystore pipe-runner-release.keystore \
    platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk \
    pipe-runner

# Align the APK
zipalign -v 4 platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk \
    PipeRunner-signed.apk
```

3. **Optimize the APK** (optional):

```bash
# Install Android SDK Build-Tools
# Then run:
zipalign -v 4 app-release-unsigned.apk PipeRunner.apk
```

### Using the Build Script

For a simpler approach, use the provided build script:

```bash
cd game
chmod +x build.sh
./build.sh
```

This will:
1. Build the web version
2. Build the Android APK (if Cordova is installed)
3. Copy APK to `game/build/android/PipeRunner.apk`

---

## 📱 Mobile Web Deployment

For the best mobile experience, deploy to a web server with HTTPS.

### Requirements
- HTTPS (required for some mobile features)
- Touch-friendly design (already implemented)
- Viewport meta tag (already configured)

### Testing on Mobile

1. Deploy to a web server with HTTPS
2. Open on your mobile device
3. Add to home screen for app-like experience

### Progressive Web App (PWA) - Optional Enhancement

To make Pipe Runner installable as a PWA:

1. Add a manifest file `game/manifest.json`:

```json
{
  "name": "Pipe Runner",
  "short_name": "PipeRunner",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "favicon.ico",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

2. Add to `index.html` head:

```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#000000">
```

3. Add a service worker for offline support

---

## 🎮 Game Distribution

### Itch.io

1. Build web version: `npm run build:web`
2. Zip the `game/build/web/` folder
3. Upload to Itch.io as HTML project
4. Set "Embedded" or "Downloadable" options

### Google Play Store

1. Build signed APK (see above)
2. Create a developer account ($25 one-time fee)
3. Create app listing with screenshots
4. Upload APK to Google Play Console
5. Publish!

### Amazon Appstore

Similar to Google Play, but for Amazon Fire devices.

### Self-Hosting

Simply upload the `build/web/` files to any web server:
- GitHub Pages (free)
- Netlify (free)
- Vercel (free)
- Any shared hosting

---

## 🔧 Customization Before Deployment

### Change Game Name
Edit `game/cordova/config.xml`:
```xml
<widget id="com.jibes.piperunner" version="1.0.0">
    <name>Pipe Runner</name>
    ...
</widget>
```

### Change App Icon
Replace `game/cordova/res/icon.png` (create the `res` directory if needed)

### Change Splash Screen
Replace `game/cordova/res/screen.png`

### Change Package ID
Edit `game/cordova/config.xml`:
```xml
<widget id="com.yourcompany.gamename" ...>
```

### Modify Game Difficulty
Edit `game/src/config.js`:
```javascript
CONFIG.maxLevels = 3;  // Change number of levels
CONFIG.playerSpeed = 200;  // Adjust movement speed
CONFIG.gravity = 800;  // Adjust gravity
```

---

## 📊 Monitoring & Analytics

### Google Analytics (Optional)

Add to `index.html` head:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Custom Analytics

Add tracking in game scenes:

```javascript
// In SceneGame.js
this.input.on('pointerdown', () => {
    // Track button click
    if (window.gtag) gtag('event', 'click', { 'event_category': 'button', 'event_label': 'jump' });
});
```

---

## 🛠️ Troubleshooting Deployment

### Web Version Issues

**Problem: Blank screen**
- Check browser console (F12) for errors
- Ensure Phaser loads from CDN or local file
- Verify all JavaScript files are in correct location

**Problem: Touch controls not working**
- Ensure `touch-action: none` is set on body
- Test on actual mobile device, not just emulator

**Problem: No sound**
- Some browsers block audio until user interaction
- Add a "Click to start" button that triggers audio

### Android Build Issues

**Problem: "Java not found"**
- Install Java JDK 8+
- Set `JAVA_HOME` environment variable

**Problem: "Android SDK not found"**
- Install Android Studio
- Set `ANDROID_HOME` or `ANDROID_SDK_ROOT` environment variable
- Ensure SDK platforms are installed (API 21+)

**Problem: "Cordova not found"**
- Install Cordova: `npm install -g cordova`
- Verify installation: `cordova --version`

**Problem: "Build failed"**
- Check Cordova requirements: `cordova requirements android`
- Update Cordova: `npm install -g cordova@latest`
- Clean build: `rm -rf platforms/ plugins/ node_modules/ && npm install`

### Common Solutions

**Clean and rebuild:**
```bash
# Web
rm -rf game/build/web
npm run build:web

# Android
cd game/cordova
rm -rf platforms/ plugins/
npm install
cordova platform add android
cordova build android
```

**Check Node.js version:**
```bash
node --version  # Should be 16+
npm --version   # Should be 8+
```

---

## 📞 Support

If you encounter issues during deployment:

1. Check this documentation
2. Search for similar issues on GitHub
3. Open a new issue: [https://github.com/jibes/plumber-game/issues](https://github.com/jibes/plumber-game/issues)

Include:
- Operating system
- Node.js version
- Browser (for web issues)
- Android SDK version (for Android issues)
- Error messages
- Steps to reproduce

---

**Happy Deploying! 🚀**
