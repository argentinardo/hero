import type { GameStore, Wall } from '../core/types';
import { TILE_SIZE } from '../core/constants';
import { emitParticles } from './player';
import { playEnemyKillSound } from './audio';

const splitDestructibleWall = (store: GameStore, wall: Wall) => {
    const quarterWidth = TILE_SIZE / 2;
    const quarterHeight = TILE_SIZE / 2;
    for (let i = 0; i < 4; i++) {
        store.fallingEntities.push({
            x: wall.x + (i % 2) * quarterWidth,
            y: wall.y + Math.floor(i / 2) * quarterHeight,
            width: quarterWidth,
            height: quarterHeight,
            vy: Math.random() * -4 - 1,
            vx: (Math.random() - 0.5) * 6,
            tile: wall.tile,
        });
    }
};

const destroyVerticalColumn = (store: GameStore, origin: Wall) => {
    const toDestroy = new Set<Wall>();
    const queue: Wall[] = [origin];
    toDestroy.add(origin);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const above = store.walls.find(w => w.type === 'destructible_v' && w.x === current.x && w.y === current.y - TILE_SIZE);
        if (above && !toDestroy.has(above)) {
            toDestroy.add(above);
            queue.push(above);
        }
        const below = store.walls.find(w => w.type === 'destructible_v' && w.x === current.x && w.y === current.y + TILE_SIZE);
        if (below && !toDestroy.has(below)) {
            toDestroy.add(below);
            queue.push(below);
        }
    }

    toDestroy.forEach(wall => splitDestructibleWall(store, wall));
    store.walls = store.walls.filter(w => !toDestroy.has(w));
};

// Cortar la columna vertical a la mitad del lado impactado, soltando ladrillos
const cutVerticalColumnHalf = (store: GameStore, hitWall: Wall, side: 'left' | 'right') => {
    const baseGridX = Math.floor(hitWall.x / TILE_SIZE);
    const baseX = baseGridX * TILE_SIZE;

    // Recolectar toda la columna por gridX (incluye piezas ya recortadas)
    const columnWalls = store.walls.filter(w => w.type === 'destructible_v' && Math.floor(w.x / TILE_SIZE) === baseGridX);

    columnWalls.forEach(wall => {
        const hasHalfWidth = wall.width <= TILE_SIZE / 2 + 0.01;
        if (hasHalfWidth) {
            // Ya está a la mitad: otro disparo elimina la mitad restante -> caer ladrillos y quitar muro
            const removeLeft = Math.round(wall.x) === baseX;
            const removedHalfX = removeLeft ? wall.x : wall.x; // toda la pieza restante cae
            // Dividir la pieza restante en dos ladrillos (superior/inferior)
            store.fallingEntities.push({ x: removedHalfX, y: wall.y, width: wall.width, height: TILE_SIZE / 2, vy: -3, vx: (Math.random() - 0.5) * 4, tile: '1' });
            store.fallingEntities.push({ x: removedHalfX, y: wall.y + TILE_SIZE / 2, width: wall.width, height: TILE_SIZE / 2, vy: -2, vx: (Math.random() - 0.5) * 4, tile: '1' });
            // Eliminar del mapa
            const idx = store.walls.indexOf(wall);
            if (idx >= 0) store.walls.splice(idx, 1);
            return;
        }

        // Primera vez: recortar la mitad del lado impactado y soltar ladrillos de esa mitad
        if (side === 'left') {
            // Lado izquierdo cae
            store.fallingEntities.push({ x: wall.x, y: wall.y, width: TILE_SIZE / 2, height: TILE_SIZE / 2, vy: -3, vx: (Math.random() - 0.5) * 4, tile: '1' });
            store.fallingEntities.push({ x: wall.x, y: wall.y + TILE_SIZE / 2, width: TILE_SIZE / 2, height: TILE_SIZE / 2, vy: -2, vx: (Math.random() - 0.5) * 4, tile: '1' });
            // Conservar mitad derecha
            wall.x = baseX + TILE_SIZE / 2;
            wall.width = TILE_SIZE / 2;
        } else {
            // Lado derecho cae
            const rightX = wall.x + TILE_SIZE / 2;
            store.fallingEntities.push({ x: rightX, y: wall.y, width: TILE_SIZE / 2, height: TILE_SIZE / 2, vy: -3, vx: (Math.random() - 0.5) * 4, tile: '1' });
            store.fallingEntities.push({ x: rightX, y: wall.y + TILE_SIZE / 2, width: TILE_SIZE / 2, height: TILE_SIZE / 2, vy: -2, vx: (Math.random() - 0.5) * 4, tile: '1' });
            // Conservar mitad izquierda
            wall.x = baseX;
            wall.width = TILE_SIZE / 2;
        }
    });
};

export const updateLasers = (store: GameStore) => {
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
                // Comportamiento especial para columnas 'C' (destructible_v): cortar a la mitad y soltar ladrillos
                if (wall.type === 'destructible_v') {
                    const side = laser.vx >= 0 ? 'left' : 'right';
                    cutVerticalColumnHalf(store, wall, side);
                    store.lasers.splice(i, 1);
                    removed = true;
                    break;
                }
                if (wall.type.startsWith('destructible') && wall.health !== undefined) {
                    wall.health -= 1;
                    if (wall.health <= 30) {
                        wall.isDamaged = true;
                    }
                    if (wall.health <= 0) {

                            splitDestructibleWall(store, wall);
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
            if (enemy.isHidden) {
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
            store.floatingScores.push({ x: enemy.x, y: enemy.y, text: '+100', life: 60, opacity: 1 });
            store.enemies.splice(j, 1);
            store.score += 100;
            // Reproducir sonido al eliminar enemigo por láser
            playEnemyKillSound();
            break;
        }
    }
};

