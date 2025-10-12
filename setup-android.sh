#!/bin/bash

echo "🚀 Configurando NEW H.E.R.O. para Android..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js instalado${NC}"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm instalado${NC}"

# Instalar dependencias
echo -e "${YELLOW}📦 Instalando dependencias...${NC}"
npm install

# Instalar Capacitor
echo -e "${YELLOW}📱 Instalando Capacitor...${NC}"
npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev

# Inicializar Capacitor
echo -e "${YELLOW}⚙️  Inicializando Capacitor...${NC}"
npx cap init "NEW H.E.R.O." "com.hero.game" --web-dir=dist

# Build inicial
echo -e "${YELLOW}🔨 Haciendo build inicial...${NC}"
npm run build:web

# Agregar Android
echo -e "${YELLOW}📱 Agregando plataforma Android...${NC}"
npx cap add android

# Sync
echo -e "${YELLOW}🔄 Sincronizando con Android...${NC}"
npx cap sync

echo -e "${GREEN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ¡Configuración completada!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo "Próximos pasos:"
echo "1. Abre Android Studio: npm run cap:open:android"
echo "2. Espera a que Gradle sincronice"
echo "3. Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo ""
echo "Para desarrollo:"
echo "- Web: npm run dev"
echo "- Android: npm run build:android"
echo ""

