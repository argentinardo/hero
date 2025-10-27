// DependencyContainer.ts
import { 
    IRenderer, 
    IAudioService, 
    IInputProvider, 
    IGameState, 
    ILogger,
    IGameSystem,
    GameContext,
    IEntity,
    Sprite,
    Vector2,
    Rectangle,
    Camera,
    GameStateData,
    IStateObserver
} from './interfaces';

/**
 * Container de inyección de dependencias simplificado
 */
export class DependencyContainer {
    private services = new Map<string, any>();
    private instances = new Map<string, any>();
    
    public register<T>(key: string, factory: () => T, singleton: boolean = false): void {
        this.services.set(key, { factory, singleton });
    }
    
    public registerInstance<T>(key: string, instance: T): void {
        this.instances.set(key, instance);
    }
    
    public resolve<T>(key: string): T {
        if (this.instances.has(key)) {
            return this.instances.get(key);
        }
        
        const service = this.services.get(key);
        if (!service) {
            throw new Error(`Service ${key} not found`);
        }
        
        const instance = service.factory();
        
        if (service.singleton) {
            this.instances.set(key, instance);
        }
        
        return instance;
    }
    
    public isRegistered(key: string): boolean {
        return this.services.has(key) || this.instances.has(key);
    }
    
    public clearSingletons(): void {
        this.instances.clear();
    }
}

/**
 * Configuración básica del juego
 */
export class GameConfiguration {
    protected container: DependencyContainer;
    
    constructor() {
        this.container = new DependencyContainer();
        this.setupCoreServices();
    }
    
    public getContainer(): DependencyContainer {
        return this.container;
    }
    
    protected setupCoreServices(): void {
        // Renderer básico
        this.container.register<IRenderer>('IRenderer', () => {
            const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
            return new BasicRenderer(canvas);
        }, true);
        
        // Audio Service básico
        this.container.register<IAudioService>('IAudioService', () => {
            return new BasicAudioService();
        }, true);
        
        // Input Provider básico
        this.container.register<IInputProvider>('IInputProvider', () => {
            return new BasicInputProvider();
        }, true);
        
        // Logger básico
        this.container.register<ILogger>('ILogger', () => {
            return new BasicLogger();
        }, true);
        
        // Game State básico
        this.container.register<IGameState>('IGameState', () => {
            return new BasicGameState();
        }, true);
    }
}

/**
 * Clase principal del juego simplificada
 */
export class Game {
    private systems: IGameSystem[] = [];
    private entities: IEntity[] = [];
    private isRunning: boolean = false;
    private lastTime: number = 0;
    
    constructor(
        private container: DependencyContainer
    ) {
        this.setupSystems();
    }
    
    public start(): void {
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    public stop(): void {
        this.isRunning = false;
    }
    
    public pause(): void {
        this.isRunning = false;
    }
    
    public resume(): void {
        this.isRunning = true;
        this.lastTime = performance.now();
    }
    
    public addEntity(entity: IEntity): void {
        this.entities.push(entity);
    }
    
    public removeEntity(entity: IEntity): void {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            this.entities.splice(index, 1);
        }
    }
    
    public getEntities(): readonly IEntity[] {
        return this.entities;
    }
    
    public getIsRunning(): boolean {
        return this.isRunning;
    }
    
    private setupSystems(): void {
        // Por ahora sin sistemas específicos
    }
    
    private gameLoop(): void {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        const context = this.createGameContext(deltaTime);
        
        // Actualizar sistemas
        this.systems.forEach(system => system.update(context));
        
        // Actualizar entidades
        this.entities.forEach(entity => {
            if (entity.isActive()) {
                entity.update(context);
            }
        });
        
        // Continuar el loop
        requestAnimationFrame(() => this.gameLoop());
    }
    
    private createGameContext(deltaTime: number): GameContext {
        return {
            deltaTime,
            gameState: this.container.resolve<IGameState>('IGameState'),
            inputProvider: this.container.resolve<IInputProvider>('IInputProvider'),
            renderer: this.container.resolve<IRenderer>('IRenderer'),
            audioService: this.container.resolve<IAudioService>('IAudioService')
        };
    }
}

/**
 * Factory para crear instancias del juego
 */
export class GameFactory {
    public static createDefaultGame(): Game {
        const config = new GameConfiguration();
        const container = config.getContainer();
        return new Game(container);
    }
    
    public static createTestGame(): Game {
        const container = new DependencyContainer();
        
        // Registrar mocks para testing
        container.registerInstance<IRenderer>('IRenderer', new MockRenderer());
        container.registerInstance<IAudioService>('IAudioService', new MockAudioService());
        container.registerInstance<IInputProvider>('IInputProvider', new MockInputProvider());
        container.registerInstance<IGameState>('IGameState', new MockGameState());
        
        return new Game(container);
    }
}

// Implementaciones básicas de servicios
class BasicRenderer implements IRenderer {
    private context: CanvasRenderingContext2D;
    
    constructor(private canvas: HTMLCanvasElement) {
        this.context = canvas.getContext('2d')!;
    }
    
    clear(): void {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawSprite(sprite: Sprite, position: Vector2): void {
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
    
    drawRectangle(rect: Rectangle, color: string): void {
        this.context.fillStyle = color;
        this.context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    
    drawText(text: string, position: Vector2, color: string, fontSize: number): void {
        this.context.fillStyle = color;
        this.context.font = `${fontSize}px Arial`;
        this.context.fillText(text, position.x, position.y);
    }
    
    setCamera(camera: Camera): void {
        this.context.save();
        this.context.translate(-camera.x, -camera.y);
    }
    
    resetCamera(): void {
        this.context.restore();
    }
    
    save(): void {
        this.context.save();
    }
    
    restore(): void {
        this.context.restore();
    }
}

class BasicAudioService implements IAudioService {
    playSound(soundId: string, volume?: number): void {
        console.log(`Playing sound: ${soundId} at volume: ${volume || 1}`);
    }
    
    playMusic(musicId: string, loop?: boolean): void {
        console.log(`Playing music: ${musicId}, loop: ${loop || false}`);
    }
    
    stopMusic(): void {
        console.log('Stopping music');
    }
    
    pauseMusic(): void {
        console.log('Pausing music');
    }
    
    resumeMusic(): void {
        console.log('Resuming music');
    }
    
    setMasterVolume(volume: number): void {
        console.log(`Setting master volume: ${volume}`);
    }
    
    setMusicVolume(volume: number): void {
        console.log(`Setting music volume: ${volume}`);
    }
    
    setEffectsVolume(volume: number): void {
        console.log(`Setting effects volume: ${volume}`);
    }
}

class BasicInputProvider implements IInputProvider {
    private keys: { [key: string]: boolean } = {};
    
    constructor() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    
    getMovementInput(): Vector2 {
        const { Vector2Impl } = require('./interfaces');
        let x = 0, y = 0;
        
        if (this.keys['ArrowLeft']) x = -1;
        if (this.keys['ArrowRight']) x = 1;
        if (this.keys['ArrowUp']) y = -1;
        if (this.keys['ArrowDown']) y = 1;
        
        return new Vector2Impl(x, y);
    }
    
    isShootPressed(): boolean {
        return this.keys['Space'] || false;
    }
    
    isBombPressed(): boolean {
        return this.keys['KeyB'] || false;
    }
    
    isFlyPressed(): boolean {
        return this.keys['ArrowUp'] || false;
    }
    
    update(): void {
        // No hay nada que actualizar en esta implementación básica
    }
}

class BasicLogger implements ILogger {
    info(message: string, data?: any): void {
        console.log(`[INFO] ${message}`, data);
    }
    
    warn(message: string, data?: any): void {
        console.warn(`[WARN] ${message}`, data);
    }
    
    error(message: string, error?: Error): void {
        console.error(`[ERROR] ${message}`, error);
    }
    
    debug(message: string, data?: any): void {
        console.debug(`[DEBUG] ${message}`, data);
    }
}

class BasicGameState implements IGameState {
    private state: GameStateData;
    private observers: IStateObserver[] = [];
    
    constructor() {
        const { Vector2Impl } = require('./interfaces');
        this.state = {
            score: 0,
            lives: 3,
            energy: 100,
            currentLevel: 1,
            playerPosition: Vector2Impl.zero(),
            enemies: [],
            isPaused: false,
            gameTime: 0
        };
    }
    
    getState(): Readonly<GameStateData> {
        return Object.freeze({ ...this.state });
    }
    
    updateState(updates: Partial<GameStateData>): void {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...updates };
        this.notifyObservers(oldState, this.state);
    }
    
    subscribe(observer: IStateObserver): void {
        this.observers.push(observer);
    }
    
    unsubscribe(observer: IStateObserver): void {
        const index = this.observers.indexOf(observer);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }
    
    reset(): void {
        const { Vector2Impl } = require('./interfaces');
        this.state = {
            score: 0,
            lives: 3,
            energy: 100,
            currentLevel: 1,
            playerPosition: Vector2Impl.zero(),
            enemies: [],
            isPaused: false,
            gameTime: 0
        };
    }
    
    private notifyObservers(oldState: GameStateData, newState: GameStateData): void {
        this.observers.forEach(observer => {
            observer.onStateChange(oldState, newState);
        });
    }
}

// Mocks para testing
class MockRenderer implements IRenderer {
    clear(): void {}
    drawSprite(sprite: Sprite, position: Vector2): void {}
    drawRectangle(rect: Rectangle, color: string): void {}
    drawText(text: string, position: Vector2, color: string, fontSize: number): void {}
    setCamera(camera: Camera): void {}
    resetCamera(): void {}
    save(): void {}
    restore(): void {}
}

class MockAudioService implements IAudioService {
    playSound(soundId: string, volume?: number): void {}
    playMusic(musicId: string, loop?: boolean): void {}
    stopMusic(): void {}
    pauseMusic(): void {}
    resumeMusic(): void {}
    setMasterVolume(volume: number): void {}
    setMusicVolume(volume: number): void {}
    setEffectsVolume(volume: number): void {}
}

class MockInputProvider implements IInputProvider {
    getMovementInput(): Vector2 {
        const { Vector2Impl } = require('./interfaces');
        return Vector2Impl.zero();
    }
    isShootPressed(): boolean { return false; }
    isBombPressed(): boolean { return false; }
    isFlyPressed(): boolean { return false; }
    update(): void {}
}

class MockGameState implements IGameState {
    getState(): Readonly<GameStateData> {
        const { Vector2Impl } = require('./interfaces');
        return {
            score: 0,
            lives: 3,
            energy: 100,
            currentLevel: 1,
            playerPosition: Vector2Impl.zero(),
            enemies: [],
            isPaused: false,
            gameTime: 0
        };
    }
    updateState(updates: Partial<GameStateData>): void {}
    subscribe(observer: IStateObserver): void {}
    unsubscribe(observer: IStateObserver): void {}
    reset(): void {}
}
