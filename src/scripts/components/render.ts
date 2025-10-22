import { ANIMATION_DATA, TILE_TYPES } from '../core/assets';
import {
    TILE_SIZE,
    MAX_ENERGY,
} from '../core/constants';
import type { GameStore, Wall, Enemy, FallingEntity } from '../core/types';
import { checkCollision } from '../core/collision';
import { updateParticles, updateFallingEntities, updateFloatingScores } from './effects';
import { drawLight } from './light';
import type { Platform } from '../core/types';
import levelColors from '../../assets/level_colors.json';

// Paleta para tintar muros por bloques de 3 filas (colores vivos)
const WALL_TINT_COLORS = ['#ff4d4d', '#00e5ff', '#ffea00', '#00ff85', '#ff6bff', '#ff8c00'];

// Función para obtener el color del nivel actual basado en la posición vertical
const getLevelColorByPosition = (levelIndex: number, wallY: number, levelHeight: number = 22): string => {
    const levelNumber = (levelIndex + 1).toString();
    const levelData = levelColors.levelColors[levelNumber as keyof typeof levelColors.levelColors];
    
    if (!levelData?.wallTints) {
        return '#696969'; // Color por defecto gris
    }
    
    // Dividir el nivel en tres secciones verticales
    const sectionHeight = levelHeight / 3;
    const relativeY = wallY / TILE_SIZE; // Posición en tiles
    
    // Determinar qué tono usar basado en la posición vertical
    if (relativeY < sectionHeight) {
        return levelData.wallTints.light; // Parte superior - tono claro
    } else if (relativeY < sectionHeight * 2) {
        return levelData.wallTints.medium; // Parte media - tono medio
    } else {
        return levelData.wallTints.dark; // Parte inferior - tono oscuro
    }
};

// Función para obtener el color usando los datos directos del nivel (más eficiente)
const getLevelColorByPattern = (levelIndex: number, wallY: number, levelHeight: number = 22): string => {
    const levelNumber = (levelIndex + 1).toString();
    const levelData = levelColors.levelColors[levelNumber as keyof typeof levelColors.levelColors];
    
    if (!levelData?.wallTints) {
        return '#696969'; // Color por defecto gris
    }
    
    // Cambiar color cada 3 tiles de altura
    const relativeY = wallY / TILE_SIZE; // Posición en tiles
    const colorIndex = Math.floor(relativeY / 3) % 3; // Cambia cada 3 tiles, cíclico
    
    // Determinar qué tono usar basado en la posición vertical
    if (colorIndex === 0) {
        return levelData.wallTints.light; // Primeros 3 tiles - tono claro
    } else if (colorIndex === 1) {
        return levelData.wallTints.medium; // Siguientes 3 tiles - tono medio
    } else {
        return levelData.wallTints.dark; // Últimos 3 tiles - tono oscuro
    }
};

// Utilidad: trazar un rectángulo con radios por esquina
const beginRoundedRectPathCorners = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	rTL: number,
	rTR: number,
	rBR: number,
	rBL: number,
) => {
	const tl = Math.max(0, Math.min(rTL, Math.min(w, h) / 2));
	const tr = Math.max(0, Math.min(rTR, Math.min(w, h) / 2));
	const br = Math.max(0, Math.min(rBR, Math.min(w, h) / 2));
	const bl = Math.max(0, Math.min(rBL, Math.min(w, h) / 2));
	ctx.beginPath();
	ctx.moveTo(x + tl, y);
	ctx.lineTo(x + w - tr, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
	ctx.lineTo(x + w, y + h - br);
	ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
	ctx.lineTo(x + bl, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
	ctx.lineTo(x, y + tl);
	ctx.quadraticCurveTo(x, y, x + tl, y);
	ctx.closePath();
};

const drawWall = (store: GameStore, wall: Wall) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;

    ctx.save();

    if (wall.isDamaged) {
        ctx.globalAlpha = 0.5;
    }
    
    // Paredes aplastantes: renderizado liso
    if (wall.type === 'crushing') {
        const wallColor = wall.color || '#cc0000';
        ctx.fillStyle = wallColor;
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        
        ctx.restore();
        return;
    }

    // Determinar posición y ancho visual (para columnas cortadas)
    const renderX = wall.visualX !== undefined ? wall.visualX : wall.x;
    const renderWidth = wall.visualWidth !== undefined ? wall.visualWidth : wall.width;

	// Aplicar clip de esquinas redondeadas por esquina según vecinos vacíos (excepto lava y columnas)
	if (store.levelDesigns && store.levelDesigns[store.currentLevelIndex]) {
		const level = store.levelDesigns[store.currentLevelIndex];
		const colIndex = Math.floor(wall.x / TILE_SIZE);
		const rowIndex = Math.floor(wall.y / TILE_SIZE);
		const up = level[rowIndex - 1]?.[colIndex] ?? '0';
		const down = level[rowIndex + 1]?.[colIndex] ?? '0';
		const left = level[rowIndex]?.[colIndex - 1] ?? '0';
		const right = level[rowIndex]?.[colIndex + 1] ?? '0';
		const isCandidate = (wall.tile === '1' || wall.tile === '2');
		if (isCandidate) {
			const r = 10;
			// Tratar tiles de araña (S) como vacíos para el cálculo de esquinas redondeadas
			const isEmpty = (tile: string) => tile === '0' || tile === 'S';
			const rTL = (isEmpty(up) && isEmpty(left)) ? r : 0;
			const rTR = (isEmpty(up) && isEmpty(right)) ? r : 0;
			const rBL = (isEmpty(down) && isEmpty(left)) ? r : 0;
			const rBR = (isEmpty(down) && isEmpty(right)) ? r : 0;
			if (rTL || rTR || rBL || rBR) {
				beginRoundedRectPathCorners(ctx, renderX, wall.y, renderWidth, wall.height, rTL, rTR, rBR, rBL);
				ctx.clip();
			}
		}
	}

    const sprite = store.sprites[wall.tile];
    if (sprite) {
        const anim = ANIMATION_DATA[wall.tile as keyof typeof ANIMATION_DATA];
        if (anim && wall.currentFrame !== undefined) {
            const frameWidth = sprite.width / anim.frames;
            // Si es columna cortada, recortar el sprite apropiadamente
            if (wall.visualWidth !== undefined && wall.cutSide) {
                const srcX = wall.cutSide === 'left' ? frameWidth / 2 : 0;
                const srcWidth = frameWidth / 2;
                ctx.drawImage(sprite, wall.currentFrame * frameWidth + srcX, 0, srcWidth, sprite.height, renderX, wall.y, renderWidth, wall.height);
            } else {
                ctx.drawImage(sprite, wall.currentFrame * frameWidth, 0, frameWidth, sprite.height, renderX, wall.y, renderWidth, wall.height);
            }
        } else {
            // Si es columna cortada, recortar el sprite apropiadamente
            if (wall.visualWidth !== undefined && wall.cutSide) {
                const srcX = wall.cutSide === 'left' ? sprite.width / 2 : 0;
                const srcWidth = sprite.width / 2;
                ctx.drawImage(sprite, srcX, 0, srcWidth, sprite.height, renderX, wall.y, renderWidth, wall.height);
            } else {
                ctx.drawImage(sprite, renderX, wall.y, renderWidth, wall.height);
            }
        }
    } else {
        ctx.fillStyle = TILE_TYPES[wall.tile]?.color ?? '#fff';
        ctx.fillRect(renderX, wall.y, renderWidth, wall.height);
    }

    // Aplicar tint del nivel actual con tres tonos según posición vertical, excepto para lava ('3') y columnas ('C')
    if (wall.tile !== '3' && wall.tile !== 'C') {
        const levelHeight = store.levelDesigns[store.currentLevelIndex]?.length || 22;
        const levelTintColor = getLevelColorByPattern(store.currentLevelIndex, wall.y, levelHeight);
        const prevAlpha = ctx.globalAlpha;
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.8; // Más saturado para mejor visibilidad del color del nivel
        ctx.fillStyle = levelTintColor;
        ctx.fillRect(renderX, wall.y, renderWidth, wall.height);
        ctx.globalAlpha = prevAlpha;
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
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
    
    // Dibujar tentáculo con "cuerpo" extendido
    if (enemy.type === 'tentacle' && enemy.extensionLength && enemy.extensionLength > 0) {
        // Dibujar el "cuerpo" del tentáculo (línea ondulada desde la lava hasta la cabeza)
        const startX = enemy.initialX ?? enemy.x;
        const startY = enemy.initialY ?? enemy.y;
        const endX = enemy.x + enemy.width / 2;
        const endY = enemy.y + enemy.height / 2;
        
        ctx.strokeStyle = '#228b22'; // Verde oscuro
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        
        // Dibujar línea ondulada
        ctx.beginPath();
        ctx.moveTo(startX + TILE_SIZE / 2, startY + TILE_SIZE / 2);
        
        const segments = 10;
        for (let i = 1; i <= segments; i++) {
            const t = i / segments;
            const x = startX + TILE_SIZE / 2 + (endX - startX - TILE_SIZE / 2) * t;
            const y = startY + TILE_SIZE / 2 + (endY - startY - TILE_SIZE / 2) * t;
            
            // Añadir ondulación
            const waveOffset = Math.sin(t * Math.PI * 3 + Date.now() / 100) * 5;
            const perpX = -(endY - startY - TILE_SIZE / 2) / enemy.extensionLength;
            const perpY = (endX - startX - TILE_SIZE / 2) / enemy.extensionLength;
            
            ctx.lineTo(x + perpX * waveOffset, y + perpY * waveOffset);
        }
        
        ctx.stroke();
        
        // Dibujar la cabeza del tentáculo
        ctx.translate(enemy.x, enemy.y);
    } else if (flip) {
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

const drawPlatform = (store: GameStore, platform: Platform) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
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
    const width = isViperDeath ? entity.width * 1 : entity.width;
    const height = isViperDeath ? entity.height * 1 : entity.height;
    
    if (anim && anim.frames > 1) {
        const frameWidth = sprite.width / anim.frames;
        ctx.drawImage(sprite, 0, 0, frameWidth, sprite.height, -width / 2, -height / 2, width, height);
    } else {
        // Recortar la porción correcta del sprite basada en el offset dentro del tile original
        // Si no hay offsets, usar el sprite completo
        const srcOffsetX = (entity.srcTileOffsetX ?? 0);
        const srcOffsetY = (entity.srcTileOffsetY ?? 0);
        const sx = (srcOffsetX / TILE_SIZE) * sprite.width;
        const sy = (srcOffsetY / TILE_SIZE) * sprite.height;
        const sw = (width / TILE_SIZE) * sprite.width;
        const sh = (height / TILE_SIZE) * sprite.height;
        ctx.drawImage(sprite, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
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
    ctx.fillStyle = 'red';
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
    
    // Dibujar vidas como miniaturas usando hero-success
    if (livesCountEl) {
        livesCountEl.innerHTML = '';
        const heroSuccessSprite = store.sprites['P_success'];
        for (let i = 0; i < store.lives; i++) {
            if (heroSuccessSprite && heroSuccessSprite.complete) {
                const miniCanvas = document.createElement('canvas');
                miniCanvas.width = 30;
                miniCanvas.height = 50;
                miniCanvas.style.imageRendering = 'auto';
                const miniCtx = miniCanvas.getContext('2d');
                if (miniCtx) {
                    miniCtx.drawImage(heroSuccessSprite, 0, 0, heroSuccessSprite.width, heroSuccessSprite.height, 0, 0, 30, 50);
                }
                livesCountEl.appendChild(miniCanvas);
            } else {
                // Fallback: usar texto
                const span = document.createElement('span');
                span.textContent = '♥';
                span.style.color = '#ff0000';
                span.style.fontSize = '1.5rem';
                livesCountEl.appendChild(span);
            }
        }
    }
    
    // Dibujar bombas TNT como miniaturas
    const bombsCountEl = document.getElementById('bombs-count');
    if (bombsCountEl) {
        bombsCountEl.innerHTML = '';
        const bombSprite = store.sprites.bomb;
        for (let i = 0; i < store.bombsRemaining; i++) {
            if (bombSprite && bombSprite.complete) {
                const miniCanvas = document.createElement('canvas');
                miniCanvas.width = 30;
                miniCanvas.height = 50;
                miniCanvas.style.imageRendering = 'pixelated';
                const miniCtx = miniCanvas.getContext('2d');
                if (miniCtx) {
                    const frameWidth = bombSprite.width / ANIMATION_DATA.bomb.frames;
                    miniCtx.drawImage(bombSprite, 0, 0, frameWidth, bombSprite.height, 0, 0, 30, 50);
                }
                bombsCountEl.appendChild(miniCanvas);
            } else {
                // Fallback: usar emoji
                const span = document.createElement('span');
                span.textContent = '💣';
                span.style.fontSize = '1.5rem';
                bombsCountEl.appendChild(span);
            }
        }
    }
    
    if (scoreCountEl) scoreCountEl.textContent = `${store.score}`;
    if (levelCountEl) levelCountEl.textContent = `${store.currentLevelIndex + 1}`;
    if (energyBarEl) {
        const { updateEnergyBarColor } = require('./ui');
        updateEnergyBarColor(energyBarEl, store.energy, MAX_ENERGY);
    }
};

const drawGameWorld = (store: GameStore) => {
    const ctx = store.dom.ctx;
    const canvas = store.dom.canvas;
    if (!ctx || !canvas) return;

    // Calcular área visible para culling
    const viewLeft = store.cameraX;
    const viewRight = store.cameraX + canvas.width;
    const viewTop = store.cameraY;
    const viewBottom = store.cameraY + canvas.height;
    const margin = TILE_SIZE * 2; // Margen para objetos que están parcialmente fuera

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
        // Dibujar fondo con tiles repetidos y efecto parallax (modo normal)
        const TILE_SIZE = 64; // Tamaño del tile del background
        
        // Efecto parallax: el fondo se mueve más lento que la cámara
        const parallaxFactor = 0.5; // 0.5 = mitad de velocidad (más profundidad)
        const parallaxCameraX = store.cameraX * parallaxFactor;
        const parallaxCameraY = store.cameraY * parallaxFactor;
        
        const startY = Math.floor(parallaxCameraY / TILE_SIZE) * TILE_SIZE;
        const endY = parallaxCameraY + canvas.height;
        const startX = Math.floor(parallaxCameraX / TILE_SIZE) * TILE_SIZE;
        const endX = parallaxCameraX + canvas.width;
        const numTilesX = Math.ceil((endX - startX) / TILE_SIZE) + 1;
        const numTilesY = Math.ceil((endY - startY) / TILE_SIZE) + 1;
        
        ctx.save();
        ctx.translate(-parallaxCameraX, -parallaxCameraY);
        
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

    // Dibujar luces primero (solo las visibles)
    store.lights.forEach(light => {
        if (light.x + light.width >= viewLeft - margin && light.x <= viewRight + margin &&
            light.y + light.height >= viewTop - margin && light.y <= viewBottom + margin) {
            drawLight(store, light);
        }
    });
    
    // Dibujar plataformas (solo las visibles)
    store.platforms.forEach(p => {
        if (p.x + p.width >= viewLeft - margin && p.x <= viewRight + margin &&
            p.y + p.height >= viewTop - margin && p.y <= viewBottom + margin) {
            drawPlatform(store, p);
        }
    });

    if (store.isDark) {
        // Modo oscuro: paredes y personajes afectados en gris, no afectados en color normal
        
        // Separar paredes afectadas y no afectadas (con culling)
        const affectedWalls = store.walls.filter(wall => 
            wall.tile !== '3' && wall.affectedByDark &&
            wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
            wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin
        );
        const unaffectedWalls = store.walls.filter(wall => 
            wall.tile !== '3' && !wall.affectedByDark &&
            wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
            wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin
        );
        const lavaWalls = store.walls.filter(wall => 
            wall.tile === '3' &&
            wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
            wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin
        );

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

        // Separar enemigos afectados y no afectados (con culling)
        const vipers = store.enemies.filter(enemy => 
            enemy.type === 'viper' &&
            enemy.x + enemy.width >= viewLeft - margin && enemy.x <= viewRight + margin &&
            enemy.y + enemy.height >= viewTop - margin && enemy.y <= viewBottom + margin
        );
        const otherEnemies = store.enemies.filter(enemy => 
            enemy.type !== 'viper' &&
            enemy.x + enemy.width >= viewLeft - margin && enemy.x <= viewRight + margin &&
            enemy.y + enemy.height >= viewTop - margin && enemy.y <= viewBottom + margin
        );
        
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
            // Se calculará y dibujará el degradé después de dibujar enemigos y minero para afectarlos también
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

        // Finalmente, aplicar el degradé sobre todo (incluyendo enemigos y minero)
        if (hasAffectedObjects) {
            let minY = Infinity;
            let maxY = -Infinity;
            affectedObjects.forEach(obj => {
                if (obj.y < minY) minY = obj.y;
                if (obj.y + obj.height > maxY) maxY = obj.y + obj.height;
            });
            if (store.miner?.affectedByDark) {
                if (store.miner.y < minY) minY = store.miner.y;
                if (store.miner.y + store.miner.height > maxY) maxY = store.miner.y + store.miner.height;
            }
            
            // Crear un único gradiente combinado para la sombra superior e inferior
            const gradientHeight = 240;
            const gradientOffset = 65;
            const levelColsForGradient = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
            const levelWidthForGradient = levelColsForGradient * TILE_SIZE;
            
            // Calcular los límites totales del área de gradiente
            const topStart = minY - gradientHeight - gradientOffset;
            const topEnd = minY - gradientOffset;
            const bottomStart = maxY - gradientOffset;
            const bottomEnd = maxY + gradientHeight - gradientOffset;
            
            // Crear un gradiente vertical unificado que cubre toda el área
            const unifiedGradient = ctx.createLinearGradient(0, topStart, 0, bottomEnd);
            const totalHeight = bottomEnd - topStart;
            const topGradientRatio = gradientHeight / totalHeight;
            const centerStart = (topEnd - topStart) / totalHeight;
            const centerEnd = (bottomStart - topStart) / totalHeight;
            
            // Agregar color stops para el gradiente unificado
            unifiedGradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Negro completo arriba
            unifiedGradient.addColorStop(centerStart, 'rgba(0, 0, 0, 0)'); // Transparente al final del gradiente superior
            unifiedGradient.addColorStop(centerEnd, 'rgba(0, 0, 0, 1)'); // Negro completo al inicio del gradiente inferior
            unifiedGradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparente abajo
            
            // Aplicar el gradiente unificado en una sola operación
            ctx.fillStyle = unifiedGradient;
            ctx.fillRect(0, topStart, levelWidthForGradient, totalHeight);
        }
    } else {
        // Modo normal - con culling optimizado
        // Solo dibujar paredes visibles
        store.walls.forEach(wall => {
            if (wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
                wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin) {
                drawWall(store, wall);
            }
        });
        
        // Dibujar minero solo si está visible
        if (store.miner) {
            const m = store.miner;
            if (m.x + m.width >= viewLeft - margin && m.x <= viewRight + margin &&
                m.y + m.height >= viewTop - margin && m.y <= viewBottom + margin) {
                drawMiner(store);
            }
        }

        // Filtrar enemigos visibles
        const vipers = store.enemies.filter(enemy => 
            enemy.type === 'viper' &&
            enemy.x + enemy.width >= viewLeft - margin && enemy.x <= viewRight + margin &&
            enemy.y + enemy.height >= viewTop - margin && enemy.y <= viewBottom + margin
        );
        
        const otherEnemies = store.enemies.filter(enemy => 
            enemy.type !== 'viper' &&
            enemy.x + enemy.width >= viewLeft - margin && enemy.x <= viewRight + margin &&
            enemy.y + enemy.height >= viewTop - margin && enemy.y <= viewBottom + margin
        );

        otherEnemies.forEach(enemy => drawEnemy(store, enemy));

        vipers.forEach(enemy => {
            drawEnemy(store, enemy);
            const wall = store.walls.find(w => w.x === (enemy.initialX ?? enemy.x) && w.y === (enemy.initialY ?? enemy.y));
            if (wall) drawWall(store, wall);
        });
    }

    // Dibujar entidades cayendo (solo las visibles)
    store.fallingEntities.forEach(entity => {
        if (entity.x + entity.width >= viewLeft - margin && entity.x <= viewRight + margin &&
            entity.y + entity.height >= viewTop - margin && entity.y <= viewBottom + margin) {
            drawFallingEntity(store, entity);
        }
    });
    
    drawExplosions(store); // Las explosiones ya están optimizadas
    drawPlayer(store); // El jugador siempre está visible
    drawLasers(store); // Los láseres son pocos, siempre dibujar
    drawBombs(store); // Las bombas son pocas, siempre dibujar
    drawParticles(store); // Las partículas son ligeras
    drawFloatingScores(store); // Los scores son pocos
    
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

