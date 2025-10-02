import type { GameStore, Light } from '../core/types';
import { checkCollision } from '../core/collision';

const markCharactersInViewport = (store: GameStore) => {
    const canvas = store.dom.canvas;
    if (!canvas) return;

    const cameraY = store.cameraY;
    const screenTop = cameraY;
    const screenBottom = cameraY + canvas.height;
    const screenLeft = 0;
    const screenRight = canvas.width;

    // Función para verificar si un objeto está visible en el viewport
    const isInViewport = (obj: { x: number; y: number; width: number; height: number }) => {
        return obj.x + obj.width > screenLeft &&
               obj.x < screenRight &&
               obj.y + obj.height > screenTop &&
               obj.y < screenBottom;
    };

    // Marcar SOLO las paredes que están en el viewport (excepto lava)
    store.walls.forEach(wall => {
        if (wall.tile !== '3' && isInViewport(wall)) {
            wall.affectedByDark = true;
        }
    });

    // Marcar SOLO los enemigos que están en el viewport
    store.enemies.forEach(enemy => {
        if (!enemy.isHidden && isInViewport(enemy)) {
            enemy.affectedByDark = true;
        }
    });

    // Marcar minero SOLO si está en el viewport
    if (store.miner && isInViewport(store.miner)) {
        store.miner.affectedByDark = true;
    }
};

export const updateLights = (store: GameStore) => {
    const { lights, lasers, player } = store;

    lights.forEach(light => {
        if (!light.isOn) return;

        // Verificar colisión con láser
        lasers.forEach(laser => {
            if (checkCollision(light, laser)) {
                light.isOn = false;
                store.isDark = true;
                markCharactersInViewport(store);
            }
        });

        // Verificar colisión con jugador
        if (checkCollision(light, player.hitbox)) {
            light.isOn = false;
            store.isDark = true;
            markCharactersInViewport(store);
        }
    });

    // Si todas las luces están encendidas, resetear el modo oscuro
    const allLightsOn = lights.length > 0 && lights.every(light => light.isOn);
    if (allLightsOn && store.isDark) {
        store.isDark = false;
        // Limpiar las marcas de todos los elementos afectados
        store.walls.forEach(wall => {
            wall.affectedByDark = false;
        });
        store.enemies.forEach(enemy => {
            enemy.affectedByDark = false;
        });
        if (store.miner) {
            store.miner.affectedByDark = false;
        }
    }
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


