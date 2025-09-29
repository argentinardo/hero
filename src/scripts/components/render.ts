import { ANIMATION_DATA, TILE_TYPES } from '../core/assets';
import {
    TILE_SIZE,
    MAX_ENERGY,
} from '../core/constants';
import type { GameStore, Wall, Enemy, FallingEntity } from '../core/types';
import { checkCollision } from '../core/collision';
import { updateParticles, updateFallingEntities, updateFloatingScores } from './effects';

const drawWall = (store: GameStore, wall: Wall) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;

    if (wall.isDamaged) {
        ctx.globalAlpha = 0.5;
    }

    const sprite = store.sprites[wall.tile];
    if (sprite) {
        const anim = ANIMATION_DATA[wall.tile as keyof typeof ANIMATION_DATA];
        if (anim && wall.currentFrame !== undefined) {
            const frameWidth = sprite.width / anim.frames;
            ctx.drawImage(sprite, wall.currentFrame * frameWidth, 0, frameWidth, sprite.height, wall.x, wall.y, wall.width, wall.height);
        } else {
            ctx.drawImage(sprite, wall.x, wall.y, wall.width, wall.height);
        }
    } else {
        ctx.fillStyle = TILE_TYPES[wall.tile]?.color ?? '#fff';
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    }

    if (wall.isDamaged) {
        ctx.globalAlpha = 1;
    }
};

const drawEnemy = (store: GameStore, enemy: Enemy) => {
    const ctx = store.dom.ctx;
    if (!ctx || enemy.isHidden) return;

    const sprite = store.sprites[enemy.tile];
    if (!sprite) return;

    ctx.save();

    let flip = enemy.vx < 0;
    if (enemy.type === 'viper') {
        flip = enemy.direction === -1;
    }

    if (flip) {
        ctx.translate(enemy.x + enemy.width, enemy.y);
        ctx.scale(-1, 1);
    } else {
        ctx.translate(enemy.x, enemy.y);
    }

    if (enemy.type === 'spider') {
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.width / 2, 0);
        ctx.lineTo(enemy.width / 2, (enemy.initialY ?? enemy.y) - enemy.y);
        ctx.stroke();
    }

    const anim = ANIMATION_DATA[enemy.tile as keyof typeof ANIMATION_DATA];
    if (anim) {
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, enemy.currentFrame * frameWidth, 0, frameWidth, sprite.height, 0, 0, enemy.width, enemy.height);
    } else {
        ctx.drawImage(sprite, 0, 0, enemy.width, enemy.height);
    }

    ctx.restore();
};

const drawFallingEntity = (store: GameStore, entity: FallingEntity) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    const sprite = store.sprites[entity.tile];
    if (!sprite) return;

    ctx.save();
    ctx.translate(entity.x + entity.width / 2, entity.y + entity.height / 2);
    if (entity.rotation) {
        ctx.rotate(entity.rotation);
    }
    if (entity.vx < 0) {
        ctx.scale(-1, 1);
    }

    const anim = ANIMATION_DATA[entity.tile as keyof typeof ANIMATION_DATA];
    if (anim && anim.frames > 1) {
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, 0, 0, frameWidth, sprite.height, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
    } else {
        ctx.drawImage(sprite, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
    }

    ctx.restore();
};

const drawMiner = (store: GameStore) => {
    const ctx = store.dom.ctx;
    const miner = store.miner;
    if (!ctx || !miner) return;

    const sprite = store.sprites[miner.tile];
    if (!sprite) return;

    const animKey = `9_${miner.animationState}` as keyof typeof ANIMATION_DATA;
    const animData = ANIMATION_DATA[animKey];
    const frameWidth = sprite.width / 6;

    ctx.save();
    if (miner.isFlipped) {
        ctx.scale(-1, 1);
        ctx.translate(-(miner.x + miner.width * 0.6), miner.y);
    } else {
        ctx.translate(miner.x, miner.y);
    }

    ctx.drawImage(
        sprite,
        miner.currentFrame * frameWidth,
        0,
        frameWidth,
        sprite.height,
        0,
        0,
        miner.width,
        miner.height,
    );
    ctx.restore();
};

const drawPlayer = (store: GameStore) => {
    const ctx = store.dom.ctx;
    const player = store.player;
    if (!ctx) return;

    if (player.deathTimer > 0) {
        player.deathTimer -= 1;
    }

    if (store.gameState === 'respawning' && player.deathTimer <= 0) {
        return;
    }

    const animKey = `P_${player.animationState}` as keyof typeof ANIMATION_DATA;
    const animData = ANIMATION_DATA[animKey];
    const sprite = store.sprites[animData.sprite];
    if (!sprite) return;

    const frameWidth = sprite.width / animData.frames;

    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y);
    ctx.scale(player.direction, 1);
    ctx.drawImage(sprite, player.currentFrame * frameWidth, 0, frameWidth, sprite.height, -player.width / 2, 0, player.width, player.height);

    if (player.deathTimer > 0) {
        ctx.globalAlpha = player.deathTimer / 60;
        ctx.fillStyle = 'white';
        ctx.fillRect(-player.width / 2, 0, player.width, player.height);
        ctx.globalAlpha = 1;
    }

    ctx.restore();
};

const drawLasers = (store: GameStore) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    ctx.fillStyle = 'yellow';
    store.lasers.forEach(laser => {
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
    });
};

const drawBombs = (store: GameStore) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    const sprite = store.sprites.bomb;
    const anim = ANIMATION_DATA.bomb;
    store.bombs.forEach(bomb => {
        if (!sprite) return;
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, bomb.currentFrame * frameWidth, 0, frameWidth, sprite.height, bomb.x, bomb.y, bomb.width, bomb.height);
    });
};

const drawExplosions = (store: GameStore) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    const sprite = store.sprites.explosion;
    const anim = ANIMATION_DATA.explosion;
    store.explosions.forEach(exp => {
        if (!sprite) return;
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, exp.currentFrame * frameWidth, 0, frameWidth, sprite.height, exp.x, exp.y, exp.width, exp.height);
    });
};

const drawParticles = (store: GameStore) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    store.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 60;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
    });
};

const drawFloatingScores = (store: GameStore) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    ctx.font = "24px 'Press Start 2P'";
    ctx.fillStyle = 'white';
    store.floatingScores.forEach(score => {
        ctx.globalAlpha = score.opacity;
        ctx.fillText(score.text, score.x, score.y);
        ctx.globalAlpha = 1;
    });
};

const drawHud = (store: GameStore) => {
    const { livesCountEl, scoreCountEl, levelCountEl, energyBarEl } = store.dom.ui;
    if (livesCountEl) livesCountEl.textContent = `${store.lives}`;
    if (scoreCountEl) scoreCountEl.textContent = `${store.score}`;
    if (levelCountEl) levelCountEl.textContent = `${store.currentLevelIndex + 1}`;
    if (energyBarEl) energyBarEl.style.width = `${(store.energy / MAX_ENERGY) * 100}%`;
};

const drawGameWorld = (store: GameStore) => {
    const ctx = store.dom.ctx;
    const canvas = store.dom.canvas;
    if (!ctx || !canvas) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -store.cameraY);

    store.walls.forEach(wall => drawWall(store, wall));
    drawMiner(store);

    const vipers = store.enemies.filter(enemy => enemy.type === 'viper');
    const otherEnemies = store.enemies.filter(enemy => enemy.type !== 'viper');

    otherEnemies.forEach(enemy => drawEnemy(store, enemy));

    vipers.forEach(enemy => {
        drawEnemy(store, enemy);
        const wall = store.walls.find(w => w.x === (enemy.initialX ?? enemy.x) && w.y === (enemy.initialY ?? enemy.y));
        if (wall) drawWall(store, wall);
    });

    store.fallingEntities.forEach(entity => drawFallingEntity(store, entity));
    drawLasers(store);
    drawPlayer(store);
    drawBombs(store);
    drawExplosions(store);
    ctx.restore();
};

export const renderGame = (store: GameStore) => {
    drawGameWorld(store);
    drawParticles(store);
    drawFloatingScores(store);
    drawHud(store);
};

export const renderEditor = (store: GameStore, drawEditor: (store: GameStore) => void) => {
    drawEditor(store);
    drawHud(store);
};

export const drawExplosionDamage = (store: GameStore) => {
    const player = store.player;
    store.explosions.forEach(exp => {
        if (checkCollision(player.hitbox, exp)) {
            player.deathTimer = 1; // trigger death effect
        }
    });
};

export const runEffects = (store: GameStore) => {
    updateParticles(store);
    updateFallingEntities(store);
    updateFloatingScores(store);
};

