import '../styles/main.scss';

import initialLevelsRaw from '../assets/levels.json';
import { expandLevelsFromAny } from './utils/levels';

import { createInitialStore } from './core/state';
import { preloadCriticalAssets, loadSpritesLazy } from './core/assets';
import { TILE_SIZE } from './core/constants';
import { setupUI, showMenu, startGame } from './components/ui';
import { handlePlayerInput, updatePlayer } from './components/player';
import { loadLevel, updateWalls } from './components/level';
import { renderGame, renderEditor, animateSplash } from './components/render';

import { initAudio, playBackgroundMusic, loadAdditionalSFX } from './components/audio';

const store = createInitialStore();
const expanded = expandLevelsFromAny(initialLevelsRaw);
store.initialLevels = expanded;
store.levelDesigns = JSON.parse(JSON.stringify(expanded));
// Inicializar levelDataStore con los niveles expandidos
store.levelDataStore = expanded.map(level => level.map(row => row.split('')));

const updateCamera = () => {
    const canvas = store.dom.canvas;
    if (!canvas) return;

    const cameraDeadzone = canvas.height / 3;
    const playerBottom = store.player.y + store.player.height;
    if (store.player.y < store.cameraY + cameraDeadzone) {
        store.cameraY = store.player.y - cameraDeadzone;
    }
    if (playerBottom > store.cameraY + canvas.height - cameraDeadzone) {
        store.cameraY = playerBottom - canvas.height + cameraDeadzone;
    }

    const levelRows = store.levelDesigns[store.currentLevelIndex]?.length ?? 0;
    const maxCameraY = Math.max(0, levelRows * TILE_SIZE - canvas.height);
    store.cameraY = Math.max(0, Math.min(store.cameraY, maxCameraY));

    const BLOCK_WIDTH_TILES = 20;
    const BLOCK_WIDTH_PIXELS = BLOCK_WIDTH_TILES * TILE_SIZE;
    
    const playerCenterX = store.player.x + store.player.width / 2;
    const playerBlock = Math.floor(playerCenterX / BLOCK_WIDTH_PIXELS);
    
    const currentCameraBlock = Math.floor(store.cameraX / BLOCK_WIDTH_PIXELS);
    
    if (playerBlock !== currentCameraBlock) {
        store.cameraX = playerBlock * BLOCK_WIDTH_PIXELS;
    }

    const levelCols = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
    const maxCameraX = Math.max(0, levelCols * TILE_SIZE - canvas.width);
    store.cameraX = Math.max(0, Math.min(store.cameraX, maxCameraX));
};

const checkMinerRescue = () => {
    const miner = store.miner;
    if (!miner || miner.animationState === 'rescued') return;

    const tileWidth = TILE_SIZE;
    const frontRect = miner.isFlipped
        ? { x: miner.x, y: miner.y, width: tileWidth, height: miner.height }
        : { x: miner.x + Math.max(0, miner.width - tileWidth), y: miner.y, width: tileWidth, height: miner.height };

    const zone = {
        x: frontRect.x - 10,
        y: frontRect.y - 10,
        width: frontRect.width + 20,
        height: frontRect.height + 20,
    };

    const hitbox = store.player.hitbox;
    const intersects =
        hitbox.x < zone.x + zone.width &&
        hitbox.x + hitbox.width > zone.x &&
        hitbox.y < zone.y + zone.height &&
        hitbox.y + hitbox.height > zone.y;

    if (intersects) {
        import('./components/level').then(({ awardMinerRescue }) => {
            awardMinerRescue(store);
        });
    }
};

const updateGameState = async () => {
    if (store.gameState !== 'playing' && store.gameState !== 'floating') return;

    handlePlayerInput(store);
    updatePlayer(store);
    updateWalls(store);
    
    const [
        { updateEnemies, updateMiner },
        { updateLasers },
        { updateBombs, updateExplosions },
        { updateParticles, updateFallingEntities, updateFloatingScores, updatePlatforms },
        { updateLights },
        { checkEnemyCollision },
        { awardMinerRescue }
    ] = await Promise.all([
        import('./components/enemy'),
        import('./components/laser'),
        import('./components/bomb'),
        import('./components/effects'),
        import('./components/light'),
        import('./components/player'),
        import('./components/level')
    ]);
    
    updateEnemies(store);
    updateMiner(store);
    updateLasers(store);
    updateLights(store);
    updateBombs(store);
    updateExplosions(store);
    updateParticles(store);
    updateFallingEntities(store);
    updateFloatingScores(store);
    updatePlatforms(store);
    checkEnemyCollision(store);
    checkMinerRescue();
    updateCamera();
};

let lastFrameTime = performance.now();
let deltaTime = 0;
const targetFPS = 60;
const frameTime = 1000 / targetFPS;

const gameLoop = (currentTime: number) => {
    deltaTime = currentTime - lastFrameTime;
    
    if (deltaTime >= frameTime) {
        lastFrameTime = currentTime - (deltaTime % frameTime);
        
        if (store.appState === 'playing') {
            updateGameState().catch(() => {});
            renderGame(store);
        } else if (store.appState === 'editing') {
            import('./components/editor').then(({ drawEditor }) => {
                renderEditor(store, drawEditor);
            });
        } else if (store.appState === 'menu') {
            animateSplash(store);
        }
    }

    requestAnimationFrame(gameLoop);
};

const bootstrap = () => {
    setupUI(store);
    initAudio();
    
    showMenu(store);

    preloadCriticalAssets(store, () => {
        loadLevel(store);
        lastFrameTime = performance.now();
        
        const nonCriticalSprites = ['P_jump', 'P_fly', 'P_die', 'P_success', '8', 'S', 'V', 'V_death', 'T', '9', 'bomb', 'explosion', '3', 'L'];
        loadSpritesLazy(store, nonCriticalSprites).then(() => {
            console.log('Assets no críticos cargados');
        }).catch(() => {
            console.warn('Error cargando assets no críticos');
        });
        
        loadAdditionalSFX().then(() => {
            console.log('Efectos de sonido adicionales cargados');
        }).catch(() => {
            console.warn('Error cargando efectos de sonido adicionales');
        });
        
        requestAnimationFrame(gameLoop);
    });
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootstrap();
} else {
    window.addEventListener('DOMContentLoaded', bootstrap);
}

