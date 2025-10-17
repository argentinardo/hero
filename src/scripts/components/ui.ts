import nipplejs from 'nipplejs';
import type { EventData as NippleEvent, Joystick as NippleJoystick } from 'nipplejs';

import type { GameStore } from '../core/types';
import { TILE_TYPES, preloadAssets, ANIMATION_DATA } from '../core/assets';
import { TOTAL_LEVELS, TILE_SIZE } from '../core/constants';
import { loadLevel } from './level';
import { generateLevel } from './levelGenerator';
import { playBackgroundMusic, pauseBackgroundMusic } from './audio';
import { 
    undo, 
    redo, 
    updateUndoRedoButtons, 
    initializeAdvancedEditor
} from './advancedEditor';

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
    ui.rightUiEl = document.getElementById('right-ui');
    ui.editorPanelEl = document.getElementById('editor-panel');
    ui.paletteEl = document.getElementById('tile-palette');
    ui.confirmationModalEl = document.getElementById('confirmation-modal');
    ui.notificationModalEl = document.getElementById('notification-modal');
    ui.notificationTitleEl = document.getElementById('notification-title');
    ui.notificationMessageEl = document.getElementById('notification-message');
    ui.notificationOkBtn = document.getElementById('notification-ok-btn') as HTMLButtonElement | null;
    ui.levelSelectorEl = document.getElementById('level-selector') as HTMLSelectElement | null;
    ui.mobileControlsEl = document.getElementById('mobile-controls');
    ui.joystickZoneEl = document.getElementById('joystick-zone');
    ui.actionZoneEl = document.getElementById('action-zone');
    ui.volumeBtn = document.getElementById('volume-btn') as HTMLButtonElement | null;

    ui.startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;
    ui.levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
    ui.retryBtn = document.getElementById('retry-btn') as HTMLButtonElement | null;
    ui.playTestBtn = document.getElementById('play-test-btn') as HTMLButtonElement | null;
    ui.resumeEditorBtn = document.getElementById('resume-editor-btn') as HTMLButtonElement | null;
    ui.loadLevelBtn = document.getElementById('load-level-btn') as HTMLButtonElement | null;
    ui.saveLevelBtn = document.getElementById('save-level-btn') as HTMLButtonElement | null;
    ui.generateLevelBtn = document.getElementById('generate-level-btn') as HTMLButtonElement | null;
    ui.saveAllBtn = document.getElementById('save-all-btn') as HTMLButtonElement | null;
    ui.backToMenuBtn = document.getElementById('back-to-menu-btn') as HTMLButtonElement | null;
    ui.confirmSaveBtn = document.getElementById('confirm-save-btn') as HTMLButtonElement | null;
    ui.cancelSaveBtn = document.getElementById('cancel-save-btn') as HTMLButtonElement | null;
    ui.menuBtn = document.getElementById('menu-btn') as HTMLButtonElement | null;
    ui.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement | null;
    ui.menuBtnDesktop = document.getElementById('menu-btn-desktop') as HTMLButtonElement | null;
    ui.restartBtnDesktop = document.getElementById('restart-btn-desktop') as HTMLButtonElement | null;
    ui.exitModalEl = document.getElementById('exit-modal');
    ui.exitTitleEl = document.getElementById('exit-title');
    ui.exitTextEl = document.getElementById('exit-text');
    ui.exitConfirmBtn = document.getElementById('exit-confirm-btn') as HTMLButtonElement | null;
    ui.exitCancelBtn = document.getElementById('exit-cancel-btn') as HTMLButtonElement | null;
    
    // Editor tools
    ui.undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
    ui.redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null;
};

const setBodyClass = (state: string) => {
    document.body.className = `state-${state}`;
};

export const showMenu = (store: GameStore) => {
    store.appState = 'menu';
    store.gameState = 'start';
    setBodyClass('menu');
    
    // Pausar música de fondo al volver al menú
    pauseBackgroundMusic();
    
    const { messageOverlay, messageTitle, messageText, gameUiEl, rightUiEl, editorPanelEl, mobileControlsEl, retryBtn } = store.dom.ui;
    if (messageOverlay) {
        messageOverlay.style.display = 'flex';
        
        // Agregar imagen splash como fondo del menú
        const splashSprite = store.sprites.splash;
        if (splashSprite) {
            messageOverlay.style.backgroundImage = `url(${splashSprite.src})`;
            messageOverlay.style.backgroundSize = 'cover';
            messageOverlay.style.backgroundPosition = 'center';
            messageOverlay.style.backgroundRepeat = 'no-repeat';
        }
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'none';
    }
    if (rightUiEl) {
        rightUiEl.style.display = 'none';
    }
    if (editorPanelEl) {
        editorPanelEl.style.display = 'none';
    }
    store.dom.ui.resumeEditorBtn?.classList.add('hidden');

    if (messageTitle) {
        messageTitle.textContent = 'NEW H.E.R.O.';
    }
    if (messageText) {
        messageText.innerHTML = 'Presiona ENTER o el botón para empezar';
    }
    // Ocultar botón de reintentar en el menú principal
    if (retryBtn) {
        retryBtn.classList.add('hidden');
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
        // No activar ArrowDown con joystick, se usa el botón dedicado de bomba
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
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
        // No resetear ArrowDown aquí, se controla con el botón de bomba
    });

    // Configurar botones de acción
    const shootBtn = document.getElementById('shoot-btn');
    const bombBtn = document.getElementById('bomb-btn');
    const volumeBtn = store.dom.ui.volumeBtn as HTMLButtonElement | null;

    if (shootBtn) {
        shootBtn.addEventListener('touchstart', event => {
            event.preventDefault();
            const now = Date.now();

            // Si ya está bloqueado, un toque lo desbloquea
            if (store.isLaserSticky) {
                store.isLaserSticky = false;
                store.keys.Space = false;
                shootBtn.classList.remove('sticky-active');
                store.lastShootTap = 0;
                return;
            }

            // Doble toque para bloquear
            if (store.lastShootTap && now - store.lastShootTap < 300) {
                store.isLaserSticky = true;
                store.keys.Space = true;
                shootBtn.classList.add('sticky-active');
                store.lastShootTap = 0;
                return;
            }

            // Primer toque: comportamiento normal (mantener presionado)
            store.lastShootTap = now;
            if (!store.isLaserSticky) {
                store.keys.Space = true;
            }
        });

        shootBtn.addEventListener('touchend', event => {
            event.preventDefault();
            // Si no está en modo sticky, soltar el botón suelta el disparo
            if (!store.isLaserSticky) {
                store.keys.Space = false;
            }
        });

        // Soporte opcional para dblclick en dispositivos con ratón
        shootBtn.addEventListener('dblclick', event => {
            event.preventDefault();
            store.isLaserSticky = !store.isLaserSticky;
            if (store.isLaserSticky) {
                store.keys.Space = true;
                shootBtn.classList.add('sticky-active');
            } else {
                store.keys.Space = false;
                shootBtn.classList.remove('sticky-active');
            }
        });
    }

    if (bombBtn) {
        bombBtn.addEventListener('touchstart', event => {
            event.preventDefault();
            store.keys.ArrowDown = true;
        });
        bombBtn.addEventListener('touchend', event => {
            event.preventDefault();
            store.keys.ArrowDown = false;
        });
    }

    if (volumeBtn) {
        const updateIcon = () => {
            try {
                // Lazy require para evitar ciclos
                const { getAudioState } = require('./audio');
                const state = getAudioState();
                volumeBtn.textContent = state.isMuted ? '🔇' : '🔊';
            } catch {}
        };
        updateIcon();
        const toggle = () => {
            try {
                const { toggleMute, getAudioState } = require('./audio');
                toggleMute();
                const state = getAudioState();
                volumeBtn.textContent = state.isMuted ? '🔇' : '🔊';
            } catch {}
        };
        volumeBtn.addEventListener('touchstart', e => { e.preventDefault(); toggle(); });
        volumeBtn.addEventListener('click', e => { e.preventDefault(); toggle(); });
    }
};

export const startGame = (store: GameStore, levelOverride: string[] | null = null, startIndex?: number, preserveLevels?: boolean) => {
    store.appState = 'playing';
    store.gameState = 'playing';
    setBodyClass('playing');
    const { messageOverlay, gameUiEl, rightUiEl, editorPanelEl } = store.dom.ui;
    if (messageOverlay) {
        messageOverlay.style.display = 'none';
        // Limpiar el fondo del splash
        messageOverlay.style.backgroundImage = '';
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'flex';
    }
    if (rightUiEl) {
        const isMobileLandscape = window.matchMedia('(max-width: 1024px) and (orientation: landscape)').matches || window.matchMedia('(max-width: 768px) and (orientation: landscape)').matches;
        if (isMobileLandscape) {
            rightUiEl.style.display = 'flex';
        } else {
            rightUiEl.style.display = 'none';
        }
    }
    if (levelOverride) {
        store.dom.ui.resumeEditorBtn?.classList.remove('hidden');
    } else {
        store.dom.ui.resumeEditorBtn?.classList.add('hidden');
    }
    if (editorPanelEl) {
        editorPanelEl.style.display = 'none';
    }
    startJoystick(store);

    // Intento de bloqueo de orientación a landscape en navegadores que lo soportan
    try {
        const anyScreen: any = window.screen;
        if (anyScreen?.orientation?.lock) {
            anyScreen.orientation.lock('landscape').catch(() => {});
        }
    } catch {}
    
    // Iniciar música de fondo
    playBackgroundMusic();
    
    // Si venimos desde el editor (levelOverride no nulo) ocultar los botones del right-ui para dejar paso a "Volver al Editor"
    if (levelOverride || preserveLevels) {
        document.getElementById('menu-btn')?.classList.add('hidden');
        document.getElementById('restart-btn')?.classList.add('hidden');
        store.dom.ui.resumeEditorBtn?.classList.remove('hidden');
    } else {
        document.getElementById('menu-btn')?.classList.remove('hidden');
        document.getElementById('restart-btn')?.classList.remove('hidden');
    }
    
    store.lives = 3;
    store.score = 0;
    // Configurar niveles
    if (preserveLevels) {
        // Mantener store.levelDesigns tal como lo preparó el llamador
    } else if (levelOverride) {
        store.levelDesigns = [levelOverride];
    } else {
        store.levelDesigns = JSON.parse(JSON.stringify(store.initialLevels));
    }
    // Establecer índice inicial
    store.currentLevelIndex = startIndex ?? 0;
    loadLevel(store);
};

export const startEditor = (store: GameStore) => {
    store.appState = 'editing';
    setBodyClass('editing');
    const { messageOverlay, gameUiEl, editorPanelEl, levelSelectorEl } = store.dom.ui;
    if (messageOverlay) {
        messageOverlay.style.display = 'none';
        // Limpiar el fondo del splash
        messageOverlay.style.backgroundImage = '';
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'none';
    }
    store.dom.ui.resumeEditorBtn?.classList.add('hidden');
    if (editorPanelEl) {
        editorPanelEl.style.display = 'flex';
    }
    
    // Resetear la cámara al entrar al editor
    store.cameraX = 0;
    store.cameraY = 0;
    
    // Cargar el nivel actual del selector cuando se inicia el editor
    const currentIndex = parseInt(levelSelectorEl?.value ?? '0', 10);
    store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[currentIndex] ?? []));
    
    // Inicializar el editor avanzado
    initializeAdvancedEditor(store);
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

    // Caso especial para el jugador
    if (tile === 'P') {
        const playerSprite = store.sprites.P_die;
        if (playerSprite && playerSprite.naturalWidth > 0) {
            ctx.drawImage(
                playerSprite,
                0,
                0,
                playerSprite.width,
                playerSprite.height,
                0,
                0,
                canvas.width,
                canvas.height
            );
        } else {
            // Fallback: rectángulo rojo
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    // Caso especial para el tile vacío: transparente (no dibujar nada)
    if (tile === '0') {
        return;
    }

    // Caso especial para el minero (ocupa 2 tiles de ancho con animación)
    if (tile === '9') {
        const minerSprite = store.sprites['9'];
        if (minerSprite && minerSprite.naturalWidth > 0) {
            const anim = ANIMATION_DATA['9_idle'];
            if (anim) {
                const effectiveFrames = Math.min(anim.frames, 2);
                const totalFrames = 6; // MINER_TOTAL_FRAMES
                const msPerTick = 1000 / 60;
                const frameDuration = Math.max(1, anim.speed) * msPerTick;
                const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
                const frameWidth = minerSprite.width / totalFrames;
                
                ctx.drawImage(
                    minerSprite,
                    frameIndex * frameWidth,
                    0,
                    frameWidth,
                    minerSprite.height,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
            } else {
                ctx.drawImage(
                    minerSprite,
                    0,
                    0,
                    minerSprite.width,
                    minerSprite.height,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
            }
        } else {
            // Fallback: rectángulo azul
            ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        return;
    }

    // Caso especial para la luz
    if (tile === 'L') {
        const lightSprite = store.sprites.L;
        if (lightSprite && lightSprite.naturalWidth > 0) {
            const frameWidth = lightSprite.width / 2; // 2 frames (encendida/apagada)
            ctx.drawImage(
                lightSprite,
                0, // Frame 0 (encendida)
                0,
                frameWidth,
                lightSprite.height,
                0,
                0,
                canvas.width,
                canvas.height
            );
        } else {
            // Fallback: círculo amarillo
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = Math.min(canvas.width, canvas.height) / 3;
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        return;
    }

    const spriteKey = TILE_TYPES[tile]?.sprite;
    const sprite = spriteKey ? store.sprites[spriteKey] : undefined;
    if (sprite && sprite.naturalWidth > 0 && sprite.naturalHeight > 0) {
        let anim = ANIMATION_DATA[tile as keyof typeof ANIMATION_DATA] ?? (spriteKey ? ANIMATION_DATA[spriteKey as keyof typeof ANIMATION_DATA] : undefined);
        let effectiveFrames = anim?.frames ?? 0;
        let totalFrames = anim?.frames ?? 0;
        
        // Caso especial para el minero
        if (tile === '9') {
            anim = ANIMATION_DATA['9_idle'];
            effectiveFrames = Math.min(anim.frames, 2);
            totalFrames = 6;
        }
        
        // Caso especial para la luz (tiene 2 frames: encendida/apagada)
        if (tile === 'L') {
            const frameWidth = sprite.width / 2; // 2 frames
            ctx.drawImage(
                sprite,
                0, // Frame 0 (encendida)
                0,
                frameWidth,
                sprite.height,
                0,
                0,
                canvas.width,
                canvas.height
            );
            return;
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
    
    // Función para crear botones de tile
    const createTileButton = (key: string, name: string) => {
        const tileDiv = document.createElement('div');
        tileDiv.className = 'tile-item';
        tileDiv.dataset.tile = key;
        if (key === store.selectedTile) {
            tileDiv.classList.add('selected');
        }
        
        const preview = document.createElement('canvas');
        preview.width = TILE_SIZE * (key === '9' ? 2 : 1);
        preview.height = TILE_SIZE * (key === 'P' ? 2 : 1);
        preview.className = 'tile-preview';

        if (key === '0') {
            tileDiv.classList.add('eraser-tile');
        }
        
        // Para todos los tiles (incluyendo el vacío), usar drawPaletteEntry
        if (key === 'P' || key === 'L' || key === '0' || key === '9') {
            drawPaletteEntry(store, key, preview, performance.now());
            if (key === '9') {
                paletteEntries.push({ tile: key, canvas: preview });
            }
        } else {
            const spriteKey = TILE_TYPES[key]?.sprite;
            const sprite = spriteKey ? store.sprites[spriteKey] : undefined;
            if (sprite) {
                if (!sprite.complete || sprite.naturalWidth === 0) {
                    sprite.addEventListener('load', () => drawPaletteEntry(store, key, preview, performance.now()), { once: true });
                }
            }
            drawPaletteEntry(store, key, preview, performance.now());
            paletteEntries.push({ tile: key, canvas: preview });
        }

        const label = document.createElement('span');
        label.className = 'tile-label';
        label.textContent = name;

        tileDiv.appendChild(preview);
        tileDiv.appendChild(label);
        
        tileDiv.addEventListener('click', () => {
            const selected = paletteEl.querySelector('.tile-item.selected');
            if (selected) {
                selected.classList.remove('selected');
            }
            tileDiv.classList.add('selected');
            store.selectedTile = key;
        });
        
        return tileDiv;
    };
    
    // Organizar tiles por categorías
    const categories = [
        {
            name: 'Personajes',
            tiles: [
                { key: 'P', name: 'Player' },
                { key: '9', name: 'Minero' }
            ]
        },
        {
            name: 'Terreno',
            tiles: [
                { key: '0', name: 'Vacío' },
                { key: '1', name: 'Muro' },
                { key: '2', name: 'Tierra' }
            ]
        },
        {
            name: 'Elementos',
            tiles: [
                { key: 'C', name: 'Columna' },
                { key: '3', name: 'Lava' },
                { key: 'L', name: 'Luz' }
            ]
        },
        {
            name: 'Enemigos',
            tiles: [
                { key: '8', name: 'Bat' },
                { key: 'S', name: 'Araña' },
                { key: 'V', name: 'Víbora' }
            ]
        }
    ];
    
    // Crear estructura de categorías
    categories.forEach(category => {
        // Crear sección de categoría
        const categorySection = document.createElement('div');
        categorySection.className = 'tile-category';
        
        // Crear encabezado
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'tile-category-header';
        categoryHeader.textContent = category.name;
        categorySection.appendChild(categoryHeader);
        
        // Crear grid de tiles
        const tilesGrid = document.createElement('div');
        tilesGrid.className = 'tile-category-grid';
        
        // Agregar tiles
        category.tiles.forEach(({ key, name }) => {
            const tileData = TILE_TYPES[key];
            if (tileData) {
                const tileButton = createTileButton(key, name);
                tilesGrid.appendChild(tileButton);
            }
        });
        
        categorySection.appendChild(tilesGrid);
        paletteEl.appendChild(categorySection);
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
    const { startGameBtn, levelEditorBtn, retryBtn, menuBtn, restartBtn, menuBtnDesktop, restartBtnDesktop, exitModalEl, exitTitleEl, exitTextEl, exitConfirmBtn, exitCancelBtn } = store.dom.ui;
    startGameBtn?.addEventListener('click', () => startGame(store));
    levelEditorBtn?.addEventListener('click', () => startEditor(store));
    retryBtn?.addEventListener('click', () => startGame(store));
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

    // Confirmación de acciones (Menú y Reiniciar)
    const openExitModal = (title: string, text: string, onConfirm: () => void) => {
        if (!exitModalEl) return;
        if (exitTitleEl) exitTitleEl.textContent = title;
        if (exitTextEl) exitTextEl.textContent = text;
        exitModalEl.classList.remove('hidden');
        const confirmHandler = () => {
            onConfirm();
            exitModalEl.classList.add('hidden');
            exitConfirmBtn?.removeEventListener('click', confirmHandler);
            exitCancelBtn?.removeEventListener('click', cancelHandler);
        };
        const cancelHandler = () => {
            exitModalEl.classList.add('hidden');
            exitConfirmBtn?.removeEventListener('click', confirmHandler);
            exitCancelBtn?.removeEventListener('click', cancelHandler);
        };
        exitConfirmBtn?.addEventListener('click', confirmHandler);
        exitCancelBtn?.addEventListener('click', cancelHandler);
    };

    menuBtn?.addEventListener('click', () => {
        openExitModal('Volver al Menú', '¿Deseas volver al menú principal?', () => {
            showMenu(store);
        });
    });

    restartBtn?.addEventListener('click', () => {
        openExitModal('Reiniciar Nivel', '¿Deseas reiniciar el nivel actual?', () => {
            startGame(store, null, store.currentLevelIndex, true);
        });
    });

    // Desktop duplicates
    menuBtnDesktop?.addEventListener('click', () => {
        openExitModal('Volver al Menú', '¿Deseas volver al menú principal?', () => {
            showMenu(store);
        });
    });

    restartBtnDesktop?.addEventListener('click', () => {
        openExitModal('Reiniciar Nivel', '¿Deseas reiniciar el nivel actual?', () => {
            startGame(store, null, store.currentLevelIndex, true);
        });
    });
};

/**
 * Muestra un modal de notificación con un mensaje
 */
export const showNotification = (store: GameStore, title: string, message: string) => {
    const { notificationModalEl, notificationTitleEl, notificationMessageEl } = store.dom.ui;
    
    if (notificationTitleEl) {
        notificationTitleEl.textContent = title;
    }
    if (notificationMessageEl) {
        notificationMessageEl.textContent = message;
    }
    if (notificationModalEl) {
        notificationModalEl.classList.remove('hidden');
        
        // Agregar listener para cerrar con Escape (solo una vez)
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                hideNotification(store);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
        // Cerrar al hacer clic en el fondo (solo una vez)
        const handleClickOutside = (event: MouseEvent) => {
            if (event.target === notificationModalEl) {
                hideNotification(store);
                notificationModalEl.removeEventListener('click', handleClickOutside);
            }
        };
        notificationModalEl.addEventListener('click', handleClickOutside);
    }
};

/**
 * Oculta el modal de notificación
 */
const hideNotification = (store: GameStore) => {
    const { notificationModalEl } = store.dom.ui;
    if (notificationModalEl) {
        notificationModalEl.classList.add('hidden');
    }
};

/**
 * Asegura que el editor permanezca visible después de operaciones
 */
const ensureEditorVisible = (store: GameStore) => {
    const { gameUiEl, editorPanelEl, messageOverlay } = store.dom.ui;
    
    // Asegurar que el estado es correcto
    if (store.appState === 'editing') {
        // Ocultar UI del juego
        if (gameUiEl) {
            gameUiEl.style.display = 'none';
        }
        // Mostrar panel del editor
        if (editorPanelEl) {
            editorPanelEl.style.display = 'flex';
        }
        // Ocultar overlay de mensaje
        if (messageOverlay) {
            messageOverlay.style.display = 'none';
        }
    }
};

/**
 * Elimina filas y columnas completamente vacías (solo '0') de un nivel
 */
const purgeEmptyRowsAndColumns = (level: string[][]): string[][] => {
    if (level.length === 0) return level;
    
    // Crear una copia para no modificar el original
    let cleanedLevel = JSON.parse(JSON.stringify(level)) as string[][];
    
    // Eliminar filas vacías (que solo contienen '0')
    cleanedLevel = cleanedLevel.filter(row => 
        row.some(cell => cell !== '0')
    );
    
    // Si no quedan filas, retornar un nivel vacío
    if (cleanedLevel.length === 0) return [['0']];
    
    // Identificar columnas que están completamente vacías
    const numCols = cleanedLevel[0].length;
    const columnsToKeep: boolean[] = [];
    
    for (let col = 0; col < numCols; col++) {
        let hasNonZero = false;
        for (let row = 0; row < cleanedLevel.length; row++) {
            if (cleanedLevel[row][col] !== '0') {
                hasNonZero = true;
                break;
            }
        }
        columnsToKeep[col] = hasNonZero;
    }
    
    // Eliminar columnas vacías
    cleanedLevel = cleanedLevel.map(row => 
        row.filter((_, colIndex) => columnsToKeep[colIndex])
    );
    
    // Verificar que quede al menos una columna
    if (cleanedLevel.length > 0 && cleanedLevel[0].length === 0) {
        return [['0']];
    }
    
    return cleanedLevel;
};

const setupLevelData = (store: GameStore) => {
    const {
        loadLevelBtn,
        saveLevelBtn,
        generateLevelBtn,
        saveAllBtn,
        playTestBtn,
        resumeEditorBtn,
        backToMenuBtn,
        confirmSaveBtn,
        cancelSaveBtn,
        confirmationModalEl,
        notificationOkBtn,
    } = store.dom.ui;

    // Configurar el botón OK del modal de notificación
    notificationOkBtn?.addEventListener('click', () => {
        hideNotification(store);
    });

    // Función para cargar nivel desde el store
    const loadLevelFromStore = () => {
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[index] ?? []));
        // Resetear la cámara al cargar el nivel
        store.cameraX = 0;
        store.cameraY = 0;
        // Reinicializar el editor avanzado
        initializeAdvancedEditor(store);
    };

    // Cargar nivel automáticamente cuando cambia el selector
    store.dom.ui.levelSelectorEl?.addEventListener('change', () => {
        loadLevelFromStore();
    });

    // Botón restaurar: recarga el nivel guardado (descartando cambios actuales)
    loadLevelBtn?.addEventListener('click', () => {
        // Restaurar desde el archivo JSON original, no desde la sesión
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        const originalLevel = store.initialLevels[index] ?? store.initialLevels[0];
        
        if (originalLevel) {
            // Cargar el nivel original desde el JSON
            store.editorLevel = originalLevel.map(row => row.split(''));
            // También actualizar el store de la sesión para mantener consistencia
            store.levelDataStore[index] = JSON.parse(JSON.stringify(store.editorLevel));
            
            // Resetear la cámara
            store.cameraX = 0;
            store.cameraY = 0;
            
            // Reinicializar el editor avanzado
            initializeAdvancedEditor(store);
            
            showNotification(store, '🔄 Restaurado', `Nivel ${index + 1} restaurado desde el archivo JSON.\nTodos los cambios descartados.`);
        }
    });

    saveLevelBtn?.addEventListener('click', () => {
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        // Limpiar filas y columnas vacías antes de guardar
        const cleanedLevel = purgeEmptyRowsAndColumns(store.editorLevel);
        store.levelDataStore[index] = JSON.parse(JSON.stringify(cleanedLevel));
        // Actualizar también el nivel del editor con la versión limpia
        store.editorLevel = cleanedLevel;
        showNotification(store, '✅ Guardado', `Nivel ${index + 1} guardado en la sesión.\nFilas y columnas vacías eliminadas.`);
    });

    generateLevelBtn?.addEventListener('click', () => {
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        const canvas = store.dom.canvas;
        if (!canvas) return;
        
        // Calcular dimensiones del nivel basado en el canvas
        // Hacer el nivel más ancho para permitir exploración horizontal (3x el ancho del canvas)
        const levelWidth = Math.floor(canvas.width / TILE_SIZE) * 3;
        const levelHeight = Math.floor(canvas.height / TILE_SIZE) + 5; // Extra altura para scroll
        
        // Generar nivel con dificultad basada en el índice
        const difficulty = Math.min(index + 1, 10);
        const generatedLevel = generateLevel({
            width: levelWidth,
            height: levelHeight,
            difficulty: difficulty
        });
        
        // Convertir a formato del editor (array de arrays)
        store.editorLevel = generatedLevel.map((row: string) => row.split(''));
        
        // Resetear la cámara al generar un nuevo nivel
        store.cameraX = 0;
        store.cameraY = 0;
        
        // Reinicializar el editor avanzado
        initializeAdvancedEditor(store);
        
        showNotification(store, '🎲 Nivel Generado', `Nivel ${index + 1} generado automáticamente con dificultad ${difficulty}.`);
    });

    playTestBtn?.addEventListener('click', () => {
        // Jugar el nivel que está seleccionado en el selector (respeta el nivel cargado)
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        // Guardar SIEMPRE el buffer actual del editor en la sesión antes de probar
        const currentBuffer = JSON.parse(JSON.stringify(store.editorLevel));

        // Limpiar filas y columnas vacías
        const cleanedLevel = purgeEmptyRowsAndColumns(currentBuffer);

        // Persistir en sesión (levelDataStore) antes de iniciar el juego
        store.levelDataStore[index] = JSON.parse(JSON.stringify(cleanedLevel));
        // Mantener el editor en la versión limpia
        store.editorLevel = cleanedLevel;

        // Preparar levelDesigns para que comience en el índice seleccionado
        const payload = cleanedLevel.map(row => row.join(''));
        store.levelDesigns = JSON.parse(JSON.stringify(store.initialLevels));
        store.levelDesigns[index] = payload;

        // Iniciar juego desde ese índice, preservando levelDesigns
        startGame(store, null, index, true);
    });

    // Reemplazar el listener de resumeEditorBtn para preservar el nivel actual
    resumeEditorBtn?.addEventListener('click', () => {
        // Volver al editor preservando el nivel actual
        if (store.appState === 'playing') {
            startEditor(store);
            // Conservar el índice de nivel y el buffer actual del nivel
            const index = store.currentLevelIndex;
            // Sincronizar el editor con el nivel que se está jugando actualmente
            // levelDesigns es string[] (filas como strings); convertir a string[][] para el editor
            const levelRows = store.levelDesigns[index] ?? [];
            store.editorLevel = levelRows.map(row => row.split(''));
            // Reinicializar el editor avanzado para alinear historial y UI con el buffer actual
            initializeAdvancedEditor(store);
            // No resetear levelDesigns aquí para mantener cambios locales hasta guardar
        }
    });

    backToMenuBtn?.addEventListener('click', () => showMenu(store));

    const saveAllLevelsToFile = async () => {
        // Limpiar todos los niveles eliminando filas y columnas vacías
        const cleanedLevels = store.levelDataStore.map(level => purgeEmptyRowsAndColumns(level));
        const payload = cleanedLevels.map(level => level.map(row => row.join('')));

        const downloadFallback = () => {
            const blob = new Blob([JSON.stringify(payload, null, 4)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'levels.json';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            showNotification(store, '⬇️ Descarga Manual', 'No se pudo guardar automáticamente.\nSe descargó un archivo levels.json con los datos.');
            
            // Asegurar que permanecemos en el editor
            ensureEditorVisible(store);
        };

        try {
            const response = await fetch('/api/save-levels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            showNotification(store, '💾 Guardado Exitoso', '¡Todos los niveles se han guardado en levels.json!');
            
            // Asegurar que permanecemos en el editor
            ensureEditorVisible(store);
        } catch (error) {
            console.error('Error saving levels:', error);
            downloadFallback();
        }
    };

    saveAllBtn?.addEventListener('click', () => {
        confirmationModalEl?.classList.remove('hidden');
    });

    confirmSaveBtn?.addEventListener('click', async () => {
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        // Limpiar filas y columnas vacías antes de guardar
        const cleanedLevel = purgeEmptyRowsAndColumns(store.editorLevel);
        store.levelDataStore[index] = JSON.parse(JSON.stringify(cleanedLevel));
        // Actualizar también el nivel del editor con la versión limpia
        store.editorLevel = cleanedLevel;
        confirmationModalEl?.classList.add('hidden');
        
        // Guardar todos los niveles
        await saveAllLevelsToFile();
    });

    cancelSaveBtn?.addEventListener('click', () => {
        confirmationModalEl?.classList.add('hidden');
    });

    // Editor avanzado - Undo/Redo
    store.dom.ui.undoBtn?.addEventListener('click', () => {
        undo(store);
        updateUndoRedoButtons(store);
    });
    
    store.dom.ui.redoBtn?.addEventListener('click', () => {
        redo(store);
        updateUndoRedoButtons(store);
    });


};

