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
    
    // Paredes aplastantes: renderizado con efectos eléctricos
    if (wall.type === 'crushing') {
        const wallColor = wall.color || '#cc0000';
        
        // Efecto de brillo (glow) exterior - Solo si está habilitado
        if (store.settings.graphics.glow) {
            ctx.shadowColor = '#00ffff'; // Color eléctrico azul-cian
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // Tint eléctrico con gradiente
        const gradient = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.width, wall.y + wall.height);
        gradient.addColorStop(0, wallColor);
        gradient.addColorStop(0.5, '#ff4444'); // Rojo más brillante en el centro
        gradient.addColorStop(1, wallColor);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        
        // Efecto de parpadeo eléctrico
        const time = Date.now() * 0.01;
        const flickerIntensity = Math.sin(time) * 0.3 + 0.7; // Oscila entre 0.4 y 1.0
        
        ctx.globalAlpha = flickerIntensity;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(wall.x + 2, wall.y + 2, wall.width - 4, wall.height - 4);
        
        // Efecto de arco eléctrico en los bordes
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = flickerIntensity * 0.8;
        
        // Dibujar líneas eléctricas en los bordes
        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y);
        ctx.lineTo(wall.x + wall.width, wall.y);
        ctx.moveTo(wall.x, wall.y + wall.height);
        ctx.lineTo(wall.x + wall.width, wall.y + wall.height);
        ctx.moveTo(wall.x, wall.y);
        ctx.lineTo(wall.x, wall.y + wall.height);
        ctx.moveTo(wall.x + wall.width, wall.y);
        ctx.lineTo(wall.x + wall.width, wall.y + wall.height);
        ctx.stroke();
        
        // Resetear efectos
        if (store.settings.graphics.glow) {
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
        
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

    // Mapear tile 'K' (columna lava) al sprite de lava '3'
    const spriteKey = wall.tile === 'K' ? '3' : wall.tile;
    const sprite = store.sprites[spriteKey];
    if (sprite) {
        const anim = ANIMATION_DATA[wall.tile as keyof typeof ANIMATION_DATA];
        if (anim && wall.currentFrame !== undefined) {
            const frameWidth = sprite.width / anim.frames;
            
            // Renderizado específico para agua (grilla 2x2)
            if (wall.tile === '2') {
                const frameWidth = sprite.width / 2; // 2 frames por fila
                const frameHeight = sprite.height / 2; // 2 filas
                const framesPerRow = 2; // 2 frames por fila
                
                const row = Math.floor(wall.currentFrame / framesPerRow);
                const col = wall.currentFrame % framesPerRow;
                
                const sourceX = col * frameWidth;
                const sourceY = row * frameHeight;
                
                // Si es columna cortada, recortar el sprite apropiadamente
                if (wall.visualWidth !== undefined && wall.cutSide) {
                    const srcX = wall.cutSide === 'left' ? frameWidth / 2 : 0;
                    const srcWidth = frameWidth / 2;
                    ctx.drawImage(sprite, sourceX + srcX, sourceY, srcWidth, frameHeight, renderX, wall.y, renderWidth, wall.height);
                } else {
                    ctx.drawImage(sprite, sourceX, sourceY, frameWidth, frameHeight, renderX, wall.y, renderWidth, wall.height);
                }
            } else {
                // Renderizado normal para otros muros
                // Si es columna cortada, recortar el sprite apropiadamente
                if (wall.visualWidth !== undefined && wall.cutSide) {
                    const srcX = wall.cutSide === 'left' ? frameWidth / 2 : 0;
                    const srcWidth = frameWidth / 2;
                    ctx.drawImage(sprite, wall.currentFrame * frameWidth + srcX, 0, srcWidth, sprite.height, renderX, wall.y, renderWidth, wall.height);
                } else {
                    ctx.drawImage(sprite, wall.currentFrame * frameWidth, 0, frameWidth, sprite.height, renderX, wall.y, renderWidth, wall.height);
                }
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

    // Aplicar tint del nivel actual con tres tonos según posición vertical, excepto para lava ('3'), columnas ('C') y columnas de lava ('K')
    if (wall.tile !== '3' && wall.tile !== 'C' && wall.tile !== 'K') {
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
    } else if (enemy.type === 'tentacle') {
        flip = enemy.direction === -1; // Espejar cuando mira a la izquierda
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
        
        // Renderizado específico para el tentáculo
        if (enemy.type === 'tentacle') {
            // Usar tentacleFrame en lugar de currentFrame
            const frameIndex = enemy.tentacleFrame ?? 0;
            
            // Calcular posición en la grilla 6x5 (frames de 60x120)
            const frameWidth = 60;  // Ancho de cada frame
            const frameHeight = 120; // Alto de cada frame
            const framesPerRow = 6;   // Frames por fila
            
            const row = Math.floor(frameIndex / framesPerRow);
            const col = frameIndex % framesPerRow;
            
            const sourceX = col * frameWidth;
            const sourceY = row * frameHeight;
            
            ctx.drawImage(
                sprite, 
                sourceX, sourceY, frameWidth, frameHeight,
                0, 0, enemy.width, enemy.height
            );
        } else {
            // Renderizado normal para otros enemigos
            ctx.drawImage(sprite, enemy.currentFrame * frameWidth, 0, frameWidth, sprite.height, 0, 0, enemy.width, enemy.height);
        }
    } else {
        ctx.drawImage(sprite, 0, 0, enemy.width, enemy.height);
    }

    ctx.restore();
};

const drawPlatform = (store: GameStore, platform: Platform) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    ctx.save();
    
    // Usar el sprite base.png en lugar del rectángulo amarillo
    const baseSprite = store.sprites.base;
    if (baseSprite) {
        ctx.drawImage(baseSprite, platform.x, platform.y, platform.width, platform.height);
    } else {
        // Fallback al rectángulo amarillo si no se ha cargado el sprite
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }
    
    ctx.restore();
};

const drawFallingEntity = (store: GameStore, entity: FallingEntity) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    
    // Mapear tiles a sus sprites correspondientes
    let spriteKey = entity.tile;
    if (entity.tile === 'V') {
        spriteKey = 'V_death'; // Víbora usa sprite de muerte
    } else if (entity.tile === 'K') {
        spriteKey = '3'; // Columna lava usa sprite de lava
    }
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
    const isTentacleDeath = entity.tile === 'T' && entity.tentacleState === 'dying';
    const anim = !isViperDeath && !isTentacleDeath ? ANIMATION_DATA[entity.tile as keyof typeof ANIMATION_DATA] : null;
    
    // Reducir el tamaño de la serpiente muerta a 3/4
    const width = isViperDeath ? entity.width * 1 : entity.width;
    const height = isViperDeath ? entity.height * 1 : entity.height;
    
    if (isTentacleDeath && entity.tentacleFrame !== undefined) {
        // Renderizado específico para tentáculo muerto con frame fijo
        const frameIndex = entity.tentacleFrame;
        
        // Calcular posición en la grilla 6x5 (frames de 60x120)
        const frameWidth = 60;  // Ancho de cada frame
        const frameHeight = 120; // Alto de cada frame
        const framesPerRow = 6;   // Frames por fila
        
        const row = Math.floor(frameIndex / framesPerRow);
        const col = frameIndex % framesPerRow;
        
        const sourceX = col * frameWidth;
        const sourceY = row * frameHeight;
        
        ctx.drawImage(sprite, sourceX, sourceY, frameWidth, frameHeight, -width / 2, -height / 2, width, height);
    } else if (anim && anim.frames > 1) {
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
    store.lasers.forEach(laser => {
        ctx.save();
        // Glow exterior - Solo si está habilitado
        if (store.settings.graphics.glow) {
            ctx.shadowColor = 'rgba(255, 0, 0, 0.95)';
            ctx.shadowBlur = 18;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        // Cuerpo del láser (núcleo brillante)
        const gradient = ctx.createLinearGradient(laser.x, laser.y, laser.x + laser.width, laser.y + laser.height);
        gradient.addColorStop(0, '#ff8080');
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, '#ff8080');
        ctx.fillStyle = gradient;
        ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        // Borde interno para intensificar el haz
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
        ctx.strokeRect(laser.x + 0.5, laser.y + 0.5, Math.max(0, laser.width - 1), Math.max(0, laser.height - 1));
        ctx.restore();
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

// Detectar mobile para optimizaciones
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
};

const drawParticles = (store: GameStore) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    
    // Limitar partículas visibles en mobile
    const maxParticles = isMobileDevice() ? 30 : store.particles.length;
    const particlesToDraw = store.particles.slice(0, maxParticles);
    
    particlesToDraw.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 60;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
    });
};

const drawFloatingScores = (store: GameStore) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;
    
    store.floatingScores.forEach(score => {
        ctx.save();
        ctx.globalAlpha = score.opacity;
        
        // Texto con sombra para mejor visibilidad
        ctx.font = "bold 20px 'Press Start 2P'";
        ctx.fillStyle = '#000000';
        ctx.fillText(score.text, score.x + 2, score.y + 2); // Sombra
        
        ctx.fillStyle = '#ffff00'; // Amarillo brillante
        ctx.fillText(score.text, score.x, score.y);
        
        ctx.restore();
    });
};

// Cache para evitar actualizaciones innecesarias del HUD
let hudCache = {
    lives: -1,
    bombs: -1,
    score: -1,
    level: -1,
    energy: -1,
};

const drawHud = (store: GameStore) => {
    const { livesCountEl, scoreCountEl, levelCountEl, energyBarEl } = store.dom.ui;
    
    const isMobile = isMobileDevice();
    // Actualizar HUD menos frecuentemente en mobile
    const shouldUpdate = !isMobile || (hudCache.score !== store.score || hudCache.lives !== store.lives || 
                                      hudCache.bombs !== store.bombsRemaining || hudCache.level !== store.currentLevelIndex);
    
    if (!shouldUpdate && hudCache.energy === store.energy) {
        return; // Saltar actualización si no ha cambiado nada
    }
    
    // Dibujar vidas como miniaturas usando hero-success (solo si cambió)
    if (livesCountEl && (hudCache.lives !== store.lives || !livesCountEl.hasChildNodes())) {
        livesCountEl.innerHTML = '';
        const heroSuccessSprite = store.sprites['P_success'];
        const isMobileLandscape = window.matchMedia('(max-width: 1024px) and (orientation: landscape)').matches || window.matchMedia('(max-width: 768px) and (orientation: landscape)').matches;

        if (isMobileLandscape && store.lives > 6) {
            // En móvil: mostrar contador "Nx" y una sola miniatura
            const label = document.createElement('span');
            label.textContent = `${store.lives}x`;
            label.style.color = '#fff';
            label.style.fontFamily = '"Press Start 2P", monospace';
            label.style.fontSize = '12px';
            label.style.marginRight = '6px';
            livesCountEl.appendChild(label);

            if (heroSuccessSprite && heroSuccessSprite.complete) {
                const miniCanvas = document.createElement('canvas');
                miniCanvas.width = 24;
                miniCanvas.height = 40;
                const miniCtx = miniCanvas.getContext('2d');
                if (miniCtx) {
                    miniCtx.drawImage(heroSuccessSprite, 0, 0, heroSuccessSprite.width, heroSuccessSprite.height, 0, 0, 24, 40);
                }
                livesCountEl.appendChild(miniCanvas);
            } else {
                const span = document.createElement('span');
                span.textContent = '♥';
                span.style.color = '#ff0000';
                span.style.fontSize = '1.2rem';
                livesCountEl.appendChild(span);
            }
        } else {
            const maxLives = 5; // Número máximo de vidas a mostrar en barra
            for (let i = 0; i < maxLives; i++) {
                if (heroSuccessSprite && heroSuccessSprite.complete) {
                    const miniCanvas = document.createElement('canvas');
                    miniCanvas.width = 30;
                    miniCanvas.height = 50;
                    miniCanvas.style.imageRendering = 'auto';
                    miniCanvas.style.opacity = i < store.lives ? '1' : '0';
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
                    span.style.opacity = i < store.lives ? '1' : '0';
                    livesCountEl.appendChild(span);
                }
            }
        }
        hudCache.lives = store.lives;
    }
    
    // Dibujar bombas TNT como miniaturas (solo si cambió)
    const bombsCountEl = document.getElementById('bombs-count');
    if (bombsCountEl && (hudCache.bombs !== store.bombsRemaining || !bombsCountEl.hasChildNodes())) {
        bombsCountEl.innerHTML = '';
        const bombSprite = store.sprites.bomb;
        const maxBombs = 5; // Número máximo de TNT a mostrar
        
        for (let i = 0; i < maxBombs; i++) {
            if (bombSprite && bombSprite.complete) {
                const miniCanvas = document.createElement('canvas');
                miniCanvas.width = 30;
                miniCanvas.height = 50;
                miniCanvas.style.imageRendering = 'pixelated';
                miniCanvas.style.opacity = i < store.bombsRemaining ? '1' : '0';
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
                span.style.opacity = i < store.bombsRemaining ? '1' : '0';
                bombsCountEl.appendChild(span);
            }
        }
        hudCache.bombs = store.bombsRemaining;
    }
    
    if (scoreCountEl && hudCache.score !== store.score) {
        scoreCountEl.textContent = `${store.score}`;
        hudCache.score = store.score;
    }
    if (levelCountEl && hudCache.level !== store.currentLevelIndex) {
        levelCountEl.textContent = `${store.currentLevelIndex + 1}`;
        hudCache.level = store.currentLevelIndex;
    }
    if (energyBarEl) {
        // Durante la secuencia de fin de nivel, usar la energía virtual para el drenaje visual
        // Si estamos en cualquier fase del fin de nivel y hay energía virtual, usarla
        const displayEnergy = (store.levelEndSequence && store.virtualEnergyDrain !== null && store.virtualEnergyDrain !== undefined)
            ? store.virtualEnergyDrain 
            : store.energy;
        
        // Solo actualizar si la energía cambió significativamente (ahorra renderizado en mobile)
        const energyDiff = Math.abs(displayEnergy - (hudCache.energy || 0));
        if (energyDiff >= (isMobile ? 2 : 0.5) || hudCache.energy === -1) {
            const { updateEnergyBarColor } = require('./ui');
            updateEnergyBarColor(energyBarEl, displayEnergy, MAX_ENERGY);
            hudCache.energy = displayEnergy;
        }
    }
};

const drawGameWorld = (store: GameStore) => {
    const ctx = store.dom.ctx;
    const canvas = store.dom.canvas;
    if (!ctx || !canvas) return;
    
    // Optimizar canvas en mobile: reducir calidad de renderizado
    const isMobileDeviceFlag = isMobileDevice();
    if (isMobileDeviceFlag) {
        ctx.imageSmoothingEnabled = false;
    }

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
        
        // Optimizar dibujo del fondo en mobile: dibujar tiles más espaciados
        const tileStep = isMobileDeviceFlag ? 2 : 1; // Saltar tiles en mobile para mejor rendimiento
        
        for (let y = 0; y < numTilesY; y += tileStep) {
            for (let x = 0; x < numTilesX; x += tileStep) {
                const tileX = startX + x * TILE_SIZE;
                const tileY = startY + y * TILE_SIZE;
                // Dibujar tile más grande en mobile para cubrir espacios
                if (isMobileDeviceFlag) {
                    ctx.drawImage(backgroundSprite, tileX, tileY, TILE_SIZE * tileStep, TILE_SIZE * tileStep);
                } else {
                    ctx.drawImage(backgroundSprite, tileX, tileY, TILE_SIZE, TILE_SIZE);
                }
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
    // En mobile, limitar número de luces dibujadas para mejor rendimiento
    const lightsToDraw = isMobileDeviceFlag ? store.lights.slice(0, 10) : store.lights;
    lightsToDraw.forEach(light => {
        if (light.x + light.width >= viewLeft - margin && light.x <= viewRight + margin &&
            light.y + light.height >= viewTop - margin && light.y <= viewBottom + margin) {
            drawLight(store, light);
        }
    });
    
    // Las plataformas se dibujan después del jugador para que vayan por delante

    if (store.isDark) {
        // Modo oscuro: paredes y personajes afectados en gris, no afectados en color normal
        
        // Separar paredes afectadas y no afectadas (con culling)
        const affectedWalls = store.walls.filter(wall => 
            wall.tile !== '3' && wall.tile !== 'K' && wall.tile !== '2' && wall.affectedByDark &&
            wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
            wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin
        );
        const unaffectedWalls = store.walls.filter(wall => 
            wall.tile !== '3' && wall.tile !== 'K' && wall.tile !== '2' && !wall.affectedByDark &&
            wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
            wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin
        );
        const lavaWalls = store.walls.filter(wall => 
            (wall.tile === '3' || wall.tile === 'K') &&
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

        // Primero, aplicar el degradé oscuro de fondo
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
        
        // Después del degradé oscuro, dibujar enemigos afectados en gris (encima de la sombra)
        // En mobile, simplificar el filtro para mejor rendimiento
        if (!isMobileDeviceFlag) {
            ctx.save();
            ctx.filter = 'grayscale(100%) brightness(0.9)';
            affectedOtherEnemies.forEach(enemy => drawEnemy(store, enemy));
            affectedVipers.forEach(enemy => {
                drawEnemy(store, enemy);
            });
            ctx.restore();
        } else {
            // En mobile, dibujar sin filtro para mejor rendimiento
            affectedOtherEnemies.forEach(enemy => drawEnemy(store, enemy));
            affectedVipers.forEach(enemy => {
                drawEnemy(store, enemy);
            });
        }
        
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
        // Modo normal - con culling optimizado
        // Solo dibujar paredes visibles (excepto agua)
        store.walls.forEach(wall => {
            if (wall.type !== 'water' && 
                wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
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
    
    // Dibujar agua después del jugador para que se vea por detrás
    store.walls.forEach(wall => {
        if (wall.type === 'water' && 
            wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
            wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin) {
            drawWall(store, wall);
        }
    });
    
    // Dibujar plataformas después del jugador para que vayan por delante
    store.platforms.forEach(p => {
        if (p.x + p.width >= viewLeft - margin && p.x <= viewRight + margin &&
            p.y + p.height >= viewTop - margin && p.y <= viewBottom + margin) {
            drawPlatform(store, p);
        }
    });
    
    drawLasers(store); // Los láseres son pocos, siempre dibujar
    drawBombs(store); // Las bombas son pocas, siempre dibujar
    drawParticles(store); // Las partículas son ligeras
    drawFloatingScores(store); // Los scores son pocos
    
    ctx.restore();
};

// Animar splash en div con background (tira horizontal de 20 frames, animación ping-pong a 8 fps)
export const animateSplash = (store: GameStore) => {
    const splashContainer = document.getElementById('splash-container');
    if (!splashContainer) return;
    
    const splashSprite = store.sprites.splash;
    
    // Intentar establecer la imagen de fondo incluso si el sprite aún no está completamente cargado
    // Esto asegura que la imagen aparezca tan pronto como sea posible
    if (splashSprite) {
        // Si el sprite existe, usar su src (funciona incluso si aún no está completamente cargado)
        if (!splashContainer.style.backgroundImage || !splashContainer.dataset.imageSet) {
            splashContainer.style.backgroundImage = `url(${splashSprite.src})`;
            splashContainer.dataset.imageSet = 'true';
        }
    } else {
        // Si el sprite no existe aún, esperar a que se cargue
        // No establecer background-image aquí ya que el sprite se cargará pronto
        return;
    }
    
    // Continuar con la animación incluso si el sprite aún se está cargando
    // La imagen aparecerá cuando el navegador termine de cargarla
    
    const totalFrames = 20; // Tira horizontal de 20 frames
    const fps = 8;
    const framesPerSecond = 60 / fps; // frames de juego por frame de animación
    
    // Actualizar animación
    store.splashAnimationTick++;
    if (store.splashAnimationTick >= framesPerSecond) {
        store.splashAnimationTick = 0;
        
        // Ping-pong: avanzar o retroceder según dirección
        store.splashAnimationFrame += store.splashAnimationDirection;
        
        // Cambiar dirección al llegar a los extremos
        if (store.splashAnimationFrame >= totalFrames - 1) {
            store.splashAnimationFrame = totalFrames - 1;
            store.splashAnimationDirection = -1;
        } else if (store.splashAnimationFrame <= 0) {
            store.splashAnimationFrame = 0;
            store.splashAnimationDirection = 1;
        }
    }
    
    // Calcular porcentaje de background-position en el eje X
    // Para 20 frames: cada frame ocupa 100% / 19 espacios entre frames (0% a 100%)
    const bgXPercent = (store.splashAnimationFrame / (totalFrames - 1)) * 100;
    
    // Actualizar solo background-position-x (mantener Y en 0%)
    splashContainer.style.backgroundPosition = `${bgXPercent}% 0%`;
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

