# 🏗️ Decisiones Arquitectónicas - Proyecto H.E.R.O.

Este documento explica las decisiones técnicas tomadas durante el desarrollo del proyecto, proporcionando contexto para líderes técnicos y revisores de código.

## 📚 Índice

1. [Visión General](#visión-general)
2. [Decisiones Arquitectónicas Principales](#decisiones-arquitectónicas-principales)
3. [Principios SOLID Aplicados](#principios-solid-aplicados)
4. [Patrones de Diseño](#patrones-de-diseño)
5. [Gestión de Estado](#gestión-de-estado)
6. [Rendimiento y Optimizaciones](#rendimiento-y-optimizaciones)
7. [Estrategia de Carga de Código](#estrategia-de-carga-de-código)
8. [Compatibilidad Multiplataforma](#compatibilidad-multiplataforma)

---

## 🎯 Visión General

### Propósito del Documento

Este documento sirve como guía para entender:
- **Por qué** se tomaron ciertas decisiones técnicas
- **Cómo** se aplicaron principios de ingeniería de software
- **Qué** alternativas se consideraron y descartaron

### Contexto del Proyecto

H.E.R.O. es un clon moderno del clásico juego de plataformas con las siguientes características:
- Renderizado 2D con Canvas API
- Sistema de física y colisiones personalizado
- Editor de niveles integrado
- Soporte web y Android (Capacitor)
- Sistema de guardado en la nube (Netlify Functions + Neon Database)

---

## 🏗️ Decisiones Arquitectónicas Principales

### ADR-001: Arquitectura Modular vs Monolítica

**Decisión**: Arquitectura modular con separación por responsabilidades.

**Justificación**:
- Facilita el mantenimiento y testing
- Permite reutilización de componentes
- Mejora la legibilidad del código
- Facilita la colaboración en equipo

**Implementación**:
```
src/scripts/
├── core/          # Núcleo del juego (tipos, constantes, estado)
├── components/    # Componentes del juego (player, enemies, etc.)
├── utils/         # Utilidades compartidas
└── solid/         # Implementación SOLID (refactorización progresiva)
```

**Alternativas Consideradas**:
- ❌ Monolito: Rechazado por falta de escalabilidad
- ❌ Microservicios: Rechazado por sobre-ingeniería para este proyecto

---

### ADR-002: Estado Global (GameStore) vs Estado Local

**Decisión**: Estado global centralizado mediante `GameStore` (patrón similar a Redux).

**Justificación**:
- El juego tiene múltiples sistemas interdependientes (player, enemies, UI, audio)
- Facilita la comunicación entre componentes
- Simplifica el acceso al estado desde cualquier parte del código
- Evita prop drilling excesivo

**Implementación**:
```typescript
// core/types.ts
export interface GameStore {
    appState: AppState;
    gameState: GameState;
    player: Player;
    enemies: Enemy[];
    // ... resto del estado
}
```

**Alternativas Consideradas**:
- ⚠️ Estado local por componente: Considerado pero rechazado por complejidad de sincronización
- ✅ Event bus: Implementado como complemento para comunicación desacoplada (ver `solid/`)

**Riesgos y Mitigaciones**:
- **Riesgo**: Estado global puede volverse difícil de manejar
- **Mitigación**: Documentación clara de qué propiedades pertenecen a cada sistema

---

### ADR-003: TypeScript vs JavaScript

**Decisión**: TypeScript estricto con tipado completo.

**Justificación**:
- Detección temprana de errores en tiempo de compilación
- Mejor autocompletado y DX (Developer Experience)
- Documentación implícita a través de tipos
- Facilita el refactoring seguro

**Configuración**:
```json
// tsconfig.json
{
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
}
```

**Alternativas Consideradas**:
- ❌ JavaScript: Rechazado por falta de seguridad de tipos
- ❌ TypeScript relajado: Rechazado para mantener calidad de código

---

### ADR-004: Canvas API vs WebGL vs Libraries

**Decisión**: Canvas 2D API nativo (sin librerías de renderizado).

**Justificación**:
- Control total sobre el rendering
- Sin dependencias externas pesadas
- Adecuado para pixel art 2D
- Mejor rendimiento para este caso de uso

**Implementación**:
```typescript
// components/render.ts
const ctx = canvas.getContext('2d', {
    alpha: false,           // Optimización: no necesitamos transparencia
    desynchronized: true    // Permite rendering más rápido
});
```

**Alternativas Consideradas**:
- ⚠️ WebGL: Considerado pero rechazado por complejidad innecesaria para 2D simple
- ❌ Phaser/Pixi.js: Rechazado para mantener el bundle size pequeño
- ✅ Canvas API: Elegido por simplicidad y control

---

### ADR-005: Lazy Loading vs Bundle Único

**Decisión**: Lazy loading selectivo para módulos no críticos.

**Justificación**:
- Reduce el tiempo de carga inicial
- Mejora el rendimiento en dispositivos móviles
- Permite cargar assets adicionales en background

**Implementación**:
```typescript
// main.ts - Carga diferida de módulos no críticos
const [
    { updateEnemies },
    { updateLasers },
    { updateBombs }
] = await Promise.all([
    import('./components/enemy'),
    import('./components/laser'),
    import('./components/bomb')
]);
```

**Alternativas Consideradas**:
- ❌ Bundle único: Rechazado por tamaño excesivo
- ⚠️ Code splitting completo: Considerado pero rechazado por complejidad de sincronización

---

## 🎨 Principios SOLID Aplicados

### Single Responsibility Principle (SRP)

**Aplicación en el código**:

**Ejemplo 1: Separación de responsabilidades en componentes**
```typescript
// ✅ CORRECTO: Cada componente tiene una responsabilidad
components/
├── player.ts      # Lógica del jugador
├── enemy.ts       # Lógica de enemigos
├── bomb.ts        # Lógica de bombas
├── laser.ts       # Lógica de láseres
├── level.ts       # Gestión de niveles
└── render.ts      # Renderizado visual
```

**Decisión**: Separar lógica de renderizado de lógica de negocio.

**Justificación**: 
- Facilita el cambio de motor de renderizado
- Permite testear lógica sin renderizado
- Mejora la mantenibilidad

**Ejemplo 2: Funciones puras para cálculos**
```typescript
// ✅ CORRECTO: Función pura con responsabilidad única
function checkCollision(a: GameObject, b: GameObject): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}
```

---

### Open/Closed Principle (OCP)

**Aplicación en el código**:

**Ejemplo: Sistema extensible de enemigos**
```typescript
// ✅ CORRECTO: Extensible sin modificar código existente
export type EnemyType = 'bat' | 'viper' | 'spider' | 'tentacle' | 'miner';

export const updateEnemies = (store: GameStore) => {
    store.enemies.forEach(enemy => {
        switch (enemy.type) {
            case 'bat': updateBat(enemy); break;
            case 'viper': updateViper(enemy); break;
            // Nuevos enemigos se agregan aquí sin modificar lógica existente
        }
    });
};
```

**Decisión**: Usar switch por tipo en lugar de polimorfismo completo.

**Justificación**:
- Más simple que una jerarquía de clases completa
- Fácil de extender agregando nuevos cases
- Adecuado para este proyecto de escala media

**Mejora Futura** (implementada en `solid/`):
- Sistema de factory pattern con interfaces
- Permite extensión completa sin modificar código

---

### Liskov Substitution Principle (LSP)

**Aplicación en el código**:

**Ejemplo: Interfaces consistentes**
```typescript
// ✅ CORRECTO: Todas las entidades del juego siguen el mismo contrato
export interface GameObject {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Player extends GameObject { /* ... */ }
export interface Enemy extends GameObject { /* ... */ }
export interface Wall extends GameObject { /* ... */ }
```

**Decisión**: Usar interfaces compartidas para garantizar consistencia.

**Justificación**:
- Permite usar funciones genéricas para colisiones
- Facilita el renderizado uniforme
- Garantiza que todas las entidades son sustituibles en funciones comunes

---

### Interface Segregation Principle (ISP)

**Aplicación en el código**:

**Ejemplo: Interfaces específicas por funcionalidad**
```typescript
// ✅ CORRECTO: Interfaces segregadas en solid/
interface IMovable {
    move(direction: Vector2): void;
    getPosition(): Vector2;
}

interface IAnimatable {
    updateAnimation(deltaTime: number): void;
    getCurrentFrame(): number;
}

interface ICollidable {
    getBounds(): Rectangle;
    onCollision(other: ICollidable): void;
}
```

**Decisión**: Separar interfaces por responsabilidad.

**Justificación**:
- Las clases implementan solo lo que necesitan
- Evita interfaces "god object"
- Facilita el testing con mocks específicos

**Estado Actual**:
- ✅ Implementado completamente en `src/scripts/solid/`
- ⚠️ Migración progresiva del código legacy hacia esta estructura

---

### Dependency Inversion Principle (DIP)

**Aplicación en el código**:

**Ejemplo 1: Abstracciones para servicios**
```typescript
// ✅ CORRECTO: Dependencia de abstracciones (en solid/)
interface IRenderer {
    clear(): void;
    drawSprite(sprite: Sprite, position: Vector2): void;
}

interface IAudioService {
    playSound(soundId: string): void;
    playMusic(musicId: string): void;
}

class Game {
    constructor(
        private renderer: IRenderer,      // ✅ Abstracción
        private audioService: IAudioService  // ✅ Abstracción
    ) {}
}
```

**Ejemplo 2: Estado actual (legacy)**
```typescript
// ⚠️ MEJORABLE: Dependencia directa de implementación
export const renderGame = (store: GameStore) => {
    const ctx = store.dom.ctx;  // Dependencia directa de Canvas
    // ...
};
```

**Decisión**: Migración progresiva hacia abstracciones.

**Justificación**:
- El código legacy funciona correctamente
- La migración se realiza gradualmente
- El código SOLID muestra el camino a seguir

**Plan de Migración**:
1. ✅ Crear abstracciones en `solid/`
2. ⏳ Crear adapters para código legacy
3. ⏳ Migrar componentes gradualmente

---

## 🎭 Patrones de Diseño

### Factory Pattern

**Aplicación**: Creación de entidades del juego.

```typescript
// Ejemplo: Creación de enemigos desde datos de nivel
function createEnemy(type: EnemyType, x: number, y: number): Enemy {
    const base: Enemy = {
        type,
        x, y,
        width: TILE_SIZE,
        height: TILE_SIZE,
        // ...
    };
    
    switch (type) {
        case 'bat': return { ...base, /* props específicas */ };
        case 'spider': return { ...base, /* props específicas */ };
        // ...
    }
}
```

**Decisión**: Factory functions simples.

**Justificación**: 
- Adecuado para este proyecto
- Más simple que Factory classes completas
- Fácil de entender y mantener

---

### Observer Pattern

**Aplicación**: Sistema de eventos para comunicación desacoplada.

```typescript
// Implementado en solid/observers/
class EventBus {
    private listeners = new Map<string, EventHandler[]>();
    
    on<T extends GameEvent>(eventType: string, handler: EventHandler<T>): void {
        // Registrar listener
    }
    
    emit<T extends GameEvent>(event: T): void {
        // Notificar a todos los listeners
    }
}
```

**Decisión**: Event bus centralizado.

**Justificación**:
- Desacopla componentes
- Facilita la comunicación entre sistemas
- Permite agregar logging y debugging

---

### Strategy Pattern

**Aplicación**: Diferentes estrategias de movimiento y AI.

```typescript
// Implementado en solid/strategies/
interface IMovementStrategy {
    move(entity: IMovable, context: GameContext): void;
}

class PlayerMovementStrategy implements IMovementStrategy {
    move(entity: IMovable, context: GameContext): void {
        const input = context.inputProvider.getMovementInput();
        entity.move(input);
    }
}

class AIPatrolStrategy implements IMovementStrategy {
    move(entity: IMovable, context: GameContext): void {
        // Lógica de patrulla automática
    }
}
```

**Decisión**: Interfaces para estrategias intercambiables.

**Justificación**:
- Permite cambiar comportamiento sin modificar código
- Facilita el testing con mocks
- Extensible para nuevas estrategias

---

## 📊 Gestión de Estado

### Estado Global Centralizado

**Implementación**: `GameStore` como única fuente de verdad.

**Ventajas**:
- ✅ Estado consistente en toda la aplicación
- ✅ Fácil de depurar (un solo lugar)
- ✅ Simplifica la comunicación entre componentes

**Desventajas**:
- ⚠️ Puede crecer mucho (mitigado con documentación)
- ⚠️ Dependencias circulares potenciales (mitigado con estructura clara)

**Estructura del Estado**:
```typescript
interface GameStore {
    // Estado de aplicación
    appState: 'menu' | 'playing' | 'editing';
    gameState: 'start' | 'playing' | 'respawning' | 'gameover';
    
    // Estado del jugador
    player: Player;
    
    // Entidades del juego
    enemies: Enemy[];
    walls: Wall[];
    lasers: Laser[];
    bombs: Bomb[];
    
    // Estado del nivel
    levelDesigns: string[][];
    levelDataStore: string[][][];
    currentLevelIndex: number;
    
    // Referencias DOM
    dom: DomReferences;
}
```

---

## ⚡ Rendimiento y Optimizaciones

### Optimizaciones Implementadas

**1. Canvas Rendering**
```typescript
// ✅ Configuración optimizada del contexto
ctx.imageSmoothingEnabled = false;  // Pixel art sin suavizado
const ctx = canvas.getContext('2d', {
    alpha: false,           // No necesitamos canal alpha
    desynchronized: true    // Renderizado más rápido
});
```

**2. Frame Rate Adaptativo**
```typescript
// ✅ FPS reducido en móvil para mejor rendimiento
const targetFPS = isMobile() ? 30 : 60;
const frameTime = 1000 / targetFPS;
```

**3. Lazy Loading de Assets**
```typescript
// ✅ Carga diferida de sprites no críticos
preloadCriticalAssets(store, () => {
    // Cargar assets críticos primero
    loadSpritesLazy(store, nonCriticalSprites).then(() => {
        // Cargar assets adicionales en background
    });
});
```

**4. Código Splitting**
```typescript
// ✅ Carga diferida de módulos
const { updateEnemies } = await import('./components/enemy');
```

**Decisiones de Rendimiento**:
- ✅ Renderizado manual vs librería: Manual para control total
- ✅ 60 FPS vs 30 FPS: Adaptativo según dispositivo
- ✅ Preload completo vs lazy: Híbrido (críticos primero, resto después)

---

## 🔄 Estrategia de Carga de Código

### Arquitectura de Carga

**Fase 1: Inicialización (Crítica)**
```typescript
// main.ts
- Setup UI
- Inicializar audio
- Cargar assets críticos (jugador, terreno básico)
- Mostrar menú
```

**Fase 2: Carga Diferida (No Crítica)**
```typescript
// main.ts - Después de cargar críticos
- Sprites de enemigos
- Efectos de sonido adicionales
- Componentes del juego (enemies, bombs, lasers)
```

**Decisión**: Carga progresiva para mejor UX.

**Justificación**:
- Menor tiempo de carga inicial
- Mejor experiencia en dispositivos lentos
- Permite interacción mientras carga el resto

---

## 📱 Compatibilidad Multiplataforma

### Web y Android

**Tecnología**: Capacitor (similar a Cordova pero moderno).

**Decisiones**:
1. **UI Adaptativa**: 
   - Desktop: Controles de teclado
   - Mobile: Joystick virtual + botones táctiles

2. **Optimizaciones por Plataforma**:
   ```typescript
   const isMobile = () => {
       return /Android|webOS|iPhone|iPad/i.test(navigator.userAgent) ||
              (window.innerWidth <= 1024);
   };
   
   const targetFPS = isMobile() ? 30 : 60;
   ```

3. **Builds Separados**:
   - `build:web`: Solo web (Netlify)
   - `build:android`: Web + sync Android (Capacitor)

**Justificación de Capacitor**:
- ✅ Mantiene código web nativo
- ✅ Fácil sincronización con Android
- ✅ API moderna y mantenida

---

## 📝 Decisiones de Código Específicas

### ADR-006: Función Pura vs Efectos Secundarios

**Decisión**: Preferir funciones puras cuando sea posible.

**Ejemplo**:
```typescript
// ✅ PREFERIDO: Función pura
function calculateCollision(a: GameObject, b: GameObject): boolean {
    return a.x < b.x + b.width && /* ... */;
}

// ⚠️ CUANDO ES NECESARIO: Efectos secundarios
function updatePlayer(store: GameStore): void {
    // Modifica el store directamente
    store.player.x += store.player.vx;
}
```

**Justificación**:
- Funciones puras son más fáciles de testear
- Reducen efectos secundarios inesperados
- Mejor documentación implícita

---

### ADR-007: Type Assertions vs Type Guards

**Decisión**: Usar type guards cuando sea posible, type assertions solo cuando sea seguro.

**Ejemplo**:
```typescript
// ✅ PREFERIDO: Type guard
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

if (isString(data)) {
    // TypeScript sabe que data es string aquí
    console.log(data.toUpperCase());
}

// ⚠️ CUANDO ES NECESARIO: Type assertion
const level = levelsToLoad.map(lvl => 
    typeof lvl[0] === 'string' ? lvl : (lvl as string[][])
);
```

**Justificación**:
- Type guards son más seguros
- Type assertions pueden ocultar errores
- Preferir guards para mejor type safety

---

## 🎯 Resumen de Principios Aplicados

| Principio | Aplicación | Estado |
|-----------|-----------|--------|
| **SRP** | Componentes separados por responsabilidad | ✅ Completo |
| **OCP** | Sistema extensible de enemigos | ✅ Completo |
| **LSP** | Interfaces consistentes (GameObject) | ✅ Completo |
| **ISP** | Interfaces segregadas en `solid/` | ✅ En solid/, ⏳ Migración |
| **DIP** | Abstracciones en `solid/` | ✅ En solid/, ⏳ Migración |

---

## 📚 Referencias

- [SOLID_REFACTORING.md](./SOLID_REFACTORING.md) - Documentación detallada de principios SOLID
- [src/scripts/solid/README.md](./src/scripts/solid/README.md) - Implementación SOLID completa
- [src/scripts/solid/DESIGN_PATTERNS.md](./src/scripts/solid/DESIGN_PATTERNS.md) - Patrones de diseño

---

**Última actualización**: 2024

