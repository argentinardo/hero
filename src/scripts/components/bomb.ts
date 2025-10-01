import { ANIMATION_DATA } from '../core/assets';
import { TILE_SIZE, BOMB_FUSE } from '../core/constants';
import type { Enemy, GameStore, Wall } from '../core/types';
import { emitParticles, playerDie } from './player';

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
};

const addFallingChunks = (store: GameStore, wall: Wall) => {
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

    toRemove.forEach(wall => addFallingChunks(store, wall));
    store.walls = store.walls.filter(wall => !toRemove.has(wall));
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
        store.floatingScores.push({ x: enemy.x, y: enemy.y, text: '+100', life: 60, opacity: 1 });
    });
    store.enemies = store.enemies.filter(enemy => !toRemove.has(enemy));
    store.score += toRemove.size * 100;
};

export const updateBombs = (store: GameStore) => {
    for (let i = store.bombs.length - 1; i >= 0; i--) {
        const bomb = store.bombs[i];
        bomb.fuse -= 1;
        const anim = ANIMATION_DATA.bomb;
        bomb.animationTick = (bomb.animationTick + 1) % anim.speed;
        if (bomb.animationTick === 0) {
            bomb.currentFrame = (bomb.currentFrame + 1) % anim.frames;
        }

        if (bomb.fuse > 0) {
            continue;
        }

        store.bombs.splice(i, 1);
        const centerX = bomb.x + bomb.width / 2;
        const centerY = bomb.y + bomb.height / 2;
        createExplosion(store, bomb.x, bomb.y);
        emitParticles(store, centerX, centerY, 30, 'white');
        // Trigger background flash effect
        store.backgroundFlash = 15;
        const explosionRadius = 70;
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
};

