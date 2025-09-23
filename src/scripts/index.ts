// --- IMPORTS ---
import '../styles/main.scss';
import initialLevels from '../assets/levels.json';

// Import all sprite assets
import playerWalkSrc from '../assets/sprites/hero_small.png';
import playerStandSrc from '../assets/sprites/hero_stand.png';
import playerJumpSrc from '../assets/sprites/hero_jump.png';
import batSrc from '../assets/sprites/bat_small.png';
import spiderSrc from '../assets/sprites/spider_small.png'; // 15 frames
import viperSrc from '../assets/sprites/serpiente_small.png';
import minerSrc from '../assets/sprites/miner_small.png';
import bombSrc from '../assets/sprites/bomba.png';
import explosionSrc from '../assets/sprites/boooom.png';
import wallSrc from '../assets/sprites/wall_small.png';
import dirtSrc from '../assets/sprites/tierra_small.png';
import columnSrc from '../assets/sprites/wall_small.png';// Using wall sprite as placeholder for column
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
const GRAVITY = 0.4;
const PLAYER_SPEED = 3;
const LASER_SPEED = 8;
const MAX_ENERGY = 100;
const BOMB_FUSE = 80;
const TOTAL_LEVELS = 10;

// --- SPRITE & ANIMATION DATA ---
const sprites: { [key: string]: HTMLImageElement } = {};

interface AnimationData {
    frames: number;
    speed: number;
    sprite: string;
    loop?: boolean;
}

const ANIMATION_DATA: { [key: string]: AnimationData } = {
    'P_walk': { frames: 6, speed: 5, sprite: playerWalkSrc },
    'P_stand': { frames: 4, speed: 10, sprite: playerStandSrc },
    'P_jump': { frames: 4, speed: 5, sprite: playerJumpSrc, loop: false },
    '8': { frames: 6, speed: 5, sprite: batSrc },      // Bat
    'S': { frames: 15, speed: 4, sprite: spiderSrc },   // Spider
    'bomb': { frames: 4, speed: 10, sprite: bombSrc },
    'explosion': { frames: 5, speed: 5, sprite: explosionSrc, loop: false }
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
    extendLength?: number;
    maxLength?: number;
    state?: 'extending' | 'retracting' | 'idle' | 'waiting_extended';
    idleTimer?: number;
    waitTimer?: number;
    animationTick: number;
    currentFrame: number;
}
interface Wall {
    x: number; y: number; width: number; height: number; type: string; tile: string; // element: HTMLElement; <--- REMOVED
}
interface Laser { x: number; y: number; width: number; height: number; vx: number; } // element: HTMLElement; <--- REMOVED
interface Bomb { x: number; y: number; width: number; height: number; fuse: number; animationTick: number; currentFrame: number; } // element: HTMLElement; <--- REMOVED
interface Explosion { x: number; y: number; width: number; height: number; timer: number; animationTick: number; currentFrame: number; }
interface Miner { x: number; y: number; width: number; height: number; tile: string; } // element: HTMLElement; <--- REMOVED
interface GameObject { x: number; y: number; width: number; height: number; }

// --- GAME STATE ---
let lives = 0, score = 0, energy = 0, currentLevelIndex = 0, cameraY = 0;
let walls: Wall[] = [], enemies: Enemy[] = [], lasers: Laser[] = [], bombs: Bomb[] = [], explosions: Explosion[] = [], miner: Miner | null = null;
let levelDesigns = JSON.parse(JSON.stringify(initialLevels));
let levelDataStore: string[][][] = [];

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
        vx: 0, vy: 0, isFlying: false, isGrounded: false, direction: 1, shootCooldown: 0,
        isIdle: false,
        animationState: 'stand', // 'stand', 'walk', 'jump'
        animationTick: 0,
        currentFrame: 0
        // element: createGameObject('player', startX, startY) <--- REMOVED
    });
    energy = MAX_ENERGY;
}

function parseLevel(map: string[]) {
    // gameWorldEl.innerHTML = ''; <--- REMOVED
    walls = []; enemies = []; miner = null; lasers = []; bombs = []; explosions = [];
    let playerStartX = TILE_SIZE * 1.5, playerStartY = TILE_SIZE * 1.5;

    map.forEach((row, i) => {
        for (let j = 0; j < row.length; j++) {
            const char = row[j];
            const tileX = j * TILE_SIZE, tileY = i * TILE_SIZE;
            
            switch (char) {
                case '1': walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'solid', tile: char }); break;
                case '2': walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'destructible', tile: char }); break;
                case 'C': walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'destructible_v', tile: char }); break;
                case '3': walls.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, type: 'lava', tile: char }); break;
                case 'P': playerStartX = tileX; playerStartY = tileY; break;
                case '8': 
                    enemies.push({ 
                        x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, 
                        vx: Math.random() > 0.5 ? 1.5 : -1.5, vy: 0, 
                        type: 'bat', tile: char,
                        initialY: tileY, animationTick: Math.random() * 100, currentFrame: 0
                    }); 
                    break;
                case 'S': 
                    enemies.push({ 
                        x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, 
                        vx: 0, vy: 1, type: 'spider', tile: char,
                        initialY: tileY, maxLength: TILE_SIZE * 2,
                        animationTick: 0, currentFrame: 0
                    }); 
                    break;
                case 'V':
                    const wallOnLeft = j > 0 && map[i][j - 1] === '1';
                    enemies.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, vx: 0, vy: 0, type: 'viper', tile: char, initialX: tileX, direction: wallOnLeft ? 1 : -1, state: 'idle', idleTimer: Math.random() * 120 + 60, extendLength: 0, animationTick: 0, currentFrame: 0 });
                    break;
                case '9': miner = { x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, tile: char }; break;
            }
        }
    });
    resetPlayer(playerStartX, playerStartY);
    cameraY = player.y - canvas.height / 2;
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

    if (keys['ArrowUp'] && energy > 0) { player.vy = -PLAYER_SPEED * 1.2; player.isFlying = true; energy -= 0.5; }
    else { player.isFlying = false; }
    
    if (keys['Space'] && player.shootCooldown === 0) {
        const laserX = player.direction === 1 ? player.x + player.width : player.x - 30;
        const laserY = player.y + player.height / 4;
        lasers.push({ x: laserX, y: laserY, width: 30, height: 5, vx: LASER_SPEED * player.direction });
        player.shootCooldown = 15;
    }
    
    if (keys['ArrowDown'] && player.isGrounded && bombs.length === 0) {
        const bombX = player.x;
        const bombY = player.y + player.height - TILE_SIZE;
        bombs.push({ x: bombX, y: bombY, width: TILE_SIZE, height: TILE_SIZE, fuse: BOMB_FUSE, animationTick: 0, currentFrame: 0 });
    }
}

function updatePlayer() {
    if (!player.isGrounded && !player.isFlying) player.vy += GRAVITY;
    player.y += player.vy;
    player.x += player.vx;

    if (player.x < 0) player.x = 0;
    const levelWidth = levelDesigns[currentLevelIndex][0].length * TILE_SIZE;
    if (player.x + player.width > levelWidth) player.x = levelWidth - player.width;
    
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (player.isGrounded) energy = Math.min(MAX_ENERGY, energy + 1);

    player.isIdle = player.vx === 0 && player.isGrounded && !player.isFlying;

    // Animation state machine
    let newState = 'stand';
    if (!player.isGrounded) {
        newState = 'jump';
    } else if (player.vx !== 0) {
        newState = 'walk';
    }

    if (player.animationState !== newState) {
        player.animationState = newState;
        player.currentFrame = 0;
        player.animationTick = 0;
    }

    // Update animation frame
    const animKey = 'P_' + player.animationState;
    const anim = ANIMATION_DATA[animKey as keyof typeof ANIMATION_DATA];
    if (anim) {
        player.animationTick++;
        if (player.animationTick >= anim.speed) {
            player.animationTick = 0;
            if (anim.loop !== false) {
                player.currentFrame = (player.currentFrame + 1) % anim.frames;
            } else {
                player.currentFrame = Math.min(player.currentFrame + 1, anim.frames - 1);
            }
        }
    }
}

function updateEnemies() {
    enemies.forEach((enemy) => {
        // Update animation for all enemies that have one
        const anim = ANIMATION_DATA[enemy.tile as keyof typeof ANIMATION_DATA];
        if (anim) {
            enemy.animationTick = (enemy.animationTick + 1) % anim.speed;
            if (enemy.animationTick === 0) {
                enemy.currentFrame = (enemy.currentFrame + 1) % anim.frames;
            }
        }

        switch (enemy.type) {
            case 'bat':
                enemy.x += enemy.vx;
                enemy.animationTick = (enemy.animationTick || 0) + 0.05; // Increment angle for sinewave
                enemy.y = enemy.initialY! + Math.sin(enemy.animationTick) * TILE_SIZE * 0.5; // Oscillate vertically

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
                if (enemy.state === 'idle') {
                    enemy.idleTimer!--;
                    if (enemy.idleTimer! <= 0) {
                        enemy.state = 'extending';
                    }
                } else if (enemy.state === 'extending') {
                    enemy.extendLength! += 2; // Slower
                    if (enemy.extendLength! >= TILE_SIZE) {
                        enemy.extendLength = TILE_SIZE;
                        enemy.state = 'waiting_extended';
                        enemy.waitTimer = 60; // Wait 1 second
                    }
                } else if (enemy.state === 'waiting_extended') {
                    enemy.waitTimer!--;
                    if (enemy.waitTimer! <= 0) {
                        enemy.state = 'retracting';
                    }
                } else if (enemy.state === 'retracting') {
                    enemy.extendLength! -= 2; // Slower
                    if (enemy.extendLength! <= 0) {
                        enemy.extendLength = 0;
                        enemy.state = 'idle';
                        enemy.idleTimer = 60 + Math.random() * 60; // Wait 1 to 2 seconds
                    }
                }
                break;
        }
    });
}

function updateLasers() {
    lasers.forEach((laser, i) => {
        laser.x += laser.vx;
        const levelWidth = levelDesigns[currentLevelIndex][0].length * TILE_SIZE;
        if (laser.x < 0 || laser.x > levelWidth) {
            lasers.splice(i, 1);
        }
    });
}

function updateBombs() {
    bombs.forEach((bomb, index) => {
        bomb.fuse--;

        // Update bomb animation
        const anim = ANIMATION_DATA['bomb'];
        bomb.animationTick = (bomb.animationTick + 1) % anim.speed;
        if (bomb.animationTick === 0) {
            bomb.currentFrame = (bomb.currentFrame + 1) % anim.frames;
        }

        if (bomb.fuse <= 0) {
            bombs.splice(index, 1);
            // bomb.element.remove(); <--- REMOVED

            const explosionX = bomb.x - TILE_SIZE; // Center 180px explosion on 60px bomb
            const explosionY = bomb.y - TILE_SIZE;
            explosions.push({ x: explosionX, y: explosionY, width: TILE_SIZE * 3, height: TILE_SIZE * 3, timer: 20, animationTick: 0, currentFrame: 0 });

            const explosionRadius = 120;
            const explosionCenterX = explosionX + (TILE_SIZE * 3) / 2;
            const explosionCenterY = explosionY + (TILE_SIZE * 3) / 2;
            
            const wallsToRemove = new Set<Wall>();
            const columnsHit = new Set<number>();

            walls.forEach(wall => {
                if (wall.type.startsWith('destructible')) {
                    const wallCenterX = wall.x + TILE_SIZE / 2;
                    const wallCenterY = wall.y + TILE_SIZE / 2;
                    const dist = Math.hypot(explosionCenterX - wallCenterX, explosionCenterY - wallCenterY);

                    if (dist < explosionRadius) {
                        wallsToRemove.add(wall);
                        if (wall.type === 'destructible_v') {
                            columnsHit.add(wall.x);
                        }
                    }
                }
            });

            if (columnsHit.size > 0) {
                walls.forEach(wall => {
                    if (wall.type === 'destructible_v' && columnsHit.has(wall.x)) {
                        wallsToRemove.add(wall);
                    }
                });
            }

            if (wallsToRemove.size > 0) {
                // wallsToRemove.forEach(wall => wall.element.remove()); <--- REMOVED
                walls = walls.filter(wall => !wallsToRemove.has(wall));
            }
        }
    });
}

function updateParticles() {
    // This is for explosions animation now
    explosions.forEach((exp, i) => {
        exp.timer--;
        if (exp.timer <= 0) {
            explosions.splice(i, 1);
            return;
        }
        const anim = ANIMATION_DATA['explosion'];
        exp.animationTick = (exp.animationTick + 1) % anim.speed;
        if (exp.animationTick === 0) {
            exp.currentFrame = Math.min(exp.currentFrame + 1, anim.frames - 1);
        }
    });
}

function checkCollisions() {
    player.isGrounded = false;
    walls.forEach(wall => {
        if (checkCollision(player, wall)) {
            if (wall.type === 'lava') return playerDie();
            const overlapX = (player.x + player.width / 2) - (wall.x + TILE_SIZE / 2);
            const overlapY = (player.y + player.height / 2) - (wall.y + TILE_SIZE / 2);
            const combinedHalfWidths = player.width / 2 + TILE_SIZE / 2;
            const combinedHalfHeights = player.height / 2 + TILE_SIZE / 2;
            if (Math.abs(overlapX) > Math.abs(overlapY)) {
                if (overlapX > 0) player.x = wall.x + TILE_SIZE;
                else player.x = wall.x - player.width;
            } else {
                if (overlapY > 0) { player.y = wall.y + TILE_SIZE; player.vy = 0; }
                else { player.y = wall.y - player.height; player.isGrounded = true; player.vy = 0; }
            }
        }
    });

    enemies.forEach(enemy => { if (checkCollision(player, enemy)) playerDie(); });

    lasers.forEach((laser, i) => {
        walls.forEach(wall => { 
            if (checkCollision(laser, wall)) {
                lasers.splice(i, 1); 
            }
        });
        enemies.forEach((enemy, j) => {
            if (checkCollision(laser, enemy)) {
                lasers.splice(i, 1);
                enemies.splice(j, 1);
                score += 100;
            }
        });
    });

    explosions.forEach(exp => {
        const explosionHitbox = { x: exp.x, y: exp.y, width: exp.width, height: exp.height };
        if (checkCollision(player, explosionHitbox)) {
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
    updateEnemies();
    updateLasers();
    updateBombs();
    updateParticles(); // Now updates explosions
    checkCollisions();
    updateCamera();
    if (miner && checkCollision(player, miner)) {
        score += 1000;
        currentLevelIndex++;
        loadLevel();
    }
}

function gameLoop() {
    if (appState === 'menu') { /* Handled by events */ }
    else if (appState === 'playing') { updateGame(); drawGame(); }
    else if (appState === 'editing') { editorLoop(); }
    requestAnimationFrame(gameLoop);
}

// --- RENDER FUNCTION (replaces renderGame) ---
function drawGame() {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, -cameraY);

    // Draw walls
    walls.forEach(wall => {
        const sprite = sprites[wall.tile];
        if (sprite) {
            ctx.drawImage(sprite, wall.x, wall.y, wall.width, wall.height);
        } else { // Fallback for unloaded sprites
            ctx.fillStyle = TILE_TYPES[wall.tile]?.color || '#fff';
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        }
    });

    // Draw miner
    if (miner) {
        ctx.drawImage(sprites['9'], miner.x, miner.y, miner.width, miner.height);
    }
    
    // Draw enemies
    enemies.forEach(enemy => {
        const sprite = sprites[enemy.tile];
        if (!sprite) return;

        ctx.save();
        
        let flip = enemy.vx < 0; // Bat flipping
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
        } else if (enemy.type === 'viper') {
            const headSprite = sprites['V'];
            const segmentWidth = enemy.extendLength || 0;
            if (segmentWidth > 0) {
                ctx.drawImage(headSprite, 0, 0, headSprite.width, headSprite.height, 0, 0, segmentWidth, enemy.height);
            }
        }
        else {
            ctx.drawImage(sprite, 0, 0, enemy.width, enemy.height);
        }
        
        ctx.restore();
    });

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

    // Draw Player
    const animKey = 'P_' + player.animationState;
    const animData = ANIMATION_DATA[animKey as keyof typeof ANIMATION_DATA];
    const playerSprite = sprites[animKey];
    if (playerSprite) {
        const frameWidth = playerSprite.width / animData.frames;
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y);
        ctx.scale(player.direction, 1);
        ctx.drawImage(playerSprite, player.currentFrame * frameWidth, 0, frameWidth, playerSprite.height, -player.width / 2, 0, player.width, player.height);
        ctx.restore();
    }
    
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
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Enter' && appState === 'menu') startGame();
        else if (e.code === 'Enter' && (gameState === 'gameover' || gameState === 'win')) showMenu();
    });
    window.addEventListener('keyup', (e) => { keys[e.code] = false; });
}

function showMenu() {
    appState = 'menu';
    gameState = 'start';
    document.body.className = 'state-menu';
    messageOverlay.style.display = 'flex';
    gameUiEl.style.display = 'none';
    editorPanelEl.style.display = 'none';
    messageTitle.textContent = "H.E.R.O. CLONE";
    messageText.innerHTML = "Usa las flechas para moverte, Espacio para disparar.<br>Presiona un botón para empezar.";
}

function startGame(levelMap: string[] | null = null) {
    appState = 'playing';
    gameState = 'playing';
    document.body.className = 'state-playing';
    messageOverlay.style.display = 'none';
    gameUiEl.style.display = 'flex';
    editorPanelEl.style.display = 'none';
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
        'P_walk': playerWalkSrc, 'P_stand': playerStandSrc, 'P_jump': playerJumpSrc,
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
