// interfaces/IGameSystem.ts
export interface IGameSystem {
    update(context: GameContext): void;
    initialize?(): void;
    cleanup?(): void;
}

// interfaces/IEntity.ts
export interface IEntity {
    readonly id: string;
    update(context: GameContext): void;
    render(renderer: IRenderer): void;
    isActive(): boolean;
    destroy(): void;
}

// interfaces/IRenderer.ts
export interface IRenderer {
    clear(): void;
    drawSprite(sprite: Sprite, position: Vector2): void;
    drawRectangle(rect: Rectangle, color: string): void;
    drawText(text: string, position: Vector2, color: string, fontSize: number): void;
    setCamera(camera: Camera): void;
    resetCamera(): void;
    save(): void;
    restore(): void;
}

// interfaces/IInputProvider.ts
export interface IInputProvider {
    getMovementInput(): Vector2;
    isShootPressed(): boolean;
    isBombPressed(): boolean;
    isFlyPressed(): boolean;
    update(): void;
}

// interfaces/IAudioService.ts
export interface IAudioService {
    playSound(soundId: string, volume?: number): void;
    playMusic(musicId: string, loop?: boolean): void;
    stopMusic(): void;
    pauseMusic(): void;
    resumeMusic(): void;
    setMasterVolume(volume: number): void;
    setMusicVolume(volume: number): void;
    setEffectsVolume(volume: number): void;
}

// interfaces/IGameState.ts
export interface IGameState {
    getState(): Readonly<GameStateData>;
    updateState(updates: Partial<GameStateData>): void;
    subscribe(observer: IStateObserver): void;
    unsubscribe(observer: IStateObserver): void;
    reset(): void;
}

// interfaces/IStateObserver.ts
export interface IStateObserver {
    onStateChange(oldState: GameStateData, newState: GameStateData): void;
}

// interfaces/ILogger.ts
export interface ILogger {
    info(message: string, data?: any): void;
    warn(message: string, data?: any): void;
    error(message: string, error?: Error): void;
    debug(message: string, data?: any): void;
}

// interfaces/ICollidable.ts
export interface ICollidable {
    getBounds(): Rectangle;
    onCollision(other: ICollidable): void;
    canCollideWith(other: ICollidable): boolean;
}

// interfaces/IMovable.ts
export interface IMovable {
    move(direction: Vector2): void;
    getPosition(): Vector2;
    setPosition(position: Vector2): void;
    getVelocity(): Vector2;
    setVelocity(velocity: Vector2): void;
}

// interfaces/IAnimatable.ts
export interface IAnimatable {
    updateAnimation(deltaTime: number): void;
    setAnimation(animationName: string): void;
    getCurrentFrame(): number;
    isAnimationComplete(): boolean;
    resetAnimation(): void;
}

// interfaces/IAttackable.ts
export interface IAttackable {
    takeDamage(damage: number, attacker?: IAttacker): void;
    getHealth(): number;
    getMaxHealth(): number;
    isDead(): boolean;
}

// interfaces/IAttacker.ts
export interface IAttacker {
    attack(target: IAttackable): void;
    getDamage(): number;
    getAttackRange(): number;
    canAttack(): boolean;
}

// interfaces/IEnemy.ts
export interface IEnemy extends IEntity, IMovable, ICollidable, IAnimatable, IAttackable {
    getEnemyType(): EnemyType;
    getReward(): number;
}

// Tipos de datos básicos
export interface GameContext {
    deltaTime: number;
    gameState: IGameState;
    inputProvider: IInputProvider;
    renderer: IRenderer;
    audioService: IAudioService;
}

export interface GameStateData {
    score: number;
    lives: number;
    energy: number;
    currentLevel: number;
    playerPosition: Vector2;
    enemies: IEnemy[];
    isPaused: boolean;
    gameTime: number;
}

export interface Sprite {
    image: HTMLImageElement;
    sourceX: number;
    sourceY: number;
    width: number;
    height: number;
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    intersects(other: Rectangle): boolean;
}

export interface Vector2 {
    x: number;
    y: number;
    add(other: Vector2): Vector2;
    subtract(other: Vector2): Vector2;
    multiply(scalar: number): Vector2;
    normalize(): Vector2;
    magnitude(): number;
}

export interface Camera {
    x: number;
    y: number;
    width: number;
    height: number;
    follow(target: Vector2): void;
}

export enum EnemyType {
    BAT = 'bat',
    SPIDER = 'spider',
    VIPER = 'viper'
}

// Implementaciones básicas de tipos
export class Vector2Impl implements Vector2 {
    constructor(public x: number, public y: number) {}
    
    add(other: Vector2): Vector2 {
        return new Vector2Impl(this.x + other.x, this.y + other.y);
    }
    
    subtract(other: Vector2): Vector2 {
        return new Vector2Impl(this.x - other.x, this.y - other.y);
    }
    
    multiply(scalar: number): Vector2 {
        return new Vector2Impl(this.x * scalar, this.y * scalar);
    }
    
    normalize(): Vector2 {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2Impl(0, 0);
        return new Vector2Impl(this.x / mag, this.y / mag);
    }
    
    magnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    static zero(): Vector2 {
        return new Vector2Impl(0, 0);
    }
}

export class RectangleImpl implements Rectangle {
    constructor(public x: number, public y: number, public width: number, public height: number) {}
    
    intersects(other: Rectangle): boolean {
        return !(this.x + this.width < other.x || 
                other.x + other.width < this.x || 
                this.y + this.height < other.y || 
                other.y + other.height < this.y);
    }
}

export class CameraImpl implements Camera {
    constructor(public x: number, public y: number, public width: number, public height: number) {}
    
    follow(target: Vector2): void {
        this.x = target.x - this.width / 2;
        this.y = target.y - this.height / 2;
    }
}