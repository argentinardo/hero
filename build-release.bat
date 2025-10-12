@echo off
echo 🏗️  Building NEW H.E.R.O. for Release...

REM Build web
echo 📦 Building web version...
call npm run build:web

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Web build failed
    exit /b 1
)
echo ✅ Web build successful

REM Sync con Android
echo 🔄 Syncing with Android...
call npx cap sync

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Sync failed
    exit /b 1
)
echo ✅ Sync successful

REM Build Android Release
echo 📱 Building Android Release APK...
cd android

REM Verificar si existe el keystore
if not exist "..\hero-release-key.keystore" (
    echo ❌ Keystore not found!
    echo Generate it with:
    echo keytool -genkey -v -keystore hero-release-key.keystore -alias hero -keyalg RSA -keysize 2048 -validity 10000
    exit /b 1
)

call gradlew.bat assembleRelease

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Android build failed
    exit /b 1
)

cd ..

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ Release build completed!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📦 Files generated:
echo   Web: dist/
echo   Android: android\app\build\outputs\apk\release\app-release.apk
echo.
pause

