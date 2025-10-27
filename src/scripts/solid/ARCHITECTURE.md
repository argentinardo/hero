# 🏗️ Arquitectura Detallada - Proyecto H.E.R.O. SOLID

## 📚 Índice
1. [Visión General](#visión-general)
2. [Arquitectura por Capas](#arquitectura-por-capas)
3. [Patrones de Diseño](#patrones-de-diseño)
4. [Flujo de Datos](#flujo-de-datos)
5. [Gestión de Estado](#gestión-de-estado)
6. [Sistema de Eventos](#sistema-de-eventos)
7. [Rendimiento](#rendimiento)
8. [Escalabilidad](#escalabilidad)

---

## 🎯 Visión General

### Arquitectura Hexagonal (Ports & Adapters)

```
                    ┌─────────────────┐
                    │   EXTERNAL      │
                    │   ADAPTERS      │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │   Canvas    │ │
                    │ │   Renderer  │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │   Audio     │ │
                    │ │   Service    │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │   Input     │ │
                    │ │   Provider  │ │
                    │ └─────────────┘ │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   APPLICATION   │
                    │     LAYER       │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │    Game     │ │
                    │ │   Engine    │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │   Systems   │ │
                    │ │  (ECS)      │ │
                    │ └─────────────┘ │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    DOMAIN       │
                    │     LAYER       │
                    │                 │
                    │ ┌─────────────┐ │
                    │ │  Entities   │ │
                    │ │  (Player,   │ │
                    │ │   Enemies)  │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │   Value     │ │
                    │ │  Objects    │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │ Interfaces  │ │
                    │ │ & Contracts │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

### Principios Arquitectónicos

1. **Separación de Responsabilidades**: Cada capa tiene un propósito específico
2. **Inversión de Dependencias**: Las capas superiores no dependen de las inferiores
3. **Abstracción**: Interfaces claras entre capas
4. **Testabilidad**: Cada componente es testeable de forma aislada

---

## 🏗️ Arquitectura por Capas

### 1. Domain Layer (Capa de Dominio)

**Responsabilidad**: Contiene la lógica de negocio pura, sin dependencias externas.

```typescript
// entities/Player/Player.ts
export class Player {
    private position: Vector2;
    private velocity: Vector2;
    private health: number;
    private energy: number;
    
    constructor(
        private inputHandler: IPlayerInput,
        private physics: IPlayerPhysics,
        private collisionResolver: ICollisionResolver,
        private animator: IPlayerAnimator
    ) {
        this.position = Vector2.zero();
        this.velocity = Vector2.zero();
        this.health = 100;
        this.energy = 100;
    }
    
    // Métodos de dominio puro
    public move(direction: Vector2): void {
        this.velocity = direction.multiply(this.speed);
    }
    
    public takeDamage(amount: number): void {
        this.health = Math.max(0, this.health - amount);
    }
    
    public consumeEnergy(amount: number): boolean {
        if (this.energy >= amount) {
            this.energy -= amount;
            return true;
        }
        return false;
    }
    
    // Delegación a servicios especializados
    public update(context: GameContext): void {
        this.inputHandler.handleInput(context);
        this.physics.updatePhysics(context);
        this.collisionResolver.resolveCollisions(context);
        this.animator.updateAnimation(context);
    }
}
```

**Características**:
- ✅ Sin dependencias externas
- ✅ Lógica de negocio pura
- ✅ Fácil de testear
- ✅ Reutilizable

### 2. Application Layer (Capa de Aplicación)

**Responsabilidad**: Orquesta la lógica de dominio y coordina servicios.

```typescript
// Game.ts
export class Game {
    private systems: IGameSystem[] = [];
    private entities: IEntity[] = [];
    private eventBus: EventBus;
    
    constructor(
        private renderer: IRenderer,
        private audioService: IAudioService,
        private inputProvider: IInputProvider,
        private gameState: IGameState
    ) {
        this.eventBus = new EventBus();
        this.setupSystems();
        this.setupEventHandlers();
    }
    
    private setupSystems(): void {
        this.systems.push(new CollisionSystem());
        this.systems.push(new AnimationSystem());
        this.systems.push(new PhysicsSystem());
        this.systems.push(new RenderSystem(this.renderer));
    }
    
    public update(deltaTime: number): void {
        const context = new GameContext(deltaTime, this.gameState, this.eventBus);
        
        // Actualizar sistemas
        this.systems.forEach(system => system.update(context));
        
        // Actualizar entidades
        this.entities.forEach(entity => entity.update(context));
        
        // Procesar eventos
        this.eventBus.processEvents();
    }
    
    public addEntity(entity: IEntity): void {
        this.entities.push(entity);
        this.eventBus.emit(new EntityAddedEvent(entity));
    }
    
    public removeEntity(entity: IEntity): void {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
            this.eventBus.emit(new EntityRemovedEvent(entity));
        }
    }
}
```

**Características**:
- ✅ Orquesta servicios
- ✅ Maneja flujo de aplicación
- ✅ Coordina sistemas
- ✅ Gestiona ciclo de vida

### 3. Infrastructure Layer (Capa de Infraestructura)

**Responsabilidad**: Implementa detalles técnicos específicos.

```typescript
// services/CanvasRenderer.ts
export class CanvasRenderer implements IRenderer {
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d')!;
    }
    
    public clear(): void {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    public drawSprite(sprite: Sprite, position: Vector2): void {
        this.context.drawImage(
            sprite.image,
            sprite.sourceX,
            sprite.sourceY,
            sprite.width,
            sprite.height,
            position.x,
            position.y,
            sprite.width,
            sprite.height
        );
    }
    
    public drawRectangle(rect: Rectangle, color: string): void {
        this.context.fillStyle = color;
        this.context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    
    public setCamera(camera: Camera): void {
        this.context.save();
        this.context.translate(-camera.x, -camera.y);
    }
    
    public resetCamera(): void {
        this.context.restore();
    }
}
```

**Características**:
- ✅ Implementaciones concretas
- ✅ Detalles técnicos
- ✅ Interfaz con sistemas externos
- ✅ Fácil de intercambiar

---

## 🎨 Patrones de Diseño

### 1. Entity Component System (ECS)

```typescript
// systems/CollisionSystem.ts
export class CollisionSystem implements IGameSystem {
    private collidables: ICollidable[] = [];
    
    public registerCollidable(entity: ICollidable): void {
        this.collidables.push(entity);
    }
    
    public update(context: GameContext): void {
        for (let i = 0; i < this.collidables.length; i++) {
            for (let j = i + 1; j < this.collidables.length; j++) {
                const entityA = this.collidables[i];
                const entityB = this.collidables[j];
                
                if (this.checkCollision(entityA, entityB)) {
                    this.resolveCollision(entityA, entityB);
                }
            }
        }
    }
    
    private checkCollision(a: ICollidable, b: ICollidable): boolean {
        const boundsA = a.getBounds();
        const boundsB = b.getBounds();
        
        return boundsA.intersects(boundsB);
    }
    
    private resolveCollision(a: ICollidable, b: ICollidable): void {
        a.onCollision(b);
        b.onCollision(a);
    }
}
```

### 2. Observer Pattern (Event Bus)

```typescript
// observers/EventBus.ts
export class EventBus {
    private listeners = new Map<string, EventHandler[]>();
    
    public on<T extends GameEvent>(eventType: string, handler: EventHandler<T>): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(handler);
    }
    
    public off<T extends GameEvent>(eventType: string, handler: EventHandler<T>): void {
        const handlers = this.listeners.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    public emit<T extends GameEvent>(event: T): void {
        const handlers = this.listeners.get(event.type);
        if (handlers) {
            handlers.forEach(handler => handler(event));
        }
    }
    
    public processEvents(): void {
        // Procesar cola de eventos
    }
}

// observers/GameEvent.ts
export abstract class GameEvent {
    constructor(public readonly type: string, public readonly timestamp: number = Date.now()) {}
}

export class PlayerMovedEvent extends GameEvent {
    constructor(public readonly player: Player, public readonly from: Vector2, public readonly to: Vector2) {
        super('player.moved');
    }
}

export class EnemyKilledEvent extends GameEvent {
    constructor(public readonly enemy: IEnemy, public readonly killer: Player) {
        super('enemy.killed');
    }
}
```

### 3. Factory Pattern

```typescript
// factories/EnemyFactory.ts
export class EnemyFactory {
    private static enemyTypes = new Map<EnemyType, new (position: Vector2) => IEnemy>();
    
    public static registerEnemyType(type: EnemyType, constructor: new (position: Vector2) => IEnemy): void {
        this.enemyTypes.set(type, constructor);
    }
    
    public static createEnemy(type: EnemyType, position: Vector2): IEnemy {
        const Constructor = this.enemyTypes.get(type);
        if (!Constructor) {
            throw new Error(`Unknown enemy type: ${type}`);
        }
        return new Constructor(position);
    }
    
    public static createRandomEnemy(position: Vector2): IEnemy {
        const types = Array.from(this.enemyTypes.keys());
        const randomType = types[Math.floor(Math.random() * types.length)];
        return this.createEnemy(randomType, position);
    }
}

// Registro de tipos de enemigos
EnemyFactory.registerEnemyType(EnemyType.BAT, BatEnemy);
EnemyFactory.registerEnemyType(EnemyType.SPIDER, SpiderEnemy);
EnemyFactory.registerEnemyType(EnemyType.VIPER, ViperEnemy);
```

### 4. Strategy Pattern

```typescript
// strategies/MovementStrategy.ts
export interface IMovementStrategy {
    move(entity: IMovable, context: GameContext): void;
}

export class PlayerMovementStrategy implements IMovementStrategy {
    move(entity: IMovable, context: GameContext): void {
        const input = context.inputProvider.getMovementInput();
        entity.move(input);
    }
}

export class AIPatrolStrategy implements IMovementStrategy {
    private direction = 1;
    private timer = 0;
    
    move(entity: IMovable, context: GameContext): void {
        this.timer += context.deltaTime;
        
        if (this.timer > 2000) { // Cambiar dirección cada 2 segundos
            this.direction *= -1;
            this.timer = 0;
        }
        
        entity.move(new Vector2(this.direction, 0));
    }
}

export class AIChaseStrategy implements IMovementStrategy {
    constructor(private target: IMovable) {}
    
    move(entity: IMovable, context: GameContext): void {
        const direction = this.target.getPosition().subtract(entity.getPosition()).normalize();
        entity.move(direction);
    }
}
```

### 5. Decorator Pattern

```typescript
// decorators/LoggingDecorator.ts
export class LoggingDecorator<T> implements IGameSystem {
    constructor(
        private system: IGameSystem,
        private logger: ILogger
    ) {}
    
    update(context: GameContext): void {
        const startTime = performance.now();
        
        this.system.update(context);
        
        const endTime = performance.now();
        this.logger.log(`System ${this.system.constructor.name} took ${endTime - startTime}ms`);
    }
}

// decorators/PerformanceDecorator.ts
export class PerformanceDecorator<T> implements IGameSystem {
    private frameCount = 0;
    private totalTime = 0;
    
    constructor(private system: IGameSystem) {}
    
    update(context: GameContext): void {
        const startTime = performance.now();
        
        this.system.update(context);
        
        const endTime = performance.now();
        this.totalTime += endTime - startTime;
        this.frameCount++;
        
        if (this.frameCount % 60 === 0) { // Cada 60 frames
            const avgTime = this.totalTime / this.frameCount;
            console.log(`Average update time: ${avgTime.toFixed(2)}ms`);
            this.frameCount = 0;
            this.totalTime = 0;
        }
    }
}
```

---

## 🔄 Flujo de Datos

### Flujo Principal del Juego

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Input     │───▶│   Game      │───▶│  Renderer   │
│  Provider   │    │   Loop      │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │   Systems   │
                   │   (ECS)     │
                   └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │  Entities   │
                   │  (Domain)   │
                   └─────────────┘
```

### Flujo de Eventos

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Entity    │───▶│  Event Bus  │───▶│  Handler    │
│   Action    │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │   Update    │
                   │   Systems   │
                   └─────────────┘
```

---

## 📊 Gestión de Estado

### State Management Pattern

```typescript
// services/GameState.ts
export class GameState implements IGameState {
    private state: GameStateData;
    private observers: IStateObserver[] = [];
    
    constructor() {
        this.state = {
            score: 0,
            lives: 3,
            energy: 100,
            currentLevel: 1,
            playerPosition: Vector2.zero(),
            enemies: [],
            bombs: [],
            lasers: []
        };
    }
    
    public getState(): Readonly<GameStateData> {
        return Object.freeze({ ...this.state });
    }
    
    public updateState(updates: Partial<GameStateData>): void {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        
        this.notifyObservers(oldState, this.state);
    }
    
    public subscribe(observer: IStateObserver): void {
        this.observers.push(observer);
    }
    
    public unsubscribe(observer: IStateObserver): void {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }
    
    private notifyObservers(oldState: GameStateData, newState: GameStateData): void {
        this.observers.forEach(observer => {
            observer.onStateChange(oldState, newState);
        });
    }
}
```

---

## 🎵 Sistema de Eventos

### Event-Driven Architecture

```typescript
// observers/EventHandler.ts
export interface IStateObserver {
    onStateChange(oldState: GameStateData, newState: GameStateData): void;
}

export class ScoreObserver implements IStateObserver {
    constructor(private ui: IUIService) {}
    
    onStateChange(oldState: GameStateData, newState: GameStateData): void {
        if (oldState.score !== newState.score) {
            this.ui.updateScore(newState.score);
        }
    }
}

export class LivesObserver implements IStateObserver {
    constructor(private ui: IUIService) {}
    
    onStateChange(oldState: GameStateData, newState: GameStateData): void {
        if (oldState.lives !== newState.lives) {
            this.ui.updateLives(newState.lives);
            
            if (newState.lives <= 0) {
                this.ui.showGameOver();
            }
        }
    }
}
```

---

## ⚡ Rendimiento

### Optimizaciones Implementadas

1. **Object Pooling**: Reutilización de objetos
2. **Spatial Partitioning**: Optimización de colisiones
3. **Lazy Loading**: Carga bajo demanda
4. **Frame Rate Control**: Control de FPS

```typescript
// utils/ObjectPool.ts
export class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private reset: (obj: T) => void;
    
    constructor(factory: () => T, reset: (obj: T) => void, initialSize = 10) {
        this.factory = factory;
        this.reset = reset;
        
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }
    
    public get(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.factory();
    }
    
    public release(obj: T): void {
        this.reset(obj);
        this.pool.push(obj);
    }
}

// Uso del Object Pool
const laserPool = new ObjectPool<Laser>(
    () => new Laser(),
    (laser) => laser.reset(),
    20
);

// En el juego
const laser = laserPool.get();
// ... usar laser
laserPool.release(laser);
```

---

## 📈 Escalabilidad

### Arquitectura Modular

```typescript
// DependencyContainer.ts
export class DependencyContainer {
    private services = new Map<string, any>();
    private singletons = new Map<string, any>();
    
    public register<T>(key: string, factory: () => T, singleton = false): void {
        if (singleton) {
            this.singletons.set(key, factory);
        } else {
            this.services.set(key, factory);
        }
    }
    
    public resolve<T>(key: string): T {
        // Verificar singletons primero
        if (this.singletons.has(key)) {
            if (!this.services.has(key)) {
                this.services.set(key, this.singletons.get(key)!());
            }
        }
        
        const factory = this.services.get(key);
        if (!factory) {
            throw new Error(`Service ${key} not found`);
        }
        
        return factory();
    }
}

// Configuración modular
export function configureGameContainer(): DependencyContainer {
    const container = new DependencyContainer();
    
    // Core services
    container.register('IRenderer', () => new CanvasRenderer(canvas), true);
    container.register('IAudioService', () => new WebAudioService(), true);
    container.register('IInputProvider', () => new KeyboardInputProvider(), true);
    
    // Game systems
    container.register('CollisionSystem', () => new CollisionSystem());
    container.register('AnimationSystem', () => new AnimationSystem());
    container.register('PhysicsSystem', () => new PhysicsSystem());
    
    // Factories
    container.register('EnemyFactory', () => new EnemyFactory());
    container.register('WeaponFactory', () => new WeaponFactory());
    
    return container;
}
```

---

## 🧪 Testing Strategy

### Arquitectura Testeable

```typescript
// tests/mocks/MockRenderer.ts
export class MockRenderer implements IRenderer {
    public drawCalls: DrawCall[] = [];
    
    clear(): void {
        this.drawCalls.push({ type: 'clear' });
    }
    
    drawSprite(sprite: Sprite, position: Vector2): void {
        this.drawCalls.push({ type: 'sprite', sprite, position });
    }
    
    drawRectangle(rect: Rectangle, color: string): void {
        this.drawCalls.push({ type: 'rectangle', rect, color });
    }
}

// tests/Player.test.ts
describe('Player', () => {
    let player: Player;
    let mockRenderer: MockRenderer;
    let mockInputHandler: jest.Mocked<IPlayerInput>;
    
    beforeEach(() => {
        mockRenderer = new MockRenderer();
        mockInputHandler = {
            handleInput: jest.fn()
        };
        
        player = new Player(
            mockInputHandler,
            new MockPhysics(),
            new MockCollisionResolver(),
            new MockAnimator()
        );
    });
    
    it('should handle input correctly', () => {
        const context = createMockGameContext();
        
        player.update(context);
        
        expect(mockInputHandler.handleInput).toHaveBeenCalledWith(context);
    });
});
```

---

**Esta arquitectura te proporciona una base sólida para aprender patrones avanzados de desarrollo de software! 🚀**
