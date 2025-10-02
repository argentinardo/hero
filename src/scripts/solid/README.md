# Refactorización SOLID del Proyecto H.E.R.O.

## 📁 Estructura

```
solid/
├── README.md (este archivo)
├── interfaces/          # Abstracciones (DIP)
│   ├── IUpdateable.ts
│   ├── IRenderable.ts
│   ├── IInputProvider.ts
│   └── ICollider.ts
├── entities/
│   └── Player/         # Player refactorizado con SRP
│       ├── PlayerInputHandler.ts    # Responsabilidad: Procesar input
│       ├── PlayerPhysics.ts         # Responsabilidad: Física y movimiento
│       ├── PlayerAnimator.ts        # Responsabilidad: Animaciones
│       └── Player.ts                # Coordinador principal
├── services/           # Implementaciones concretas
│   └── KeyboardInputProvider.ts
└── examples/           # Ejemplos de uso
    └── player-example.ts
```

---

## 🎯 Principios SOLID Aplicados

### 1. ✅ Single Responsibility Principle (SRP)

**Antes:**
```typescript
// player.ts hacía TODO:
export const handlePlayerInput = (store) => { /* ... */ }
export const updatePlayer = (store) => { /* física, colisiones, animación... */ }
export const emitParticles = (store) => { /* ... */ }
export const playerDie = (store) => { /* ... */ }
```

**Ahora:**
- `PlayerInputHandler` → Solo procesa input
- `PlayerPhysics` → Solo maneja física
- `PlayerAnimator` → Solo maneja animaciones
- `Player` → Coordina todos los componentes

**Beneficio:** Cada clase tiene una razón para cambiar. Si necesitas cambiar cómo funcionan las animaciones, solo tocas `PlayerAnimator`.

---

### 2. ✅ Open/Closed Principle (OCP)

**Ejemplo con Input:**

```typescript
// Puedes agregar nuevos tipos de input SIN modificar el Player
class KeyboardInputProvider implements IInputProvider { /* ... */ }
class GamepadInputProvider implements IInputProvider { /* ... */ }
class TouchInputProvider implements IInputProvider { /* ... */ }
class AIInputProvider implements IInputProvider { /* ... */ } // Para NPCs!
class ReplayInputProvider implements IInputProvider { /* ... */ } // Para replays!

// El Player no cambia, solo cambias el provider
const player = new Player(new GamepadInputProvider());
```

**Beneficio:** Extensible sin modificar código existente.

---

### 3. ✅ Liskov Substitution Principle (LSP)

Cualquier implementación de `IInputProvider` puede sustituir a otra sin romper el Player:

```typescript
let inputProvider: IInputProvider = new KeyboardInputProvider();
const player = new Player(inputProvider);

// En cualquier momento puedes cambiar el provider
inputProvider = new GamepadInputProvider();
player.setInputProvider(inputProvider);

// El player sigue funcionando correctamente
```

---

### 4. ✅ Interface Segregation Principle (ISP)

**Interfaces pequeñas y específicas:**

```typescript
// ❌ MAL: Interfaz monolítica
interface IGameEntity {
    update(): void;
    render(): void;
    onCollision(): void;
    playSound(): void;
    // ... etc
}

// ✅ BIEN: Interfaces segregadas
interface IUpdateable { update(): void; }
interface IRenderable { render(): void; }
interface ICollider { onCollision(): void; }
interface IAudible { playSound(): void; }

// Una partícula solo necesita actualizarse y renderizarse
class Particle implements IUpdateable, IRenderable { /* ... */ }

// Un trigger solo necesita detectar colisiones
class Trigger implements ICollider { /* ... */ }
```

**Beneficio:** Las clases solo implementan lo que realmente necesitan.

---

### 5. ✅ Dependency Inversion Principle (DIP)

**Antes (acoplamiento alto):**
```typescript
// Player depende directamente del store global
export const updatePlayer = (store: GameStore) => {
    // Acceso directo a store.keys, store.walls, store.enemies, etc.
    // Difícil de testear, imposible de reutilizar
}
```

**Ahora (bajo acoplamiento):**
```typescript
class Player {
    constructor(
        private inputHandler: PlayerInputHandler,  // Depende de abstracción
        private physics: PlayerPhysics,            // No de implementación
        private animator: PlayerAnimator
    ) {}
}

// En tests
const mockInput = new MockInputProvider();
const player = new Player(mockInput, ...);
```

**Beneficio:** Fácil de testear, reutilizable, flexible.

---

## 🚀 Ejemplo de Uso

### Uso Básico

```typescript
import { Player } from './entities/Player/Player';
import { KeyboardInputProvider } from './services/KeyboardInputProvider';
import { ANIMATION_DATA } from '../core/assets';

// 1. Crear provider de input
const inputProvider = new KeyboardInputProvider(keysState);

// 2. Configurar animaciones
const animations = {
    stand: ANIMATION_DATA.P_stand,
    walk: ANIMATION_DATA.P_walk,
    jump: ANIMATION_DATA.P_jump,
    fly: ANIMATION_DATA.P_fly,
};

// 3. Configuración de física
const physicsConfig = {
    gravity: 0.5,
    playerSpeed: 4,
    thrustPower: 0.8,
    maxUpwardSpeed: 10,
    flyChargeTime: 30,
};

// 4. Crear el player
const player = new Player(
    { x: 100, y: 100, width: 64, height: 128 },
    inputProvider,
    physicsConfig,
    animations
);

// 5. En el game loop
function gameLoop() {
    player.update();
    player.render(ctx, cameraY);
}
```

---

### Testing

```typescript
// Mock del input provider
class MockInputProvider implements IInputProvider {
    private keys: Record<string, boolean> = {};
    
    pressKey(key: string) {
        this.keys[key] = true;
    }
    
    releaseKey(key: string) {
        this.keys[key] = false;
    }
    
    isKeyPressed(key: string): boolean {
        return this.keys[key] || false;
    }
    
    getInputState() {
        return {
            left: this.isKeyPressed('ArrowLeft'),
            right: this.isKeyPressed('ArrowRight'),
            up: this.isKeyPressed('ArrowUp'),
            down: this.isKeyPressed('ArrowDown'),
            shoot: this.isKeyPressed('Space'),
        };
    }
}

// Test
describe('Player', () => {
    it('debería moverse a la derecha cuando se presiona ArrowRight', () => {
        const mockInput = new MockInputProvider();
        const player = new Player(mockInput, ...);
        
        const initialX = player.getPosition().x;
        mockInput.pressKey('ArrowRight');
        player.update();
        
        expect(player.getPosition().x).toBeGreaterThan(initialX);
    });
});
```

---

## 📊 Comparación: Antes vs Después

### Antes (Código Original)

| Aspecto | Estado |
|---------|--------|
| Responsabilidades por archivo | 5+ en `player.ts` |
| Testeable | ❌ Difícil (requiere GameStore completo) |
| Reutilizable | ❌ No (acoplado al proyecto) |
| Extensible | ❌ Modificar código existente |
| Legible | ⚠️ Archivos muy largos (378 líneas) |
| Mantenible | ⚠️ Cambios tienen efecto dominó |

### Después (SOLID)

| Aspecto | Estado |
|---------|--------|
| Responsabilidades por archivo | 1 por clase |
| Testeable | ✅ Fácil (mocks de interfaces) |
| Reutilizable | ✅ Sí (componentes independientes) |
| Extensible | ✅ Agregar sin modificar |
| Legible | ✅ Archivos pequeños y focalizados |
| Mantenible | ✅ Cambios localizados |

---

## 🎓 Lecciones Aprendidas

### 1. SRP hace el código más legible
Cada archivo hace una cosa y la hace bien. Es más fácil encontrar dónde está la lógica que buscas.

### 2. Las interfaces son poderosas
Permiten flexibilidad sin acoplamiento. Puedes cambiar implementaciones sin tocar el código que las usa.

### 3. La composición > herencia
En lugar de herencia compleja, usamos composición: Player "tiene" un InputHandler, Physics, Animator.

### 4. El testing se vuelve trivial
Con interfaces, puedes crear mocks fácilmente y testear cada componente aisladamente.

### 5. El código es más profesional
SOLID es lo que diferencia código "que funciona" de código "profesional y mantenible".

---

## 🔄 Migración Gradual

No es necesario reescribir todo el proyecto de golpe:

1. **Fase 1:** Usar las nuevas clases en paralelo al código viejo
2. **Fase 2:** Integrar gradualmente en el game loop
3. **Fase 3:** Deprecar código antiguo cuando todo funcione
4. **Fase 4:** Aplicar mismo patrón a enemigos, bombas, etc.

---

## 📚 Recursos Adicionales

- [Uncle Bob - SOLID Principles](https://blog.cleancoder.com/uncle-bob/2020/10/18/Solid-Relevance.html)
- [Refactoring Guru - SOLID](https://refactoring.guru/design-patterns/solid-principles)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

## ✨ Siguiente Paso

Ahora que entiendes SOLID con el Player, aplícalo a:
- Sistema de Enemigos (OCP - cada enemigo es una clase)
- Sistema de Renderizado (SRP - separar concerns)
- Sistema de Colisiones (generalizarlo)

¡El código mejorará dramáticamente! 🚀

