@echo off
echo 🚀 Configurando NEW H.E.R.O. para Android...

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js no está instalado
    exit /b 1
)
echo ✅ Node.js instalado

REM Verificar npm
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm no está instalado
    exit /b 1
)
echo ✅ npm instalado

REM Instalar dependencias
echo 📦 Instalando dependencias...
call npm install

REM Instalar Capacitor
echo 📱 Instalando Capacitor...
call npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev

REM Inicializar Capacitor
echo ⚙️  Inicializando Capacitor...
call npx cap init "NEW H.E.R.O." "com.newhero.game" --web-dir=dist

REM Build inicial
echo 🔨 Haciendo build inicial...
call npm run build:web

REM Agregar Android
echo 📱 Agregando plataforma Android...
call npx cap add android

REM Sync
echo 🔄 Sincronizando con Android...
call npx cap sync

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ ¡Configuración completada!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Próximos pasos:
echo 1. Abre Android Studio: npm run cap:open:android
echo 2. Espera a que Gradle sincronice
echo 3. Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo.
echo Para desarrollo:
echo - Web: npm run dev
echo - Android: npm run build:android
echo.
pause

