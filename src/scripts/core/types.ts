import type { JoystickManager } from 'nipplejs';

export type AppState = 'menu' | 'playing' | 'editing';
export type GameState = 'start' | 'playing' | 'respawning' | 'floating' | 'gameover' | 'win';

export interface AnimationData {
    frames: number;
    speed: number;
    sprite: string;
    loop?: boolean;
    reverse?: boolean;
}

export type AnimationMap = Record<string, AnimationData>;

export interface GameObject {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type PlayerAnimationState = 'stand' | 'walk' | 'jump' | 'fly' | 'die' | 'success';

export interface Player extends GameObject {
    hitbox: GameObject;
    vx: number;
    vy: number;
    direction: 1 | -1;
    isGrounded: boolean;
    isApplyingThrust: boolean;
    isChargingFly: boolean;
    wantsToFly: boolean;
    flyChargeTimer: number;
    shootCooldown: number;
    animationState: PlayerAnimationState;
    animationTick: number;
    currentFrame: number;
    deathTimer: number;
    isFrozen: boolean;
    isFloating: boolean;
    respawnX: number;
    respawnY: number;
    floatWaveTime: number;
    respawnTileX?: number;
    respawnTileY?: number;
    respawnOffsetX?: number;
    respawnOffsetY?: number;
}

export type EnemyType = 'bat' | 'viper' | 'spider' | 'miner';

export interface Enemy extends GameObject {
    vx: number;
    vy: number;
    type: EnemyType;
    tile: string;
    direction?: number;
    initialX?: number;
    initialY?: number;
    maxLength?: number;
    state?: 'extending' | 'retracting' | 'idle' | 'waiting_extended';
    idleTimer?: number;
    waitTimer?: number;
    spriteTick: number;
    movementTick?: number;
    currentFrame: number;
    isDead?: boolean;
    isHidden?: boolean;
    affectedByDark?: boolean;
}

export interface Wall extends GameObject {
    type: 'solid' | 'destructible' | 'destructible_v' | 'lava';
    tile: string;
    spriteTick?: number;
    currentFrame?: number;
    health?: number;
    isDamaged?: boolean;
    affectedByDark?: boolean;
}

export interface Laser extends GameObject {
    vx: number;
    startX: number;
}

export interface Bomb extends GameObject {
    fuse: number;
    animationTick: number;
    currentFrame: number;
}

export interface Explosion extends GameObject {
    timer: number;
    animationTick: number;
    currentFrame: number;
}

export interface Miner extends GameObject {
    tile: string;
    animationState: 'idle' | 'rescued';
    currentFrame: number;
    animationTick: number;
    animationDirection: number;
    isFlipped: boolean;
    affectedByDark?: boolean;
}

export interface FallingEntity extends GameObject {
    vy: number;
    vx: number;
    tile: string;
    rotation?: number;
    rotationSpeed?: number;
    hasBounced?: boolean; // para permitir un único rebote en enemigos
    // Offsets dentro del tile original para recorte de textura (en coordenadas de tile)
    // Ej.: 0 o TILE_SIZE/2 para cuartos de ladrillo
    srcTileOffsetX?: number;
    srcTileOffsetY?: number;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    color: string;
}

export interface FloatingScore {
    x: number;
    y: number;
    text: string;
    life: number;
    opacity: number;
}

export interface Light extends GameObject {
    tile: string;
    isOn: boolean;
}


export interface MouseState {
    x: number;
    y: number;
    gridX: number;
    gridY: number;
    isDown: boolean;
    startX?: number;
    startY?: number;
    isDragging?: boolean;
    // Editor panning with middle mouse
    isPanning?: boolean;
    panStartMouseX?: number;
    panStartMouseY?: number;
    panStartCameraX?: number;
    panStartCameraY?: number;
}

export interface TileDefinition {
    name: string;
    color: string;
    class: string;
    sprite?: string;
}

export type TileDictionary = Record<string, TileDefinition>;

export interface UiElements {
    livesCountEl: HTMLElement | null;
    scoreCountEl: HTMLElement | null;
    energyBarEl: HTMLElement | null;
    levelCountEl: HTMLElement | null;
    messageOverlay: HTMLElement | null;
    messageTitle: HTMLElement | null;
    messageText: HTMLElement | null;
    retryBtn?: HTMLButtonElement | null;
    gameUiEl: HTMLElement | null;
    rightUiEl: HTMLElement | null;
    menuBtn: HTMLButtonElement | null;
    restartBtn: HTMLButtonElement | null;
    menuBtnDesktop: HTMLButtonElement | null;
    restartBtnDesktop: HTMLButtonElement | null;
    editorPanelEl: HTMLElement | null;
    paletteEl: HTMLElement | null;
    confirmationModalEl: HTMLElement | null;
    notificationModalEl: HTMLElement | null;
    notificationTitleEl: HTMLElement | null;
    notificationMessageEl: HTMLElement | null;
    notificationOkBtn: HTMLButtonElement | null;
    exitModalEl: HTMLElement | null;
    exitTitleEl: HTMLElement | null;
    exitTextEl: HTMLElement | null;
    exitConfirmBtn: HTMLButtonElement | null;
    exitCancelBtn: HTMLButtonElement | null;
    levelSelectorEl: HTMLSelectElement | null;
    mobileControlsEl: HTMLElement | null;
    joystickZoneEl: HTMLElement | null;
    actionZoneEl: HTMLElement | null;
    volumeBtn?: HTMLButtonElement | null;
    startGameBtn: HTMLButtonElement | null;
    levelEditorBtn: HTMLButtonElement | null;
    playTestBtn: HTMLButtonElement | null;
    resumeEditorBtn: HTMLButtonElement | null;
    loadLevelBtn: HTMLButtonElement | null;
    saveLevelBtn: HTMLButtonElement | null;
    generateLevelBtn: HTMLButtonElement | null;
    saveAllBtn: HTMLButtonElement | null;
    backToMenuBtn: HTMLButtonElement | null;
    confirmSaveBtn: HTMLButtonElement | null;
    cancelSaveBtn: HTMLButtonElement | null;
    undoBtn: HTMLButtonElement | null;
    redoBtn: HTMLButtonElement | null;
}

export interface DomReferences {
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    ui: UiElements;
}

export interface GameStore {
    appState: AppState;
    gameState: GameState;
    lives: number;
    score: number;
    energy: number;
    energyDecrementRate: number;
    currentLevelIndex: number;
    cameraY: number;
    cameraX: number;
    player: Player;
    walls: Wall[];
    enemies: Enemy[];
    lasers: Laser[];
    bombs: Bomb[];
    explosions: Explosion[];
    miner: Miner | null;
    lights: Light[];
    isDark: boolean;
    explosionFlash: number;
    fallingEntities: FallingEntity[];
    particles: Particle[];
    floatingScores: FloatingScore[];
    levelDesigns: string[][];
    levelDataStore: string[][][];
    editorLevel: string[][];
    selectedTile: string;
    mouse: MouseState;
    keys: Record<string, boolean>;
    sprites: Record<string, HTMLImageElement>;
    joystickManager: JoystickManager | null;
    // Estado de UI móvil
    isLaserSticky: boolean;
    lastShootTap: number;
    initialLevels: string[][];
    editorHistory: string[][][];
    editorHistoryIndex: number;
    dom: DomReferences;
}

