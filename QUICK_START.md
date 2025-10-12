# ⚡ Inicio Rápido - NEW H.E.R.O.

## 🌐 Para WEB (5 minutos)

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir navegador
# http://localhost:8080
```

¡Listo! El juego está corriendo. 🎮

---

## 📱 Para ANDROID (15-20 minutos)

### Requisitos previos:
- ✅ Java JDK 11+ instalado
- ✅ Android Studio instalado
- ✅ Android SDK configurado

### Pasos:

#### 1️⃣ Instalación Automática (Recomendado)

**Windows:**
```bash
setup-android.bat
```

**Linux/Mac:**
```bash
chmod +x setup-android.sh
./setup-android.sh
```

#### 2️⃣ Abrir en Android Studio
```bash
npm run cap:open:android
```

#### 3️⃣ Generar APK
En Android Studio:
- Espera a que Gradle termine de sincronizar
- Menu: **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
- El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🔄 Workflow de Desarrollo

### Trabajando en el código:

1. **Edita el código** en `src/`
2. **Prueba en web**: `npm run dev`
3. **Build para Android**: `npm run build:android`

### Ciclo rápido:

```bash
# Después de cada cambio:
npm run build:all

# Luego en Android Studio:
# Run > Run 'app'
```

---

## 🎯 Builds Finales

### Web Producción:
```bash
npm run build:web
# Sube /dist a tu hosting
```

### Android Release:
```bash
# Desde la carpeta android/
cd android
./gradlew assembleRelease
# APK en: app/build/outputs/apk/release/
```

---

## 🆘 Problemas Comunes

### "npx cap not found"
```bash
npm install @capacitor/cli --save-dev
```

### "Android SDK not found"
1. Abre Android Studio
2. Tools > SDK Manager
3. Instala Android SDK (API 22+)

### "Build failed in Android Studio"
1. File > Invalidate Caches / Restart
2. Build > Clean Project
3. Build > Rebuild Project

### El juego no se ve en Android
```bash
npm run build:web
npm run cap:sync
```

---

## 📚 Más Información

- **Documentación completa**: [BUILD_GUIDE.md](BUILD_GUIDE.md)
- **README**: [README.md](README.md)

---

**¡Diviértete desarrollando! 🚀**

