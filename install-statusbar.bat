@echo off
echo 📱 Instalando plugin de StatusBar de Capacitor...

REM Intentar instalar el plugin
call npm install @capacitor/status-bar

if %ERRORLEVEL% NEQ 0 (
    echo ⚠️  Error al instalar, intentando con flag --legacy-peer-deps...
    call npm install @capacitor/status-bar --legacy-peer-deps
)

if %ERRORLEVEL% EQU 0 (
    echo ✅ Plugin instalado exitosamente
    echo.
    echo Ahora necesitas sincronizar con Android:
    echo   npx cap sync android
) else (
    echo ❌ Error instalando el plugin
    pause
    exit /b 1
)

pause

