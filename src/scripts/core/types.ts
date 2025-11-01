export type AppState = 'menu' | 'playing' | 'editing';
export type GameState = 'start' | 'playing' | 'respawning' | 'floating' | 'gameover' | 'win';

// Importar tipos de nipplejs
import type { JoystickManager } from 'nipplejs';

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
    respawnSettledFrames?: number;
    wantsToWake?: boolean;
    canWake?: boolean; // Puede tomar control tras finalizar descenso de respawn
    respawnTileX?: number;
    respawnTileY?: number;
    respawnOffsetX?: number;
    respawnOffsetY?: number;
    // Propiedades para sumersión en agua
    isInWater?: boolean;
    waterSubmersionLevel?: number; // 0 = no sumergido, 1 = completamente sumergido
    waterResistance?: number; // Resistencia al movimiento en agua
}

export type EnemyType = 'bat' | 'viper' | 'spider' | 'tentacle' | 'miner';

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
    // Propiedades específicas del tentáculo
    tentacleState?: 'standby' | 'whipping' | 'dying';
    tentacleFrame?: number;
    tentacleAnimationSpeed?: number;
    collisionHeight?: number; // Altura de la caja de colisión (75px)
    deathTimer?: number; // Temporizador para eliminar después de mostrar frame de muerte
}

export interface Wall extends GameObject {
    type: 'solid' | 'destructible' | 'destructible_v' | 'lava' | 'crushing' | 'water';
    tile: string;
    spriteTick?: number;
    currentFrame?: number;
    health?: number;
    isDamaged?: boolean;
    affectedByDark?: boolean;
    // Para columnas destructibles: renderizado visual vs colisión
    visualWidth?: number;
    visualX?: number;
    cutSide?: 'left' | 'right'; // Qué lado fue cortado
    // Para paredes aplastantes
    side?: 'left' | 'right';
    minWidth?: number;
    maxWidth?: number;
    currentWidth?: number;
    originalX?: number;
    initialX?: number;
    animationTimer?: number;
    animationSpeed?: number;
    isClosing?: boolean;
    partnerId?: string;
    state?: 'opening' | 'closing' | 'open' | 'closed' | 'waiting' | 'moving_in' | 'moving_out';
    waitTimer?: number;
    speed?: number;
    color?: string;
}

export interface Platform extends GameObject {
    vx: number;
    isActive: boolean;
}

export interface Laser extends GameObject {
    vx: number;
    startX: number;
}

export interface Bomb extends GameObject {
    fuse: number;
    animationTick: number;
    currentFrame: number;
    attachedPlatform?: Platform;
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
    // Propiedades específicas del tentáculo muerto
    tentacleFrame?: number;
    tentacleState?: 'dying';
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    color: string;
    gravity?: number; // Gravedad personalizada por partícula
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
    heroLogoEl: HTMLElement | null;
    rightUiEl: HTMLElement | null;
    bottomUiEl: HTMLElement | null;
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
    volumeToggle?: HTMLSpanElement | null;
    startGameBtn: HTMLButtonElement | null;
    levelEditorBtn: HTMLButtonElement | null;
    playTestBtn: HTMLButtonElement | null;
    resumeEditorBtn: HTMLButtonElement | null;
    loadLevelBtn: HTMLButtonElement | null;
    saveLevelBtn: HTMLButtonElement | null;
    addLevelBtn: HTMLButtonElement | null;
    generateLevelBtn: HTMLButtonElement | null;
    saveAllBtn: HTMLButtonElement | null;
    backToMenuBtn: HTMLButtonElement | null;
    confirmSaveBtn: HTMLButtonElement | null;
    cancelSaveBtn: HTMLButtonElement | null;
    undoBtn: HTMLButtonElement | null;
    redoBtn: HTMLButtonElement | null;
    duplicateRowBtn: HTMLButtonElement | null;
    deleteRowBtn: HTMLButtonElement | null;
    gameoverModal: HTMLElement | null;
    gameoverScoreValue: HTMLElement | null;
    gameoverRetryBtn: HTMLButtonElement | null;
    gameoverMenuBtn: HTMLButtonElement | null;
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
    // Número de hitos de 20k puntos ya convertidos en vidas extra
    scoreLifeMilestone: number;
    energy: number;
    energyDecrementRate: number;
    bombsRemaining: number;
    currentLevelIndex: number;
    cameraY: number;
    cameraX: number;
    
    // Estado de pausa
    isPaused: boolean;
    
    // Secuencia de fin de nivel
    levelEndSequence: 'energy' | 'bombs' | 'complete' | null;
    levelEndTimer: number;
    virtualEnergyDrain: number | null;
    
    // Configuración de paredes aplastantes (editor)
    crushingWallConfig?: {
        speed: number;
        color: string;
    };
    
    player: Player;
    walls: Wall[];
    enemies: Enemy[];
    lasers: Laser[];
    bombs: Bomb[];
    explosions: Explosion[];
    miner: Miner | null;
    lights: Light[];
    platforms: Platform[];
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
    duplicateRowMode: boolean;
    deleteRowMode: boolean;
    splashAnimationFrame: number;
    splashAnimationTick: number;
    splashAnimationDirection: number; // 1 = hacia adelante, -1 = hacia atrás
    dom: DomReferences;
    // Configuración de audio y gráficos
    settings: {
        audio: {
            musicVolume: number;
            sfxVolume: number;
        };
        graphics: {
            scanline: boolean;
            glow: boolean;
            brightness: boolean;
            contrast: boolean;
            vignette: boolean;
        };
    };
}

