# 🎮 NEW H.E.R.O.

Un clon moderno del clásico H.E.R.O. con editor de niveles incluido.

## 📚 Documentación Completa

### Documentación Técnica Generada

La documentación técnica completa del juego generada con JSDoc está disponible en:

**📖 [Documentación JSDoc Interactiva](./docs/index.html)**

Esta documentación incluye:
- 📝 Explicación completa del funcionamiento del juego
- 🏗️ Arquitectura y flujo del código
- 🔧 Referencias de todas las funciones y clases
- 💡 Ejemplos de uso y comentarios detallados
- 🔗 Enlaces cruzados entre módulos

### Para Generar/Ver la Documentación Localmente:

```bash
# Generar documentación
npm run docs:generate

# Servir documentación localmente
npm run docs:serve
```

Luego abre **http://localhost:8081** en tu navegador para ver la documentación.

### Documentación Adicional:

- **🏗️ [Guía de Arquitectura](./ARCHITECTURE_DECISIONS.md)** - Decisiones arquitectónicas y justificaciones técnicas
- **🎮 [Visión General del Juego](./GAME_OVERVIEW.md)** - Explicación completa de mecánicas y funcionamiento
- **🔧 [Guía de Compilación](./BUILD_GUIDE.md)** - Instrucciones detalladas de compilación

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
- ✅ **Galería de niveles comunitarios** con likes y votos
- ✅ **Sistema de compartir niveles** a la comunidad
- ✅ **Implementación de niveles** para personalizarlos
- ✅ Controles móviles (joystick virtual)
- ✅ **Soporte para joystick Bluetooth**
- ✅ Sistema de vidas, energía y puntuación
- ✅ Múltiples enemigos y obstáculos
- ✅ **Sistema de usuarios** con autenticación (Netlify Identity)
- ✅ **Perfil de usuario** editable con nickname y avatar
- ✅ Soporte web y Android (PWA)

## 🛠️ Tecnologías

- TypeScript
- Webpack 5
- Canvas API
- Capacitor (para Android)
- Tailwind CSS
- SCSS

## 📖 Documentación Completa

### Documentación Técnica
- **[ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md)** - Decisiones arquitectónicas y justificaciones técnicas
- **[SOLID_REFACTORING.md](./SOLID_REFACTORING.md)** - Principios SOLID aplicados al proyecto
- **[BUILD_GUIDE.md](./BUILD_GUIDE.md)** - Instrucciones detalladas de compilación

### Documentación SOLID
- **[src/scripts/solid/README.md](./src/scripts/solid/README.md)** - Arquitectura SOLID implementada
- **[src/scripts/solid/ARCHITECTURE.md](./src/scripts/solid/ARCHITECTURE.md)** - Arquitectura detallada
- **[src/scripts/solid/DESIGN_PATTERNS.md](./src/scripts/solid/DESIGN_PATTERNS.md)** - Patrones de diseño utilizados

## 🏗️ Arquitectura

### Principios de Diseño Aplicados

Este proyecto aplica los principios SOLID de ingeniería de software:

- **S (Single Responsibility)**: Cada componente tiene una responsabilidad única
- **O (Open/Closed)**: Sistema extensible sin modificar código existente
- **L (Liskov Substitution)**: Interfaces consistentes para todas las entidades
- **I (Interface Segregation)**: Interfaces específicas por funcionalidad
- **D (Dependency Inversion)**: Dependencias de abstracciones, no implementaciones

### Decisiones Técnicas Clave

1. **Estado Global Centralizado**: `GameStore` como única fuente de verdad
2. **TypeScript Estricto**: Tipado completo para mayor seguridad y documentación
3. **Canvas API Nativo**: Sin librerías pesadas para mejor control y performance
4. **Lazy Loading**: Carga diferida de módulos y assets no críticos
5. **Frame Rate Adaptativo**: 30 FPS en móvil, 60 FPS en desktop

Para más detalles, ver [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md).

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

