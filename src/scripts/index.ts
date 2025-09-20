import '../styles/main.scss';
import initialLevels from '../assets/levels.json';

// Import sprites
import wallSpriteSrc from '../assets/sprites/wall_small.png';
import destructibleWallSpriteSrc from '../assets/sprites/tierra_small.png';
import playerSpriteSrc from '../assets/sprites/hero_small.png';
import batSpriteSrc from '../assets/sprites/bat_small.png';
import viperSpriteSrc from '../assets/sprites/serpiente_small.png';
import minerSpriteSrc from '../assets/sprites/miner_small.png';
import backgroundSpriteSrc from '../assets/sprites/background_small.png';
import spiderSpriteSrc from '../assets/sprites/spider_small.png';


// --- GENERAL SETUP ---
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
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
const TILE_TYPES: { [key: string]: { name: string, color: string } } = {
    '0': { name: 'Vacío', color: '#000' }, 'P': { name: 'Player', color: '#ff0000' },
    '1': { name: 'Muro', color: '#6d6d6d' }, '2': { name: 'Tierra', color: '#a5682a' },
    'C': { name: 'Columna', color: '#c5853f' },
    '3': { name: 'Lava', color: '#ff4500' }, '8': { name: 'Murciélago', color: '#9400d3' },
    'S': { name: 'Araña', color: '#ff8c00' }, 'V': { name: 'Víbora', color: '#32cd32' },
    '9': { name: 'Minero', color: '#4169e1' },
};


// --- SPRITE MANAGEMENT ---
const spriteSources: { [key: string]: string } = {
    '0': backgroundSpriteSrc, '1': wallSpriteSrc, '2': destructibleWallSpriteSrc,
    'C': destructibleWallSpriteSrc, 'P': playerSpriteSrc, '8': batSpriteSrc,
    'S': spiderSpriteSrc, 'V': viperSpriteSrc, '9': minerSpriteSrc
};
const sprites: { [key: string]: HTMLImageElement } = {};

function preloadSprites(): Promise<void> {
    let loadedCount = 0;
    const totalSprites = Object.keys(spriteSources).length;
    return new Promise((resolve, reject) => {
        if (totalSprites === 0) return resolve();
        for (const key in spriteSources) {
            const img = new Image();
            img.src = spriteSources[key];
            img.onload = () => {
                sprites[key] = img;
                loadedCount++;
                if (loadedCount === totalSprites) resolve();
            };
            img.onerror = (err) => reject(err);
        }
    });
}

// --- TYPE DEFINITIONS ---
interface Enemy {
    x: number; y: number; width: number; height: number; vx: number; vy: number;
    type: 'bat' | 'viper' | 'spider' | 'miner';
    tile: string;
    direction?: number;
    initialX?: number; initialY?: number;
    extendLength?: number;
    maxLength?: number;
    state?: 'extending' | 'retracting' | 'idle' | 'waiting_extended';
    idleTimer?: number;
    waitTimer?: number;
    currentFrame?: number; frameCount?: number; animationTick?: number; animationSpeed?: number;
}
interface GameObject { x: number; y: number; width: number; height: number; }

// --- GAME STATE ---
let lives = 0, score = 0, energy = 0, currentLevelIndex = 0, cameraY = 0;
let particles: any[] = [];
let walls: any[] = [], enemies: Enemy[] = [], lasers: any[] = [], bombs: any[] = [], explosions: any[] = [], miner: any = null;
let levelDesigns = JSON.parse(JSON.stringify(initialLevels));
let levelDataStore: string[][][] = [];

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
    Object.assign(player, {
        x: startX, y: startY, width: TILE_SIZE * 0.7, height: TILE_SIZE * 2,
        vx: 0, vy: 0, isFlying: false, isGrounded: false, direction: 1, shootCooldown: 0,
    });
    energy = MAX_ENERGY;
}

function parseLevel(map: string[]) {
    walls = []; enemies = []; miner = null; lasers = []; bombs = []; explosions = []; particles = [];
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
                        x: tileX, y: tileY, 
                        width: TILE_SIZE, height: TILE_SIZE, 
                        vx: Math.random() > 0.5 ? 1.5 : -1.5, vy: 0, 
                        type: 'bat', tile: char, 
                        initialY: tileY, 
                        animationTick: Math.random() * 100 // Sinewave offset
                    }); 
                    break;
                case 'S': 
                    enemies.push({ 
                        x: tileX, y: tileY, 
                        width: TILE_SIZE, height: TILE_SIZE, 
                        vx: 0, vy: 1, // Start moving down
                        type: 'spider', tile: char, 
                        initialY: tileY, 
                        maxLength: TILE_SIZE * 2, // How far down it goes
                        currentFrame: 0, frameCount: 15, animationTick: 0, animationSpeed: 4 
                    }); 
                    break;
                case 'V':
                    const wallOnLeft = j > 0 && map[i][j - 1] === '1';
                    enemies.push({ x: tileX, y: tileY, width: TILE_SIZE, height: TILE_SIZE, vx: 0, vy: 0, type: 'viper', tile: char, initialX: tileX, direction: wallOnLeft ? 1 : -1, state: 'idle', idleTimer: Math.random() * 120 + 60, extendLength: 0 });
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
        lasers.push({ x: player.x + player.width / 2, y: player.y + player.height / 4, width: 30, height: 5, vx: LASER_SPEED * player.direction });
        player.shootCooldown = 15;
    }
    
    if (keys['ArrowDown'] && player.isGrounded && bombs.length === 0) {
        bombs.push({ x: player.x, y: player.y + player.height - TILE_SIZE, width: TILE_SIZE * 0.5, height: TILE_SIZE, fuse: BOMB_FUSE });
    }
}

function updatePlayer() {
    if (!player.isGrounded && !player.isFlying) player.vy += GRAVITY;
    player.y += player.vy;
    player.x += player.vx;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    
    if (player.shootCooldown > 0) player.shootCooldown--;
    if (player.isGrounded) energy = Math.min(MAX_ENERGY, energy + 1);
}

function updateEnemies() {
    enemies.forEach((enemy) => {
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
                if (enemy.vx < 0 && (wallLeft || enemy.x < 0)) enemy.vx *= -1;
                if (enemy.vx > 0 && (wallRight || (enemy.x + enemy.width) > canvas.width)) enemy.vx *= -1;
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

                if (enemy.animationTick !== undefined && enemy.animationSpeed !== undefined && enemy.currentFrame !== undefined && enemy.frameCount !== undefined) {
                    enemy.animationTick++;
                    if (enemy.animationTick >= enemy.animationSpeed) {
                        enemy.animationTick = 0;
                        enemy.currentFrame = (enemy.currentFrame + 1) % enemy.frameCount;
                    }
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
        if (laser.x < 0 || laser.x > canvas.width) lasers.splice(i, 1);
    });
}

function updateBombs() {
    bombs.forEach((bomb, i) => {
        bomb.fuse--;
        if (bomb.fuse <= 0) {
            bombs.splice(i, 1);

            const explosionX = bomb.x + bomb.width / 2;
            const explosionY = bomb.y + bomb.height / 2;
            const explosionRadius = TILE_SIZE * 2;

            explosions.push({ x: explosionX, y: explosionY, radius: explosionRadius, timer: 30 });

            const columnsHit = new Set<number>();
            const wallsToRemove = new Set<GameObject>();

            // Find walls within explosion radius
            walls.forEach(wall => {
                if (wall.type.startsWith('destructible')) {
                    const wallCenterX = wall.x + TILE_SIZE / 2;
                    const wallCenterY = wall.y + TILE_SIZE / 2;
                    const dist = Math.hypot(explosionX - wallCenterX, explosionY - wallCenterY);

                    if (dist < explosionRadius) {
                        wallsToRemove.add(wall);
                        if (wall.type === 'destructible_v') { // 'C' tile
                            columnsHit.add(wall.x);
                        }
                    }
                }
            });

            // If a column was hit, remove all parts of it
            if (columnsHit.size > 0) {
                walls.forEach(wall => {
                    if (wall.type === 'destructible_v' && columnsHit.has(wall.x)) {
                        wallsToRemove.add(wall);
                    }
                });
            }

            // Rebuild walls array without the removed ones
            if (wallsToRemove.size > 0) {
                walls = walls.filter(wall => !wallsToRemove.has(wall));
            }
        }
    });
}

function updateParticles() {
    particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
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

    explosions.forEach(explosion => {
        const dist = Math.hypot(
            (player.x + player.width / 2) - explosion.x,
            (player.y + player.height / 2) - explosion.y
        );
        if (dist < explosion.radius) {
            playerDie();
        }
    });

    lasers.forEach((laser, i) => {
        walls.forEach(wall => { if (checkCollision(laser, wall)) lasers.splice(i, 1); });
        enemies.forEach((enemy, j) => {
            if (checkCollision(laser, enemy)) {
                lasers.splice(i, 1);
                enemies.splice(j, 1);
                score += 100;
            }
        });
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
    updateParticles();
    explosions.forEach((exp, i) => { exp.timer--; if (exp.timer <= 0) explosions.splice(i, 1); });
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

// --- DRAWING FUNCTIONS ---
function drawGame() {
    // Update UI elements
    livesCountEl.textContent = lives.toString();
    scoreCountEl.textContent = score.toString();
    energyBarEl.style.width = `${(energy / MAX_ENERGY) * 100}%`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);

    const bgSprite = sprites['0'];
    if (bgSprite) {
        for (let y = 0; y < levelDesigns[currentLevelIndex].length; y++) {
            for (let x = 0; x < levelDesigns[currentLevelIndex][y].length; x++) {
                ctx.drawImage(bgSprite, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    walls.forEach(wall => {
        const sprite = sprites[wall.tile];
        if (sprite) ctx.drawImage(sprite, wall.x, wall.y, TILE_SIZE, TILE_SIZE);
        else { ctx.fillStyle = TILE_TYPES[wall.tile]?.color || '#fff'; ctx.fillRect(wall.x, wall.y, TILE_SIZE, TILE_SIZE); }
    });

    if (miner) {
        const sprite = sprites[miner.tile];
        if (sprite) ctx.drawImage(sprite, miner.x, miner.y, TILE_SIZE, TILE_SIZE);
    }
    
    if (sprites['P']) {
        const playerSprite = sprites['P'];
        ctx.save();
        ctx.translate(player.x + player.width / 2, 0);
        if (player.direction === -1) ctx.scale(-1, 1);
        ctx.drawImage(playerSprite, -player.width / 2, player.y, player.width, player.height);
        ctx.restore();
    } else {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
   
    enemies.forEach(enemy => {
        const sprite = sprites[enemy.tile];
        if (sprite) {
            switch (enemy.type) {
                case 'bat':
                    ctx.save();
                    ctx.translate(enemy.x + enemy.width / 2, 0);
                    if (enemy.vx < 0) ctx.scale(-1, 1);
                    ctx.drawImage(sprite, -enemy.width / 2, enemy.y, enemy.width, enemy.height);
                    ctx.restore();
                    break;
                case 'spider':
                    ctx.fillStyle = '#cccccc55';
                    ctx.fillRect(enemy.x + enemy.width / 2 - 1, enemy.initialY!, 2, 20 + enemy.y - enemy.initialY!);
                    if (enemy.currentFrame !== undefined && enemy.frameCount !== undefined) {
                        const frameWidth = sprite.width / enemy.frameCount;
                        ctx.drawImage(sprite, enemy.currentFrame * frameWidth, 0, frameWidth, sprite.height, enemy.x, enemy.y, enemy.width, enemy.height);
                    } else {
                        ctx.drawImage(sprite, enemy.x, enemy.y, enemy.width, enemy.height);
                    }
                    break;
                case 'viper':
                    const isFlipped = enemy.direction === -1;
                    const sWidth = (enemy.extendLength! / TILE_SIZE) * sprite.width;
                    const dWidth = enemy.extendLength!;
                    if (isFlipped) {
                        const dX = enemy.initialX! + TILE_SIZE - dWidth;
                        ctx.save();
                        ctx.translate(dX + dWidth / 2, enemy.y + TILE_SIZE / 2);
                        ctx.scale(-1, 1);
                        ctx.drawImage(sprite, 0, 0, sWidth, sprite.height, -dWidth / 2, -TILE_SIZE / 2, dWidth, TILE_SIZE);
                        ctx.restore();
                    } else {
                        const dX = enemy.initialX!;
                        ctx.drawImage(sprite, 0, 0, sWidth, sprite.height, dX, enemy.y, dWidth, TILE_SIZE);
                    }
                    break;
            }
        }
    });
    
    lasers.forEach(laser => {
        // Creamos un degradé vertical de rojo a blanco para cada láser
        const grad = ctx.createLinearGradient(laser.x, laser.y, laser.x, laser.y + laser.height);
        grad.addColorStop(0, '#ff0000'); // Rojo arriba
        grad.addColorStop(1, '#ffffff'); // Blanco abajo
        ctx.fillStyle = grad;
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    });
    bombs.forEach(bomb => { ctx.fillStyle = '#ff0000'; ctx.fillRect(bomb.x, bomb.y, bomb.width, bomb.height); });
    explosions.forEach(exp => { ctx.fillStyle = `rgba(255, 165, 0, ${exp.timer / 30})`; ctx.beginPath(); ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2); ctx.fill(); });
    particles.forEach(p => { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });

    ctx.restore();
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
    messageOverlay.style.display = 'flex';
    gameUiEl.style.display = 'none';
    editorPanelEl.style.display = 'none';
    messageTitle.textContent = "H.E.R.O. CLONE";
    messageText.innerHTML = "Usa las flechas para moverte, Espacio para disparar.<br>Presiona un botón para empezar.";
}

function startGame(levelMap: string[] | null = null) {
    appState = 'playing';
    gameState = 'playing';
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
    messageOverlay.style.display = 'none';
    gameUiEl.style.display = 'none';
    editorPanelEl.style.display = 'flex';
    loadLevelFromStore();
    cameraY = 0;
    exportLevelData();
}

function editorLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);

    if (editorLevel) {
        const bgSprite = sprites['0'];
        editorLevel.forEach((row, y) => {
            row.forEach((tile, x) => {
                if (bgSprite) ctx.drawImage(bgSprite, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                const sprite = sprites[tile];
                if (sprite && tile !== '0') {
                    ctx.drawImage(sprite, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                } else if (tile !== '0') {
                    ctx.fillStyle = TILE_TYPES[tile]?.color || '#fff';
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            });
        });
    }

    for (let x = 0; x <= canvas.width; x += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, editorLevel.length * TILE_SIZE); ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.stroke(); }
    for (let y = 0; y <= editorLevel.length * TILE_SIZE; y += TILE_SIZE) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.stroke(); }

    ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2;
    ctx.strokeRect(mouse.gridX * TILE_SIZE, mouse.gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);

    ctx.restore();
}

function setupEditor() {
    Object.entries(TILE_TYPES).forEach(([key, { name, color }]: [string, { name: string, color: string }]) => {
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile-selector flex-col text-xs text-center';
        tileDiv.dataset.tile = key;
        const sprite = sprites[key];
        if (sprite) {
            tileDiv.style.backgroundImage = `url(${sprite.src})`;
            tileDiv.style.backgroundSize = 'contain';
            tileDiv.style.backgroundRepeat = 'no-repeat';
            tileDiv.style.backgroundPosition = 'center';
        } else {
            tileDiv.style.backgroundColor = color;
        }
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
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top + cameraY;
        mouse.gridX = Math.floor(mouse.x / TILE_SIZE);
        mouse.gridY = Math.floor(mouse.y / TILE_SIZE);
        if (mouse.isDown && editorLevel && editorLevel[mouse.gridY] && editorLevel[mouse.gridY][mouse.gridX] !== undefined) {
            editorLevel[mouse.gridY][mouse.gridX] = selectedTile;
        }
    });
    canvas.addEventListener('mousedown', () => {
        if (appState !== 'editing') return;
        mouse.isDown = true;
        if (editorLevel && editorLevel[mouse.gridY] && editorLevel[mouse.gridY][mouse.gridX] !== undefined) {
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

// --- INITIALIZATION ---
window.onload = () => {
    preloadSprites().then(() => {
        setupUI();
        setupEditor();
        showMenu();
        gameLoop();
    }).catch(err => console.error("Failed to preload sprites:", err));
};
