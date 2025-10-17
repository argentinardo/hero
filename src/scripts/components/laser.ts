import type { GameStore, Wall } from '../core/types';
import { TILE_SIZE } from '../core/constants';
import { emitParticles } from './player';
import { playEnemyKillSound } from './audio';

const splitDestructibleWall = (store: GameStore, wall: Wall) => {
    const quarterWidth = TILE_SIZE / 2;
    const quarterHeight = TILE_SIZE / 2;
    for (let i = 0; i < 4; i++) {
        const offsetX = (i % 2) * quarterWidth;
        const offsetY = Math.floor(i / 2) * quarterHeight;
        store.fallingEntities.push({
            x: wall.x + offsetX,
            y: wall.y + offsetY,
            width: quarterWidth,
            height: quarterHeight,
            vy: Math.random() * -4 - 1,
            vx: (Math.random() - 0.5) * 6,
            tile: wall.tile,
            srcTileOffsetX: offsetX,
            srcTileOffsetY: offsetY,
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
            const leftX = wall.x;
            const rightX = wall.x + wall.width;
            const dropLeftWidth = Math.min(wall.width, TILE_SIZE / 2);
            const dropRightWidth = Math.min(wall.width, TILE_SIZE / 2);
            // Soltar dos ladrillos (superior e inferior) del bloque restante
            store.fallingEntities.push({ x: wall.x, y: wall.y, width: wall.width, height: TILE_SIZE / 2, vy: -3, vx: (Math.random() - 0.5) * 4, tile: '1' });
            store.fallingEntities.push({ x: wall.x, y: wall.y + TILE_SIZE / 2, width: wall.width, height: TILE_SIZE / 2, vy: -2, vx: (Math.random() - 0.5) * 4, tile: '1' });
        });
        store.walls = store.walls.filter(w => !(w.type === 'destructible_v' && Math.floor(w.x / TILE_SIZE) === baseGridX));
        return;
    }

    // action === 'half'
    colWalls.forEach(wall => {
        // Si ya está a la mitad, no volver a cortar
        if (wall.width <= TILE_SIZE / 2 + 0.01) return;
        if (side === 'left') {
            // Caer mitad izquierda
            store.fallingEntities.push({ x: wall.x, y: wall.y, width: TILE_SIZE / 2, height: TILE_SIZE / 2, vy: -3, vx: (Math.random() - 0.5) * 4, tile: '1' });
            store.fallingEntities.push({ x: wall.x, y: wall.y + TILE_SIZE / 2, width: TILE_SIZE / 2, height: TILE_SIZE / 2, vy: -2, vx: (Math.random() - 0.5) * 4, tile: '1' });
            // Conservar mitad derecha
            wall.x = baseX + TILE_SIZE / 2;
            wall.width = TILE_SIZE / 2;
        } else {
            // Caer mitad derecha
            const rightX = baseX + TILE_SIZE / 2;
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

