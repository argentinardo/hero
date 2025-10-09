import '../styles/main.scss';

import initialLevels from '../assets/levels.json';

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

const store = createInitialStore();
store.initialLevels = initialLevels;
store.levelDesigns = JSON.parse(JSON.stringify(initialLevels));

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

    // Cámara horizontal (nueva funcionalidad)
    const horizontalDeadzone = canvas.width / 3;
    const playerRight = store.player.x + store.player.width;
    
    // Mover cámara si el jugador se acerca a los bordes
    if (store.player.x < store.cameraX + horizontalDeadzone) {
        store.cameraX = store.player.x - horizontalDeadzone;
    }
    if (playerRight > store.cameraX + canvas.width - horizontalDeadzone) {
        store.cameraX = playerRight - canvas.width + horizontalDeadzone;
    }

    // Calcular límites horizontales del nivel
    const levelCols = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
    const maxCameraX = Math.max(0, levelCols * TILE_SIZE - canvas.width);
    store.cameraX = Math.max(0, Math.min(store.cameraX, maxCameraX));
};

const checkMinerRescue = () => {
    const miner = store.miner;
    if (!miner || miner.animationState === 'rescued') return;

    const zone = {
        x: miner.x - 10,
        y: miner.y - 10,
        width: miner.width + 20,
        height: miner.height + 20,
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

