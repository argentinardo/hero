# 🚀 Guía de Build - NEW H.E.R.O.

## 📋 Requisitos Previos

### Para Build Web:
- Node.js (v16+)
- npm o pnpm

### Para Build Android (APK):
- Java JDK 11 o superior
- Android Studio
- Android SDK (API 22+)

---

## 🔧 Instalación Inicial (Solo una vez)

```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Instalar Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android --save-dev

# 3. Inicializar Capacitor (si aún no está inicializado)
npx cap init

# 4. Agregar plataforma Android
npm run cap:add:android
```

---

## 🌐 Build para WEB (HTML)

### Desarrollo:
```bash
npm run dev
# El juego estará disponible en http://localhost:8080
```

### Producción:
```bash
npm run build:web
# Los archivos estarán en la carpeta /dist
```

---

## 📱 Build para ANDROID (APK)

### Opción 1: Build y Abrir Android Studio
```bash
npm run build:android
```
Esto:
1. ✅ Hace el build de producción web
2. ✅ Sincroniza los archivos con el proyecto Android
3. ✅ Abre Android Studio automáticamente
4. ✅ Desde Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)

### Opción 2: Build Directo desde CLI
```bash
# Build web
npm run build:web

# Sincronizar con Android
npm run cap:sync

# Abrir proyecto Android
npm run cap:open:android

# Desde Android Studio:
# - Build > Build Bundle(s) / APK(s) > Build APK(s)
# - O usando Gradle: ./gradlew assembleDebug (desde la carpeta android/)
```

---

## 🎯 Build SIMULTÁNEO (Web + Android sync)

```bash
npm run build:all
```

Esto prepara ambas versiones:
- ✅ Build optimizado para web en `/dist`
- ✅ Sincroniza con el proyecto Android
- ✅ Listo para abrir en Android Studio y generar APK

---

## 📦 Ubicación de los Archivos Finales

### Web:
```
/dist/
  ├── index.html
  ├── bundle.js
  └── assets/
```

### Android APK:
```
/android/app/build/outputs/apk/debug/app-debug.apk
```
O para release:
```
/android/app/build/outputs/apk/release/app-release.apk
```

---

## 🔑 Build de Producción (APK Firmado)

Para publicar en Google Play Store, necesitas un APK firmado:

### 1. Generar Keystore:
```bash
keytool -genkey -v -keystore hero-release-key.keystore -alias hero -keyalg RSA -keysize 2048 -validity 10000
```

### 2. Configurar en `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file("../../hero-release-key.keystore")
            storePassword "tu-password"
            keyAlias "hero"
            keyPassword "tu-password"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### 3. Build Release:
```bash
cd android
./gradlew assembleRelease
```

El APK estará en: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🛠️ Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build web producción |
| `npm run build:web` | Build web producción |
| `npm run build:android` | Build + abrir Android Studio |
| `npm run build:all` | Build web + sync Android |
| `npm run cap:sync` | Sincronizar cambios con Android |
| `npm run cap:open:android` | Abrir proyecto en Android Studio |

---

## 🐛 Troubleshooting

### El juego no funciona en Android:
1. Revisa `capacitor.config.json` - debe apuntar a `webDir: "dist"`
2. Ejecuta `npm run cap:sync` después de cada build web
3. Verifica que Android Studio tenga el SDK correcto instalado

### Error al guardar niveles en Android:
El endpoint `/api/save-levels` no funcionará en APK. Implementa alternativas:
- Usa Capacitor Filesystem API
- O deshabilita la función de guardar en APK

### Performance en Android:
- Activa "Hardware Acceleration" en `AndroidManifest.xml`
- Desactiva `webContentsDebuggingEnabled` en producción

---

## 📝 Notas Importantes

1. **Cada vez que cambies código web**, ejecuta:
   ```bash
   npm run build:all
   ```

2. **Para probar en dispositivo Android**, usa:
   - Android Studio Run button
   - O instala el APK manualmente

3. **El editor de niveles** funciona mejor en web durante desarrollo

4. **Permisos**: Si necesitas acceso a archivos, agrega permisos en `AndroidManifest.xml`

---

## 🚢 Deploy

### Web (Netlify/Vercel):
```bash
npm run build:web
# Sube la carpeta /dist
```

### Android (Google Play):
1. Genera APK firmado (release)
2. Sube a Google Play Console
3. Sigue el proceso de revisión

---

¡Listo! Ahora puedes compilar tu juego para web y Android de manera eficiente. 🎮

