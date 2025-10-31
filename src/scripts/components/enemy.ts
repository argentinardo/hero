/**
 * Lógica de enemigos del juego H.E.R.O.
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * 
 * **Single Responsibility Principle (SRP)**:
 * - Este módulo es responsable ÚNICAMENTE de la lógica de enemigos:
 *   * Actualización de enemigos (updateEnemies)
 *   * Actualización del minero (updateMiner)
 *   * Animaciones de enemigos
 *   * IA básica de enemigos
 * 
 * **Open/Closed Principle (OCP)**:
 * - Sistema extensible: Para agregar un nuevo tipo de enemigo, solo se agrega un nuevo case en el switch
 * - No requiere modificar funciones existentes (ej: updateBat, updateSpider, etc.)
 * - Ejemplo: Agregar 'dragon' solo requiere nuevo case, no modificar código existente
 * 
 * **Liskov Substitution Principle (LSP)**:
 * - Todos los enemigos implementan Enemy interface (compatible con funciones genéricas)
 * - Consistentes en estructura (todos tienen x, y, width, height, type, etc.)
 * 
 * EJEMPLO DE EXTENSIBILIDAD (OCP):
 * ```typescript
 * case 'dragon': {
 *     // Nuevo tipo de enemigo sin modificar código existente
 *     updateDragon(enemy, store);
 *     break;
 * }
 * ```
 * 
 * MEJORA FUTURA (implementada en src/scripts/solid/):
 * - Sistema de enemigos con interfaces segregadas (ISP)
 * - Factory pattern para creación de enemigos
 * - Strategy pattern para IA intercambiable
 * 
 * @see ARCHITECTURE_DECISIONS.md - Para más detalles sobre decisiones técnicas
 * @see src/scripts/solid/entities/enemies/ - Versión refactorizada con SOLID completo
 */

import { ANIMATION_DATA } from '../core/assets';
import { TILE_SIZE } from '../core/constants';
import type { GameStore } from '../core/types';
import { loadLevel } from './level';
import { awardExtraLifeByScore } from './ui';
import { playEnergyDrainSound, stopEnergyDrainSound, playBombSound, stopBombSound, playSuccessLevelSound, onSuccessLevelEnded, playLaserSound, playTentacleSound } from './audio';

/**
 * Actualiza todos los enemigos del juego.
 * 
 * APLICA OCP (Open/Closed Principle):
 * - Abierto para extensión: Agregar nuevos tipos de enemigos solo requiere nuevo case
 * - Cerrado para modificación: No requiere modificar lógica existente
 * 
 * @param store - Estado global del juego
 */
export const updateEnemies = (store: GameStore) => {
    // Si está pausado, no actualizar enemigos
    if (store.isPaused) return;
    
    const canvasWidth = store.dom.canvas?.width ?? 0;
    const player = store.player;
    
    store.enemies.forEach(enemy => {
        // No procesar animación para tentáculo muerto
        if (!(enemy.type === 'tentacle' && enemy.tentacleState === 'dying')) {
            const anim = ANIMATION_DATA[enemy.tile as keyof typeof ANIMATION_DATA];
            if (anim) {
                enemy.spriteTick += 1;
                if (enemy.spriteTick >= anim.speed) {
                    enemy.spriteTick = 0;
                    enemy.currentFrame = (enemy.currentFrame + 1) % anim.frames;
                }
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
                // Comportamiento del tentáculo: deslizarse por toda el agua siguiendo al héroe
                const player = store.player;
                
                // Calcular distancia al jugador
                const dx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
                const dy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Determinar dirección para el espejado (mirar al héroe)
                enemy.direction = dx > 0 ? 1 : -1; // 1 = derecha, -1 = izquierda
                
                // Movimiento del tentáculo: limitado por la fila de agua de abajo
                // Solo moverse si no está muriendo
                if (enemy.tentacleState !== 'dying') {
                    const followSpeed = 2.0; // Velocidad de seguimiento
                    
                    // Función para encontrar el rango de agua en una fila específica
                    const findWaterRangeInRow = (rowIndex: number): { start: number, end: number } | null => {
                        if (rowIndex < 0 || rowIndex >= store.levelDesigns[store.currentLevelIndex].length) {
                            return null;
                        }
                        
                        const row = store.levelDesigns[store.currentLevelIndex][rowIndex];
                        if (!row) return null;
                        
                        let start = -1;
                        let end = -1;
                        
                        // Encontrar el primer y último tile de agua en la fila
                        for (let i = 0; i < row.length; i++) {
                            if (row[i] === '2') {
                                if (start === -1) start = i;
                                end = i;
                            }
                        }
                        
                        return start !== -1 ? { start, end } : null;
                    };
                    
                    // Verificar si hay agua en la fila de abajo del tentáculo
                    const tentacleBottomRow = Math.floor((enemy.y + enemy.height) / TILE_SIZE);
                    const waterRange = findWaterRangeInRow(tentacleBottomRow);
                    
                    if (waterRange) {
                        const waterStartX = waterRange.start * TILE_SIZE;
                        const waterEndX = (waterRange.end + 1) * TILE_SIZE;
                        
                        // Calcular posición objetivo basada en el héroe
                        const playerGridX = Math.floor(player.x / TILE_SIZE);
                        let targetX = enemy.x; // Mantener posición actual por defecto
                        
                        // Si el héroe está en la misma fila de agua, seguir su posición X
                        if (playerGridX >= waterRange.start && playerGridX <= waterRange.end) {
                            targetX = player.x;
                        } else {
                            // Si el héroe está fuera del agua, moverse hacia el extremo más cercano
                            if (playerGridX < waterRange.start) {
                                targetX = waterStartX;
                            } else if (playerGridX > waterRange.end) {
                                targetX = waterEndX - enemy.width;
                            }
                        }
                        
                        // Moverse hacia la posición objetivo
                        const moveDx = targetX - enemy.x;
                        if (Math.abs(moveDx) > 2) {
                            const moveDirection = moveDx > 0 ? 1 : -1;
                            enemy.x += moveDirection * followSpeed;
                            
                            // Asegurar que se mantenga dentro del agua
                            enemy.x = Math.max(waterStartX, Math.min(waterEndX - enemy.width, enemy.x));
                        }
                    }
                }
                
                // Actualizar animación según el estado
                if (enemy.tentacleState === 'standby') {
                    // Frames 0-14 en loop para standby (frames 1-15 en numeración 1-based)
                    // Velocidad reducida a la mitad: cada 6 frames del juego = 1 frame de animación
                    enemy.tentacleAnimationSpeed = (enemy.tentacleAnimationSpeed ?? 0) + 1;
                    if (enemy.tentacleAnimationSpeed >= 6) { // Cada 6 frames del juego (el doble más lento)
                        enemy.tentacleAnimationSpeed = 0;
                        enemy.tentacleFrame = (enemy.tentacleFrame ?? 0) + 1;
                        if (enemy.tentacleFrame >= 15) {
                            enemy.tentacleFrame = 0; // Loop de frames 0-14
                        }
                    }

                    // Si el héroe está cerca, cambiar a modo latigazo (solo si no está muriendo)
                    if (distance < 150 && enemy.tentacleState === 'standby') { // Distancia de activación más amplia (antes era 80)
                        enemy.tentacleState = 'whipping';
                        enemy.tentacleFrame = 15; // Empezar desde el frame 15 (frame 16 en numeración 1-based)
                        enemy.tentacleAnimationSpeed = 0; // Resetear contador de animación
                    }
                } else if (enemy.tentacleState === 'whipping') {
                    // Frames 15-26 para latigazo (frames 16-27 en numeración 1-based)
                    // Velocidad reducida a un tercio: cada 3 frames del juego = 1 frame de animación
                    enemy.tentacleAnimationSpeed = (enemy.tentacleAnimationSpeed ?? 0) + 1;
                    if (enemy.tentacleAnimationSpeed >= 3) { // Cada 3 frames del juego
                        enemy.tentacleAnimationSpeed = 0;
                        enemy.tentacleFrame = (enemy.tentacleFrame ?? 15) + 1;

                        // Reproducir sonido del latigazo en el primer frame del latigazo (frame 15)
                        if (enemy.tentacleFrame === 16) { // Segundo frame del latigazo para dar tiempo al sonido
                            // Reproducir sonido del latigazo del tentáculo
                            playTentacleSound();
                        }

                        // Cuando termine la animación de latigazo (hasta el frame 26), volver a standby
                        // La animación SIEMPRE debe llegar hasta el frame 26, sin importar el contacto
                        if (enemy.tentacleFrame > 26) {
                            enemy.tentacleState = 'standby';
                            enemy.tentacleFrame = 0;
                        }
                    }
                } else if (enemy.tentacleState === 'dying') {
                    // Estado de muerte: mantener el frame 27 y aplicar física de salto/caída
                    enemy.tentacleFrame = 26;
                    
                    // Aplicar gravedad al tentáculo moribundo
                    enemy.vy += 0.5; // Gravedad
                    enemy.y += enemy.vy; // Aplicar movimiento vertical
                    
                    // Decrementar temporizador de muerte
                    if (enemy.deathTimer !== undefined) {
                        enemy.deathTimer--;
                        if (enemy.deathTimer <= 0) {
                            // Después de mostrar el frame de muerte por medio segundo, hacer que el tentáculo caiga como entidad
                            store.fallingEntities.push({
                                x: enemy.x,
                                y: enemy.y,
                                width: enemy.width,
                                height: enemy.height,
                                vy: enemy.vy, // Usar la velocidad actual del tentáculo
                                vx: 0, // Sin movimiento horizontal
                                tile: enemy.tile,
                                rotation: 0,
                                rotationSpeed: 0, // Sin rotación
                                // Propiedades específicas para el tentáculo muerto
                                tentacleFrame: 26, // Frame de muerte fijo
                                tentacleState: 'dying',
                            });
                            // Eliminar el tentáculo de la lista de enemigos
                            enemy.isHidden = true;
                        }
                    }
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

    // Fase 1: Drenar energía (VIRTUAL - solo para puntos y efectos visuales)
    if (store.levelEndSequence === 'energy') {
        // Timeout de seguridad: si lleva más de 5 segundos drenando, forzar el paso siguiente
        if (store.levelEndTimer > 300) { // 300 frames = 5 segundos a 60fps
            stopEnergyDrainSound();
            store.virtualEnergyDrain = null;
            store.levelEndSequence = 'bombs';
            store.levelEndTimer = 0;
            return;
        }

        // Reproducir sonido de drenaje de energía en loop
        playEnergyDrainSound();

        // Crear una variable virtual para el drenaje (no afecta la energía real del héroe)
        if (store.virtualEnergyDrain === null || store.virtualEnergyDrain === undefined) {
            store.virtualEnergyDrain = store.energy; // Inicializar con la energía actual
        }

        // Reducir energía virtual gradualmente
        if (store.virtualEnergyDrain > 0) {
            const energyToReduce = Math.min(ENERGY_DRAIN_SPEED, store.virtualEnergyDrain);
            store.virtualEnergyDrain -= energyToReduce;
            
            // Sumar puntos por la energía drenada virtualmente
            const pointsToAdd = Math.floor(energyToReduce * POINTS_PER_ENERGY);
            store.score += pointsToAdd;
            awardExtraLifeByScore(store);
            
            // La actualización visual de la barra de energía se maneja en drawHud usando virtualEnergyDrain
        } else {
            // Energía virtual llegó a 0, detener el sonido de drenaje de energía
            stopEnergyDrainSound();
            
            // Dejar un mínimo de energía (0.1% de 200 = 0.2) para evitar muerte del héroe
            const MIN_ENERGY = 15;
            store.energy = MIN_ENERGY;
            store.virtualEnergyDrain = 0; // Mantener en 0 para visual
            
            // Pasar a la siguiente fase: explotar bombas
            store.levelEndSequence = 'bombs';
            store.levelEndTimer = 0;
        }
        return;
    }

    // Fase 2: Explotar dinamitas una por una
    if (store.levelEndSequence === 'bombs') {
        // Si no hay bombas, pasar directamente al siguiente nivel
        if (store.bombsRemaining === 0) {
            store.levelEndSequence = 'complete';
            store.levelEndTimer = 0;
            return;
        }
        
        // Explotar una dinamita cada BOMB_EXPLOSION_INTERVAL frames
        if (store.levelEndTimer % BOMB_EXPLOSION_INTERVAL === 0) {
            store.bombsRemaining -= 1;
            store.score += POINTS_PER_BOMB;
            awardExtraLifeByScore(store);
            
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
            
            // Si era la última bomba, completar la secuencia
            if (store.bombsRemaining === 0) {
                store.levelEndSequence = 'complete';
                store.levelEndTimer = 0;
            }
        }
        return;
    }

    // Fase 3: Completar nivel
    if (store.levelEndSequence === 'complete') {
        // Avanzar al siguiente nivel después de un breve delay
        window.setTimeout(() => {
            store.currentLevelIndex += 1;
            loadLevel(store);
            // Reanudar música de fondo al iniciar el nuevo nivel
            try { const { playBackgroundMusic } = require('./audio'); playBackgroundMusic().catch(() => {}); } catch {}
        }, 2000); // 2 segundos de delay
        
        // Limpiar la secuencia de fin de nivel y energía virtual
        store.levelEndSequence = null;
        store.levelEndTimer = 0;
        store.virtualEnergyDrain = null;
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

