# 🏗️ Arquitectura SOLID - Proyecto H.E.R.O.

## 📚 Índice
1. [¿Qué es SOLID?](#qué-es-solid)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Principios Aplicados](#principios-aplicados)
4. [Cómo Usar](#cómo-usar)
5. [Ejemplos Prácticos](#ejemplos-prácticos)
6. [Beneficios](#beneficios)

---

## 🎯 ¿Qué es SOLID?

SOLID es un acrónimo de cinco principios de diseño orientado a objetos que ayudan a crear software más mantenible, escalable y robusto.

### S - Single Responsibility Principle (SRP)
**Principio de Responsabilidad Única**
> "Una clase debe tener una, y solo una, razón para cambiar"

### O - Open/Closed Principle (OCP)
**Principio Abierto/Cerrado**
> "Las entidades de software deben estar abiertas para extensión, pero cerradas para modificación"

### L - Liskov Substitution Principle (LSP)
**Principio de Sustitución de Liskov**
> "Los objetos de una superclase deben ser reemplazables con objetos de sus subclases"

### I - Interface Segregation Principle (ISP)
**Principio de Segregación de Interfaces**
> "Los clientes no deben depender de interfaces que no usan"

### D - Dependency Inversion Principle (DIP)
**Principio de Inversión de Dependencias**
> "Depende de abstracciones, no de concreciones"

---

## 📁 Estructura del Proyecto

```
src/scripts/solid/
├── README.md                    # Esta documentación
├── index.ts                     # Punto de entrada principal
├── interfaces/
│   └── index.ts                 # Todas las interfaces
├── DependencyContainer.ts        # Sistema de inyección de dependencias
└── examples/
    └── BasicExample.ts          # Ejemplo básico de uso
```

---

## 🏗️ Principios Aplicados

### 1. **Single Responsibility Principle (SRP)**
- ✅ **Interfaces específicas**: Cada interfaz tiene una responsabilidad única
- ✅ **Servicios separados**: Renderer, Audio, Input, Logger son independientes
- ✅ **Entidades simples**: Cada entidad tiene una función específica

### 2. **Open/Closed Principle (OCP)**
- ✅ **Sistema extensible**: Fácil agregar nuevos tipos de entidades
- ✅ **Interfaces abiertas**: Nuevas implementaciones sin modificar código existente
- ✅ **Factory Pattern**: Creación de objetos sin modificar factories

### 3. **Liskov Substitution Principle (LSP)**
- ✅ **Implementaciones intercambiables**: Todas las implementaciones cumplen contratos
- ✅ **Herencia correcta**: Las clases derivadas son sustituibles por las base

### 4. **Interface Segregation Principle (ISP)**
- ✅ **Interfaces pequeñas**: `IMovable`, `IAnimatable`, `ICollidable` son específicas
- ✅ **Sin interfaces gigantes**: Cada interfaz es cohesiva y específica
- ✅ **Implementaciones flexibles**: Las clases implementan solo lo que necesitan

### 5. **Dependency Inversion Principle (DIP)**
- ✅ **Inyección de dependencias**: `DependencyContainer` centralizado
- ✅ **Abstracciones**: Dependencia de interfaces, no implementaciones
- ✅ **Configuración flexible**: Fácil cambiar implementaciones

---

## 🚀 Cómo Usar

### Inicialización Básica

```typescript
import { initializeSOLIDGame } from './solid';

// Crear canvas
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

// Inicializar juego
const game = initializeSOLIDGame(canvas);

// Crear entidad personalizada
class MyEntity implements IEntity {
    public readonly id: string;
    private position: Vector2;
    private isActiveFlag: boolean = true;
    
    constructor() {
        this.id = `my_entity_${Date.now()}`;
        const { Vector2Impl } = require('./solid/interfaces');
        this.position = new Vector2Impl(100, 100);
    }
    
    update(context: GameContext): void {
        // Lógica de actualización
    }
    
    render(renderer: IRenderer): void {
        // Lógica de renderizado
    }
    
    isActive(): boolean {
        return this.isActiveFlag;
    }
    
    destroy(): void {
        this.isActiveFlag = false;
    }
}

// Agregar entidad al juego
const myEntity = new MyEntity();
game.addEntity(myEntity);

// Iniciar el juego
game.start();
```

### Testing

```typescript
import { createTestGame } from './solid';

// Crear juego de prueba con mocks
const testGame = createTestGame();

// Agregar entidades de prueba
const testEntity = new MyEntity();
testGame.addEntity(testEntity);

// Verificar estado
console.log('Total entities:', testGame.getEntities().length);
console.log('Is running:', testGame.getIsRunning());
```

---

## 🎮 Ejemplos Prácticos

### Ejemplo Básico

```typescript
import { runBasicSOLIDExample } from './solid/examples/BasicExample';

// Ejecutar ejemplo interactivo
runBasicSOLIDExample();
```

Este ejemplo incluye:
- Entidades que se mueven con las flechas del teclado
- Entidad que sigue el mouse
- Sistema de renderizado básico
- Controles de pausa/reanudación

### Crear Nueva Entidad

```typescript
class Player implements IEntity, IMovable, IAnimatable {
    public readonly id: string;
    private position: Vector2;
    private velocity: Vector2;
    private isActiveFlag: boolean = true;
    
    constructor() {
        this.id = `player_${Date.now()}`;
        const { Vector2Impl } = require('./solid/interfaces');
        this.position = new Vector2Impl(400, 300);
        this.velocity = Vector2Impl.zero();
    }
    
    // Implementar IEntity
    update(context: GameContext): void {
        const input = context.inputProvider.getMovementInput();
        this.move(input);
        this.updateAnimation(context.deltaTime);
    }
    
    render(renderer: IRenderer): void {
        const { RectangleImpl } = require('./solid/interfaces');
        const rect = new RectangleImpl(this.position.x, this.position.y, 32, 32);
        renderer.drawRectangle(rect, '#00ff00');
    }
    
    isActive(): boolean {
        return this.isActiveFlag;
    }
    
    destroy(): void {
        this.isActiveFlag = false;
    }
    
    // Implementar IMovable
    move(direction: Vector2): void {
        this.velocity = direction.multiply(200); // 200 pixels per second
    }
    
    getPosition(): Vector2 {
        return this.position;
    }
    
    setPosition(position: Vector2): void {
        this.position = position;
    }
    
    getVelocity(): Vector2 {
        return this.velocity;
    }
    
    setVelocity(velocity: Vector2): void {
        this.velocity = velocity;
    }
    
    // Implementar IAnimatable
    updateAnimation(deltaTime: number): void {
        // Actualizar posición basada en velocidad
        this.position = this.position.add(this.velocity.multiply(deltaTime / 1000));
    }
    
    setAnimation(animationName: string): void {
        console.log(`Setting animation: ${animationName}`);
    }
    
    getCurrentFrame(): number {
        return 0;
    }
    
    isAnimationComplete(): boolean {
        return false;
    }
    
    resetAnimation(): void {
        // Reset animation
    }
}
```

---

## ✅ Beneficios

### **Mantenibilidad**
- ✅ Código modular y organizado
- ✅ Responsabilidades claras
- ✅ Fácil de entender y modificar

### **Escalabilidad**
- ✅ Fácil agregar nuevas características
- ✅ Sistema extensible
- ✅ Arquitectura preparada para crecimiento

### **Testabilidad**
- ✅ Componentes aislados
- ✅ Inyección de dependencias
- ✅ Mocks fáciles de crear

### **Reutilización**
- ✅ Código modular
- ✅ Interfaces bien definidas
- ✅ Patrones reutilizables

### **Aprendizaje**
- ✅ Principios SOLID aplicados
- ✅ Patrones de diseño
- ✅ Mejores prácticas de TypeScript
- ✅ Arquitectura profesional

---

## 🎓 Para Desarrolladores

Esta implementación es perfecta para aprender:

1. **Principios SOLID** en la práctica
2. **Inyección de dependencias** con TypeScript
3. **Interfaces y abstracciones** efectivas
4. **Patrones de diseño** aplicados
5. **Arquitectura modular** escalable
6. **Testing** con mocks y stubs

¡Es una excelente base para proyectos profesionales! 🚀

```
src/scripts/solid/
├── README.md                    # Esta documentación
├── ARCHITECTURE.md              # Documentación arquitectónica detallada
├── DESIGN_PATTERNS.md           # Patrones de diseño utilizados
├── entities/                    # Entidades del dominio
│   ├── Player/
│   │   ├── Player.ts           # Entidad principal del jugador
│   │   ├── PlayerInputHandler.ts # Manejo de input (SRP)
│   │   ├── PlayerPhysics.ts    # Física y movimiento (SRP)
│   │   ├── PlayerCollisionResolver.ts # Colisiones (SRP)
│   │   ├── PlayerAnimator.ts   # Animaciones (SRP)
│   │   └── interfaces/
│   │       ├── IPlayerInput.ts
│   │       ├── IPlayerPhysics.ts
│   │       └── IPlayerAnimator.ts
│   ├── enemies/
│   │   ├── interfaces/
│   │   │   ├── IEnemy.ts       # Interface base (ISP)
│   │   │   ├── IMovable.ts     # Interface específica (ISP)
│   │   │   ├── IAnimatable.ts  # Interface específica (ISP)
│   │   │   └── ICollidable.ts  # Interface específica (ISP)
│   │   ├── BaseEnemy.ts        # Clase base (OCP)
│   │   ├── BatEnemy.ts         # Implementación específica
│   │   ├── SpiderEnemy.ts      # Implementación específica
│   │   └── ViperEnemy.ts       # Implementación específica
│   ├── weapons/
│   │   ├── interfaces/
│   │   │   ├── IWeapon.ts
│   │   │   └── IProjectile.ts
│   │   ├── Laser.ts
│   │   └── Bomb.ts
│   └── world/
│       ├── Level.ts
│       ├── Tile.ts
│       └── Camera.ts
├── systems/                     # Sistemas del juego (ECS Pattern)
│   ├── GameLoop.ts             # Loop principal del juego
│   ├── CollisionSystem.ts      # Sistema de colisiones
│   ├── AnimationSystem.ts      # Sistema de animaciones
│   ├── PhysicsSystem.ts        # Sistema de física
│   └── RenderSystem.ts         # Sistema de renderizado
├── services/                    # Servicios de aplicación
│   ├── interfaces/
│   │   ├── IGameState.ts       # Abstracción del estado (DIP)
│   │   ├── IRenderer.ts        # Abstracción del renderer (DIP)
│   │   ├── IInputProvider.ts   # Abstracción del input (DIP)
│   │   ├── IAudioService.ts    # Abstracción del audio (DIP)
│   │   └── ILevelService.ts    # Abstracción de niveles (DIP)
│   ├── GameState.ts            # Implementación del estado
│   ├── CanvasRenderer.ts       # Implementación del renderer
│   ├── KeyboardInputProvider.ts # Implementación del input
│   ├── AudioService.ts         # Implementación del audio
│   └── LevelService.ts         # Implementación de niveles
├── factories/                   # Factory Pattern
│   ├── EnemyFactory.ts         # Creación de enemigos
│   ├── WeaponFactory.ts        # Creación de armas
│   └── LevelFactory.ts         # Creación de niveles
├── decorators/                  # Decorator Pattern
│   ├── LoggingDecorator.ts     # Logging de operaciones
│   ├── PerformanceDecorator.ts # Medición de rendimiento
│   └── ValidationDecorator.ts  # Validación de datos
├── observers/                   # Observer Pattern
│   ├── EventBus.ts             # Bus de eventos
│   ├── GameEvent.ts            # Eventos del juego
│   └── EventHandler.ts        # Manejadores de eventos
├── strategies/                  # Strategy Pattern
│   ├── MovementStrategy.ts     # Estrategias de movimiento
│   ├── AttackStrategy.ts       # Estrategias de ataque
│   └── AIStrategy.ts           # Estrategias de IA
├── Game.ts                      # Clase principal del juego
├── GameContext.ts              # Contexto compartido
└── DependencyContainer.ts       # Container de dependencias (DI)
```

---

## 🎯 Principios Aplicados

### 1. **S - Single Responsibility Principle (SRP)**

**Problema Original**: `player.ts` tenía 1000+ líneas manejando input, física, colisiones y animaciones.

**Solución**: Separación en clases especializadas:

```typescript
// ❌ ANTES: Una clase gigante
class Player {
    // Input handling
    handleInput() { /* 200 líneas */ }
    
    // Physics
    updatePhysics() { /* 300 líneas */ }
    
    // Collision detection
    checkCollisions() { /* 200 líneas */ }
    
    // Animation
    updateAnimation() { /* 300 líneas */ }
}

// ✅ DESPUÉS: Responsabilidades separadas
class Player {
    constructor(
        private inputHandler: IPlayerInput,
        private physics: IPlayerPhysics,
        private collisionResolver: ICollisionResolver,
        private animator: IPlayerAnimator
    ) {}
    
    update(context: GameContext): void {
        this.inputHandler.handleInput(context);
        this.physics.updatePhysics(context);
        this.collisionResolver.resolveCollisions(context);
        this.animator.updateAnimation(context);
    }
}
```

### 2. **O - Open/Closed Principle (OCP)**

**Problema Original**: Para agregar un nuevo enemigo, había que modificar múltiples archivos.

**Solución**: Sistema extensible con interfaces:

```typescript
// ✅ Sistema abierto para extensión, cerrado para modificación
interface IEnemy {
    update(context: GameContext): void;
    render(renderer: IRenderer): void;
    getBounds(): Rectangle;
}

class EnemyManager {
    private enemies: IEnemy[] = [];
    
    addEnemy(enemy: IEnemy): void {
        this.enemies.push(enemy); // ✅ Extensible sin modificar código
    }
    
    updateAll(context: GameContext): void {
        this.enemies.forEach(enemy => enemy.update(context));
    }
}

// ✅ Nuevos enemigos sin modificar código existente
class DragonEnemy implements IEnemy {
    update(context: GameContext): void { /* implementación específica */ }
    render(renderer: IRenderer): void { /* implementación específica */ }
    getBounds(): Rectangle { /* implementación específica */ }
}
```

### 3. **L - Liskov Substitution Principle (LSP)**

**Problema Original**: Herencias incorrectas que violaban contratos.

**Solución**: Jerarquías correctas con contratos claros:

```typescript
// ✅ Contrato claro que todas las implementaciones deben cumplir
interface IMovable {
    move(direction: Vector2): void;
    getPosition(): Vector2;
    setPosition(position: Vector2): void;
}

// ✅ Todas las implementaciones son intercambiables
class Player implements IMovable {
    move(direction: Vector2): void { /* implementación específica */ }
    getPosition(): Vector2 { /* implementación específica */ }
    setPosition(position: Vector2): void { /* implementación específica */ }
}

class Enemy implements IMovable {
    move(direction: Vector2): void { /* implementación específica */ }
    getPosition(): Vector2 { /* implementación específica */ }
    setPosition(position: Vector2): void { /* implementación específica */ }
}

// ✅ Cualquier implementación funciona igual
function moveEntity(entity: IMovable, direction: Vector2): void {
    entity.move(direction); // ✅ Funciona con Player, Enemy, o cualquier IMovable
}
```

### 4. **I - Interface Segregation Principle (ISP)**

**Problema Original**: Interfaces gigantes que forzaban implementaciones innecesarias.

**Solución**: Interfaces específicas y cohesivas:

```typescript
// ❌ ANTES: Interface gigante
interface IGameObject {
    update(): void;
    render(): void;
    move(): void;
    animate(): void;
    attack(): void;
    defend(): void;
    // ... 20 métodos más
}

// ✅ DESPUÉS: Interfaces específicas
interface IUpdatable {
    update(context: GameContext): void;
}

interface IRenderable {
    render(renderer: IRenderer): void;
}

interface IMovable {
    move(direction: Vector2): void;
}

interface IAnimatable {
    animate(): void;
}

interface IAttacker {
    attack(target: IAttackable): void;
}

// ✅ Las clases implementan solo lo que necesitan
class Player implements IUpdatable, IRenderable, IMovable, IAnimatable, IAttacker {
    // Implementa solo los métodos que necesita
}

class StaticTile implements IUpdatable, IRenderable {
    // No necesita IMovable, IAnimatable, ni IAttacker
}
```

### 5. **D - Dependency Inversion Principle (DIP)**

**Problema Original**: Alto acoplamiento con implementaciones concretas.

**Solución**: Inyección de dependencias con abstracciones:

```typescript
// ❌ ANTES: Dependencia directa de implementación
class Game {
    private renderer = new CanvasRenderer(); // ❌ Acoplado a CanvasRenderer
    private audio = new WebAudioService();     // ❌ Acoplado a WebAudioService
}

// ✅ DESPUÉS: Dependencia de abstracciones
class Game {
    constructor(
        private renderer: IRenderer,        // ✅ Depende de abstracción
        private audioService: IAudioService, // ✅ Depende de abstracción
        private inputProvider: IInputProvider // ✅ Depende de abstracción
    ) {}
}

// ✅ Fácil cambiar implementaciones
const webGame = new Game(
    new CanvasRenderer(),
    new WebAudioService(),
    new KeyboardInputProvider()
);

const mobileGame = new Game(
    new WebGLRenderer(),
    new MobileAudioService(),
    new TouchInputProvider()
);
```

---

## 🚀 Guía de Implementación

### Paso 1: Configurar el Container de Dependencias

```typescript
// DependencyContainer.ts
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

// Configuración de servicios
const container = new DependencyContainer();

container.register('IRenderer', () => new CanvasRenderer());
container.register('IAudioService', () => new WebAudioService());
container.register('IInputProvider', () => new KeyboardInputProvider());
container.register('IGameState', () => new GameState());
```

### Paso 2: Implementar Entidades con SRP

```typescript
// entities/Player/Player.ts
export class Player {
    constructor(
        private inputHandler: IPlayerInput,
        private physics: IPlayerPhysics,
        private collisionResolver: ICollisionResolver,
        private animator: IPlayerAnimator
    ) {}
    
    update(context: GameContext): void {
        this.inputHandler.handleInput(context);
        this.physics.updatePhysics(context);
        this.collisionResolver.resolveCollisions(context);
        this.animator.updateAnimation(context);
    }
}
```

### Paso 3: Crear Sistema Extensible de Enemigos

```typescript
// entities/enemies/EnemyFactory.ts
export class EnemyFactory {
    static createEnemy(type: EnemyType, position: Vector2): IEnemy {
        switch (type) {
            case EnemyType.BAT:
                return new BatEnemy(position);
            case EnemyType.SPIDER:
                return new SpiderEnemy(position);
            case EnemyType.VIPER:
                return new ViperEnemy(position);
            default:
                throw new Error(`Unknown enemy type: ${type}`);
        }
    }
}
```

---

## 📖 Ejemplos de Uso

### Crear un Nuevo Enemigo

```typescript
// 1. Crear la clase del enemigo
class DragonEnemy extends BaseEnemy implements IEnemy {
    constructor(position: Vector2) {
        super(position, EnemyType.DRAGON);
    }
    
    update(context: GameContext): void {
        // Lógica específica del dragón
        this.aiStrategy.execute(this, context);
        this.physics.update(this);
    }
    
    render(renderer: IRenderer): void {
        renderer.drawSprite(this.sprite, this.position);
    }
}

// 2. Registrar en el factory
EnemyFactory.registerEnemy(EnemyType.DRAGON, DragonEnemy);

// 3. Usar en el juego
const dragon = EnemyFactory.createEnemy(EnemyType.DRAGON, new Vector2(100, 100));
enemyManager.addEnemy(dragon);
```

### Agregar un Nuevo Sistema

```typescript
// systems/ParticleSystem.ts
export class ParticleSystem implements IGameSystem {
    private particles: Particle[] = [];
    
    update(context: GameContext): void {
        this.particles.forEach(particle => {
            particle.update(context.deltaTime);
        });
        
        this.particles = this.particles.filter(particle => !particle.isDead);
    }
    
    addParticle(particle: Particle): void {
        this.particles.push(particle);
    }
}

// Registrar en el Game
game.addSystem(new ParticleSystem());
```

---

## 🧪 Testing

### Testing Unitario con Mocks

```typescript
// tests/Player.test.ts
describe('Player', () => {
    let player: Player;
    let mockInputHandler: jest.Mocked<IPlayerInput>;
    let mockPhysics: jest.Mocked<IPlayerPhysics>;
    
    beforeEach(() => {
        mockInputHandler = {
            handleInput: jest.fn()
        };
        mockPhysics = {
            updatePhysics: jest.fn()
        };
        
        player = new Player(mockInputHandler, mockPhysics, mockCollisionResolver, mockAnimator);
    });
    
    it('should call input handler on update', () => {
        const context = createMockGameContext();
        
        player.update(context);
        
        expect(mockInputHandler.handleInput).toHaveBeenCalledWith(context);
    });
});
```

### Testing de Integración

```typescript
// tests/Game.integration.test.ts
describe('Game Integration', () => {
    it('should create and update all systems', () => {
        const container = new DependencyContainer();
        setupTestContainer(container);
        
        const game = container.resolve<Game>('Game');
        
        game.start();
        
        // Simular varios frames
        for (let i = 0; i < 10; i++) {
            game.update();
        }
        
        expect(game.isRunning).toBe(true);
    });
});
```

---

## 🔄 Migración

### Estrategia de Migración Gradual

1. **Fase 1**: Crear nuevas clases SOLID junto al código existente
2. **Fase 2**: Migrar componente por componente
3. **Fase 3**: Eliminar código legacy
4. **Fase 4**: Optimizar y refinar

### Ejemplo de Migración

```typescript
// ANTES: Código legacy
class LegacyPlayer {
    update(): void {
        // 1000+ líneas de código mezclado
    }
}

// DESPUÉS: Código SOLID
class Player {
    constructor(
        private inputHandler: IPlayerInput,
        private physics: IPlayerPhysics,
        private collisionResolver: ICollisionResolver,
        private animator: IPlayerAnimator
    ) {}
    
    update(context: GameContext): void {
        this.inputHandler.handleInput(context);
        this.physics.updatePhysics(context);
        this.collisionResolver.resolveCollisions(context);
        this.animator.updateAnimation(context);
    }
}

// Adapter para migración gradual
class PlayerAdapter {
    constructor(private legacyPlayer: LegacyPlayer) {}
    
    update(context: GameContext): void {
        this.legacyPlayer.update(); // Delegar al código legacy
    }
}
```

---

## 📚 Recursos Adicionales

- [Arquitectura Detallada](./ARCHITECTURE.md)
- [Patrones de Diseño](./DESIGN_PATTERNS.md)
- [Guía de Testing](./TESTING.md)
- [Mejores Prácticas](./BEST_PRACTICES.md)

---

**¡Esta refactorización te enseñará arquitectura de software profesional! 🚀**
