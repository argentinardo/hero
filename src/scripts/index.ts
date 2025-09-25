// --- IMPORTS ---
import '../styles/main.scss';
import initialLevels from '../assets/levels.json';
import nipplejs from 'nipplejs';

// --- TYPE DECLARATIONS for nipplejs ---
declare module 'nipplejs' {
    interface JoystickManagerOptions {
        catchforce?: boolean;
    }
    interface JoystickManager {
        on(event: 'move', listener: (evt: EventData, data: Joystick) => void): this;
        on(event: 'end', listener: (evt: EventData, data: Joystick) => void): this;
    }
    interface Joystick {
        angle: {
            radian: number;
        };
        force: number;
    }
}


// Import all sprite assets
import playerWalkSrc from '../assets/sprites/hero_walk.png';
import playerStandSrc from '../assets/sprites/hero_stand.png';
import playerJumpSrc from '../assets/sprites/hero_jump.png';
import playerFlySrc from '../assets/sprites/hero_fly.png';
import batSrc from '../assets/sprites/bat_small.png';
import spiderSrc from '../assets/sprites/spider_small.png'; // 15 frames
import viperSrc from '../assets/sprites/serpiente_small.png';
import minerSrc from '../assets/sprites/miner_small.png';
import bombSrc from '../assets/sprites/bomba.png';
import explosionSrc from '../assets/sprites/boooom.png';
import wallSrc from '../assets/sprites/wall_small.png';
import dirtSrc from '../assets/sprites/tierra_small.png';
import columnSrc from '../assets/sprites/tierra_small.png';// Using wall sprite as placeholder for column
import lavaSrc from '../assets/sprites/lava.png';

// --- GENERAL SETUP ---
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const gameWorldEl = document.getElementById('game-world') as HTMLElement;
let appState = 'menu'; // menu, playing, editing
let gameState: string;

// --- UI ELEMENTS ---
const livesCountEl = document.getElementById('lives-count')!;
const scoreCountEl = document.getElementById('score-count')!;
const energyBarEl = document.getElementById('energy-bar') as HTMLElement;
const levelCountEl = document.getElementById('level-count')!;
const messageOverlay = document.getElementById('message-overlay') as HTMLElement;
const messageTitle = document.getElementById('message-title')!;
const messageText = document.getElementById('message-text')!;
const gameUiEl = document.getElementById('game-ui') as HTMLElement;
const editorPanelEl = document.getElementById('editor-panel') as HTMLElement;
const paletteEl = document.getElementById('tile-palette') as HTMLElement;
const levelDataTextarea = document.getElementById('level-data-textarea') as HTMLTextAreaElement;
const confirmationModalEl = document.getElementById('confirmation-modal') as HTMLElement;
const levelSelectorEl = document.getElementById('level-selector') as HTMLSelectElement;

// --- GAME CONSTANTS ---
const TILE_SIZE = 60;
const GRAVITY = 0.3;
const PLAYER_SPEED = 6;
const THRUST_POWER = 0.6; // Mayor que la gravedad para poder ascender
const MAX_UPWARD_SPEED = 5;
const LASER_SPEED = 12;
const MAX_ENERGY = 200;
const BOMB_FUSE = 80;
const TOTAL_LEVELS = 10;

// --- SPRITE & ANIMATION DATA ---
const sprites: { [key: string]: HTMLImageElement } = {};

interface AnimationData {
    frames: number;
    speed: number;
    sprite: string;
    loop?: boolean;
    reverse?: boolean;
}

const ANIMATION_DATA: { [key: string]: AnimationData } = {
    'P_walk': { frames: 6, speed: 5, sprite: playerWalkSrc, reverse: true },
    'P_stand': { frames: 4, speed: 20, sprite: playerStandSrc },
    'P_jump': { frames: 4, speed: 10, sprite: playerJumpSrc, loop: false },
    'P_fly': { frames: 5, speed: 10, sprite: playerFlySrc },
    '8': { frames: 6, speed: 2, sprite: batSrc },      // Bat
    'S': { frames: 15, speed: 7, sprite: spiderSrc },   // Spider
    'V': { frames: 1, speed: 1, sprite: viperSrc },      // Viper
    '9_idle': { frames: 2, speed: 120, sprite: minerSrc }, // 2 segundos por ciclo de ping-pong
    '9_rescued': { frames: 6, speed: 20, sprite: minerSrc, loop: false }, // 3fps = 60/3 = 20 ticks/frame
    '3': { frames: 16, speed: 19, sprite: lavaSrc },     // Lava
    'bomb': { frames: 6, speed: 15
        
        
        , sprite: bombSrc, loop: false  },
    'explosion': { frames: 6, speed: 2, sprite: explosionSrc, loop: false }
};

const TILE_TYPES: { [key: string]: { name: string, color: string, class: string, sprite?: string } } = {
    '0': { name: 'Vacío', color: '#000', class: '' },
    'P': { name: 'Player', color: '#ff0000', class: 'player' },
    '1': { name: 'Muro', color: '#6d6d6d', class: 'wall', sprite: wallSrc },
    '2': { name: 'Tierra', color: '#a5682a', class: 'destructible-wall', sprite: dirtSrc },
    'C': { name: 'Columna', color: '#c5853f', class: 'destructible-wall', sprite: columnSrc },
    '3': { name: 'Lava', color: '#ff4500', class: 'lava', sprite: lavaSrc },
    '8': { name: 'Murciélago', color: '#9400d3', class: 'bat', sprite: batSrc },
    'S': { name: 'Araña', color: '#ff8c00', class: 'spider', sprite: spiderSrc },
    'V': { name: 'Víbora', color: '#32cd32', class: 'viper', sprite: viperSrc },
    '9': { name: 'Minero', color: '#4169e1', class: 'miner', sprite: minerSrc },
};

// --- TYPE DEFINITIONS ---
interface Enemy {
    x: number; y: number; width: number; height: number; vx: number; vy: number;
    type: 'bat' | 'viper' | 'spider' | 'miner';
    tile: string;
    // element: HTMLElement; <--- REMOVED
    direction?: number;
    initialX?: number; initialY?: number;
    maxLength?: number;
    state?: 'extending' | 'retracting' | 'idle' | 'waiting_extended';
    idleTimer?: number;
    waitTimer?: number;
    spriteTick: number;
    movementTick?: number;
    currentFrame: number;
    isDead?: boolean;
    isHidden?: boolean;
}
interface Wall {
    x: number; y: number; width: number; height: number; type: string; tile: string; // element: HTMLElement; <--- REMOVED
    spriteTick?: number;
    currentFrame?: number;
    health?: number;
    isDamaged?: boolean;
}
interface Laser { x: number; y: number; width: number; height: number; vx: number; startX: number; } // element: HTMLElement; <--- REMOVED
interface Bomb { x: number; y: number; width: number; height: number; fuse: number; animationTick: number; currentFrame: number; } // element: HTMLElement; <--- REMOVED
interface Explosion { x: number; y: number; width: number; height: number; timer: number; animationTick: number; currentFrame: number; }
interface Miner {
    x: number; y: number; width: number; height: number;
    tile: string;
    animationState: 'idle' | 'rescued';
    currentFrame: number;
    animationTick: number;
    animationDirection: number;
}
interface GameObject { x: number; y: number; width: number; height: number; }
interface FallingEntity {
    x: number; y: number; width: number; height: number;
    vy: number; vx: number;
    tile: string;
    rotation?: number;
    rotationSpeed?: number;
}
interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    size: number;
    life: number;
    color: string;
}
interface FloatingScore {
    x: number; y: number;
    text: string;
    life: number;
    opacity: number;
}

// --- GAME STATE ---
let lives = 0, score = 0, energy = 0, currentLevelIndex = 0, cameraY = 0;
let walls: Wall[] = [], enemies: Enemy[] = [], lasers: Laser[] = [], bombs: Bomb[] = [], explosions: Explosion[] = [], miner: Miner | null = null, fallingEntities: FallingEntity[] = [], particles: Particle[] = [], floatingScores: FloatingScore[] = [];
let levelDesigns = JSON.parse(JSON.stringify(initialLevels));
let levelDataStore: string[][][] = [];

// --- NippleJS Joystick Manager ---
let joystickManager: nipplejs.JoystickManager | null = null;

/* REMOVED createGameObject FUNCTION */

// --- PLAYER OBJECT ---
const player: any = {};

// --- EDITOR STATE ---
let editorLevel: string[][];
let selectedTile = '1';
let mouse = { x: 0, y: 0, gridX: 0, gridY: 0, isDown: false };

// --- INPUT HANDLER ---
const keys: { [key: string]: boolean } = {};

// --- CORE FUNCTIONS (Parse, Reset, etc.) ---
function checkCollision(a: GameObject, b: GameObject) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function resetPlayer(startX = TILE_SIZE * 1.5, startY = TILE_SIZE * 1.5) {
    // if (player.element) player.element.remove(); <--- REMOVED
    Object.assign(player, {
        x: startX, y: startY, width: TILE_SIZE, height: TILE_SIZE * 2,
        hitbox: { x: startX + TILE_SIZE / 4, y: startY, width: TILE_SIZE / 2, height: TILE_SIZE * 2 },
        vx: 0, vy: 0,
        isApplyingThrust: false,
        isChargingFly: false,
        wantsToFly: false,
        flyChargeTimer: 0,
        isGrounded: false, direction: 1, shootCooldown: 0,
        animationState: 'stand', // 'stand', 'walk', 'jump'
        animationTick: 0,
        currentFrame: 0,
        deathTimer: 0
        // element: createGameObject('player', startX, startY) <--- REMOVED
    });
    energy = MAX_ENERGY;
}

function parseLevel(map: string[]) {
    // gameWorldEl.innerHTML = ''; <--- REMOVED
    walls = []; enemies = []; miner = null; lasers = []; bombs = []; explosions = []; fallingEntities = []; particles = []; floatingScores = [];
    let playerStartX = TILE_SIZE * 1.5, playerStartY = TILE_SIZE * 1.5;

    map.forEach((row, i) => {
        for (let j = 0; j < row.length; j++) {
            const char = row[j];
            const tileX = j * TILE_SIZE, tileY = i * TILE_SIZE;

            switch (char) {
                case '1': walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'solid', tile: char }); break;
                case '2': walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'destructible', tile: char, health: 60, isDamaged: false }); break;
                case 'C': walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'destructible_v', tile: char, health: 60, isDamaged: false }); break;
                case '3': walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'lava', tile: char, spriteTick: Math.floor(Math.random() * 50), currentFrame: Math.floor(Math.random() * 11) }); break;
                case 'P': playerStartX = tileX; playerStartY = tileY; break;
                case '8':
                    enemies.push({
                        x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE,
                        vx: Math.random() > 0.5 ? 1.5 : -1.5, vy: 0,
                        type: 'bat', tile: char,
                        initialY: tileY,
                        spriteTick: 0,
                        movementTick: Math.random() * 100,
                        currentFrame: 0
                    });
                    break;
                case 'S':
                    enemies.push({
                        x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE,
                        vx: 0, vy: 1, type: 'spider', tile: char,
                        initialY: tileY, maxLength: TILE_SIZE * 2,
                        spriteTick: 0, currentFrame: 0
                    });
                    break;
                case 'V':
                    const wallOnLeft = j > 0 && map[i][j - 1] === '1';
                    const direction = wallOnLeft ? 1 : -1;
                    // La vibora empieza en la misma celda que el muro, pero oculta
                    enemies.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, vx: 0, vy: 0, type: 'viper', tile: char, initialX: tileX, direction: direction, state: 'idle', idleTimer: Math.random() * 120 + 60, spriteTick: 0, currentFrame: 0, isHidden: true });
                    // Se añade un muro en la misma posición
                    walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'solid', tile: '1' });
                    break;
                case '9': 
                    miner = { 
                        x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, 
                        tile: char,
                        animationState: 'idle',
                        currentFrame: 0,
                        animationTick: 0,
                        animationDirection: 1 
                    }; 
                    break;
            }
        }
    });
    resetPlayer(playerStartX, playerStartY);
    cameraY = player.y - canvas.height / 2;
}

function updateWalls() {
    walls.forEach(wall => {
        const anim = ANIMATION_DATA[wall.tile as keyof typeof ANIMATION_DATA];
        if (anim && wall.spriteTick !== undefined && wall.currentFrame !== undefined) {
            wall.spriteTick++;
            if (wall.spriteTick >= anim.speed) {
                wall.spriteTick = 0;
                wall.currentFrame = (wall.currentFrame + 1) % anim.frames;
            }
        }
    });
}

// --- STATE CHANGE FUNCTIONS ---
function loadLevel() {
    if (currentLevelIndex >= levelDesigns.length) {
        gameState = 'win';
        messageTitle.textContent = '¡HAS GANADO!';
        messageText.textContent = `Puntuación final: ${score}. Presiona ENTER para volver al menú.`;
        messageOverlay.style.display = 'flex';
        return;
    }
    parseLevel(levelDesigns[currentLevelIndex]);
    cameraY = 0;
    levelCountEl.textContent = (currentLevelIndex + 1).toString();
}

function playerDie() {
    if (gameState === 'respawning' || gameState === 'gameover') return;

    emitParticles(player.x + player.width / 2, player.y + player.height / 2, 20, 'white');
    player.deathTimer = 60; // 1 segundo de efecto de muerte

    lives--;
    gameState = 'respawning';

    if (lives <= 0) {
        setTimeout(() => {
            gameState = 'gameover';
            messageTitle.textContent = 'GAME OVER';
            messageText.textContent = `Puntuación final: ${score}. Presiona ENTER para volver al menú.`;
            messageOverlay.style.display = 'flex';
        }, 1500);
    } else {
        setTimeout(() => {
            let startX = TILE_SIZE * 1.5, startY = TILE_SIZE * 1.5;
            const levelMap = levelDesigns[currentLevelIndex];
            for (let y = 0; y < levelMap.length; y++) {
                const x = levelMap[y].indexOf('P');
                if (x !== -1) { startX = x * TILE_SIZE; startY = y * TILE_SIZE; break; }
            }
            resetPlayer(startX, startY);
            cameraY = 0;
            gameState = 'playing';
        }, 2000);
    }
}


// --- CORE GAME LOGIC ---
function handleInput() {
    if (keys['ArrowLeft']) { player.vx = -PLAYER_SPEED; player.direction = -1; }
    else if (keys['ArrowRight']) { player.vx = PLAYER_SPEED; player.direction = 1; }
    else { player.vx = 0; }

    if (keys['ArrowUp']) {
        player.wantsToFly = true;
    } else {
        player.wantsToFly = false;
    }

    if (keys['Space'] && player.shootCooldown === 0) {
        const laserX = player.direction === 1 ? player.x + player.width / 2 : player.x;
        const laserY = player.y + player.height / 4;
        lasers.push({ x: laserX, y: laserY, width: 30, height: 5, vx: LASER_SPEED * player.direction, startX: laserX - 20 });
        player.shootCooldown = 6;
    }

    if (keys['ArrowDown'] && player.isGrounded && bombs.length === 0) {
        const bombX = player.x + (player.width / 2) - (TILE_SIZE / 1.5 / 2);
        const bombY = player.y + player.height - TILE_SIZE;


        bombs.push({ x: bombX, y: bombY, width: TILE_SIZE / 1.5, height: TILE_SIZE, fuse: BOMB_FUSE, animationTick: 0, currentFrame: 0 });
    }
}

function updatePlayer() {
    // --- 1. Flight State Machine ---
    const canStartCharging = player.wantsToFly && player.isGrounded && !player.isApplyingThrust && !player.isChargingFly;

    if (canStartCharging) {
        player.isChargingFly = true;
        player.vy = -1; // Impulso inicial para el "salto" de 1px
    }

    if (!player.wantsToFly) {
        player.isChargingFly = false;
        player.flyChargeTimer = 0;
        player.isApplyingThrust = false;
    }

    // --- 2. Physics based on state ---
    if (player.isChargingFly) {
        player.flyChargeTimer++;
        player.vy = 0; // Levitar, contrarrestando la gravedad
        if (player.flyChargeTimer >= 30) {
            player.isChargingFly = false;
            player.flyChargeTimer = 0;
            player.isApplyingThrust = true;
        }
    } else if (player.wantsToFly && !player.isGrounded && energy > 0) {
        player.isApplyingThrust = true;
    }















    if (player.isApplyingThrust && energy > 0) {
        player.vy -= THRUST_POWER;
        energy = Math.max(0, energy - 0.5);
        if (Math.random() > 0.5) {
            let offsetX = player.width / 10;
            if (player.direction === -1) {
                offsetX = player.width - offsetX;
            }
            emitParticles(player.x + offsetX, player.y + player.height / 1.3, 50, 'yellow');
        }
    } else {
        player.isApplyingThrust = false;
    }

    // Aplicar gravedad solo si no estamos cargando el vuelo
    if (!player.isChargingFly) {
        player.vy += GRAVITY;
    }

    // Limitar velocidad de ascenso
    if (player.vy < -MAX_UPWARD_SPEED) {
        player.vy = -MAX_UPWARD_SPEED;
    }

    player.x += player.vx;
    player.y += player.vy;

    // Actualizar hitbox
    player.hitbox.x = player.x + TILE_SIZE / 4;
    player.hitbox.y = player.y;

    // --- 3. CHECK & RESOLVE COLLISIONS ---
    player.isGrounded = false; // Assume we are in the air, until a collision proves otherwise.
    walls.forEach(wall => {
        if (checkCollision(player.hitbox, wall)) {
            if (wall.type === 'lava') return playerDie();

            const overlapX = (player.hitbox.x + player.hitbox.width / 2) - (wall.x + TILE_SIZE / 2);
            const overlapY = (player.hitbox.y + player.hitbox.height / 2) - (wall.y + TILE_SIZE / 2);
            const combinedHalfWidths = player.hitbox.width / 2 + TILE_SIZE / 2;
            const combinedHalfHeights = player.hitbox.height / 2 + TILE_SIZE / 2;

            if (Math.abs(overlapX) / combinedHalfWidths > Math.abs(overlapY) / combinedHalfHeights) {
                 // Horizontal collision
                if (overlapX > 0) player.x = wall.x + TILE_SIZE - (TILE_SIZE / 4);
                else player.x = wall.x - player.width + (TILE_SIZE / 4);
                player.vx = 0;
            } else {
                // Vertical collision
                if (overlapY > 0) { 
                    player.y = wall.y + TILE_SIZE; 
                    player.vy = 0; 
                } else { 
                    player.y = wall.y - player.height;
                    if (!player.isApplyingThrust) { // Solo aterriza si no está volando activamente
                        player.isGrounded = true; 
                        player.vy = 0; 
                    }
                }
            }
        }
    });

    // --- 4. CHEQUEO DE LÍMITES ---
    if (player.x < 0) player.x = 0;
    const levelWidth = levelDesigns[currentLevelIndex][0].length * TILE_SIZE;
    if (player.x + player.width > levelWidth) player.x = levelWidth - player.width;

    // --- 5. UPDATE OTHER PLAYER STATE ---
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (player.isGrounded) energy = Math.min(MAX_ENERGY, energy + 1);

    // --- 6. DETERMINE ANIMATION STATE (NOW WITH CORRECT isGrounded) ---
    let newState = player.animationState;
    if (player.isGrounded) {
        if (player.isChargingFly) {
            newState = 'jump';
        } else {
            newState = player.vx === 0 ? 'stand' : 'walk';
        }
    } else {
        if (player.isApplyingThrust || player.isChargingFly) {
            if (player.animationState === 'jump' && player.currentFrame === ANIMATION_DATA['P_jump'].frames - 1) {
                newState = 'fly';
            } else if (player.animationState !== 'fly') {
                newState = 'jump';
            }
        } else {
            newState = 'jump'; // cayendo
        }
    }

    if (player.animationState !== newState) {
        player.animationState = newState;
        player.currentFrame = 0;
        player.animationTick = 0;
    }

    // --- 7. UPDATE ANIMATION FRAME ---
    const animKey = 'P_' + player.animationState;
    const anim = ANIMATION_DATA[animKey as keyof typeof ANIMATION_DATA];
    if (anim) {
        player.animationTick++;
        if (player.animationTick >= anim.speed) {
            player.animationTick = 0;

            // Handle looping and reversing
            if (anim.reverse) {
                player.currentFrame--;
                if (player.currentFrame < 0) {
                    player.currentFrame = anim.frames - 2; // Start from second-to-last frame to avoid extra frame
                }
            } else {
                if (anim.loop !== false) {
                    player.currentFrame = (player.currentFrame + 1) % anim.frames;
                } else {
                    // Si la animación no se repite, se queda en el último fotograma
                    player.currentFrame = Math.min(player.currentFrame + 1, anim.frames - 1);
                }
            }
        }
    }
}

function updateEnemies() {
    enemies.forEach((enemy) => {
        // Update animation for all enemies that have one
        const anim = ANIMATION_DATA[enemy.tile as keyof typeof ANIMATION_DATA];
        if (anim) {
            enemy.spriteTick++;
            if (enemy.spriteTick >= anim.speed) {
                enemy.spriteTick = 0;
                enemy.currentFrame = (enemy.currentFrame + 1) % anim.frames;
            }
        }

        switch (enemy.type) {
            case 'bat':
                enemy.x += enemy.vx;
                enemy.movementTick = (enemy.movementTick || 0) + 0.05; // Use dedicated movement tick
                enemy.y = enemy.initialY! + Math.sin(enemy.movementTick) * TILE_SIZE * 0.5; // Oscillate vertically

                // Wall collision for horizontal movement
                const gridX = Math.floor(enemy.x / TILE_SIZE);
                const gridY = Math.floor(enemy.y / TILE_SIZE);
                const gridXRight = Math.floor((enemy.x + enemy.width) / TILE_SIZE);
                const wallLeft = walls.find(w => w.x === gridX * TILE_SIZE && w.y === gridY * TILE_SIZE);
                const wallRight = walls.find(w => w.x === gridXRight * TILE_SIZE && w.y === gridY * TILE_SIZE);
                if (enemy.vx < 0 && (wallLeft || enemy.x < 0)) { enemy.vx *= -1; }
                if (enemy.vx > 0 && (wallRight || (enemy.x + enemy.width) > canvas.width)) { enemy.vx *= -1; }
                break;
            case 'spider':
                enemy.y += enemy.vy;
                if (enemy.vy > 0 && enemy.y >= enemy.initialY! + enemy.maxLength!) {
                    enemy.y = enemy.initialY! + enemy.maxLength!; // Clamp position
                    enemy.vy *= -1;
                }
                if (enemy.vy < 0 && enemy.y <= enemy.initialY!) {
                    enemy.y = enemy.initialY!; // Clamp position
                    enemy.vy *= -1;
                }


                break;
            case 'viper':
                const speed = 2;
                if (enemy.state === 'idle') {
                    enemy.idleTimer!--;
                    if (enemy.idleTimer! <= 0) {
                        enemy.state = 'extending';
                        enemy.isHidden = false; // La vibora se muestra
                    }
                } else if (enemy.state === 'extending') {
                    enemy.x += enemy.direction! * speed;
                    if (Math.abs(enemy.x - enemy.initialX!) >= TILE_SIZE) {
                        enemy.x = enemy.initialX! + (enemy.direction! * TILE_SIZE); // Clamp position
                        enemy.state = 'waiting_extended';
                        enemy.waitTimer = 60;
                    }
                } else if (enemy.state === 'waiting_extended') {
                    enemy.waitTimer!--;
                    if (enemy.waitTimer! <= 0) {
                        enemy.state = 'retracting';
                    }
                } else if (enemy.state === 'retracting') {
                    enemy.x -= enemy.direction! * speed;
                    if ((enemy.direction === 1 && enemy.x <= enemy.initialX!) || (enemy.direction === -1 && enemy.x >= enemy.initialX!)) {
                        enemy.x = enemy.initialX!; // Clamp
                        enemy.state = 'idle';
                        enemy.idleTimer = 60 + Math.random() * 60;
                        enemy.isHidden = true; // La vibora se oculta
                    }
                }
                break;
        }
    });
}

function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.x += laser.vx;
        const levelWidth = levelDesigns[currentLevelIndex][0].length * TILE_SIZE;
        const distance = Math.abs(laser.x - laser.startX);

        if (laser.x < 0 || laser.x > levelWidth || distance > 4 * TILE_SIZE) {
            lasers.splice(i, 1);
        }
    }
}

function updateBombs() {
    for (let i = bombs.length - 1; i >= 0; i--) {
        const bomb = bombs[i];
        bomb.fuse--;

        // Update bomb animation
        const anim = ANIMATION_DATA['bomb'];
        bomb.animationTick = (bomb.animationTick + 1) % anim.speed;
        if (bomb.animationTick === 0) {
            bomb.currentFrame = (bomb.currentFrame + 1) % anim.frames;
        }

        if (bomb.fuse <= 0) {
            bombs.splice(i, 1);
            // bomb.element.remove(); <--- REMOVED

            const explosionX = bomb.x - TILE_SIZE; // Center 180px explosion on 60px bomb
            const explosionY = bomb.y - TILE_SIZE;
            explosions.push({ x: explosionX, y: explosionY, width: TILE_SIZE * 3, height: TILE_SIZE * 3, timer: 20, animationTick: 0, currentFrame: 0 });

            const explosionRadius = 70;
            const explosionCenterX = explosionX + (TILE_SIZE * 3) / 2;
            const explosionCenterY = explosionY + (TILE_SIZE * 3) / 2;

            const allWallsToRemove = new Set<Wall>();
            const enemiesToRemove = new Set<Enemy>();

            walls.forEach(wall => {
                const wallCenterX = wall.x + TILE_SIZE / 2;
                const wallCenterY = wall.y + TILE_SIZE / 2;
                const dist = Math.hypot(explosionCenterX - wallCenterX, explosionCenterY - wallCenterY);

                if (dist < explosionRadius) {
                    if (wall.type === 'destructible') {
                        allWallsToRemove.add(wall);
                    } else if (wall.type === 'destructible_v') {
                        if (!allWallsToRemove.has(wall)) {
                            const queue: Wall[] = [wall];
                            allWallsToRemove.add(wall);
                            while (queue.length > 0) {
                                const current = queue.shift()!;
                                const above = walls.find(w => w.type === 'destructible_v' && w.x === current.x && w.y === current.y - TILE_SIZE);
                                if (above && !allWallsToRemove.has(above)) {
                                    allWallsToRemove.add(above);
                                    queue.push(above);
                                }
                                const below = walls.find(w => w.type === 'destructible_v' && w.x === current.x && w.y === current.y + TILE_SIZE);
                                if (below && !allWallsToRemove.has(below)) {
                                    allWallsToRemove.add(below);
                                    queue.push(below);
                                }
                            }
                        }
                    }
                }
            });

            enemies.forEach(enemy => {
                const enemyCenterX = enemy.x + enemy.width / 2;
                const enemyCenterY = enemy.y + enemy.height / 2;
                const dist = Math.hypot(explosionCenterX - enemyCenterX, explosionCenterY - enemyCenterY);

                if (dist < explosionRadius) {
                    enemiesToRemove.add(enemy);
                }
            });

            if (allWallsToRemove.size > 0) {
                allWallsToRemove.forEach(wall => {
                    const quarterWidth = TILE_SIZE / 2;
                    const quarterHeight = TILE_SIZE / 2;
                    for (let i = 0; i < 4; i++) {
                        fallingEntities.push({
                            x: wall.x + (i % 2) * quarterWidth,
                            y: wall.y + Math.floor(i / 2) * quarterHeight,
                            width: quarterWidth,
                            height: quarterHeight,
                            vy: (Math.random() * -4) - 1,
                            vx: (Math.random() - 0.5) * 6,
                            tile: wall.tile
                        });
                    }
                });
                walls = walls.filter(wall => !allWallsToRemove.has(wall));
            }

            if (enemiesToRemove.size > 0) {
                enemiesToRemove.forEach(enemy => {
                    fallingEntities.push({
                        x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height,
                        vy: -5, // Mario-style pop-up
                        vx: 0,
                        tile: enemy.tile,
                        rotation: 0,
                        rotationSpeed: 0.1
                    });
                    floatingScores.push({ x: enemy.x, y: enemy.y, text: '+100', life: 60, opacity: 1 });
                });
                enemies = enemies.filter(enemy => !enemiesToRemove.has(enemy));
                score += enemiesToRemove.size * 100;
            }
        }
    }
}

function updateParticles() {
    // This is for explosions animation now
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.timer--;
        if (exp.timer <= 0) {
            explosions.splice(i, 1);
            continue;
        }
        const anim = ANIMATION_DATA['explosion'];
        exp.animationTick = (exp.animationTick + 1) % anim.speed;
        if (exp.animationTick === 0) {
            exp.currentFrame = Math.min(exp.currentFrame + 1, anim.frames - 1);
        }
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
            continue;
        }
        p.vy += 0.05; // ligera gravedad
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 60; // Desvanecer
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
    }
}

function updateFallingEntities() {
    for (let i = fallingEntities.length - 1; i >= 0; i--) {
        const entity = fallingEntities[i];
        entity.vy += GRAVITY;
        entity.y += entity.vy;
        entity.x += entity.vx;
        if (entity.rotationSpeed) {
            entity.rotation = (entity.rotation || 0) + entity.rotationSpeed;
        }

        // Remove if off-screen (below the current view)
        if (entity.y > cameraY + canvas.height) {
            fallingEntities.splice(i, 1);
        }
    }
}

function checkCollisions() {
    // Player-wall collision is now handled inside updatePlayer()

    enemies.forEach(enemy => {
        if (enemy.type === 'viper' && !enemy.isHidden && enemy.initialX !== undefined) {
            let headHitbox;
            if (enemy.direction === 1) { // Moviéndose a la derecha
                headHitbox = {
                    x: enemy.initialX + TILE_SIZE,
                    y: enemy.y,
                    width: enemy.x - enemy.initialX,
                    height: TILE_SIZE
                };
            } else { // Moviéndose a la izquierda
                headHitbox = {
                    x: enemy.x,
                    y: enemy.y,
                    width: enemy.initialX - enemy.x,
                    height: TILE_SIZE
                };
            }
            // Ajustar la hitbox a 30px de alto y centrarla verticalmente
            headHitbox.height = 30;
            headHitbox.y = enemy.y + (TILE_SIZE - 30) / 2;

            if (headHitbox.width > 0 && checkCollision(player.hitbox, headHitbox)) {
                playerDie();
            }
        } else if (!enemy.isHidden && checkCollision(player.hitbox, enemy)) {
            playerDie();
        }
    });

    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        let laserRemoved = false;

        for (let j = walls.length - 1; j >= 0; j--) {
            const wall = walls[j];
            if (checkCollision(laser, wall)) {
                if (wall.type.startsWith('destructible') && wall.health !== undefined) {
                    wall.health--;
                    if (wall.health <= 30) {
                        wall.isDamaged = true;
                    }
                    if (wall.health <= 0) {
                        if (wall.type === 'destructible_v') {
                            const toDestroy = new Set<Wall>();
                            const queue: Wall[] = [wall];
                            toDestroy.add(wall);

                            while (queue.length > 0) {
                                const currentWall = queue.shift()!;
                                const wallAbove = walls.find(w => w.x === currentWall.x && w.y === currentWall.y - TILE_SIZE && w.type === 'destructible_v');
                                if (wallAbove && !toDestroy.has(wallAbove)) {
                                    toDestroy.add(wallAbove);
                                    queue.push(wallAbove);
                                }
                                const wallBelow = walls.find(w => w.x === currentWall.x && w.y === currentWall.y + TILE_SIZE && w.type === 'destructible_v');
                                if (wallBelow && !toDestroy.has(wallBelow)) {
                                    toDestroy.add(wallBelow);
                                    queue.push(wallBelow);
                                }
                            }
                            toDestroy.forEach(wall => {
                                const quarterWidth = TILE_SIZE / 2;
                                const quarterHeight = TILE_SIZE / 2;
                                for (let i = 0; i < 4; i++) {
                                    fallingEntities.push({
                                        x: wall.x + (i % 2) * quarterWidth,
                                        y: wall.y + Math.floor(i / 2) * quarterHeight,
                                        width: quarterWidth,
                                        height: quarterHeight,
                                        vy: (Math.random() * -4) - 1,
                                        vx: (Math.random() - 0.5) * 6,
                                        tile: wall.tile
                                    });
                                }
                            });
                            walls = walls.filter(w => !toDestroy.has(w));
                        } else {
                            const wall = walls[j]; // get the wall before removing
                            const quarterWidth = TILE_SIZE / 2;
                            const quarterHeight = TILE_SIZE / 2;
                            for (let i = 0; i < 4; i++) {
                                fallingEntities.push({
                                    x: wall.x + (i % 2) * quarterWidth,
                                    y: wall.y + Math.floor(i / 2) * quarterHeight,
                                    width: quarterWidth,
                                    height: quarterHeight,
                                    vy: (Math.random() * -4) - 1,
                                    vx: (Math.random() - 0.5) * 6,
                                    tile: wall.tile
                                });
                            }
                            walls.splice(j, 1);
                        }
                    }
                }
                lasers.splice(i, 1);
                laserRemoved = true;
                break;
            }
        }

        if (laserRemoved) continue;

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (!enemy.isHidden && checkCollision(laser, enemy)) {
                lasers.splice(i, 1);
                const enemy = enemies[j];
                fallingEntities.push({
                    x: enemy.x, y: enemy.y, width: enemy.width, height: enemy.height,
                    vy: -5, vx: 0, tile: enemy.tile, rotation: 0, rotationSpeed: 0.1
                });
                floatingScores.push({ x: enemy.x, y: enemy.y, text: '+100', life: 60, opacity: 1 });
                enemies.splice(j, 1);
                score += 100;
                break;
            }
        }
    }

    explosions.forEach(exp => {
        const explosionHitbox = { x: exp.x, y: exp.y, width: exp.width, height: exp.height };
        if (checkCollision(player.hitbox, explosionHitbox)) {
            playerDie();
        }
    });
}

function updateCamera() {
    const cameraDeadzone = canvas.height / 3;
    if (player.y < cameraY + cameraDeadzone) cameraY = player.y - cameraDeadzone;
    if (player.y + player.height > cameraY + canvas.height - cameraDeadzone) cameraY = player.y + player.height - canvas.height + cameraDeadzone;
    const levelHeight = levelDesigns[currentLevelIndex].length * TILE_SIZE;
    cameraY = Math.max(0, Math.min(levelHeight - canvas.height, cameraY));
}

function updateGame() {
    if (gameState !== 'playing') return;
    handleInput();
    updatePlayer();
    updateWalls();
    updateEnemies();
    updateMiner();
    updateLasers();
    updateBombs();
    updateParticles(); // Now updates explosions
    updateFallingEntities();
    checkCollisions();
    updateCamera();
    if (miner && miner.animationState !== 'rescued' && checkCollision(player.hitbox, miner)) {
        score += 1000;
        floatingScores.push({ x: miner.x, y: miner.y, text: '+1000', life: 90, opacity: 1 });
        miner.animationState = 'rescued';
        miner.currentFrame = 2; // Empezar desde el frame 3 (indice 2)
        miner.animationTick = 0;
    }
}

function updateMiner() {
    if (!miner) return;

    const rescuedAnimData = ANIMATION_DATA['9_rescued'];
    if (miner.animationState === 'rescued' && miner.currentFrame === rescuedAnimData.frames - 1) {
        return; // Detener la animación en el último fotograma
    }

    miner.animationTick++;

    if (miner.animationState === 'idle') {
        const anim = ANIMATION_DATA['9_idle'];
        if (miner.animationTick >= anim.speed) {
            miner.animationTick = 0;
            miner.currentFrame += miner.animationDirection;

            if (miner.currentFrame >= anim.frames - 1 || miner.currentFrame <= 0) {
                miner.animationDirection *= -1; // Invertir dirección para el ping-pong
            }
        }
    } else if (miner.animationState === 'rescued') {
        const anim = ANIMATION_DATA['9_rescued'];
        if (miner.animationTick >= anim.speed) {
            miner.animationTick = 0;
            if (miner.currentFrame < anim.frames - 1) {
                miner.currentFrame++;
            }
            
            if (miner.currentFrame >= anim.frames - 1) {
                // La animación ha terminado, cargar el siguiente nivel tras un breve retraso
                setTimeout(() => {
                    currentLevelIndex++;
                    loadLevel();
                }, 500);
            }
        }
    }
}

function gameLoop() {
    if (appState === 'menu') { /* Handled by events */ }
    else if (appState === 'playing') { updateGame(); drawGame(); }
    else if (appState === 'editing') { editorLoop(); }
    requestAnimationFrame(gameLoop);
}

function drawWall(wall: Wall) {
    if (wall.isDamaged) {
        ctx.globalAlpha = 0.5;
    }

    const sprite = sprites[wall.tile];
    if (sprite) {
        const anim = ANIMATION_DATA[wall.tile as keyof typeof ANIMATION_DATA];
        if (anim && wall.currentFrame !== undefined) {
            const frameWidth = sprite.width / anim.frames;
            ctx.drawImage(sprite, wall.currentFrame * frameWidth, 0, frameWidth, sprite.height, wall.x, wall.y, wall.width, wall.height);
        } else {
            ctx.drawImage(sprite, wall.x, wall.y, wall.width, wall.height);
        }
    } else { // Fallback for unloaded sprites
        ctx.fillStyle = TILE_TYPES[wall.tile]?.color || '#fff';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    }

    if (wall.isDamaged) {
        ctx.globalAlpha = 1.0;
    }
}

function drawEnemy(enemy: Enemy) {
    if (enemy.isHidden) {
        return;
    }

    const sprite = sprites[enemy.tile];
    if (!sprite) return;

    ctx.save();

    let flip = enemy.vx < 0;
    if (enemy.type === 'viper') flip = enemy.direction === -1;

    if (flip) {
        ctx.translate(enemy.x + enemy.width, enemy.y);
        ctx.scale(-1, 1);
    } else {
        ctx.translate(enemy.x, enemy.y);
    }

    if (enemy.type === 'spider') {
        // Draw web thread
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.width / 2, 0);
        ctx.lineTo(enemy.width / 2, enemy.initialY! - enemy.y);
        ctx.stroke();
    }

    const anim = ANIMATION_DATA[enemy.tile as keyof typeof ANIMATION_DATA];
    if (anim) {
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, enemy.currentFrame * frameWidth, 0, frameWidth, sprite.height, 0, 0, enemy.width, enemy.height);
    }
    else {
        ctx.drawImage(sprite, 0, 0, enemy.width, enemy.height);
    }

    ctx.restore();
}

function emitParticles(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * (color === 'white' ? 8 : 2),
            vy: (Math.random() - 0.5) * (color === 'white' ? 8 : 2) + (color === 'yellow' ? 4 : 0),
            size: Math.random() * 3 + 2,
            life: Math.random() * 30,
            color
        });
    }
}

function updateAndDrawFloatingScores() {
    ctx.font = "24px 'Press Start 2P'";
    ctx.fillStyle = 'white';
    for (let i = floatingScores.length - 1; i >= 0; i--) {
        const fs = floatingScores[i];
        fs.life--;
        if (fs.life <= 0) {
            floatingScores.splice(i, 1);
            continue;
        }
        fs.y -= 0.5;
        fs.opacity = fs.life / 60;

        ctx.globalAlpha = fs.opacity;
        ctx.fillText(fs.text, fs.x, fs.y);
        ctx.globalAlpha = 1.0;
    }
}

// --- RENDER FUNCTION (replaces renderGame) ---
function drawGame() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, -cameraY);

    // Draw walls
    walls.forEach(drawWall);

    // Draw miner
    if (miner) {
        const sprite = sprites[miner.tile];
        if(sprite) {
            const animKey = `9_${miner.animationState}`;
            const animData = ANIMATION_DATA[animKey as keyof typeof ANIMATION_DATA];
            const frameWidth = sprite.width / 6; // El spritesheet completo tiene 6 frames

            ctx.drawImage(
                sprite,
                miner.currentFrame * frameWidth,
                0,
                frameWidth,
                sprite.height,
                miner.x,
                miner.y,
                miner.width,
                miner.height
            );
        }
    }
    
    // Separar enemigos para controlar el orden de dibujado
    const vipers = enemies.filter(e => e.type === 'viper');
    const otherEnemies = enemies.filter(e => e.type !== 'viper');

    // Dibujar otros enemigos
    otherEnemies.forEach(drawEnemy);

    // Dibujar viboras y sus muros encima para el efecto de profundidad
    vipers.forEach(enemy => {
        drawEnemy(enemy);
        const wall = walls.find(w => w.x === enemy.initialX && w.y === enemy.initialY);
        if (wall) {
            drawWall(wall);
        }
    });

    // Draw Falling Entities
    fallingEntities.forEach(entity => {
        const sprite = sprites[entity.tile];
        if (sprite) {
            ctx.save();
            ctx.translate(entity.x + entity.width / 2, entity.y + entity.height / 2);
            if (entity.rotation) {
                ctx.rotate(entity.rotation);
            }
            // Flip sprite if vx is negative, like Mario
            if (entity.vx < 0) {
                ctx.scale(-1, 1);
            }

            const anim = ANIMATION_DATA[entity.tile as keyof typeof ANIMATION_DATA];
            if (anim && anim.frames > 1) {
                const frameWidth = sprite.width / anim.frames;
                ctx.drawImage(sprite, 0, 0, frameWidth, sprite.height, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
            } else {
                ctx.drawImage(sprite, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
            }
            ctx.restore();
        }
    });

    // Update and Draw Particles
    updateAndDrawParticles();

    // Update and Draw Floating Scores
    updateAndDrawFloatingScores();

    // Draw Player
    if (player.deathTimer > 0) {
        player.deathTimer--;
    }

    if (gameState !== 'respawning' || player.deathTimer > 0) {
        const animKey = 'P_' + player.animationState;
        const animData = ANIMATION_DATA[animKey as keyof typeof ANIMATION_DATA];
        const playerSprite = sprites[animKey];
        if (playerSprite) {
            const frameWidth = playerSprite.width / animData.frames;
            ctx.save();
            ctx.translate(player.x + player.width / 2, player.y);
            ctx.scale(player.direction, 1);

            ctx.drawImage(playerSprite, player.currentFrame * frameWidth, 0, frameWidth, playerSprite.height, -player.width / 2, 0, player.width, player.height);

            if (player.deathTimer > 0) {
                ctx.globalAlpha = player.deathTimer / 60;
                ctx.fillStyle = 'white';
                ctx.fillRect(-player.width / 2, 0, player.width, player.height);
            }

            ctx.restore();
        }
    }

    // Draw bombs
    bombs.forEach(bomb => {
        const sprite = sprites['bomb'];
        const anim = ANIMATION_DATA['bomb'];
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, bomb.currentFrame * frameWidth, 0, frameWidth, sprite.height, bomb.x, bomb.y, bomb.width, bomb.height);
    });

    // Draw explosions
    explosions.forEach(exp => {
        const sprite = sprites['explosion'];
        const anim = ANIMATION_DATA['explosion'];
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, exp.currentFrame * frameWidth, 0, frameWidth, sprite.height, exp.x, exp.y, exp.width, exp.height);
    });

    // Draw Falling Entities
    fallingEntities.forEach(entity => {
        const sprite = sprites[entity.tile];
        if (sprite) {
            ctx.save();
            ctx.translate(entity.x + entity.width / 2, entity.y + entity.height / 2);
            if (entity.rotation) {
                ctx.rotate(entity.rotation);
            }
            // Flip sprite if vx is negative, like Mario
            if (entity.vx < 0) {
                ctx.scale(-1, 1);
            }

            const anim = ANIMATION_DATA[entity.tile as keyof typeof ANIMATION_DATA];
            if (anim && anim.frames > 1) {
                const frameWidth = sprite.width / anim.frames;
                ctx.drawImage(sprite, 0, 0, frameWidth, sprite.height, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
            } else {
                ctx.drawImage(sprite, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
            }
            ctx.restore();
        }
    });

    // Draw Lasers
    ctx.fillStyle = 'yellow';
    lasers.forEach(laser => {
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    });

    ctx.restore();

    // Update UI (this still uses DOM)
    livesCountEl.textContent = lives.toString();
    levelCountEl.textContent = (currentLevelIndex + 1).toString();
    scoreCountEl.textContent = score.toString();
    energyBarEl.style.width = `${(energy / MAX_ENERGY) * 100}%`;
}

// --- UI & MENU & EDITOR LOGIC ---
function setupUI() {
    document.getElementById('level-editor-btn')!.addEventListener('click', () => startEditor());
    document.getElementById('start-game-btn')!.addEventListener('click', () => startGame());
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Enter' && appState === 'menu') startGame();
        else if (e.code === 'Enter' && (gameState === 'gameover' || gameState === 'win')) showMenu();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });

    // Mobile controls
    if ('ontouchstart' in window) {
        setupMobileControls();
    }
}

function setupMobileControls() {
    const actionZone = document.getElementById('action-zone')!;
    actionZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Space'] = true;
    });
    actionZone.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Space'] = false;
    });
}

function showMenu() {
    appState = 'menu';
    gameState = 'start';
    document.body.className = 'state-menu';
    messageOverlay.style.display = 'flex';
    gameUiEl.style.display = 'none';
    editorPanelEl.style.display = 'none';
    if ('ontouchstart' in window) {
        document.getElementById('mobile-controls')!.dataset.active = 'false';
        if (joystickManager) {
            joystickManager.destroy();
            joystickManager = null;
        }
    }
    messageTitle.textContent = "H.E.R.O. CLONE";
    messageText.innerHTML = "Presiona ENTER o el botón para empezar";
}

function startGame(levelMap: string[] | null = null) {
    appState = 'playing';
    gameState = 'playing';
    document.body.className = 'state-playing';
    messageOverlay.style.display = 'none';
    gameUiEl.style.display = 'flex';
    editorPanelEl.style.display = 'none';
    if ('ontouchstart' in window) {
        document.getElementById('mobile-controls')!.dataset.active = 'true';
        if (!joystickManager) {
            const joystickZone = document.getElementById('joystick-zone')!;
            joystickManager = nipplejs.create({
                zone: joystickZone,
                mode: 'dynamic',
                position: { left: '50%', top: '50%' },
                color: 'white',
                catchforce: true
            });

            joystickManager.on('move', (evt, data) => {
                const angle = data.angle.radian;
                const force = data.force;

                if (force > 0.2) {
                    const up = Math.sin(angle);
                    const right = Math.cos(angle);

                    if (up > 0.5) {
                        keys['ArrowUp'] = true;
                    } else {
                        keys['ArrowUp'] = false;
                    }

                    // Lógica para plantar la bomba
                    if (up < -0.5) {
                        keys['ArrowDown'] = true;
                    } else {
                        keys['ArrowDown'] = false;
                    }

                    if (Math.abs(right) > 0.3) {
                        if (right > 0) {
                            keys['ArrowRight'] = true;
                            keys['ArrowLeft'] = false;
                        } else {
                            keys['ArrowLeft'] = true;
                            keys['ArrowRight'] = false;
                        }
                    } else {
                        keys['ArrowLeft'] = false;
                        keys['ArrowRight'] = false;
                    }

                }
            });

            joystickManager.on('end', () => {
                keys['ArrowUp'] = false;
                keys['ArrowLeft'] = false;
                keys['ArrowRight'] = false;
                keys['ArrowDown'] = false;
            });
        }
    }
    lives = 3; score = 0;
    currentLevelIndex = 0;
    if (levelMap) levelDesigns = [levelMap];
    else levelDesigns = JSON.parse(JSON.stringify(initialLevels));
    loadLevel();
}

function startEditor() {
    appState = 'editing';
    document.body.className = 'state-editing';
    messageOverlay.style.display = 'none';
    gameUiEl.style.display = 'none';
    editorPanelEl.style.display = 'flex';
    loadLevelFromStore();
    cameraY = 0;
    exportLevelData();
}

function editorLoop() {
    drawEditor();
}

function drawEditor() {
    ctx.fillStyle = '#1a1a1a'; // Dark background for editor
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, -cameraY);

    // Draw level tiles
    if (editorLevel) {
        editorLevel.forEach((row, i) => {
            row.forEach((char, j) => {
                const sprite = sprites[char];
                if (sprite) {
                    ctx.drawImage(sprite, j * TILE_SIZE, i * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                } else if (char === 'P') { // Draw player start position
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.fillRect(j * TILE_SIZE, i * TILE_SIZE, TILE_SIZE, TILE_SIZE * 2);
                }
            });
        });
    }

    // Draw grid
    const gridColor = '#444';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const levelWidth = editorLevel && editorLevel.length > 0 ? editorLevel[0].length * TILE_SIZE : canvas.width;
    const levelHeight = editorLevel ? editorLevel.length * TILE_SIZE : canvas.height;
    for (let x = 0; x <= levelWidth; x += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, levelHeight);
        ctx.stroke();
    }
    for (let y = 0; y <= levelHeight; y += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(levelWidth, y);
        ctx.stroke();
    }

    // Draw selected tile preview at mouse position
    const selectedSprite = sprites[selectedTile];
    if (selectedSprite) {
        ctx.globalAlpha = 0.5;
        const previewX = mouse.gridX * TILE_SIZE;
        const previewY = mouse.gridY * TILE_SIZE;
        if (selectedTile === 'P') {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(previewX, previewY, TILE_SIZE, TILE_SIZE * 2);
        } else {
            ctx.drawImage(selectedSprite, previewX, previewY, TILE_SIZE, TILE_SIZE);
        }
        ctx.globalAlpha = 1.0;
    }

    ctx.restore();
}

function setupEditor() {
    Object.entries(TILE_TYPES).forEach(([key, { name, color }]: [string, { name: string, color: string }]) => {
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile-selector flex-col text-xs text-center';
        tileDiv.dataset.tile = key;
        tileDiv.textContent = name;
        if (key === selectedTile) tileDiv.classList.add('selected');
        tileDiv.addEventListener('click', () => {
            document.querySelector('.tile-selector.selected')?.classList.remove('selected');
            tileDiv.classList.add('selected');
            selectedTile = key;
        });
        paletteEl.appendChild(tileDiv);
    });

    for (let i = 0; i < TOTAL_LEVELS; i++) {
        const levelAsCharArrays = (initialLevels[i] || initialLevels[0]).map(row => row.split(''));
        levelDataStore[i] = JSON.parse(JSON.stringify(levelAsCharArrays));
        const option = document.createElement('option');
        option.value = i.toString();
        option.textContent = `Nivel ${i + 1}`;
        levelSelectorEl.appendChild(option);
    }

    canvas.addEventListener('mousemove', e => {
        if (appState !== 'editing') return;
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        const worldMouseY = mouse.y + cameraY;
        mouse.gridX = Math.floor(mouse.x / TILE_SIZE);
        mouse.gridY = Math.floor(worldMouseY / TILE_SIZE);

        if (mouse.isDown && editorLevel && editorLevel[mouse.gridY] && editorLevel[mouse.gridY][mouse.gridX] !== undefined) {
            // Prevent placing 'P' if one already exists
            if (selectedTile === 'P') {
                let pExists = false;
                editorLevel.forEach(row => { if (row.includes('P')) pExists = true; });
                if (!pExists) editorLevel[mouse.gridY][mouse.gridX] = selectedTile;
            } else {
                editorLevel[mouse.gridY][mouse.gridX] = selectedTile;
            }
        }
    });
    canvas.addEventListener('mousedown', (e) => {
        if (appState !== 'editing' || e.button !== 0) return;
        mouse.isDown = true;
        if (editorLevel && editorLevel[mouse.gridY] && editorLevel[mouse.gridY][mouse.gridX] !== undefined) {
            if (selectedTile === 'P') {
                // Remove existing 'P' before placing a new one
                editorLevel.forEach((row, i) => {
                    const pIndex = row.indexOf('P');
                    if (pIndex !== -1) editorLevel[i][pIndex] = '0';
                });
            }
            editorLevel[mouse.gridY][mouse.gridX] = selectedTile;
        }
    });
    canvas.addEventListener('mouseup', () => { mouse.isDown = false; });
    canvas.addEventListener('wheel', e => {
        if (appState !== 'editing') return;
        e.preventDefault();
        cameraY += e.deltaY;
        if (editorLevel && editorLevel.length > 0) {
            const levelHeight = editorLevel.length * TILE_SIZE;
            if (cameraY + canvas.height > levelHeight - TILE_SIZE) {
                if (editorLevel[0].length > 0) {
                    const width = editorLevel[0].length;
                    const newRow = Array(width).fill('0');
                    editorLevel.push(newRow);
                }
            }
            const newLevelHeight = editorLevel.length * TILE_SIZE;
            const maxCameraY = Math.max(0, newLevelHeight - canvas.height);
            cameraY = Math.max(0, Math.min(cameraY, maxCameraY));
        }
    }, { passive: false });

    document.getElementById('load-level-btn')!.addEventListener('click', loadLevelFromStore);
    document.getElementById('save-level-btn')!.addEventListener('click', saveLevelToStore);
    document.getElementById('export-level-btn')!.addEventListener('click', exportLevelData);
    document.getElementById('import-level-btn')!.addEventListener('click', () => {
        const data = JSON.parse(levelDataTextarea.value);
        editorLevel = data.map((row: string) => row.split(''));
    });
    document.getElementById('play-test-btn')!.addEventListener('click', () => {
        const currentLevelData = editorLevel.map(row => row.join(''));
        startGame(currentLevelData);
    });
    document.getElementById('back-to-menu-btn')!.addEventListener('click', () => showMenu());
    document.getElementById('save-all-btn')!.addEventListener('click', () => {
        confirmationModalEl.style.display = 'flex';
    });
    document.getElementById('confirm-save-btn')!.addEventListener('click', () => {
        saveAllLevelsToFile();
        confirmationModalEl.style.display = 'none';
    });
    document.getElementById('cancel-save-btn')!.addEventListener('click', () => {
        confirmationModalEl.style.display = 'none';
    });
}

function loadLevelFromStore() {
    const index = parseInt(levelSelectorEl.value);
    editorLevel = JSON.parse(JSON.stringify(levelDataStore[index]));
}

function saveLevelToStore() {
    const index = parseInt(levelSelectorEl.value);
    levelDataStore[index] = JSON.parse(JSON.stringify(editorLevel));
    alert(`Nivel ${index + 1} guardado en la sesión.`);
}

function exportLevelData() {
    levelDataTextarea.value = JSON.stringify(editorLevel.map(row => row.join('')), null, 4);
}

async function saveAllLevelsToFile() {
    try {
        const response = await fetch('/api/save-levels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(levelDataStore.map(level => level.map(row => row.join(''))))
        });
        if (response.ok) {
            alert('¡Todos los niveles se han guardado en levels.json!');
        } else {
            alert('Error al guardar los niveles.');
        }
    } catch (error) {
        console.error('Error saving levels:', error);
        alert('Error de conexión al guardar los niveles.');
    }
}

// --- PRELOAD & INITIALIZATION ---
function preloadAssets(callback: () => void) {
    const sources = {
        'P_walk': playerWalkSrc, 'P_stand': playerStandSrc, 'P_jump': playerJumpSrc, 'P_fly': playerFlySrc,
        '8': batSrc, 'S': spiderSrc, 'V': viperSrc, '9': minerSrc,
        'bomb': bombSrc, 'explosion': explosionSrc,
        '1': wallSrc, '2': dirtSrc, 'C': columnSrc, '3': lavaSrc,
    };
    let loaded = 0;
    const total = Object.keys(sources).length;
    for (const [key, src] of Object.entries(sources)) {
        sprites[key] = new Image();
        sprites[key].src = src;
        sprites[key].onload = () => {
            loaded++;
            if (loaded === total) {
                callback();
            }
        };
        sprites[key].onerror = () => {
            console.error(`Failed to load sprite: ${key} at ${src}`);
            loaded++;
            if (loaded === total) {
                callback();
            }
        }
    }
}

window.onload = () => {
    setupUI();
    setupEditor();
    showMenu();
    preloadAssets(() => {
        gameLoop();
    });
};
