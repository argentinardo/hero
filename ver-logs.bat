@echo off
echo ========================================
echo CAPTURANDO LOGS DE LA APP
echo ========================================
echo.
echo 1. Abre la app en tu dispositivo Android
echo 2. Los logs apareceran aqui abajo
echo 3. Presiona Ctrl+C para detener
echo.
echo ========================================
echo.

adb logcat -c
timeout /t 2 >nul
adb logcat | findstr /i "Bootstrap Main ERROR FATAL chromium console AndroidRuntime"

