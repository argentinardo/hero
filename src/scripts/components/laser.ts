import type { GameStore, Wall } from '../core/types';
import { TILE_SIZE } from '../core/constants';
import { emitParticles } from './player';
import { playEnemyKillSound } from './audio';

const splitDestructibleWall = (store: GameStore, wall: Wall) => {
    const halfWidth = TILE_SIZE / 2;
    
    // Dividir el ladrillo en solo 2 mitades (izquierda y derecha)
    for (let i = 0; i < 2; i++) {
        const offsetX = i * halfWidth;
        store.fallingEntities.push({
            x: wall.x + offsetX,
            y: wall.y,
            width: halfWidth,
            height: TILE_SIZE,
            vy: Math.random() * -4 - 1,
            vx: (Math.random() - 0.5) * 6,
            tile: wall.tile,
            srcTileOffsetX: offsetX,
            srcTileOffsetY: 0,
        });
    }
};

// Cortar o eliminar una columna vertical entera según salud acumulada
const applyColumnCutOrRemove = (store: GameStore, baseGridX: number, action: 'half' | 'remove', side: 'left' | 'right') => {
    const colWalls = store.walls.filter(w => w.type === 'destructible_v' && Math.floor(w.x / TILE_SIZE) === baseGridX);
    const baseX = baseGridX * TILE_SIZE;

    if (action === 'remove') {
        // Dejar caer cualquier mitad restante y eliminar
        colWalls.forEach(wall => {
            // Usar el ancho actual de la pared (puede ser la mitad si ya fue cortada)
            const currentWidth = wall.visualWidth ?? wall.width;
            const currentX = wall.visualX ?? wall.x;
            const offsetX = wall.cutSide === 'left' ? TILE_SIZE / 2 : 0;
            
            // Soltar solo 2 mitades verticales con el ancho y textura correctos
            store.fallingEntities.push({ 
                x: currentX, 
                y: wall.y, 
                width: currentWidth, 
                height: TILE_SIZE, 
                vy: Math.random() * -4 - 1, 
                vx: (Math.random() - 0.5) * 6, 
                tile: wall.tile,
                srcTileOffsetX: offsetX,
                srcTileOffsetY: 0
            });
        });
        store.walls = store.walls.filter(w => !(w.type === 'destructible_v' && Math.floor(w.x / TILE_SIZE) === baseGridX));
        return;
    }

    // action === 'half'
    colWalls.forEach(wall => {
        // Si ya está a la mitad, no volver a cortar
        if (wall.visualWidth && wall.visualWidth <= TILE_SIZE / 2 + 0.01) return;
        if (side === 'left') {
            // Caer mitad izquierda - solo 1 fragmento completo
            store.fallingEntities.push({ 
                x: wall.x, 
                y: wall.y, 
                width: TILE_SIZE / 2, 
                height: TILE_SIZE, 
                vy: Math.random() * -4 - 1, 
                vx: (Math.random() - 0.5) * 6, 
                tile: wall.tile,
                srcTileOffsetX: 0,
                srcTileOffsetY: 0
            });
            // Conservar mitad derecha VISUALMENTE, pero mantener colisión completa
            wall.visualX = baseX + TILE_SIZE / 2;
            wall.visualWidth = TILE_SIZE / 2;
            wall.cutSide = 'left';
            // La colisión (wall.x y wall.width) permanece igual
        } else {
            // Caer mitad derecha - solo 1 fragmento completo
            const rightX = baseX + TILE_SIZE / 2;
            store.fallingEntities.push({ 
                x: rightX, 
                y: wall.y, 
                width: TILE_SIZE / 2, 
                height: TILE_SIZE, 
                vy: Math.random() * -4 - 1, 
                vx: (Math.random() - 0.5) * 6, 
                tile: wall.tile,
                srcTileOffsetX: TILE_SIZE / 2,
                srcTileOffsetY: 0
            });
            // Conservar mitad izquierda VISUALMENTE, pero mantener colisión completa
            wall.visualX = baseX;
            wall.visualWidth = TILE_SIZE / 2;
            wall.cutSide = 'right';
            // La colisión (wall.x y wall.width) permanece igual
        }
    });
};

export const updateLasers = (store: GameStore) => {
    // Si está pausado, no actualizar lásers
    if (store.isPaused) return;
    
    const levelWidth = store.levelDesigns[store.currentLevelIndex][0].length * TILE_SIZE;

    for (let i = store.lasers.length - 1; i >= 0; i--) {
        const laser = store.lasers[i];
        laser.x += laser.vx;
        const distance = Math.abs(laser.x - laser.startX);
        if (laser.x < 0 || laser.x > levelWidth || distance > 4 * TILE_SIZE) {
            store.lasers.splice(i, 1);
            continue;
        }

        let removed = false;

        for (let j = store.walls.length - 1; j >= 0; j--) {
            const wall = store.walls[j];
            if (laser.x < wall.x + wall.width &&
                laser.x + laser.width > wall.x &&
                laser.y < wall.y + wall.height &&
                laser.y + laser.height > wall.y) {
                // El agua no es destructible por láser
                if (wall.type === 'water') {
                    store.lasers.splice(i, 1);
                    removed = true;
                    break;
                }
                
                // Columnas (destructible_v): 40 golpes total -> a los 20 cortar, a los 40 eliminar
                if (wall.type === 'destructible_v') {
                    const side: 'left' | 'right' = laser.vx >= 0 ? 'left' : 'right';
                    const baseGridX = Math.floor(wall.x / TILE_SIZE);
                    // Decrementar salud de toda la columna
                    const colWalls = store.walls.filter(w => w.type === 'destructible_v' && Math.floor(w.x / TILE_SIZE) === baseGridX);
                    colWalls.forEach(w => { w.health = (w.health ?? 40) - 1; });
                    const minHealth = Math.min(...colWalls.map(w => w.health ?? 40));
        if (minHealth <= 0) {
            applyColumnCutOrRemove(store, baseGridX, 'remove', side);
            // Generar puntos por destruir columna completa (75 puntos total, no por tile)
            const colWalls = store.walls.filter(w => w.type === 'destructible_v' && Math.floor(w.x / TILE_SIZE) === baseGridX);
            if (colWalls.length > 0) {
                const centerWall = colWalls[Math.floor(colWalls.length / 2)]; // Punto central de la columna
                store.floatingScores.push({ 
                    x: centerWall.x + centerWall.width / 2, 
                    y: centerWall.y + centerWall.height / 2, 
                    text: '+75', 
                    life: 60, 
                    opacity: 1 
                });
                store.score += 75; // Solo 75 puntos por toda la columna
            }
        } else if (minHealth <= 20) {
            applyColumnCutOrRemove(store, baseGridX, 'half', side);
        }
                    store.lasers.splice(i, 1);
                    removed = true;
                    break;
                }

                // Muros destructibles normales: conservar lógica existente
                if (wall.type.startsWith('destructible') && wall.health !== undefined) {
                    wall.health -= 1;
                    if (wall.health <= 30) {
                        wall.isDamaged = true;
                    }
                    if (wall.health <= 0) {
                        splitDestructibleWall(store, wall);
                        // Generar puntos por destruir pared con láser
                        store.floatingScores.push({ 
                            x: wall.x + wall.width / 2, 
                            y: wall.y + wall.height / 2, 
                            text: '+75', 
                            life: 60, 
                            opacity: 1 
                        });
                        store.score += 75;
                        store.walls.splice(j, 1);
                    }
                }
                store.lasers.splice(i, 1);
                removed = true;
                break;
            }
        }

        if (removed) {
            continue;
        }

        for (let j = store.enemies.length - 1; j >= 0; j--) {
            const enemy = store.enemies[j];
            if (enemy.isHidden || enemy.isDead) {
                continue;
            }
            const intersects =
                laser.x < enemy.x + enemy.width &&
                laser.x + laser.width > enemy.x &&
                laser.y < enemy.y + enemy.height &&
                laser.y + laser.height > enemy.y;
            if (!intersects) {
                continue;
            }
            store.lasers.splice(i, 1);
            
            // Caso especial para el tentáculo: animación de muerte dramática
            if (enemy.type === 'tentacle') {
                enemy.tentacleState = 'dying';
                enemy.tentacleFrame = 27; // Frame de muerte (fila 5, columna 3 en numeración 1-based = fila 4, columna 2 en 0-based = frame 27)
                enemy.isDead = true;
                enemy.deathTimer = 30; // Mostrar frame de muerte por 30 frames (medio segundo)
                // Hacer que el tentáculo salte hacia arriba
                enemy.vy = -8; // Velocidad hacia arriba para el salto
                enemy.vx = 0; // Sin movimiento horizontal
                // No eliminar inmediatamente, dejar que se muestre el frame de muerte y caiga
                emitParticles(store, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, 'white');
                // Puntos por matar tentáculo
                const points = 100;
                const text = `+${points}`;
                store.floatingScores.push({ x: enemy.x, y: enemy.y, text, life: 60, opacity: 1 });
                store.score += points;
                playEnemyKillSound();
                break;
            }
            
            // Comportamiento normal para otros enemigos
            emitParticles(store, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 15, 'white');
            store.fallingEntities.push({
                x: enemy.x,
                y: enemy.y,
                width: enemy.width,
                height: enemy.height,
                vy: -5,
                vx: 0,
                tile: enemy.tile,
                rotation: 0,
                rotationSpeed: 0.1,
            });
            // Puntos diferentes según el tipo de enemigo
            const points = enemy.type === 'spider' ? 50 : 100;
            const text = `+${points}`;
            store.floatingScores.push({ x: enemy.x, y: enemy.y, text, life: 60, opacity: 1 });
            store.enemies.splice(j, 1);
            store.score += points;
            // Reproducir sonido al eliminar enemigo por láser
            playEnemyKillSound();
            break;
        }
    }
};

