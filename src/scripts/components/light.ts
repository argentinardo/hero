import type { GameStore, Light } from '../core/types';
import { checkCollision } from '../core/collision';
import { playBulbOff } from './audio';

const markCharactersInViewport = (store: GameStore) => {
    const canvas = store.dom.canvas;
    if (!canvas) return;

    const cameraY = store.cameraY;
    const cameraX = store.cameraX;
    const screenTop = cameraY;
    const screenBottom = cameraY + canvas.height;
    const screenLeft = cameraX;
    const screenRight = cameraX + canvas.width;

    // Función para verificar si un objeto está visible en el viewport
    const isInViewport = (obj: { x: number; y: number; width: number; height: number }) => {
        return obj.x + obj.width > screenLeft &&
               obj.x < screenRight &&
               obj.y + obj.height > screenTop &&
               obj.y < screenBottom;
    };

    // Marcar las paredes que están en el viewport (excepto lava)
    store.walls.forEach(wall => {
        if (wall.tile !== '3' && isInViewport(wall)) {
            wall.affectedByDark = true;
        }
    });

    // Marcar los enemigos que están en el viewport
    store.enemies.forEach(enemy => {
        if (!enemy.isHidden && isInViewport(enemy)) {
            enemy.affectedByDark = true;
        }
    });

    // Marcar minero si está en el viewport
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
                playBulbOff();
                markCharactersInViewport(store);
            }
        });

        // Verificar colisión con jugador
        if (checkCollision(light, player.hitbox)) {
            light.isOn = false;
            store.isDark = true;
            playBulbOff();
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

    const sprite = store.sprites.L;
    
    if (sprite) {
        // Detectar paredes adyacentes para determinar la orientación de la luz
        const TILE_SIZE = light.width; // Asumimos que la luz tiene el tamaño de un tile
        const gridX = Math.floor(light.x / TILE_SIZE);
        const gridY = Math.floor(light.y / TILE_SIZE);
        
        // Buscar paredes a los lados
        const wallLeft = store.walls.find(w => 
            w.x === (gridX - 1) * TILE_SIZE && w.y === gridY * TILE_SIZE
        );
        const wallRight = store.walls.find(w => 
            w.x === (gridX + 1) * TILE_SIZE && w.y === gridY * TILE_SIZE
        );
        
        // Determinar si debe estar espejada
        // Si hay pared a la derecha (y no a la izquierda), voltear
        const shouldFlip = wallRight && !wallLeft;
        
        // Dibujar sprite de la luz
        // Si la imagen tiene 2 frames (encendida/apagada), usar el frame apropiado
        const frameWidth = sprite.width / 2; // Asumimos 2 frames
        const frameIndex = light.isOn ? 0 : 1; // Frame 0 = encendida, Frame 1 = apagada
        
        ctx.save();
        
        if (shouldFlip) {
            // Aplicar espejado horizontal
            ctx.translate(light.x + light.width, light.y);
            ctx.scale(-1, 1);
            
            ctx.drawImage(
                sprite,
                frameIndex * frameWidth, // Posición X en el sprite
                0,                       // Posición Y en el sprite
                frameWidth,              // Ancho del frame
                sprite.height,           // Alto del sprite
                0,                       // Posición X (ya ajustada con translate)
                0,                       // Posición Y (ya ajustada con translate)
                light.width,             // Ancho de renderizado
                light.height             // Alto de renderizado
            );
        } else {
            // Normal (sin espejado)
            ctx.drawImage(
                sprite,
                frameIndex * frameWidth, // Posición X en el sprite
                0,                       // Posición Y en el sprite
                frameWidth,              // Ancho del frame
                sprite.height,           // Alto del sprite
                light.x,                 // Posición X en el canvas
                light.y,                 // Posición Y en el canvas
                light.width,             // Ancho de renderizado
                light.height             // Alto de renderizado
            );
        }
        
        ctx.restore();
    } else {
        // Fallback si no hay sprite: dibujar círculos como antes
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
    }
};


