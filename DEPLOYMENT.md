# Deployment

## Web (GitHub Pages)

1. One-time setup: **Settings → Pages → Source: GitHub Actions**.
2. Push to `main` (or run the *Deploy to GitHub Pages* workflow manually). `.github/workflows/deploy.yml` runs `npm ci && npm test && npm run build:web` in `game/` and publishes `game/build/web/`.

The site is served at `https://jibes.github.io/plumber-game/`. Pull requests and other branches run the same checks via `.github/workflows/ci.yml`.

Any other static host works: run `npm run build:web` in `game/` and upload `build/web/` (`index.html`, `src/`, `vendor/`). The build has no external requests, so it also works offline.

## Android (Cordova)

Prerequisites: JDK 17, Android SDK with `ANDROID_HOME` set, and Gradle. See the [Cordova Android requirements](https://cordova.apache.org/docs/en/latest/guide/platforms/android/) for current versions.

```bash
cd game
./build.sh              # web build + debug APK -> build/android/
./build.sh --release    # signed release build, needs cordova/build.json
```

`build.sh` copies `build/web` into `cordova/www`, which is generated and git-ignored. Cordova settings live in `game/cordova/config.xml`: app id `com.jibes.piperunner`, landscape, minSdk 24, targetSdk 35.

### Signing a release

Create a keystore once, and keep it out of git (`*.keystore` is ignored):

```bash
keytool -genkey -v -keystore cordova/release.keystore -alias piperunner -keyalg RSA -keysize 2048 -validity 10000
```

`cordova/build.json`, also git-ignored:

```json
{
  "android": {
    "release": {
      "keystore": "release.keystore",
      "alias": "piperunner",
      "storePassword": "…",
      "password": "…",
      "packageType": "bundle"
    }
  }
}
```

Use `"packageType": "bundle"` (AAB) for Google Play, or `"apk"` for sideloading.
