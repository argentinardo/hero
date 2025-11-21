import playerWalkSrc from '../../assets/sprites/hero_walk.png';
import playerStandSrc from '../../assets/sprites/hero_stand.png';
import playerJumpSrc from '../../assets/sprites/hero_jump.png';
import playerFlySrc from '../../assets/sprites/hero_fly.png';
import playerFireSrc from '../../assets/sprites/fire.png';
import playerDieSrc from '../../assets/sprites/hero-die.png';
import playerSuccessSrc from '../../assets/sprites/hero-success.png';
import batSrc from '../../assets/sprites/bat_small.png';
import spiderSrc from '../../assets/sprites/spider_small.png';
import viperSrc from '../../assets/sprites/serpiente_small.png';
import viperDeathSrc from '../../assets/sprites/serpiente_death.png';
import minerSrc from '../../assets/sprites/miner_small.png';
import tentacleSrc from '../../assets/sprites/tentaculo.png';
import bombSrc from '../../assets/sprites/bomba.png';
import explosionSrc from '../../assets/sprites/boooom.png';
import wallSrc from '../../assets/sprites/wall_small.png';
import aguaSrc from '../../assets/sprites/agua_small.png';
import columnSrc from '../../assets/sprites/weakwall.png';
import lavaSrc from '../../assets/sprites/lava.png';
import lavaColSrc from '../../assets/sprites/lava_col.png';
import lightSrc from '../../assets/sprites/luz.png';
import backgroundSrc from '../../assets/sprites/background_small.png';
import splashSrc from '../../assets/sprites/splashSprite.jpg';
import splashMobileSrc from '../../assets/sprites/splashSprite_mobile.jpg';
import splashFixedSrc from '../../assets/sprites/splash-fixed.jpg';
import baseSrc from '../../assets/sprites/base.png';
import heroLogoSrc from '../../assets/sprites/hero-logo.png';
import qrSrc from '../../assets/sprites/qr.png';

import type { AnimationMap, GameStore, TileDictionary } from './types';

// Función helper para detectar si es mobile (consistente con main.ts y render.ts)
const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
};

export const SPRITE_SOURCES: Record<string, string> = {
    P_walk: playerWalkSrc,
    P_stand: playerStandSrc,
    P_jump: playerJumpSrc,
    P_fly: playerFlySrc,
    P_fire: playerFireSrc,
    P_die: playerDieSrc,
    P_success: playerSuccessSrc,
    '8': batSrc,
    S: spiderSrc,
    V: viperSrc,
    V_death: viperDeathSrc,
    '9': minerSrc,
    T: tentacleSrc,
    bomb: bombSrc,
    explosion: explosionSrc,
    '1': wallSrc,
    '2': aguaSrc,
    C: columnSrc,
    '3': lavaSrc,
    K: lavaColSrc,
    L: lightSrc,
    background: backgroundSrc,
    splash: isMobile() ? splashMobileSrc : splashSrc,
    'splash-fixed': splashFixedSrc,
    base: baseSrc,
    heroLogo: heroLogoSrc,
    qr: qrSrc,
};

export const ANIMATION_DATA: AnimationMap = {
    P_walk: { frames: 5, speed: 4, sprite: 'P_walk', reverse: true }, // Acelerado de 5 a 4
    P_stand: { frames: 4, speed: 15, sprite: 'P_stand' }, // Acelerado de 20 a 15
    P_jump: { frames: 4, speed: 3, sprite: 'P_jump', loop: false }, // Mucho más rápido para activación inmediata del jetpack
    P_fly: { frames: 5, speed: 8, sprite: 'P_fly' }, // Acelerado de 10 a 8
    P_fire: { frames: 2, speed: 3, sprite: 'P_fire' }, // 20 FPS para animación de disparo
    P_die: { frames: 1, speed: 1, sprite: 'P_die', loop: false },
    P_success: { frames: 1, speed: 1, sprite: 'P_success', loop: false },
    '8': { frames: 6, speed: 2, sprite: '8' },
    S: { frames: 15, speed: 6, sprite: 'S' }, // Acelerado de 7 a 6
    V: { frames: 4, speed: 6, sprite: 'V' }, // Acelerado de 8 a 6
    T: { frames: 26, speed: 6, sprite: 'T' }, // Acelerado de 8 a 6
    '2': { frames: 4, speed: 6, sprite: '2' }, // Acelerado de 8 a 6 - Agua con 2x2 frames
    '9_idle': { frames: 2, speed: 60, sprite: '9' },
    '9_rescued': { frames: 6, speed: 8, sprite: '9', loop: false }, // Acelerado de 10 a 8
    '3': { frames: 16, speed: 15, sprite: '3' }, // Acelerado de 19 a 15
    K: { frames: 16, speed: 15, sprite: 'K' }, // Acelerado de 19 a 15
    bomb: { frames: 6, speed: 12, sprite: 'bomb', loop: false }, // Acelerado de 15 a 12
    explosion: { frames: 6, speed: 2, sprite: 'explosion', loop: false },
};

export const TILE_TYPES: TileDictionary = {
    '0': { name: 'Vacío', color: '#000', class: '' },
    P: { name: 'Player', color: '#ff0000', class: 'player' },
    '1': { name: 'Muro', color: '#6d6d6d', class: 'wall', sprite: '1' },
    '2': { name: 'agua', color: '#a5682a', class: 'destructible-wall', sprite: '2' },
    C: { name: 'Columna', color: '#c5853f', class: 'destructible-wall', sprite: 'C' },
    K: { name: 'Columna Lava', color: '#ff4500', class: 'lava-column', sprite: 'K' },
    '3': { name: 'Lava', color: '#ff4500', class: 'lava', sprite: '3' },
    '8': { name: 'Murciélago', color: '#9400d3', class: 'bat', sprite: '8' },
    S: { name: 'Araña', color: '#ff8c00', class: 'spider', sprite: 'S' },
    V: { name: 'Víbora', color: '#32cd32', class: 'viper', sprite: 'V' },
    T: { name: 'Tentáculo', color: '#228b22', class: 'tentacle', sprite: 'T' },
    '9': { name: 'Minero', color: '#4169e1', class: 'miner', sprite: '9' },
    L: { name: 'Luz', color: '#ffff00', class: 'light' },
    'A': { name: 'Plataforma', color: '#ffff00', class: 'platform' },
    'H': { name: 'Pared Izquierda', color: '#cc0000', class: 'crushing-left' },
    'J': { name: 'Pared Derecha', color: '#cc0000', class: 'crushing-right' },
};

// Función para cargar sprites de forma lazy
export const loadSpritesLazy = async (store: GameStore, spriteKeys: string[] = []) => {
    const entries = Object.entries(SPRITE_SOURCES);
    const filteredEntries = spriteKeys.length > 0 
        ? entries.filter(([key]) => spriteKeys.includes(key))
        : entries;

    if (filteredEntries.length === 0) {
        return Promise.resolve();
    }

    const loadPromises = filteredEntries.map(([key, src]) => {
        return new Promise<void>((resolve, reject) => {
            const image = new Image();
            store.sprites[key] = image;
            image.onload = () => resolve();
            image.onerror = () => {
                console.error(`No se pudo cargar el sprite ${key} desde ${src}`);
                reject(new Error(`Failed to load sprite ${key}`));
            };
            image.src = src;
        });
    });

    return Promise.all(loadPromises);
};

// Función para cargar sprites críticos primero
export const preloadCriticalAssets = (store: GameStore, callback: () => void) => {
    const criticalSprites = ['P_stand', 'P_walk', 'P_fire', '1', '2', 'background', 'splash-fixed', 'splash', 'base'];
    
    loadSpritesLazy(store, criticalSprites)
        .then(() => {
            callback();
        })
        .catch(() => {
            console.warn('Error cargando assets críticos, continuando...');
            callback();
        });
};

// Función legacy para compatibilidad
export const preloadAssets = (store: GameStore, callback: () => void) => {
    loadSpritesLazy(store)
        .then(() => {
            callback();
        })
        .catch(() => {
            console.warn('Error cargando assets, continuando...');
            callback();
        });
};

