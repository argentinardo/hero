import type { GameStore, Light } from '../core/types';
import { checkCollision } from '../core/collision';

export const updateLights = (store: GameStore) => {
    const { lights, lasers, player } = store;

    lights.forEach(light => {
        if (!light.isOn) return;

        // Verificar colisión con láser
        lasers.forEach(laser => {
            if (checkCollision(light, laser)) {
                light.isOn = false;
                store.isDark = true;
            }
        });

        // Verificar colisión con jugador
        if (checkCollision(light, player.hitbox)) {
            light.isOn = false;
            store.isDark = true;
        }
    });
};

export const drawLight = (store: GameStore, light: Light) => {
    const ctx = store.dom.ctx;
    if (!ctx) return;

    if (light.isOn) {
        // Luz encendida: círculo amarillo brillante
        const centerX = light.x + light.width / 2;
        const centerY = light.y + light.height / 2;
        const radius = light.width / 3;

        // Brillo exterior
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2);
        gradient.addColorStop(0, 'rgba(255, 255, 100, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Luz central
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Luz apagada: círculo gris
        const centerX = light.x + light.width / 2;
        const centerY = light.y + light.height / 2;
        const radius = light.width / 3;

        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    }
};


