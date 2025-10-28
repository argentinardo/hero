import { ANIMATION_DATA, TILE_TYPES } from '../core/assets';
import { TILE_SIZE, MAX_ENERGY } from '../core/constants';
import { resetPlayer, emitParticles } from './player';
import type { Enemy, GameStore, Miner, Wall } from '../core/types';
import { playSuccessLevelSound, stopAllSfxExceptSuccessLevel, playBackgroundMusic } from './audio';

const createWall = (x: number, y: number, tile: string, store: GameStore): Wall => {
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
        return { ...base, type: 'water', health: 0, isDamaged: false, spriteTick: Math.floor(Math.random() * 50), currentFrame: Math.floor(Math.random() * 4) };
    }
    if (tile === 'C') {
        return { ...base, type: 'destructible_v', health: 60, isDamaged: false };
    }
    if (tile === 'K') {
        return { 
            ...base, 
            type: 'destructible_v', 
            health: 60, 
            isDamaged: false,
            spriteTick: Math.floor(Math.random() * 50),
            currentFrame: Math.floor(Math.random() * 11),
        };
    }
    if (tile === '3') {
        return {
            ...base,
            type: 'lava',
            spriteTick: Math.floor(Math.random() * 50),
            currentFrame: Math.floor(Math.random() * 11),
        };
    }
    // Las paredes aplastantes (H y J) se procesan directamente en parseLevel
    // para agrupar tiles consecutivos en una sola pared

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
            // La víbora debe salir hacia el vacío (tile '0'), no hacia muros o lava
            const leftTile = col > 0 ? row[col - 1] : null;
            const rightTile = col < row.length - 1 ? row[col + 1] : null;
            
            // Determinar dirección: sale hacia donde hay vacío
            let direction = 1; // Por defecto a la derecha
            if (leftTile === '0' && rightTile !== '0') {
                direction = -1; // Salir a la izquierda
            } else if (rightTile === '0' && leftTile !== '0') {
                direction = 1; // Salir a la derecha
            } else if (leftTile === '0' && rightTile === '0') {
                direction = Math.random() < 0.5 ? -1 : 1; // Ambos lados vacíos, aleatorio
            }
            
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
            // Tentáculo vertical - ocupa dos tiles de alto
            // El tentáculo debe aparecer siempre sobre agua
            const rowIndex = Math.floor(y / TILE_SIZE);
            const colIndex = Math.floor(x / TILE_SIZE);
            
            // Asegurar que el tile donde aparece el tentáculo sea agua
            if (rowIndex >= 0 && rowIndex < map.length && colIndex >= 0 && colIndex < map[rowIndex].length) {
                // Convertir el tile a agua modificando el string de la fila
                const row = map[rowIndex];
                map[rowIndex] = row.substring(0, colIndex) + '2' + row.substring(colIndex + 1);
            }
            
            // También asegurar que el tile de arriba sea agua (para el tentáculo vertical)
            const topRowIndex = rowIndex - 1;
            if (topRowIndex >= 0 && topRowIndex < map.length && colIndex >= 0 && colIndex < map[topRowIndex].length) {
                const topRow = map[topRowIndex];
                map[topRowIndex] = topRow.substring(0, colIndex) + '2' + topRow.substring(colIndex + 1);
            }
            
            return {
                x,
                y: y - TILE_SIZE, // Desfasado un tile hacia arriba para ser vertical
                width: TILE_SIZE,
                height: TILE_SIZE * 2, // Dos tiles de alto
                vx: 0,
                vy: 0,
                type: 'tentacle',
                tile,
                initialX: x,
                initialY: y - TILE_SIZE,
                spriteTick: 0,
                currentFrame: 0,
                isHidden: false,
                affectedByDark: false,
                // Propiedades específicas del tentáculo
                tentacleState: 'standby',
                tentacleFrame: 0,
                tentacleAnimationSpeed: 8,
                collisionHeight: 75, // Altura de la caja de colisión (75% de 120px)
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

    const STATIC_TILES = new Set(['1', '2', '3', 'C', 'K']);
    
    // Procesar paredes aplastantes: agrupar H's y J's consecutivos
    const processedCrushingTiles = new Set<string>(); // Para marcar tiles ya procesados

    map.forEach((row, rowIndex) => {
        for (let colIndex = 0; colIndex < row.length; colIndex++) {
            const tile = row[colIndex];
            const tileX = colIndex * TILE_SIZE;
            const tileY = rowIndex * TILE_SIZE;
            const tileKey = `${rowIndex},${colIndex}`;

            // Procesar paredes aplastantes (H y J)
            if ((tile === 'H' || tile === 'J') && !processedCrushingTiles.has(tileKey)) {
                // Encontrar todos los tiles consecutivos del mismo tipo
                let endColIndex = colIndex;
                while (endColIndex < row.length && row[endColIndex] === tile) {
                    processedCrushingTiles.add(`${rowIndex},${endColIndex}`);
                    endColIndex++;
                }
                
                // Crear una sola pared que abarca todos los tiles consecutivos
                const groupWidth = (endColIndex - colIndex) * TILE_SIZE;
                const side = tile === 'H' ? 'left' : 'right';
                const config = store.crushingWallConfig || { speed: 1.5, color: '#cc0000' };
                
                const crushingWall: Wall = {
                    x: tileX,
                    y: tileY,
                    width: groupWidth,
                    height: TILE_SIZE,
                    type: 'crushing',
                    tile,
                    affectedByDark: false,
                    side,
                    minWidth: groupWidth, // El ancho inicial del grupo
                    maxWidth: groupWidth * 2, // Temporal, se calculará después
                    currentWidth: groupWidth,
                    originalX: tileX,
                    animationSpeed: config.speed,
                    isClosing: true,
                    color: config.color
                };
                
                store.walls.push(crushingWall);
                continue;
            }

            if (STATIC_TILES.has(tile)) {
                const wall = createWall(tileX, tileY, tile, store);
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
                    // Detectar si la víbora está rodeada de lava
                    const row = map[rowIndex];
                    const leftTile = colIndex > 0 ? row[colIndex - 1] : null;
                    const rightTile = colIndex < row.length - 1 ? row[colIndex + 1] : null;
                    const topTile = rowIndex > 0 ? map[rowIndex - 1][colIndex] : null;
                    const bottomTile = rowIndex < map.length - 1 ? map[rowIndex + 1][colIndex] : null;
                    
                    // Contar cuántos tiles adyacentes son lava
                    const lavaCount = [leftTile, rightTile, topTile, bottomTile].filter(t => t === '3').length;
                    
                    // Si hay más lava que muro alrededor, usar lava
                    const wallType = lavaCount >= 2 ? '3' : '1';
                    store.walls.push(createWall(tileX, tileY, wallType, store));
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
                // Plataforma base: 60x15, apoyada en el piso del tile (parte inferior)
                const width = 60;
                const height = 15;
                const px = tileX + (TILE_SIZE - width) / 2;
                const py = tileY + TILE_SIZE - height; // fondo del tile
                store.platforms.push({ x: px, y: py, width, height, vx: 0, isActive: false });
            }
        }
    });

    // Configurar maxWidth de paredes aplastantes basado en la distancia entre pares
    const crushingWalls = store.walls.filter(w => w.type === 'crushing');
    const wallPairsByY = new Map<number, Wall[]>();
    
    crushingWalls.forEach(wall => {
        const key = wall.y;
        if (!wallPairsByY.has(key)) {
            wallPairsByY.set(key, []);
        }
        wallPairsByY.get(key)!.push(wall);
    });
    
    wallPairsByY.forEach(walls => {
        if (walls.length === 2) {
            const leftWall = walls.find(w => w.side === 'left');
            const rightWall = walls.find(w => w.side === 'right');
            
            if (leftWall && rightWall && 
                leftWall.originalX !== undefined && rightWall.originalX !== undefined &&
                leftWall.minWidth !== undefined && rightWall.minWidth !== undefined) {
                
                // El borde derecho de la pared izquierda (última H)
                const leftWallRightEdge = leftWall.originalX + leftWall.minWidth;
                // El borde izquierdo de la pared derecha (primera J)
                const rightWallLeftEdge = rightWall.originalX;
                // Gap entre las paredes
                const gapBetweenWalls = rightWallLeftEdge - leftWallRightEdge;
                
                // Cada pared crece hasta la mitad del gap
                const maxWidth = leftWall.minWidth + (gapBetweenWalls / 2);
                
                leftWall.maxWidth = maxWidth;
                rightWall.maxWidth = maxWidth;
                
                // Configuración completada para el par de paredes aplastantes
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
    wallPairs.forEach((walls, y) => {
        if (walls.length === 2) {
            const leftWall = walls.find(w => w.side === 'left');
            const rightWall = walls.find(w => w.side === 'right');
            
            if (leftWall && rightWall && 
                leftWall.currentWidth !== undefined && rightWall.currentWidth !== undefined &&
                leftWall.minWidth !== undefined && rightWall.minWidth !== undefined &&
                leftWall.maxWidth !== undefined && rightWall.maxWidth !== undefined &&
                leftWall.originalX !== undefined && rightWall.originalX !== undefined) {
                
                const speed = leftWall.animationSpeed ?? 1.5;
                
                // Actualizar anchos según la dirección
                if (leftWall.isClosing) {
                    // Cerrando: aumentar ancho hacia el centro
                    leftWall.currentWidth += speed;
                    rightWall.currentWidth += speed;
                    
                    // Verificar si alcanzaron el máximo (se tocan)
                    if (leftWall.currentWidth >= leftWall.maxWidth) {
                        leftWall.currentWidth = leftWall.maxWidth;
                        rightWall.currentWidth = rightWall.maxWidth;
                        // REBOTE: cambiar dirección
                        leftWall.isClosing = false;
                        rightWall.isClosing = false;
                    }
                } else {
                    // Abriendo: reducir ancho, volver al tamaño original
                    leftWall.currentWidth -= speed;
                    rightWall.currentWidth -= speed;
                    
                    // Verificar si volvieron al mínimo
                    if (leftWall.currentWidth <= leftWall.minWidth) {
                        leftWall.currentWidth = leftWall.minWidth;
                        rightWall.currentWidth = rightWall.minWidth;
                        // REBOTE: cambiar dirección
                        leftWall.isClosing = true;
                        rightWall.isClosing = true;
                    }
                }
                
                // Actualizar width (mantener sincronizado con currentWidth)
                leftWall.width = leftWall.currentWidth;
                rightWall.width = rightWall.currentWidth;
                
                // Actualizar posiciones: 
                // Pared izquierda (H): x fijo en originalX, crece hacia la derecha
                leftWall.x = leftWall.originalX;
                
                // Pared derecha (J): borde derecho fijo, crece hacia la izquierda
                // El borde derecho original está en (originalX + minWidth)
                rightWall.x = (rightWall.originalX + rightWall.minWidth) - rightWall.currentWidth;
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
                        // Pared derecha: borde derecho fijo en (originalX + minWidth)
                        wall.x = (wall.originalX + wall.minWidth) - wall.currentWidth;
                    }
                }
            });
        }
    });
    
    // Generar partículas eléctricas alrededor de las paredes aplastantes
    crushingWalls.forEach(wall => {
        // Generar partículas eléctricas con baja probabilidad para no sobrecargar
        if (Math.random() < 0.1) { // 10% de probabilidad por frame
            // Partículas en los bordes de la pared
            const edgePositions = [
                { x: wall.x, y: wall.y + wall.height / 2 }, // Borde izquierdo
                { x: wall.x + wall.width, y: wall.y + wall.height / 2 }, // Borde derecho
                { x: wall.x + wall.width / 2, y: wall.y }, // Borde superior
                { x: wall.x + wall.width / 2, y: wall.y + wall.height }, // Borde inferior
            ];
            
            // Seleccionar una posición aleatoria del borde
            const edgePos = edgePositions[Math.floor(Math.random() * edgePositions.length)];
            
            // Generar partícula eléctrica
            store.particles.push({
                x: edgePos.x + (Math.random() - 0.5) * 10,
                y: edgePos.y + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 2 + 1,
                life: Math.random() * 20 + 10,
                color: Math.random() > 0.5 ? '#00ffff' : '#ffffff', // Azul eléctrico o blanco
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

    // Resetear la secuencia de fin de nivel
    store.levelEndSequence = null;
    store.levelEndTimer = 0;

    parseLevel(store, store.levelDesigns[store.currentLevelIndex]);
    // La cámara ya se posiciona correctamente en parseLevel centrada en el jugador
    if (store.dom.ui.levelCountEl) {
        store.dom.ui.levelCountEl.textContent = `${store.currentLevelIndex + 1}`;
    }
    // Reanudar música principal al comenzar un nuevo nivel
    playBackgroundMusic().catch(() => {});
};

export const awardMinerRescue = (store: GameStore) => {
    const { miner } = store;
    if (!miner) {
        return;
    }
    
    // 1. Reproducir sonido de éxito inmediatamente al rescatar al minero
    playSuccessLevelSound();
    
    // Detener todos los otros sonidos
    stopAllSfxExceptSuccessLevel();
    
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
    
    // Iniciar la secuencia de fin de nivel
    store.levelEndSequence = 'energy';
    store.levelEndTimer = 0;
};


