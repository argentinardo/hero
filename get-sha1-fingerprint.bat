@echo off
echo ========================================
echo Obtener SHA-1 Fingerprint para Google OAuth
echo ========================================
echo.

REM Obtener el directorio del usuario
set USERPROFILE_DIR=%USERPROFILE%

echo Selecciona el tipo de keystore:
echo 1. Debug keystore (para desarrollo/testing)
echo 2. Release keystore (para produccion)
echo.
set /p choice="Elige una opcion (1 o 2): "

if "%choice%"=="1" goto debug
if "%choice%"=="2" goto release

:debug
echo.
echo Obteniendo SHA-1 del keystore de DEBUG...
echo.
echo Ubicacion: %USERPROFILE_DIR%\.android\debug.keystore
echo.
echo NOTA: La contraseña por defecto es "android"
echo.
keytool -list -v -keystore "%USERPROFILE_DIR%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
goto end

:release
echo.
echo Obteniendo SHA-1 del keystore de RELEASE...
echo.
set /p keystore_path="Ingresa la ruta completa al keystore (ej: D:\repos\hero\hero-release-key.keystore): "
set /p keystore_password="Ingresa la contraseña del keystore: "
set /p key_alias="Ingresa el alias de la clave (ej: hero): "
echo.
keytool -list -v -keystore "%keystore_path%" -alias %key_alias% -storepass %keystore_password% -keypass %keystore_password%
goto end

:end
echo.
echo ========================================
echo IMPORTANTE: Busca "SHA1:" en la salida de arriba
echo Copia el valor que aparece despues de "SHA1: "
echo Ejemplo: SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
echo ========================================
echo.
pause

