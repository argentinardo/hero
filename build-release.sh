#!/bin/bash

echo "🏗️  Building NEW H.E.R.O. for Release..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Build web
echo -e "${YELLOW}📦 Building web version...${NC}"
npm run build:web

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Web build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Web build successful${NC}"

# Sync con Android
echo -e "${YELLOW}🔄 Syncing with Android...${NC}"
npx cap sync

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Sync failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Sync successful${NC}"

# Build Android Release
echo -e "${YELLOW}📱 Building Android Release APK...${NC}"
cd android

# Verificar si existe el keystore
if [ ! -f "../hero-release-key.keystore" ]; then
    echo -e "${RED}❌ Keystore not found!${NC}"
    echo "Generate it with:"
    echo "keytool -genkey -v -keystore hero-release-key.keystore -alias hero -keyalg RSA -keysize 2048 -validity 10000"
    exit 1
fi

./gradlew assembleRelease

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Android build failed${NC}"
    exit 1
fi

cd ..

echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Release build completed!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo "📦 Files generated:"
echo "  Web: dist/"
echo "  Android: android/app/build/outputs/apk/release/app-release.apk"
echo ""

