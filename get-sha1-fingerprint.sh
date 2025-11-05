#!/bin/bash

echo "========================================"
echo "Obtener SHA-1 Fingerprint para Google OAuth"
echo "========================================"
echo ""

echo "Selecciona el tipo de keystore:"
echo "1. Debug keystore (para desarrollo/testing)"
echo "2. Release keystore (para producción)"
echo ""
read -p "Elige una opción (1 o 2): " choice

if [ "$choice" == "1" ]; then
    echo ""
    echo "Obteniendo SHA-1 del keystore de DEBUG..."
    echo ""
    DEBUG_KEYSTORE="$HOME/.android/debug.keystore"
    echo "Ubicación: $DEBUG_KEYSTORE"
    echo ""
    echo "NOTA: La contraseña por defecto es 'android'"
    echo ""
    keytool -list -v -keystore "$DEBUG_KEYSTORE" -alias androiddebugkey -storepass android -keypass android
elif [ "$choice" == "2" ]; then
    echo ""
    echo "Obteniendo SHA-1 del keystore de RELEASE..."
    echo ""
    read -p "Ingresa la ruta completa al keystore (ej: ./hero-release-key.keystore): " keystore_path
    read -sp "Ingresa la contraseña del keystore: " keystore_password
    echo ""
    read -p "Ingresa el alias de la clave (ej: hero): " key_alias
    echo ""
    keytool -list -v -keystore "$keystore_path" -alias "$key_alias" -storepass "$keystore_password" -keypass "$keystore_password"
else
    echo "Opción inválida"
    exit 1
fi

echo ""
echo "========================================"
echo "IMPORTANTE: Busca 'SHA1:' en la salida de arriba"
echo "Copia el valor que aparece después de 'SHA1: '"
echo "Ejemplo: SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD"
echo "========================================"
echo ""

