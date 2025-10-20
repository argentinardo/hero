import { ANIMATION_DATA, TILE_TYPES } from '../core/assets';
import { TILE_SIZE, MAX_ENERGY } from '../core/constants';
import { resetPlayer } from './player';
import type { Enemy, GameStore, Miner, Wall } from '../core/types';
import { playSuccessLevelSound, stopAllSfxExceptSuccessLevel, playBackgroundMusic } from './audio';

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
    if (tile === 'H' || tile === 'J') {
        // Paredes aplastantes - escalan desde los bordes
        const side = tile === 'H' ? 'left' : 'right';
        const maxWidth = TILE_SIZE * 8; // Ancho máximo: 8 tiles
        const minWidth = TILE_SIZE; // Ancho mínimo: 1 tile
        return {
            ...base,
            type: 'crushing',
            side,
            minWidth,
            maxWidth,
            currentWidth: minWidth, // Empiezan cerradas (mínimo ancho)
            width: minWidth,
            originalX: x, // Guardar posición X original
            animationTimer: 0,
            animationSpeed: 1.5, // Velocidad de escalado en px por frame
            isClosing: false, // Empiezan abriéndose
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
        case 'T': {
            // Tentáculo en lava - ocupa 2 tiles verticalmente
            return {
                x,
                y: y - TILE_SIZE, // Empezar un tile arriba
                width: TILE_SIZE,
                height: TILE_SIZE * 2, // Ocupa 2 tiles de altura
                vx: 0,
                vy: 0,
                type: 'tentacle',
                tile,
                initialX: x,
                initialY: y - TILE_SIZE, // Guardar posición inicial ajustada
                state: 'idle',
                spriteTick: 0,
                currentFrame: 0,
                isHidden: true,
                affectedByDark: false,
                detectionRange: TILE_SIZE * 4, // Detecta al héroe a 4 tiles
                attackRange: TILE_SIZE * 6, // Alcance máximo del tentáculo
                detectionDelay: 30, // 30 frames de delay antes de atacar
                playerStillTimer: 0,
                extensionLength: 0,
            };
        }
        default:
            return null;
    }
};

const createMiner = (x: number, y: number, mapWidth: number, map: string[]): Miner => {
    // Detectar a qué muro está pegado el minero
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);
    
    // Verificar tiles adyacentes (izquierda y derecha)
    const leftTile = map[tileY]?.[tileX - 1] || '0';
    const rightTile = map[tileY]?.[tileX + 1] || '0';
    
    // El minero debe tener su espalda contra el muro
    // Si hay muro a la izquierda, el minero mira hacia la derecha (no flipped)
    // Si hay muro a la derecha, el minero mira hacia la izquierda (flipped)
    let isFlipped = false;
    
    if (leftTile !== '0' && leftTile !== undefined) {
        // Hay muro a la izquierda -> minero mira hacia la derecha (no flipped)
        isFlipped = false;
    } else if (rightTile !== '0' && rightTile !== undefined) {
        // Hay muro a la derecha -> minero mira hacia la izquierda (flipped)
        isFlipped = true;
    } else {
        // Fallback: usar lógica anterior si no hay muros detectados
        isFlipped = x > mapWidth / 2;
    }
    
    return {
        x,
        y: y - 13,
        width: 78 * 1.3,
        height: TILE_SIZE * 1.3,
        tile: '9',
        animationState: 'idle',
        currentFrame: 0,
        animationTick: 0,
        animationDirection: 1,
        isFlipped,
        affectedByDark: false,
    };
};

export const parseLevel = (store: GameStore, map: string[]) => {
    store.walls = [];
    store.enemies = [];
    store.miner = null;
    store.lights = [];
    store.platforms = [];
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

            if (STATIC_TILES.has(tile) || tile === 'H' || tile === 'J') {
                const wall = createWall(tileX, tileY, tile);
                store.walls.push(wall);
            }

            if (tile === 'P') {
                playerStartX = tileX;
                playerStartY = tileY;
                continue;
            }

            if (['8', 'S', 'V', 'T'].includes(tile)) {
                const enemy = createEnemy(tile, tileX, tileY, map);
                if (enemy) {
                    store.enemies.push(enemy);
                }

                if (tile === 'V') {
                    store.walls.push(createWall(tileX, tileY, '1'));
                }
                // Los tentáculos viven en la lava, así que añadimos lava debajo
                if (tile === 'T') {
                    store.walls.push(createWall(tileX, tileY, '3'));
                }
                continue;
            }

            if (tile === '9') {
                store.miner = createMiner(tileX, tileY, levelPixelWidth, map);
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
            } else if (tile === 'A') {
                // Plataforma amarilla: 60x10, apoyada en el piso del tile (parte inferior)
                const width = 60;
                const height = 10;
                const px = tileX + (TILE_SIZE - width) / 2;
                const py = tileY + TILE_SIZE - height; // fondo del tile
                store.platforms.push({ x: px, y: py, width, height, vx: 0, isActive: false });
            }
        }
    });

    resetPlayer(store, playerStartX, playerStartY);
    store.cameraY = store.player.y - (store.dom.canvas?.height ?? 0) / 2;
    store.cameraX = store.player.x - (store.dom.canvas?.width ?? 0) / 2;
    
    // Rellenar bombas al comenzar el nivel
    store.bombsRemaining = 5;
};

export const updateWalls = (store: GameStore) => {
    // Primero actualizar animación de sprites (lava)
    store.walls.forEach(wall => {
        const anim = ANIMATION_DATA[wall.tile as keyof typeof ANIMATION_DATA];
        if (anim && wall.spriteTick !== undefined && wall.currentFrame !== undefined) {
            wall.spriteTick += 1;
            if (wall.spriteTick >= anim.speed) {
                wall.spriteTick = 0;
                wall.currentFrame = (wall.currentFrame + 1) % anim.frames;
            }
        }
    });
    
    // Actualizar paredes aplastantes con detección de colisión
    const crushingWalls = store.walls.filter(w => w.type === 'crushing');
    
    // Agrupar pares de paredes por Y (misma fila)
    const wallPairs = new Map<number, Wall[]>();
    crushingWalls.forEach(wall => {
        const key = wall.y;
        if (!wallPairs.has(key)) {
            wallPairs.set(key, []);
        }
        wallPairs.get(key)!.push(wall);
    });
    
    // Actualizar cada par de paredes
    wallPairs.forEach(walls => {
        if (walls.length === 2) {
            const leftWall = walls.find(w => w.side === 'left');
            const rightWall = walls.find(w => w.side === 'right');
            
            if (leftWall && rightWall && 
                leftWall.currentWidth !== undefined && rightWall.currentWidth !== undefined &&
                leftWall.minWidth !== undefined && rightWall.minWidth !== undefined &&
                leftWall.maxWidth !== undefined && rightWall.maxWidth !== undefined &&
                leftWall.originalX !== undefined && rightWall.originalX !== undefined) {
                
                const speed = leftWall.animationSpeed ?? 1.5;
                
                // Actualizar anchos primero
                if (leftWall.isClosing) {
                    // Cerrando: aumentar ancho
                    leftWall.currentWidth += speed;
                    rightWall.currentWidth += speed;
                    
                    // Limitar al máximo
                    if (leftWall.currentWidth >= leftWall.maxWidth) {
                        leftWall.currentWidth = leftWall.maxWidth;
                        rightWall.currentWidth = rightWall.maxWidth;
                    }
                } else {
                    // Abriendo: reducir ancho
                    leftWall.currentWidth -= speed;
                    rightWall.currentWidth -= speed;
                    
                    // Limitar al mínimo
                    if (leftWall.currentWidth <= leftWall.minWidth) {
                        leftWall.currentWidth = leftWall.minWidth;
                        rightWall.currentWidth = rightWall.minWidth;
                    }
                }
                
                // Actualizar ancho (mantener width sincronizado con currentWidth)
                leftWall.width = leftWall.currentWidth;
                rightWall.width = rightWall.currentWidth;
                
                // Actualizar posiciones: 
                // Pared izquierda crece hacia la derecha (x fijo)
                leftWall.x = leftWall.originalX;
                
                // Pared derecha crece hacia la izquierda (x se mueve hacia la izquierda)
                // El borde derecho original está en (originalX + TILE_SIZE)
                // El nuevo x es: bordeDerechoOriginal - currentWidth
                rightWall.x = (rightWall.originalX + TILE_SIZE) - rightWall.currentWidth;
                
                // Calcular bordes para detección de colisión
                const leftWallRightEdge = leftWall.x + leftWall.width;
                const rightWallLeftEdge = rightWall.x;
                
                // Detectar colisión (las paredes se tocan o cruzan)
                const collision = leftWallRightEdge >= rightWallLeftEdge;
                
                if (collision && leftWall.isClosing) {
                    // Se tocaron mientras cerraban, REBOTE: cambiar a abrir
                    leftWall.isClosing = false;
                    rightWall.isClosing = false;
                    
                    // Ajustar para que no se crucen
                    const overlap = leftWallRightEdge - rightWallLeftEdge;
                    leftWall.currentWidth -= overlap / 2;
                    rightWall.currentWidth -= overlap / 2;
                    
                    // Recalcular posiciones después del ajuste
                    leftWall.width = leftWall.currentWidth;
                    leftWall.x = leftWall.originalX;
                    rightWall.width = rightWall.currentWidth;
                    rightWall.x = (rightWall.originalX + TILE_SIZE) - rightWall.currentWidth;
                } else if (!collision && !leftWall.isClosing && leftWall.currentWidth <= leftWall.minWidth) {
                    // Se abrieron completamente, REBOTE: cambiar a cerrar
                    leftWall.isClosing = true;
                    rightWall.isClosing = true;
                }
            }
        } else {
            // Pared solitaria (sin pareja), usar lógica simple
            walls.forEach(wall => {
                if (wall.currentWidth !== undefined && wall.minWidth !== undefined && 
                    wall.maxWidth !== undefined && wall.originalX !== undefined) {
                    
                    const speed = wall.animationSpeed ?? 1.5;
                    
                    if (wall.isClosing) {
                        wall.currentWidth += speed;
                        if (wall.currentWidth >= wall.maxWidth) {
                            wall.currentWidth = wall.maxWidth;
                            wall.isClosing = false;
                        }
                    } else {
                        wall.currentWidth -= speed;
                        if (wall.currentWidth <= wall.minWidth) {
                            wall.currentWidth = wall.minWidth;
                            wall.isClosing = true;
                        }
                    }
                    
                    wall.width = wall.currentWidth;
                    if (wall.side === 'left') {
                        wall.x = wall.originalX;
                    } else {
                        wall.x = (wall.originalX + TILE_SIZE) - wall.currentWidth;
                    }
                }
            });
        }
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
    // La cámara ya se posiciona correctamente en parseLevel centrada en el jugador
    if (store.dom.ui.levelCountEl) {
        store.dom.ui.levelCountEl.textContent = `${store.currentLevelIndex + 1}`;
    }
    // Reanudar música principal al comenzar un nuevo nivel
    playBackgroundMusic();
};

export const awardMinerRescue = (store: GameStore) => {
    const { miner } = store;
    if (!miner) {
        return;
    }
    
    // Detener todos los otros sonidos y reproducir el de éxito
    stopAllSfxExceptSuccessLevel();
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
    
    // Cambiar sprite del hero a hero_success
    store.player.animationState = 'success';
    store.player.currentFrame = 0;
    store.player.animationTick = 0;
    
    // Congelar al jugador inmediatamente
    store.player.isFrozen = true;
    store.player.vx = 0;
    store.player.vy = 0;
};


