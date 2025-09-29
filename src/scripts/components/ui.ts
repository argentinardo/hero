import nipplejs from 'nipplejs';
import type { EventData as NippleEvent, Joystick as NippleJoystick } from 'nipplejs';

import type { GameStore } from '../core/types';
import { TILE_TYPES, preloadAssets, ANIMATION_DATA } from '../core/assets';
import { TOTAL_LEVELS, TILE_SIZE } from '../core/constants';
import { loadLevel } from './level';

export const attachDomReferences = (store: GameStore) => {
    store.dom.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    store.dom.ctx = store.dom.canvas?.getContext('2d') ?? null;

    const ui = store.dom.ui;
    ui.livesCountEl = document.getElementById('lives-count');
    ui.levelCountEl = document.getElementById('level-count');
    ui.scoreCountEl = document.getElementById('score-count');
    ui.energyBarEl = document.getElementById('energy-bar');
    ui.messageOverlay = document.getElementById('message-overlay');
    ui.messageTitle = document.getElementById('message-title');
    ui.messageText = document.getElementById('message-text');
    ui.gameUiEl = document.getElementById('game-ui');
    ui.editorPanelEl = document.getElementById('editor-panel');
    ui.paletteEl = document.getElementById('tile-palette');
    ui.levelDataTextarea = document.getElementById('level-data-textarea') as HTMLTextAreaElement | null;
    ui.confirmationModalEl = document.getElementById('confirmation-modal');
    ui.levelSelectorEl = document.getElementById('level-selector') as HTMLSelectElement | null;
    ui.mobileControlsEl = document.getElementById('mobile-controls');
    ui.joystickZoneEl = document.getElementById('joystick-zone');
    ui.actionZoneEl = document.getElementById('action-zone');

    ui.startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;
    ui.levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
    ui.playTestBtn = document.getElementById('play-test-btn') as HTMLButtonElement | null;
    ui.resumeEditorBtn = document.getElementById('resume-editor-btn') as HTMLButtonElement | null;
    ui.loadLevelBtn = document.getElementById('load-level-btn') as HTMLButtonElement | null;
    ui.saveLevelBtn = document.getElementById('save-level-btn') as HTMLButtonElement | null;
    ui.exportLevelBtn = document.getElementById('export-level-btn') as HTMLButtonElement | null;
    ui.importLevelBtn = document.getElementById('import-level-btn') as HTMLButtonElement | null;
    ui.saveAllBtn = document.getElementById('save-all-btn') as HTMLButtonElement | null;
    ui.cleanLevelBtn = document.getElementById('clean-level-btn') as HTMLButtonElement | null;
    ui.backToMenuBtn = document.getElementById('back-to-menu-btn') as HTMLButtonElement | null;
    ui.confirmSaveBtn = document.getElementById('confirm-save-btn') as HTMLButtonElement | null;
    ui.cancelSaveBtn = document.getElementById('cancel-save-btn') as HTMLButtonElement | null;
};

const setBodyClass = (state: string) => {
    document.body.className = `state-${state}`;
};

export const showMenu = (store: GameStore) => {
    store.appState = 'menu';
    store.gameState = 'start';
    setBodyClass('menu');
    const { messageOverlay, messageTitle, messageText, gameUiEl, editorPanelEl, mobileControlsEl } = store.dom.ui;
    if (messageOverlay) {
        messageOverlay.style.display = 'flex';
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'none';
    }
    if (editorPanelEl) {
        editorPanelEl.style.display = 'none';
    }

    if (messageTitle) {
        messageTitle.textContent = 'H.E.R.O. CLONE';
    }
    if (messageText) {
        messageText.innerHTML = 'Presiona ENTER o el botón para empezar';
    }

    if ('ontouchstart' in window && mobileControlsEl) {
        mobileControlsEl.dataset.active = 'false';
        if (store.joystickManager) {
            store.joystickManager.destroy();
            store.joystickManager = null;
        }
    }
};

const startJoystick = (store: GameStore) => {
    if (!('ontouchstart' in window)) {
        return;
    }
    const { mobileControlsEl, joystickZoneEl, actionZoneEl } = store.dom.ui;
    if (mobileControlsEl) {
        mobileControlsEl.dataset.active = 'true';
    }
    if (!joystickZoneEl || store.joystickManager) {
        return;
    }
    store.joystickManager = nipplejs.create({
        zone: joystickZoneEl,
        mode: 'dynamic',
        position: { left: '50%', top: '50%' },
        color: 'white',
        catchforce: true,
    });
    store.joystickManager.on('move', (_evt: NippleEvent, data: NippleJoystick) => {
        const angle = data.angle.radian;
        const force = data.force;
        if (force <= 0.2) {
            return;
        }
        const up = Math.sin(angle);
        const right = Math.cos(angle);
        store.keys.ArrowUp = up > 0.5;
        store.keys.ArrowDown = up < -0.5;
        if (Math.abs(right) > 0.3) {
            if (right > 0) {
                store.keys.ArrowRight = true;
                store.keys.ArrowLeft = false;
            } else {
                store.keys.ArrowLeft = true;
                store.keys.ArrowRight = false;
            }
        } else {
            store.keys.ArrowLeft = false;
            store.keys.ArrowRight = false;
        }
    });
    store.joystickManager.on('end', () => {
        store.keys.ArrowUp = false;
        store.keys.ArrowDown = false;
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
    });

    if (actionZoneEl) {
        actionZoneEl.addEventListener('touchstart', event => {
            event.preventDefault();
            store.keys.Space = true;
        });
        actionZoneEl.addEventListener('touchend', event => {
            event.preventDefault();
            store.keys.Space = false;
        });
    }
};

export const startGame = (store: GameStore, levelOverride: string[] | null = null) => {
    store.appState = 'playing';
    store.gameState = 'playing';
    setBodyClass('playing');
    const { messageOverlay, gameUiEl, editorPanelEl } = store.dom.ui;
    if (messageOverlay) {
        messageOverlay.style.display = 'none';
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'flex';
    }
    store.dom.ui.resumeEditorBtn?.classList.remove('hidden');
    if (editorPanelEl) {
        editorPanelEl.style.display = 'none';
    }
    startJoystick(store);
    store.lives = 3;
    store.score = 0;
    store.currentLevelIndex = 0;
    if (levelOverride) {
        store.levelDesigns = [levelOverride];
    } else {
        store.levelDesigns = JSON.parse(JSON.stringify(store.initialLevels));
    }
    loadLevel(store);
};

export const startEditor = (store: GameStore) => {
    store.appState = 'editing';
    setBodyClass('editing');
    const { messageOverlay, gameUiEl, editorPanelEl } = store.dom.ui;
    if (messageOverlay) {
        messageOverlay.style.display = 'none';
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'none';
    }
    store.dom.ui.resumeEditorBtn?.classList.add('hidden');
    if (editorPanelEl) {
        editorPanelEl.style.display = 'flex';
    }
};

export const updateUiBar = (store: GameStore) => {
    const { livesCountEl, levelCountEl, scoreCountEl, energyBarEl } = store.dom.ui;
    if (livesCountEl) {
        livesCountEl.textContent = `${store.lives}`;
    }
    if (levelCountEl) {
        levelCountEl.textContent = `${store.currentLevelIndex + 1}`;
    }
    if (scoreCountEl) {
        scoreCountEl.textContent = `${store.score}`;
    }
    if (energyBarEl) {
        energyBarEl.style.width = `${(store.energy / 200) * 100}%`;
    }
};

const paletteEntries: Array<{ tile: string; canvas: HTMLCanvasElement }> = [];
let paletteAnimationId: number | null = null;

const drawPaletteEntry = (store: GameStore, tile: string, canvas: HTMLCanvasElement, timestamp: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const spriteKey = TILE_TYPES[tile]?.sprite;
    const sprite = spriteKey ? store.sprites[spriteKey] : undefined;
    if (sprite && sprite.naturalWidth > 0 && sprite.naturalHeight > 0) {
        let anim = ANIMATION_DATA[tile as keyof typeof ANIMATION_DATA] ?? (spriteKey ? ANIMATION_DATA[spriteKey as keyof typeof ANIMATION_DATA] : undefined);
        let effectiveFrames = anim?.frames ?? 0;
        let totalFrames = anim?.frames ?? 0;
        if (tile === '9') {
            anim = ANIMATION_DATA['9_idle'];
            effectiveFrames = Math.min(anim.frames, 2);
            totalFrames = 6;
        }
        if (anim && effectiveFrames > 0 && totalFrames > 0) {
            const frameDuration = Math.max(1, anim.speed) * (1000 / 60);
            const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
            const frameWidth = sprite.width / totalFrames;
            ctx.drawImage(sprite, frameIndex * frameWidth, 0, frameWidth, sprite.height, 0, 0, canvas.width, canvas.height);
        } else {
            ctx.drawImage(sprite, 0, 0, sprite.width, sprite.height, 0, 0, canvas.width, canvas.height);
        }
    } else {
        const color = TILE_TYPES[tile]?.color ?? '#666';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#111';
        ctx.fillRect(2, 2, canvas.width - 4, canvas.height - 4);
    }
};

const stopPaletteAnimation = () => {
    if (paletteAnimationId !== null) {
        cancelAnimationFrame(paletteAnimationId);
        paletteAnimationId = null;
    }
};

const startPaletteAnimation = (store: GameStore) => {
    const animate = (timestamp: number) => {
        paletteEntries.forEach(entry => drawPaletteEntry(store, entry.tile, entry.canvas, timestamp));
        paletteAnimationId = requestAnimationFrame(animate);
    };
    paletteAnimationId = requestAnimationFrame(animate);
};

const populatePalette = (store: GameStore) => {
    const { paletteEl } = store.dom.ui;
    if (!paletteEl) {
        return;
    }
    paletteEl.innerHTML = '';
    paletteEntries.length = 0;
    stopPaletteAnimation();
    Object.entries(TILE_TYPES).forEach(([key, { name, color }]) => {
        if (key === 'P') {
            return;
        }
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile-selector flex flex-col items-center gap-1 text-xs text-center';
        tileDiv.dataset.tile = key;
        if (key === store.selectedTile) {
            tileDiv.classList.add('selected');
        }
        const preview = document.createElement('canvas');
        preview.width = TILE_SIZE;
        preview.height = TILE_SIZE;
        preview.className = 'tile-thumb border border-white/40';

        const spriteKey = TILE_TYPES[key]?.sprite;
        const sprite = spriteKey ? store.sprites[spriteKey] : undefined;
        if (sprite) {
            if (!sprite.complete || sprite.naturalWidth === 0) {
                sprite.addEventListener('load', () => drawPaletteEntry(store, key, preview, performance.now()), { once: true });
            }
        }
        drawPaletteEntry(store, key, preview, performance.now());
        paletteEntries.push({ tile: key, canvas: preview });

        const label = document.createElement('span');
        label.textContent = name;

        tileDiv.appendChild(preview);
        tileDiv.appendChild(label);
        tileDiv.addEventListener('click', () => {
            const selected = paletteEl.querySelector('.tile-selector.selected');
            if (selected) {
                selected.classList.remove('selected');
            }
            tileDiv.classList.add('selected');
            store.selectedTile = key;
        });
        paletteEl.appendChild(tileDiv);
    });
    startPaletteAnimation(store);
};

const syncLevelSelector = (store: GameStore) => {
    const { levelSelectorEl } = store.dom.ui;
    if (!levelSelectorEl) {
        return;
    }
    levelSelectorEl.innerHTML = '';
    for (let i = 0; i < TOTAL_LEVELS; i++) {
        const option = document.createElement('option');
        option.value = `${i}`;
        option.textContent = `Nivel ${i + 1}`;
        levelSelectorEl.appendChild(option);
    }
};

export const setupUI = (store: GameStore) => {
    attachDomReferences(store);
    syncLevelSelector(store);
    setupLevelData(store);
    setupMenuButtons(store);
    preloadAssets(store, () => {
        populatePalette(store);
        showMenu(store);
        requestAnimationFrame(() => {
            const ctx = store.dom.ctx;
            if (ctx && store.dom.canvas) {
                ctx.clearRect(0, 0, store.dom.canvas.width, store.dom.canvas.height);
            }
        });
    });
};

const setupMenuButtons = (store: GameStore) => {
    const { startGameBtn, levelEditorBtn } = store.dom.ui;
    startGameBtn?.addEventListener('click', () => startGame(store));
    levelEditorBtn?.addEventListener('click', () => startEditor(store));
    window.addEventListener('keydown', event => {
        store.keys[event.code] = true;
        if (event.code === 'Enter' && store.appState === 'menu') {
            startGame(store);
        } else if (event.code === 'Enter' && (store.gameState === 'gameover' || store.gameState === 'win')) {
            showMenu(store);
        }
    });
    window.addEventListener('keyup', event => {
        store.keys[event.code] = false;
    });
};

const setupLevelData = (store: GameStore) => {
    const {
        levelDataTextarea,
        loadLevelBtn,
        saveLevelBtn,
        exportLevelBtn,
        importLevelBtn,
        playTestBtn,
        resumeEditorBtn,
        backToMenuBtn,
    } = store.dom.ui;
    if (!levelDataTextarea) {
        return;
    }

    loadLevelBtn?.addEventListener('click', () => {
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[index] ?? []));
    });

    saveLevelBtn?.addEventListener('click', () => {
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        store.levelDataStore[index] = JSON.parse(JSON.stringify(store.editorLevel));
        window.alert(`Nivel ${index + 1} guardado en la sesión.`);
    });

    exportLevelBtn?.addEventListener('click', () => {
        if (!store.editorLevel) {
            return;
        }
        levelDataTextarea.value = JSON.stringify(store.editorLevel.map(row => row.join('')), null, 4);
    });

    importLevelBtn?.addEventListener('click', () => {
        try {
            const data = JSON.parse(levelDataTextarea.value);
            store.editorLevel = data.map((row: string) => row.split(''));
        } catch (error) {
            console.error('Error al importar nivel', error);
            window.alert('JSON inválido. Revisa el formato y vuelve a intentar.');
        }
    });

    playTestBtn?.addEventListener('click', () => {
        const currentLevel = store.editorLevel.map(row => row.join(''));
        startGame(store, currentLevel);
    });

    resumeEditorBtn?.addEventListener('click', () => {
        if (store.appState === 'playing') {
            startEditor(store);
            store.cameraY = 0;
            store.levelDesigns = JSON.parse(JSON.stringify(store.initialLevels));
        }
    });

    backToMenuBtn?.addEventListener('click', () => showMenu(store));
};

