import { TILE_SIZE, GRAVITY, PLAYER_SPEED, THRUST_POWER, MAX_UPWARD_SPEED, LASER_SPEED, MAX_ENERGY, BOMB_FUSE } from '../core/constants';
import { ANIMATION_DATA } from '../core/assets';
import type { Enemy, GameStore, Miner, Wall } from '../core/types';
import { checkCollision, isInHeightBlock, isTopBlock } from '../core/collision';
import { playJetpackSound, stopJetpackSound, playLaserSound, playLifedownSound } from './audio';

const resolvePlayerWallCollision = (store: GameStore, wall: Wall) => {
    const { player } = store;
    if (wall.type === 'lava') {
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
    });
    
    // Siempre empezar con energía máxima visual
    store.energy = MAX_ENERGY;
    
    // Calcular y almacenar la velocidad de decremento basada en la longitud del nivel
    const currentLevel = store.levelDesigns[store.currentLevelIndex];
    const levelLength = currentLevel ? currentLevel.length : 22;
    store.energyDecrementRate = calculateEnergyDecrementRate(levelLength);
};

export const handlePlayerInput = (store: GameStore) => {
    const { player, keys, bombs, lasers } = store;

    // Si el jugador está congelado, no procesar input
    if (player.isFrozen) {
        return;
    }

    // Si está flotando, permitir movimiento y cualquier tecla salir del estado
    if (store.gameState === 'floating' && player.isFloating) {
        // Permitir movimiento horizontal
        if (keys.ArrowLeft) {
            player.vx = -PLAYER_SPEED;
            player.direction = -1;
        } else if (keys.ArrowRight) {
            player.vx = PLAYER_SPEED;
            player.direction = 1;
        } else {
            player.vx = 0;
        }

        // Cualquier tecla presionada sale del estado flotante
        const anyKeyPressed = keys.ArrowLeft || keys.ArrowRight || keys.ArrowUp || keys.ArrowDown || keys.Space;
        if (anyKeyPressed) {
            // Si es disparo láser, crear el láser
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
                player.shootCooldown = 6;
                
                // Reproducir sonido de láser
                playLaserSound();
            }
            
            // Salir del estado flotante (misma lógica para cualquier tecla)
            player.isFloating = false;
            player.animationState = 'fly';
            store.gameState = 'playing';
        }

        // Permitir vuelo (ArrowUp)
        player.wantsToFly = Boolean(keys.ArrowUp);
        
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
        player.shootCooldown = 6;
        
        // Reproducir sonido de láser
        playLaserSound();
    }

    if (keys.ArrowDown && player.isGrounded && bombs.length === 0) {
        const offsetX = player.direction === 1 ? TILE_SIZE / 2 : -(TILE_SIZE / 2);
        const bombWidth = TILE_SIZE / 1.5;
        const bombX = player.direction === 1
            ? player.x
            : player.x
        const bombY = player.y + player.height - TILE_SIZE;
        bombs.push({
            x: bombX,
            y: bombY,
            width: bombWidth,
            height: TILE_SIZE,
            fuse: BOMB_FUSE,
            animationTick: 0,
            currentFrame: 0,
        });
    }
};

export const emitParticles = (store: GameStore, x: number, y: number, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
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

export const playerDie = (store: GameStore, killedByEnemy?: Enemy) => {
    if (store.gameState === 'respawning' || store.gameState === 'gameover' || store.gameState === 'floating') {
        return;
    }

    const { player } = store;
    
    // Reproducir sonido de perder vida
    playLifedownSound();
    
    // Si muere por enemigo, matar al enemigo también (sin puntos)
    if (killedByEnemy) {
        killedByEnemy.isDead = true;
        killedByEnemy.isHidden = true;
    }

    // Guardar posición de muerte para respawn
    player.respawnX = player.x;
    player.respawnY = player.y;

    // Cambiar animación a muerte
    player.animationState = 'die';
    player.currentFrame = 0;
    player.animationTick = 0;
    player.deathTimer = 60;
    store.lives -= 1;
    store.gameState = 'respawning';

    if (store.lives <= 0) {
        window.setTimeout(() => {
            store.gameState = 'gameover';
            const { messageOverlay, messageText, messageTitle } = store.dom.ui;
            if (messageOverlay && messageText && messageTitle) {
                messageTitle.textContent = 'GAME OVER';
                messageText.textContent = `Puntuación final: ${store.score}. Presiona ENTER para volver al menú.`;
                messageOverlay.style.display = 'flex';
            }
        }, 1500);
        return;
    }

    // Reaparecer desde arriba del viewport actual
    window.setTimeout(() => {
        const canvas = store.dom.canvas;
        if (!canvas) return;
        
        // Aparecer desde arriba del viewport actual de la cámara
        player.x = player.respawnX;
        player.y = store.cameraY - TILE_SIZE; // Desde arriba del viewport actual
        player.hitbox.x = player.x + (TILE_SIZE - 60) / 2;
        player.hitbox.y = player.y;
        player.animationState = 'fly';
        player.isFloating = true;
        player.isGrounded = false;
        player.vy = 6; // Velocidad de descenso más rápida
        player.vx = 0;
        player.deathTimer = 0;
        store.gameState = 'floating';
        
        // Objetivo: posición de respawn un tile más arriba
        player.respawnY = player.respawnY - TILE_SIZE;
    }, 1000);
};

const updateFlightState = (store: GameStore) => {
    const { player } = store;
    const canStartCharging = player.wantsToFly && player.isGrounded && !player.isApplyingThrust && !player.isChargingFly;
    if (canStartCharging) {
        player.isChargingFly = true;
        player.vy = -1;
    }

    if (!player.wantsToFly) {
        player.isChargingFly = false;
        player.flyChargeTimer = 0;
        player.isApplyingThrust = false;
    }

    if (player.isChargingFly) {
        player.flyChargeTimer++;
        player.vy = 0;
        if (player.flyChargeTimer >= 30) {
            player.isChargingFly = false;
            player.flyChargeTimer = 0;
            player.isApplyingThrust = true;
        }
    } else if (player.wantsToFly && !player.isGrounded) {
        player.isApplyingThrust = true;
    }

    if (player.isApplyingThrust) {
        player.vy -= THRUST_POWER;
        const baseOffsetX = player.direction === 1 ? player.width / 10 : player.width - player.width / 10;
        const jetX = player.x + baseOffsetX;
        const jetY = player.y + player.height - 42;
        emitParticles(store, jetX, jetY, 15, 'yellow');
        
        // Reproducir sonido de jetpack
        playJetpackSound();
    } else {
        player.isApplyingThrust = false;
        
        // Detener sonido de jetpack
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
    const { player, walls, miner } = store;
    player.isGrounded = false;
    walls.forEach(wall => {
        if (checkCollision(player.hitbox, wall)) {
            resolvePlayerWallCollision(store, wall);
        }
    });

    if (miner && miner.animationState !== 'rescued' && checkCollision(player.hitbox, miner)) {
        resolvePlayerMinerCollision(store, miner);
    }

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
    
    // Si está flotando, aplicar movimiento horizontal y descenso hacia posición objetivo
    if (player.isFloating && store.gameState === 'floating') {
        player.animationState = 'fly';
        
        // Aplicar movimiento horizontal
        player.x += player.vx;
        player.hitbox.x = player.x + (TILE_SIZE - 60) / 2;
        
        // Descender hacia la posición objetivo si no ha llegado
        if (player.y < player.respawnY) {
            player.y += player.vy;
            player.hitbox.y = player.y;
        } else {
            // Ha llegado a la posición objetivo, detener descenso
            player.y = player.respawnY;
            player.hitbox.y = player.y;
            player.vy = 0;
        }
        
        // Mantener límites del canvas horizontalmente
        const canvas = store.dom.canvas;
        if (canvas) {
            player.x = Math.max(0, Math.min(player.x, canvas.width - player.width));
            player.hitbox.x = player.x + (TILE_SIZE - 60) / 2;
        }
        
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
    store.energy = Math.max(0, store.energy - store.energyDecrementRate);

    updatePlayerAnimation(store);
};

export const checkEnemyCollision = (store: GameStore) => {
    const { player, enemies } = store;
    enemies.forEach(enemy => {
        if (enemy.type === 'viper' && !enemy.isHidden && enemy.initialX !== undefined) {
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
        } else if (!enemy.isHidden && checkCollision(player.hitbox, enemy)) {
            playerDie(store, enemy);
        }
    });
};

