import '../styles/main.scss';

import initialLevelsRaw from '../assets/levels.json';
import { expandLevelsFromAny } from './utils/levels';

import { createInitialStore } from './core/state';
import { preloadAssets } from './core/assets';
import { TILE_SIZE } from './core/constants';
import { setupUI, showMenu, startGame } from './components/ui';
import { setupEditorState, bindEditorCanvas, drawEditor } from './components/editor';
import { handlePlayerInput, updatePlayer, checkEnemyCollision } from './components/player';
import { loadLevel, updateWalls, awardMinerRescue } from './components/level';
import { updateEnemies, updateMiner } from './components/enemy';
import { updateLasers } from './components/laser';
import { updateBombs, updateExplosions } from './components/bomb';
import { updateParticles, updateFallingEntities, updateFloatingScores } from './components/effects';
import { renderGame, renderEditor } from './components/render';
import { updateLights } from './components/light';
import { initAudio, playBackgroundMusic } from './components/audio';

const store = createInitialStore();
const expanded = expandLevelsFromAny(initialLevelsRaw);
store.initialLevels = expanded;
store.levelDesigns = JSON.parse(JSON.stringify(expanded));

const updateCamera = () => {
    const canvas = store.dom.canvas;
    if (!canvas) return;

    // Cámara vertical (como antes)
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

    // Cámara horizontal por bloques de 20 tiles
    const BLOCK_WIDTH_TILES = 20; // Ancho del bloque en tiles
    const BLOCK_WIDTH_PIXELS = BLOCK_WIDTH_TILES * TILE_SIZE; // Ancho del bloque en pixels
    
    // Calcular en qué bloque de 20 tiles está el héroe
    const playerCenterX = store.player.x + store.player.width / 2;
    const playerBlock = Math.floor(playerCenterX / BLOCK_WIDTH_PIXELS);
    
    // Calcular en qué bloque está actualmente la cámara
    const currentCameraBlock = Math.floor(store.cameraX / BLOCK_WIDTH_PIXELS);
    
    // Si el héroe está en un bloque diferente al de la cámara, mover la cámara
    if (playerBlock !== currentCameraBlock) {
        store.cameraX = playerBlock * BLOCK_WIDTH_PIXELS;
    }

    // Calcular límites horizontales del nivel (asegurar que no se pase del nivel)
    const levelCols = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
    const maxCameraX = Math.max(0, levelCols * TILE_SIZE - canvas.width);
    store.cameraX = Math.max(0, Math.min(store.cameraX, maxCameraX));
};

const checkMinerRescue = () => {
    const miner = store.miner;
    if (!miner || miner.animationState === 'rescued') return;

    // Zona de rescate basada en el primer tile expuesto del minero
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
        awardMinerRescue(store);
    }
};

const updateGameState = () => {
    if (store.gameState !== 'playing' && store.gameState !== 'floating') return;

    handlePlayerInput(store);
    updatePlayer(store);
    updateWalls(store);
    updateEnemies(store);
    updateMiner(store);
    updateLasers(store);
    updateLights(store);
    updateBombs(store);
    updateExplosions(store);
    updateParticles(store);
    updateFallingEntities(store);
    updateFloatingScores(store);
    checkEnemyCollision(store);
    checkMinerRescue();
    updateCamera();
};

const gameLoop = () => {
    if (store.appState === 'playing') {
        updateGameState();
        renderGame(store);
    } else if (store.appState === 'editing') {
        renderEditor(store, drawEditor);
    }

    requestAnimationFrame(gameLoop);
};

const bootstrap = () => {
    setupUI(store);
    setupEditorState(store);
    bindEditorCanvas(store);
    
    // Inicializar sistema de audio
    initAudio();
    
    showMenu(store);

    preloadAssets(store, () => {
        loadLevel(store);
        // No llamar startGame automáticamente - esperar a que el usuario presione el botón
        gameLoop();
    });
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootstrap();
} else {
    window.addEventListener('DOMContentLoaded', bootstrap);
}

