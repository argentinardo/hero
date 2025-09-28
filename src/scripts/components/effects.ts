import { GRAVITY } from '../core/constants';
import type { GameStore } from '../core/types';

export const updateParticles = (store: GameStore) => {
    for (let i = store.particles.length - 1; i >= 0; i--) {
        const particle = store.particles[i];
        particle.life -= 1;
        if (particle.life <= 0) {
            store.particles.splice(i, 1);
            continue;
        }
        particle.vy += 0.05;
        particle.x += particle.vx;
        particle.y += particle.vy;
    }
};

export const updateFallingEntities = (store: GameStore) => {
    const canvasHeight = store.dom.canvas?.height ?? 0;
    for (let i = store.fallingEntities.length - 1; i >= 0; i--) {
        const entity = store.fallingEntities[i];
        entity.vy += GRAVITY;
        entity.y += entity.vy;
        entity.x += entity.vx;
        if (entity.rotationSpeed) {
            entity.rotation = (entity.rotation ?? 0) + entity.rotationSpeed;
        }
        if (entity.y > store.cameraY + canvasHeight) {
            store.fallingEntities.splice(i, 1);
        }
    }
};

export const updateFloatingScores = (store: GameStore) => {
    for (let i = store.floatingScores.length - 1; i >= 0; i--) {
        const score = store.floatingScores[i];
        score.life -= 1;
        if (score.life <= 0) {
            store.floatingScores.splice(i, 1);
            continue;
        }
        score.y -= 0.5;
        score.opacity = score.life / 60;
    }
};

