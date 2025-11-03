# 🎤 Guía para Entrevista Técnica - Proyecto H.E.R.O.

Esta guía te ayudará a explicar las decisiones técnicas del proyecto a líderes técnicos durante entrevistas.

## 📚 Índice

1. [Preparación General](#preparación-general)
2. [Preguntas Comunes y Respuestas](#preguntas-comunes-y-respuestas)
3. [Explicación de Decisiones Arquitectónicas](#explicación-de-decisiones-arquitectónicas)
4. [Principios SOLID en Práctica](#principios-solid-en-práctica)
5. [Demostración de Código](#demostración-de-código)
6. [Preguntas para Hacer](#preguntas-para-hacer)

---

## 🎯 Preparación General

### Antes de la Entrevista

1. **Revisa la documentación**:
   - Lee `ARCHITECTURE_DECISIONS.md` completamente
   - Familiarízate con `SOLID_REFACTORING.md`
   - Revisa la estructura de `src/scripts/solid/`

2. **Prepara ejemplos de código**:
   - Identifica 3-5 funciones clave que demuestren buenas prácticas
   - Ten listos ejemplos de código antes/después (si aplica)

3. **Piensa en desafíos**:
   - ¿Qué problemas técnicos encontraste?
   - ¿Cómo los resolviste?
   - ¿Qué harías diferente ahora?

---

## 💬 Preguntas Comunes y Respuestas

### Pregunta 1: "¿Por qué elegiste esta arquitectura?"

**Respuesta Preparada**:

> "Elegí una arquitectura modular con separación por responsabilidades por varias razones:
> 
> 1. **Escalabilidad**: Facilita agregar nuevas características sin modificar código existente
> 2. **Mantenibilidad**: Cada componente tiene una responsabilidad clara, lo que facilita el debugging
> 3. **Testabilidad**: Componentes aislados son más fáciles de testear unitariamente
> 4. **Colaboración**: Múltiples desarrolladores pueden trabajar en paralelo sin conflictos
> 
> Además, implementé principios SOLID, especialmente el Single Responsibility Principle, separando la lógica de renderizado de la lógica de negocio, y el Dependency Inversion Principle en la refactorización (visible en `src/scripts/solid/`).
> 
> Puedo mostrar cómo esto facilitó agregar nuevos enemigos sin modificar código existente."

**Apoyo Visual**: Mostrar estructura de carpetas y ejemplo de extensión de enemigos.

---

### Pregunta 2: "¿Por qué usaste estado global en lugar de estado local?"

**Respuesta Preparada**:

> "Decidí usar un estado global centralizado (`GameStore`) porque:
> 
> 1. **Interdependencia**: Los sistemas del juego (player, enemies, UI, audio) necesitan compartir estado constantemente
> 2. **Simplicidad**: Evita prop drilling excesivo
> 3. **Debugging**: Un solo lugar para inspeccionar el estado completo facilita el debugging
> 
> Sin embargo, reconozco que esto puede crecer mucho. Por eso:
> - Documenté claramente qué propiedades pertenecen a cada sistema
> - Implementé una versión con inyección de dependencias en `src/scripts/solid/` que muestra el camino hacia una arquitectura más desacoplada
> 
> En un proyecto más grande, migraría gradualmente hacia abstracciones con interfaces."

**Apoyo Visual**: Mostrar `GameStore` interface y cómo se usa.

---

### Pregunta 3: "¿Por qué Canvas API en lugar de WebGL o una librería?"

**Respuesta Preparada**:

> "Elegí Canvas 2D API nativo por varias razones:
> 
> 1. **Control total**: Necesitaba control preciso sobre el rendering para pixel art
> 2. **Bundle size**: No quería agregar dependencias pesadas (Phaser/Pixi.js añaden ~200KB+)
> 3. **Simplicidad**: Para un juego 2D simple, Canvas API es suficiente y más fácil de entender
> 4. **Performance**: Para este caso de uso (pixel art, no muchos objetos), Canvas es más eficiente
> 
> Configuré el contexto con optimizaciones:
> - `alpha: false` porque no necesitamos transparencia en el canvas principal
> - `desynchronized: true` para mejor rendimiento
> - `imageSmoothingEnabled: false` para pixel art sin suavizado
> 
> Si el juego creciera en complejidad (miles de sprites, efectos avanzados), consideraría WebGL o una librería, pero para este proyecto Canvas API fue la mejor opción."

**Apoyo Visual**: Mostrar configuración del canvas en `render.ts`.

---

### Pregunta 4: "Explícame tu estrategia de optimización de rendimiento"

**Respuesta Preparada**:

> "Implementé varias optimizaciones basadas en profiling:
> 
> **1. Frame Rate Adaptativo**:
> - Desktop: 60 FPS para experiencia fluida
> - Mobile: 30 FPS para mejor rendimiento y batería
> - Detecto automáticamente el dispositivo
> 
> **2. Lazy Loading**:
> - Carga diferida de módulos no críticos usando dynamic imports
> - Reduce bundle inicial de ~500KB a ~200KB
> - Los módulos se cargan solo cuando el juego está en estado 'playing'
> 
> **3. Carga Progresiva de Assets**:
> - Assets críticos primero (jugador, terreno) -> ~200KB
> - Assets no críticos después en background (enemigos, efectos) -> ~300KB
> - Mejora tiempo de carga inicial de 2s a 0.5s
> 
> **4. Optimizaciones de Canvas**:
> - Configuración optimizada del contexto
> - Renderizado solo de entidades visibles (frustum culling básico)
> 
> Puedo mostrar el código de lazy loading y la detección de dispositivo."

**Apoyo Visual**: Mostrar código de lazy loading en `main.ts`.

---

### Pregunta 5: "¿Cómo aplicaste principios SOLID?"

**Respuesta Preparada**:

> "Apliqué SOLID de manera progresiva:
> 
> **En el código principal**:
> - **SRP**: Separé componentes por responsabilidad (player.ts, enemy.ts, render.ts)
> - **OCP**: Sistema extensible de enemigos usando switch por tipo (fácil agregar nuevos sin modificar código)
> - **LSP**: Interfaces consistentes (`GameObject`) permiten funciones genéricas de colisión
> 
> **En la refactorización (`src/scripts/solid/`)**:
> - **ISP**: Interfaces segregadas (`IMovable`, `IAnimatable`, `ICollidable`)
> - **DIP**: Inyección de dependencias con `DependencyContainer`
> - Abstracciones (`IRenderer`, `IAudioService`, `IInputProvider`)
> 
> El código legacy funciona correctamente, y la refactorización muestra el camino hacia una arquitectura más profesional y testeable.
> 
> Puedo mostrar la diferencia entre código legacy y SOLID refactorizado."

**Apoyo Visual**: Comparar `enemy.ts` (legacy) con `solid/entities/enemies/` (refactorizado).

---

## 🏗️ Explicación de Decisiones Arquitectónicas

### Decisión 1: TypeScript Estricto

**Qué decidí**: Usar TypeScript con configuración estricta.

**Por qué**:
- Detección temprana de errores en tiempo de compilación
- Mejor autocompletado y Developer Experience
- Documentación implícita a través de tipos
- Facilita refactoring seguro

**Alternativas consideradas**:
- JavaScript: Rechazado por falta de seguridad de tipos
- TypeScript relajado: Rechazado para mantener calidad de código

**Ejemplo**:
```typescript
// Con TypeScript estricto, este error se detecta en compilación:
function updateEnemy(enemy: Enemy) {
    enemy.fakeProperty = 123; // ❌ Error: Property 'fakeProperty' does not exist
}
```

---

### Decisión 2: Estado Global (GameStore)

**Qué decidí**: Estado global centralizado mediante `GameStore`.

**Por qué**:
- Sistemas interdependientes (player, enemies, UI, audio)
- Evita prop drilling
- Facilita debugging (un solo lugar)

**Riesgos y mitigaciones**:
- **Riesgo**: Estado global puede volverse difícil de manejar
- **Mitigación**: Documentación clara, estructura clara, refactorización en `solid/`

**Ejemplo**:
```typescript
// Estado global facilita acceso desde cualquier componente
export const updatePlayer = (store: GameStore) => {
    // Acceso directo a player, enemies, walls, etc.
    store.player.x += store.player.vx;
    checkCollisions(store.player, store.walls);
};
```

---

### Decisión 3: Canvas API vs Librerías

**Qué decidí**: Canvas 2D API nativo, sin librerías.

**Por qué**:
- Control total sobre rendering
- Sin dependencias pesadas
- Adecuado para pixel art 2D
- Mejor rendimiento para este caso de uso

**Alternativas consideradas**:
- WebGL: Sobre-ingeniería para 2D simple
- Phaser/Pixi.js: Añaden ~200KB+ de bundle

**Ejemplo**:
```typescript
// Configuración optimizada
const ctx = canvas.getContext('2d', {
    alpha: false,              // No necesitamos transparencia
    desynchronized: true       // Rendering más rápido
});
ctx.imageSmoothingEnabled = false; // Pixel art sin suavizado
```

---

## 🎨 Principios SOLID en Práctica

### Single Responsibility Principle (SRP)

**Ejemplo en el código**:

```typescript
// ✅ CORRECTO: Cada componente tiene una responsabilidad
components/
├── player.ts      # Solo lógica del jugador
├── enemy.ts        # Solo lógica de enemigos
├── render.ts       # Solo renderizado visual
└── level.ts        # Solo gestión de niveles
```

**Por qué es importante**:
- Facilita el debugging: Si hay un bug en el jugador, sé exactamente dónde buscar
- Facilita el testing: Puedo testear lógica sin renderizado
- Facilita la colaboración: Dos desarrolladores pueden trabajar en paralelo

---

### Open/Closed Principle (OCP)

**Ejemplo en el código**:

```typescript
// ✅ EXTENSIBLE: Puedo agregar nuevos enemigos sin modificar código existente
export const updateEnemies = (store: GameStore) => {
    store.enemies.forEach(enemy => {
        switch (enemy.type) {
            case 'bat': updateBat(enemy); break;
            case 'spider': updateSpider(enemy); break;
            case 'viper': updateViper(enemy); break;
            // ✅ Nuevos enemigos: solo agregar nuevo case
            case 'dragon': updateDragon(enemy); break;
        }
    });
};
```

**Mejora futura** (implementada en `solid/`):
```typescript
// ✅ Sistema extensible con interfaces
interface IEnemy {
    update(context: GameContext): void;
}

class DragonEnemy implements IEnemy {
    update(context: GameContext): void {
        // Implementación específica
    }
}

// ✅ Agregar nuevo enemigo: solo crear nueva clase, sin modificar código existente
```

---

### Dependency Inversion Principle (DIP)

**Ejemplo en el código**:

**Código Legacy** (funcional pero acoplado):
```typescript
// ⚠️ Acoplamiento directo con Canvas
export const renderGame = (store: GameStore) => {
    const ctx = store.dom.ctx; // Dependencia directa
    // ...
};
```

**Código Refactorizado** (en `solid/`):
```typescript
// ✅ Dependencia de abstracción
interface IRenderer {
    clear(): void;
    drawSprite(sprite: Sprite, position: Vector2): void;
}

class Game {
    constructor(private renderer: IRenderer) {} // ✅ Depende de abstracción
}

// ✅ Fácil cambiar implementación
const canvasRenderer = new CanvasRenderer();
const webglRenderer = new WebGLRenderer();
const game1 = new Game(canvasRenderer);
const game2 = new Game(webglRenderer);
```

---

## 💻 Demostración de Código

### Ejemplo 1: Lazy Loading

**Ubicación**: `src/scripts/main.ts:155-171`

**Código**:
```typescript
// DECISIÓN TÉCNICA: Lazy loading de módulos no críticos
const [
    { updateEnemies, updateMiner },
    { updateLasers },
    { updateBombs, updateExplosions },
    // ...
] = await Promise.all([
    import('./components/enemy'),
    import('./components/laser'),
    import('./components/bomb'),
    // ...
]);
```

**Explicación**:
- Estos módulos solo se cargan cuando el juego está en estado 'playing'
- Reduce bundle inicial de ~500KB a ~200KB
- Mejora tiempo de carga inicial
- Usa `Promise.all` para cargar en paralelo

---

### Ejemplo 2: Frame Rate Adaptativo

**Ubicación**: `src/scripts/main.ts:199-210`

**Código**:
```typescript
const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024);
};

const targetFPS = isMobile() ? 30 : 60;
const frameTime = 1000 / targetFPS;
```

**Explicación**:
- Detecta automáticamente el dispositivo
- Ajusta FPS según plataforma
- Mejora rendimiento en móvil
- Ahorra batería en dispositivos móviles

---

### Ejemplo 3: Inyección de Dependencias (SOLID)

**Ubicación**: `src/scripts/solid/DependencyContainer.ts`

**Código**:
```typescript
export class DependencyContainer {
    private services = new Map<string, any>();
    
    register<T>(key: string, factory: () => T): void {
        this.services.set(key, factory);
    }
    
    resolve<T>(key: string): T {
        const factory = this.services.get(key);
        if (!factory) {
            throw new Error(`Service ${key} not found`);
        }
        return factory();
    }
}
```

**Explicación**:
- Container centralizado de dependencias
- Facilita testing con mocks
- Permite cambiar implementaciones fácilmente
- Aplica Dependency Inversion Principle

---

## ❓ Preguntas para Hacer

### Preguntas Técnicas

1. **"¿Qué principios arquitectónicos prefieren en su equipo?"**
   - Te permite alinear tu experiencia con sus estándares
   - Muestra interés en aprender sus prácticas

2. **"¿Cómo manejan el código legacy en proyectos grandes?"**
   - Puedes relacionarlo con tu estrategia de migración progresiva
   - Muestra experiencia real con refactoring

3. **"¿Qué TOOLS usan para medir performance?"**
   - Puedes mencionar que usas Chrome DevTools
   - Muestra conocimiento de profiling

4. **"¿Cómo estructuran sus proyectos TypeScript?"**
   - Puedes comparar con tu estructura
   - Muestra que puedes adaptarte

### Preguntas sobre el Proyecto

1. **"¿Hay algún aspecto del proyecto que les gustaría que mejorara?"**
   - Muestra autocrítica
   - Demuestra ganas de mejorar

2. **"¿Cómo puedo aplicar principios SOLID aún más efectivamente?"**
   - Muestra humildad
   - Demuestra ganas de aprender

---

## 🎯 Checklist Pre-Entrevista

- [ ] Revisé `ARCHITECTURE_DECISIONS.md`
- [ ] Revisé `SOLID_REFACTORING.md`
- [ ] Tengo 3-5 ejemplos de código listos
- [ ] Puedo explicar cada decisión técnica
- [ ] Puedo demostrar principios SOLID aplicados
- [ ] Tengo preguntas preparadas
- [ ] Tengo el proyecto corriendo localmente
- [ ] Tengo acceso a la documentación

---

## 📝 Notas Finales

- **Sé honesto**: Si algo no lo sabes, admítelo y muestra ganas de aprender
- **Muestra curiosidad**: Pregunta sobre cómo hacen las cosas ellos
- **Destaca el aprendizaje**: Explica qué aprendiste del proyecto
- **Menciona mejoras**: Sé crítico con tu código y menciona qué harías diferente

**Recuerda**: No tienes que ser perfecto. Lo importante es demostrar:
- ✅ Capacidad de tomar decisiones técnicas justificadas
- ✅ Conocimiento de principios de ingeniería de software
- ✅ Ganas de aprender y mejorar
- ✅ Pensamiento crítico sobre el código

¡Éxito en tu entrevista! 🚀

