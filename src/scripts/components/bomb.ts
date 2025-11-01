import { awardExtraLifeByScore } from './ui';
import { ANIMATION_DATA } from '../core/assets';
import { TILE_SIZE, BOMB_FUSE } from '../core/constants';
import type { Enemy, GameStore, Wall } from '../core/types';
import { emitParticles, playerDie } from './player';
import { stopBombFireSound, playBombBoomSound, playEnemyKillSound } from './audio';
import { vibrate } from '../utils/device';

const createExplosion = (store: GameStore, x: number, y: number) => {
    store.explosions.push({
        x: x - TILE_SIZE,
        y: y - TILE_SIZE,
        width: TILE_SIZE * 3,
        height: TILE_SIZE * 3,
        timer: 20,
        animationTick: 0,
        currentFrame: 0,
    });
    // Activar el destello de explosión
    store.explosionFlash = 1.0;
};

const addFallingChunks = (store: GameStore, wall: Wall) => {
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

const collectVerticalWalls = (store: GameStore, start: Wall) => {
    const collected = new Set<Wall>([start]);
    const queue: Wall[] = [start];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const above = store.walls.find(w => w.type === 'destructible_v' && w.x === current.x && w.y === current.y - TILE_SIZE);
        if (above && !collected.has(above)) {
            collected.add(above);
            queue.push(above);
        }
        const below = store.walls.find(w => w.type === 'destructible_v' && w.x === current.x && w.y === current.y + TILE_SIZE);
        if (below && !collected.has(below)) {
            collected.add(below);
            queue.push(below);
        }
    }
    return collected;
};

const destroyWallsInRadius = (store: GameStore, centerX: number, centerY: number, radius: number) => {
    const toRemove = new Set<Wall>();
    store.walls.forEach(wall => {
        const wallCenterX = wall.x + TILE_SIZE / 2;
        const wallCenterY = wall.y + TILE_SIZE / 2;
        const distance = Math.hypot(centerX - wallCenterX, centerY - wallCenterY);
        if (distance >= radius) {
            return;
        }

        if (wall.type === 'destructible') {
            toRemove.add(wall);
        } else if (wall.type === 'destructible_v') {
            collectVerticalWalls(store, wall).forEach(w => toRemove.add(w));
        }
    });

    if (toRemove.size === 0) {
        return;
    }

    // Agrupar paredes por columna para columnas destructibles
    const columnGroups = new Map<number, Wall[]>();
    const regularWalls: Wall[] = [];
    const destroyedWallCenters: Array<{ x: number; y: number }> = [];
    
    toRemove.forEach(wall => {
        if (wall.type === 'destructible_v') {
            const colX = Math.floor(wall.x / TILE_SIZE);
            if (!columnGroups.has(colX)) {
                columnGroups.set(colX, []);
            }
            columnGroups.get(colX)!.push(wall);
        } else {
            regularWalls.push(wall);
        }
    });
    
    // Procesar paredes regulares (75 puntos cada una)
    regularWalls.forEach(wall => {
        addFallingChunks(store, wall);
        destroyedWallCenters.push({ x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 });
        store.floatingScores.push({ 
            x: wall.x + wall.width / 2, 
            y: wall.y + wall.height / 2, 
            text: '+75', 
            life: 60, 
            opacity: 1 
        });
        store.score += 75;
        awardExtraLifeByScore(store);
    });
    
    // Procesar columnas (75 puntos por columna completa)
    columnGroups.forEach(columnWalls => {
        columnWalls.forEach(wall => {
            addFallingChunks(store, wall);
            destroyedWallCenters.push({ x: wall.x + wall.width / 2, y: wall.y + wall.height / 2 });
        });
        
        // Solo generar puntos una vez por columna
        if (columnWalls.length > 0) {
            const centerWall = columnWalls[Math.floor(columnWalls.length / 2)];
            store.floatingScores.push({ 
                x: centerWall.x + centerWall.width / 2, 
                y: centerWall.y + centerWall.height / 2, 
                text: '+75', 
                life: 60, 
                opacity: 1 
            });
            store.score += 75; // Solo 75 puntos por toda la columna
            awardExtraLifeByScore(store);
        }
    });
    store.walls = store.walls.filter(wall => !toRemove.has(wall));

    // Daño colateral: matar enemigos cercanos a paredes destruidas
    if (destroyedWallCenters.length > 0) {
        const collateralRadius = TILE_SIZE * 1.25;
        const toRemoveEnemies = new Set<Enemy>();
        store.enemies.forEach(enemy => {
            if (enemy.isDead || enemy.isHidden) return;
            const ex = enemy.x + enemy.width / 2;
            const ey = enemy.y + enemy.height / 2;
            for (const c of destroyedWallCenters) {
                if (Math.hypot(ex - c.x, ey - c.y) <= collateralRadius) {
                    toRemoveEnemies.add(enemy);
                    break;
                }
            }
        });
        if (toRemoveEnemies.size > 0) {
            toRemoveEnemies.forEach(enemy => {
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
                const points = enemy.type === 'spider' ? 50 : 100;
                const text = `+${points}`;
                store.floatingScores.push({ x: enemy.x, y: enemy.y, text, life: 60, opacity: 1 });
                store.score += points;
                awardExtraLifeByScore(store);
            });
            playEnemyKillSound();
            store.enemies = store.enemies.filter(e => !toRemoveEnemies.has(e));
        }
    }
};

const destroyEnemiesInRadius = (store: GameStore, centerX: number, centerY: number, radius: number) => {
    const toRemove = new Set<Enemy>();
    store.enemies.forEach(enemy => {
        const enemyCenterX = enemy.x + enemy.width / 2;
        const enemyCenterY = enemy.y + enemy.height / 2;
        const distance = Math.hypot(centerX - enemyCenterX, centerY - enemyCenterY);
        if (distance < radius) {
            toRemove.add(enemy);
        }
    });

    if (toRemove.size === 0) {
        return;
    }

    toRemove.forEach(enemy => {
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
        store.score += points;
        awardExtraLifeByScore(store);
    });
    // Reproducir sonido de kill si hubo al menos un enemigo eliminado
    if (toRemove.size > 0) {
        playEnemyKillSound();
    }
    store.enemies = store.enemies.filter(enemy => !toRemove.has(enemy));
};

export const updateBombs = (store: GameStore) => {
    // Si está pausado, no actualizar bombas
    if (store.isPaused) return;
    
    for (let i = store.bombs.length - 1; i >= 0; i--) {
        const bomb = store.bombs[i];
        bomb.fuse -= 1;
        const anim = ANIMATION_DATA.bomb;
        bomb.animationTick = (bomb.animationTick + 1) % anim.speed;
        if (bomb.animationTick === 0) {
            bomb.currentFrame = (bomb.currentFrame + 1) % anim.frames;
        }
        
        // Si la bomba está sobre una plataforma, seguir su movimiento
        if (bomb.attachedPlatform) {
            bomb.x += bomb.attachedPlatform.vx;
        }

        if (bomb.fuse > 0) {
            continue;
        }

        // Detener sonido de mecha antes de eliminar la bomba (usar coordenadas)
        stopBombFireSound(bomb.x, bomb.y);
        
        store.bombs.splice(i, 1);
        const centerX = bomb.x + bomb.width / 2;
        const centerY = bomb.y + bomb.height / 2;
        
        createExplosion(store, bomb.x, bomb.y);
        
        // Reproducir sonido de explosión
        playBombBoomSound();
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
        const explosionParticleCount = isMobile ? 10 : 30; // Menos partículas en mobile
        emitParticles(store, centerX, centerY, explosionParticleCount, 'white');
        // Vibración al explotar bomba (patrón corto)
        vibrate([30, 50, 30]);
        const explosionRadius = 100;
        destroyWallsInRadius(store, centerX, centerY, explosionRadius);
        destroyEnemiesInRadius(store, centerX, centerY, explosionRadius);
        const player = store.player;
        const playerCenterX = player.x + player.hitbox.width / 2;
        const playerCenterY = player.y + player.hitbox.height / 2;
        const playerDistance = Math.hypot(centerX - playerCenterX, centerY - playerCenterY);
        if (playerDistance < explosionRadius) {
            playerDie(store);
        }
    }
};

export const updateExplosions = (store: GameStore) => {
    // Si está pausado, no actualizar explosiones
    if (store.isPaused) return;
    
    for (let i = store.explosions.length - 1; i >= 0; i--) {
        const explosion = store.explosions[i];
        explosion.timer -= 1;
        if (explosion.timer <= 0) {
            store.explosions.splice(i, 1);
            continue;
        }

        const anim = ANIMATION_DATA.explosion;
        explosion.animationTick = (explosion.animationTick + 1) % anim.speed;
        if (explosion.animationTick === 0) {
            explosion.currentFrame = Math.min(explosion.currentFrame + 1, anim.frames - 1);
        }
    }
    
    // Desvanecer gradualmente el destello de explosión
    if (store.explosionFlash > 0) {
        store.explosionFlash = Math.max(0, store.explosionFlash - 0.08);
    }
};

