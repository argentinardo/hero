import { ANIMATION_DATA } from '../core/assets';
import { TILE_SIZE } from '../core/constants';
import type { GameStore } from '../core/types';
import { loadLevel } from './level';

export const updateEnemies = (store: GameStore) => {
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
                // El tentáculo detecta al héroe y lo persigue con delay
                const detectionRange = TILE_SIZE * 4; // 4 tiles de rango de detección
                const attackRange = TILE_SIZE * 0.8; // Cuando está muy cerca, atacar
                const speed = 1.5;
                
                const distanceToPlayer = Math.hypot(
                    player.x + player.width / 2 - enemy.x,
                    player.y + player.height / 2 - enemy.y
                );
                
                // Determinar dirección hacia el jugador
                const directionX = player.x > enemy.x ? 1 : -1;
                enemy.direction = directionX;
                
                switch (enemy.state) {
                    case 'idle':
                        // Si el héroe está cerca, comenzar a perseguir con delay
                        if (distanceToPlayer < detectionRange) {
                            enemy.state = 'waiting_extended';
                            enemy.waitTimer = 30; // Delay antes de moverse
                        }
                        break;
                    case 'waiting_extended':
                        enemy.waitTimer = (enemy.waitTimer ?? 0) - 1;
                        if ((enemy.waitTimer ?? 0) <= 0) {
                            enemy.state = 'extending';
                        }
                        break;
                    case 'extending':
                        // Perseguir al héroe
                        if (distanceToPlayer > detectionRange * 1.5) {
                            // Si el héroe se alejó mucho, volver
                            enemy.state = 'retracting';
                        } else if (distanceToPlayer < attackRange) {
                            // Si está muy cerca, atacar
                            enemy.state = 'attacking';
                            enemy.waitTimer = 60; // Duración del ataque
                        } else {
                            // Moverse hacia el héroe (solo en X, ya que vive en lava)
                            const dx = player.x - enemy.x;
                            if (Math.abs(dx) > TILE_SIZE / 2) {
                                enemy.x += Math.sign(dx) * speed;
                            }
                        }
                        break;
                    case 'attacking':
                        // Durante el ataque, el tentáculo intenta agarrar al héroe
                        enemy.waitTimer = (enemy.waitTimer ?? 0) - 1;
                        // Si el héroe está en rango de ataque, causar daño
                        if (distanceToPlayer < attackRange * 1.5) {
                            // La colisión se maneja en checkEnemyCollision
                        }
                        if ((enemy.waitTimer ?? 0) <= 0) {
                            enemy.state = 'retracting';
                        }
                        break;
                    case 'retracting':
                        // Volver a la posición inicial
                        const distanceToHome = Math.abs(enemy.x - (enemy.initialX ?? enemy.x));
                        if (distanceToHome < speed) {
                            enemy.x = enemy.initialX ?? enemy.x;
                            enemy.state = 'idle';
                            enemy.idleTimer = 60; // Pausa antes de detectar de nuevo
                        } else {
                            const dxHome = (enemy.initialX ?? enemy.x) - enemy.x;
                            enemy.x += Math.sign(dxHome) * speed;
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

export const updateMiner = (store: GameStore) => {
    const miner = store.miner;
    if (!miner) {
        return;
    }

    const rescuedAnim = ANIMATION_DATA['9_rescued'];
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
                window.setTimeout(() => {
                    store.currentLevelIndex += 1;
                    loadLevel(store);
                }, 2000);
            }
        }
    }
};

