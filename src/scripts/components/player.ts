/**
 * Lógica del jugador del juego H.E.R.O.
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * 
 * **Single Responsibility Principle (SRP)**:
 * - Este módulo es responsable ÚNICAMENTE de la lógica del jugador:
 *   * Manejo de input del jugador (handlePlayerInput)
 *   * Física y movimiento del jugador (updatePlayer)
 *   * Animaciones del jugador
 *   * Colisiones del jugador con el entorno
 *   * Muerte y respawn del jugador
 * 
 * **Open/Closed Principle (OCP)**:
 * - Funciones extensibles mediante parámetros (store: GameStore)
 * - Fácil agregar nuevas mecánicas (ej: agua, sumersión) sin modificar funciones existentes
 * 
 * **Liskov Substitution Principle (LSP)**:
 * - Player implementa GameObject interface (compatible con funciones genéricas de colisión)
 * - Consistente con otras entidades del juego (Enemy, Wall, etc.)
 * 
 * MEJORA FUTURA (implementada en src/scripts/solid/):
 * - Separar responsabilidades en clases especializadas:
 *   * PlayerInputHandler (input)
 *   * PlayerPhysics (física)
 *   * PlayerCollisionResolver (colisiones)
 *   * PlayerAnimator (animaciones)
 * 
 * @see ARCHITECTURE_DECISIONS.md - Para más detalles sobre decisiones técnicas
 * @see src/scripts/solid/entities/Player/ - Versión refactorizada siguiendo SOLID completo
 */

import { TILE_SIZE, GRAVITY, PLAYER_SPEED, THRUST_POWER, MAX_UPWARD_SPEED, LASER_SPEED, MAX_ENERGY, BOMB_FUSE } from '../core/constants';
import { ANIMATION_DATA } from '../core/assets';
import type { Enemy, GameStore, Miner, Wall, Platform } from '../core/types';
import { checkCollision, isInHeightBlock, isTopBlock } from '../core/collision';
import { playJetpackSound, stopJetpackSound, playLaserSound, playLifedownSound, playStepsSound, stopStepsSound, playBombFireSound, stopAllSfxExceptLifedown, onLifedownEnded, playBackgroundMusic, pauseBackgroundMusic } from './audio';
import { vibrate } from '../utils/device';

const handleWaterCollision = (store: GameStore, wall: Wall) => {
    const { player } = store;
    
    // Calcular qué tan sumergido está el héroe
    const playerBottom = player.y + player.height;
    const waterTop = wall.y;
    const waterBottom = wall.y + wall.height;
    
    // Si el héroe está tocando el agua
    if (playerBottom > waterTop && player.y < waterBottom) {
        player.isInWater = true;
        
        // Calcular nivel de sumersión (0 = no sumergido, 1 = completamente sumergido)
        const submersionDepth = Math.min(playerBottom - waterTop, player.height) / player.height;
        player.waterSubmersionLevel = submersionDepth;
        
        // Si está sumergido más de 1/3, morir
        if (submersionDepth > 1/3) {
            playerDie(store, undefined, true); // Muerte por agua
            return;
        }
        
        // Aplicar resistencia al movimiento
        const resistanceFactor = 0.3 + (submersionDepth * 0.7); // 30% a 100% de resistencia
        player.waterResistance = resistanceFactor;
        
        // Aplicar resistencia al movimiento horizontal
        if (player.isApplyingThrust) {
            // Con jetpack, resistencia horizontal reducida para permitir movimiento
            player.vx *= (1 - resistanceFactor * 0.3); // Solo 30% de la resistencia normal
        } else {
            player.vx *= (1 - resistanceFactor);
        }
        
        // Aplicar resistencia al movimiento vertical
        if (!player.isApplyingThrust) {
            player.vy *= (1 - resistanceFactor);
        } else {
            // Con jetpack, resistencia moderada para ascenso más lento
            player.vy *= (1 - resistanceFactor * 0.4); // 40% de la resistencia normal
        }
        
        // Empujar al héroe hacia arriba si está muy sumergido
        if (submersionDepth > 0.1) {
            if (player.isApplyingThrust) {
                // Con jetpack, empuje moderado hacia arriba
                const pushForce = submersionDepth * 0.8; // Empuje moderado con jetpack
                player.vy -= pushForce;
            } else {
                // Sin jetpack, empuje moderado
                const pushForce = submersionDepth * 0.5;
                player.vy -= pushForce;
            }
        }
        
        // Aplicar gravedad adicional solo si no está usando jetpack
        if (submersionDepth < 0.3 && !player.isApplyingThrust) { // Solo si no está muy sumergido y no usa jetpack
            const additionalGravity = 0.3;
            player.vy += additionalGravity;
        }
    } else {
        // El héroe no está en agua
        player.isInWater = false;
        player.waterSubmersionLevel = 0;
        player.waterResistance = 0;
    }
};

const resolvePlayerWallCollision = (store: GameStore, wall: Wall) => {
    const { player } = store;
    if (wall.type === 'lava' || wall.tile === 'K') {
        playerDie(store, undefined, true); // Pasar flag de muerte por lava
        return;
    }
    
    // Agua: manejar sumersión progresiva
    if (wall.type === 'water') {
        handleWaterCollision(store, wall);
        return; // No aplicar colisión de bloqueo normal
    }
    
    // Paredes aplastantes: siempre matan al jugador
    if (wall.type === 'crushing') {
        playerDie(store);
        return;
    }

    const overlapX = player.hitbox.x + player.hitbox.width / 2 - (wall.x + TILE_SIZE / 2);
    const overlapY = player.hitbox.y + player.hitbox.height / 2 - (wall.y + TILE_SIZE / 2);
    const combinedHalfWidths = player.hitbox.width / 2 + TILE_SIZE / 2;
    const combinedHalfHeights = player.hitbox.height / 2 + TILE_SIZE / 2;

    if (Math.abs(overlapX) / combinedHalfWidths > Math.abs(overlapY) / combinedHalfHeights) {
        if (overlapX > 0) {
            player.x = wall.x + TILE_SIZE - TILE_SIZE / 4;
        } else {
            player.x = wall.x - player.width + TILE_SIZE / 4;
        }
        player.vx = 0;
    } else {
        if (overlapY > 0) {
            player.y = wall.y + TILE_SIZE;
            player.vy = 0;
        } else {
            // Verificar si el tile está en un bloque con altura
            const isHeightBlock = isInHeightBlock(wall, store.walls);
            const isTop = isTopBlock(wall, store.walls);
            
            // Si el héroe está cayendo (vy > 0) y el tile está en un bloque con altura
            // pero NO es el bloque superior, permitir que pase a través
            if (player.vy > 0 && isHeightBlock && !isTop) {
                // No hacer nada - permitir que el héroe pase a través del bloque intermedio
                return;
            }
            
            player.y = wall.y - player.height;
            if (!player.isApplyingThrust) {
                player.isGrounded = true;
                player.vy = 0;
            }
        }
    }
};

const resolvePlayerMinerCollision = (store: GameStore, miner: Miner) => {
    const { player } = store;
    const overlapX = player.hitbox.x + player.hitbox.width / 2 - (miner.x + miner.width / 2);
    const overlapY = player.hitbox.y + player.hitbox.height / 2 - (miner.y + miner.height / 2);
    const combinedHalfWidths = player.hitbox.width / 2 + miner.width / 2;
    const combinedHalfHeights = player.hitbox.height / 2 + miner.height / 2;

    if (Math.abs(overlapX) / combinedHalfWidths > Math.abs(overlapY) / combinedHalfHeights) {
        if (overlapX > 0) {
            player.x = miner.x + miner.width;
        } else {
            player.x = miner.x - player.width;
        }
        player.vx = 0;
    } else {
        if (overlapY > 0) {
            player.y = miner.y + miner.height;
            player.vy = 0;
        } else {
            player.y = miner.y - player.height;
            if (!player.isApplyingThrust) {
                player.isGrounded = true;
                player.vy = 0;
            }
        }
    }
    player.hitbox.x = player.x + TILE_SIZE / 4;
    player.hitbox.y = player.y;
};

const calculateEnergyDecrementRate = (levelLength: number): number => {
    // Nivel base: 22 filas = decremento base (0.1)
    // Para niveles más largos, decrementar más lento
    const baseLevelLength = 22;
    const decrementMultiplier = baseLevelLength / levelLength;
    return 0.1 * decrementMultiplier;
};

// Función para verificar si el jugador está en el suelo al inicializar
const checkInitialGrounding = (store: GameStore) => {
    const { player, walls, platforms } = store;
    
    // Verificar colisión con paredes (suelo)
    const playerBottom = player.y + player.height;
    const playerLeft = player.x;
    const playerRight = player.x + player.width;
    
    // Buscar pared debajo del jugador
    const wallBelow = walls.find(wall => {
        const wallTop = wall.y;
        const wallBottom = wall.y + wall.height;
        const wallLeft = wall.x;
        const wallRight = wall.x + wall.width;
        
        return wallTop >= playerBottom - 5 && // Tolerancia de 5px
               wallTop <= playerBottom + 5 &&
               playerLeft < wallRight &&
               playerRight > wallLeft;
    });
    
    if (wallBelow) {
        player.isGrounded = true;
        player.y = wallBelow.y - player.height;
        player.hitbox.y = player.y;
        player.vy = 0;
        return;
    }
    
    // Verificar colisión con plataformas
    const platformBelow = platforms.find(platform => {
        const platformTop = platform.y;
        const platformBottom = platform.y + platform.height;
        const platformLeft = platform.x;
        const platformRight = platform.x + platform.width;
        
        return playerBottom >= platformTop - 5 && // Tolerancia de 5px
               playerBottom <= platformTop + 5 &&
               playerLeft < platformRight &&
               playerRight > platformLeft;
    });
    
    if (platformBelow) {
        player.isGrounded = true;
        player.y = platformBelow.y - player.height;
        player.hitbox.y = player.y;
        player.vy = 0;
        return;
    }
    
    // Si no hay suelo, el jugador debe caer
    player.isGrounded = false;
};

export const resetPlayer = (store: GameStore, startX = TILE_SIZE * 1.5, startY = TILE_SIZE * 1.5) => {
    const { player } = store;
    Object.assign(player, {
        x: startX,
        y: startY,
        width: TILE_SIZE,
        height: TILE_SIZE * 2,
        hitbox: {
            x: startX + TILE_SIZE / 4,
            y: startY,
            width: TILE_SIZE / 2,
            height: TILE_SIZE * 2,
        },
        vx: 0,
        vy: 0,
        isApplyingThrust: false,
        isChargingFly: false,
        wantsToFly: false,
        flyChargeTimer: 0,
        isGrounded: false,
        direction: 1 as const,
        shootCooldown: 0,
        animationState: 'stand' as const,
        animationTick: 0,
        currentFrame: 0,
        deathTimer: 0,
        isFrozen: false,
        floatWaveTime: 0,
    });
    
    // Siempre empezar con energía máxima visual
    store.energy = MAX_ENERGY;
    
    // Calcular y almacenar la velocidad de decremento basada en la longitud del nivel
    const currentLevel = store.levelDesigns[store.currentLevelIndex];
    const levelLength = currentLevel ? currentLevel.length : 22;
    store.energyDecrementRate = calculateEnergyDecrementRate(levelLength);
    
    // Iniciar en estado floating - el héroe desciende desde arriba
    startFloatingEntry(store, startX, startY);
};

// Función para iniciar el estado floating al comenzar el juego/nivel
const startFloatingEntry = (store: GameStore, targetX: number, targetY: number) => {
    const { player } = store;
    const canvas = store.dom.canvas;
    
    if (!canvas) return;
    
    // Guardar la posición objetivo (donde debe aterrizar)
    player.respawnX = targetX;
    player.respawnY = targetY;
    
    // Posicionar al jugador desde arriba del viewport (trayecto más corto)
    player.x = targetX;
    player.y = store.cameraY - TILE_SIZE * 0.5; // Desde arriba del viewport (trayecto más corto)
    player.hitbox.x = player.x + TILE_SIZE / 4;
    player.hitbox.y = player.y;
    
    // Configurar estado de floating
    player.isFloating = true;
    player.isGrounded = false;
    player.vy = 8; // Aumentado de 6 para descenso más rápido
    player.vx = 0;
    player.animationState = 'fly';
    player.animationTick = 0;
    player.currentFrame = 0;
    player.floatWaveTime = 0;
    player.canWake = false;
    
    // Cambiar el estado del juego a floating
    store.gameState = 'floating';
};

export const handlePlayerInput = (store: GameStore) => {
    const { player, keys, bombs, lasers } = store;

    // Si el jugador está congelado, no procesar input
    if (player.isFrozen) {
        return;
    }

    // Si está flotando, despertar apenas esté en su posición de respawn
    if (store.gameState === 'floating' && player.isFloating) {
        const hasArrived = player.y >= player.respawnY && player.vy === 0;
        if (hasArrived && player.canWake) {
            const anyKeyPressed = keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown || keys.Space;
            if (anyKeyPressed) {
                player.isFloating = false;
                player.animationState = 'fly';
                store.gameState = 'playing';
                // Evitar disparo fantasma al despertar
                if (keys.Space) keys.Space = false;
            }
        }
        return;
    }

    if (keys.ArrowLeft) {
        player.vx = -PLAYER_SPEED;
        player.direction = -1;
    } else if (keys.ArrowRight) {
        player.vx = PLAYER_SPEED;
        player.direction = 1;
    } else {
        player.vx = 0;
    }

    player.wantsToFly = Boolean(keys.ArrowUp);

    if (keys.Space && player.shootCooldown === 0) {
        const laserX = player.direction === 1 ? player.x + player.width / 2 : player.x;
        const laserY = player.y + player.height / 4;
        lasers.push({
            x: laserX,
            y: laserY,
            width: 30,
            height: 5,
            vx: LASER_SPEED * player.direction,
            startX: laserX - 20,
        });
        player.shootCooldown = 4; // Reducido de 6 a 4 para disparos más rápidos
        
        // Reproducir sonido de láser
        playLaserSound();
    }

    if (keys.ArrowDown && player.isGrounded && bombs.length === 0 && store.bombsRemaining > 0) {
        const offsetX = player.direction === 1 ? TILE_SIZE / 2 : -(TILE_SIZE / 2);
        const bombWidth = TILE_SIZE / 1.5;
        const bombX = player.direction === 1
            ? player.x
            : player.x
        const bombY = player.y + player.height - TILE_SIZE;
        
        // Detectar si el jugador está sobre una plataforma
        let attachedPlatform = undefined;
        for (const platform of store.platforms) {
            const playerBottom = player.y + player.height;
            const onPlatform = 
                player.hitbox.x < platform.x + platform.width &&
                player.hitbox.x + player.hitbox.width > platform.x &&
                Math.abs(playerBottom - platform.y) < 5; // Tolerancia de 5px
            if (onPlatform) {
                attachedPlatform = platform;
                break;
            }
        }
        
        bombs.push({
            x: bombX,
            y: bombY,
            width: bombWidth,
            height: TILE_SIZE,
            fuse: BOMB_FUSE,
            animationTick: 0,
            currentFrame: 0,
            finalFrameProgress: 0,
            attachedPlatform,
        });
        
        // Decrementar bombas disponibles
        store.bombsRemaining--;
        
        // Reproducir sonido de mecha en loop usando coordenadas de la bomba
        playBombFireSound(bombX, bombY);
    }
};

export const emitParticles = (store: GameStore, x: number, y: number, count: number, color: string) => {
    // Detectar mobile y reducir partículas generadas
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
    const actualCount = isMobile ? Math.floor(count * 0.5) : count; // Reducir a la mitad en mobile
    
    // Limitar total de partículas en mobile
    const maxParticles = isMobile ? 50 : 200;
    const availableSlots = Math.max(0, maxParticles - store.particles.length);
    const finalCount = Math.min(actualCount, availableSlots);
    
    for (let i = 0; i < finalCount; i++) {
        store.particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * (color === 'white' ? 8 : 2),
            vy: (Math.random() - 0.5) * (color === 'white' ? 8 : 2) + (color === 'yellow' ? 4 : 0),
            size: Math.random() * 3 + 2,
            life: Math.random() * 30,
            color,
        });
    }
};

export const playerDie = (store: GameStore, killedByEnemy?: Enemy, killedByLava?: boolean) => {
    if (store.gameState === 'respawning' || store.gameState === 'gameover' || store.gameState === 'floating') {
        return;
    }
    
    // Si el jugador está en secuencia de fin de nivel, es invulnerable
    if (store.levelEndSequence) {
        return;
    }

    const { player } = store;
    
    // Reproducir sonido de perder vida y silenciar el resto
    stopAllSfxExceptLifedown();
    playLifedownSound();
    // Vibración al perder vida
    vibrate([50, 100, 50]);
    // Reanudar música cuando termine el sonido de perder vida (si no es game over)
    onLifedownEnded(() => {
        if (store.lives > 0 && store.gameState !== 'gameover') {
            playBackgroundMusic().catch(() => {});
        }
    });
    
    // Si muere por enemigo, matar al enemigo también (sin puntos)
    // EXCEPCIÓN: El tentáculo no debe desaparecer cuando mata al héroe
    if (killedByEnemy && killedByEnemy.type !== 'tentacle') {
        killedByEnemy.isDead = true;
        killedByEnemy.isHidden = true;
    }

    // Guardar posición de muerte para respawn (acotada a los límites del nivel)
    const levelWidthTiles = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
    const levelWidthPx = levelWidthTiles * TILE_SIZE;
    const clampedX = Math.max(0, Math.min(player.x, levelWidthPx - player.width));
    
    // Si murió por lava, buscar un tile seguro arriba para respawn
    if (killedByLava) {
        const level = store.levelDesigns[store.currentLevelIndex];
        const currentTileX = Math.floor((player.x + player.width / 2) / TILE_SIZE);
        const currentTileY = Math.floor((player.y + player.height) / TILE_SIZE);
        
        // Buscar hacia arriba un tile vacío con suelo debajo
        let safeTileY = currentTileY - 2; // Empezar 2 tiles arriba
        let foundSafe = false;
        
        for (let y = safeTileY; y >= 0; y--) {
            const tileAbove = level[y]?.[currentTileX];
            const tileBelow = level[y + 1]?.[currentTileX];
            
            // Buscar un espacio vacío con un tile sólido debajo (no lava)
            if (tileAbove === '0' && tileBelow && tileBelow !== '0' && tileBelow !== '3' && tileBelow !== 'K') {
                safeTileY = y;
                foundSafe = true;
                break;
            }
        }
        
        // Si no encontró un lugar seguro, subir al menos 3 tiles
        if (!foundSafe) {
            safeTileY = Math.max(0, currentTileY - 3);
        }
        
        player.respawnX = clampedX;
        player.respawnY = safeTileY * TILE_SIZE;
        player.respawnTileX = currentTileX;
        player.respawnTileY = safeTileY;
        player.respawnOffsetX = 0;
        player.respawnOffsetY = 0;
    } else {
        // Muerte normal (por enemigo u otro)
        player.respawnX = clampedX;
        player.respawnY = player.y;
        // Guardar también coordenadas de tile para un respawn exacto por grilla
        player.respawnTileX = Math.floor((player.x + player.width / 2) / TILE_SIZE);
        player.respawnTileY = Math.floor((player.y + player.height) / TILE_SIZE) - 1;
        // Guardar offsets sub-tile para evitar saltos horizontales/verticales
        player.respawnOffsetX = (player.x + player.width / 2) - (player.respawnTileX * TILE_SIZE + TILE_SIZE / 2);
        player.respawnOffsetY = (player.y + player.height) - ((player.respawnTileY + 1) * TILE_SIZE);
    }

    // Cambiar animación a muerte
    player.animationState = 'die';
    player.currentFrame = 0;
    player.animationTick = 0;
    // Reducir pausa de muerte para respawn más rápido
    player.deathTimer = 60; // Reducido de 90 para respawn más rápido
    store.lives = 1;
    // store.lives -= 1;
    store.gameState = 'respawning';

    if (store.lives <= 0) {
        window.setTimeout(() => {
            store.gameState = 'gameover';
            store.lastRunScore = store.score;
            const { gameoverModal } = store.dom.ui;
            
            // Mostrar modal de Game Over con puntuación
            if (gameoverModal) {
                const scoreEl = store.dom.ui.gameoverScoreValue ?? document.getElementById('gameover-score-value');
                if (scoreEl) {
                    scoreEl.textContent = store.lastRunScore.toString();
                    store.dom.ui.gameoverScoreValue = scoreEl as HTMLSpanElement;
                }
                gameoverModal.classList.remove('hidden');
            }

            // Desactivar controles móviles y destruir joystick para no bloquear clicks en overlay
            const mobileControlsEl = store.dom.ui.mobileControlsEl;
            if (mobileControlsEl) {
                mobileControlsEl.dataset.active = 'false';
            }
            if (store.joystickManager) {
                try { store.joystickManager.destroy(); } catch {}
                store.joystickManager = null;
            }
            // Resetear entradas de movimiento/disparo
            store.keys.ArrowUp = false;
            store.keys.ArrowDown = false;
            store.keys.ArrowLeft = false;
            store.keys.ArrowRight = false;
            store.keys.Space = false;
            
            // Pausar música de fondo
            pauseBackgroundMusic();
        }, 1500);
        return;
    }

    // Reaparecer desde arriba del viewport actual
    window.setTimeout(() => {
        const canvas = store.dom.canvas;
        if (!canvas) return;
        
        // Recalcular respawnX/Y desde las coordenadas de tile si están presentes
        if (player.respawnTileX !== undefined && player.respawnTileY !== undefined) {
            // Buscar un tile seguro cercano al deseado
            const safe = findSafeRespawnTile(store, player.respawnTileX, player.respawnTileY);
            player.respawnTileX = safe.x;
            player.respawnTileY = safe.y;
            const respawnPos = computeRespawnWorldPosition(store, safe.x, safe.y);
            player.respawnX = respawnPos.x;
            player.respawnY = respawnPos.y;
        }
        
        // Alinear cámara horizontalmente al bloque del respawn para evitar "saltar" en niveles anchos
        const BLOCK_WIDTH_TILES = 20;
        const blockWidthPx = BLOCK_WIDTH_TILES * TILE_SIZE;
        const playerCenterX = player.respawnX + player.width / 2;
        const respawnBlock = Math.floor(playerCenterX / blockWidthPx);
        const maxCameraX = Math.max(0, (levelWidthPx - canvas.width));
        store.cameraX = Math.max(0, Math.min(respawnBlock * blockWidthPx, maxCameraX));
        
        // Posicionar jugador en su X guardada y entrando desde arriba del viewport actual
        player.x = player.respawnX;
        player.y = store.cameraY - TILE_SIZE; // Desde arriba del viewport actual
        player.hitbox.x = player.x + (TILE_SIZE - 60) / 2;
        player.hitbox.y = player.y;
        player.animationState = 'fly';
        // Establecer en el último frame de P_fly para dar sensación de flotar
        const flyAnim = ANIMATION_DATA.P_fly;
        player.currentFrame = flyAnim.frames - 1; // Último frame
        player.animationTick = 0;
        player.isFloating = true;
        player.isGrounded = false;
        player.vy = 6; // Velocidad de descenso más rápida
        player.vx = 0;
        player.deathTimer = 0;
        player.floatWaveTime = 0; // Resetear tiempo de onda
        player.canWake = false;
        
        // Restaurar energía al 100% después de morir
        store.energy = MAX_ENERGY;
        
        store.gameState = 'floating'; // En este estado es inmortal hasta que presione una tecla
        
        // Ajustar la altura objetivo solo si hay despeje suficiente por encima
        if (player.respawnTileX !== undefined && player.respawnTileY !== undefined) {
            const level = store.levelDesigns[store.currentLevelIndex];
            const tilesNeeded = Math.ceil(player.height / TILE_SIZE);
            if (level) {
                let verticalClearance = 0;
                for (let ty = player.respawnTileY; ty >= 0; ty--) {
                    const tile = level[ty]?.[player.respawnTileX];
                    if ((tile ?? '0') === '0') {
                        verticalClearance += 1;
                    } else {
                        break;
                    }
                }
                
                if (verticalClearance > tilesNeeded) {
                    player.respawnY = player.respawnY - TILE_SIZE;
                }
            }
        }
    }, 1000);
};

// Verificar si una posición es segura para respawn
const isSafeRespawnPosition = (store: GameStore, tileX: number, tileY: number): boolean => {
    const level = store.levelDesigns[store.currentLevelIndex];
    const rows = level.length;
    const cols = level[0]?.length ?? 0;
    
    // Verificar límites
    if (tileX < 0 || tileX >= cols || tileY < 0 || tileY >= rows) return false;
    
    const isEmpty = (t: string | undefined) => (t ?? '0') === '0';
    const isSolid = (t: string | undefined) => !!t && t !== '0' && t !== '2' && t !== '3' && t !== 'K';
    const isDangerous = (t: string | undefined) => t === '2' || t === '3' || t === 'K'; // Agua, lava, columna lava
    
    // 1. El tile debe estar vacío
    const here = level[tileY]?.[tileX];
    if (!isEmpty(here)) return false;
    
    // 1b. Debe haber espacio libre para la altura del jugador (tile superior)
    const above = tileY > 0 ? level[tileY - 1]?.[tileX] : undefined;
    if (!isEmpty(above)) return false;
    
    // 2. Debe tener suelo sólido debajo (no lava, agua, o vacío)
    const below = level[tileY + 1]?.[tileX];
    if (!isSolid(below)) return false;
    
    // 3. Verificar que no esté tocando lava, agua o columnas de lava en tiles adyacentes
    const adjacentTiles = [
        { x: tileX - 1, y: tileY },     // Izquierda
        { x: tileX + 1, y: tileY },     // Derecha
        { x: tileX, y: tileY - 1 },     // Arriba
        { x: tileX, y: tileY + 1 },     // Abajo
        { x: tileX - 1, y: tileY - 1 }, // Diagonal superior izquierda
        { x: tileX + 1, y: tileY - 1 }, // Diagonal superior derecha
        { x: tileX - 1, y: tileY + 1 }, // Diagonal inferior izquierda
        { x: tileX + 1, y: tileY + 1 }, // Diagonal inferior derecha
    ];
    
    for (const adj of adjacentTiles) {
        if (adj.x >= 0 && adj.x < cols && adj.y >= 0 && adj.y < rows) {
            const adjTile = level[adj.y]?.[adj.x];
            if (isDangerous(adjTile)) return false;
        }
    }
    
    // 4. Verificar que no esté entre paredes aplastantes (H y J en la misma fila)
    const leftTile = tileX > 0 ? level[tileY]?.[tileX - 1] : undefined;
    const rightTile = tileX < cols - 1 ? level[tileY]?.[tileX + 1] : undefined;
    if (leftTile === 'H' && rightTile === 'J') return false; // Entre paredes aplastantes
    
    // 5. Verificar colisión con enemigos en esa posición
    const playerWidth = TILE_SIZE;
    const playerHeight = TILE_SIZE * 2;
    const testX = tileX * TILE_SIZE;
    const testY = tileY * TILE_SIZE;
    const testHitbox = {
        x: testX + playerWidth / 4,
        y: testY,
        width: playerWidth / 2,
        height: playerHeight,
    };
    
    // Verificar colisión con enemigos
    for (const enemy of store.enemies) {
        if (!enemy.isDead && !enemy.isHidden) {
            if (checkCollision(testHitbox, enemy)) {
                return false;
            }
        }
    }
    
    // 6. Verificar colisión con paredes aplastantes
    for (const wall of store.walls) {
        if (wall.type === 'crushing') {
            if (checkCollision(testHitbox, wall)) {
                return false;
            }
        }
    }
    
    return true;
};

// Buscar un tile seguro para respawn: vacío con suelo sólido (no lava ni agua) debajo
// y sin peligros adyacentes (paredes aplastantes, enemigos, lava, etc.)
const findSafeRespawnTile = (store: GameStore, desiredX: number, desiredY: number): { x: number; y: number } => {
    const level = store.levelDesigns[store.currentLevelIndex];
    const rows = level.length;
    const cols = level[0]?.length ?? 0;
    
    // Primero probar el deseado y hacia arriba algunas filas
    for (let dy = 0; dy <= 5; dy++) {
        const y = Math.max(0, desiredY - dy);
        const x = desiredX;
        if (isSafeRespawnPosition(store, x, y)) {
            return { x, y };
        }
    }
    
    // Explorar vecindario alrededor (radio creciente) buscando posición segura
    for (let radius = 1; radius <= 5; radius++) {
        // Priorizar búsqueda horizontal primero, luego vertical
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                // Saltar si está fuera del radio actual
                if (Math.abs(dx) < radius && Math.abs(dy) < radius) continue;
                
                const x = desiredX + dx;
                const y = Math.max(0, desiredY + dy);
                if (isSafeRespawnPosition(store, x, y)) {
                    return { x, y };
                }
            }
        }
    }
    
    // Fallback: buscar cualquier posición segura en el nivel
    for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols; x++) {
            if (isSafeRespawnPosition(store, x, y)) {
                return { x, y };
            }
        }
    }
    
    // Último fallback: clamp dentro del nivel
    return { x: Math.max(0, Math.min(desiredX, cols - 1)), y: Math.max(0, Math.min(desiredY, rows - 2)) };
};

const computeRespawnWorldPosition = (store: GameStore, tileX: number, tileY: number): { x: number; y: number } => {
    const { player } = store;
    const baseXCenter = tileX * TILE_SIZE + TILE_SIZE / 2;
    const offsetX = player.respawnOffsetX ?? 0;
    const rxCenter = baseXCenter + offsetX;
    const levelWidthTiles = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
    const levelWidthPx = levelWidthTiles * TILE_SIZE;
    const maxX = Math.max(levelWidthPx - player.width, 0);
    const respawnX = Math.max(0, Math.min(rxCenter - player.width / 2, maxX));
    const offsetY = player.respawnOffsetY ?? 0;
    const ryBottom = (tileY + 1) * TILE_SIZE + offsetY;
    const respawnY = Math.max(0, ryBottom - player.height);
    return { x: respawnX, y: respawnY };
};

const updateFlightState = (store: GameStore) => {
    const { player } = store;
    const canStartCharging = player.wantsToFly && player.isGrounded && !player.isApplyingThrust && !player.isChargingFly;
    if (canStartCharging) {
        player.isChargingFly = true;
        player.vy = -1;
        
        // Emitir partículas inmediatamente
        const baseOffsetX = player.direction === 1 ? player.width / 10 : player.width - player.width / 10;
        const jetX = player.x + baseOffsetX;
        const jetY = player.y + player.height - 42;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
        const jetParticleCount = isMobile ? 8 : 20; // Más partículas al inicio
        emitParticles(store, jetX, jetY, jetParticleCount, 'yellow');
        
        // El sonido se activará cuando la animación cambie a 'jump' (primer cuadro)
    }

    if (!player.wantsToFly) {
        player.isChargingFly = false;
        player.flyChargeTimer = 0;
        player.isApplyingThrust = false;
        
        // Detener sonido de jetpack
        stopJetpackSound();
    }

    if (player.isChargingFly) {
        player.flyChargeTimer++;
        player.vy = 0;
        
        // Continuar emitiendo partículas durante la carga
        const baseOffsetX = player.direction === 1 ? player.width / 10 : player.width - player.width / 10;
        const jetX = player.x + baseOffsetX;
        const jetY = player.y + player.height - 42;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
        const jetParticleCount = isMobile ? 5 : 15;
        emitParticles(store, jetX, jetY, jetParticleCount, 'yellow');
        
        if (player.flyChargeTimer >= 30) {
            player.isChargingFly = false;
            player.flyChargeTimer = 0;
            player.isApplyingThrust = true;
        }
    } else if (player.wantsToFly && !player.isGrounded && !player.isApplyingThrust) {
        // Si el héroe está en el aire y presiona la tecla, activar inmediatamente
        player.isApplyingThrust = true;
        
        // Emitir partículas inmediatamente
        const baseOffsetX = player.direction === 1 ? player.width / 10 : player.width - player.width / 10;
        const jetX = player.x + baseOffsetX;
        const jetY = player.y + player.height - 42;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
        const jetParticleCount = isMobile ? 8 : 20; // Más partículas al inicio
        emitParticles(store, jetX, jetY, jetParticleCount, 'yellow');
        
        // El sonido se activará cuando la animación cambie a 'jump' (primer cuadro)
    }

    if (player.isApplyingThrust) {
        // Jetpack menos potente cuando está en agua para ascenso más lento
        const thrustPower = player.isInWater ? THRUST_POWER * 0.8 : THRUST_POWER;
        player.vy -= thrustPower;
        
        const baseOffsetX = player.direction === 1 ? player.width / 10 : player.width - player.width / 10;
        const jetX = player.x + baseOffsetX;
        const jetY = player.y + player.height - 42;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
        const jetParticleCount = isMobile ? 5 : 15;
        emitParticles(store, jetX, jetY, jetParticleCount, 'yellow');
        
        // El sonido ya está reproduciéndose desde el inicio, no necesitamos reproducirlo de nuevo
        // pero aseguramos que esté sonando
        playJetpackSound();
    } else if (!player.wantsToFly) {
        player.isApplyingThrust = false;
        
        // Detener sonido de jetpack solo si no se está usando
        stopJetpackSound();
    }

    if (!player.isChargingFly) {
        player.vy += GRAVITY;
    }

    if (player.vy < -MAX_UPWARD_SPEED) {
        player.vy = -MAX_UPWARD_SPEED;
    }
};

const updatePlayerPosition = (store: GameStore) => {
    const { player } = store;
    player.x += player.vx;
    player.y += player.vy;
    player.hitbox.x = player.x + TILE_SIZE / 4;
    player.hitbox.y = player.y;
};

const handleCollisions = (store: GameStore) => {
    const { player, walls, miner, platforms } = store;
    player.isGrounded = false;
    walls.forEach(wall => {
        if (checkCollision(player.hitbox, wall)) {
            resolvePlayerWallCollision(store, wall);
        }
    });

    if (miner && miner.animationState !== 'rescued') {
        // Colisión con el minero: usar solo el primer tile (lado expuesto)
        const frontRect = (() => {
            const tileWidth = TILE_SIZE;
            // Si el minero está pegado a la derecha (isFlipped = true), su lado expuesto es el izquierdo
            if (miner.isFlipped) {
                return { x: miner.x, y: miner.y, width: tileWidth, height: miner.height };
            }
            // Pegado a la izquierda (no flipped): lado expuesto es el derecho
            const x = miner.x + Math.max(0, miner.width - tileWidth);
            return { x, y: miner.y, width: tileWidth, height: miner.height };
        })();

        if (checkCollision(player.hitbox, frontRect)) {
            resolvePlayerMinerCollision(store, miner);
        }
    }

    // Colisión con plataformas (permiten pararse sobre lava)
    platforms.forEach(platform => {
        const willLand = player.vy >= 0;
        const intersects =
            player.hitbox.x < platform.x + platform.width &&
            player.hitbox.x + player.hitbox.width > platform.x &&
            player.hitbox.y + player.hitbox.height > platform.y &&
            player.hitbox.y + player.hitbox.height < platform.y + platform.height + 20; // tolerancia
        if (willLand && intersects) {
            player.y = platform.y - player.height;
            player.hitbox.y = player.y;
            player.isGrounded = true;
            player.vy = 0;
            // Activar plataforma en primer contacto
            if (!platform.isActive) {
                platform.isActive = true;
                // Determinar dirección inicial hacia la pared más cercana (izq/der)
                // Si player está a la izquierda del centro del nivel, moverse a la derecha, y viceversa
                const levelCenterX = (store.levelDesigns[store.currentLevelIndex][0].length * TILE_SIZE) / 2;
                platform.vx = (platform.x + platform.width / 2) < levelCenterX ? 4 : -4; // Aumento del 25% (2 * 1.25 = 2.5)
            }
            // Arrastrar al héroe con la plataforma
            player.x += platform.vx;
            player.hitbox.x = player.x + TILE_SIZE / 4;
        }
    });

    const levelWidth = store.levelDesigns[store.currentLevelIndex][0].length * TILE_SIZE;
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > levelWidth) {
        player.x = levelWidth - player.width;
    }

    player.hitbox.x = player.x + TILE_SIZE / 4;
    player.hitbox.y = player.y;
};

const updatePlayerAnimation = (store: GameStore) => {
    const { player } = store;
    
    // No cambiar animación si está congelado (rescatando miner) o en estado de éxito/muerte
    if (player.isFrozen || player.animationState === 'success' || player.animationState === 'die') {
        // Solo avanzar frames de la animación actual
        const animKey = `P_${player.animationState}` as keyof typeof ANIMATION_DATA;
        const anim = ANIMATION_DATA[animKey];
        if (anim) {
            player.animationTick++;
            if (player.animationTick >= anim.speed) {
                player.animationTick = 0;
                if (player.currentFrame < anim.frames - 1) {
                    player.currentFrame++;
                } else if (anim.loop !== false) {
                    player.currentFrame = 0;
                }
            }
        }
        return;
    }
    
    // Si está flotando (respawn), mantener el último frame de 'fly' sin animar
    if (player.isFloating && store.gameState === 'floating') {
        return; // No cambiar frame ni estado
    }
    
    let newState = player.animationState;
    if (player.isGrounded) {
        newState = player.isChargingFly ? 'jump' : player.vx === 0 ? 'stand' : 'walk';
    } else if (player.isApplyingThrust || player.isChargingFly) {
        if (player.animationState === 'jump' && player.currentFrame === ANIMATION_DATA.P_jump.frames - 1) {
            newState = 'fly';
        } else if (player.animationState !== 'fly') {
            newState = 'jump';
        }
    } else {
        newState = 'jump';
    }

    // Gestionar sonido de pasos
    if (newState === 'walk' && player.isGrounded) {
        playStepsSound();
    } else {
        stopStepsSound();
    }

    // CRÍTICO: Activar sonido de jetpack en el primer cuadro de la animación 'jump'
    // Cuando el estado cambia a 'jump' mientras quiere volar o está cargando
    if (player.animationState !== newState && newState === 'jump' && (player.isChargingFly || player.wantsToFly)) {
        playJetpackSound();
    }

    if (player.animationState !== newState) {
        player.animationState = newState;
        player.currentFrame = 0;
        player.animationTick = 0;
    }

    const animKey = `P_${player.animationState}` as keyof typeof ANIMATION_DATA;
    const anim = ANIMATION_DATA[animKey];
    if (!anim) {
        return;
    }
    player.animationTick++;
    if (player.animationTick < anim.speed) {
        return;
    }

    player.animationTick = 0;
    if (anim.reverse) {
        player.currentFrame = (player.currentFrame - 1 + anim.frames) % anim.frames;
        return;
    }

    if (anim.loop === false) {
        player.currentFrame = Math.min(player.currentFrame + 1, anim.frames - 1);
        return;
    }
    player.currentFrame = (player.currentFrame + 1) % anim.frames;
};

export const updatePlayer = (store: GameStore) => {
    const { player } = store;
    
    if (store.isPaused) {
        stopJetpackSound();
        stopStepsSound();
        return;
    }
    
    // Si está flotando, aplicar movimiento horizontal y descenso hacia posición objetivo
    if (player.isFloating && store.gameState === 'floating') {
        player.animationState = 'fly';
        
        // Incrementar tiempo para movimiento ondulatorio
        player.floatWaveTime += 0.05;
        
        // Aplicar movimiento horizontal
        player.x += player.vx;
        player.hitbox.x = player.x + (TILE_SIZE - 60) / 2;
        
        // Descender hacia la posición objetivo si no ha llegado
        if (player.y < player.respawnY) {
            player.y += player.vy;
        } else {
            // Ha llegado a la posición objetivo: flotar quieto y permitir despertar
            player.y = player.respawnY;
            player.vy = 0;
            
            const footTileX = Math.floor((player.x + player.width / 2) / TILE_SIZE);
            const footTileY = Math.floor((player.y + player.height - 1) / TILE_SIZE);
            const levelRows = store.levelDesigns[store.currentLevelIndex]?.length ?? 0;
            
            if (!isSafeRespawnPosition(store, footTileX, footTileY)) {
                let searchY = footTileY + 1;
                let foundSafe = false;
                
                while (searchY < levelRows - 1) {
                    if (isSafeRespawnPosition(store, footTileX, searchY)) {
                        foundSafe = true;
                        break;
                    }
                    searchY++;
                }
                
                if (foundSafe) {
                    const respawnPos = computeRespawnWorldPosition(store, footTileX, searchY);
                    player.respawnTileX = footTileX;
                    player.respawnTileY = searchY;
                    player.respawnX = respawnPos.x;
                    player.respawnY = respawnPos.y;
                    player.x = respawnPos.x;
                    player.y = Math.max(0, respawnPos.y - TILE_SIZE);
                    player.hitbox.x = player.x + (TILE_SIZE - 60) / 2;
                    player.hitbox.y = player.y;
                    player.vy = Math.max(player.vy, 6);
                    player.canWake = false;
                    return;
                }
            }
            
            player.canWake = true;
        }
        
        // Actualizar hitbox (el waveOffset se aplicará solo en el renderizado)
        player.hitbox.y = player.y;
        
        // Generar partículas de chispas del propulsor (menos intensas en mobile)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                        (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
        const particleChance = isMobile ? 0.05 : 0.15; // Menos partículas en mobile
        if (Math.random() < particleChance) {
            store.particles.push({
                x: player.x + player.width / 2 + (Math.random() - 0.5) * 10,
                y: player.y + player.height - 5,
                vx: (Math.random() - 0.5) * 1.5,
                vy: Math.random() * 2 + 1, // Caen hacia abajo
                life: 15 + Math.random() * 10, // Vida más corta
                color: Math.random() > 0.5 ? '#ff8800' : '#ffaa00',
                size: 1 + Math.random() * 1.5, // Más pequeñas
            });
        }
        
        // Mantener límites del nivel horizontalmente (importante en niveles anchos)
        const levelWidthTiles = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
        const levelWidthPx = levelWidthTiles * TILE_SIZE;
        player.x = Math.max(0, Math.min(player.x, levelWidthPx - player.width));
        player.hitbox.x = player.x + (TILE_SIZE - 60) / 2;
        
        updatePlayerAnimation(store);
        return;
    }

    updateFlightState(store);
    updatePlayerPosition(store);
    handleCollisions(store);

    if (player.shootCooldown > 0) {
        player.shootCooldown--;
    }

    // Decrementar energía automáticamente como temporizador con velocidad variable
    // (solo si no estamos en la secuencia de fin de nivel ni pausados)
    if (!store.levelEndSequence && !store.isPaused) {
        store.energy = Math.max(0, store.energy - store.energyDecrementRate);
        
        // Si la energía llega a 0, el jugador muere (solo si no está en secuencia de fin de nivel)
        if (store.energy <= 0 && store.gameState === 'playing' && !store.levelEndSequence) {
            playerDie(store);
        }
    }

    updatePlayerAnimation(store);
};

export const checkEnemyCollision = (store: GameStore) => {
    const { player, enemies } = store;
    
    // Si el jugador está en secuencia de fin de nivel, es invulnerable
    if (store.levelEndSequence) {
        return;
    }
    enemies.forEach(enemy => {
        if (enemy.type === 'viper' && !enemy.isHidden && !enemy.isDead && enemy.initialX !== undefined) {
            let headHitbox: Enemy | null = null;
            if (enemy.direction === 1) {
                headHitbox = {
                    ...enemy,
                    x: enemy.initialX + TILE_SIZE,
                    width: enemy.x - enemy.initialX,
                    height: 30,
                    y: enemy.y + (TILE_SIZE - 30) / 2,
                };
            } else {
                headHitbox = {
                    ...enemy,
                    width: enemy.initialX - enemy.x,
                    height: 30,
                    y: enemy.y + (TILE_SIZE - 30) / 2,
                };
            }
            if (headHitbox && headHitbox.width > 0 && checkCollision(player.hitbox, headHitbox)) {
                playerDie(store, enemy);
            }
        } else if (enemy.type === 'tentacle' && !enemy.isHidden && !enemy.isDead) {
            // Colisión específica del tentáculo: solo la caja de colisión de 75px de alto
            const collisionHeight = enemy.collisionHeight ?? 75;
            const collisionY = enemy.y + enemy.height - collisionHeight; // Alineado debajo
            
            const tentacleHitbox = {
                x: enemy.x,
                y: collisionY,
                width: enemy.width,
                height: collisionHeight,
            };
            
            if (checkCollision(player.hitbox, tentacleHitbox)) {
                playerDie(store, enemy);
            }
        } else if (!enemy.isHidden && !enemy.isDead && checkCollision(player.hitbox, enemy)) {
            playerDie(store, enemy);
        }
    });
};

