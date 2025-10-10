import { ANIMATION_DATA, TILE_TYPES } from '../core/assets';
import { TILE_SIZE, MAX_ENERGY } from '../core/constants';
import { resetPlayer } from './player';
import type { Enemy, GameStore, Miner, Wall } from '../core/types';
import { playSuccessLevelSound } from './audio';

const createWall = (x: number, y: number, tile: string): Wall => {
    const base: Wall = {
        x,
        y,
        width: TILE_SIZE,
        height: TILE_SIZE,
        type: 'solid',
        tile,
        affectedByDark: false,
    };

    if (tile === '2') {
        return { ...base, type: 'destructible', health: 60, isDamaged: false };
    }
    if (tile === 'C') {
        return { ...base, type: 'destructible_v', health: 60, isDamaged: false };
    }
    if (tile === '3') {
        return {
            ...base,
            type: 'lava',
            spriteTick: Math.floor(Math.random() * 50),
            currentFrame: Math.floor(Math.random() * 11),
        };
    }

    return base;
};

const createEnemy = (tile: string, x: number, y: number, map: string[]): Enemy | null => {
    switch (tile) {
        case '8':
            return {
                x,
                y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                vx: Math.random() > 0.5 ? 1.5 : -1.5,
                vy: 0,
                type: 'bat',
                tile,
                initialY: y,
                spriteTick: 0,
                movementTick: Math.random() * 100,
                currentFrame: 0,
                affectedByDark: false,
            };
        case 'S':
            return {
                x,
                y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                vx: 0,
                vy: 1,
                type: 'spider',
                tile,
                initialY: y,
                maxLength: TILE_SIZE * 2,
                spriteTick: 0,
                currentFrame: 0,
                affectedByDark: false,
            };
        case 'V': {
            const row = map[Math.floor(y / TILE_SIZE)];
            const col = Math.floor(x / TILE_SIZE);
            const wallOnLeft = col > 0 && row[col - 1] === '1';
            const direction = wallOnLeft ? 1 : -1;
            return {
                x,
                y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                vx: 0,
                vy: 0,
                type: 'viper',
                tile,
                initialX: x,
                initialY: y,
                direction,
                state: 'idle',
                idleTimer: Math.random() * 120 + 60,
                spriteTick: 0,
                currentFrame: 0,
                isHidden: true,
                affectedByDark: false,
            };
        }
        default:
            return null;
    }
};

const createMiner = (x: number, y: number, mapWidth: number): Miner => ({
    x,
    y: y - 13,
    width: 78 * 1.3,
    height: TILE_SIZE * 1.3,
    tile: '9',
    animationState: 'idle',
    currentFrame: 0,
    animationTick: 0,
    animationDirection: 1,
    isFlipped: x > mapWidth / 2,
    affectedByDark: false,
});

export const parseLevel = (store: GameStore, map: string[]) => {
    store.walls = [];
    store.enemies = [];
    store.miner = null;
    store.lights = [];
    store.isDark = false;
    store.lasers = [];
    store.bombs = [];
    store.explosions = [];
    store.fallingEntities = [];
    store.particles = [];
    store.floatingScores = [];

    let playerStartX = TILE_SIZE * 1.5;
    let playerStartY = TILE_SIZE * 1.5;
    const levelPixelWidth = map[0].length * TILE_SIZE;

    const STATIC_TILES = new Set(['1', '2', '3', 'C']);

    map.forEach((row, rowIndex) => {
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const tile = row[colIndex];
            const tileX = colIndex * TILE_SIZE;
            const tileY = rowIndex * TILE_SIZE;

            if (STATIC_TILES.has(tile)) {
                const wall = createWall(tileX, tileY, tile);
                store.walls.push(wall);
            }

            if (tile === 'P') {
                playerStartX = tileX;
                playerStartY = tileY;
                continue;
            }

            if (['8', 'S', 'V'].includes(tile)) {
                const enemy = createEnemy(tile, tileX, tileY, map);
                if (enemy) {
                    store.enemies.push(enemy);
                }

                if (tile === 'V') {
                    store.walls.push(createWall(tileX, tileY, '1'));
                }
                continue;
            }

            if (tile === '9') {
                store.miner = createMiner(tileX, tileY, levelPixelWidth);
                continue;
            }

            if (tile === 'L') {
                store.lights.push({
                    x: tileX,
                    y: tileY,
                    width: TILE_SIZE,
                    height: TILE_SIZE,
                    tile: 'L',
                    isOn: true,
                });
            }
        }
    });

    resetPlayer(store, playerStartX, playerStartY);
    store.cameraY = store.player.y - (store.dom.canvas?.height ?? 0) / 2;
    store.cameraX = store.player.x - (store.dom.canvas?.width ?? 0) / 2;
};

export const updateWalls = (store: GameStore) => {
    store.walls.forEach(wall => {
        const anim = ANIMATION_DATA[wall.tile as keyof typeof ANIMATION_DATA];
        if (!anim || wall.spriteTick === undefined || wall.currentFrame === undefined) {
            return;
        }
        wall.spriteTick += 1;
        if (wall.spriteTick < anim.speed) {
            return;
        }
        wall.spriteTick = 0;
        wall.currentFrame = (wall.currentFrame + 1) % anim.frames;
    });
};

export const loadLevel = (store: GameStore) => {
    if (store.currentLevelIndex >= store.levelDesigns.length) {
        store.gameState = 'win';
        const { messageOverlay, messageText, messageTitle } = store.dom.ui;
        if (messageOverlay && messageText && messageTitle) {
            messageTitle.textContent = '¡HAS GANADO!';
            messageText.textContent = `Puntuación final: ${store.score}. Presiona ENTER para volver al menú.`;
            messageOverlay.style.display = 'flex';
        }
        return;
    }

    parseLevel(store, store.levelDesigns[store.currentLevelIndex]);
    store.cameraY = 0;
    store.cameraX = 0;
    if (store.dom.ui.levelCountEl) {
        store.dom.ui.levelCountEl.textContent = `${store.currentLevelIndex + 1}`;
    }
};

export const awardMinerRescue = (store: GameStore) => {
    const { miner } = store;
    if (!miner) {
        return;
    }
    
    // Reproducir sonido de éxito al rescatar al minero
    playSuccessLevelSound();
    
    store.score += 1000;
    store.floatingScores.push({
        x: miner.x,
        y: miner.y,
        text: '+1000',
        life: 90,
        opacity: 1,
    });
    miner.animationState = 'rescued';
    miner.currentFrame = 2;
    miner.animationTick = 0;
    
    // Congelar al jugador inmediatamente
    store.player.isFrozen = true;
    store.player.vx = 0;
    store.player.vy = 0;
};


