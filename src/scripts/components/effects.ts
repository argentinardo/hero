import { GRAVITY, TILE_SIZE } from '../core/constants';
import type { GameStore } from '../core/types';
import { playToyBounce, playBrickBounce } from './audio';

// Velocidad máxima de caída para enemigos muertos (alcanzada después de 1 segundo)
const MAX_FALL_VELOCITY = 10; // Velocidad de caída más lenta y controlada

// Detectar mobile para optimizaciones
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
};

export const updateParticles = (store: GameStore) => {
    // Si está pausado, no actualizar partículas
    if (store.isPaused) return;
    
    const isMobile = isMobileDevice();
    const maxParticles = isMobile ? 50 : 200; // Limitar partículas en mobile
    
    // Eliminar partículas excedentes (las más viejas)
    if (store.particles.length > maxParticles) {
        store.particles = store.particles.slice(-maxParticles);
    }
    
    for (let i = store.particles.length - 1; i >= 0; i--) {
        const particle = store.particles[i];
        particle.life -= 1;
        if (particle.life <= 0) {
            store.particles.splice(i, 1);
            continue;
        }
        particle.vy += particle.gravity ?? 0.05; // Usar gravedad personalizada o 0.05 por defecto
        particle.x += particle.vx;
        particle.y += particle.vy;
    }
};

export const updateFallingEntities = (store: GameStore) => {
    // Si está pausado, no actualizar entidades que caen
    if (store.isPaused) return;
    
    const canvasHeight = store.dom.canvas?.height ?? 0;
    for (let i = store.fallingEntities.length - 1; i >= 0; i--) {
        const entity = store.fallingEntities[i];
        // Aplicar gravedad con triple velocidad y sin límite de aceleración
        entity.vy += GRAVITY * 3; // Triple velocidad de caída
        // Sin límite de velocidad máxima
        entity.y += entity.vy;
        entity.x += entity.vx;
        if (entity.rotationSpeed) {
            entity.rotation = (entity.rotation ?? 0) + entity.rotationSpeed;
        }

        // Rebote en suelo expuesto: ejecutar a lo sumo una vez
        if (!entity.hasBounced) {
            const level = store.levelDesigns[store.currentLevelIndex];
            if (level && level.length > 0) {
                const cols = level[0]?.length ?? 0;
                const gridCenterX = Math.floor((entity.x + entity.width / 2) / TILE_SIZE);
                const gridYBelow = Math.floor((entity.y + entity.height) / TILE_SIZE);
                if (gridCenterX >= 0 && gridCenterX < cols && gridYBelow >= 0 && gridYBelow < level.length) {
                    const below = level[gridYBelow][gridCenterX];
                    const above = gridYBelow - 1 >= 0 ? level[gridYBelow - 1][gridCenterX] : '1';
                    if (below === '1' && above === '0') {
                        const groundY = gridYBelow * TILE_SIZE - entity.height;
                        if (entity.y >= groundY) {
                            entity.y = groundY;
                            entity.vy = -Math.abs(entity.vy) * 0.1; // Rebote mínimo (10% de la velocidad)
                            entity.vx *= 0.3; // Fricción horizontal más fuerte
                            entity.hasBounced = true;
                            // Brick sound para ladrillos normales ('1'), columna ('C') y columna de lava ('K'); resto usa toy
                            const isBrickTile = entity.tile === '1' || entity.tile === 'C' || entity.tile === 'K';
                            if (isBrickTile) {
                                playBrickBounce();
                            } else {
                                playToyBounce();
                            }
                        }
                    }
                }
            }
        }

        if (entity.y > store.cameraY + canvasHeight) {
            store.fallingEntities.splice(i, 1);
        }
    }
};

export const updateFloatingScores = (store: GameStore) => {
    // Si está pausado, no actualizar puntajes flotantes
    if (store.isPaused) return;
    
    for (let i = store.floatingScores.length - 1; i >= 0; i--) {
        const score = store.floatingScores[i];
        score.life -= 1;
        if (score.life <= 0) {
            store.floatingScores.splice(i, 1);
            continue;
        }
        
        // Movimiento ascendente más suave
        score.y -= 1.2;
        
        // Fade out más gradual y visible
        const fadeStart = 40; // Empezar a desvanecer en los últimos 40 frames
        if (score.life > fadeStart) {
            score.opacity = 1; // Completamente visible al principio
        } else {
            score.opacity = score.life / fadeStart; // Fade out gradual
        }
    }
};

export const updatePlatforms = (store: GameStore) => {
    // Si está pausado, no actualizar plataformas
    if (store.isPaused) return;
    
    const { platforms, walls } = store;
    platforms.forEach(platform => {
        if (!platform.isActive) return;
        platform.x += platform.vx;
        // Rebotar al chocar con una pared sólida o borde de nivel
        const left = platform.x;
        const right = platform.x + platform.width;
        const levelWidth = store.levelDesigns[store.currentLevelIndex][0].length * 64; // TILE_SIZE
        // Bordes
        if (left <= 0 || right >= levelWidth) {
            platform.vx *= -1;
            platform.x = Math.max(0, Math.min(platform.x, levelWidth - platform.width));
            return;
        }
        // Paredes
        const hitWall = walls.find(w => w.tile !== '3' &&
            !(w.y + w.height <= platform.y || w.y >= platform.y + platform.height) &&
            !(w.x + w.width <= platform.x || w.x >= platform.x + platform.width));
        if (hitWall) {
            platform.vx *= -1;
            // Empujar fuera de la pared
            if (platform.vx > 0) {
                platform.x = hitWall.x + hitWall.width;
            } else {
                platform.x = hitWall.x - platform.width;
            }
        }
    });
};

