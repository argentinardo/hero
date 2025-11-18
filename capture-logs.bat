@echo off
echo Limpiando logs anteriores...
adb logcat -c
echo.
echo ========================================
echo CAPTURANDO LOGS - Abre la app ahora
echo ========================================
echo.
echo Presiona Ctrl+C para detener
echo.
adb logcat | findstr /i "Bootstrap Main ERROR FATAL chromium console AndroidRuntime"

