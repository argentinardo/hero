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
    const { ctx, scale } = getRenderContext(store);
    if (!ctx) return;

    ctx.save();

    if (wall.isDamaged) {
        ctx.globalAlpha = 0.5;
    }
    
    // Paredes aplastantes: renderizado con efectos eléctricos
    if (wall.type === 'crushing') {
        const isMobile = isMobileDevice();
        const wallColor = wall.color || '#cc0000';
        
        // Efecto de brillo (glow) exterior - Solo si está habilitado y NO en mobile (muy costoso)
        if (store.settings.graphics.glow && !isMobile) {
            ctx.shadowColor = '#00ffff'; // Color eléctrico azul-cian
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // En mobile, usar color sólido simple (sin gradiente costoso)
        if (isMobile) {
            ctx.fillStyle = wallColor;
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        } else {
            // Tint eléctrico con gradiente (solo en desktop)
            const gradient = ctx.createLinearGradient(wall.x, wall.y, wall.x + wall.width, wall.y + wall.height);
            gradient.addColorStop(0, wallColor);
            gradient.addColorStop(0.5, '#ff4444'); // Rojo más brillante en el centro
            gradient.addColorStop(1, wallColor);
            ctx.fillStyle = gradient;
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        }
        
        // Efecto de parpadeo eléctrico (simplificado en mobile)
        const time = Date.now() * 0.01;
        const flickerIntensity = Math.sin(time) * 0.3 + 0.7; // Oscila entre 0.4 y 1.0
        
        if (!isMobile) {
            ctx.globalAlpha = flickerIntensity;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(wall.x + 2, wall.y + 2, wall.width - 4, wall.height - 4);
            
            // Efecto de arco eléctrico en los bordes (solo desktop)
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
        }
        
        // Resetear efectos
        if (store.settings.graphics.glow && !isMobile) {
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

    // Aplicar tint del nivel actual con tres tonos según posición vertical, excepto para lava ('3') y columnas de lava ('K')
    // Las columnas destructibles ('C') también se tiñen
    if (wall.tile !== '3' && wall.tile !== 'K') {
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
    const { ctx, scale } = getRenderContext(store);
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
    const { ctx, scale } = getRenderContext(store);
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
    const { ctx, scale } = getRenderContext(store);
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
    const { ctx, scale } = getRenderContext(store);
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
    const { ctx, scale } = getRenderContext(store);
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
    const { ctx, scale } = getRenderContext(store);
    if (!ctx) return;
    const isMobile = isMobileDevice();
    const lasers = store.lasers;
    const lasersLength = lasers.length;
    
    // Usar loop for en lugar de forEach para mejor rendimiento
    for (let i = 0; i < lasersLength; i++) {
        const laser = lasers[i];
        ctx.save();
        
        // Glow exterior - Solo si está habilitado y NO en mobile (muy costoso)
        if (store.settings.graphics.glow && !isMobile) {
            ctx.shadowColor = 'rgba(255, 0, 0, 0.95)';
            ctx.shadowBlur = 18;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // En mobile, usar color sólido simple (sin gradiente costoso)
        if (isMobile) {
            ctx.fillStyle = '#ff8080';
            ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
        } else {
            // Cuerpo del láser (núcleo brillante) con gradiente (solo desktop)
            const gradient = ctx.createLinearGradient(laser.x, laser.y, laser.x + laser.width, laser.y + laser.height);
            gradient.addColorStop(0, '#ff8080');
            gradient.addColorStop(0.5, '#ffffff');
            gradient.addColorStop(1, '#ff8080');
            ctx.fillStyle = gradient;
            ctx.fillRect(laser.x, laser.y, laser.width, laser.height);
            
            // Borde interno para intensificar el haz (solo desktop)
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.85)';
            ctx.strokeRect(laser.x + 0.5, laser.y + 0.5, Math.max(0, laser.width - 1), Math.max(0, laser.height - 1));
        }
        
        ctx.restore();
    }
};

const drawBombs = (store: GameStore) => {
    const { ctx, scale } = getRenderContext(store);
    if (!ctx) return;
    const sprite = store.sprites.bomb;
    if (!sprite) return;
    const anim = ANIMATION_DATA.bomb;
    const frameWidth = sprite.width / anim.frames;
    const bombs = store.bombs;
    const bombsLength = bombs.length;
    
    // Loop for es más rápido que forEach
    for (let i = 0; i < bombsLength; i++) {
        const bomb = bombs[i];
        ctx.drawImage(sprite, bomb.currentFrame * frameWidth, 0, frameWidth, sprite.height, bomb.x, bomb.y, bomb.width, bomb.height);
    }
};

const drawExplosions = (store: GameStore) => {
    const { ctx, scale } = getRenderContext(store);
    if (!ctx) return;
    const sprite = store.sprites.explosion;
    if (!sprite) return;
    const anim = ANIMATION_DATA.explosion;
    const frameWidth = sprite.width / anim.frames;
    const explosions = store.explosions;
    const explosionsLength = explosions.length;
    
    // Loop for es más rápido que forEach
    for (let i = 0; i < explosionsLength; i++) {
        const exp = explosions[i];
        ctx.drawImage(sprite, exp.currentFrame * frameWidth, 0, frameWidth, sprite.height, exp.x, exp.y, exp.width, exp.height);
    }
};

// Detectar mobile para optimizaciones
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
};

// Helper para obtener el contexto de renderizado correcto (offscreen en mobile, normal en desktop)
const getRenderContext = (store: GameStore): { ctx: CanvasRenderingContext2D | null; scale: number } => {
    const useOffscreen = store.dom.offscreenCtx && store.dom.renderScale !== undefined && store.dom.renderScale < 1.0;
    return {
        ctx: useOffscreen ? store.dom.offscreenCtx! : store.dom.ctx,
        scale: store.dom.renderScale ?? 1.0
    };
};

const drawParticles = (store: GameStore) => {
    const { ctx, scale } = getRenderContext(store);
    if (!ctx) return;
    
    const isMobile = isMobileDevice();
    // Limitar partículas visibles en mobile
    const maxParticles = isMobile ? 30 : store.particles.length;
    const particles = store.particles;
    const particlesLength = Math.min(maxParticles, particles.length);
    
    // Loop for es más rápido que forEach/slice
    for (let i = 0; i < particlesLength; i++) {
        const p = particles[i];
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 60;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1; // Resetear una sola vez al final
};

const drawFloatingScores = (store: GameStore) => {
    const { ctx, scale } = getRenderContext(store);
    if (!ctx) return;
    
    const scores = store.floatingScores;
    const scoresLength = scores.length;
    
    // Configurar font una sola vez (es costoso cambiarlo repetidamente)
    ctx.font = "bold 20px 'Press Start 2P'";
    
    // Loop for es más rápido que forEach
    for (let i = 0; i < scoresLength; i++) {
        const score = scores[i];
        ctx.save();
        ctx.globalAlpha = score.opacity;
        
        // Texto con sombra para mejor visibilidad
        ctx.fillStyle = '#000000';
        ctx.fillText(score.text, score.x + 2, score.y + 2); // Sombra
        
        ctx.fillStyle = '#ffff00'; // Amarillo brillante
        ctx.fillText(score.text, score.x, score.y);
        
        ctx.restore();
    }
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
    // OPTIMIZACIÓN: Usar canvas offscreen en mobile para renderizado a menor resolución
    const useOffscreen = store.dom.offscreenCanvas && store.dom.offscreenCtx && store.dom.renderScale !== undefined && store.dom.renderScale < 1.0;
    const renderCtx = useOffscreen ? store.dom.offscreenCtx! : store.dom.ctx;
    const renderCanvas = useOffscreen ? store.dom.offscreenCanvas! : store.dom.canvas;
    const displayCtx = store.dom.ctx;
    const displayCanvas = store.dom.canvas;
    
    if (!renderCtx || !renderCanvas || !displayCtx || !displayCanvas) return;
    
    const renderScale = store.dom.renderScale ?? 1.0;
    
    // Optimizar canvas en mobile: reducir calidad de renderizado
    const isMobileDeviceFlag = isMobileDevice();
    if (isMobileDeviceFlag) {
        renderCtx.imageSmoothingEnabled = false;
    }

    // Calcular área visible para culling (usar coordenadas del mundo, no escaladas)
    const viewLeft = store.cameraX;
    const viewRight = store.cameraX + displayCanvas.width / renderScale;
    const viewTop = store.cameraY;
    const viewBottom = store.cameraY + displayCanvas.height / renderScale;
    const margin = TILE_SIZE * 2; // Margen para objetos que están parcialmente fuera

    // Dibujar fondo con tiles, modo oscuro, o destello de explosión
    const backgroundSprite = store.sprites.background;
    
    if (store.explosionFlash > 0) {
        // Efecto de destello de explosión
        const flashIntensity = Math.floor(store.explosionFlash * 255);
        renderCtx.fillStyle = `rgb(${flashIntensity}, ${flashIntensity}, ${flashIntensity})`;
        renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
    } else if (store.isDark) {
        // Modo oscuro: fondo negro que cubre todo el nivel
        // Nota: esto se dibuja antes de aplicar la transformación de escala
        renderCtx.save();
        
        // Calcular las dimensiones completas del nivel
        const levelRows = store.levelDesigns[store.currentLevelIndex]?.length ?? 0;
        const levelCols = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
        const levelWidth = levelCols * TILE_SIZE;
        const levelHeight = levelRows * TILE_SIZE;
        
        // Escalar y aplicar cámara
        renderCtx.scale(renderScale, renderScale);
        renderCtx.translate(-store.cameraX, -store.cameraY);
        
        // Dibujar oscuridad que cubra todo el nivel
        renderCtx.fillStyle = 'black';
        renderCtx.fillRect(0, 0, Math.max(levelWidth, displayCanvas.width / renderScale + store.cameraX), Math.max(levelHeight, displayCanvas.height / renderScale + store.cameraY));
        
        renderCtx.restore();
    } else if (backgroundSprite) {
        // Dibujar fondo con tiles repetidos y efecto parallax (modo normal)
        // Nota: esto se dibuja antes de aplicar la transformación de escala principal
        const BG_TILE_SIZE = 64; // Tamaño del tile del background
        
        // Efecto parallax: el fondo se mueve más lento que la cámara
        const parallaxFactor = 0.5; // 0.5 = mitad de velocidad (más profundidad)
        const parallaxCameraX = store.cameraX * parallaxFactor;
        const parallaxCameraY = store.cameraY * parallaxFactor;
        
        renderCtx.save();
        renderCtx.scale(renderScale, renderScale);
        renderCtx.translate(-parallaxCameraX, -parallaxCameraY);
        
        const startY = Math.floor(parallaxCameraY / BG_TILE_SIZE) * BG_TILE_SIZE;
        const endY = parallaxCameraY + displayCanvas.height / renderScale;
        const startX = Math.floor(parallaxCameraX / BG_TILE_SIZE) * BG_TILE_SIZE;
        const endX = parallaxCameraX + displayCanvas.width / renderScale;
        const numTilesX = Math.ceil((endX - startX) / BG_TILE_SIZE) + 1;
        const numTilesY = Math.ceil((endY - startY) / BG_TILE_SIZE) + 1;
        
        // Optimizar dibujo del fondo en mobile: dibujar tiles más espaciados
        const tileStep = isMobileDeviceFlag ? 2 : 1; // Saltar tiles en mobile para mejor rendimiento
        
        for (let y = 0; y < numTilesY; y += tileStep) {
            for (let x = 0; x < numTilesX; x += tileStep) {
                const tileX = startX + x * BG_TILE_SIZE;
                const tileY = startY + y * BG_TILE_SIZE;
                // Dibujar tile más grande en mobile para cubrir espacios
                if (isMobileDeviceFlag) {
                    renderCtx.drawImage(backgroundSprite, tileX, tileY, BG_TILE_SIZE * tileStep, BG_TILE_SIZE * tileStep);
                } else {
                    renderCtx.drawImage(backgroundSprite, tileX, tileY, BG_TILE_SIZE, BG_TILE_SIZE);
                }
            }
        }
        
        renderCtx.restore();
    } else {
        // Fallback: fondo negro
        renderCtx.fillStyle = 'black';
        renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
    }
    
    // Aplicar escala y transformación según el canvas de renderizado
    // Usar scale() para escalar automáticamente todas las coordenadas
    renderCtx.save();
    renderCtx.scale(renderScale, renderScale);
    renderCtx.translate(-store.cameraX, -store.cameraY);

    // Dibujar luces primero (solo las visibles)
    // En mobile, limitar número de luces dibujadas para mejor rendimiento
    const lights = store.lights;
    const lightsLength = isMobileDeviceFlag ? Math.min(10, lights.length) : lights.length;
    
    // Loop for es más rápido que forEach/slice
    for (let i = 0; i < lightsLength; i++) {
        const light = lights[i];
        if (light.x + light.width >= viewLeft - margin && light.x <= viewRight + margin &&
            light.y + light.height >= viewTop - margin && light.y <= viewBottom + margin) {
            drawLight(store, light);
        }
    }
    
    // Las plataformas se dibujan después del jugador para que vayan por delante

    if (store.isDark) {
        // Modo oscuro: paredes y personajes afectados en gris, no afectados en color normal
        // OPTIMIZACIÓN: Usar loops for en lugar de múltiples filter() para mejor rendimiento
        
        const walls = store.walls;
        const wallsLength = walls.length;
        const affectedWalls: typeof walls = [];
        const unaffectedWalls: typeof walls = [];
        const lavaWalls: typeof walls = [];
        
        // Un solo loop para clasificar todas las paredes (mucho más rápido que múltiples filters)
        for (let i = 0; i < wallsLength; i++) {
            const wall = walls[i];
            // Culling primero (más rápido)
            if (wall.x + wall.width < viewLeft - margin || wall.x > viewRight + margin ||
                wall.y + wall.height < viewTop - margin || wall.y > viewBottom + margin) {
                continue;
            }
            
            // Lava siempre visible
            if (wall.tile === '3' || wall.tile === 'K') {
                lavaWalls.push(wall);
                continue;
            }
            
            // Excluir agua para clasificación
            if (wall.tile === '2') continue;
            
            // Clasificar por afectación
            if (wall.affectedByDark) {
                affectedWalls.push(wall);
            } else {
                unaffectedWalls.push(wall);
            }
        }

        // Dibujar paredes no afectadas en color normal
        const unaffectedLength = unaffectedWalls.length;
        for (let i = 0; i < unaffectedLength; i++) {
            drawWall(store, unaffectedWalls[i]);
        }

        // Dibujar paredes afectadas siempre en negro (invisibles en fondo negro, visibles en flash blanco)
        // Ya están dentro del contexto escalado, usar coordenadas normales
        const { ctx: darkCtx } = getRenderContext(store);
        if (darkCtx) {
            darkCtx.save();
            darkCtx.fillStyle = 'black';
            const affectedLength = affectedWalls.length;
            for (let i = 0; i < affectedLength; i++) {
                const wall = affectedWalls[i];
                darkCtx.fillRect(wall.x, wall.y, wall.width, wall.height);
            }
            darkCtx.restore();
        }

        // Lava siempre visible
        const lavaLength = lavaWalls.length;
        for (let i = 0; i < lavaLength; i++) {
            drawWall(store, lavaWalls[i]);
        }

        // Separar enemigos afectados y no afectados (con culling optimizado)
        const enemies = store.enemies;
        const enemiesLength = enemies.length;
        const affectedVipers: typeof enemies = [];
        const unaffectedVipers: typeof enemies = [];
        const affectedOtherEnemies: typeof enemies = [];
        const unaffectedOtherEnemies: typeof enemies = [];
        
        // Un solo loop para clasificar todos los enemigos
        for (let i = 0; i < enemiesLength; i++) {
            const enemy = enemies[i];
            // Culling primero
            if (enemy.x + enemy.width < viewLeft - margin || enemy.x > viewRight + margin ||
                enemy.y + enemy.height < viewTop - margin || enemy.y > viewBottom + margin) {
                continue;
            }
            
            if (enemy.type === 'viper') {
                if (enemy.affectedByDark) {
                    affectedVipers.push(enemy);
                } else {
                    unaffectedVipers.push(enemy);
                }
            } else {
                if (enemy.affectedByDark) {
                    affectedOtherEnemies.push(enemy);
                } else {
                    unaffectedOtherEnemies.push(enemy);
                }
            }
        }

        // Verificar si hay objetos afectados (incluyendo el minero)
        const hasAffectedObjects = affectedWalls.length > 0 || affectedOtherEnemies.length > 0 || 
                                  affectedVipers.length > 0 || store.miner?.affectedByDark;

        // Dibujar minero afectado en gris (sin filtro en mobile - muy costoso)
        const isMobile = isMobileDeviceFlag;
        const { ctx: minerCtx } = getRenderContext(store);
        if (store.miner?.affectedByDark && minerCtx) {
            if (!isMobile) {
                minerCtx.save();
                minerCtx.filter = 'grayscale(100%) brightness(0.9)';
                drawMiner(store);
                minerCtx.restore();
            } else {
                // En mobile, dibujar sin filtro (mejor rendimiento)
                drawMiner(store);
            }
        } else {
            drawMiner(store);
        }

        // Dibujar enemigos no afectados en color normal
        const unaffectedOtherLength = unaffectedOtherEnemies.length;
        for (let i = 0; i < unaffectedOtherLength; i++) {
            drawEnemy(store, unaffectedOtherEnemies[i]);
        }
        
        const unaffectedVipersLength = unaffectedVipers.length;
        for (let i = 0; i < unaffectedVipersLength; i++) {
            const enemy = unaffectedVipers[i];
            drawEnemy(store, enemy);
            // Buscar wall una sola vez
            const enemyX = enemy.initialX ?? enemy.x;
            const enemyY = enemy.initialY ?? enemy.y;
            const walls = store.walls;
            const wallsLen = walls.length;
            for (let j = 0; j < wallsLen; j++) {
                const wall = walls[j];
                if (wall.x === enemyX && wall.y === enemyY) {
                    drawWall(store, wall);
                    break; // Encontrado, salir del loop
                }
            }
        }

        // Primero, aplicar el degradé oscuro de fondo
        if (hasAffectedObjects) {
            let minY = Infinity;
            let maxY = -Infinity;
            
            // Loop optimizado para encontrar límites
            const affectedLength = affectedWalls.length;
            for (let i = 0; i < affectedLength; i++) {
                const obj = affectedWalls[i];
                if (obj.y < minY) minY = obj.y;
                if (obj.y + obj.height > maxY) maxY = obj.y + obj.height;
            }
            
            const affectedOtherLength = affectedOtherEnemies.length;
            for (let i = 0; i < affectedOtherLength; i++) {
                const obj = affectedOtherEnemies[i];
                if (obj.y < minY) minY = obj.y;
                if (obj.y + obj.height > maxY) maxY = obj.y + obj.height;
            }
            
            const affectedVipersLength = affectedVipers.length;
            for (let i = 0; i < affectedVipersLength; i++) {
                const obj = affectedVipers[i];
                if (obj.y < minY) minY = obj.y;
                if (obj.y + obj.height > maxY) maxY = obj.y + obj.height;
            }
            
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
            // Ya estamos dentro del contexto escalado, usar coordenadas normales
            const { ctx: gradientCtx } = getRenderContext(store);
            if (gradientCtx) {
                const unifiedGradient = gradientCtx.createLinearGradient(0, topStart, 0, bottomEnd);
                const totalHeight = bottomEnd - topStart;
                const centerStart = ((topEnd - topStart) / totalHeight);
                const centerEnd = ((bottomStart - topStart) / totalHeight);
                
                // Agregar color stops para el gradiente unificado
                unifiedGradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Negro completo arriba
                unifiedGradient.addColorStop(centerStart, 'rgba(0, 0, 0, 0)'); // Transparente al final del gradiente superior
                unifiedGradient.addColorStop(centerEnd, 'rgba(0, 0, 0, 1)'); // Negro completo al inicio del gradiente inferior
                unifiedGradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Transparente abajo
                
                // Aplicar el gradiente unificado en una sola operación
                gradientCtx.fillStyle = unifiedGradient;
                gradientCtx.fillRect(0, topStart, levelWidthForGradient, totalHeight);
            }
        }
        
        // Después del degradé oscuro, dibujar enemigos afectados en gris (encima de la sombra)
        // En mobile, simplificar el filtro para mejor rendimiento
        const { ctx: enemyFilterCtx } = getRenderContext(store);
        if (!isMobile && enemyFilterCtx) {
            enemyFilterCtx.save();
            enemyFilterCtx.filter = 'grayscale(100%) brightness(0.9)';
            const affectedOtherLen = affectedOtherEnemies.length;
            for (let i = 0; i < affectedOtherLen; i++) {
                drawEnemy(store, affectedOtherEnemies[i]);
            }
            const affectedVipersLen = affectedVipers.length;
            for (let i = 0; i < affectedVipersLen; i++) {
                drawEnemy(store, affectedVipers[i]);
            }
            enemyFilterCtx.restore();
        } else {
            // En mobile, dibujar sin filtro para mejor rendimiento
            const affectedOtherLen = affectedOtherEnemies.length;
            for (let i = 0; i < affectedOtherLen; i++) {
                drawEnemy(store, affectedOtherEnemies[i]);
            }
            const affectedVipersLen = affectedVipers.length;
            for (let i = 0; i < affectedVipersLen; i++) {
                drawEnemy(store, affectedVipers[i]);
            }
        }
        
        // Dibujar paredes de víboras siempre en negro
        // Ya estamos dentro del contexto escalado, usar coordenadas normales
        const { ctx: viperWallsCtx } = getRenderContext(store);
        if (viperWallsCtx) {
            viperWallsCtx.save();
            viperWallsCtx.fillStyle = 'black';
            const affectedVipersLen = affectedVipers.length;
            const wallsForVipersAffected = store.walls;
            const wallsLen = wallsForVipersAffected.length;
            for (let i = 0; i < affectedVipersLen; i++) {
                const enemy = affectedVipers[i];
                const enemyX = enemy.initialX ?? enemy.x;
                const enemyY = enemy.initialY ?? enemy.y;
                // Buscar wall con loop (más rápido que find)
                for (let j = 0; j < wallsLen; j++) {
                    const wall = wallsForVipersAffected[j];
                    if (wall.x === enemyX && wall.y === enemyY) {
                        viperWallsCtx.fillRect(wall.x, wall.y, wall.width, wall.height);
                        break;
                    }
                }
            }
            viperWallsCtx.restore();
        }
    } else {
        // Modo normal - con culling optimizado
        // Solo dibujar paredes visibles (excepto agua) - loop for es más rápido
        const walls = store.walls;
        const wallsLength = walls.length;
        for (let i = 0; i < wallsLength; i++) {
            const wall = walls[i];
            if (wall.type !== 'water' && 
                wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
                wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin) {
                drawWall(store, wall);
            }
        }
        
        // Dibujar minero solo si está visible
        if (store.miner) {
            const m = store.miner;
            if (m.x + m.width >= viewLeft - margin && m.x <= viewRight + margin &&
                m.y + m.height >= viewTop - margin && m.y <= viewBottom + margin) {
                drawMiner(store);
            }
        }

        // Filtrar enemigos visibles - loop for es mucho más rápido que filter
        const enemies = store.enemies;
        const enemiesLength = enemies.length;
        const vipers: typeof enemies = [];
        const otherEnemies: typeof enemies = [];
        
        for (let i = 0; i < enemiesLength; i++) {
            const enemy = enemies[i];
            // Culling primero (más rápido)
            if (enemy.x + enemy.width < viewLeft - margin || enemy.x > viewRight + margin ||
                enemy.y + enemy.height < viewTop - margin || enemy.y > viewBottom + margin) {
                continue;
            }
            
            if (enemy.type === 'viper') {
                vipers.push(enemy);
            } else {
                otherEnemies.push(enemy);
            }
        }

        const otherEnemiesLength = otherEnemies.length;
        for (let i = 0; i < otherEnemiesLength; i++) {
            drawEnemy(store, otherEnemies[i]);
        }

        const vipersLength = vipers.length;
        const wallsForVipers = store.walls;
        const wallsForVipersLen = wallsForVipers.length;
        for (let i = 0; i < vipersLength; i++) {
            const enemy = vipers[i];
            drawEnemy(store, enemy);
            // Buscar wall con loop (más rápido que find)
            const enemyX = enemy.initialX ?? enemy.x;
            const enemyY = enemy.initialY ?? enemy.y;
            for (let j = 0; j < wallsForVipersLen; j++) {
                const wall = wallsForVipers[j];
                if (wall.x === enemyX && wall.y === enemyY) {
                    drawWall(store, wall);
                    break;
                }
            }
        }
    }

    // Dibujar entidades cayendo (solo las visibles) - loop for es más rápido
    const fallingEntities = store.fallingEntities;
    const fallingLength = fallingEntities.length;
    for (let i = 0; i < fallingLength; i++) {
        const entity = fallingEntities[i];
        if (entity.x + entity.width >= viewLeft - margin && entity.x <= viewRight + margin &&
            entity.y + entity.height >= viewTop - margin && entity.y <= viewBottom + margin) {
            drawFallingEntity(store, entity);
        }
    }
    
    drawExplosions(store); // Las explosiones ya están optimizadas
    drawPlayer(store); // El jugador siempre está visible
    
    // Dibujar agua después del jugador para que se vea por detrás - loop for es más rápido
    const wallsForWater = store.walls;
    const wallsForWaterLength = wallsForWater.length;
    for (let i = 0; i < wallsForWaterLength; i++) {
        const wall = wallsForWater[i];
        if (wall.type === 'water' && 
            wall.x + wall.width >= viewLeft - margin && wall.x <= viewRight + margin &&
            wall.y + wall.height >= viewTop - margin && wall.y <= viewBottom + margin) {
            drawWall(store, wall);
        }
    }
    
    // Dibujar plataformas después del jugador para que vayan por delante - loop for es más rápido
    const platforms = store.platforms;
    const platformsLength = platforms.length;
    for (let i = 0; i < platformsLength; i++) {
        const p = platforms[i];
        if (p.x + p.width >= viewLeft - margin && p.x <= viewRight + margin &&
            p.y + p.height >= viewTop - margin && p.y <= viewBottom + margin) {
            drawPlatform(store, p);
        }
    }
    
    drawLasers(store); // Los láseres son pocos, siempre dibujar
    drawBombs(store); // Las bombas son pocas, siempre dibujar
    drawParticles(store); // Las partículas son ligeras
    drawFloatingScores(store); // Los scores son pocos
    
    renderCtx.restore();
    
    // Si estamos usando offscreen canvas, copiar el resultado al canvas visible
    // OPTIMIZACIÓN: Deshabilitar suavizado al escalar para mejor rendimiento y estilo pixel art
    if (useOffscreen && store.dom.offscreenCanvas) {
        displayCtx.imageSmoothingEnabled = false; // Pixel art - no suavizar al escalar (más rápido)
        displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
        displayCtx.drawImage(store.dom.offscreenCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
    }
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

