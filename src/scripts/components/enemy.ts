import { ANIMATION_DATA } from '../core/assets';
import { TILE_SIZE } from '../core/constants';
import type { GameStore } from '../core/types';
import { loadLevel } from './level';
import { playEnergyDrainSound, stopEnergyDrainSound, playBombSound, stopBombSound, playSuccessLevelSound, onSuccessLevelEnded } from './audio';

export const updateEnemies = (store: GameStore) => {
    // Si está pausado, no actualizar enemigos
    if (store.isPaused) return;
    
    const canvasWidth = store.dom.canvas?.width ?? 0;
    const player = store.player;
    
    store.enemies.forEach(enemy => {
        const anim = ANIMATION_DATA[enemy.tile as keyof typeof ANIMATION_DATA];
        if (anim) {
            enemy.spriteTick += 1;
            if (enemy.spriteTick >= anim.speed) {
                enemy.spriteTick = 0;
                enemy.currentFrame = (enemy.currentFrame + 1) % anim.frames;
            }
        }

        switch (enemy.type) {
            case 'bat': {
                enemy.x += enemy.vx;
                enemy.movementTick = (enemy.movementTick ?? 0) + 0.05;
                enemy.y = (enemy.initialY ?? enemy.y) + Math.sin(enemy.movementTick) * TILE_SIZE * 0.5;

                const gridX = Math.floor(enemy.x / TILE_SIZE);
                const gridY = Math.floor(enemy.y / TILE_SIZE);
                const gridXRight = Math.floor((enemy.x + enemy.width) / TILE_SIZE);
                const wallLeft = store.walls.find(w => w.x === gridX * TILE_SIZE && w.y === gridY * TILE_SIZE);
                const wallRight = store.walls.find(w => w.x === gridXRight * TILE_SIZE && w.y === gridY * TILE_SIZE);
                if (enemy.vx < 0 && (wallLeft || enemy.x < 0)) {
                    enemy.vx *= -1;
                }
                if (enemy.vx > 0 && (wallRight || enemy.x + enemy.width > canvasWidth)) {
                    enemy.vx *= -1;
                }
                break;
            }
            case 'spider': {
                enemy.y += enemy.vy;
                // El initialY real se ajusta 20px hacia arriba
                const initialY = (enemy.initialY ?? enemy.y);
                const maxLength = enemy.maxLength ?? TILE_SIZE * 2;
                if (enemy.vy > 0 && enemy.y >= initialY + maxLength) {
                    enemy.y = initialY + maxLength;
                    enemy.vy *= -1;
                }
                if (enemy.vy < 0 && enemy.y <= initialY) {
                    enemy.y = initialY;
                    enemy.vy *= -1;
                }
                break;
            }
            case 'viper': {
                const speed = 2;
                switch (enemy.state) {
                    case 'idle':
                        enemy.idleTimer = (enemy.idleTimer ?? 0) - 1;
                        if ((enemy.idleTimer ?? 0) <= 0) {
                            enemy.state = 'extending';
                            enemy.isHidden = false;
                        }
                        break;
                    case 'extending':
                        enemy.x += (enemy.direction ?? 1) * speed;
                        if (Math.abs(enemy.x - (enemy.initialX ?? enemy.x)) >= TILE_SIZE) {
                            enemy.x = (enemy.initialX ?? enemy.x) + (enemy.direction ?? 1) * TILE_SIZE;
                            enemy.state = 'waiting_extended';
                            enemy.waitTimer = 60;
                        }
                        break;
                    case 'waiting_extended':
                        enemy.waitTimer = (enemy.waitTimer ?? 0) - 1;
                        if ((enemy.waitTimer ?? 0) <= 0) {
                            enemy.state = 'retracting';
                        }
                        break;
                    case 'retracting':
                        enemy.x -= (enemy.direction ?? 1) * speed;
                        if ((enemy.direction === 1 && enemy.x <= (enemy.initialX ?? enemy.x)) ||
                            (enemy.direction === -1 && enemy.x >= (enemy.initialX ?? enemy.x))) {
                            enemy.x = enemy.initialX ?? enemy.x;
                            enemy.state = 'idle';
                            enemy.idleTimer = 60 + Math.random() * 60;
                            enemy.isHidden = true;
                        }
                        break;
                    default:
                        break;
                }
                break;
            }
            case 'tentacle': {
                // Calcular distancia al jugador
                const dx = (player.x + player.width / 2) - (enemy.initialX ?? enemy.x);
                const dy = (player.y + player.height / 2) - (enemy.initialY ?? enemy.y);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const speed = 3;
                
                switch (enemy.state) {
                    case 'idle':
                        // Permanece oculto en la lava
                        enemy.isHidden = true;
                        enemy.extensionLength = 0;
                        
                        // Detectar si el héroe está cerca
                        if (distance <= (enemy.detectionRange ?? TILE_SIZE * 4)) {
                            enemy.state = 'detecting';
                            enemy.detectionDelay = 30; // Delay de 30 frames
                        }
                        break;
                        
                    case 'detecting':
                        // Delay antes de atacar
                        enemy.detectionDelay = (enemy.detectionDelay ?? 0) - 1;
                        
                        // Si el héroe se aleja, volver a idle
                        if (distance > (enemy.detectionRange ?? TILE_SIZE * 4)) {
                            enemy.state = 'idle';
                            break;
                        }
                        
                        // Después del delay, atacar
                        if ((enemy.detectionDelay ?? 0) <= 0) {
                            enemy.state = 'attacking';
                            enemy.isHidden = false;
                            enemy.playerStillTimer = 0;
                        }
                        break;
                        
                    case 'attacking':
                        // Extender tentáculo hacia el jugador
                        const maxExtension = enemy.attackRange ?? TILE_SIZE * 6;
                        const targetExtension = Math.min(distance, maxExtension);
                        
                        // Mover el tentáculo hacia el jugador
                        if ((enemy.extensionLength ?? 0) < targetExtension) {
                            enemy.extensionLength = (enemy.extensionLength ?? 0) + speed;
                            
                            // Actualizar posición de la "cabeza" del tentáculo
                            const angle = Math.atan2(dy, dx);
                            enemy.x = (enemy.initialX ?? enemy.x) + Math.cos(angle) * (enemy.extensionLength ?? 0);
                            enemy.y = (enemy.initialY ?? enemy.y) + Math.sin(angle) * (enemy.extensionLength ?? 0);
                        } else {
                            // Ya alcanzó la extensión objetivo
                            enemy.extensionLength = targetExtension;
                            
                            // Actualizar posición siguiendo al jugador
                            const angle = Math.atan2(dy, dx);
                            enemy.x = (enemy.initialX ?? enemy.x) + Math.cos(angle) * targetExtension;
                            enemy.y = (enemy.initialY ?? enemy.y) + Math.sin(angle) * targetExtension;
                        }
                        
                        // Detectar si el jugador se queda quieto
                        if (Math.abs(player.vx) < 0.1 && Math.abs(player.vy) < 0.1) {
                            enemy.playerStillTimer = (enemy.playerStillTimer ?? 0) + 1;
                        } else {
                            enemy.playerStillTimer = 0;
                        }
                        
                        // Si el jugador se aleja mucho, retraer
                        if (distance > maxExtension + TILE_SIZE * 2) {
                            enemy.state = 'retracting';
                        }
                        break;
                        
                    case 'retracting':
                        // Retraer tentáculo a la posición inicial
                        if ((enemy.extensionLength ?? 0) > 0) {
                            enemy.extensionLength = Math.max(0, (enemy.extensionLength ?? 0) - speed * 2);
                            
                            // Mover hacia la posición inicial
                            const angle = Math.atan2(dy, dx);
                            enemy.x = (enemy.initialX ?? enemy.x) + Math.cos(angle) * (enemy.extensionLength ?? 0);
                            enemy.y = (enemy.initialY ?? enemy.y) + Math.sin(angle) * (enemy.extensionLength ?? 0);
                        } else {
                            // Ya se retrajo completamente
                            enemy.x = enemy.initialX ?? enemy.x;
                            enemy.y = enemy.initialY ?? enemy.y;
                            enemy.state = 'idle';
                            enemy.isHidden = true;
                        }
                        break;
                        
                    default:
                        break;
                }
                break;
            }
            default:
                break;
        }
    });
};

const handleLevelEndSequence = (store: GameStore) => {
    const ENERGY_DRAIN_SPEED = 2; // Puntos de energía que bajan por frame
    const BOMB_EXPLOSION_INTERVAL = 20; // Frames entre explosiones de dinamitas
    const POINTS_PER_ENERGY = 10; // Puntos por cada unidad de energía
    const POINTS_PER_BOMB = 100; // Puntos por cada dinamita

    store.levelEndTimer += 1;

    // Fase 1: Drenar energía
    if (store.levelEndSequence === 'energy') {
        // Reproducir sonido de drenaje de energía en loop
        playEnergyDrainSound();

        // Reducir energía gradualmente
        if (store.energy > 0) {
            const energyToReduce = Math.min(ENERGY_DRAIN_SPEED, store.energy);
            store.energy -= energyToReduce;
            
            // Sumar puntos por la energía drenada
            const pointsToAdd = Math.floor(energyToReduce * POINTS_PER_ENERGY);
            store.score += pointsToAdd;
            
            // Actualizar la barra de energía visualmente
            const energyBarEl = store.dom.ui.energyBarEl;
            if (energyBarEl) {
                const { updateEnergyBarColor } = require('./ui');
                updateEnergyBarColor(energyBarEl, store.energy, 200);
            }
        } else {
            // Energía llegó a 0, detener el sonido de drenaje de energía
            stopEnergyDrainSound();
            
            // Pasar a la siguiente fase: explotar bombas
            store.levelEndSequence = 'bombs';
            store.levelEndTimer = 0;
        }
        return;
    }

    // Fase 2: Explotar dinamitas una por una
    if (store.levelEndSequence === 'bombs') {
        if (store.bombsRemaining > 0) {
            // Explotar una dinamita cada BOMB_EXPLOSION_INTERVAL frames
            if (store.levelEndTimer % BOMB_EXPLOSION_INTERVAL === 0) {
                store.bombsRemaining -= 1;
                store.score += POINTS_PER_BOMB;
                
                // Reproducir sonido de explosión
                playBombSound();
                
                // Activar flash de explosión para efecto visual
                store.explosionFlash = 0.5;
                
                // Mostrar puntos flotantes en la posición del jugador/minero
                const displayX = store.miner?.x ?? store.player.x;
                const displayY = store.miner?.y ?? store.player.y;
                
                store.floatingScores.push({
                    x: displayX,
                    y: displayY - 20,
                    text: `+${POINTS_PER_BOMB}`,
                    life: 60,
                    opacity: 1,
                });
                
                // Si era la última bomba, detener el sonido de bomba y reproducir el sonido de éxito
                if (store.bombsRemaining === 0) {
                    stopBombSound();
                    playSuccessLevelSound();
                    
                    // Cuando termine el sonido, esperar 2 segundos más antes de cargar el nivel
                    onSuccessLevelEnded(() => {
                        window.setTimeout(() => {
                            store.currentLevelIndex += 1;
                            loadLevel(store);
                        }, 1000); // 1 segundo adicional después de que termine el sonido
                    });
                }
            }
        } else {
            // Todas las bombas explotaron, completar la secuencia
            store.levelEndSequence = 'complete';
            store.levelEndTimer = 0;
        }
        return;
    }
};

export const updateMiner = (store: GameStore) => {
    const miner = store.miner;
    if (!miner) {
        return;
    }
    
    // Si está pausado, no actualizar minero (excepto en secuencia de fin de nivel)
    if (store.isPaused && !store.levelEndSequence) return;

    const rescuedAnim = ANIMATION_DATA['9_rescued'];
    
    // Manejar la secuencia de fin de nivel
    if (store.levelEndSequence) {
        handleLevelEndSequence(store);
        
        // Continuar con la animación del minero
        if (miner.animationState === 'rescued' && miner.currentFrame === rescuedAnim.frames - 1) {
            return;
        }

        miner.animationTick += 1;
        if (miner.animationState === 'rescued') {
            const anim = ANIMATION_DATA['9_rescued'];
            if (miner.animationTick >= anim.speed) {
                miner.animationTick = 0;
                if (miner.currentFrame < anim.frames - 1) {
                    miner.currentFrame += 1;
                }
            }
        }
        return;
    }

    if (miner.animationState === 'rescued' && miner.currentFrame === rescuedAnim.frames - 1) {
        return;
    }

    miner.animationTick += 1;

    if (miner.animationState === 'idle') {
        const idleAnim = ANIMATION_DATA['9_idle'];
        if (miner.animationTick >= idleAnim.speed) {
            miner.animationTick = 0;
            miner.currentFrame += miner.animationDirection;
            if (miner.currentFrame >= idleAnim.frames - 1 || miner.currentFrame <= 0) {
                miner.animationDirection *= -1;
            }
        }
        return;
    }

    if (miner.animationState === 'rescued') {
        const anim = ANIMATION_DATA['9_rescued'];
        if (miner.animationTick >= anim.speed) {
            miner.animationTick = 0;
            if (miner.currentFrame < anim.frames - 1) {
                miner.currentFrame += 1;
            }

            if (miner.currentFrame >= anim.frames - 1) {
                // El nivel ya se incrementó en la función anterior, no hacerlo aquí
                // window.setTimeout(() => {
                //     store.currentLevelIndex += 1;
                //     loadLevel(store);
                // }, 2000);
            }
        }
    }
};

