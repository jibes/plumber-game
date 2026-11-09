#!/bin/bash

# Pipe Runner Build Script
# Builds both web and Android versions

set -e

echo "=========================================="
echo "Pipe Runner - Build Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Run this script from the game/ directory${NC}"
    exit 1
fi

# Build web version
echo -e "${YELLOW}Building Web Version...${NC}"
npm install --silent
npm run build:web
echo -e "${GREEN}Web build complete!${NC}"
echo -e "Web files are in: build/web/"

# Check for Cordova
if command -v cordova &> /dev/null; then
    echo -e "${YELLOW}Building Android APK...${NC}"
    
    cd cordova
    
    # Install Cordova dependencies
    npm install --silent
    
    # Add Android platform if not present
    if [ ! -d "platforms/android" ]; then
        echo -e "Adding Android platform..."
        cordova platform add android --silent
    fi
    
    # Build Android
    echo -e "Building APK (this may take a few minutes)..."
    cordova build android --release --device
    
    # Find the APK
    APK_PATH="platforms/android/app/build/outputs/apk/release/app-release.apk"
    
    if [ -f "$APK_PATH" ]; then
        echo -e "${GREEN}Android APK built successfully!${NC}"
        echo -e "APK location: $APK_PATH"
        
        # Copy APK to build directory
        mkdir -p ../build/android
        cp "$APK_PATH" ../build/android/PipeRunner.apk
        echo -e "APK also copied to: build/android/PipeRunner.apk"
    else
        echo -e "${YELLOW}Warning: APK not found at expected location${NC}"
        echo -e "Check: platforms/android/app/build/outputs/apk/"
    fi
    
    cd ..
else
    echo -e "${YELLOW}Cordova not found - skipping Android build${NC}"
    echo -e "To build Android APK, install Cordova:"
    echo -e "  npm install -g cordova"
    echo -e "  Then run: cordova platform add android"
fi

echo ""
echo -e "${GREEN}=========================================="
echo "Build Complete!"
echo "=========================================="
echo "Web: build/web/"
echo "Android: build/android/PipeRunner.apk (if built)"
echo -e "==========================================${NC}"
