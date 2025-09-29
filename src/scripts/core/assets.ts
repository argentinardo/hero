import playerWalkSrc from '../../assets/sprites/hero_walk.png';
import playerStandSrc from '../../assets/sprites/hero_stand.png';
import playerJumpSrc from '../../assets/sprites/hero_jump.png';
import playerFlySrc from '../../assets/sprites/hero_fly.png';
import batSrc from '../../assets/sprites/bat_small.png';
import spiderSrc from '../../assets/sprites/spider_small.png';
import viperSrc from '../../assets/sprites/serpiente_small.png';
import minerSrc from '../../assets/sprites/miner_small.png';
import bombSrc from '../../assets/sprites/bomba.png';
import explosionSrc from '../../assets/sprites/boooom.png';
import wallSrc from '../../assets/sprites/wall_small.png';
import dirtSrc from '../../assets/sprites/tierra_small.png';
import columnSrc from '../../assets/sprites/tierra_small.png';
import lavaSrc from '../../assets/sprites/lava.png';

import type { AnimationMap, GameStore, TileDictionary } from './types';

export const SPRITE_SOURCES: Record<string, string> = {
    P_walk: playerWalkSrc,
    P_stand: playerStandSrc,
    P_jump: playerJumpSrc,
    P_fly: playerFlySrc,
    '8': batSrc,
    S: spiderSrc,
    V: viperSrc,
    '9': minerSrc,
    bomb: bombSrc,
    explosion: explosionSrc,
    '1': wallSrc,
    '2': dirtSrc,
    C: columnSrc,
    '3': lavaSrc,
};

export const ANIMATION_DATA: AnimationMap = {
    P_walk: { frames: 5, speed: 5, sprite: 'P_walk', reverse: true },
    P_stand: { frames: 4, speed: 20, sprite: 'P_stand' },
    P_jump: { frames: 4, speed: 10, sprite: 'P_jump', loop: false },
    P_fly: { frames: 5, speed: 10, sprite: 'P_fly' },
    '8': { frames: 6, speed: 2, sprite: '8' },
    S: { frames: 15, speed: 7, sprite: 'S' },
    V: { frames: 1, speed: 1, sprite: 'V' },
    '9_idle': { frames: 6, speed: 10, sprite: '9' },
    '9_rescued': { frames: 6, speed: 10, sprite: '9', loop: false },
    '3': { frames: 16, speed: 19, sprite: '3' },
    bomb: { frames: 6, speed: 15, sprite: 'bomb', loop: false },
    explosion: { frames: 6, speed: 2, sprite: 'explosion', loop: false },
};

export const TILE_TYPES: TileDictionary = {
    '0': { name: 'Vacío', color: '#000', class: '' },
    P: { name: 'Player', color: '#ff0000', class: 'player' },
    '1': { name: 'Muro', color: '#6d6d6d', class: 'wall', sprite: '1' },
    '2': { name: 'Tierra', color: '#a5682a', class: 'destructible-wall', sprite: '2' },
    C: { name: 'Columna', color: '#c5853f', class: 'destructible-wall', sprite: 'C' },
    '3': { name: 'Lava', color: '#ff4500', class: 'lava', sprite: '3' },
    '8': { name: 'Murciélago', color: '#9400d3', class: 'bat', sprite: '8' },
    S: { name: 'Araña', color: '#ff8c00', class: 'spider', sprite: 'S' },
    V: { name: 'Víbora', color: '#32cd32', class: 'viper', sprite: 'V' },
    '9': { name: 'Minero', color: '#4169e1', class: 'miner', sprite: '9' },
};

export const preloadAssets = (store: GameStore, callback: () => void) => {
    const entries = Object.entries(SPRITE_SOURCES);
    if (entries.length === 0) {
        callback();
        return;
    }

    let loaded = 0;
    const total = entries.length;

    entries.forEach(([key, src]) => {
        const image = new Image();
        store.sprites[key] = image;
        image.onload = () => {
            loaded++;
            if (loaded === total) {
                callback();
            }
        };
        image.onerror = () => {
            console.error(`No se pudo cargar el sprite ${key} desde ${src}`);
            loaded++;
            if (loaded === total) {
                callback();
            }
        };
        image.src = src;
    });
};

