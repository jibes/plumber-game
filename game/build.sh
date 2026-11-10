#!/bin/bash
# Pipe Runner build script: web build always, Android APK when the Android SDK is available.
# Release (signed) APK: put a Cordova build.json with your keystore in cordova/ and pass --release.
set -euo pipefail
cd "$(dirname "$0")"

npm install
npm test
npm run build:web
echo "Web build: build/web/"

if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ]; then
    echo "Android SDK not found (set ANDROID_HOME) - skipping APK"
    exit 0
fi

rm -rf cordova/www
cp -r build/web cordova/www
cd cordova
npm install
npx cordova prepare android
if [ "${1:-}" = "--release" ]; then
    npx cordova build android --release --buildConfig=build.json
else
    npx cordova build android
fi

mkdir -p ../build/android
find platforms/android/app/build/outputs \( -name '*.apk' -o -name '*.aab' \) -exec cp {} ../build/android/ \;
echo "Android output: build/android/"
