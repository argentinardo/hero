# Configuración de Google OAuth para Android

Este documento explica cómo obtener el SHA-1 fingerprint necesario para configurar Google OAuth en aplicaciones Android.

## ¿Qué es el SHA-1 Fingerprint?

El SHA-1 fingerprint es un identificador único de tu keystore de Android. Google lo necesita para verificar que tu aplicación tiene permiso para usar Google Sign-In.

## Obtener el SHA-1 Fingerprint

### Opción 1: Usar el script automatizado (Recomendado)

#### Windows:
```bash
get-sha1-fingerprint.bat
```

#### Linux/Mac:
```bash
chmod +x get-sha1-fingerprint.sh
./get-sha1-fingerprint.sh
```

### Opción 2: Comando manual

#### Para Debug Keystore (desarrollo/testing):
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**En Linux/Mac:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

#### Para Release Keystore (producción):
```bash
keytool -list -v -keystore path-to-your-keystore -alias your-key-alias -storepass your-keystore-password -keypass your-key-password
```

**Ejemplo con el keystore del proyecto:**
```bash
keytool -list -v -keystore hero-release-key.keystore -alias hero -storepass tu-password -keypass tu-password
```

## Ubicación de los Keystores

### Debug Keystore (por defecto):
- **Windows**: `C:\Users\TU_USUARIO\.android\debug.keystore`
- **Linux/Mac**: `~/.android/debug.keystore`
- **Contraseña por defecto**: `android`
- **Alias por defecto**: `androiddebugkey`

### Release Keystore:
- Si ya creaste uno, probablemente está en la raíz del proyecto: `hero-release-key.keystore`
- Si no lo has creado, puedes generarlo con:
  ```bash
  keytool -genkey -v -keystore hero-release-key.keystore -alias hero -keyalg RSA -keysize 2048 -validity 10000
  ```

## Interpretar la salida

Después de ejecutar el comando, verás algo como esto:

```
Alias name: androiddebugkey
Creation date: Jan 1, 2020
Entry type: PrivateKeyEntry
Certificate chain length: 1
Certificate[1]:
Owner: CN=Android Debug, O=Android, C=US
Issuer: CN=Android Debug, O=Android, C=US
Serial number: 1234567890abcdef
Valid from: Mon Jan 01 00:00:00 UTC 2020 until: Tue Jan 01 00:00:00 UTC 2050
Certificate fingerprints:
     SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
     SHA256: 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF
```

**Copia el valor después de "SHA1: "** (sin espacios, pero con los dos puntos):
```
AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
```

## Configurar en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en tu **OAuth 2.0 Client ID** (o créalo si no existe)
5. En la sección **Android**, agrega:
   - **Package name**: `com.hero.game` (de `capacitor.config.json`)
   - **SHA-1 certificate fingerprint**: Pega el SHA-1 que obtuviste
6. Guarda los cambios

## Notas importantes

- **Necesitas ambos SHA-1**: Uno del debug keystore (para testing) y otro del release keystore (para producción)
- Puedes agregar múltiples SHA-1 en Google Cloud Console
- El proceso puede tardar unos minutos en propagarse
- Si cambias de keystore, necesitarás actualizar el SHA-1 en Google Cloud Console

## Solución de problemas

### Error: "keystore file not found"
- Verifica que la ruta al keystore sea correcta
- Asegúrate de usar rutas absolutas o relativas correctas
- En Windows, usa `%USERPROFILE%` para la ruta del usuario

### Error: "password incorrect"
- Para debug keystore, la contraseña es siempre `android`
- Para release keystore, usa la contraseña que configuraste al crearlo
- Si olvidaste la contraseña, necesitarás crear un nuevo keystore

### No veo el SHA-1 en la salida
- Asegúrate de usar el flag `-v` (verbose) en el comando
- Busca "SHA1:" en la salida (puede estar en mayúsculas o minúsculas)
- El SHA-1 está en la sección "Certificate fingerprints"

