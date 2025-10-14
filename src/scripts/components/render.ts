import { ANIMATION_DATA, TILE_TYPES } from '../core/assets';
import {
    TILE_SIZE,
    MAX_ENERGY,
} from '../core/constants';
import type { GameStore, Wall, Enemy, FallingEntity } from '../core/types';
import { checkCollision } from '../core/collision';
import { updateParticles, updateFallingEntities, updateFloatingScores } from './effects';
import { drawLight } from './light';

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
        // La soga se dibuja igual que antes
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(enemy.width / 2, 0);
        ctx.lineTo(enemy.width / 2, (enemy.initialY ?? enemy.y) - enemy.y);
        ctx.stroke();

        // Subir la araña 20 píxeles (aprox 20cm en escala de juego)
        ctx.translate(0, -20);
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
    
    // Si es una víbora, usar el sprite de muerte (imagen estática)
    const spriteKey = entity.tile === 'V' ? 'V_death' : entity.tile;
    const sprite = store.sprites[spriteKey];
    if (!sprite) return;

    ctx.save();
    ctx.translate(entity.x + entity.width / 2, entity.y + entity.height / 2);
    if (entity.rotation) {
        ctx.rotate(entity.rotation);
    }
    if (entity.vx < 0) {
        ctx.scale(-1, 1);
    }

    // Si es una víbora muerta, no usar animación (es una imagen estática)
    const isViperDeath = entity.tile === 'V';
    const anim = !isViperDeath ? ANIMATION_DATA[entity.tile as keyof typeof ANIMATION_DATA] : null;
    
    // Reducir el tamaño de la serpiente muerta a 3/4
    const width = isViperDeath ? entity.width * 0.75 : entity.width;
    const height = isViperDeath ? entity.height * 0.75 : entity.height;
    
    if (anim && anim.frames > 1) {
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, 0, 0, frameWidth, sprite.height, -width / 2, -height / 2, width, height);
    } else {
        ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
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

    // Efecto de vibración cuando está muriendo (campanazo)
    let shakeX = 0;
    let shakeY = 0;
    if (player.animationState === 'die' && player.deathTimer > 0) {
        // Vibración más intensa al principio, disminuye con el tiempo
        const intensity = Math.min(player.deathTimer / 10, 3);
        shakeX = (Math.random() - 0.5) * intensity * 2;
        shakeY = (Math.random() - 0.5) * intensity * 2;
    }

    // Movimiento ondulatorio cuando está flotando (respawn)
    let waveY = 0;
    if (player.isFloating && store.gameState === 'floating') {
        const waveAmplitude = 3;
        waveY = Math.sin(player.floatWaveTime) * waveAmplitude;
    }

    ctx.save();
    ctx.translate(player.x + player.width / 2 + shakeX, player.y + shakeY + waveY);
    ctx.scale(player.direction, 1);
    ctx.drawImage(sprite, player.currentFrame * frameWidth, 0, frameWidth, sprite.height, -player.width / 2, 0, player.width, player.height);
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

    // Dibujar fondo con tiles, modo oscuro, o destello de explosión
    const backgroundSprite = store.sprites.background;
    
    if (store.explosionFlash > 0) {
        // Efecto de destello de explosión
        const flashIntensity = Math.floor(store.explosionFlash * 255);
        ctx.fillStyle = `rgb(${flashIntensity}, ${flashIntensity}, ${flashIntensity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (store.isDark) {
        // Modo oscuro: fondo negro que cubre todo el nivel
        ctx.save();
        ctx.translate(-store.cameraX, -store.cameraY);
        
        // Calcular las dimensiones completas del nivel
        const levelRows = store.levelDesigns[store.currentLevelIndex]?.length ?? 0;
        const levelCols = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
        const levelWidth = levelCols * TILE_SIZE;
        const levelHeight = levelRows * TILE_SIZE;
        
        // Dibujar oscuridad que cubra todo el nivel
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, Math.max(levelWidth, canvas.width + store.cameraX), Math.max(levelHeight, canvas.height + store.cameraY));
        
        ctx.restore();
    } else if (backgroundSprite) {
        // Dibujar fondo con tiles repetidos (modo normal)
        const TILE_SIZE = 64; // Tamaño del tile del background
        const startY = Math.floor(store.cameraY / TILE_SIZE) * TILE_SIZE;
        const endY = store.cameraY + canvas.height;
        const startX = Math.floor(store.cameraX / TILE_SIZE) * TILE_SIZE;
        const endX = store.cameraX + canvas.width;
        const numTilesX = Math.ceil((endX - startX) / TILE_SIZE) + 1;
        const numTilesY = Math.ceil((endY - startY) / TILE_SIZE) + 1;
        
        ctx.save();
        ctx.translate(-store.cameraX, -store.cameraY);
        
        for (let y = 0; y < numTilesY; y++) {
            for (let x = 0; x < numTilesX; x++) {
                const tileX = startX + x * TILE_SIZE;
                const tileY = startY + y * TILE_SIZE;
                ctx.drawImage(backgroundSprite, tileX, tileY, TILE_SIZE, TILE_SIZE);
            }
        }
        
        ctx.restore();
    } else {
        // Fallback: fondo negro
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.save();
    ctx.translate(-store.cameraX, -store.cameraY);

    // Dibujar luces primero
    store.lights.forEach(light => drawLight(store, light));

    if (store.isDark) {
        // Modo oscuro: paredes y personajes afectados en gris, no afectados en color normal
        
        // Separar paredes afectadas y no afectadas
        const affectedWalls = store.walls.filter(wall => wall.tile !== '3' && wall.affectedByDark);
        const unaffectedWalls = store.walls.filter(wall => wall.tile !== '3' && !wall.affectedByDark);
        const lavaWalls = store.walls.filter(wall => wall.tile === '3');

        // Dibujar paredes no afectadas en color normal
        unaffectedWalls.forEach(wall => drawWall(store, wall));

        // Dibujar paredes afectadas siempre en negro (invisibles en fondo negro, visibles en flash blanco)
        ctx.save();
        ctx.fillStyle = 'black';
        affectedWalls.forEach(wall => {
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        });
        ctx.restore();

        // Lava siempre visible
        lavaWalls.forEach(wall => drawWall(store, wall));

        // Separar enemigos afectados y no afectados
        const vipers = store.enemies.filter(enemy => enemy.type === 'viper');
        const otherEnemies = store.enemies.filter(enemy => enemy.type !== 'viper');
        
        const affectedVipers = vipers.filter(enemy => enemy.affectedByDark);
        const unaffectedVipers = vipers.filter(enemy => !enemy.affectedByDark);
        const affectedOtherEnemies = otherEnemies.filter(enemy => enemy.affectedByDark);
        const unaffectedOtherEnemies = otherEnemies.filter(enemy => !enemy.affectedByDark);

        // Aplicar gradiente suave en los bordes para transición entre zona oscura e iluminada
        // El gradiente debe estar fijo en las coordenadas del mundo, no moverse con la cámara
        // Encontrar los límites de la zona afectada por la oscuridad
        const affectedObjects = [
            ...affectedWalls,
            ...affectedOtherEnemies,
            ...affectedVipers
        ];
        
        // Verificar si hay objetos afectados (incluyendo el minero)
        const hasAffectedObjects = affectedObjects.length > 0 || store.miner?.affectedByDark;
        
        if (hasAffectedObjects) {
            // Calcular el límite superior e inferior de los objetos afectados
            let minY = Infinity;
            let maxY = -Infinity;
            
            affectedObjects.forEach(obj => {
                if (obj.y < minY) minY = obj.y;
                if (obj.y + obj.height > maxY) maxY = obj.y + obj.height;
            });
            
            // Incluir el minero en el cálculo si está afectado
            if (store.miner?.affectedByDark) {
                if (store.miner.y < minY) minY = store.miner.y;
                if (store.miner.y + store.miner.height > maxY) maxY = store.miner.y + store.miner.height;
            }
            
            const gradientHeight = 240; // Altura del gradiente de transición
            const gradientOffset = 65; // Desplazamiento hacia arriba
            
            // Gradiente superior (de oscuro a transparente hacia abajo)
            const topGradient = ctx.createLinearGradient(0, minY - gradientHeight - gradientOffset, 0, minY - gradientOffset);
            topGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = topGradient;
            ctx.fillRect(0, minY - gradientHeight - gradientOffset, canvas.width, gradientHeight);
            
            // Gradiente inferior (de transparente a oscuro hacia abajo)
            const bottomGradient = ctx.createLinearGradient(0, maxY - gradientOffset, 0, maxY + gradientHeight - gradientOffset);
            bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
            bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(0, maxY - gradientOffset, canvas.width, gradientHeight);
        }

        // Dibujar minero afectado en gris
        if (store.miner?.affectedByDark) {
            ctx.save();
            ctx.filter = 'grayscale(100%) brightness(0.9)';
            drawMiner(store);
            ctx.restore();
        } else {
            drawMiner(store);
        }

        // Dibujar enemigos no afectados en color normal
        unaffectedOtherEnemies.forEach(enemy => drawEnemy(store, enemy));
        unaffectedVipers.forEach(enemy => {
            drawEnemy(store, enemy);
            const wall = store.walls.find(w => w.x === (enemy.initialX ?? enemy.x) && w.y === (enemy.initialY ?? enemy.y));
            if (wall) drawWall(store, wall);
        });

        // Dibujar enemigos afectados en gris
        ctx.save();
        ctx.filter = 'grayscale(100%) brightness(0.9)';
        affectedOtherEnemies.forEach(enemy => drawEnemy(store, enemy));
        affectedVipers.forEach(enemy => {
            drawEnemy(store, enemy);
        });
        ctx.restore();
        
        // Dibujar paredes de víboras afectadas siempre en negro
        ctx.save();
        ctx.fillStyle = 'black';
        affectedVipers.forEach(enemy => {
            const wall = store.walls.find(w => w.x === (enemy.initialX ?? enemy.x) && w.y === (enemy.initialY ?? enemy.y));
            if (wall) {
                ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            }
        });
        ctx.restore();
    } else {
        // Modo normal
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
    }

    store.fallingEntities.forEach(entity => drawFallingEntity(store, entity));
    drawLasers(store);
    drawPlayer(store);
    drawBombs(store);
    drawExplosions(store);
    drawParticles(store);
    drawFloatingScores(store);
    ctx.restore();
};

export const renderGame = (store: GameStore) => {
    drawGameWorld(store);
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

