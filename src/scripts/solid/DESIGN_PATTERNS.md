# 🎨 Patrones de Diseño - Proyecto H.E.R.O. SOLID

## 📚 Índice
1. [Patrones Creacionales](#patrones-creacionales)
2. [Patrones Estructurales](#patrones-estructurales)
3. [Patrones Comportamentales](#patrones-comportamentales)
4. [Patrones Arquitectónicos](#patrones-arquitectónicos)
5. [Ejemplos Prácticos](#ejemplos-prácticos)
6. [Mejores Prácticas](#mejores-prácticas)

---

## 🏗️ Patrones Creacionales

### 1. Factory Method Pattern

**Propósito**: Crear objetos sin especificar sus clases exactas.

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
}

// Uso
const bat = EnemyFactory.createEnemy(EnemyType.BAT, new Vector2(100, 100));
const spider = EnemyFactory.createEnemy(EnemyType.SPIDER, new Vector2(200, 200));
```

**Beneficios**:
- ✅ Extensible sin modificar código existente
- ✅ Centraliza la creación de objetos
- ✅ Facilita el testing con mocks

### 2. Abstract Factory Pattern

**Propósito**: Crear familias de objetos relacionados.

```typescript
// factories/GameObjectFactory.ts
export abstract class GameObjectFactory {
    abstract createPlayer(): Player;
    abstract createEnemy(type: EnemyType): IEnemy;
    abstract createWeapon(type: WeaponType): IWeapon;
}

export class ClassicGameObjectFactory extends GameObjectFactory {
    createPlayer(): Player {
        return new ClassicPlayer();
    }
    
    createEnemy(type: EnemyType): IEnemy {
        switch (type) {
            case EnemyType.BAT: return new ClassicBatEnemy();
            case EnemyType.SPIDER: return new ClassicSpiderEnemy();
            default: throw new Error(`Unknown enemy type: ${type}`);
        }
    }
    
    createWeapon(type: WeaponType): IWeapon {
        switch (type) {
            case WeaponType.LASER: return new ClassicLaser();
            case WeaponType.BOMB: return new ClassicBomb();
            default: throw new Error(`Unknown weapon type: ${type}`);
        }
    }
}

export class ModernGameObjectFactory extends GameObjectFactory {
    createPlayer(): Player {
        return new ModernPlayer();
    }
    
    createEnemy(type: EnemyType): IEnemy {
        switch (type) {
            case EnemyType.BAT: return new ModernBatEnemy();
            case EnemyType.SPIDER: return new ModernSpiderEnemy();
            default: throw new Error(`Unknown enemy type: ${type}`);
        }
    }
    
    createWeapon(type: WeaponType): IWeapon {
        switch (type) {
            case WeaponType.LASER: return new ModernLaser();
            case WeaponType.BOMB: return new ModernBomb();
            default: throw new Error(`Unknown weapon type: ${type}`);
        }
    }
}
```

### 3. Builder Pattern

**Propósito**: Construir objetos complejos paso a paso.

```typescript
// builders/LevelBuilder.ts
export class LevelBuilder {
    private level: LevelData;
    
    constructor() {
        this.level = {
            id: 0,
            name: '',
            tiles: [],
            playerStartPosition: Vector2.zero(),
            enemyPositions: [],
            difficulty: 1
        };
    }
    
    public setId(id: number): LevelBuilder {
        this.level.id = id;
        return this;
    }
    
    public setName(name: string): LevelBuilder {
        this.level.name = name;
        return this;
    }
    
    public setSize(width: number, height: number): LevelBuilder {
        this.level.tiles = Array(height).fill(null).map(() => Array(width).fill(' '));
        return this;
    }
    
    public addPlayer(position: Vector2): LevelBuilder {
        this.level.playerStartPosition = position;
        this.level.tiles[position.y][position.x] = 'P';
        return this;
    }
    
    public addEnemy(type: EnemyType, position: Vector2): LevelBuilder {
        this.level.enemyPositions.push(position);
        this.level.tiles[position.y][position.x] = type.charAt(0).toUpperCase();
        return this;
    }
    
    public addTile(x: number, y: number, tileType: string): LevelBuilder {
        if (this.level.tiles[y] && this.level.tiles[y][x]) {
            this.level.tiles[y][x] = tileType;
        }
        return this;
    }
    
    public setDifficulty(difficulty: number): LevelBuilder {
        this.level.difficulty = difficulty;
        return this;
    }
    
    public build(): LevelData {
        return { ...this.level };
    }
}

// Uso
const level = new LevelBuilder()
    .setId(1)
    .setName('Cueva del Murciélago')
    .setSize(20, 15)
    .addPlayer(new Vector2(2, 7))
    .addEnemy(EnemyType.BAT, new Vector2(10, 5))
    .addEnemy(EnemyType.SPIDER, new Vector2(15, 10))
    .addTile(5, 3, 'B') // Brick
    .addTile(8, 8, 'E') // Energy
    .setDifficulty(2)
    .build();
```

### 4. Singleton Pattern

**Propósito**: Asegurar que una clase tenga solo una instancia.

```typescript
// singletons/GameManager.ts
export class GameManager {
    private static instance: GameManager;
    private game: Game | null = null;
    
    private constructor() {}
    
    public static getInstance(): GameManager {
        if (!GameManager.instance) {
            GameManager.instance = new GameManager();
        }
        return GameManager.instance;
    }
    
    public initializeGame(): void {
        if (!this.game) {
            const config = new GameConfiguration();
            const container = config.getContainer();
            const eventBus = new EventBus();
            
            this.game = new Game(container, eventBus);
        }
    }
    
    public getGame(): Game {
        if (!this.game) {
            throw new Error('Game not initialized');
        }
        return this.game;
    }
    
    public destroyGame(): void {
        if (this.game) {
            this.game.stop();
            this.game = null;
        }
    }
}

// Uso
const gameManager = GameManager.getInstance();
gameManager.initializeGame();
const game = gameManager.getGame();
```

---

## 🏛️ Patrones Estructurales

### 1. Adapter Pattern

**Propósito**: Permitir que interfaces incompatibles trabajen juntas.

```typescript
// adapters/LegacyRendererAdapter.ts
export class LegacyRendererAdapter implements IRenderer {
    private legacyRenderer: LegacyRenderer;
    
    constructor(legacyRenderer: LegacyRenderer) {
        this.legacyRenderer = legacyRenderer;
    }
    
    clear(): void {
        this.legacyRenderer.clearScreen();
    }
    
    drawSprite(sprite: Sprite, position: Vector2): void {
        this.legacyRenderer.drawImage(
            sprite.image,
            position.x,
            position.y,
            sprite.width,
            sprite.height
        );
    }
    
    drawRectangle(rect: Rectangle, color: string): void {
        this.legacyRenderer.fillRect(
            rect.x,
            rect.y,
            rect.width,
            rect.height,
            color
        );
    }
    
    // Implementar otros métodos de IRenderer...
}
```

### 2. Decorator Pattern

**Propósito**: Agregar funcionalidad a objetos dinámicamente.

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
        this.logger.debug(`System ${this.system.constructor.name} took ${endTime - startTime}ms`);
    }
    
    initialize(): void {
        if (this.system.initialize) {
            this.system.initialize();
        }
    }
    
    cleanup(): void {
        if (this.system.cleanup) {
            this.system.cleanup();
        }
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
        
        if (this.frameCount % 60 === 0) {
            const avgTime = this.totalTime / this.frameCount;
            console.log(`Average update time: ${avgTime.toFixed(2)}ms`);
            this.frameCount = 0;
            this.totalTime = 0;
        }
    }
    
    initialize(): void {
        if (this.system.initialize) {
            this.system.initialize();
        }
    }
    
    cleanup(): void {
        if (this.system.cleanup) {
            this.system.cleanup();
        }
    }
}

// Uso
const collisionSystem = new CollisionSystem();
const loggedSystem = new LoggingDecorator(collisionSystem, logger);
const performanceSystem = new PerformanceDecorator(loggedSystem);
```

### 3. Facade Pattern

**Propósito**: Proporcionar una interfaz simplificada a un subsistema complejo.

```typescript
// facades/GameFacade.ts
export class GameFacade {
    constructor(
        private game: Game,
        private audioService: IAudioService,
        private uiService: IUIService,
        private levelService: ILevelService
    ) {}
    
    public startNewGame(): void {
        this.audioService.playMusic('main');
        this.uiService.showMainMenu();
        this.game.start();
    }
    
    public loadLevel(levelId: number): void {
        this.levelService.loadLevel(levelId).then(levelData => {
            this.game.loadLevel(levelData);
            this.uiService.showLevelInfo(levelData);
        });
    }
    
    public pauseGame(): void {
        this.game.pause();
        this.audioService.pauseMusic();
        this.uiService.showPauseMenu();
    }
    
    public resumeGame(): void {
        this.game.resume();
        this.audioService.resumeMusic();
        this.uiService.hidePauseMenu();
    }
    
    public saveGame(): void {
        const gameState = this.game.getState();
        this.levelService.saveLevel(gameState.currentLevel, gameState);
        this.uiService.showNotification('Juego guardado', 'info');
    }
}

// Uso
const gameFacade = new GameFacade(game, audioService, uiService, levelService);
gameFacade.startNewGame();
```

### 4. Composite Pattern

**Propósito**: Componer objetos en estructuras de árbol.

```typescript
// composites/GameObjectComposite.ts
export abstract class GameObjectComposite {
    protected children: GameObjectComposite[] = [];
    
    public add(child: GameObjectComposite): void {
        this.children.push(child);
    }
    
    public remove(child: GameObjectComposite): void {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
        }
    }
    
    public abstract update(context: GameContext): void;
    public abstract render(renderer: IRenderer): void;
}

export class LevelComposite extends GameObjectComposite {
    update(context: GameContext): void {
        this.children.forEach(child => child.update(context));
    }
    
    render(renderer: IRenderer): void {
        this.children.forEach(child => child.render(renderer));
    }
}

export class EnemyGroupComposite extends GameObjectComposite {
    update(context: GameContext): void {
        this.children.forEach(child => child.update(context));
    }
    
    render(renderer: IRenderer): void {
        this.children.forEach(child => child.render(renderer));
    }
    
    public getEnemies(): IEnemy[] {
        return this.children.filter(child => child instanceof IEnemy) as IEnemy[];
    }
}
```

---

## 🎭 Patrones Comportamentales

### 1. Observer Pattern

**Propósito**: Definir una dependencia uno-a-muchos entre objetos.

```typescript
// observers/EventBus.ts (ya implementado)
export class EventBus {
    private listeners = new Map<string, EventHandler[]>();
    
    public on<T extends GameEvent>(eventType: string, handler: EventHandler<T>): void {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType)!.push(handler);
    }
    
    public emit<T extends GameEvent>(event: T): void {
        const handlers = this.listeners.get(event.type);
        if (handlers) {
            handlers.forEach(handler => handler(event));
        }
    }
}
```

### 2. Strategy Pattern

**Propósito**: Definir una familia de algoritmos y hacerlos intercambiables.

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
        
        if (this.timer > 2000) {
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

// Uso en enemigos
export class SmartEnemy extends BaseEnemy {
    private movementStrategy: IMovementStrategy;
    
    constructor(position: Vector2) {
        super(EnemyType.SMART, position);
        this.movementStrategy = new AIPatrolStrategy();
    }
    
    public setMovementStrategy(strategy: IMovementStrategy): void {
        this.movementStrategy = strategy;
    }
    
    update(context: GameContext): void {
        this.movementStrategy.move(this, context);
        super.update(context);
    }
}
```

### 3. Command Pattern

**Propósito**: Encapsular una solicitud como un objeto.

```typescript
// commands/GameCommand.ts
export interface IGameCommand {
    execute(): void;
    undo(): void;
}

export class MoveCommand implements IGameCommand {
    constructor(
        private entity: IMovable,
        private from: Vector2,
        private to: Vector2
    ) {}
    
    execute(): void {
        this.entity.setPosition(this.to);
    }
    
    undo(): void {
        this.entity.setPosition(this.from);
    }
}

export class FireWeaponCommand implements IGameCommand {
    constructor(
        private weapon: IWeapon,
        private direction: Vector2,
        private position: Vector2
    ) {}
    
    execute(): void {
        this.weapon.fire(this.direction, this.position);
    }
    
    undo(): void {
        // Implementar lógica de deshacer disparo
    }
}

export class CommandInvoker {
    private history: IGameCommand[] = [];
    private currentIndex = -1;
    
    public execute(command: IGameCommand): void {
        command.execute();
        
        // Limpiar comandos futuros si estamos en el medio del historial
        this.history = this.history.slice(0, this.currentIndex + 1);
        this.history.push(command);
        this.currentIndex++;
    }
    
    public undo(): void {
        if (this.currentIndex >= 0) {
            const command = this.history[this.currentIndex];
            command.undo();
            this.currentIndex--;
        }
    }
    
    public redo(): void {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            const command = this.history[this.currentIndex];
            command.execute();
        }
    }
}
```

### 4. State Pattern

**Propósito**: Permitir que un objeto altere su comportamiento cuando cambia su estado interno.

```typescript
// states/PlayerState.ts
export interface IPlayerState {
    enter(player: Player): void;
    update(player: Player, context: GameContext): void;
    exit(player: Player): void;
}

export class StandingState implements IPlayerState {
    enter(player: Player): void {
        player.setAnimation('stand');
    }
    
    update(player: Player, context: GameContext): void {
        const input = context.inputProvider.getMovementInput();
        
        if (input.magnitude() > 0) {
            player.setState(new WalkingState());
        }
        
        if (context.inputProvider.isFlyPressed()) {
            player.setState(new FlyingState());
        }
    }
    
    exit(player: Player): void {
        // Limpiar estado
    }
}

export class WalkingState implements IPlayerState {
    enter(player: Player): void {
        player.setAnimation('walk');
    }
    
    update(player: Player, context: GameContext): void {
        const input = context.inputProvider.getMovementInput();
        
        if (input.magnitude() === 0) {
            player.setState(new StandingState());
        }
        
        if (context.inputProvider.isFlyPressed()) {
            player.setState(new FlyingState());
        }
    }
    
    exit(player: Player): void {
        // Limpiar estado
    }
}

export class FlyingState implements IPlayerState {
    enter(player: Player): void {
        player.setAnimation('fly');
    }
    
    update(player: Player, context: GameContext): void {
        const input = context.inputProvider.getMovementInput();
        
        if (!context.inputProvider.isFlyPressed()) {
            player.setState(new StandingState());
        }
    }
    
    exit(player: Player): void {
        // Limpiar estado
    }
}

export class Player {
    private currentState: IPlayerState;
    
    constructor() {
        this.currentState = new StandingState();
        this.currentState.enter(this);
    }
    
    public setState(newState: IPlayerState): void {
        this.currentState.exit(this);
        this.currentState = newState;
        this.currentState.enter(this);
    }
    
    public update(context: GameContext): void {
        this.currentState.update(this, context);
    }
}
```

### 5. Template Method Pattern

**Propósito**: Definir el esqueleto de un algoritmo en una operación.

```typescript
// templates/EnemyAITemplate.ts
export abstract class EnemyAITemplate {
    public execute(enemy: IEnemy, context: GameContext): void {
        this.detectPlayer(enemy, context);
        this.planAction(enemy, context);
        this.executeAction(enemy, context);
        this.updateState(enemy, context);
    }
    
    protected abstract detectPlayer(enemy: IEnemy, context: GameContext): boolean;
    protected abstract planAction(enemy: IEnemy, context: GameContext): void;
    protected abstract executeAction(enemy: IEnemy, context: GameContext): void;
    
    protected updateState(enemy: IEnemy, context: GameContext): void {
        // Implementación por defecto
    }
}

export class BatAITemplate extends EnemyAITemplate {
    protected detectPlayer(enemy: IEnemy, context: GameContext): boolean {
        const player = context.gameState.getState().player;
        const distance = enemy.getPosition().subtract(player.getPosition()).magnitude();
        return distance < 150;
    }
    
    protected planAction(enemy: IEnemy, context: GameContext): void {
        // Plan específico para murciélagos
    }
    
    protected executeAction(enemy: IEnemy, context: GameContext): void {
        // Acción específica para murciélagos
    }
}
```

---

## 🏗️ Patrones Arquitectónicos

### 1. Model-View-Controller (MVC)

```typescript
// models/GameModel.ts
export class GameModel {
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
    
    private notifyObservers(oldState: GameStateData, newState: GameStateData): void {
        this.observers.forEach(observer => {
            observer.onStateChange(oldState, newState);
        });
    }
}

// views/GameView.ts
export class GameView {
    constructor(
        private renderer: IRenderer,
        private uiService: IUIService
    ) {}
    
    public render(gameState: GameStateData): void {
        this.renderer.clear();
        
        // Renderizar entidades
        gameState.enemies.forEach(enemy => enemy.render(this.renderer));
        gameState.bombs.forEach(bomb => bomb.render(this.renderer));
        gameState.lasers.forEach(laser => laser.render(this.renderer));
        
        // Renderizar UI
        this.uiService.updateScore(gameState.score);
        this.uiService.updateLives(gameState.lives);
        this.uiService.updateEnergy(gameState.energy);
    }
}

// controllers/GameController.ts
export class GameController {
    constructor(
        private model: GameModel,
        private view: GameView,
        private inputProvider: IInputProvider
    ) {
        this.model.subscribe(this);
    }
    
    public update(deltaTime: number): void {
        // Procesar input
        const input = this.inputProvider.getMovementInput();
        
        // Actualizar modelo
        this.model.updateState({
            playerPosition: this.calculateNewPosition(input, deltaTime)
        });
        
        // Renderizar vista
        this.view.render(this.model.getState());
    }
    
    public onStateChange(oldState: GameStateData, newState: GameStateData): void {
        // Reaccionar a cambios de estado
        if (newState.lives !== oldState.lives) {
            this.handleLivesChanged(newState.lives);
        }
    }
    
    private calculateNewPosition(input: Vector2, deltaTime: number): Vector2 {
        const currentState = this.model.getState();
        return currentState.playerPosition.add(input.multiply(deltaTime * 200));
    }
    
    private handleLivesChanged(lives: number): void {
        if (lives <= 0) {
            this.handleGameOver();
        }
    }
    
    private handleGameOver(): void {
        // Lógica de game over
    }
}
```

### 2. Entity-Component-System (ECS)

```typescript
// ecs/Entity.ts
export class Entity {
    private components = new Map<string, Component>();
    
    public addComponent<T extends Component>(component: T): void {
        this.components.set(component.constructor.name, component);
    }
    
    public getComponent<T extends Component>(type: new () => T): T | undefined {
        return this.components.get(type.name) as T;
    }
    
    public hasComponent<T extends Component>(type: new () => T): boolean {
        return this.components.has(type.name);
    }
}

// ecs/Component.ts
export abstract class Component {
    public entity?: Entity;
}

// ecs/PositionComponent.ts
export class PositionComponent extends Component {
    constructor(public x: number, public y: number) {
        super();
    }
}

// ecs/VelocityComponent.ts
export class VelocityComponent extends Component {
    constructor(public x: number, public y: number) {
        super();
    }
}

// ecs/System.ts
export abstract class System {
    protected entities: Entity[] = [];
    
    public addEntity(entity: Entity): void {
        this.entities.push(entity);
    }
    
    public removeEntity(entity: Entity): void {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
    }
    
    public abstract update(deltaTime: number): void;
}

// ecs/MovementSystem.ts
export class MovementSystem extends System {
    public update(deltaTime: number): void {
        this.entities.forEach(entity => {
            const position = entity.getComponent(PositionComponent);
            const velocity = entity.getComponent(VelocityComponent);
            
            if (position && velocity) {
                position.x += velocity.x * deltaTime;
                position.y += velocity.y * deltaTime;
            }
        });
    }
}
```

---

## 🎯 Ejemplos Prácticos

### Sistema de Armas Extensible

```typescript
// weapons/WeaponFactory.ts
export class WeaponFactory {
    private static weaponTypes = new Map<WeaponType, new () => IWeapon>();
    
    public static registerWeaponType(type: WeaponType, constructor: new () => IWeapon): void {
        this.weaponTypes.set(type, constructor);
    }
    
    public static createWeapon(type: WeaponType): IWeapon {
        const Constructor = this.weaponTypes.get(type);
        if (!Constructor) {
            throw new Error(`Unknown weapon type: ${type}`);
        }
        return new Constructor();
    }
}

// weapons/LaserWeapon.ts
export class LaserWeapon implements IWeapon {
    private cooldownRemaining = 0;
    private readonly cooldownTime = 200; // ms
    
    fire(direction: Vector2, position: Vector2): void {
        if (this.canFire()) {
            const projectile = new LaserProjectile(position, direction);
            this.cooldownRemaining = this.cooldownTime;
            // Emitir evento de disparo
        }
    }
    
    canFire(): boolean {
        return this.cooldownRemaining <= 0;
    }
    
    getCooldownRemaining(): number {
        return this.cooldownRemaining;
    }
    
    getDamage(): number {
        return 25;
    }
    
    getRange(): number {
        return 300;
    }
}
```

### Sistema de Efectos Visuales

```typescript
// effects/ParticleSystem.ts
export class ParticleSystem {
    private particles: Particle[] = [];
    private particlePool: ObjectPool<Particle>;
    
    constructor() {
        this.particlePool = new ObjectPool<Particle>(
            () => new Particle(),
            (particle) => particle.reset(),
            100
        );
    }
    
    public emitExplosion(position: Vector2): void {
        for (let i = 0; i < 20; i++) {
            const particle = this.particlePool.get();
            particle.initialize(position, this.getRandomDirection(), this.getRandomSpeed());
            this.particles.push(particle);
        }
    }
    
    public update(deltaTime: number): void {
        this.particles.forEach(particle => {
            particle.update(deltaTime);
        });
        
        // Remover partículas muertas
        this.particles = this.particles.filter(particle => {
            if (particle.isDead()) {
                this.particlePool.release(particle);
                return false;
            }
            return true;
        });
    }
    
    public render(renderer: IRenderer): void {
        this.particles.forEach(particle => {
            particle.render(renderer);
        });
    }
    
    private getRandomDirection(): Vector2 {
        const angle = Math.random() * Math.PI * 2;
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }
    
    private getRandomSpeed(): number {
        return 50 + Math.random() * 100;
    }
}
```

---

## 📋 Mejores Prácticas

### 1. **Cuándo Usar Cada Patrón**

| Patrón | Cuándo Usar | Ejemplo en el Juego |
|--------|-------------|-------------------|
| Factory | Crear objetos de diferentes tipos | `EnemyFactory`, `WeaponFactory` |
| Observer | Comunicación desacoplada | `EventBus` para eventos del juego |
| Strategy | Algoritmos intercambiables | `MovementStrategy` para IA de enemigos |
| Decorator | Agregar funcionalidad dinámicamente | `LoggingDecorator`, `PerformanceDecorator` |
| Command | Operaciones reversibles | `MoveCommand`, `FireWeaponCommand` |
| State | Comportamiento que cambia según estado | `PlayerState` (standing, walking, flying) |

### 2. **Principios de Diseño**

- **Composición sobre Herencia**: Prefiere composición para mayor flexibilidad
- **Interfaces Pequeñas**: Mantén interfaces específicas y cohesivas
- **Inyección de Dependencias**: Usa DI para desacoplar componentes
- **Single Responsibility**: Cada clase debe tener una sola razón para cambiar
- **Open/Closed**: Abierto para extensión, cerrado para modificación

### 3. **Testing con Patrones**

```typescript
// tests/EnemyFactory.test.ts
describe('EnemyFactory', () => {
    it('should create correct enemy types', () => {
        const bat = EnemyFactory.createEnemy(EnemyType.BAT, new Vector2(0, 0));
        expect(bat).toBeInstanceOf(BatEnemy);
        
        const spider = EnemyFactory.createEnemy(EnemyType.SPIDER, new Vector2(0, 0));
        expect(spider).toBeInstanceOf(SpiderEnemy);
    });
    
    it('should throw error for unknown enemy type', () => {
        expect(() => {
            EnemyFactory.createEnemy('UNKNOWN' as EnemyType, new Vector2(0, 0));
        }).toThrow('Unknown enemy type');
    });
});

// tests/EventBus.test.ts
describe('EventBus', () => {
    let eventBus: EventBus;
    let handler: jest.Mock;
    
    beforeEach(() => {
        eventBus = new EventBus();
        handler = jest.fn();
    });
    
    it('should call handler when event is emitted', () => {
        eventBus.on('test.event', handler);
        eventBus.emit(new TestEvent());
        
        expect(handler).toHaveBeenCalledTimes(1);
    });
    
    it('should not call handler after unsubscribing', () => {
        eventBus.on('test.event', handler);
        eventBus.off('test.event', handler);
        eventBus.emit(new TestEvent());
        
        expect(handler).not.toHaveBeenCalled();
    });
});
```

---

**¡Estos patrones te proporcionan una base sólida para crear software mantenible y escalable! 🚀**
