import type { GameObject, Wall } from './types';
import { TILE_SIZE } from './constants';

export const checkCollision = (a: GameObject, b: GameObject) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;

/**
 * Verifica si un tile está en un bloque con altura (tiles apilados verticalmente)
 * @param wall - El tile a verificar
 * @param walls - Array de todos los tiles del nivel
 * @returns true si el tile está en un bloque con altura
 */
export const isInHeightBlock = (wall: Wall, walls: Wall[]): boolean => {
    // Solo verificar tiles de muro ('1'), agua ('2') y columnas ('C')
    if (wall.tile !== '1' && wall.tile !== '2' && wall.tile !== 'C') {
        return false;
    }

    const tileX = wall.x;
    const tileY = wall.y;
    
    // Buscar tiles en la misma posición X (misma columna)
    const tilesInColumn = walls.filter(w => 
        w.x === tileX && 
        (w.tile === '1' || w.tile === '2' || w.tile === 'C') &&
        w !== wall
    );

    if (tilesInColumn.length === 0) {
        return false;
    }

    // Verificar si hay tiles arriba o abajo
    const hasTileAbove = tilesInColumn.some(w => w.y === tileY - TILE_SIZE);
    const hasTileBelow = tilesInColumn.some(w => w.y === tileY + TILE_SIZE);

    // Si hay tiles arriba Y abajo, o si hay tiles arriba (indicando que este es un tile intermedio)
    return hasTileAbove || (hasTileAbove && hasTileBelow);
};

/**
 * Verifica si un tile es el bloque superior de una columna con altura
 * @param wall - El tile a verificar
 * @param walls - Array de todos los tiles del nivel
 * @returns true si el tile es el bloque superior
 */
export const isTopBlock = (wall: Wall, walls: Wall[]): boolean => {
    if (wall.tile !== '1' && wall.tile !== '2' && wall.tile !== 'C') {
        return false;
    }

    const tileX = wall.x;
    const tileY = wall.y;
    
    // Buscar si hay un tile arriba en la misma columna
    const hasTileAbove = walls.some(w => 
        w.x === tileX && 
        w.y === tileY - TILE_SIZE &&
        (w.tile === '1' || w.tile === '2' || w.tile === 'C')
    );

    return !hasTileAbove;
};

