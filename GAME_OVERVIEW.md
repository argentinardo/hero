# 🎮 NEW H.E.R.O. - Visión General del Juego

## ¿Qué es NEW H.E.R.O.?

NEW H.E.R.O. es un clon moderno del clásico juego de plataformas H.E.R.O. (Helicopter Emergency Rescue Operations), desarrollado con tecnologías web modernas (TypeScript, Canvas API) y disponible tanto en web como en Android como Progressive Web App (PWA).

## 🎯 Objetivo del Juego

El jugador controla a un héroe minero que debe rescatar a otros mineros atrapados en las profundidades de una mina. Para hacerlo, debe:

1. **Navegar** por niveles verticales descendiendo desde la superficie hasta encontrar al minero
2. **Evitar obstáculos** como lava, enemigos (arañas, víboras, murciélagos), y trampas
3. **Usar herramientas**:
   - **Jetpack**: Para volar y navegar verticalmente
   - **Láser**: Para destruir bloques destructibles y eliminar enemigos
   - **Bombas TNT**: Para destruir bloques resistentes y crear caminos
4. **Gestionar recursos**:
   - **Energía**: Se consume al usar el jetpack y se recarga con el tiempo
   - **Vidas**: Pierdes una vida si te quedas sin energía o caes en lava
   - **Bombas**: Tienes un número limitado de bombas TNT

## 🎮 Mecánicas de Juego

### Movimiento y Control

- **Movimiento Horizontal**: El héroe puede moverse izquierda/derecha con las teclas de flecha o joystick
- **Vuelo**: Mantener presionada la tecla arriba activa el jetpack, consumiendo energía
- **Gravedad**: El héroe cae automáticamente cuando no está volando
- **Inercia**: El movimiento tiene momentum, haciendo que el control se sienta fluido

### Sistema de Energía

- La energía se consume al usar el jetpack
- Se recarga automáticamente cuando no se usa
- Si la energía llega a 0 mientras vuelas, el héroe cae
- Puedes caer en lava o enemigos si pierdes energía en el aire

### Colisiones y Física

- **Colisiones con terreno**: El héroe se detiene al tocar bloques sólidos
- **Colisiones con enemigos**: Pierdes una vida si tocas un enemigo
- **Colisiones con lava**: Pierdes una vida si caes en lava
- **Colisiones con bombas**: Puedes recoger bombas adicionales
- **Colisiones con energía**: Puedes recoger energía para recargar

### Sistema de Niveles

- Cada nivel es un mapa vertical de tiles (20 tiles de ancho)
- Los niveles se generan procedimentalmente o se crean en el editor
- Hay un punto de inicio (spawn) y un punto final (minero a rescatar)
- Los niveles pueden tener múltiples caminos y rutas alternativas

## 🏗️ Arquitectura Técnica

### Game Loop

El juego utiliza un **game loop** que se ejecuta ~60 veces por segundo:

1. **Input**: Captura entrada del usuario (teclado, gamepad, touch)
2. **Update**: Actualiza estado del juego (física, colisiones, AI de enemigos)
3. **Render**: Dibuja el frame actual en el canvas

### Sistema de Renderizado

- **Canvas API nativo**: Sin librerías pesadas para máximo control
- **Sprite Sheets**: Todos los gráficos están en sprites optimizados
- **Culling**: Solo se renderizan elementos visibles en pantalla
- **Cámara**: Sistema de cámara que sigue al jugador suavemente

### Estados de la Aplicación

- **Menu**: Estado inicial, muestra menú principal
- **Playing**: Juego activo, jugador controlando al héroe
- **Editing**: Editor de niveles, permite crear/modificar niveles

## 📦 Componentes Principales

### Core (Núcleo)

- `state.ts`: Estado global del juego (GameStore)
- `types.ts`: Definiciones de tipos TypeScript
- `constants.ts`: Constantes del juego (tamaños, valores)
- `assets.ts`: Sistema de carga de sprites y assets
- `settings.ts`: Configuración del juego (audio, gráficos)

### Components (Componentes)

- `ui.ts`: Interfaz de usuario (menús, modales, configuración)
- `player.ts`: Lógica del jugador (movimiento, física, animaciones)
- `level.ts`: Sistema de niveles (carga, renderizado, colisiones)
- `render.ts`: Motor de renderizado (dibuja sprites, efectos, UI)
- `audio.ts`: Sistema de sonido (música de fondo, efectos)
- `editor.ts`: Editor de niveles (herramientas de edición)
- `gallery.ts`: Galería de niveles comunitarios
- `levelGenerator.ts`: Generador procedimental de niveles

### Utils (Utilidades)

- `device.ts`: Detección de dispositivo y utilidades móviles
- `gamepad.ts`: Soporte para joystick Bluetooth
- `levels.ts`: Utilidades para manejo de niveles (formato chunked, etc.)

## 🎨 Sistema de Assets

### Sprites

Los sprites están organizados en archivos PNG:
- `hero_*.png`: Animaciones del héroe (caminar, volar, saltar, etc.)
- `terrain.png`: Tiles del terreno (suelo, paredes, etc.)
- `enemies/*.png`: Sprites de enemigos (arañas, víboras, murciélagos)
- `effects/*.png`: Efectos visuales (explosiones, partículas)

### Audio

- `main.mp3`: Música de fondo principal
- `*.mp3`: Efectos de sonido (disparos, explosiones, recolección, etc.)

## 🔧 Configuración y Personalización

### Configuración de Audio

- Volumen de música
- Volumen de efectos de sonido
- Mute/Unmute global

### Configuración de Gráficos

- **Scanline**: Efecto de líneas de escaneo retro
- **Glow**: Resplandor en textos y UI
- **Brightness**: Brillo aumentado
- **Contrast**: Contraste aumentado
- **Vignette**: Oscurecimiento en bordes
- **Blur**: Desenfoque (1.5px desktop, 0.7px móvil)
- **Show FPS**: Mostrar contador de FPS
- **Mobile Full Width**: En móvil, ocupar todo el ancho ignorando relación de aspecto

## 🌐 Plataformas

### Web

- Funciona en cualquier navegador moderno
- Optimizado para pantallas landscape
- Soporte para teclado y gamepad
- PWA (Progressive Web App) - se puede instalar

### Android

- Empaquetado con Capacitor
- Soporte nativo para controles táctiles
- StatusBar configurable para fullscreen
- Optimizado para rendimiento en móviles

## 📖 Para Desarrolladores

### Estructura del Código

```
src/
├── scripts/
│   ├── main.ts              # Punto de entrada, game loop
│   ├── core/                # Núcleo del juego
│   ├── components/          # Componentes del juego
│   ├── utils/               # Utilidades
│   └── solid/               # Arquitectura SOLID (opcional)
├── styles/                  # Estilos SCSS
├── assets/                  # Sprites, audio, niveles
└── index.html              # HTML principal
```

### Cómo Contribuir

1. Lee [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) para entender las decisiones técnicas
2. Revisa [SOLID_REFACTORING.md](./SOLID_REFACTORING.md) para ver los principios aplicados
3. Consulta la documentación JSDoc generada: `npm run docs:generate && npm run docs:serve`

### Generar Documentación

```bash
# Generar documentación JSDoc
npm run docs:generate

# Servir documentación localmente
npm run docs:serve
```

Luego abre http://localhost:8081 en tu navegador.

## 🔗 Enlaces Útiles

- [Documentación JSDoc](./docs/index.html) - Documentación completa del código
- [Guía de Arquitectura](./ARCHITECTURE_DECISIONS.md) - Decisiones técnicas
- [Guía de Compilación](./BUILD_GUIDE.md) - Instrucciones de build
- [Guía de Despliegue](./DEPLOYMENT_CHECKLIST.md) - Checklist de despliegue

---

**Versión**: 1.0.0  
**Licencia**: MIT  
**Desarrollado con**: TypeScript, Canvas API, Capacitor

