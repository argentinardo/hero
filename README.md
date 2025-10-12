# 🎮 NEW H.E.R.O.

Un clon moderno del clásico H.E.R.O. con editor de niveles incluido.

## 🚀 Inicio Rápido

### Desarrollo Web
```bash
npm install
npm run dev
```
Abre http://localhost:8080

### Build Producción Web
```bash
npm run build:web
```
Los archivos estarán en `/dist`

### Build Android (APK)

#### Primera vez:
```bash
# Windows
setup-android.bat

# Linux/Mac
chmod +x setup-android.sh
./setup-android.sh
```

#### Builds posteriores:
```bash
npm run build:android
```

## 📱 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build web producción |
| `npm run build:web` | Build web producción |
| `npm run build:android` | Build + Android Studio |
| `npm run build:all` | Build web + sync Android |

## 🎯 Características

- ✅ Juego completo tipo H.E.R.O.
- ✅ Editor de niveles visual
- ✅ Generador automático de niveles
- ✅ Controles móviles (joystick virtual)
- ✅ Sistema de vidas, energía y puntuación
- ✅ Múltiples enemigos y obstáculos
- ✅ Soporte web y Android

## 🛠️ Tecnologías

- TypeScript
- Webpack 5
- Canvas API
- Capacitor (para Android)
- Tailwind CSS
- SCSS

## 📖 Documentación Completa

Ver [BUILD_GUIDE.md](BUILD_GUIDE.md) para instrucciones detalladas de compilación.

## 🎮 Controles

### PC/Web:
- **←→**: Mover
- **↑**: Volar (mantener presionado)
- **↓**: Soltar bomba
- **Espacio**: Disparar láser

### Móvil:
- **Joystick**: Movimiento
- **Botón LÁSER**: Disparar
- **Botón BOMBA**: Soltar bomba

## 🔧 Requisitos

### Web:
- Node.js 16+
- npm o pnpm

### Android:
- Java JDK 11+
- Android Studio
- Android SDK (API 22+)

## 📦 Deploy

### Web (Netlify):
```bash
npm run build:web
# Sube la carpeta /dist a Netlify
```

### Android (Google Play):
1. Build release APK firmado
2. Sube a Google Play Console

## 📝 Licencia

MIT

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

---

Hecho con ❤️ y TypeScript

