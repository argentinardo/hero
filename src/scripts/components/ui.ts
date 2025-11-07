import nipplejs from 'nipplejs';
import type { EventData as NippleEvent, Joystick as NippleJoystick } from 'nipplejs';

import type { GameStore } from '../core/types';
import { TILE_TYPES, preloadAssets, ANIMATION_DATA, SPRITE_SOURCES } from '../core/assets';
import { buildChunkedFile20x18 } from '../utils/levels';
import { getNetlifyBaseUrl } from '../utils/device';
import { TOTAL_LEVELS, TILE_SIZE } from '../core/constants';
import { loadLevel } from './level';
import { generateLevel } from './levelGenerator';
import { playBackgroundMusic, pauseBackgroundMusic, toggleMute, getAudioState, setMusicVolume, setSFXVolume, isBackgroundMusicPlaying } from './audio';
import { loadSettings, saveSettings, updateSettings, applyGraphicsSettings, type ControlMode } from '../core/settings';
import { applyControlMode } from './mobile-controls';
import { t, setLanguage, getCurrentLanguage, type Language } from '../utils/i18n';

// Helper para guardar settings con idioma incluido
const saveSettingsWithLanguage = (settings: any) => {
    const lang = (settings as any).language || getCurrentLanguage();
    saveSettings({ ...settings, language: lang } as any);
};
import { 
    undo, 
    redo, 
    updateUndoRedoButtons, 
    initializeAdvancedEditor
} from './advancedEditor';
import { activateDuplicateRowMode, activateDeleteRowMode } from './editor';
import { setupGallery } from './gallery';

// Función para ajustar el ancho de las barras UI al tamaño real del canvas
export const adjustUIBars = () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    const gameUi = document.getElementById('game-ui');
    const bottomUi = document.getElementById('bottom-ui');
    const creditBar = document.getElementById('credit-bar');
    
    if (!canvas || !gameUi || !bottomUi) return;
    
    // Obtener el tamaño renderizado del canvas (después de object-fit: contain)
    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasLeft = rect.left;
    
    // Aplicar el ancho y posición a las barras UI
    // solo en desktop (no en mobile)
    if (window.innerWidth >= 1025) {
        // Centrar game-ui con ancho igual al canvas visual (1600px)
        const gameUiWidth = 1600; // Ancho visual del canvas
        gameUi.style.width = `${gameUiWidth}px`;
        gameUi.style.left = '50%'; // Centrar horizontalmente
        gameUi.style.transform = 'translateX(-50%)'; // Centrar usando transform
        
        // Calcular la escala para el bottom-ui basada en el ancho visual del canvas
        // El canvas se muestra a 1600px visualmente, pero internamente tiene 1440px (20 tiles)
        const canvasVisualWidth = 1600;
        const scale = canvasWidth / canvasVisualWidth;
        
        // Aplicar escala al bottom-ui para que se ajuste al tamaño visual del canvas
        bottomUi.style.width = `${canvasVisualWidth}px`; // Ancho visual del canvas (1600px)
        bottomUi.style.left = '50%'; // Centrar horizontalmente
        bottomUi.style.transform = `translateX(-50%) scale(${scale})`; // Centrar y escalar
        
        // Asegurar que game-ui también esté centrado
        gameUi.style.left = '50%';
        gameUi.style.transform = 'translateX(-50%)';
        
        if (creditBar) {
            creditBar.style.display = 'none'; // Oculto en desktop
        }
    } else {
        // En mobile: el bottom-ui tiene width: 100% (viewportWidth)
        // Si el canvas es más pequeño, necesitamos escalar el bottom-ui
        const viewportWidth = window.innerWidth;
        
        if (canvasWidth < viewportWidth) {
            // Calcular la escala necesaria para que el bottom-ui no sobrepase el canvas
            // El bottom-ui tiene width: 100% = viewportWidth
            // Necesitamos que el ancho escalado = canvasWidth
            // Entonces: viewportWidth * scale = canvasWidth
            // scale = canvasWidth / viewportWidth
            const scale = canvasWidth / viewportWidth;
            
            bottomUi.style.width = '100%'; // Mantener 100% para calcular la escala correctamente
            bottomUi.style.left = `${canvasLeft}px`; // Alinear con el canvas
            bottomUi.style.transform = `scale(${scale})`;
        } else {
            // El canvas ocupa todo el ancho o más, no necesitamos escalar
            bottomUi.style.width = '100%';
            bottomUi.style.left = '0px';
            bottomUi.style.transform = '';
        }
        
        if (creditBar) {
            creditBar.style.width = '100%';
            creditBar.style.left = '0px';
            creditBar.style.display = 'flex'; // Visible solo en mobile
        }
    }
};

export const attachDomReferences = (store: GameStore) => {
    store.dom.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    
    // Detectar mobile para optimizaciones específicas
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
    
    if (!store.dom.canvas) return;
    
    // Ajustar dimensiones internas del canvas para mostrar exactamente 20 tiles de ancho
    // TILE_SIZE = 72px, por lo que 20 tiles = 1440px
    const TILES_WIDTH = 20;
    const CANVAS_TARGET_WIDTH = TILES_WIDTH * TILE_SIZE; // 1440px = 20 tiles de 72px
    
    // En mobile: mostrar 9 tiles de alto (9 * 72 = 648px)
    const TILES_HEIGHT_MOBILE = 9;
    const CANVAS_TARGET_HEIGHT_MOBILE = TILES_HEIGHT_MOBILE * TILE_SIZE; // 648px = 9 tiles de 72px
    
    const adjustCanvasDimensions = () => {
        const canvas = store.dom.canvas!;
        // Esperar un frame para que el CSS se haya aplicado completamente
        requestAnimationFrame(() => {
            // El canvas siempre debe tener exactamente 20 tiles de ancho (1440px)
            canvas.width = CANVAS_TARGET_WIDTH; // 1440px = 20 tiles
            
            // En mobile: usar alto fijo de 9 tiles (648px)
            // En desktop: usar el alto del viewport dinámico
            if (isMobile) {
                canvas.height = CANVAS_TARGET_HEIGHT_MOBILE; // 648px = 9 tiles
            } else {
                // Desktop: obtener el alto visual real del viewport dinámico
                // Usar visualViewport si está disponible (más preciso cuando se ocultan barras del navegador)
                let visualHeight = window.innerHeight;
                
                // Si visualViewport está disponible, usarlo (más preciso en navegadores móviles web)
                if (window.visualViewport) {
                    visualHeight = window.visualViewport.height;
                }
                
                // También considerar documentElement.clientHeight como fallback
                const docHeight = document.documentElement.clientHeight;
                if (docHeight > visualHeight) {
                    visualHeight = docHeight;
                }
                
                // Asegurar que el alto sea al menos window.innerHeight (nunca menos)
                visualHeight = Math.max(visualHeight, window.innerHeight);
                
                canvas.height = Math.floor(visualHeight);
            }
            
            // Debug: verificar que las dimensiones sean correctas
            console.log('Canvas dimensions adjusted:', {
                internalWidth: canvas.width,
                internalHeight: canvas.height,
                innerHeight: window.innerHeight,
                clientHeight: document.documentElement.clientHeight,
                visualViewportHeight: window.visualViewport?.height,
                boundingClientRect: canvas.getBoundingClientRect()
            });
            
            // Actualizar offscreen canvas si existe (mobile)
            if (store.dom.offscreenCanvas && store.dom.renderScale) {
                store.dom.offscreenCanvas.width = Math.floor(canvas.width * store.dom.renderScale);
                store.dom.offscreenCanvas.height = Math.floor(canvas.height * store.dom.renderScale);
            }
        });
    };
    
    // Ajustar dimensiones inmediatamente y cuando cambie el tamaño de la ventana
    // Usar setTimeout para asegurar que el DOM y CSS estén listos
    setTimeout(adjustCanvasDimensions, 100);
    
    // Ajustar cuando cambia el viewport (barra de direcciones se oculta/muestra en navegadores móviles web)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', adjustCanvasDimensions);
    }
    
    window.addEventListener('resize', () => {
        // Debounce para evitar múltiples llamadas
        clearTimeout((window as any).canvasResizeTimeout);
        (window as any).canvasResizeTimeout = setTimeout(adjustCanvasDimensions, 100);
    });
    
    // OPTIMIZACIÓN CRÍTICA PARA MOBILE: Renderizar a menor resolución interna
    // Reducir más agresivamente si las imágenes son más grandes (ya reducidas 50% manualmente)
    // El canvas visual se mantiene igual, pero internamente renderizamos menos píxeles
    if (isMobile) {
        // Si las imágenes ya están reducidas 50%, podemos renderizar aún más bajo (0.4 = 40% de resolución)
        // Usa las dimensiones objetivo del canvas (1440px = 20 tiles)
        const renderScaleValue = 0.4; // Más agresivo: 40% de resolución
        store.dom.renderScale = renderScaleValue;
        store.dom.offscreenCanvas = document.createElement('canvas');
        // Las dimensiones se ajustarán después en adjustCanvasDimensions cuando el CSS esté aplicado
        
        // Contexto del canvas offscreen (donde realmente renderizamos)
        const offscreenContext = store.dom.offscreenCanvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false,
            powerPreference: 'low-power'
        });
        store.dom.offscreenCtx = offscreenContext as CanvasRenderingContext2D | null;
        
        if (store.dom.offscreenCtx) {
            store.dom.offscreenCtx.imageSmoothingEnabled = false;
        }
        
        // Contexto del canvas visible (solo para escalar el resultado)
        const context = store.dom.canvas.getContext('2d', {
            alpha: false,
            desynchronized: true,
            willReadFrequently: false,
            powerPreference: 'low-power'
        });
        store.dom.ctx = (context as CanvasRenderingContext2D | null) ?? null;
        
        if (store.dom.ctx) {
            store.dom.ctx.imageSmoothingEnabled = false;
        }
    } else {
        // Desktop: renderizado normal a resolución completa
        store.dom.renderScale = 1.0;
        const context = store.dom.canvas.getContext('2d', { 
            alpha: false,
            desynchronized: true,
            willReadFrequently: false,
            powerPreference: isMobile ? 'low-power' : 'high-performance'
        });
        store.dom.ctx = (context as CanvasRenderingContext2D | null) ?? null;
        
        if (store.dom.ctx) {
            store.dom.ctx.imageSmoothingEnabled = false;
        }
    }

    const ui = store.dom.ui;
    ui.livesCountEl = document.getElementById('lives-count');
    ui.levelCountEl = document.getElementById('level-count');
    ui.scoreCountEl = document.getElementById('score-count');
    ui.energyBarEl = document.getElementById('energy-bar');
    ui.messageOverlay = document.getElementById('message-overlay');
    ui.messageTitle = document.getElementById('message-title');
    ui.messageText = document.getElementById('message-text');
    ui.gameUiEl = document.getElementById('game-ui');
    ui.heroLogoEl = document.getElementById('hero-logo');
    // Establecer la URL del logo usando la ruta procesada por webpack
    if (ui.heroLogoEl && SPRITE_SOURCES.heroLogo) {
        (ui.heroLogoEl as HTMLImageElement).src = SPRITE_SOURCES.heroLogo;
    }
    ui.rightUiEl = document.getElementById('right-ui');
    ui.bottomUiEl = document.getElementById('bottom-ui');
    ui.editorPanelEl = document.getElementById('editor-panel');
    const editorToggleBtn = document.getElementById('editor-toggle') as HTMLButtonElement | null;
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

    ui.startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;
    ui.levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
    ui.retryBtn = document.getElementById('retry-btn') as HTMLButtonElement | null;
    ui.gameoverModal = document.getElementById('gameover-modal');
    ui.gameoverScoreValue = document.getElementById('gameover-score-value');
    ui.gameoverRetryBtn = document.getElementById('gameover-retry-btn') as HTMLButtonElement | null;
    ui.gameoverMenuBtn = document.getElementById('gameover-menu-btn') as HTMLButtonElement | null;
    
    // Modal Level Complete (editor)
    const levelCompleteModal = document.getElementById('level-complete-modal');
    const levelCompleteBackToEditorBtn = document.getElementById('level-complete-back-to-editor-btn') as HTMLButtonElement | null;
    const levelCompleteRestartBtn = document.getElementById('level-complete-restart-btn') as HTMLButtonElement | null;
    
    // Elementos del contador de FPS
    ui.fpsCounterEl = document.getElementById('fps-counter');
    ui.fpsValueEl = document.getElementById('fps-value');
    ui.fpsTargetEl = document.getElementById('fps-target');
    ui.fpsResolutionEl = document.getElementById('fps-resolution');
    ui.playTestBtn = document.getElementById('play-test-btn') as HTMLButtonElement | null;
    ui.resumeEditorBtn = document.getElementById('resume-editor-btn') as HTMLButtonElement | null;
    ui.addLevelBtn = document.getElementById('add-level-btn') as HTMLButtonElement | null;
    ui.generateLevelBtn = document.getElementById('generate-level-btn') as HTMLButtonElement | null;
    ui.saveAllBtn = document.getElementById('save-all-btn') as HTMLButtonElement | null;
    ui.backToMenuBtn = document.getElementById('back-to-menu-btn') as HTMLButtonElement | null;
    ui.confirmSaveBtn = document.getElementById('confirm-save-btn') as HTMLButtonElement | null;
    ui.cancelSaveBtn = document.getElementById('cancel-save-btn') as HTMLButtonElement | null;
    ui.menuBtn = document.getElementById('menu-btn') as HTMLButtonElement | null;
    ui.restartBtn = document.getElementById('restart-btn') as HTMLButtonElement | null;
    ui.menuBtnDesktop = document.getElementById('menu-btn-desktop') as HTMLButtonElement | null;
    ui.restartBtnDesktop = document.getElementById('restart-btn-desktop') as HTMLButtonElement | null;
    
    // Menú hamburguesa
    const hamburgerBtn = document.getElementById('hamburger-btn') as HTMLButtonElement | null;
    const hamburgerBtnMobile = document.getElementById('hamburger-btn-mobile') as HTMLButtonElement | null;
    const hamburgerMenu = document.getElementById('hamburger-menu') as HTMLElement | null;
    const pauseResumeBtn = document.getElementById('pause-resume-btn') as HTMLButtonElement | null;
    const restartGameBtn = document.getElementById('restart-game-btn') as HTMLButtonElement | null;
    const backToMenuBtnGame = document.getElementById('back-to-menu-btn-game') as HTMLButtonElement | null;
    const resumeEditorBtnMenu = document.getElementById('resume-editor-btn-menu') as HTMLButtonElement | null;
    
    ui.exitModalEl = document.getElementById('exit-modal');
    ui.exitTitleEl = document.getElementById('exit-title');
    ui.exitTextEl = document.getElementById('exit-text');
    ui.exitConfirmBtn = document.getElementById('exit-confirm-btn') as HTMLButtonElement | null;
    ui.exitCancelBtn = document.getElementById('exit-cancel-btn') as HTMLButtonElement | null;
    
    // Editor tools
    ui.undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;
    ui.redoBtn = document.getElementById('redo-btn') as HTMLButtonElement | null;
    ui.duplicateRowBtn = document.getElementById('duplicate-row-btn') as HTMLButtonElement | null;
    ui.deleteRowBtn = document.getElementById('delete-row-btn') as HTMLButtonElement | null;
    
    // Función para ajustar la posición del canvas según el estado de los paneles
    // Los paneles ahora tienen position: absolute, por lo que no restan ancho al canvas
    const adjustCanvasPosition = () => {
        const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
        if (!canvasWrapper) return;
        
        // El canvas siempre ocupa 100vw ya que los paneles se superponen con position: absolute
        canvasWrapper.style.left = '0';
        canvasWrapper.style.width = '100vw';
    };
    
    // Función para actualizar el estado visual de los paneles
    const updatePanelStates = () => {
        const editorPanel = ui.editorPanelEl as HTMLElement;
        const userPanel = document.getElementById('user-panel');
        const editorToggleBtn = document.getElementById('editor-toggle') as HTMLButtonElement | null;
        const userPanelToggleBtn = document.getElementById('user-panel-toggle') as HTMLButtonElement | null;
        const editorPanelTitle = document.getElementById('editor-panel-title');
        const userPanelTitle = document.getElementById('user-panel-title');
        
        if (editorPanel && editorToggleBtn && editorPanelTitle) {
            const isEditorCollapsed = editorPanel.classList.contains('collapsed');
            const editorIconSpan = editorPanelTitle.querySelector('.toggle-icon-title');
            const toggleTitle = editorToggleBtn.querySelector('.toggle-title');
            const toggleIcon = editorToggleBtn.querySelector('.toggle-icon');
            
            // Si el panel está abierto, ocultar el botón toggle y mostrar icono en el título
            if (!isEditorCollapsed) {
                editorToggleBtn.style.display = 'none';
                if (editorIconSpan) {
                    (editorIconSpan as HTMLElement).style.display = 'inline';
                    editorIconSpan.textContent = '>'; // Para cerrar el panel derecho
                }
            } else {
                // Si está cerrado, mostrar el botón toggle con icono '<' y texto 'TOOLS'
                editorToggleBtn.style.display = 'flex';
                if (toggleIcon) {
                    toggleIcon.textContent = '<';
                }
                if (toggleTitle) {
                    (toggleTitle as HTMLElement).style.display = 'inline';
                }
                if (editorIconSpan) {
                    (editorIconSpan as HTMLElement).style.display = 'none';
                }
            }
        }
        
        if (userPanel && userPanelToggleBtn && userPanelTitle) {
            const isUserCollapsed = userPanel.classList.contains('collapsed');
            const userIconSpan = userPanelTitle.querySelector('.toggle-icon-title');
            const toggleTitle = userPanelToggleBtn.querySelector('.toggle-title');
            const toggleIcon = userPanelToggleBtn.querySelector('.toggle-icon');
            
            // Verificar si estamos en modo juego desde el editor (preserveLevels)
            // Si el toggle no está oculto, significa que estamos en modo editor o juego desde editor
            const isToggleHidden = userPanelToggleBtn.classList.contains('hidden');
            
            // Si el panel está abierto, ocultar el botón toggle y mostrar icono en el título
            if (!isUserCollapsed) {
                userPanelToggleBtn.style.display = 'none';
                if (userIconSpan) {
                    (userIconSpan as HTMLElement).style.display = 'inline';
                    userIconSpan.textContent = '<'; // Para cerrar el panel izquierdo
                }
            } else {
                // Si está cerrado, mostrar el botón toggle con icono '>' y texto 'USUARIO'
                // Si el toggle estaba oculto pero estamos en modo juego desde editor, mostrarlo
                if (isToggleHidden && store.appState === 'playing') {
                    // Verificar si hay un botón "Volver al Editor" en el panel (indica que venimos del editor)
                    const resumeEditorBtnPanel = document.getElementById('resume-editor-btn-panel');
                    if (resumeEditorBtnPanel && resumeEditorBtnPanel.style.display !== 'none') {
                        userPanelToggleBtn.classList.remove('hidden');
                    }
                }
                userPanelToggleBtn.style.display = 'flex';
                if (toggleIcon) {
                    toggleIcon.textContent = '>';
                }
                if (toggleTitle) {
                    (toggleTitle as HTMLElement).style.display = 'inline';
                }
                if (userIconSpan) {
                    (userIconSpan as HTMLElement).style.display = 'none';
                }
            }
        }
        
        // Ajustar posición del canvas
        adjustCanvasPosition();
    };
    
    // Toggle del editor (drawer)
    if (editorToggleBtn && ui.editorPanelEl) {
        // Click en el botón toggle (solo visible cuando está cerrado)
        editorToggleBtn.addEventListener('click', () => {
            const panel = ui.editorPanelEl as HTMLElement;
            panel.classList.remove('collapsed');
            updatePanelStates();
        });
        
        // Click en el título del panel para cerrar
        const editorPanelTitle = document.getElementById('editor-panel-title');
        if (editorPanelTitle) {
            editorPanelTitle.addEventListener('click', () => {
                const panel = ui.editorPanelEl as HTMLElement;
                if (!panel.classList.contains('collapsed')) {
                    panel.classList.add('collapsed');
                    updatePanelStates();
                }
            });
        }
    }
    
    // Toggle del panel de usuario (drawer izquierdo)
    const userPanelToggleBtn = document.getElementById('user-panel-toggle') as HTMLButtonElement | null;
    const userPanel = document.getElementById('user-panel');
    
    // Swipe para ocultar/mostrar paneles
    const setupPanelSwipe = (panel: HTMLElement, isLeft: boolean) => {
        let touchStartX = 0;
        let touchStartY = 0;
        let isSwipe = false;
        let hasSwiped = false;
        const threshold = 50; // Mínimo de píxeles para considerar swipe
        
        panel.addEventListener('touchstart', (e: TouchEvent) => {
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isSwipe = false;
                hasSwiped = false;
            }
        }, { passive: true });
        
        panel.addEventListener('touchmove', (e: TouchEvent) => {
            if (e.touches.length === 1 && !hasSwiped) {
                const touchX = e.touches[0].clientX;
                const touchY = e.touches[0].clientY;
                const deltaX = touchX - touchStartX;
                const deltaY = touchY - touchStartY;
                
                // Determinar si es un swipe horizontal (más horizontal que vertical)
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                    isSwipe = true;
                }
                
                // Si es un swipe horizontal y el panel está abierto, cerrarlo
                if (isSwipe && !panel.classList.contains('collapsed')) {
                    // Swipe izquierdo para cerrar panel izquierdo
                    // Swipe derecho para cerrar panel derecho
                    if (isLeft && deltaX < -threshold) {
                        panel.classList.add('collapsed');
                        updatePanelStates();
                        hasSwiped = true;
                    } else if (!isLeft && deltaX > threshold) {
                        panel.classList.add('collapsed');
                        updatePanelStates();
                        hasSwiped = true;
                    }
                }
            }
        }, { passive: true });
        
        panel.addEventListener('touchend', () => {
            touchStartX = 0;
            touchStartY = 0;
            isSwipe = false;
            hasSwiped = false;
        }, { passive: true });
    };
    
    if (userPanel) {
        setupPanelSwipe(userPanel as HTMLElement, true);
    }
    if (ui.editorPanelEl) {
        setupPanelSwipe(ui.editorPanelEl as HTMLElement, false);
    }
    
    if (userPanelToggleBtn && userPanel) {
        // Click en el botón toggle (solo visible cuando está cerrado)
        userPanelToggleBtn.addEventListener('click', () => {
            userPanel.classList.remove('collapsed');
            updatePanelStates();
        });
        
        // Click en el título del panel (avatar/nickname) para cerrar
        const userPanelTitle = document.getElementById('user-panel-title');
        const userPanelAvatar = document.getElementById('user-panel-avatar');
        const userPanelNickname = document.getElementById('user-panel-nickname');
        
        // Función para cerrar el panel
        const closeUserPanel = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            if (!userPanel.classList.contains('collapsed')) {
                userPanel.classList.add('collapsed');
                updatePanelStates();
            }
        };
        
        // Agregar listeners al título, avatar y nickname para cerrar el panel
        if (userPanelTitle) {
            userPanelTitle.addEventListener('click', closeUserPanel);
        }
        if (userPanelAvatar) {
            userPanelAvatar.addEventListener('click', closeUserPanel);
        }
        if (userPanelNickname) {
            userPanelNickname.addEventListener('click', closeUserPanel);
        }
    }

    // Configurar el menú hamburguesa
    const creditsBtnHamburger = document.getElementById('credits-btn-hamburger') as HTMLButtonElement | null;
    setupHamburgerMenu(store, hamburgerBtn, hamburgerBtnMobile, hamburgerMenu, pauseResumeBtn, restartGameBtn, backToMenuBtnGame, resumeEditorBtnMenu, creditsBtnHamburger);
    
    // Configurar modal de configuración
    setupSettingsModal(store);
    
    // Inicializar idioma y actualizar textos
    const currentLang = (store.settings as any).language || getCurrentLanguage();
    if (currentLang) {
        setLanguage(currentLang);
    }
    updateAllTexts(store);
    
    // Escuchar cambios de idioma
    window.addEventListener('languageChanged', () => {
        updateAllTexts(store);
    });
    
    // Configurar botón OK del modal de notificación
    const notificationOkBtn = document.getElementById('notification-ok-btn') as HTMLButtonElement | null;
    if (notificationOkBtn) {
        notificationOkBtn.addEventListener('click', () => {
            hideNotification(store);
        });
    }
    
    // Ajustar barras UI cuando cambia el tamaño de la ventana
    window.addEventListener('resize', adjustUIBars);
    
    // Aplicar configuración inicial de gráficos
    applyGraphicsSettings({ 
        ...store.settings.graphics,
        showFps: store.settings.graphics.showFps ?? false
    });
    
    // Aplicar configuración inicial de audio
    setMusicVolume(store.settings.audio.musicVolume);
    setSFXVolume(store.settings.audio.sfxVolume);
};


// Función helper para actualizar la barra de energía con colores graduales
export const updateEnergyBarColor = (energyBarEl: HTMLElement, energy: number, maxEnergy: number = 200) => {
    const energyPercentage = (energy / maxEnergy) * 100;
    
    // Usar transform scaleX para escalar de izquierda a derecha
    energyBarEl.style.transform = `scaleX(${energyPercentage / 100})`;
    energyBarEl.style.transformOrigin = 'left center';
    
    // Cambiar color gradualmente de verde a rojo
    if (energyPercentage > 60) {
        // Verde cuando está por encima del 60%
        energyBarEl.style.backgroundColor = '#4ade80'; // green-400
    } else if (energyPercentage > 30) {
        // Amarillo cuando está entre 30% y 60%
        energyBarEl.style.backgroundColor = '#facc15'; // yellow-400
    } else {
        // Rojo cuando está por debajo del 30%
        energyBarEl.style.backgroundColor = '#ef4444'; // red-500
    }
};

const setBodyClass = (state: string) => {
    document.body.className = `state-${state}`;
};

export const showMenu = (store: GameStore) => {
    // Ocultar modal de game over si está visible
    if (store.dom.ui.gameoverModal) {
        store.dom.ui.gameoverModal.classList.add('hidden');
    }
    
    // Resetear zoom y pan del canvas al volver al menú
    const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
    if (canvasWrapper) {
        canvasWrapper.style.transform = 'scale(1)';
    }
    if (store.dom.zoomScale) {
        store.dom.zoomScale = 1;
    }
    
    store.appState = 'menu';
    store.gameState = 'start';
    setBodyClass('menu');
    
    // Mostrar selector de idioma (banderas) cuando esté en el menú
    const languageSelectorContainer = document.getElementById('language-selector-container');
    if (languageSelectorContainer) {
        languageSelectorContainer.style.display = 'block';
    }
    
    // Actualizar textos según idioma actual
    updateAllTexts(store);
    
    // Pausar música de fondo al volver al menú
    pauseBackgroundMusic();
    
    // Ocultar panel de usuario en mobile
    const userPanel = document.getElementById('user-panel');
    if (userPanel) {
        userPanel.style.display = 'none';
    }
    
    // Ocultar paneles y toggles del editor
    const editorToggle = document.getElementById('editor-toggle');
    if (editorToggle) {
        editorToggle.classList.add('hidden');
    }
    const userPanelToggle = document.getElementById('user-panel-toggle');
    if (userPanelToggle) {
        userPanelToggle.classList.add('hidden');
    }
    
    const { messageOverlay, messageTitle, messageText, gameUiEl, rightUiEl, bottomUiEl, editorPanelEl, mobileControlsEl, retryBtn, heroLogoEl } = store.dom.ui;
    const splashContainer = document.getElementById('splash-container');
    if (splashContainer) {
        splashContainer.style.display = 'block';
        // Asegurar que la imagen de fondo se establezca cuando se muestra el menú
        const splashSprite = store.sprites.splash;
        if (splashSprite && splashSprite.src) {
            if (!splashContainer.style.backgroundImage) {
                splashContainer.style.backgroundImage = `url(${splashSprite.src})`;
            }
        }
    }
    if (messageOverlay) {
        messageOverlay.style.display = 'flex';
        messageOverlay.style.backgroundImage = 'none';
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'none';
    }
    const creditBarEl = document.getElementById('credit-bar');
    if (creditBarEl) {
        creditBarEl.style.display = 'none';
    }
    if (heroLogoEl) {
        heroLogoEl.style.display = 'block';
    }
    if (rightUiEl) {
        rightUiEl.style.display = 'none';
    }
    if (bottomUiEl) {
        bottomUiEl.style.display = 'none';
    }
    if (editorPanelEl) {
        editorPanelEl.style.display = 'none';
    }
    store.dom.ui.resumeEditorBtn?.classList.add('hidden');

    if (messageTitle) {
        messageTitle.textContent = 'NEW H.E.R.O.';
    }
    if (messageText) {
        messageText.innerHTML = t('messages.pressEnter');
    }
    // Ocultar botón de reintentar en el menú principal
    if (retryBtn) {
        retryBtn.classList.add('hidden');
    }

    if ('ontouchstart' in window && mobileControlsEl) {
        mobileControlsEl.dataset.active = 'false';
    }
    if (store.joystickManager) {
        store.joystickManager.destroy();
        store.joystickManager = null;
    }

    // Actualizar botón de editor según estado de login
    const updateEditorButton = () => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
        if (levelEditorBtn) {
            levelEditorBtn.textContent = isLoggedIn ? t('menu.editor') : t('menu.login');
        }
    };
    updateEditorButton();
};

/**
 * Calcula la distancia entre dos puntos táctiles
 */
const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calcula el punto medio entre dos puntos táctiles
 */
const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
};

/**
 * Configura el gesto de pinch para hacer zoom y pan en el canvas en mobile
 * El pan mueve la cámara (cameraX, cameraY) dentro del canvas, no el canvas mismo
 */
const setupPinchZoom = (store: GameStore) => {
    const canvas = store.dom.canvas;
    const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
    if (!canvas || !canvasWrapper || !('ontouchstart' in window)) {
        return;
    }
    
    // Solo activar en mobile
    const isMobile = window.innerWidth <= 1024;
    if (!isMobile) {
        return;
    }
    
    let initialDistance = 0;
    let initialScale = 1;
    let currentScale = 1;
    let initialCenter = { x: 0, y: 0 };
    let initialCamera = { x: 0, y: 0 };
    let isPinching = false;
    
    // Guardar zoom y pan en el store para acceso global
    if (!store.dom.zoomScale) {
        store.dom.zoomScale = 1;
    }
    
    const handleTouchStart = (e: TouchEvent) => {
        // Solo procesar si hay exactamente 2 dedos
        if (e.touches.length === 2) {
            const isEditorMode = store.appState === 'editing';
            
            if (isEditorMode) {
                // En editor: NO hacer zoom, solo permitir scroll de dos dedos
                // No prevenir el comportamiento por defecto para permitir scroll nativo
                isPinching = false; // Desactivar pinch en editor
                return; // Dejar que el editor maneje el scroll de dos dedos
            }
            
            // En modo juego: permitir zoom y pan
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            initialDistance = getTouchDistance(touch1, touch2);
            initialScale = currentScale;
            initialCenter = getTouchCenter(touch1, touch2);
            initialCamera = { x: store.cameraX, y: store.cameraY };
            isPinching = true;
        } else if (e.touches.length === 1) {
            // Si solo hay un dedo, resetear el estado
            isPinching = false;
        }
    };
    
    const handleTouchMove = (e: TouchEvent) => {
        // Solo procesar si hay exactamente 2 dedos
        if (e.touches.length === 2 && isPinching) {
            const isEditorMode = store.appState === 'editing';
            
            if (isEditorMode) {
                // En editor: NO hacer zoom, solo permitir scroll de dos dedos
                // No prevenir el comportamiento por defecto para permitir scroll nativo
                return; // Dejar que el editor maneje el scroll de dos dedos
            }
            
            // En modo juego: zoom + pan
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = getTouchDistance(touch1, touch2);
            
            // Calcular el factor de zoom basado en el cambio de distancia
            const scaleChange = currentDistance / initialDistance;
            currentScale = Math.max(0.5, Math.min(3.0, initialScale * scaleChange)); // Limitar entre 0.5x y 3x
            store.dom.zoomScale = currentScale;
            
            const currentCenter = getTouchCenter(touch1, touch2);
            
            // Calcular el desplazamiento del centro (pan)
            const deltaX = currentCenter.x - initialCenter.x;
            const deltaY = currentCenter.y - initialCenter.y;
            
            // Convertir el desplazamiento en píxeles de pantalla a coordenadas de mundo
            const canvas = store.dom.canvas;
            if (canvas) {
                const canvasRect = canvas.getBoundingClientRect();
                const actualCanvasWidth = canvasRect.width;
                const actualCanvasHeight = canvasRect.height;
                
                // Convertir píxeles de pantalla a coordenadas del mundo
                const worldDeltaX = -deltaX / currentScale;
                const worldDeltaY = -deltaY / currentScale;
                
                // Obtener dimensiones del nivel
                const levelCols = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
                const levelRows = store.levelDesigns[store.currentLevelIndex]?.length ?? 0;
                const levelWidth = levelCols * TILE_SIZE;
                const levelHeight = levelRows * TILE_SIZE;
                
                // Calcular límites de cámara considerando el zoom
                const visibleWidth = actualCanvasWidth / currentScale;
                const visibleHeight = actualCanvasHeight / currentScale;
                const maxCamX = Math.max(0, levelWidth - visibleWidth);
                const maxCamY = Math.max(0, levelHeight - visibleHeight);
                
                // Actualizar la posición de la cámara
                store.cameraX = Math.max(0, Math.min(initialCamera.x + worldDeltaX, maxCamX));
                store.cameraY = Math.max(0, Math.min(initialCamera.y + worldDeltaY, maxCamY));
            }
            
            // Aplicar zoom al canvas wrapper
            canvasWrapper.style.transform = `scale(${currentScale})`;
            canvasWrapper.style.transformOrigin = 'center center';
        }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
        // Si quedan menos de 2 dedos, detener el zoom/pan
        if (e.touches.length < 2) {
            isPinching = false;
        }
    };
    
    // Agregar event listeners al canvas
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    
    // Resetear zoom/pan con doble tap
    let lastTapTime = 0;
    canvas.addEventListener('touchend', (e: TouchEvent) => {
        if (e.touches.length === 0 && e.changedTouches.length === 1) {
            const now = Date.now();
            if (now - lastTapTime < 300) {
                // Doble tap detectado - resetear zoom y pan
                currentScale = 1;
                store.dom.zoomScale = 1;
                canvasWrapper.style.transform = 'scale(1)';
                // El pan se reseteará al iniciar el juego o editor
            }
            lastTapTime = now;
        }
    }, { passive: true });
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

    // Crear joystick virtual flotante (nipplejs) - funciona fuera del área de botones
    store.joystickManager = nipplejs.create({
        zone: joystickZoneEl,
        mode: 'dynamic', // Modo flotante - aparece donde tocas
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

    // Configurar botones direccionales (funcionan independientemente)
    const setupDirectionalButton = (buttonId: string, keys: string[]) => {
        const button = document.getElementById(buttonId);
        if (!button) return;

        const handleStart = () => {
            // Desactivar todas las direcciones primero
            store.keys.ArrowUp = false;
            store.keys.ArrowLeft = false;
            store.keys.ArrowRight = false;
            
            // Activar las direcciones correspondientes
            keys.forEach(key => {
                store.keys[key as keyof typeof store.keys] = true;
            });
            
            // Marcar como activo
            button.classList.add('active');
        };

        const handleEnd = () => {
            // Desactivar todas las direcciones
            store.keys.ArrowUp = false;
            store.keys.ArrowLeft = false;
            store.keys.ArrowRight = false;
            
            // Remover clase activa
            button.classList.remove('active');
        };

        button.addEventListener('touchstart', handleStart, { passive: true });
        button.addEventListener('touchend', handleEnd, { passive: true });
        button.addEventListener('touchcancel', handleEnd, { passive: true });
        
        // Para compatibilidad con mouse (en desarrollo)
        button.addEventListener('mousedown', handleStart);
        button.addEventListener('mouseup', handleEnd);
        button.addEventListener('mouseleave', handleEnd);
    };

    // Configurar seguimiento global del dedo para cambios fluidos entre botones
    let currentTouchTarget: HTMLElement | null = null;
    
    // Mapeo de botones a direcciones
    const buttonDirections: Record<string, string[]> = {
        'btn-up': ['ArrowUp'],
        'btn-left': ['ArrowLeft'],
        'btn-right': ['ArrowRight'],
        'btn-up-left': ['ArrowUp', 'ArrowLeft'],
        'btn-up-right': ['ArrowUp', 'ArrowRight']
    };
    
    const activateDirections = (keys: string[]) => {
        // Desactivar todas las direcciones
        store.keys.ArrowUp = false;
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
        
        // Activar las direcciones especificadas
        keys.forEach(key => {
            store.keys[key as keyof typeof store.keys] = true;
        });
    };
    
    const handleGlobalTouchMove = (event: TouchEvent) => {
        if (!currentTouchTarget) return;
        
        const touch = event.touches[0];
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
        const directionalButton = elementBelow?.closest('.directional-btn') as HTMLElement;
        
        if (directionalButton && directionalButton !== currentTouchTarget) {
            // Cambiar al nuevo botón
            currentTouchTarget.classList.remove('active');
            directionalButton.classList.add('active');
            
            // Activar las direcciones del nuevo botón
            const buttonId = directionalButton.id;
            const keys = buttonDirections[buttonId];
            if (keys) {
                activateDirections(keys);
            }
            
            currentTouchTarget = directionalButton;
        }
    };
    
    const handleGlobalTouchStart = (event: TouchEvent) => {
        const elementBelow = document.elementFromPoint(event.touches[0].clientX, event.touches[0].clientY) as HTMLElement;
        const directionalButton = elementBelow?.closest('.directional-btn') as HTMLElement;
        
        if (directionalButton) {
            currentTouchTarget = directionalButton;
        }
    };
    
    const handleGlobalTouchEnd = () => {
        currentTouchTarget = null;
    };
    
    // Agregar listeners globales para seguimiento del dedo
    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true });
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: true });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleGlobalTouchEnd, { passive: true });

    // Configurar cada botón direccional usando el mapeo
    Object.entries(buttonDirections).forEach(([buttonId, keys]) => {
        setupDirectionalButton(buttonId, keys);
    });

    // Configurar botones de acción
    const shootBtn = document.getElementById('shoot-btn');
    const bombBtn = document.getElementById('bomb-btn');
    const volumeToggle = store.dom.ui.volumeToggle as HTMLSpanElement | null;

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

};

export const startGame = (store: GameStore, levelOverride: string[] | null = null, startIndex?: number, preserveLevels?: boolean) => {
    // Resetear zoom y pan del canvas al iniciar el juego
    const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
    if (canvasWrapper) {
        canvasWrapper.style.transform = 'scale(1)';
    }
    if (store.dom.zoomScale) {
        store.dom.zoomScale = 1;
    }
    
    // Ocultar modal de game over si está visible
    if (store.dom.ui.gameoverModal) {
        store.dom.ui.gameoverModal.classList.add('hidden');
    }
    store.appState = 'playing';
    store.gameState = 'playing';
    setBodyClass('playing');
    
    // Ocultar selector de idioma (banderas) cuando esté en juego
    const languageSelectorContainer = document.getElementById('language-selector-container');
    if (languageSelectorContainer) {
        languageSelectorContainer.style.display = 'none';
    }
    const splashContainer = document.getElementById('splash-container');
    if (splashContainer) {
        splashContainer.style.display = 'none';
    }
    const { messageOverlay, gameUiEl, rightUiEl, bottomUiEl, editorPanelEl, heroLogoEl } = store.dom.ui;
    if (messageOverlay) {
        messageOverlay.style.display = 'none';
        // Limpiar el fondo del splash
        messageOverlay.style.backgroundImage = '';
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'flex';
    }
    const creditBarEl = document.getElementById('credit-bar');
    if (creditBarEl) {
        creditBarEl.style.display = 'flex';
    }
    if (heroLogoEl) {
        heroLogoEl.style.display = 'block';
    }
    if (rightUiEl) {
        const isMobileLandscape = window.matchMedia('(max-width: 1024px) and (orientation: landscape)').matches || window.matchMedia('(max-width: 768px) and (orientation: landscape)').matches;
        if (isMobileLandscape) {
            rightUiEl.style.display = 'flex';
        } else {
            rightUiEl.style.display = 'none';
        }
    }
    
    // Ajustar el ancho de las barras UI al canvas
    setTimeout(() => adjustUIBars(), 0);
    if (bottomUiEl) {
        bottomUiEl.style.display = 'flex';
    }
    if (levelOverride) {
        store.dom.ui.resumeEditorBtn?.classList.remove('hidden');
    } else {
        store.dom.ui.resumeEditorBtn?.classList.add('hidden');
    }
    if (editorPanelEl) {
        editorPanelEl.style.display = 'none';
        // Ocultar toggle del editor cuando salimos del editor
        const toggle = document.getElementById('editor-toggle') as HTMLButtonElement | null;
        if (toggle) toggle.classList.add('hidden');
        // Solo ocultar el toggle del panel de usuario si NO venimos del editor
        // Si venimos del editor (preserveLevels), mantenerlo visible para poder abrir el panel
        if (!preserveLevels) {
            const userToggle = document.getElementById('user-panel-toggle') as HTMLButtonElement | null;
            if (userToggle) userToggle.classList.add('hidden');
        }
    }
    // Aplicar modo de control configurado
    applyControlMode(store, store.settings.controls.mobileMode);

    // Intento de bloqueo de orientación a landscape en navegadores que lo soportan
    try {
        const anyScreen: any = window.screen;
        if (anyScreen?.orientation?.lock) {
            anyScreen.orientation.lock('landscape').catch(() => {});
        }
    } catch {}
    
    // Iniciar música de fondo
    playBackgroundMusic().catch(() => {});
    
    // Si venimos desde el editor (levelOverride no nulo) mostrar "Volver al Editor" en el menú hamburguesa
    const resumeEditorBtnMenu = document.getElementById('resume-editor-btn-menu');
    if (levelOverride || preserveLevels) {
        resumeEditorBtnMenu?.classList.remove('hidden');
    } else {
        resumeEditorBtnMenu?.classList.add('hidden');
    }
    
    // Si venimos desde el editor, modificar el panel de usuario para mostrar solo "Volver al Editor"
    if (preserveLevels) {
        const userPanel = document.getElementById('user-panel');
        if (userPanel) {
            // Mostrar el panel de usuario y el toggle para poder abrirlo/cerrarlo
            userPanel.style.display = 'flex';
            const userToggle = document.getElementById('user-panel-toggle') as HTMLButtonElement | null;
            if (userToggle) {
                userToggle.classList.remove('hidden');
                // Actualizar el texto del toggle para que diga "USUARIO"
                const toggleTitle = userToggle.querySelector('.toggle-title');
                if (toggleTitle) {
                    (toggleTitle as HTMLElement).style.display = 'inline';
                }
            }
            
            // Ocultar todos los elementos excepto el título y el botón de volver al editor
            const userAreaMobile = document.getElementById('user-area-mobile');
            const playTestBtnMobile = document.getElementById('play-test-btn-mobile');
            const levelsSectionMobile = userPanel.querySelector('.mt-4');
            const backToMenuBtnMobile = document.getElementById('back-to-menu-btn-mobile');
            
            if (userAreaMobile) userAreaMobile.style.display = 'none';
            if (playTestBtnMobile) playTestBtnMobile.style.display = 'none';
            if (levelsSectionMobile) (levelsSectionMobile as HTMLElement).style.display = 'none';
            
            // Crear o mostrar botón "Volver al Editor" en el panel de usuario
            let resumeEditorBtnPanel = document.getElementById('resume-editor-btn-panel');
            if (!resumeEditorBtnPanel) {
                resumeEditorBtnPanel = document.createElement('button');
                resumeEditorBtnPanel.id = 'resume-editor-btn-panel';
                resumeEditorBtnPanel.className = 'nes-btn is-primary w-full mt-4 text-xs';
                resumeEditorBtnPanel.textContent = t('editor.backToEditor');
                userPanel.appendChild(resumeEditorBtnPanel);
                
                // Agregar listener
                resumeEditorBtnPanel.addEventListener('click', () => {
                    if (store.appState === 'playing') {
                        const index = store.currentLevelIndex;
                        const levelRows = store.levelDesigns[index] ?? [];
                        store.editorLevel = levelRows.map(row => row.split(''));
                        startEditor(store, true);
                    }
                });
            }
            resumeEditorBtnPanel.style.display = 'block';
        }
    } else {
        // Si no venimos del editor, restaurar el panel normal
        const userPanel = document.getElementById('user-panel');
        if (userPanel) {
            const resumeEditorBtnPanel = document.getElementById('resume-editor-btn-panel');
            if (resumeEditorBtnPanel) {
                resumeEditorBtnPanel.style.display = 'none';
            }
            // Restaurar elementos (se restaurarán cuando se vuelva al editor)
        }
    }
    
    store.lives = 5;
    store.score = 0;
    store.scoreLifeMilestone = 0;
    // Configurar niveles
    if (preserveLevels) {
        // Mantener store.levelDesigns tal como lo preparó el llamador
    } else if (levelOverride) {
        store.levelDesigns = [levelOverride];
    } else {
        // Usar levelDataStore que contiene todos los niveles (incluyendo los nuevos)
        store.levelDesigns = store.levelDataStore.map(level => 
            level.map(row => row.join(''))
        );
    }
    // Establecer índice inicial
    store.currentLevelIndex = startIndex ?? 0;
    
    // Marcar si estamos jugando desde el editor
    store.playingFromEditor = preserveLevels ?? false;
    loadLevel(store);
};

// Otorgar una vida extra por cada 20000 puntos acumulados
export const awardExtraLifeByScore = (store: GameStore) => {
    const milestone = Math.floor(store.score / 20000);
    if (milestone > (store.scoreLifeMilestone || 0)) {
        const delta = milestone - (store.scoreLifeMilestone || 0);
        store.lives += delta;
        store.scoreLifeMilestone = milestone;
        
        // Reproducir sonido de vida extra
        import('./audio').then(({ playOneUpSound }) => {
            playOneUpSound();
        });
        
        // Mostrar texto "+1up" arriba del héroe (más grande y llamativo)
        const { player } = store;
        if (player) {
            store.floatingScores.push({
                x: player.x + player.width / 2 - 35, // Centrar el texto (ajustado para texto más grande)
                y: player.y - 40, // Arriba del héroe
                text: '+1up',
                life: 90, // Duración similar a otros textos flotantes
                opacity: 1,
            });
        }
    }
};

export const startEditor = async (store: GameStore, preserveCurrentLevel: boolean = false) => {
    // Cargar editor de forma lazy
    const { setupEditorState, bindEditorCanvas } = await import('./editor');
    setupEditorState(store);
    bindEditorCanvas(store);
    
    // Inicializar zoom al entrar al editor (resetear a 1.0)
    if (!store.dom.zoomScale || store.dom.zoomScale !== 1) {
        store.dom.zoomScale = 1;
    }
    // No aplicar transform al canvas wrapper - el zoom se aplica a los tiles directamente
    
    // IMPORTANTE: La campaña Legacy NO usa base de datos
    // Verificar si la campaña actual es Legacy
    const { getCurrentCampaign } = await import('../utils/campaigns');
    const currentCampaign = getCurrentCampaign(store);
    const isLegacyCampaign = currentCampaign?.isDefault === true;
    
    // Solo cargar niveles de la BD si NO es Legacy
    // Legacy siempre se sirve desde assets/levels.json
    if (!isLegacyCampaign) {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            await tryLoadUserLevels(store);
        }
    }
    // Legacy: NO cargar cambios desde localStorage - siempre usar niveles originales de assets/levels.json
    
    // Actualizar el selector de niveles
    // Si hay una campaña seleccionada, mostrar solo los niveles de esa campaña
    if (store.currentCampaignId) {
        import('./campaigns-ui').then(({ syncLevelSelectorForCampaign }) => {
            syncLevelSelectorForCampaign(store);
        }).catch(() => {
            // Si falla, usar el método normal
            syncLevelSelector(store);
        });
    } else {
        // Si no hay campaña seleccionada, mostrar todos los niveles
        syncLevelSelector(store);
    }
    
    store.appState = 'editing';
    setBodyClass('editing');
    
    // Ocultar selector de idioma (banderas) cuando esté en editor
    const languageSelectorContainer = document.getElementById('language-selector-container');
    if (languageSelectorContainer) {
        languageSelectorContainer.style.display = 'none';
    }
    const splashContainer = document.getElementById('splash-container');
    if (splashContainer) {
        splashContainer.style.display = 'none';
    }
    const { messageOverlay, gameUiEl, bottomUiEl, editorPanelEl, levelSelectorEl } = store.dom.ui;
    
    // Sincronizar selector mobile después de syncLevelSelector y obtener levelSelectorEl
    const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
    if (levelSelectorMobile && levelSelectorEl) {
        levelSelectorMobile.innerHTML = levelSelectorEl.innerHTML;
        levelSelectorMobile.value = levelSelectorEl.value;
    }
    if (messageOverlay) {
        messageOverlay.style.display = 'none';
        // Limpiar el fondo del splash
        messageOverlay.style.backgroundImage = '';
    }
    if (gameUiEl) {
        gameUiEl.style.display = 'none';
    }
    const creditBarEl2 = document.getElementById('credit-bar');
    if (creditBarEl2) {
        creditBarEl2.style.display = 'none';
    }
    if (bottomUiEl) {
        bottomUiEl.style.display = 'none';
    }
    store.dom.ui.resumeEditorBtn?.classList.add('hidden');
    
    // Ocultar credit-bar en el editor
    const creditBarEl = document.getElementById('credit-bar');
    if (creditBarEl) {
        creditBarEl.style.display = 'none';
    }
    
    // Panel de Usuario - Mostrar en mobile y desktop
    const userPanel = document.getElementById('user-panel');
    if (userPanel) {
        userPanel.style.display = 'flex';
        
        // Restaurar elementos del panel si estaban ocultos (por ejemplo, después de jugar nivel)
        const userAreaMobileEl = document.getElementById('user-area-mobile');
        const playTestBtnMobileEl = document.getElementById('play-test-btn-mobile');
        const levelsSectionMobile = userPanel.querySelector('.mt-4');
        const resumeEditorBtnPanel = document.getElementById('resume-editor-btn-panel');
        
        // Actualizar título con nickname del usuario (priorizar nickname sobre username)
        const nickname = localStorage.getItem('nickname') || localStorage.getItem('username') || 'Usuario';
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        // Restaurar elementos que podrían estar ocultos
        if (userAreaMobileEl) {
            if (isLoggedIn && nickname) {
                userAreaMobileEl.style.display = 'block';
            } else {
                userAreaMobileEl.style.display = 'none';
            }
        }
        if (playTestBtnMobileEl) playTestBtnMobileEl.style.display = 'block';
        if (levelsSectionMobile) (levelsSectionMobile as HTMLElement).style.display = 'block';
        if (resumeEditorBtnPanel) resumeEditorBtnPanel.style.display = 'none';
        
        const userPanelNickname = document.getElementById('user-panel-nickname');
        const userPanelAvatar = document.getElementById('user-panel-avatar');
        
        // Actualizar nickname
        if (userPanelNickname) {
            userPanelNickname.textContent = nickname.toUpperCase();
        }
        
        // Actualizar avatar si está guardado (default: Player)
        const savedAvatar = localStorage.getItem('avatar') || 'P';
        const userPanelAvatarCanvas = document.getElementById('user-panel-avatar') as HTMLCanvasElement | null;
        if (userPanelAvatarCanvas) {
            drawAvatar(store, savedAvatar, userPanelAvatarCanvas, performance.now());
            // Registrar para animación continua
            const existingIndex = avatarCanvases.findIndex(a => a.canvas === userPanelAvatarCanvas);
            if (existingIndex >= 0) {
                avatarCanvases[existingIndex].code = savedAvatar;
            } else {
                avatarCanvases.push({ code: savedAvatar, canvas: userPanelAvatarCanvas });
            }
        }
        
        // El título del panel de usuario ya tiene un listener en attachDomReferences que lo cierra
        // No agregamos otro listener aquí para evitar conflictos
        
        // Sincronizar selector de niveles mobile con el desktop
        const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
        if (levelSelectorMobile && levelSelectorEl) {
            // Copiar opciones del selector desktop
            levelSelectorMobile.innerHTML = levelSelectorEl.innerHTML;
            levelSelectorMobile.value = levelSelectorEl.value;
        }
    }
    
    if (editorPanelEl) {
        editorPanelEl.style.display = 'flex';
        // Actualizar área de usuario (desktop) - usar nickname si está disponible
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const nickname = localStorage.getItem('nickname') || localStorage.getItem('username');
        const userArea = document.getElementById('user-area');
        const usernameDisplay = document.getElementById('username-display');
        if (userArea && usernameDisplay) {
            if (isLoggedIn && nickname) {
                usernameDisplay.textContent = nickname;
                userArea.style.display = 'block';
            } else {
                userArea.style.display = 'none';
            }
        }
        // Mostrar toggle del editor y abrir panel por defecto
        const toggle = document.getElementById('editor-toggle') as HTMLButtonElement | null;
        if (toggle) {
            toggle.classList.remove('hidden');
            // Iniciar con el panel abierto (no colapsado)
            const panel = editorPanelEl as HTMLElement;
            panel.classList.remove('collapsed');
        }
        editorPanelEl.classList.remove('collapsed');
        
        // Mostrar toggle del panel de usuario y abrir panel por defecto
        const userToggle = document.getElementById('user-panel-toggle') as HTMLButtonElement | null;
        if (userToggle && userPanel) {
            userToggle.classList.remove('hidden');
            userPanel.classList.remove('collapsed');
        }
        
        // Actualizar estados visuales de los paneles (ocultar toggles y mostrar iconos en títulos)
        // Usar setTimeout para asegurar que los elementos están en el DOM
        setTimeout(() => {
            // Reutilizar la función updatePanelStates definida en attachDomReferences
            const editorPanel = editorPanelEl as HTMLElement;
            const editorToggleBtn = document.getElementById('editor-toggle') as HTMLButtonElement | null;
            const userPanelToggleBtn = document.getElementById('user-panel-toggle') as HTMLButtonElement | null;
            const editorPanelTitle = document.getElementById('editor-panel-title');
            const userPanelTitle = document.getElementById('user-panel-title');
            
            if (editorPanel && editorToggleBtn && editorPanelTitle) {
                const isEditorCollapsed = editorPanel.classList.contains('collapsed');
                const editorIconSpan = editorPanelTitle.querySelector('.toggle-icon-title');
                const toggleTitle = editorToggleBtn.querySelector('.toggle-title');
                const toggleIcon = editorToggleBtn.querySelector('.toggle-icon');
                
                if (!isEditorCollapsed) {
                    editorToggleBtn.style.display = 'none';
                    if (editorIconSpan) {
                        (editorIconSpan as HTMLElement).style.display = 'inline';
                        editorIconSpan.textContent = '>';
                    }
                } else {
                    editorToggleBtn.style.display = 'flex';
                    if (toggleIcon) {
                        toggleIcon.textContent = '>';
                    }
                    if (toggleTitle) {
                        (toggleTitle as HTMLElement).style.display = 'inline';
                    }
                    if (editorIconSpan) {
                        (editorIconSpan as HTMLElement).style.display = 'none';
                    }
                }
            }
            
            if (userPanel && userPanelToggleBtn && userPanelTitle) {
                const isUserCollapsed = userPanel.classList.contains('collapsed');
                const userIconSpan = userPanelTitle.querySelector('.toggle-icon-title');
                const toggleTitle = userPanelToggleBtn.querySelector('.toggle-title');
                const toggleIcon = userPanelToggleBtn.querySelector('.toggle-icon');
                
                if (!isUserCollapsed) {
                    userPanelToggleBtn.style.display = 'none';
                    if (userIconSpan) {
                        (userIconSpan as HTMLElement).style.display = 'inline';
                        userIconSpan.textContent = '<';
                    }
                } else {
                    userPanelToggleBtn.style.display = 'flex';
                    if (toggleIcon) {
                        toggleIcon.textContent = 'C';
                    }
                    if (toggleTitle) {
                        (toggleTitle as HTMLElement).style.display = 'inline';
                    }
                    if (userIconSpan) {
                        (userIconSpan as HTMLElement).style.display = 'none';
                    }
                }
            }
            
            // Ajustar posición del canvas
            // Los paneles ahora tienen position: absolute, por lo que no restan ancho al canvas
            const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
            if (canvasWrapper) {
                // El canvas siempre ocupa 100vw ya que los paneles se superponen con position: absolute
                canvasWrapper.style.left = '0';
                canvasWrapper.style.width = '100vw';
            }
        }, 0);

        // Toggle secciones del panel (Edición / Niveles)
        const bindSectionToggle = (btnId: string, arrowId: string, contentId: string) => {
            const btn = document.getElementById(btnId) as HTMLButtonElement | null;
            const arrow = document.getElementById(arrowId) as HTMLElement | null;
            const content = document.getElementById(contentId) as HTMLElement | null;
            if (!btn || !arrow || !content) return;
            btn.addEventListener('click', () => {
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? 'block' : 'none';
                arrow.textContent = isHidden ? '▼' : '▶';
            });
        };
        bindSectionToggle('edit-section-toggle', 'edit-section-arrow', 'edit-section-content');
        
        // Para la sección de niveles, hacer que el botón abra el modal de campañas
        const levelsSectionToggle = document.getElementById('levels-section-toggle') as HTMLButtonElement | null;
        const levelsSectionArrow = document.getElementById('levels-section-arrow') as HTMLElement | null;
        const levelsSectionContent = document.getElementById('levels-section-content') as HTMLElement | null;
        if (levelsSectionToggle) {
            levelsSectionToggle.addEventListener('click', (e) => {
                // Si se hace click en el span del nombre (no en el arrow), abrir modal de campañas
                const target = e.target as HTMLElement;
                const span = levelsSectionToggle.querySelector('span:first-child');
                if (span && (target === span || span.contains(target))) {
                    // Abrir modal de campañas
                    import('./campaigns-ui').then(({ showCampaignsModal }) => {
                        showCampaignsModal(store);
                    });
                } else {
                    // Si se hace click en el arrow o en otra parte, toggle normal
                    if (levelsSectionContent && levelsSectionArrow) {
                        const isHidden = levelsSectionContent.style.display === 'none';
                        levelsSectionContent.style.display = isHidden ? 'block' : 'none';
                        levelsSectionArrow.textContent = isHidden ? '▼' : '▶';
                    }
                }
            });
        }
        
        // También para mobile - botón de campaña
        const campaignTitleBtn = document.getElementById('campaign-title-btn') as HTMLButtonElement | null;
        if (campaignTitleBtn) {
            campaignTitleBtn.addEventListener('click', () => {
                import('./campaigns-ui').then(({ showCampaignsModal }) => {
                    showCampaignsModal(store);
                });
            });
        }
        
        // También para mobile - título alternativo
        const levelsSectionMobileTitle = document.querySelector('#user-panel h3.text-center') as HTMLElement | null;
        if (levelsSectionMobileTitle) {
            levelsSectionMobileTitle.style.cursor = 'pointer';
            levelsSectionMobileTitle.addEventListener('click', () => {
                import('./campaigns-ui').then(({ showCampaignsModal }) => {
                    showCampaignsModal(store);
                });
            });
        }
    }
    
    // Solo cargar desde levelDataStore si no estamos preservando el nivel actual
    if (!preserveCurrentLevel) {
        // Cargar el nivel actual del selector cuando se inicia el editor
        const currentIndex = parseInt(levelSelectorEl?.value ?? '0', 10);
        store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[currentIndex] ?? []));
    }
    
    // Centrar la cámara del editor en el jugador si existe
    const canvas = store.dom.canvas;
    if (canvas && store.editorLevel.length > 0) {
        let playerCol = 0;
        let playerRow = 0;
        outerCenterStart: for (let r = 0; r < store.editorLevel.length; r++) {
            const c = store.editorLevel[r]?.indexOf('P') ?? -1;
            if (c !== -1) {
                playerRow = r;
                playerCol = c;
                break outerCenterStart;
            }
        }
        const levelCols = store.editorLevel[0]?.length ?? 0;
        const levelRows = store.editorLevel.length;
        const levelWidth = levelCols * TILE_SIZE;
        const levelHeight = levelRows * TILE_SIZE;
        // El canvas internamente tiene 1440px (20 tiles), así que usamos ese tamaño para la cámara
        const canvasInternalWidth = 1440; // 20 tiles * 72px
        const desiredX = playerCol * TILE_SIZE - canvasInternalWidth / 2; // Centrar horizontalmente
        const desiredY = playerRow * TILE_SIZE - canvas.height / 2; // Centrar verticalmente
        const maxCamX = Math.max(0, levelWidth - canvasInternalWidth);
        const maxCamY = Math.max(0, levelHeight - canvas.height);
        store.cameraX = Math.max(0, Math.min(desiredX, maxCamX));
        store.cameraY = Math.max(0, Math.min(desiredY, maxCamY));
    } else {
        // Fallback
        store.cameraX = 0;
        store.cameraY = 0;
    }
    
    // Inicializar el editor avanzado
    initializeAdvancedEditor(store);
};

export const updateUiBar = (store: GameStore) => {
    const { livesCountEl, levelCountEl, scoreCountEl, energyBarEl } = store.dom.ui;
    if (livesCountEl) {
        // Si hay más de 5 vidas, mostrar "Nx player", de lo contrario mostrar el número
        if (store.lives > 5) {
            livesCountEl.textContent = `${store.lives}x player`;
        } else {
            livesCountEl.textContent = `${store.lives}`;
        }
    }
    if (levelCountEl) {
        levelCountEl.textContent = `${store.currentLevelIndex + 1}`;
    }
    if (scoreCountEl) {
        scoreCountEl.textContent = `${store.score}`;
    }
    if (energyBarEl) {
        updateEnergyBarColor(energyBarEl, store.energy);
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

    // Caso especial para el tentáculo
    if (tile === 'T') {
        const tentacleSprite = store.sprites.T;
        if (tentacleSprite && tentacleSprite.naturalWidth > 0) {
            // Usar frame de standby (frame 0) para la paleta
            const frameIndex = 0;
            
            // Calcular posición en la grilla 6x5 (frames de 60x120)
            const frameWidth = 60;  // Ancho de cada frame
            const frameHeight = 120; // Alto de cada frame
            const framesPerRow = 6;   // Frames por fila
            
            const row = Math.floor(frameIndex / framesPerRow);
            const col = frameIndex % framesPerRow;
            
            const sourceX = col * frameWidth;
            const sourceY = row * frameHeight;
            
            // Escalar para que quepa en el canvas de la paleta
            const scaleX = canvas.width / frameWidth;
            const scaleY = canvas.height / frameHeight;
            const scale = Math.min(scaleX, scaleY);
            const scaledWidth = frameWidth * scale;
            const scaledHeight = frameHeight * scale;
            const offsetX = (canvas.width - scaledWidth) / 2;
            const offsetY = (canvas.height - scaledHeight) / 2;
            
            ctx.drawImage(
                tentacleSprite,
                sourceX, sourceY, frameWidth, frameHeight,
                offsetX, offsetY, scaledWidth, scaledHeight
            );
        } else {
            // Fallback: rectángulo verde
            ctx.fillStyle = 'rgba(34, 139, 34, 0.8)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
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

    // Caso especial para la plataforma (usar sprite base.png)
    if (tile === 'A') {
        const baseSprite = store.sprites.base;
        console.log('Dibujando plataforma en paleta:', {
            tile,
            baseSprite,
            naturalWidth: baseSprite?.naturalWidth,
            naturalHeight: baseSprite?.naturalHeight,
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
        });
        
        // Intentar cargar el sprite si no está disponible
        if (!baseSprite || baseSprite.naturalWidth === 0) {
            const baseSrc = SPRITE_SOURCES.base;
            if (baseSrc) {
                const img = new Image();
                img.onload = () => {
                    store.sprites.base = img;
                    console.log('Sprite base cargado dinámicamente:', img);
                    // Redibujar este tile específico
                    drawPaletteEntry(store, tile, canvas, timestamp);
                };
                img.src = baseSrc;
            }
        }
        
        if (baseSprite && baseSprite.naturalWidth > 0) {
            // Centrar la plataforma en el canvas de la paleta
            const scaleX = canvas.width / 60; // 60px es el ancho del sprite
            const scaleY = canvas.height / 15; // 15px es la altura del sprite
            const scale = Math.min(scaleX, scaleY); // Mantener proporción
            const scaledWidth = 60 * scale;
            const scaledHeight = 15 * scale;
            const offsetX = (canvas.width - scaledWidth) / 2;
            const offsetY = (canvas.height - scaledHeight) / 2;
            
            ctx.drawImage(
                baseSprite,
                0,
                0,
                60,
                15,
                offsetX,
                offsetY,
                scaledWidth,
                scaledHeight
            );
        } else {
            // Fallback al rectángulo amarillo si no se ha cargado el sprite
            console.log('Usando fallback amarillo para plataforma');
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
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

/**
 * Mapeo de códigos de avatar a tiles del juego
 */
const AVATAR_TO_TILE: Record<string, string> = {
    'P': 'P',      // Player
    '8': '8',      // Bat (Murciélago)
    'S': 'S',      // Spider (Araña)
    'V': 'V',      // Viper (Víbora)
    'T': 'T',      // Tentacle (Tentáculo)
    '9': '9'       // Miner (Minero)
};

/**
 * Dibuja un avatar usando el sprite del personaje correspondiente
 * @param store - Store del juego
 * @param avatarCode - Código del avatar ('P', '8', 'S', 'V', 'T', '9')
 * @param canvas - Canvas donde dibujar el avatar
 * @param timestamp - Timestamp para animaciones
 */
const drawAvatar = (store: GameStore, avatarCode: string, canvas: HTMLCanvasElement, timestamp: number) => {
    const tile = AVATAR_TO_TILE[avatarCode] || 'P';
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Usar drawPaletteEntry para dibujar el sprite
    drawPaletteEntry(store, tile, canvas, timestamp);
};

// Canvas de avatares para animación
const avatarCanvases: Array<{ code: string; canvas: HTMLCanvasElement }> = [];

const startPaletteAnimation = (store: GameStore) => {
    const animate = (timestamp: number) => {
        paletteEntries.forEach(entry => drawPaletteEntry(store, entry.tile, entry.canvas, timestamp));
        // Animar avatares también
        avatarCanvases.forEach(entry => drawAvatar(store, entry.code, entry.canvas, timestamp));
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
    
    // Asegurar que el sprite base se cargue antes de dibujar la paleta
    if (!store.sprites.base) {
        const baseSrc = SPRITE_SOURCES.base;
        console.log('Cargando sprite base:', baseSrc);
        if (baseSrc) {
            const img = new Image();
            img.onload = () => {
                console.log('Sprite base cargado:', img);
                store.sprites.base = img;
                // Redibujar la paleta cuando se cargue el sprite
                setTimeout(() => {
                    populatePalette(store);
                }, 100);
            };
            img.onerror = (error) => {
                console.error('Error cargando sprite base:', error);
            };
            img.src = baseSrc;
            return; // Salir temprano hasta que se cargue
        }
    }
    
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
        preview.height = TILE_SIZE * (key === 'P' || key === 'T' ? 2 : 1);
        preview.className = 'tile-preview';

        if (key === '0') {
            tileDiv.classList.add('eraser-tile');
        }
        
        // Para todos los tiles (incluyendo el vacío), usar drawPaletteEntry
        if (key === 'P' || key === 'L' || key === '0' || key === '9' || key === 'T') {
            drawPaletteEntry(store, key, preview, performance.now());
            if (key === '9' || key === 'T') {
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
            if (key === 'A') {
                // Usar drawPaletteEntry para dibujar el sprite base.png
                drawPaletteEntry(store, key, preview, performance.now());
                paletteEntries.push({ tile: key, canvas: preview });
            } else if (key === 'H' || key === 'J') {
                // Dibujo manual para paredes aplastantes con color configurado
                const ctx = preview.getContext('2d');
                if (ctx) {
                    const config = store.crushingWallConfig || { speed: 1.5, color: '#cc0000' };
                    ctx.clearRect(0, 0, preview.width, preview.height);
                    ctx.fillStyle = config.color;
                    ctx.fillRect(0, 0, preview.width, preview.height);
                }
            } else {
                drawPaletteEntry(store, key, preview, performance.now());
                paletteEntries.push({ tile: key, canvas: preview });
            }
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
            
            // Desactivar modos de duplicar/eliminar fila cuando se selecciona un tile de la paleta
            if (store.duplicateRowMode) {
                store.duplicateRowMode = false;
                if (store.dom.canvas) {
                    store.dom.canvas.style.cursor = 'default';
                }
            }
            if (store.deleteRowMode) {
                store.deleteRowMode = false;
                if (store.dom.canvas) {
                    store.dom.canvas.style.cursor = 'default';
                }
            }
        });
        
        return tileDiv;
    };
    
    // Organizar tiles por categorías
    const categories = [
        {
            name: t('editor.palette.categories.characters'),
            nameKey: 'characters',
            tiles: [
                { key: 'P', nameKey: 'player' },
                { key: '9', nameKey: 'miner' }
            ]
        },
        {
            name: t('editor.palette.categories.terrain'),
            nameKey: 'terrain',
            tiles: [
                { key: '0', nameKey: 'empty' },
                { key: '1', nameKey: 'wall' },
                { key: '2', nameKey: 'water' }
            ]
        },
        {
            name: t('editor.palette.categories.elements'),
            nameKey: 'elements',
            tiles: [
                { key: 'C', nameKey: 'column' },
                { key: 'K', nameKey: 'lavaColumn' },
                { key: '3', nameKey: 'lava' },
                { key: 'L', nameKey: 'light' },
                { key: 'A', nameKey: 'platform' }
            ]
        },
        {
            name: t('editor.palette.categories.crushingWalls'),
            nameKey: 'crushingWalls',
            tiles: [
                { key: 'H', nameKey: 'wallLeft' },
                { key: 'J', nameKey: 'wallRight' }
            ]
        },
        {
            name: t('editor.palette.categories.enemies'),
            nameKey: 'enemies',
            tiles: [
                { key: '8', nameKey: 'bat' },
                { key: 'S', nameKey: 'spider' },
                { key: 'V', nameKey: 'snake' },
                { key: 'T', nameKey: 'tentacle' }
            ]
        }
    ];
    
    // Crear estructura de categorías (colapsables)
    categories.forEach(category => {
        // Crear sección de categoría
        const categorySection = document.createElement('div');
        categorySection.className = 'tile-category';
        
        // Crear encabezado con flecha (mismo estilo que sección Edición)
        const categoryHeader = document.createElement('button');
        categoryHeader.type = 'button';
        categoryHeader.className = 'w-full text-left flex items-center justify-between px-2 py-1 border-2 border-[#666] bg-gray-700';
        const headerText = document.createElement('span');
        headerText.textContent = category.name;
        const headerArrow = document.createElement('span');
        headerArrow.textContent = '▼'; // Mismo icono que Edición
        categoryHeader.appendChild(headerText);
        categoryHeader.appendChild(headerArrow);
        categorySection.appendChild(categoryHeader);
        
        // Crear grid de tiles
        const tilesGrid = document.createElement('div');
        tilesGrid.className = 'tile-category-grid';
        tilesGrid.style.cssText = 'display:grid; grid-template-columns:repeat(2,1fr); gap:2px; padding:0px; border:1px solid #444;';
        
        // Agregar tiles
        category.tiles.forEach(({ key, nameKey }) => {
            const tileData = TILE_TYPES[key];
            if (tileData) {
                const tileName = t(`editor.palette.tiles.${nameKey}`);
                const tileButton = createTileButton(key, tileName);
                tilesGrid.appendChild(tileButton);
            }
        });
        
        categorySection.appendChild(tilesGrid);
        
        // Si es la categoría de Paredes Aplastantes, agregar controles de configuración
        if (category.nameKey === 'crushingWalls') {
            const configSection = document.createElement('div');
            configSection.className = 'crushing-wall-controls';
            configSection.style.cssText = 'padding: 10px; border-top: 1px solid #444; margin-top: 8px;';
            
            // Control de velocidad
            const speedLabel = document.createElement('label');
            speedLabel.style.cssText = 'display: block; font-size: 11px; margin-bottom: 4px; color: #ccc;';
            speedLabel.textContent = `${t('editor.speed')}:`;
            
            const speedContainer = document.createElement('div');
            speedContainer.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 12px;';
            
            const speedInput = document.createElement('input');
            speedInput.type = 'range';
            speedInput.id = 'wall-speed-palette';
            speedInput.min = '0.5';
            speedInput.max = '5';
            speedInput.step = '0.5';
            speedInput.value = (store.crushingWallConfig?.speed || 1.5).toString();
            speedInput.style.cssText = 'flex: 1;';
            
            const speedValue = document.createElement('span');
            speedValue.id = 'wall-speed-value-palette';
            speedValue.textContent = speedInput.value;
            speedValue.style.cssText = 'font-size: 11px; color: #fff; min-width: 30px;';
            
            speedContainer.appendChild(speedInput);
            speedContainer.appendChild(speedValue);
            
            // Control de color
            const colorLabel = document.createElement('label');
            colorLabel.style.cssText = 'display: block; font-size: 11px; margin-bottom: 4px; color: #ccc;';
            colorLabel.textContent = `${t('editor.color')}:`;
            
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.id = 'wall-color-palette';
            colorInput.value = store.crushingWallConfig?.color || '#cc0000';
            colorInput.style.cssText = 'width: 100%; height: 32px; border: 2px solid #fff; cursor: pointer;';
            
            configSection.appendChild(speedLabel);
            configSection.appendChild(speedContainer);
            configSection.appendChild(colorLabel);
            configSection.appendChild(colorInput);
            
            categorySection.appendChild(configSection);
            
            // Toggle colapso encabezado (afecta grid + config)
            categoryHeader.addEventListener('click', () => {
                const isHidden = tilesGrid.style.display === 'none';
                tilesGrid.style.display = isHidden ? 'grid' : 'none';
                configSection.style.display = isHidden ? 'block' : 'none';
                headerArrow.textContent = isHidden ? '▼' : '▶';
            });
        }
        
        // Para otras categorías, el header toggle solo afecta el grid
        if (category.nameKey !== 'crushingWalls') {
            categoryHeader.addEventListener('click', () => {
                const isHidden = tilesGrid.style.display === 'none';
                tilesGrid.style.display = isHidden ? 'grid' : 'none';
                headerArrow.textContent = isHidden ? '▼' : '▶';
            });
        }
        
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
    const totalLevels = store.levelDataStore.length;
    for (let i = 0; i < totalLevels; i++) {
        const option = document.createElement('option');
        option.value = `${i}`;
        option.textContent = `${t('editor.levelNumber')} ${i + 1}`;
        levelSelectorEl.appendChild(option);
    }
    
    // Sincronizar selector mobile
    const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
    if (levelSelectorMobile) {
        levelSelectorMobile.innerHTML = levelSelectorEl.innerHTML;
        levelSelectorMobile.value = levelSelectorEl.value;
    }
};


export const setupUI = (store: GameStore) => {
    attachDomReferences(store);
    syncLevelSelector(store);
    setupLevelData(store);
    setupMenuButtons(store);
    setupGallery(store);
    setupKeyboardShortcuts(store);
    
    // Configurar zoom con pinch en mobile
    setupPinchZoom(store);
    // Netlify Identity: cerrar modal y continuar a editor tras login
    try {
        const ni: any = (window as any).netlifyIdentity;
        if (ni) {
            // Verificar si ya hay un usuario logueado al cargar
            const currentUser = ni.currentUser();
            if (currentUser && currentUser.email) {
                const username = currentUser.email.split('@')[0];
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', username);
                // Cargar niveles del usuario si ya está logueado
                tryLoadUserLevels(store);
            }
            
            const afterAuth = async (user: any) => {
                if (user && user.email) {
                    const username = user.email.split('@')[0];
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    // Actualizar botones y área de usuario
                    const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
                    if (levelEditorBtn) {
                        levelEditorBtn.textContent = t('menu.editor');
                    }
                    // Cargar niveles del usuario después de iniciar sesión
                    await tryLoadUserLevels(store);
                    if (store.appState === 'menu') {
                        startEditor(store);
                    }
                }
                try { ni.close(); } catch {}
            };
            ni.on('login', afterAuth);
            ni.on('signup', afterAuth);
            
            // Escuchar cuando se cierre sesión
            ni.on('logout', () => {
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('username');
                const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
                if (levelEditorBtn) {
                    levelEditorBtn.textContent = t('menu.login');
                }
            });
        }
    } catch {}
    preloadAssets(store, () => {
        populatePalette(store);
        showMenu(store);
        // Intentar cargar niveles del usuario si está logueado
        tryLoadUserLevels(store);
        // Configurar modal de campañas
        import('./campaigns-ui').then(({ setupCampaignsModal }) => {
            setupCampaignsModal(store);
        });
        requestAnimationFrame(() => {
            const ctx = store.dom.ctx;
            if (ctx && store.dom.canvas) {
                ctx.clearRect(0, 0, store.dom.canvas.width, store.dom.canvas.height);
            }
        });
    });
};

// Cargar niveles personalizados del usuario si está autenticado
// IMPORTANTE: Los niveles originales siempre se sirven desde levels.json
// Esta función solo carga niveles personalizados adicionales, NO sobrescribe los originales
export const tryLoadUserLevels = async (store: GameStore) => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        // Intentar cargar desde localStorage como respaldo (solo niveles personalizados)
        const savedLevels = localStorage.getItem('userLevels');
        if (savedLevels) {
            try {
                const data = JSON.parse(savedLevels);
                if (data && data.levels && Array.isArray(data.levels)) {
                    // Los niveles originales ya están en store desde levels.json
                    // Solo agregar niveles personalizados adicionales
                    const originalCount = store.initialLevels.length;
                    const customLevels = data.levels.slice(originalCount);
                    
                    if (customLevels.length > 0) {
                        const customLevelDataStore = customLevels.map((lvl: any) => 
                            typeof lvl[0] === 'string' ? lvl.map((row: string) => row.split('')) : lvl
                        ) as string[][][];
                        const customLevelDesigns = customLevels.map((lvl: any) => 
                            typeof lvl[0] === 'string' ? lvl : (lvl as string[][]).map((row: string[]) => row.join(''))
                        ) as string[][];
                        
                        // Agregar niveles personalizados después de los originales
                        store.levelDataStore = [...store.levelDataStore, ...customLevelDataStore];
                        store.levelDesigns = [...store.levelDesigns, ...customLevelDesigns];
                        store.initialLevels = [...store.initialLevels, ...customLevelDesigns];
                        
                        syncLevelSelector(store);
                        console.log('Niveles personalizados cargados desde localStorage:', customLevels.length);
                    }
                }
            } catch (e) {
                console.error('Error cargando niveles desde localStorage:', e);
            }
        }
        return;
    }

    try {
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        if (!user) {
            console.warn('Usuario no encontrado en Netlify Identity');
            // Aún así, cargar campañas del servidor si existen
            const { loadCampaignsFromServer } = await import('../utils/campaigns');
            await loadCampaignsFromServer(store);
            return;
        }
        
        let token: string | null = null;
        try {
            token = await user.jwt();
        } catch (error) {
            console.error('Error obteniendo token:', error);
            return;
        }

        if (!token) {
            console.warn('No se pudo obtener el token JWT');
            return;
        }

        // IMPORTANTE: Los niveles originales siempre vienen de levels.json
        // Solo cargar niveles personalizados adicionales de la BD
        // Los niveles originales en store.initialLevels NO deben ser sobrescritos
        
        // Cargar campañas del servidor (esto puede eliminar campañas originales si existen)
        const { loadCampaignsFromServer } = await import('../utils/campaigns');
        await loadCampaignsFromServer(store);
        
        // Intentar cargar niveles personalizados adicionales de la BD
        // Usar URL completa en Android/Capacitor, relativa en web
        const baseUrl = getNetlifyBaseUrl();
        const res = await fetch(`${baseUrl}/.netlify/functions/levels`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        
        if (!res.ok) {
            console.log('No hay niveles personalizados en la base de datos o error al cargar');
            return;
        }
        
        const data = await res.json();
        console.log('Datos recibidos de la base de datos:', data);
        
        // El payload guardado puede tener formato chunked o legacy
        let levelsToLoad: string[][] = [];
        
        if (data && data.format === 'chunks20x18' && Array.isArray(data.levels)) {
            // Formato chunked - expandir
            console.log('Detectado formato chunked, expandiendo...');
            const { expandChunkedLevels } = await import('../utils/levels');
            levelsToLoad = expandChunkedLevels(data);
            console.log('Niveles expandidos:', levelsToLoad.length);
        } else if (data && data.levels && Array.isArray(data.levels)) {
            // Legacy format - niveles como array de strings
            console.log('Detectado formato legacy');
            levelsToLoad = data.levels.map((lvl: any) => 
                typeof lvl[0] === 'string' ? lvl : (lvl as string[][]).map((row: string[]) => row.join(''))
            ) as string[][];
        } else if (Array.isArray(data)) {
            // Formato directo array
            console.log('Detectado formato directo array');
            levelsToLoad = data.map((lvl: any) => 
                typeof lvl[0] === 'string' ? lvl : (lvl as string[][]).map((row: string[]) => row.join(''))
            ) as string[][];
        } else {
            console.warn('Formato de datos desconocido:', data);
        }
        
        // IMPORTANTE: Los niveles originales ya están en store desde levels.json
        // Solo agregar niveles personalizados adicionales que estén después de los originales
        const originalCount = store.initialLevels.length;
        if (levelsToLoad.length > originalCount) {
            const customLevels = levelsToLoad.slice(originalCount);
            
            const customLevelDataStore = customLevels.map((lvl: string[]) => 
                typeof lvl[0] === 'string' ? lvl.map((row: string) => row.split('')) : (lvl as any)
            ) as string[][][];
            const customLevelDesigns = JSON.parse(JSON.stringify(customLevels));
            
            // Agregar niveles personalizados después de los originales
            store.levelDataStore = [...store.levelDataStore, ...customLevelDataStore];
            store.levelDesigns = [...store.levelDesigns, ...customLevelDesigns];
            store.initialLevels = [...store.initialLevels, ...customLevelDesigns];
            
            syncLevelSelector(store);
            console.log('Niveles personalizados cargados desde la cuenta del usuario:', customLevels.length);
        } else {
            console.log('No hay niveles personalizados adicionales en la base de datos');
        }
    } catch (error) {
        console.error('Error cargando niveles del usuario:', error);
    }
};

/**
 * Configura el modal de configuración del juego
 * 
 * Maneja:
 * - Control de volumen de música y efectos
 * - Configuración de efectos gráficos (scanline, glow, brightness, contrast, vignette)
 * - Persistencia en localStorage
 * 
 * @param store - Estado global del juego
 */
const setupSettingsModal = (store: GameStore) => {
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseBtn = document.getElementById('settings-close-btn') as HTMLButtonElement | null;
    
    // Sliders de volumen
    const musicVolumeSlider = document.getElementById('music-volume-slider') as HTMLInputElement | null;
    const sfxVolumeSlider = document.getElementById('sfx-volume-slider') as HTMLInputElement | null;
    const musicVolumeValue = document.getElementById('music-volume-value') as HTMLElement | null;
    const sfxVolumeValue = document.getElementById('sfx-volume-value') as HTMLElement | null;
    
    // Toggle de mute
    const muteToggle = document.getElementById('mute-toggle') as HTMLInputElement | null;
    const muteStatus = document.getElementById('mute-status') as HTMLElement | null;
    
    // Toggles de gráficos
    const scanlineToggle = document.getElementById('scanline-toggle') as HTMLInputElement | null;
    const glowToggle = document.getElementById('glow-toggle') as HTMLInputElement | null;
    const brightnessToggle = document.getElementById('brightness-toggle') as HTMLInputElement | null;
    const contrastToggle = document.getElementById('contrast-toggle') as HTMLInputElement | null;
    const vignetteToggle = document.getElementById('vignette-toggle') as HTMLInputElement | null;
    const blurToggle = document.getElementById('blur-toggle') as HTMLInputElement | null;
    const fpsToggle = document.getElementById('fps-toggle') as HTMLInputElement | null;
    const mobileFullWidthToggle = document.getElementById('mobile-fullwidth-toggle') as HTMLInputElement | null;
    const mobileFullWidthOption = document.getElementById('mobile-fullwidth-option') as HTMLElement | null;
    const mobileControlsSettings = document.getElementById('mobile-controls-settings') as HTMLElement | null;
    const controlModeSelector = document.getElementById('control-mode-selector') as HTMLSelectElement | null;
    const languageSelector = document.getElementById('language-selector') as HTMLSelectElement | null;
    
    // Mostrar/ocultar opción de fullwidth solo en mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth <= 1024;
    if (mobileFullWidthOption) {
        mobileFullWidthOption.classList.toggle('hidden', !isMobile);
    }
    if (mobileControlsSettings) {
        mobileControlsSettings.style.display = isMobile ? 'block' : 'none';
    }
    
    if (!settingsModal) return;
    
    // Configurar selector de modo de control
    if (controlModeSelector) {
        controlModeSelector.value = store.settings.controls.mobileMode;
        
        controlModeSelector.addEventListener('change', (e) => {
            const newMode = (e.target as HTMLSelectElement).value as ControlMode;
            store.settings.controls.mobileMode = newMode;
            saveSettingsWithLanguage(store.settings);
            
            // Aplicar el nuevo modo si estamos en juego
            if (store.appState === 'playing') {
                applyControlMode(store, newMode);
            }
        });
    }
    
    // Configurar selector de idioma
    if (languageSelector) {
        const currentLang = (store.settings as any).language || getCurrentLanguage();
        languageSelector.value = currentLang;
        
        languageSelector.addEventListener('change', (e) => {
            const newLang = (e.target as HTMLSelectElement).value as Language;
            setLanguage(newLang);
            (store.settings as any).language = newLang;
            saveSettings({ ...store.settings, language: newLang } as any);
            updateAllTexts(store);
        });
    }
    
    // Cerrar modal
    const closeModal = () => {
        settingsModal.classList.add('hidden');
    };
    
    settingsCloseBtn?.addEventListener('click', closeModal);
    
    // Cerrar al hacer click fuera del modal
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            closeModal();
        }
    });
    
    // Actualizar volumen de música
    musicVolumeSlider?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (musicVolumeValue) {
            musicVolumeValue.textContent = `${value}%`;
        }
        
        const volume = value / 100;
        store.settings.audio.musicVolume = volume;
        setMusicVolume(volume);
        saveSettingsWithLanguage(store.settings);
    });
    
    // Actualizar volumen de efectos
    sfxVolumeSlider?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (sfxVolumeValue) {
            sfxVolumeValue.textContent = `${value}%`;
        }
        
        const volume = value / 100;
        store.settings.audio.sfxVolume = volume;
        setSFXVolume(volume);
        saveSettingsWithLanguage(store.settings);
    });
    
    // Toggle de mute
    muteToggle?.addEventListener('change', (e) => {
        const isMuted = !(e.target as HTMLInputElement).checked; // Checked = ON, !checked = OFF (muted)
        toggleMute();
        
        // Actualizar estado visual
        if (muteStatus) {
            const audioState = getAudioState();
            muteStatus.textContent = audioState.isMuted ? t('settings.soundOff') : t('settings.soundOn');
        }
    });
    
    // Toggles de gráficos
    scanlineToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.scanline = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings);
    });
    
    glowToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.glow = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings);
    });
    
    brightnessToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.brightness = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings);
    });
    
    contrastToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.contrast = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings);
    });
    
    vignetteToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.vignette = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings);
    });
    
    blurToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        // Detectar si es mobile para usar el valor apropiado
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                         (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
        // Si se activa, poner blur a 0.7 en mobile o 1.5 en desktop, si se desactiva, poner a 0
        store.settings.graphics.blur = enabled ? (isMobile ? 0.7 : 1.5) : 0;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings);
    });
    
    fpsToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.showFps = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings);
    });
    
    mobileFullWidthToggle?.addEventListener('change', (e) => {
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.mobileFullWidth = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings);
    });
};

/**
 * Actualiza la UI del modal de configuración con los valores actuales
 */
const updateSettingsUI = (store: GameStore) => {
    const musicVolumeSlider = document.getElementById('music-volume-slider') as HTMLInputElement | null;
    const sfxVolumeSlider = document.getElementById('sfx-volume-slider') as HTMLInputElement | null;
    const musicVolumeValue = document.getElementById('music-volume-value') as HTMLElement | null;
    const sfxVolumeValue = document.getElementById('sfx-volume-value') as HTMLElement | null;
    
    const muteToggle = document.getElementById('mute-toggle') as HTMLInputElement | null;
    const muteStatus = document.getElementById('mute-status') as HTMLElement | null;
    
    const scanlineToggle = document.getElementById('scanline-toggle') as HTMLInputElement | null;
    const glowToggle = document.getElementById('glow-toggle') as HTMLInputElement | null;
    const brightnessToggle = document.getElementById('brightness-toggle') as HTMLInputElement | null;
    const contrastToggle = document.getElementById('contrast-toggle') as HTMLInputElement | null;
    const vignetteToggle = document.getElementById('vignette-toggle') as HTMLInputElement | null;
    const blurToggle = document.getElementById('blur-toggle') as HTMLInputElement | null;
    const fpsToggle = document.getElementById('fps-toggle') as HTMLInputElement | null;
    const mobileFullWidthToggle = document.getElementById('mobile-fullwidth-toggle') as HTMLInputElement | null;
    const mobileFullWidthOption = document.getElementById('mobile-fullwidth-option') as HTMLElement | null;
    
    // Mostrar/ocultar opción de fullwidth solo en mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     window.innerWidth <= 1024;
    if (mobileFullWidthOption) {
        mobileFullWidthOption.classList.toggle('hidden', !isMobile);
    }
    
    // Mostrar/ocultar sección de controles solo en mobile
    const mobileControlsSettings = document.getElementById('mobile-controls-settings') as HTMLElement | null;
    if (mobileControlsSettings) {
        mobileControlsSettings.style.display = isMobile ? 'block' : 'none';
    }
    
    // Actualizar sliders de audio
    const musicVolumePercent = Math.round(store.settings.audio.musicVolume * 100);
    if (musicVolumeSlider) musicVolumeSlider.value = musicVolumePercent.toString();
    if (musicVolumeValue) musicVolumeValue.textContent = `${musicVolumePercent}%`;
    
    const sfxVolumePercent = Math.round(store.settings.audio.sfxVolume * 100);
    if (sfxVolumeSlider) sfxVolumeSlider.value = sfxVolumePercent.toString();
    if (sfxVolumeValue) sfxVolumeValue.textContent = `${sfxVolumePercent}%`;
    
    // Actualizar toggle de mute
    const audioState = getAudioState();
    if (muteToggle) muteToggle.checked = !audioState.isMuted; // Checked = ON, !checked = OFF
    if (muteStatus) muteStatus.textContent = audioState.isMuted ? t('settings.soundOff') : t('settings.soundOn');
    
    // Actualizar toggles de gráficos
    if (scanlineToggle) scanlineToggle.checked = store.settings.graphics.scanline;
    if (glowToggle) glowToggle.checked = store.settings.graphics.glow;
    if (brightnessToggle) brightnessToggle.checked = store.settings.graphics.brightness;
    if (contrastToggle) contrastToggle.checked = store.settings.graphics.contrast;
    if (vignetteToggle) vignetteToggle.checked = store.settings.graphics.vignette;
    if (blurToggle) blurToggle.checked = store.settings.graphics.blur > 0;
    if (fpsToggle) fpsToggle.checked = store.settings.graphics.showFps;
    if (mobileFullWidthToggle) mobileFullWidthToggle.checked = store.settings.graphics.mobileFullWidth ?? false;
    
    // Actualizar selector de idioma
    const languageSelector = document.getElementById('language-selector') as HTMLSelectElement | null;
    if (languageSelector) {
        languageSelector.value = (store.settings as any).language || getCurrentLanguage();
    }
    
    // Actualizar selector de modo de control
    const controlModeSelector = document.getElementById('control-mode-selector') as HTMLSelectElement | null;
    if (controlModeSelector) {
        controlModeSelector.value = store.settings.controls.mobileMode;
    }
};

/**
 * Actualiza todos los textos del juego según el idioma actual
 */
const updateAllTexts = (store: GameStore) => {
    updateEditorTexts(store);
    // Menú principal
    const startGameBtn = document.getElementById('start-game-btn') as HTMLButtonElement | null;
    const galleryBtn = document.getElementById('gallery-btn') as HTMLButtonElement | null;
    const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
    const creditsBtn = document.getElementById('credits-btn') as HTMLButtonElement | null;
    const retryBtn = document.getElementById('retry-btn') as HTMLButtonElement | null;
    
    if (startGameBtn) startGameBtn.textContent = t('menu.play');
    if (galleryBtn) galleryBtn.textContent = t('menu.gallery');
    if (levelEditorBtn) {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        levelEditorBtn.textContent = isLoggedIn ? t('menu.editor') : t('menu.login');
    }
    if (creditsBtn) creditsBtn.textContent = t('menu.credits');
    if (retryBtn) retryBtn.textContent = t('game.retry');
    
    // Botón de configuración en menú hamburger
    const hamburgerSettingsBtn = document.getElementById('hamburger-settings-btn') as HTMLButtonElement | null;
    if (hamburgerSettingsBtn) hamburgerSettingsBtn.textContent = t('game.settings');
    
    // Botones de instalación y Play Store
    const installPwaBtn = document.getElementById('install-pwa-btn') as HTMLButtonElement | null;
    const playStoreBtn = document.getElementById('play-store-btn') as HTMLButtonElement | null;
    if (installPwaBtn) installPwaBtn.textContent = `📱 ${t('menu.installPWA')}`;
    if (playStoreBtn) playStoreBtn.textContent = `📲 ${t('menu.playStore')} (${t('menu.playStoreComingSoon')})`;
    
    // Actualizar botones de idioma (banderas) - solo visible en menú
    const langEsBtn = document.getElementById('lang-es-btn');
    const langEnBtn = document.getElementById('lang-en-btn');
    const langCaBtn = document.getElementById('lang-ca-btn');
    const currentLang = getCurrentLanguage();
    if (langEsBtn && langEnBtn && langCaBtn) {
        // Resetear todos los botones
        [langEsBtn, langEnBtn, langCaBtn].forEach(btn => {
            btn.classList.remove('is-primary', 'active', 'is-disabled');
        });
        
        // Activar el botón del idioma actual
        if (currentLang === 'es') {
            langEsBtn.classList.add('is-primary', 'active');
            langEnBtn.classList.add('is-disabled');
            langCaBtn.classList.add('is-disabled');
        } else if (currentLang === 'en') {
            langEnBtn.classList.add('is-primary', 'active');
            langEsBtn.classList.add('is-disabled');
            langCaBtn.classList.add('is-disabled');
        } else if (currentLang === 'ca') {
            langCaBtn.classList.add('is-primary', 'active');
            langEsBtn.classList.add('is-disabled');
            langEnBtn.classList.add('is-disabled');
        }
    }
    
    // Mensajes del juego
    const messageText = document.getElementById('message-text');
    if (messageText) messageText.innerHTML = t('messages.pressEnter');
    
    // Game Over Modal
    const gameoverTitle = document.getElementById('gameover-title');
    const gameoverScore = document.getElementById('gameover-score');
    const gameoverRetryBtn = document.getElementById('gameover-retry-btn');
    const gameoverMenuBtn = document.getElementById('gameover-menu-btn');
    
    if (gameoverTitle) gameoverTitle.textContent = t('game.gameOver');
    if (gameoverScore) {
        const scoreValue = document.getElementById('gameover-score-value')?.textContent || '0';
        gameoverScore.innerHTML = `${t('game.finalScore')}: <span id="gameover-score-value" class="text-yellow-400">${scoreValue}</span>`;
    }
    if (gameoverRetryBtn) gameoverRetryBtn.textContent = t('game.retry');
    if (gameoverMenuBtn) gameoverMenuBtn.textContent = t('game.mainMenu');
    
    // Modal de configuración
    const settingsTitle = document.querySelector('#settings-modal .title');
    const settingsLanguageTitle = document.getElementById('settings-language-title');
    const settingsLanguageLabel = document.getElementById('settings-language-label');
    const settingsCloseBtn = document.getElementById('settings-close-btn');
    
    if (settingsTitle) settingsTitle.textContent = t('settings.title');
    if (settingsLanguageTitle) settingsLanguageTitle.textContent = t('settings.language');
    if (settingsLanguageLabel) settingsLanguageLabel.textContent = `${t('settings.language')}:`;
    if (settingsCloseBtn) settingsCloseBtn.textContent = t('modals.close');
    
    // Actualizar labels de configuración
    updateSettingsLabels();
    
    // Editor (incluye paleta)
    updateEditorTexts(store);
    // Actualizar paleta si el editor está activo
    if (store.appState === 'editing' && store.dom.ui.paletteEl) {
        populatePalette(store);
    }
    
    // Usuario
    updateUserTexts();
    
    // Modales
    updateModalsTexts();
    
    // Modal de pausa
    updatePauseMenuTexts();
    
    // Modal de autenticación
    updateAuthModalTexts();
    
    // Créditos
    updateCreditsTexts();
};

/**
 * Actualiza los labels de configuración
 */
const updateSettingsLabels = () => {
    // Título del modal
    const settingsModalTitle = document.getElementById('settings-modal-title');
    if (settingsModalTitle) settingsModalTitle.textContent = t('settings.title');
    
    // Audio
    const soundTitle = document.getElementById('settings-sound-title');
    const musicVolumeLabel = document.getElementById('settings-music-volume-label');
    const sfxVolumeLabel = document.getElementById('settings-sfx-volume-label');
    const soundStatusLabel = document.getElementById('settings-sound-status-label');
    
    if (soundTitle) soundTitle.textContent = t('settings.sound');
    if (musicVolumeLabel) musicVolumeLabel.textContent = `${t('settings.musicVolume')}:`;
    if (sfxVolumeLabel) sfxVolumeLabel.textContent = `${t('settings.sfxVolume')}:`;
    if (soundStatusLabel) soundStatusLabel.textContent = `${t('settings.soundStatus')}:`;
    
    // Gráficos
    const graphicsTitle = document.getElementById('settings-graphics-title');
    const graphicsDesc = document.getElementById('settings-graphics-desc');
    
    if (graphicsTitle) graphicsTitle.textContent = t('settings.graphics');
    if (graphicsDesc) graphicsDesc.textContent = t('settings.scanlineDesc');
    
    // Labels de efectos gráficos
    const scanlineLabel = document.querySelector('label[for="scanline-toggle"]');
    const glowLabel = document.querySelector('label[for="glow-toggle"]');
    const brightnessLabel = document.querySelector('label[for="brightness-toggle"]');
    const contrastLabel = document.querySelector('label[for="contrast-toggle"]');
    const vignetteLabel = document.querySelector('label[for="vignette-toggle"]');
    const blurLabel = document.querySelector('label[for="blur-toggle"]');
    const fpsLabel = document.querySelector('label[for="fps-toggle"]');
    const mobileFullWidthLabel = document.querySelector('label[for="mobile-fullwidth-toggle"]');
    
    if (scanlineLabel) scanlineLabel.textContent = `${t('settings.scanline')}:`;
    if (glowLabel) glowLabel.textContent = `${t('settings.glow')}:`;
    if (brightnessLabel) brightnessLabel.textContent = `${t('settings.brightness')}:`;
    if (contrastLabel) contrastLabel.textContent = `${t('settings.contrast')}:`;
    if (vignetteLabel) vignetteLabel.textContent = `${t('settings.vignette')}:`;
    if (blurLabel) blurLabel.textContent = `${t('settings.blur')}:`;
    if (fpsLabel) fpsLabel.textContent = `${t('settings.showFps')}:`;
    if (mobileFullWidthLabel) mobileFullWidthLabel.textContent = `${t('settings.mobileFullWidth')}:`;
    
    // Controles
    const controlsTitle = document.getElementById('settings-controls-title');
    const controlModeLabel = document.getElementById('settings-control-mode-label');
    const controlModeHybrid = document.getElementById('control-mode-hybrid');
    const controlModeOnehand = document.getElementById('control-mode-onehand');
    const controlModeVirtual = document.getElementById('control-mode-virtual');
    const controlModeFixed = document.getElementById('control-mode-fixed');
    
    if (controlsTitle) controlsTitle.textContent = t('settings.controls');
    if (controlModeLabel) controlModeLabel.textContent = `${t('settings.controlMode')}:`;
    if (controlModeHybrid) controlModeHybrid.textContent = t('settings.controlModeHybrid');
    if (controlModeOnehand) controlModeOnehand.textContent = t('settings.controlModeOnehand');
    if (controlModeVirtual) controlModeVirtual.textContent = t('settings.controlModeVirtual');
    if (controlModeFixed) controlModeFixed.textContent = t('settings.controlModeFixed');
};

/**
 * Actualiza los textos del editor
 */
export const updateEditorTexts = (store: GameStore) => {
    // Botones de volver al editor
    const resumeEditorBtnPanel = document.getElementById('resume-editor-btn-panel') as HTMLButtonElement | null;
    const resumeEditorBtnMenu = document.getElementById('resume-editor-btn-menu') as HTMLButtonElement | null;
    if (resumeEditorBtnPanel) resumeEditorBtnPanel.textContent = t('editor.backToEditor');
    if (resumeEditorBtnMenu) resumeEditorBtnMenu.textContent = t('editor.backToEditor');
    
    // Título del panel del editor
    const editorPanelTitle = document.querySelector('#editor-panel-title span:last-child');
    if (editorPanelTitle) editorPanelTitle.textContent = t('editor.tools');
    
    // Sección Edición
    const editSectionToggle = document.querySelector('#edit-section-toggle span:first-child');
    if (editSectionToggle) editSectionToggle.textContent = t('editor.edition');
    
    // Botones de edición
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const duplicateRowBtn = document.getElementById('duplicate-row-btn');
    const deleteRowBtn = document.getElementById('delete-row-btn');
    if (undoBtn) undoBtn.textContent = t('editor.undo');
    if (redoBtn) redoBtn.textContent = t('editor.redo');
    if (duplicateRowBtn) duplicateRowBtn.textContent = t('editor.duplicateRow');
    if (deleteRowBtn) deleteRowBtn.textContent = t('editor.deleteRow');
    
    // Label de sección Campañas
    const campaignsSectionLabel = document.getElementById('campaigns-section-label');
    if (campaignsSectionLabel) campaignsSectionLabel.textContent = `${t('campaigns.title')}:`;
    
    // Sección Niveles - Mostrar nombre de la campaña actual
    const levelsSectionToggle = document.querySelector('#levels-section-toggle span:first-child');
    const levelsSectionMobileTitle = document.querySelector('#user-panel h3.text-center');
    const campaignTitleBtn = document.getElementById('campaign-title-btn');
    
    // Obtener el nombre de la campaña actual (no del nivel, sino de la campaña seleccionada)
    import('../utils/campaigns').then(({ getCurrentCampaign }) => {
        const campaign = getCurrentCampaign(store);
        const campaignName = campaign 
            ? (campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name)
            : t('editor.levels');
        
        if (levelsSectionToggle) levelsSectionToggle.textContent = campaignName;
        if (levelsSectionMobileTitle) levelsSectionMobileTitle.textContent = campaignName.toUpperCase();
        if (campaignTitleBtn) campaignTitleBtn.textContent = campaignName.toUpperCase();
    }).catch(() => {
        // Fallback si hay error
        if (levelsSectionToggle) levelsSectionToggle.textContent = t('editor.levels');
        if (levelsSectionMobileTitle) levelsSectionMobileTitle.textContent = t('editor.levels').toUpperCase();
        if (campaignTitleBtn) campaignTitleBtn.textContent = t('editor.levels').toUpperCase();
    });
    
    // Botones de niveles (desktop)
    const addLevelBtn = document.getElementById('add-level-btn');
    const generateLevelBtn = document.getElementById('generate-level-btn');
    const saveAllBtn = document.getElementById('save-all-btn');
    const shareLevelBtn = document.getElementById('share-level-btn');
    const playTestBtn = document.getElementById('play-test-btn');
    const backToMenuBtn = document.getElementById('back-to-menu-btn');
    
    if (addLevelBtn) addLevelBtn.textContent = `➕ ${t('editor.newLevel')}`;
    if (generateLevelBtn) generateLevelBtn.textContent = t('editor.generateLevel');
    if (saveAllBtn) saveAllBtn.textContent = t('editor.saveToFile');
    if (shareLevelBtn) shareLevelBtn.textContent = `📤 ${t('editor.shareLevel')}`;
    if (playTestBtn) playTestBtn.textContent = t('editor.playTest');
    if (backToMenuBtn) backToMenuBtn.textContent = t('editor.backToMenu');
    
    // Botones de niveles (mobile)
    const addLevelBtnMobile = document.getElementById('add-level-btn-mobile');
    const generateLevelBtnMobile = document.getElementById('generate-level-btn-mobile');
    const saveAllBtnMobile = document.getElementById('save-all-btn-mobile');
    const shareLevelBtnMobile = document.getElementById('share-level-btn-mobile');
    const playTestBtnMobile = document.getElementById('play-test-btn-mobile');
    const backToMenuBtnMobile = document.getElementById('back-to-menu-btn-mobile');
    
    if (addLevelBtnMobile) addLevelBtnMobile.textContent = t('editor.newLevel');
    if (generateLevelBtnMobile) generateLevelBtnMobile.textContent = t('editor.generateLevel');
    if (saveAllBtnMobile) saveAllBtnMobile.textContent = t('editor.saveLevel');
    if (shareLevelBtnMobile) shareLevelBtnMobile.textContent = t('editor.shareLevel');
    if (playTestBtnMobile) playTestBtnMobile.textContent = t('editor.playLevel');
    if (backToMenuBtnMobile) backToMenuBtnMobile.textContent = t('modals.backToMainMenuTitle');
};

/**
 * Actualiza los textos del usuario
 */
const updateUserTexts = () => {
    // Botones de cerrar sesión
    const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement | null;
    const logoutBtnMobile = document.getElementById('logout-btn-mobile') as HTMLButtonElement | null;
    if (logoutBtn) logoutBtn.textContent = t('user.logout');
    if (logoutBtnMobile) logoutBtnMobile.textContent = t('user.logout');
    
    // Botones de perfil
    const userProfileBtn = document.getElementById('user-profile-btn') as HTMLButtonElement | null;
    const userProfileBtnMobile = document.getElementById('user-profile-btn-mobile') as HTMLButtonElement | null;
    if (userProfileBtn) userProfileBtn.textContent = t('user.myArea');
    if (userProfileBtnMobile) userProfileBtnMobile.textContent = `👤 ${t('user.myArea')}`;
    
    // Título del panel de usuario cuando no hay login
    const userPanelNickname = document.getElementById('user-panel-nickname');
    if (userPanelNickname && (userPanelNickname.textContent === 'user' || userPanelNickname.textContent === 'USUARIO')) {
        userPanelNickname.textContent = t('user.user');
    }
    
    // Toggle del panel de usuario
    const userPanelToggleTitle = document.querySelector('#user-panel-toggle .toggle-title');
    if (userPanelToggleTitle) userPanelToggleTitle.textContent = t('user.user');
    
    // Toggle del panel del editor
    const editorToggleTitle = document.querySelector('#editor-toggle .toggle-title');
    if (editorToggleTitle) editorToggleTitle.textContent = t('editor.tools');
    
    // Título del modal de perfil
    const profileModalTitle = document.querySelector('#profile-modal .title');
    if (profileModalTitle) profileModalTitle.textContent = t('user.profileTitle');
    
    // Botones del modal de perfil
    const profileSaveBtn = document.getElementById('profile-save-btn');
    const profileCancelBtn = document.getElementById('profile-cancel-btn');
    const profileAvatarBtn = document.getElementById('profile-avatar-btn');
    if (profileSaveBtn) profileSaveBtn.textContent = t('user.save');
    if (profileCancelBtn) profileCancelBtn.textContent = t('modals.cancel');
    if (profileAvatarBtn) profileAvatarBtn.textContent = t('user.changeAvatar');
};

/**
 * Actualiza los textos de los modales
 */
const updateModalsTexts = () => {
    // Modal de confirmación de salida
    const exitTitleEl = document.getElementById('exit-title');
    const exitTextEl = document.getElementById('exit-text');
    const exitConfirmBtn = document.getElementById('exit-confirm-btn');
    const exitCancelBtn = document.getElementById('exit-cancel-btn');
    
    // Modal de confirmación de guardar
    const modalTitle = document.getElementById('modal-title');
    const modalText = document.getElementById('modal-text');
    const confirmSaveBtn = document.getElementById('confirm-save-btn');
    const cancelSaveBtn = document.getElementById('cancel-save-btn');
    
    // Modal de prompt
    const promptTitle = document.getElementById('prompt-title');
    const promptCancelBtn = document.getElementById('prompt-cancel-btn');
    const promptOkBtn = document.getElementById('prompt-ok-btn');
    const promptInput = document.getElementById('prompt-input') as HTMLInputElement | null;
    
    // Modal de salida (se actualiza dinámicamente según el contexto)
    // Valores por defecto cuando no hay contexto específico
    if (exitTitleEl && exitTitleEl.textContent === 'Confirmar acción') {
        exitTitleEl.textContent = t('modals.confirmAction');
    }
    if (exitTextEl && exitTextEl.textContent === '¿Seguro que deseas continuar?') {
        exitTextEl.textContent = t('modals.confirmActionMessage');
    }
    if (exitConfirmBtn && exitConfirmBtn.textContent === 'Sí') {
        exitConfirmBtn.textContent = t('modals.yes');
    }
    if (exitCancelBtn && exitCancelBtn.textContent === 'No') {
        exitCancelBtn.textContent = t('modals.no');
    }
    
    // Modal de confirmación de guardar
    if (modalTitle) modalTitle.textContent = t('modals.saveConfirm');
    if (modalText) modalText.textContent = t('modals.saveMessage');
    if (confirmSaveBtn) confirmSaveBtn.textContent = t('modals.confirm');
    if (cancelSaveBtn) cancelSaveBtn.textContent = t('modals.cancel');
    
    // Modal de prompt
    if (promptTitle) promptTitle.textContent = t('modals.entry');
    if (promptCancelBtn) promptCancelBtn.textContent = t('modals.cancel');
    if (promptOkBtn) promptOkBtn.textContent = t('modals.accept');
    if (promptInput) promptInput.placeholder = t('modals.writeHere');
};

/**
 * Actualiza los textos del modal de pausa
 */
const updatePauseMenuTexts = () => {
    const pauseMenuTitle = document.querySelector('#pause-menu-modal .title');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const pauseRestartBtn = document.getElementById('pause-restart-btn');
    const pauseMainMenuBtn = document.getElementById('pause-mainmenu-btn');
    const pauseSettingsBtn = document.getElementById('pause-settings-btn');
    const pauseCreditsBtn = document.getElementById('pause-credits-btn');
    const pauseCancelBtn = document.getElementById('pause-cancel-btn');
    
    if (pauseMenuTitle) pauseMenuTitle.textContent = t('modals.menuTitle');
    if (pauseResumeBtn) pauseResumeBtn.textContent = t('game.resume');
    if (pauseRestartBtn) pauseRestartBtn.textContent = t('game.restart');
    if (pauseMainMenuBtn) pauseMainMenuBtn.textContent = t('modals.backToMainMenuTitle');
    if (pauseSettingsBtn) pauseSettingsBtn.textContent = t('game.settings');
    if (pauseCreditsBtn) pauseCreditsBtn.textContent = t('menu.credits');
    if (pauseCancelBtn) pauseCancelBtn.textContent = t('modals.close');
};

/**
 * Actualiza los textos de créditos
 */
const updateCreditsTexts = () => {
    const creditsTitle = document.querySelector('#credits-modal .title');
    const creditsCloseBtn = document.getElementById('credits-close-btn');
    
    if (creditsTitle) creditsTitle.textContent = t('credits.title');
    if (creditsCloseBtn) creditsCloseBtn.textContent = t('modals.close');
};

/**
 * Actualiza los textos del modal de autenticación
 */
const updateAuthModalTexts = () => {
    const authModalTitle = document.querySelector('#auth-choice-modal .title');
    const authModalMessage = document.querySelector('#auth-choice-modal p.mb-6');
    const authGoogleBtnText = document.getElementById('auth-google-btn-text');
    const authLoginBtn = document.getElementById('auth-login-btn');
    const authSignupBtn = document.getElementById('auth-signup-btn');
    const authCancelBtn = document.getElementById('auth-cancel-btn');
    
    if (authModalTitle) authModalTitle.textContent = t('auth.authentication');
    if (authModalMessage) authModalMessage.textContent = t('auth.loginMessage');
    if (authGoogleBtnText) authGoogleBtnText.textContent = t('auth.continueWithGoogle');
    if (authLoginBtn) authLoginBtn.textContent = t('auth.login');
    if (authSignupBtn) authSignupBtn.textContent = t('auth.createAccount');
    if (authCancelBtn) authCancelBtn.textContent = t('modals.cancel');
};

/**
 * Abre el modal de configuración y carga los valores actuales
 */
const openSettingsModal = (store: GameStore) => {
    // Mostrar/ocultar sección de controles según dispositivo
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
    const mobileControlsSettings = document.getElementById('mobile-controls-settings') as HTMLElement | null;
    if (mobileControlsSettings) {
        mobileControlsSettings.style.display = isMobile ? 'block' : 'none';
    }
    
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal) return;
    
    // Actualizar UI con valores actuales
    updateSettingsUI(store);
    
    // Actualizar textos
    updateAllTexts(store);
    
    // Mostrar modal
    settingsModal.classList.remove('hidden');
};

/**
 * Aplica la configuración actual al juego
 */
const applySettings = (store: GameStore) => {
    // Aplicar configuración de audio
    setMusicVolume(store.settings.audio.musicVolume);
    setSFXVolume(store.settings.audio.sfxVolume);
    
    // Aplicar configuración de gráficos
    applyGraphicsSettings({ 
        ...store.settings.graphics,
        showFps: store.settings.graphics.showFps ?? false
    });
};

const setupHamburgerMenu = (
    store: GameStore,
    hamburgerBtn: HTMLButtonElement | null,
    hamburgerBtnMobile: HTMLButtonElement | null,
    hamburgerMenu: HTMLElement | null,
    pauseResumeBtn: HTMLButtonElement | null,
    restartGameBtn: HTMLButtonElement | null,
    backToMenuBtnGame: HTMLButtonElement | null,
    resumeEditorBtnMenu: HTMLButtonElement | null,
    creditsBtnHamburger: HTMLButtonElement | null
) => {
    let isMenuOpen = false;
    
    // Función para toggle del menú
    const toggleMenu = () => {
        if (!hamburgerMenu) return;
        
        isMenuOpen = !isMenuOpen;
        
        if (isMenuOpen) {
            hamburgerMenu.classList.remove('hidden');
            hamburgerBtn?.classList.add('active');
            hamburgerBtnMobile?.classList.add('active');
        } else {
            hamburgerMenu.classList.add('hidden');
            hamburgerBtn?.classList.remove('active');
            hamburgerBtnMobile?.classList.remove('active');
        }
    };
    
    // Función para cerrar el menú
    const closeMenu = () => {
        if (!hamburgerMenu) return;
        isMenuOpen = false;
        hamburgerMenu.classList.add('hidden');
        hamburgerBtn?.classList.remove('active');
        hamburgerBtnMobile?.classList.remove('active');
    };
    
    // Listeners para los botones hamburguesa
    hamburgerBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        // Abrir el modal de pausa (pause-menu-modal) en lugar del menú hamburguesa
        const pauseMenu = document.getElementById('pause-menu-modal');
        if (pauseMenu) {
            pauseMenu.classList.remove('hidden');
        }
    });
    
    hamburgerBtnMobile?.addEventListener('click', (e) => {
        e.stopPropagation();
        // Abrir el modal de pausa (pause-menu-modal) en lugar del menú hamburguesa
        const pauseMenu = document.getElementById('pause-menu-modal');
        if (pauseMenu) {
            pauseMenu.classList.remove('hidden');
        }
    });
    
    // Cerrar menú al hacer click fuera
    document.addEventListener('click', (e) => {
        if (isMenuOpen && hamburgerMenu && !hamburgerMenu.contains(e.target as Node)) {
            closeMenu();
        }
    });
    
    // Botón de pausa/reanudar
    pauseResumeBtn?.addEventListener('click', () => {
        store.isPaused = !store.isPaused;
        
        if (store.isPaused) {
            pauseBackgroundMusic();
            pauseResumeBtn.textContent = t('game.resume');
            // Congelar el juego
            store.player.isFrozen = true;
        } else {
            playBackgroundMusic().catch(() => {});
            pauseResumeBtn.textContent = t('game.pause');
            // Descongelar el juego
            store.player.isFrozen = false;
        }
        
        closeMenu();
    });
    
    // Botón de reiniciar
    restartGameBtn?.addEventListener('click', () => {
        closeMenu();
        const exitModalEl = store.dom.ui.exitModalEl;
        const exitTitleEl = store.dom.ui.exitTitleEl;
        const exitTextEl = store.dom.ui.exitTextEl;
        const exitConfirmBtn = store.dom.ui.exitConfirmBtn;
        const exitCancelBtn = store.dom.ui.exitCancelBtn;
        
        if (!exitModalEl) return;
        if (exitTitleEl) exitTitleEl.textContent = t('messages.restartLevelTitle');
        if (exitTextEl) exitTextEl.textContent = t('messages.restartLevelMessage');
        exitModalEl.classList.remove('hidden');
        
        const confirmHandler = () => {
            // Despausar si estaba pausado
            if (store.isPaused) {
                store.isPaused = false;
                store.player.isFrozen = false;
                if (pauseResumeBtn) pauseResumeBtn.textContent = `⏸️ ${t('game.pause')}`;
            }
            startGame(store, null, store.currentLevelIndex, true);
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
    });
    
    // Botón de configuración
    const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement | null;
    settingsBtn?.addEventListener('click', () => {
        closeMenu();
        openSettingsModal(store);
    });
    
    // Botón de volver al menú
    backToMenuBtnGame?.addEventListener('click', () => {
        closeMenu();
        const exitModalEl = store.dom.ui.exitModalEl;
        const exitTitleEl = store.dom.ui.exitTitleEl;
        const exitTextEl = store.dom.ui.exitTextEl;
        const exitConfirmBtn = store.dom.ui.exitConfirmBtn;
        const exitCancelBtn = store.dom.ui.exitCancelBtn;
        
        if (!exitModalEl) return;
        if (exitTitleEl) exitTitleEl.textContent = t('modals.backToMainMenuTitle');
        if (exitTextEl) exitTextEl.textContent = t('modals.backToMainMenuMessage');
        exitModalEl.classList.remove('hidden');
        
        const confirmHandler = () => {
            // Despausar si estaba pausado
            if (store.isPaused) {
                store.isPaused = false;
                store.player.isFrozen = false;
                if (pauseResumeBtn) pauseResumeBtn.textContent = t('game.pause');
            }
            showMenu(store);
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
    });
    
    // Botón de volver al editor (solo visible cuando se está probando un nivel)
    resumeEditorBtnMenu?.addEventListener('click', () => {
        closeMenu();
        // Despausar si estaba pausado
        if (store.isPaused) {
            store.isPaused = false;
            store.player.isFrozen = false;
            if (pauseResumeBtn) pauseResumeBtn.textContent = t('game.pause');
        }
        
        // Conservar el nivel actual antes de volver al editor
        const index = store.currentLevelIndex;
        const levelRows = store.levelDesigns[index] ?? [];
        store.editorLevel = levelRows.map(row => row.split(''));
        
        startEditor(store, true);
    });
    
    // Botón de créditos en menú hamburguesa
    creditsBtnHamburger?.addEventListener('click', () => {
        closeMenu();
        const creditsModal = document.getElementById('credits-modal');
        if (creditsModal) {
            creditsModal.classList.remove('hidden');
            // Remover clase de activación al abrir para resetear animaciones
            creditsModal.classList.remove('paolo-activated');
            // NO iniciar partículas automáticamente - solo cuando se hace click en Paolo
        }
    });
    
    // Actualizar visibilidad del botón "Volver al Editor" cuando sea necesario
    const updateResumeEditorVisibility = () => {
        // Este se actualizará desde startGame cuando sea necesario
    };
};

// Variables globales para partículas de créditos
let creditsParticlesAnimation: number | null = null;
let creditsParticlesInitialized = false;

// Función para inicializar partículas de créditos
const initCreditsParticles = () => {
    const canvas = document.getElementById('credits-particles') as HTMLCanvasElement;
    const creditsModal = document.getElementById('credits-modal');
    if (!canvas || !creditsModal || creditsModal.classList.contains('hidden')) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (!creditsParticlesInitialized) {
        creditsParticlesInitialized = true;
        
        // Ajustar tamaño del canvas
        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    // Configuración de partículas
    interface Particle {
        x: number;
        y: number;
        vx: number;
        vy: number;
        size: number;
        color: string;
        life: number;
        maxLife: number;
    }
    
    const particles: Particle[] = [];
    const colors = [
        '#ff6b6b', '#ffd93d', '#6bcf7f', '#4ecdc4',
        '#45b7d1', '#96ceb4', '#ffeaa7', '#d4a574',
        '#ff6b9d', '#a29bfe', '#fd79a8', '#fdcb6e'
    ];
    
    // Crear partículas iniciales
    const createParticle = (): Particle => {
        const side = Math.floor(Math.random() * 4);
        let x, y;
        
        switch (side) {
            case 0: // Top
                x = Math.random() * canvas.width;
                y = -10;
                break;
            case 1: // Right
                x = canvas.width + 10;
                y = Math.random() * canvas.height;
                break;
            case 2: // Bottom
                x = Math.random() * canvas.width;
                y = canvas.height + 10;
                break;
            default: // Left
                x = -10;
                y = Math.random() * canvas.height;
                break;
        }
        
        const angle = Math.atan2(canvas.height / 2 - y, canvas.width / 2 - x);
        const speed = 0.5 + Math.random() * 1.5;
        
        return {
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 0,
            maxLife: 200 + Math.random() * 300
        };
    };
    
    // Inicializar partículas
    for (let i = 0; i < 50; i++) {
        particles.push(createParticle());
    }
    
    // Función de animación
    const animate = () => {
        if (creditsModal?.classList.contains('hidden')) {
            return;
        }
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Actualizar y dibujar partículas
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            
            // Actualizar posición
            p.x += p.vx;
            p.y += p.vy;
            p.life++;
            
            // Atracción hacia el centro con fuerza variable
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const dx = centerX - p.x;
            const dy = centerY - p.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const force = 0.02;
                p.vx += (dx / distance) * force;
                p.vy += (dy / distance) * force;
            }
            
            // Limitar velocidad
            const maxSpeed = 3;
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > maxSpeed) {
                p.vx = (p.vx / speed) * maxSpeed;
                p.vy = (p.vy / speed) * maxSpeed;
            }
            
            // Actualizar opacidad basada en vida
            const alpha = Math.min(1, (p.maxLife - p.life) / 100);
            
            // Dibujar partícula con glow
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Glow adicional
            ctx.shadowBlur = 20;
            ctx.globalAlpha = alpha * 0.5;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Remover partícula si está muerta o muy lejos
            if (p.life > p.maxLife || 
                p.x < -50 || p.x > canvas.width + 50 ||
                p.y < -50 || p.y > canvas.height + 50) {
                particles[i] = createParticle();
            }
        }
        
        // Agregar nuevas partículas ocasionalmente
        if (particles.length < 80 && Math.random() < 0.1) {
            particles.push(createParticle());
        }
        
        creditsParticlesAnimation = requestAnimationFrame(animate);
    };
    
    animate();
};

const setupMenuButtons = (store: GameStore) => {
    const { startGameBtn, levelEditorBtn, retryBtn, menuBtn, restartBtn, menuBtnDesktop, restartBtnDesktop, exitModalEl, exitTitleEl, exitTextEl, exitConfirmBtn, exitCancelBtn } = store.dom.ui;
    const signupBtn = document.getElementById('signup-btn') as HTMLButtonElement | null;
    const creditsBtn = document.getElementById('credits-btn') as HTMLButtonElement | null;
    const creditsModal = document.getElementById('credits-modal');
    const creditsCloseBtn = document.getElementById('credits-close-btn') as HTMLButtonElement | null;
    // Modal de menú (pausa)
    const pauseMenu = document.getElementById('pause-menu-modal');
    const pauseResumeBtn = document.getElementById('pause-resume-btn') as HTMLButtonElement | null;
    const pauseRestartBtn = document.getElementById('pause-restart-btn') as HTMLButtonElement | null;
    const pauseMainMenuBtn = document.getElementById('pause-mainmenu-btn') as HTMLButtonElement | null;
    const pauseCreditsBtn = document.getElementById('pause-credits-btn') as HTMLButtonElement | null;
    const pauseCancelBtn = document.getElementById('pause-cancel-btn') as HTMLButtonElement | null;
    // Función para verificar si el usuario está logueado
    const checkLoginStatus = (): { isLoggedIn: boolean; username: string | null } => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        // Priorizar nickname sobre username
        const username = localStorage.getItem('nickname') || localStorage.getItem('username');
        return { isLoggedIn, username: username || null };
    };

    // Función para actualizar el botón de editor según el estado de login
    const updateEditorButton = () => {
        const { isLoggedIn } = checkLoginStatus();
        if (levelEditorBtn) {
            levelEditorBtn.textContent = isLoggedIn ? t('menu.editor') : t('menu.login');
        }
    };

    // Función para actualizar el área de usuario en el editor (desktop y mobile)
    const updateUserArea = () => {
        const { isLoggedIn, username } = checkLoginStatus();
        // Asegurar que usamos nickname si está disponible
        const displayName = localStorage.getItem('nickname') || username;
        
        // Actualizar panel desktop
        const userArea = document.getElementById('user-area');
        const usernameDisplay = document.getElementById('username-display');
        if (userArea && usernameDisplay) {
            if (isLoggedIn && displayName) {
                usernameDisplay.textContent = displayName;
                userArea.style.display = 'block';
            } else {
                userArea.style.display = 'none';
            }
        }
        
        // Actualizar panel mobile
        const userAreaMobile = document.getElementById('user-area-mobile');
        const userPanelNickname = document.getElementById('user-panel-nickname');
        const userPanelAvatar = document.getElementById('user-panel-avatar');
        
        if (userAreaMobile) {
            if (isLoggedIn && displayName) {
                userAreaMobile.style.display = 'block';
                // Actualizar nickname del panel
                if (userPanelNickname) {
                    userPanelNickname.textContent = displayName.toUpperCase();
                }
                // Actualizar avatar si está guardado (default: Player)
                const savedAvatar = localStorage.getItem('avatar') || 'P';
                const userPanelAvatarCanvas = document.getElementById('user-panel-avatar') as HTMLCanvasElement | null;
                if (userPanelAvatarCanvas) {
                    drawAvatar(store, savedAvatar, userPanelAvatarCanvas, performance.now());
                    // Registrar para animación continua
                    const existingIndex = avatarCanvases.findIndex(a => a.canvas === userPanelAvatarCanvas);
                    if (existingIndex >= 0) {
                        avatarCanvases[existingIndex].code = savedAvatar;
                    } else {
                        avatarCanvases.push({ code: savedAvatar, canvas: userPanelAvatarCanvas });
                    }
                }
            } else {
                userAreaMobile.style.display = 'none';
                if (userPanelNickname) {
                    userPanelNickname.textContent = t('user.user');
                }
                const userPanelAvatarCanvas = document.getElementById('user-panel-avatar') as HTMLCanvasElement | null;
                if (userPanelAvatarCanvas) {
                    drawAvatar(store, 'P', userPanelAvatarCanvas, performance.now());
                    // Registrar para animación continua
                    const existingIndex = avatarCanvases.findIndex(a => a.canvas === userPanelAvatarCanvas);
                    if (existingIndex >= 0) {
                        avatarCanvases[existingIndex].code = 'P';
                    } else {
                        avatarCanvases.push({ code: 'P', canvas: userPanelAvatarCanvas });
                    }
                }
            }
        }
    };

    // Actualizar el botón al cargar
    updateEditorButton();

    startGameBtn?.addEventListener('click', async () => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (!isLoggedIn) {
            // Usuario no logueado: iniciar directamente con la campaña original
            const { getCampaignLevelIndices } = await import('../utils/campaigns');
            const DEFAULT_CAMPAIGN_ID = 'default';
            store.currentCampaignId = DEFAULT_CAMPAIGN_ID;
            const levelIndices = getCampaignLevelIndices(store, DEFAULT_CAMPAIGN_ID);
            
            if (levelIndices.length > 0) {
                startGame(store, null, levelIndices[0], false);
            } else {
                // Fallback: iniciar con el primer nivel si no hay campaña
                startGame(store, null, 0, false);
            }
        } else {
            // Usuario logueado: mostrar modal para seleccionar campaña (modo jugar)
            const { showCampaignsModal } = await import('./campaigns-ui');
            showCampaignsModal(store, true);
        }
    });
    levelEditorBtn?.addEventListener('click', () => {
        const { isLoggedIn } = checkLoginStatus();
        if (!isLoggedIn) {
            // Mostrar modal de elección
            const modal = document.getElementById('auth-choice-modal');
            modal?.classList.remove('hidden');
            return;
        }
        startEditor(store);
    });

    signupBtn?.addEventListener('click', () => {
        const ni: any = (window as any).netlifyIdentity;
        if (!ni) return;
        ni.open('signup');
    });

    // Variables para MIDI.js
    let midiPluginLoaded = false;
    let midiIsPlaying = false;
    let midiLoopInterval: number | null = null;
    
    // Función para inicializar MIDI.js si aún no está cargado
    const initMIDI = (callback: () => void) => {
        const MIDI = (window as any).MIDI;
        if (!MIDI) {
            console.warn('MIDI.js no está disponible. Asegúrate de que el script esté cargado.');
            return;
        }
        
        if (midiPluginLoaded) {
            callback();
            return;
        }
        
        // Cargar plugin de MIDI.js con soundfonts
        MIDI.loadPlugin({
            soundfontUrl: 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/',
            instrument: 'acoustic_grand_piano',
            onsuccess: () => {
                midiPluginLoaded = true;
                console.log('MIDI.js plugin cargado correctamente');
                callback();
            },
            onerror: (error: any) => {
                console.error('Error cargando MIDI.js plugin:', error);
            }
        });
    };
    
    // Función para reproducir astronomia.mid
    const playAstronomiaMIDI = () => {
        const MIDI = (window as any).MIDI;
        if (!MIDI || !midiPluginLoaded) {
            console.warn('MIDI.js no está listo');
            return;
        }
        
        const baseUrl = getNetlifyBaseUrl();
        const midiPath = `${baseUrl}audio/astronomia.mid`;
        
        // Detener cualquier reproducción anterior
        if (MIDI.Player.playing) {
            MIDI.Player.stop();
        }
        
        // Limpiar intervalo anterior si existe
        if (midiLoopInterval !== null) {
            clearInterval(midiLoopInterval);
            midiLoopInterval = null;
        }
        
        // Cargar y reproducir el archivo MIDI
        MIDI.Player.loadFile(midiPath, () => {
            const audioState = getAudioState();
            MIDI.setVolume(Math.floor(audioState.musicVolume * 127)); // MIDI.js usa 0-127
            MIDI.Player.start();
            midiIsPlaying = true;
            
            // Configurar loop (reiniciar cuando termine)
            midiLoopInterval = window.setInterval(() => {
                if (!MIDI.Player.playing && midiIsPlaying) {
                    // Reiniciar si se detuvo pero debería estar sonando
                    MIDI.Player.loadFile(midiPath, () => {
                        MIDI.setVolume(Math.floor(audioState.musicVolume * 127));
                        MIDI.Player.start();
                    });
                }
                if (!midiIsPlaying) {
                    if (midiLoopInterval !== null) {
                        clearInterval(midiLoopInterval);
                        midiLoopInterval = null;
                    }
                }
            }, 1000);
        });
    };
    
    // Función para detener MIDI
    const stopMIDI = () => {
        const MIDI = (window as any).MIDI;
        if (MIDI && MIDI.Player) {
            MIDI.Player.stop();
            midiIsPlaying = false;
        }
        if (midiLoopInterval !== null) {
            clearInterval(midiLoopInterval);
            midiLoopInterval = null;
        }
    };
    
    // Créditos - NO iniciar partículas automáticamente
    creditsBtn?.addEventListener('click', () => {
        creditsModal?.classList.remove('hidden');
        // Remover clase de activación al abrir para resetear animaciones
        creditsModal?.classList.remove('paolo-activated');
    });
    
    creditsCloseBtn?.addEventListener('click', () => {
        creditsModal?.classList.add('hidden');
        // Remover clase de activación de Paolo para detener animaciones de colores
        creditsModal?.classList.remove('paolo-activated');
        // Detener partículas si están activas
        if (creditsParticlesAnimation !== null) {
            cancelAnimationFrame(creditsParticlesAnimation);
            creditsParticlesAnimation = null;
        }
        // Detener música de astronomía MIDI si está sonando
        stopMIDI();
        // Reanudar música de fondo si estaba sonando antes
        const wasPlayingMusic = (window as any).wasPlayingMusicBeforePaolo;
        if (wasPlayingMusic) {
            playBackgroundMusic().catch(() => {});
            (window as any).wasPlayingMusicBeforePaolo = false;
        }
    });
    
    // Listener para click en "Paolo" - iniciar partículas y música
    const creditsSpecialText = document.querySelector('.credits-special') as HTMLElement;
    
    creditsSpecialText?.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Solo activar si se clickea en el texto que contiene "Paolo"
        if (target.textContent?.includes('Paolo') || target.closest('.credits-special')) {
            // Activar animaciones de colores agregando clase al modal
            const creditsModal = document.getElementById('credits-modal');
            if (creditsModal) {
                creditsModal.classList.add('paolo-activated');
            }
            
            // Pausar música de fondo actual si está sonando
            const audioState = getAudioState();
            
            // Verificar si la música estaba sonando antes de pausarla
            const wasPlaying = isBackgroundMusicPlaying();
            if (wasPlaying) {
                pauseBackgroundMusic();
            }
            
            (window as any).wasPlayingMusicBeforePaolo = wasPlaying;
            
            // Iniciar partículas
            setTimeout(() => {
                initCreditsParticles();
            }, 50);
            
            // Inicializar MIDI.js y reproducir astronomia.mid
            initMIDI(() => {
                playAstronomiaMIDI();
            });
        }
    });

    // Modal autenticación: handlers
    const authModal = document.getElementById('auth-choice-modal');
    const authGoogleBtn = document.getElementById('auth-google-btn') as HTMLButtonElement | null;
    const authLoginBtn = document.getElementById('auth-login-btn') as HTMLButtonElement | null;
    const authSignupBtn = document.getElementById('auth-signup-btn') as HTMLButtonElement | null;
    const authCancelBtn = document.getElementById('auth-cancel-btn') as HTMLButtonElement | null;
    const closeAuthModal = () => authModal?.classList.add('hidden');
    authCancelBtn?.addEventListener('click', closeAuthModal);
    
    // Handler del botón de Google
    authGoogleBtn?.addEventListener('click', () => {
        const ni: any = (window as any).netlifyIdentity;
        if (ni) {
            // Cerrar el modal de elección ANTES de abrir el modal de Netlify Identity
            closeAuthModal();
            // Pequeño delay para asegurar que el modal se cierre antes de abrir Netlify
            setTimeout(() => {
                // Usar el método correcto de Netlify Identity para providers externos
                // El widget de Netlify Identity maneja automáticamente los providers externos
                // si están configurados en el dashboard
                try {
                    // Método 1: Intentar usar el método open con provider específico
                    // Si el widget soporta esto, lo usará
                    if (typeof ni.open === 'function') {
                        // Netlify Identity widget automáticamente mostrará el botón de Google
                        // si está habilitado en la configuración del sitio
                        ni.open('login');
                    } else {
                        // Método alternativo: usar la API directamente
                        const identityUrl = ni.settings?.api_url || 'https://newhero.netlify.app/.netlify/identity';
                        const currentUrl = window.location.href;
                        // Usar el endpoint correcto de GoTrue para providers externos
                        const googleAuthUrl = `${identityUrl}/authorize?provider=google&redirect_uri=${encodeURIComponent(currentUrl)}`;
                        window.location.href = googleAuthUrl;
                    }
                } catch (error) {
                    console.error('Error iniciando login con Google:', error);
                    showNotification(store, '❌ Error', 'Error al iniciar sesión con Google. Asegúrate de que Google OAuth esté configurado en Netlify Identity.');
                }
            }, 100);
            // Escuchar cuando se complete el login
            // Nota: Este listener se puede duplicar, pero el setupUI ya tiene uno
            // que maneja el login, así que esto es redundante pero seguro
            const handleGoogleLogin = (user: any) => {
                if (user && user.email) {
                    const username = user.email.split('@')[0];
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    updateEditorButton();
                    updateUserArea();
                    startEditor(store);
                    // Remover el listener después de usarlo para evitar duplicados
                    ni.off('login', handleGoogleLogin);
                }
            };
            ni.on('login', handleGoogleLogin);
        } else {
            showNotification(store, '❌ Error', 'Netlify Identity no está disponible. Por favor, configura el servicio en el dashboard de Netlify.');
        }
    });
    
    authLoginBtn?.addEventListener('click', () => {
        const ni: any = (window as any).netlifyIdentity;
        if (ni) {
            // Cerrar el modal de elección ANTES de abrir el modal de Netlify Identity
            closeAuthModal();
            // Pequeño delay para asegurar que el modal se cierre antes de abrir Netlify
            setTimeout(() => {
                ni.open('login');
            }, 100);
            // Escuchar cuando se complete el login
            ni.on('login', (user: any) => {
                if (user && user.email) {
                    const username = user.email.split('@')[0]; // Usar parte antes del @ como username
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    updateEditorButton();
                    updateUserArea();
                    startEditor(store);
                }
            });
        } else {
            // Login simple para demo (sin Netlify Identity)
            showPromptModal(store, 'Ingresa tu nombre de usuario:', '').then(username => {
                if (username) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    updateEditorButton();
                    updateUserArea();
                    closeAuthModal();
                    startEditor(store);
                }
            });
        }
    });
    authSignupBtn?.addEventListener('click', () => {
        const ni: any = (window as any).netlifyIdentity;
        if (ni) {
            // Cerrar el modal de elección ANTES de abrir el modal de Netlify Identity
            closeAuthModal();
            // Pequeño delay para asegurar que el modal se cierre antes de abrir Netlify
            setTimeout(() => {
                ni.open('signup');
            }, 100);
            // Escuchar cuando se complete el registro
            ni.on('signup', (user: any) => {
                if (user && user.email) {
                    const username = user.email.split('@')[0];
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    updateEditorButton();
                    updateUserArea();
                    startEditor(store);
                }
            });
        } else {
            // Registro simple para demo
            showPromptModal(store, 'Ingresa tu nombre de usuario:', '').then(username => {
                if (username) {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('username', username);
                    updateEditorButton();
                    updateUserArea();
                    closeAuthModal();
                    startEditor(store);
                }
            });
        }
    });

    // Handler del botón de cerrar sesión
    const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement | null;
    logoutBtn?.addEventListener('click', () => {
        openExitModal(t('modals.logoutConfirm'), t('modals.logoutMessage'), () => {
            // Cerrar sesión en Netlify Identity si está disponible
            const ni: any = (window as any).netlifyIdentity;
            if (ni && ni.currentUser()) {
                ni.logout();
            }
            // Limpiar localStorage
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            updateEditorButton();
            updateUserArea();
            showMenu(store);
        });
    });
    
    // Handler del botón Mi Área
    const profileBtn = document.getElementById('user-profile-btn') as HTMLButtonElement | null;
    const profileModal = document.getElementById('profile-modal');
    const profileCloseBtn = document.getElementById('profile-close-btn');
    const profileSaveBtn = document.getElementById('profile-save-btn');
    const profileCancelBtn = document.getElementById('profile-cancel-btn');
    const profileNicknameInput = document.getElementById('profile-nickname-input') as HTMLInputElement | null;
    const profileEmailDisplay = document.getElementById('profile-email-display') as HTMLInputElement | null;
    
    profileBtn?.addEventListener('click', () => {
        profileModal?.classList.remove('hidden');
        // Cargar datos del usuario
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        if (user && profileEmailDisplay) {
            profileEmailDisplay.value = user.email || '';
        }
        const currentNickname = localStorage.getItem('nickname');
        if (profileNicknameInput) {
            profileNicknameInput.value = currentNickname || '';
        }
        // Cargar avatar actual (default: Player)
        const profileAvatarPreview = document.getElementById('profile-avatar-preview') as HTMLCanvasElement | null;
        const savedAvatar = localStorage.getItem('avatar') || 'P';
        if (profileAvatarPreview) {
            drawAvatar(store, savedAvatar, profileAvatarPreview, performance.now());
            // Registrar para animación continua
            const existingIndex = avatarCanvases.findIndex(a => a.canvas === profileAvatarPreview);
            if (existingIndex >= 0) {
                avatarCanvases[existingIndex].code = savedAvatar;
            } else {
                avatarCanvases.push({ code: savedAvatar, canvas: profileAvatarPreview });
            }
        }
    });
    
    // Handler del botón Cambiar Avatar
    const profileAvatarBtn = document.getElementById('profile-avatar-btn') as HTMLButtonElement | null;
    profileAvatarBtn?.addEventListener('click', () => {
        // Lista de avatares disponibles (códigos de personajes del juego)
        // Player, Murciélago, Araña, Víbora, Tentáculo, Minero
        const avatares = ['P', '8', 'S', 'V', 'T', '9'];
        const currentAvatar = localStorage.getItem('avatar') || 'P';
        const currentIndex = avatares.indexOf(currentAvatar);
        const nextIndex = (currentIndex + 1) % avatares.length;
        const newAvatar = avatares[nextIndex];
        
        // Guardar nuevo avatar
        localStorage.setItem('avatar', newAvatar);
        
        // Actualizar preview en el modal (canvas)
        const profileAvatarPreview = document.getElementById('profile-avatar-preview') as HTMLCanvasElement | null;
        if (profileAvatarPreview) {
            drawAvatar(store, newAvatar, profileAvatarPreview, performance.now());
            // Registrar para animación continua
            const existingIndex = avatarCanvases.findIndex(a => a.canvas === profileAvatarPreview);
            if (existingIndex >= 0) {
                avatarCanvases[existingIndex].code = newAvatar;
            } else {
                avatarCanvases.push({ code: newAvatar, canvas: profileAvatarPreview });
            }
        }
        
        // Actualizar avatar en el panel mobile (canvas)
        const userPanelAvatar = document.getElementById('user-panel-avatar') as HTMLCanvasElement | null;
        if (userPanelAvatar) {
            drawAvatar(store, newAvatar, userPanelAvatar, performance.now());
            // Registrar para animación continua
            const existingIndex = avatarCanvases.findIndex(a => a.canvas === userPanelAvatar);
            if (existingIndex >= 0) {
                avatarCanvases[existingIndex].code = newAvatar;
            } else {
                avatarCanvases.push({ code: newAvatar, canvas: userPanelAvatar });
            }
        }
    });
    
    profileCloseBtn?.addEventListener('click', () => {
        profileModal?.classList.add('hidden');
    });
    
    profileCancelBtn?.addEventListener('click', () => {
        profileModal?.classList.add('hidden');
    });
    
    profileSaveBtn?.addEventListener('click', async () => {
        if (!profileNicknameInput) return;
        const newNickname = profileNicknameInput.value.trim();
        if (newNickname) {
            localStorage.setItem('nickname', newNickname);
            // Actualizar nickname del panel mobile
            const userPanelNickname = document.getElementById('user-panel-nickname');
            if (userPanelNickname) {
                userPanelNickname.textContent = newNickname.toUpperCase();
            }
            // Actualizar área de usuario
            updateUserArea();
            // Aquí podrías guardar en la BD también
            showNotification(store, t('modals.errors.nicknameSaved'), t('modals.errors.nicknameSaved'));
        }
        profileModal?.classList.add('hidden');
    });
    retryBtn?.addEventListener('click', () => startGame(store));
    
    // Botones del modal Game Over
    const { gameoverRetryBtn, gameoverMenuBtn, gameoverModal } = store.dom.ui;
    gameoverRetryBtn?.addEventListener('click', () => {
        if (gameoverModal) {
            gameoverModal.classList.add('hidden');
        }
        startGame(store);
    });
    gameoverMenuBtn?.addEventListener('click', () => {
        if (gameoverModal) {
            gameoverModal.classList.add('hidden');
        }
        showMenu(store);
    });
    
    // Configurar event listeners para el modal Level Complete (editor)
    const levelCompleteModal = document.getElementById('level-complete-modal');
    const levelCompleteBackToEditorBtn = document.getElementById('level-complete-back-to-editor-btn') as HTMLButtonElement | null;
    const levelCompleteRestartBtn = document.getElementById('level-complete-restart-btn') as HTMLButtonElement | null;
    
    levelCompleteBackToEditorBtn?.addEventListener('click', () => {
        if (levelCompleteModal) {
            levelCompleteModal.classList.add('hidden');
        }
        // Volver al editor preservando el nivel actual
        if (store.appState === 'playing') {
            const index = store.currentLevelIndex;
            const levelRows = store.levelDesigns[index] ?? [];
            store.editorLevel = levelRows.map(row => row.split(''));
            startEditor(store, true);
        }
    });
    
    levelCompleteRestartBtn?.addEventListener('click', () => {
        if (levelCompleteModal) {
            levelCompleteModal.classList.add('hidden');
        }
        // Reiniciar el mismo nivel desde el editor
        if (store.appState === 'playing' && store.playingFromEditor) {
            const index = store.currentLevelIndex;
            startGame(store, null, index, true);
        }
    });
    
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

    // Abrir menú flotante
    const openPauseMenu = () => pauseMenu?.classList.remove('hidden');
    const closePauseMenu = () => pauseMenu?.classList.add('hidden');
    menuBtn?.addEventListener('click', openPauseMenu);

    restartBtn?.addEventListener('click', () => {
        openExitModal(t('messages.restartLevelTitle'), t('messages.restartLevelMessage'), () => {
            startGame(store, null, store.currentLevelIndex, true);
        });
    });

    // Desktop duplicates
    menuBtnDesktop?.addEventListener('click', openPauseMenu);
    // Acciones del menú flotante
    pauseResumeBtn?.addEventListener('click', () => {
        closePauseMenu();
        // Si está pausado, reanudar
        if (store.isPaused) {
            store.isPaused = false;
            store.player.isFrozen = false;
        }
    });
    pauseRestartBtn?.addEventListener('click', () => {
        closePauseMenu();
        startGame(store, null, store.currentLevelIndex, true);
    });
    pauseMainMenuBtn?.addEventListener('click', () => {
        closePauseMenu();
        showMenu(store);
    });
        pauseCreditsBtn?.addEventListener('click', () => {
            closePauseMenu();
            creditsModal?.classList.remove('hidden');
            // Remover clase de activación al abrir para resetear animaciones
            creditsModal?.classList.remove('paolo-activated');
            // NO iniciar partículas automáticamente - solo cuando se hace click en Paolo
        });
    
    // Botón de configuración en el menú de pausa
    const pauseSettingsBtn = document.getElementById('pause-settings-btn') as HTMLButtonElement | null;
    pauseSettingsBtn?.addEventListener('click', () => {
        closePauseMenu();
        openSettingsModal(store);
    });
    
    pauseCancelBtn?.addEventListener('click', closePauseMenu);

    restartBtnDesktop?.addEventListener('click', () => {
        openExitModal(t('messages.restartLevelTitle'), t('messages.restartLevelMessage'), () => {
            startGame(store, null, store.currentLevelIndex, true);
        });
    });
    
    // Selector de idioma con banderas (arriba a la derecha)
    const langEsBtn = document.getElementById('lang-es-btn') as HTMLButtonElement | null;
    const langEnBtn = document.getElementById('lang-en-btn') as HTMLButtonElement | null;
    const langCaBtn = document.getElementById('lang-ca-btn') as HTMLButtonElement | null;
    
    const updateLanguageButtons = () => {
        const currentLang = getCurrentLanguage();
        if (langEsBtn && langEnBtn && langCaBtn) {
            // Resetear todos los botones
            [langEsBtn, langEnBtn, langCaBtn].forEach(btn => {
                btn.classList.remove('is-primary', 'active', 'is-disabled');
            });
            
            // Activar el botón del idioma actual
            if (currentLang === 'es') {
                langEsBtn.classList.add('is-primary', 'active');
                langEnBtn.classList.add('is-disabled');
                langCaBtn.classList.add('is-disabled');
            } else if (currentLang === 'en') {
                langEnBtn.classList.add('is-primary', 'active');
                langEsBtn.classList.add('is-disabled');
                langCaBtn.classList.add('is-disabled');
            } else if (currentLang === 'ca') {
                langCaBtn.classList.add('is-primary', 'active');
                langEsBtn.classList.add('is-disabled');
                langEnBtn.classList.add('is-disabled');
            }
        }
    };
    
    // Inicializar estado de los botones
    updateLanguageButtons();
    
    // Manejar clic en botón español
    langEsBtn?.addEventListener('click', () => {
        setLanguage('es');
        updateAllTexts(store);
        updateLanguageButtons();
        // Actualizar también el selector en el modal de configuración
        const settingsLanguageSelector = document.getElementById('language-selector') as HTMLSelectElement | null;
        if (settingsLanguageSelector) {
            settingsLanguageSelector.value = 'es';
        }
    });
    
    // Manejar clic en botón inglés
    langEnBtn?.addEventListener('click', () => {
        setLanguage('en');
        updateAllTexts(store);
        updateLanguageButtons();
        // Actualizar también el selector en el modal de configuración
        const settingsLanguageSelector = document.getElementById('language-selector') as HTMLSelectElement | null;
        if (settingsLanguageSelector) {
            settingsLanguageSelector.value = 'en';
        }
    });
    
    // Manejar clic en botón catalán
    langCaBtn?.addEventListener('click', () => {
        setLanguage('ca');
        updateAllTexts(store);
        updateLanguageButtons();
        // Actualizar también el selector en el modal de configuración
        const settingsLanguageSelector = document.getElementById('language-selector') as HTMLSelectElement | null;
        if (settingsLanguageSelector) {
            settingsLanguageSelector.value = 'ca';
        }
    });
    
    // Escuchar cambios de idioma desde otros lugares (como el modal de configuración)
    window.addEventListener('languageChanged', () => {
        updateLanguageButtons();
    });
    
    // Botón de instalación PWA
    const installPwaBtn = document.getElementById('install-pwa-btn') as HTMLButtonElement | null;
    let deferredPrompt: any = null;
    
    // Detectar si la app puede instalarse
    const checkPWAInstallability = () => {
        if (installPwaBtn) {
            // Verificar si ya está instalada
            if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
                installPwaBtn.classList.add('hidden');
                return;
            }
            
            // Escuchar el evento beforeinstallprompt
            window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
                installPwaBtn.classList.remove('hidden');
            });
            
            // Si el evento no se disparó, verificar si ya está instalada
            setTimeout(() => {
                if (!deferredPrompt && installPwaBtn) {
                    // Verificar si está instalada de otra manera
                    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
                        installPwaBtn.classList.add('hidden');
                    } else {
                        // En algunos casos, el evento no se dispara pero la app puede instalarse
                        // Mostrar el botón si no estamos en modo standalone
                        if (!window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
                            // Intentar mostrar el botón (puede que no funcione en todos los navegadores)
                            installPwaBtn.classList.remove('hidden');
                        }
                    }
                }
            }, 1000);
        }
    };
    
    // Inicializar verificación de PWA
    checkPWAInstallability();
    
    // Manejar el clic en el botón de instalación
    installPwaBtn?.addEventListener('click', async () => {
        if (!deferredPrompt) {
            // Si no hay prompt diferido, mostrar mensaje
            const noInstallMessage = getCurrentLanguage() === 'es'
                ? 'La instalación no está disponible en este momento. Por favor, usa el menú de tu navegador para instalar la app.'
                : 'Installation is not available at this time. Please use your browser menu to install the app.';
            showNotification(store, t('modals.notification'), noInstallMessage);
            return;
        }
        
        // Mostrar el prompt de instalación
        deferredPrompt.prompt();
        
        // Esperar la respuesta del usuario
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            const successMessage = getCurrentLanguage() === 'es' 
                ? '¡App instalada correctamente!' 
                : 'App installed successfully!';
            showNotification(store, t('modals.notification'), successMessage);
        }
        
        // Limpiar el prompt
        deferredPrompt = null;
        if (installPwaBtn) {
            installPwaBtn.classList.add('hidden');
        }
    });
    
    // Escuchar cuando la app se instala
    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        if (installPwaBtn) {
            installPwaBtn.classList.add('hidden');
        }
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
 * Muestra un modal de prompt con input para reemplazar prompt()
 * @param store - Store del juego
 * @param message - Mensaje a mostrar
 * @param defaultValue - Valor por defecto del input
 * @returns Promise<string | null> - El valor ingresado o null si se cancela
 */
export const showPromptModal = (store: GameStore, message: string, defaultValue: string = ''): Promise<string | null> => {
    return new Promise((resolve) => {
        const promptModal = document.getElementById('prompt-modal');
        const promptTitle = document.getElementById('prompt-title');
        const promptMessage = document.getElementById('prompt-message');
        const promptInput = document.getElementById('prompt-input') as HTMLInputElement | null;
        const promptOkBtn = document.getElementById('prompt-ok-btn');
        const promptCancelBtn = document.getElementById('prompt-cancel-btn');

        if (!promptModal || !promptInput || !promptOkBtn || !promptCancelBtn) {
            resolve(null);
            return;
        }

        if (promptMessage) {
            promptMessage.textContent = message;
        }
        
        promptInput.value = defaultValue;
        
        const cleanup = () => {
            promptModal.classList.add('hidden');
            promptInput.value = '';
            promptOkBtn.removeEventListener('click', handleOk);
            promptCancelBtn.removeEventListener('click', handleCancel);
            promptInput.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keydown', handleEscape);
        };

        const handleOk = () => {
            const value = promptInput.value.trim();
            cleanup();
            resolve(value || null);
        };

        const handleCancel = () => {
            cleanup();
            resolve(null);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleOk();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        promptOkBtn.addEventListener('click', handleOk);
        promptCancelBtn.addEventListener('click', handleCancel);
        promptInput.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keydown', handleEscape);

        promptModal.classList.remove('hidden');
        promptInput.focus();
        promptInput.select();
    });
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

/**
 * Comparte un nivel a la galería central
 * Permite que otros usuarios vean y voten el nivel del editor actual
 */
const shareLevelToGallery = async (store: GameStore) => {
    // Verificar si el usuario está logueado
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        showNotification(store, `❌ ${t('modals.errors.notLoggedInShare')}`, t('modals.errors.notLoggedInShare'));
        return;
    }

    const ni: any = (window as any).netlifyIdentity;
    const user = ni?.currentUser?.();
    
    if (!user) {
        showNotification(store, `❌ ${t('modals.errors.sessionExpired')}`, t('modals.errors.sessionExpired'));
        return;
    }

    try {
        const token = await user.jwt();
        const baseUrl = getNetlifyBaseUrl();
        
        // Verificar que el nivel del editor existe y no está vacío
        if (!store.editorLevel || store.editorLevel.length === 0) {
            showNotification(store, `❌ Error`, 'El nivel está vacío. Por favor crea un nivel antes de compartir.');
            return;
        }
        
        // Obtener el nivel actual del editor
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        const cleanedLevel = purgeEmptyRowsAndColumns(store.editorLevel);
        
        // Verificar que el nivel limpiado no está vacío
        if (!cleanedLevel || cleanedLevel.length === 0 || (cleanedLevel[0] && cleanedLevel[0].length === 0)) {
            showNotification(store, `❌ Error`, 'El nivel está vacío después de limpiar. Por favor agrega contenido al nivel.');
            return;
        }
        
        // Convertir a formato chunks20x18
        const levelsAsStrings = [cleanedLevel.map(row => row.join(''))];
        let levelData;
        try {
            levelData = buildChunkedFile20x18(levelsAsStrings);
        } catch (conversionError: any) {
            console.error('Error convirtiendo nivel:', conversionError);
            showNotification(store, `❌ Error`, `Error al convertir el nivel: ${conversionError.message || 'Error desconocido'}`);
            return;
        }
        
        // Verificar que levelData es válido
        if (!levelData || !levelData.format || !levelData.levels) {
            console.error('levelData inválido:', levelData);
            showNotification(store, `❌ Error`, 'Error al procesar el formato del nivel.');
            return;
        }
        
        // Generar captura de pantalla del nivel
        let screenshot: string;
        try {
            screenshot = generateLevelScreenshotForShare(cleanedLevel);
        } catch (screenshotError: any) {
            console.error('Error generando screenshot:', screenshotError);
            screenshot = ''; // Continuar sin screenshot si falla
        }
        
        // Preguntar por nombre y descripción
        const name = await showPromptModal(store, t('messages.levelNamePrompt'), `${t('messages.myLevel')} ${index + 1}`);
        if (!name) return;
        
        const description = await showPromptModal(store, t('messages.levelDescriptionPrompt'), '');
        
        // Preparar el payload
        const payload = {
            name: name,
            description: description || null,
            data: levelData,
            screenshot: screenshot || null
        };
        
        const galleryUrl = `${baseUrl}/.netlify/functions/gallery`;
        console.log('Compartiendo nivel:', { 
            name, 
            hasData: !!levelData, 
            hasScreenshot: !!screenshot,
            baseUrl,
            galleryUrl,
            currentOrigin: window.location.origin
        });
        
        const res = await fetch(galleryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorText = await res.text().catch(() => 'Error desconocido');
            console.error('Error del servidor:', res.status, errorText);
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const result = await res.json();
        
        if (result.ok) {
            showNotification(store, `✅ ${t('messages.levelShared')}`, t('messages.levelSharedSuccess'));
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
        
    } catch (error: any) {
        console.error('Error compartiendo nivel:', error);
        const errorMessage = error.message || String(error);
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            showNotification(store, `❌ ${t('modals.errors.unauthorized')}`, t('modals.errors.unauthorized'));
        } else if (errorMessage.includes('400')) {
            showNotification(store, `❌ Error`, `Error en la solicitud: ${errorMessage}`);
        } else if (errorMessage.includes('500')) {
            showNotification(store, `❌ Error`, 'Error del servidor. Por favor intenta más tarde.');
        } else {
            showNotification(store, `❌ ${t('modals.errors.shareError')}`, `${t('modals.errors.shareError')}: ${errorMessage}`);
        }
    }
};

/**
 * Genera una captura de pantalla de un nivel para compartir en la galería
 */
const generateLevelScreenshotForShare = (levelData: string[][]): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Fondo negro
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calcular escala
    const levelWidth = levelData[0]?.length || 20;
    const levelHeight = levelData.length;
    const scaleX = canvas.width / levelWidth;
    const scaleY = canvas.height / levelHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Renderizar tiles
    for (let row = 0; row < levelHeight; row++) {
        for (let col = 0; col < levelWidth; col++) {
            const tile = levelData[row]?.[col] || '0';
            const x = col * scale;
            const y = row * scale;
            
            let color = '#000';
            switch (tile) {
                case '1':
                    color = '#8B4513'; // Ladrillo
                    break;
                case '2':
                    color = '#0080FF'; // Agua
                    break;
                case '3':
                    color = '#FF4500'; // Lava
                    break;
                case 'P':
                    color = '#FF0000'; // Jugador
                    break;
                case '9':
                    color = '#00FFFF'; // Minero
                    break;
                case '8':
                    color = '#808080'; // Murciélago
                    break;
                case 'S':
                    color = '#800080'; // Araña
                    break;
                case 'C':
                    color = '#804040'; // Destructible
                    break;
                default:
                    if (tile !== '0') {
                        color = '#404040'; // Otros tiles
                    }
                    break;
            }
            
            if (color !== '#000') {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, scale, scale);
            }
        }
    }
    
    return canvas.toDataURL('image/png');
};

const setupLevelData = (store: GameStore) => {
    const {
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
    
    const shareLevelBtn = document.getElementById('share-level-btn') as HTMLButtonElement | null;

    // Configurar el botón OK del modal de notificación
    notificationOkBtn?.addEventListener('click', () => {
        hideNotification(store);
    });

    // Función para cargar nivel desde el store
    const loadLevelFromStore = () => {
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[index] ?? []));
        // Centrar la cámara en el jugador si existe
        const canvas = store.dom.canvas;
        if (canvas && store.editorLevel.length > 0) {
            let playerCol = 0;
            let playerRow = 0;
            outerCenter: for (let r = 0; r < store.editorLevel.length; r++) {
                const c = store.editorLevel[r]?.indexOf('P') ?? -1;
                if (c !== -1) {
                    playerRow = r;
                    playerCol = c;
                    break outerCenter;
                }
            }
            const levelCols = store.editorLevel[0]?.length ?? 0;
            const levelRows = store.editorLevel.length;
            const levelWidth = levelCols * TILE_SIZE;
            const levelHeight = levelRows * TILE_SIZE;
            // El canvas internamente tiene 1440px (20 tiles), así que usamos ese tamaño para la cámara
            const canvasInternalWidth = 1440; // 20 tiles * 72px
            const desiredX = playerCol * TILE_SIZE - canvasInternalWidth / 2;
            const desiredY = playerRow * TILE_SIZE - (canvas?.height ?? 0) / 2;
            const maxCamX = Math.max(0, levelWidth - canvasInternalWidth);
            const maxCamY = Math.max(0, levelHeight - canvas.height);
            store.cameraX = Math.max(0, Math.min(desiredX, maxCamX));
            store.cameraY = Math.max(0, Math.min(desiredY, maxCamY));
        } else {
            store.cameraX = 0;
            store.cameraY = 0;
        }
        // Reinicializar el editor avanzado
        initializeAdvancedEditor(store);
    };

    // Cargar nivel automáticamente cuando cambia el selector
    store.dom.ui.levelSelectorEl?.addEventListener('change', () => {
        loadLevelFromStore();
        // Actualizar el número de nivel en el game-ui cuando cambia el selector
        if (store.dom.ui.levelCountEl && store.dom.ui.levelSelectorEl) {
            const selectedIndex = parseInt(store.dom.ui.levelSelectorEl.value ?? '0', 10);
            store.dom.ui.levelCountEl.textContent = `${selectedIndex + 1}`;
        }
    });

    store.dom.ui.addLevelBtn?.addEventListener('click', () => {
        // Crear un nuevo nivel con el patrón por defecto
        const canvas = store.dom.canvas;
        if (!canvas) return;
        
        // Calcular dimensiones del nivel basado en el canvas
        const levelWidth = Math.floor(canvas.width / TILE_SIZE); // 1600 / 72 = ~22 tiles
        const levelHeight = Math.floor(canvas.height / TILE_SIZE) + 5; // Extra altura para scroll
        
        // Patrón por defecto especificado por el usuario
        const defaultPattern = [
            "11111111111111111111",
            "11000001000000001111",
            "11000001000000001111",
            "10P0000C000000000111",
            "1000000C000000000111",
            "1000000C000000000111",
            "11111111100111111111",
            "11111111100111111111",
            "11111111100111111111"
        ];

        // Crear nuevo nivel usando el patrón por defecto
        const newLevel: string[][] = [];
        
        // Aplicar el patrón por defecto
        for (let row = 0; row < defaultPattern.length; row++) {
            newLevel.push(defaultPattern[row].split(''));
        }
        
        // Completar el resto del nivel con espacios vacíos
        for (let row = defaultPattern.length; row < levelHeight; row++) {
            const levelRow: string[] = [];
            for (let col = 0; col < levelWidth; col++) {
                levelRow.push('0'); // Espacio vacío
            }
            newLevel.push(levelRow);
        }
        
        // Agregar el nuevo nivel al final del array
        store.levelDataStore.push(JSON.parse(JSON.stringify(newLevel)));
        store.initialLevels.push(JSON.parse(JSON.stringify(newLevel)));
        
        // Cargar el nuevo nivel en el editor
        store.editorLevel = JSON.parse(JSON.stringify(newLevel));
        
        // Actualizar el selector de niveles
        syncLevelSelector(store);
        
        // Seleccionar el nuevo nivel
        const newIndex = store.levelDataStore.length - 1;
        if (store.dom.ui.levelSelectorEl) {
            store.dom.ui.levelSelectorEl.value = newIndex.toString();
        }
        
        // Centrar la cámara en el jugador
        const playerCol = Math.floor(levelWidth / 2);
        const playerRow = Math.floor(levelHeight / 2);
        const desiredX = playerCol * TILE_SIZE - 2 * TILE_SIZE;
        // El canvas internamente tiene 1440px (20 tiles), así que usamos ese tamaño para la cámara
        const canvasInternalWidth = 1440; // 20 tiles * 72px
        const desiredY = playerRow * TILE_SIZE - 3 * TILE_SIZE;
        const maxCamX = Math.max(0, levelWidth * TILE_SIZE - canvasInternalWidth);
        const maxCamY = Math.max(0, levelHeight * TILE_SIZE - canvas.height);
        store.cameraX = Math.max(0, Math.min(desiredX, maxCamX));
        store.cameraY = Math.max(0, Math.min(desiredY, maxCamY));
        
        // Reinicializar el editor avanzado
        initializeAdvancedEditor(store);
        
        showNotification(store, `➕ ${t('editor.newLevel')}`, t('messages.newLevelCreated').replace('{n}', `${newIndex + 1}`));
    });

    generateLevelBtn?.addEventListener('click', () => {
        // Mostrar modal de advertencia sobre función experimental
        const exitModalEl = document.getElementById('exit-modal');
        const exitTitleEl = document.getElementById('exit-title');
        const exitTextEl = document.getElementById('exit-text');
        const exitConfirmBtn = document.getElementById('exit-confirm-btn');
        const exitCancelBtn = document.getElementById('exit-cancel-btn');
        
        if (!exitModalEl || !exitTitleEl || !exitTextEl || !exitConfirmBtn || !exitCancelBtn) {
            return;
        }
        
        exitTitleEl.textContent = '⚠️ Función Experimental';
        exitTextEl.textContent = 'El generador de niveles es una función experimental. Esto sobrescribirá el contenido actual del nivel. ¿Deseas continuar?';
        exitModalEl.classList.remove('hidden');
        
        const confirmHandler = () => {
            const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
            const canvas = store.dom.canvas;
            if (!canvas) {
                exitModalEl.classList.add('hidden');
                exitConfirmBtn.removeEventListener('click', confirmHandler);
                exitCancelBtn.removeEventListener('click', cancelHandler);
                return;
            }
            
            // Calcular dimensiones del nivel basado en el canvas
            // Usar exactamente el ancho del canvas para evitar columnas vacías
            const levelWidth = Math.floor(canvas.width / TILE_SIZE); // 1600 / 72 = ~22 tiles
            // Los niveles son largos: 90-180 tiles de altura (generar aleatoriamente en ese rango)
            const levelHeight = 90 + Math.floor(Math.random() * 91); // 90-180 tiles
            
            // Generar nivel con dificultad basada en el índice
            const difficulty = Math.min(index + 1, 10);
            const generatedLevel = generateLevel({
                width: levelWidth,
                height: levelHeight,
                difficulty: difficulty
            });
            
            // Convertir a formato del editor (array de arrays)
            store.editorLevel = generatedLevel.map((row: string) => row.split(''));
            
            // Centrar la cámara en el jugador si existe
            if (store.editorLevel.length > 0) {
                let playerCol = 0;
                let playerRow = 0;
                outerCenterGen: for (let r = 0; r < store.editorLevel.length; r++) {
                    const c = store.editorLevel[r]?.indexOf('P') ?? -1;
                    if (c !== -1) {
                        playerRow = r;
                        playerCol = c;
                        break outerCenterGen;
                    }
                }
                const levelCols = store.editorLevel[0]?.length ?? 0;
                const levelRows = store.editorLevel.length;
                const levelWidthPx = levelCols * TILE_SIZE;
                const levelHeightPx = levelRows * TILE_SIZE;
                const desiredX = playerCol * TILE_SIZE - (canvas?.width ?? 0) / 2;
                const desiredY = playerRow * TILE_SIZE - (canvas?.height ?? 0) / 2;
                const maxCamX = Math.max(0, levelWidthPx - (canvas?.width ?? 0));
                const maxCamY = Math.max(0, levelHeightPx - (canvas?.height ?? 0));
                store.cameraX = Math.max(0, Math.min(desiredX, maxCamX));
                store.cameraY = Math.max(0, Math.min(desiredY, maxCamY));
            } else {
                store.cameraX = 0;
                store.cameraY = 0;
            }
            
            // Reinicializar el editor avanzado
            initializeAdvancedEditor(store);
            
            showNotification(store, `🎲 ${t('editor.generateLevel')}`, `${t('messages.levelGenerated')} (${t('editor.levelNumber')} ${index + 1}, ${t('editor.difficulty')}: ${difficulty})`);
            
            exitModalEl.classList.add('hidden');
            exitConfirmBtn.removeEventListener('click', confirmHandler);
            exitCancelBtn.removeEventListener('click', cancelHandler);
        };
        
        const cancelHandler = () => {
            exitModalEl.classList.add('hidden');
            exitConfirmBtn.removeEventListener('click', confirmHandler);
            exitCancelBtn.removeEventListener('click', cancelHandler);
        };
        
        exitConfirmBtn.addEventListener('click', confirmHandler);
        exitCancelBtn.addEventListener('click', cancelHandler);
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
            // Conservar el índice de nivel y el buffer actual del nivel
            const index = store.currentLevelIndex;
            // Sincronizar el editor con el nivel que se está jugando actualmente
            // levelDesigns es string[] (filas como strings); convertir a string[][] para el editor
            const levelRows = store.levelDesigns[index] ?? [];
            store.editorLevel = levelRows.map(row => row.split(''));
            
            // Iniciar editor preservando el nivel actual
            startEditor(store, true);
        }
    });

    backToMenuBtn?.addEventListener('click', () => showMenu(store));

    const saveAllLevelsToFile = async () => {
        // Verificar si la campaña actual es Legacy (por defecto)
        const { getCurrentCampaign } = await import('../utils/campaigns');
        const currentCampaign = getCurrentCampaign(store);
        const isLegacyCampaign = currentCampaign?.isDefault === true;

        // Limpiar todos los niveles eliminando filas y columnas vacías
        const cleanedLevels = store.levelDataStore.map(level => purgeEmptyRowsAndColumns(level));
        const levelsAsStrings = cleanedLevels.map(level => level.map(row => row.join('')));
        
        // IMPORTANTE: La campaña Legacy NO usa base de datos
        // Se sirve únicamente de assets/levels.json
        // Si se modifica, se guarda en localStorage y en el archivo del proyecto (si está en desarrollo)
        if (isLegacyCampaign) {
            // Payload completo para Legacy (todos los niveles de levels.json)
            const fullPayload = buildChunkedFile20x18(levelsAsStrings);
            
            // Guardar en localStorage
            try {
                localStorage.setItem('userLevels', JSON.stringify(fullPayload));
                console.log('Cambios de campaña Legacy guardados en localStorage');
            } catch (localError) {
                console.error('Error guardando en localStorage:', localError);
            }
            
            // Intentar guardar directamente en el archivo del proyecto (solo en desarrollo)
            try {
                const response = await fetch('/api/save-levels', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(fullPayload),
                });
                
                if (response.ok) {
                    console.log('Archivo levels.json guardado exitosamente en src/assets/levels.json');
                    showNotification(store, `💾 ${t('modals.errors.saveSuccess')}`, 'Cambios de Legacy guardados en src/assets/levels.json');
                    ensureEditorVisible(store);
                    return; // Guardado exitoso en el archivo del proyecto
                } else {
                    console.warn('No se pudo guardar en el archivo del proyecto, descargando...');
                }
            } catch (apiError) {
                console.warn('Endpoint /api/save-levels no disponible (probablemente en producción), descargando archivo...', apiError);
            }
            
            // Fallback: Ofrecer descargar el archivo levels.json modificado
            const blob = new Blob([JSON.stringify(fullPayload, null, 4)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'levels.json';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            
            showNotification(store, `💾 ${t('modals.errors.saveSuccess')}`, 'Cambios de Legacy guardados. Archivo levels.json descargado. Reemplaza src/assets/levels.json con el archivo descargado.');
            ensureEditorVisible(store);
            return; // No guardar en BD para Legacy
        }

        // Para campañas NO Legacy, verificar si el usuario está logueado
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            showNotification(store, `❌ ${t('modals.errors.notLoggedInSave')}`, t('modals.errors.notLoggedInSave'));
            return;
        }
        
        // IMPORTANTE: Los niveles originales siempre se sirven desde levels.json
        // Solo guardar niveles personalizados adicionales en la BD
        // Pero guardar todos los niveles (incluyendo originales editados) en localStorage
        const originalCount = store.initialLevels.length;
        const customLevels = levelsAsStrings.slice(originalCount);
        
        // Payload completo para localStorage (incluye originales editados)
        const fullPayload = buildChunkedFile20x18(levelsAsStrings);
        
        // Payload solo para BD (solo niveles personalizados adicionales)
        const customPayload = customLevels.length > 0 ? buildChunkedFile20x18(customLevels) : { format: 'chunks20x18', chunkWidth: 20, chunkHeight: 18, levels: [] };

        const downloadFallback = () => {
            const blob = new Blob([JSON.stringify(fullPayload, null, 4)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = 'levels.json';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            showNotification(store, `⬇️ ${t('modals.errors.manualDownload')}`, t('modals.errors.manualDownload'));
            ensureEditorVisible(store);
        };

        // Intentar obtener el token JWT del usuario de Netlify Identity
        const ni: any = (window as any).netlifyIdentity;
        let user = ni?.currentUser?.();
        let token: string | null = null;
        
        // Si no hay usuario, esperar un momento e intentar de nuevo (por si Netlify Identity aún se está cargando)
        if (!user && ni) {
            await new Promise(resolve => setTimeout(resolve, 500));
            user = ni?.currentUser?.();
        }
        
        // Obtener el token JWT del usuario
        if (user) {
            try {
                token = await user.jwt();
                console.log('Token JWT obtenido exitosamente');
            } catch (error) {
                console.error('Error obteniendo token:', error);
                // Intentar refrescar el usuario y obtener el token de nuevo
                try {
                    // Forzar refresco del usuario si es posible
                    if (ni?.refresh && typeof ni.refresh === 'function') {
                        await ni.refresh();
                        user = ni?.currentUser?.();
                        if (user) {
                            token = await user.jwt();
                            console.log('Token JWT obtenido después del refresh');
                        }
                    }
                } catch (refreshError) {
                    console.error('Error refrescando usuario:', refreshError);
                }
            }
        }

        // Si aún no hay token, mostrar mensaje y fallback
        if (!token) {
            console.warn('No se pudo obtener token JWT. El usuario puede no estar autenticado correctamente.');
            if (!user) {
                showNotification(store, `❌ ${t('modals.errors.notAuthenticated')}`, t('modals.errors.notAuthenticated'));
                // Guardar en localStorage como respaldo (todos los niveles, incluyendo originales editados)
                localStorage.setItem('userLevels', JSON.stringify(fullPayload));
            } else {
                showNotification(store, `⚠️ ${t('modals.errors.tokenExpired')}`, t('modals.errors.tokenExpired'));
                // Continuar con el intento de guardado incluso sin token válido
            }
        }
        
        // Guardar todos los niveles en localStorage (incluyendo originales editados)
        try {
            localStorage.setItem('userLevels', JSON.stringify(fullPayload));
        } catch (localError) {
            console.error('Error guardando en localStorage:', localError);
        }

        // Intentar guardar en Netlify SIEMPRE, incluso si no hay token (el servidor puede tener el usuario en el contexto)
        try {
            const baseUrl = getNetlifyBaseUrl();
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
            };
            
            // Solo agregar el header Authorization si tenemos token
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            console.log('Intentando guardar niveles personalizados en Netlify:', {
                baseUrl,
                hasToken: !!token,
                hasUser: !!user,
                endpoint: `${baseUrl}/.netlify/functions/levels`,
                originalLevels: originalCount,
                customLevels: customLevels.length
            });

            // IMPORTANTE: Solo guardar niveles personalizados adicionales en la BD
            // Los niveles originales siempre se sirven desde levels.json
            const response = await fetch(`${baseUrl}/.netlify/functions/levels`, {
                method: 'POST',
                headers,
                body: JSON.stringify(customPayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error en respuesta de Netlify:', response.status, errorText);
                
                // Si es 401 y tenemos usuario, puede ser que el token haya expirado
                if (response.status === 401 && user) {
                    // Intentar refrescar y volver a intentar
                    try {
                        if (ni?.refresh && typeof ni.refresh === 'function') {
                            await ni.refresh();
                            user = ni?.currentUser?.();
                            if (user) {
                                token = await user.jwt();
                                if (token) {
                                    // Reintentar con el nuevo token (solo niveles personalizados)
                                    const retryResponse = await fetch(`${baseUrl}/.netlify/functions/levels`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`,
                                        },
                                        body: JSON.stringify(customPayload),
                                    });
                                    
                                    if (retryResponse.ok) {
                                        const retryResult = await retryResponse.json();
                                        if (retryResult.ok) {
                                            showNotification(store, `💾 ${t('modals.errors.saveSuccess')}`, t('modals.errors.saveSuccess'));
                                            ensureEditorVisible(store);
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (retryError) {
                        console.error('Error en reintento:', retryError);
                    }
                }
                
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            if (result.ok) {
                showNotification(store, `💾 ${t('modals.errors.saveSuccess')}`, t('modals.errors.saveSuccess'));
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
            ensureEditorVisible(store);
        } catch (error: any) {
            console.error('Error guardando niveles en Netlify:', error);
            const errorMessage = error.message || String(error);
            
            // Guardar en localStorage como respaldo (todos los niveles, incluyendo originales editados)
            try {
                localStorage.setItem('userLevels', JSON.stringify(fullPayload));
            } catch (localError) {
                console.error('Error guardando en localStorage:', localError);
            }
            
            if (errorMessage?.includes('401') || errorMessage?.includes('Unauthorized')) {
                showNotification(store, `❌ ${t('modals.errors.unauthorized')}`, t('modals.errors.unauthorized'));
            } else if (errorMessage?.includes('NetworkError') || errorMessage?.includes('Failed to fetch') || errorMessage?.includes('Network request failed')) {
                showNotification(store, `🌐 ${t('modals.errors.noConnection')}`, t('modals.errors.noConnection'));
            } else {
                console.error('Error completo:', error);
                downloadFallback();
            }
        }
    };

    saveAllBtn?.addEventListener('click', async () => {
        // Guardar automáticamente en la campaña actual
        const { getCurrentCampaign } = await import('../utils/campaigns');
        const { addLevelToCampaign, syncCampaignsToServer } = await import('../utils/campaigns');
        const { buildChunkedFile20x18 } = await import('../utils/levels');
        
        const currentCampaign = getCurrentCampaign(store);
        if (!currentCampaign) {
            showNotification(store, `❌ Error`, 'No hay campaña seleccionada');
            return;
        }
        
        const levelIndex = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        
        // Limpiar filas y columnas vacías antes de guardar
        const cleanedLevel = purgeEmptyRowsAndColumns(store.editorLevel);
        store.levelDataStore[levelIndex] = JSON.parse(JSON.stringify(cleanedLevel));
        // Actualizar también el nivel del editor con la versión limpia
        store.editorLevel = cleanedLevel;
        
        // Agregar el nivel a la campaña actual (o actualizar si ya existe)
        const result = addLevelToCampaign(store, currentCampaign.id, levelIndex);
        
        if (result.success) {
            const isLegacyCampaign = currentCampaign.isDefault === true;
            
            if (isLegacyCampaign) {
                // Legacy es de solo lectura - no se puede guardar
                showNotification(store, `🔒 Solo lectura`, 'La campaña Legacy es de solo lectura. Crea una nueva campaña para guardar cambios.');
                ensureEditorVisible(store);
                return;
            }
            
            // Para otras campañas: sincronizar con el servidor
            await syncCampaignsToServer(store);
            
            const message = result.alreadyExists 
                ? 'Nivel actualizado en la campaña'
                : 'Nivel agregado a la campaña';
            showNotification(store, `💾 ${message}`, `${message}: ${currentCampaign.name}`);
        } else {
            showNotification(store, `❌ Error`, 'No se pudo guardar el nivel');
        }
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
    
    store.dom.ui.duplicateRowBtn?.addEventListener('click', () => {
        activateDuplicateRowMode(store);
    });
    
    store.dom.ui.deleteRowBtn?.addEventListener('click', () => {
        activateDeleteRowMode(store);
    });
    
    // Handler para compartir nivel a la galería
    shareLevelBtn?.addEventListener('click', async () => {
        await shareLevelToGallery(store);
    });
    
    // ===== EVENT LISTENERS PARA PANEL MOBILE =====
    // Sincronizar selector mobile con desktop y viceversa
    const syncLevelSelectors = (fromMobile: boolean = false) => {
        const levelSelectorDesktop = document.getElementById('level-selector') as HTMLSelectElement | null;
        const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
        if (levelSelectorDesktop && levelSelectorMobile) {
            if (fromMobile) {
                levelSelectorDesktop.value = levelSelectorMobile.value;
                // Disparar evento change para cargar el nivel
                levelSelectorDesktop.dispatchEvent(new Event('change'));
            } else {
                levelSelectorMobile.innerHTML = levelSelectorDesktop.innerHTML;
                levelSelectorMobile.value = levelSelectorDesktop.value;
            }
        }
    };
    
    // Botones mobile - Conectar con funciones existentes
    const playTestBtnMobile = document.getElementById('play-test-btn-mobile') as HTMLButtonElement | null;
    const addLevelBtnMobile = document.getElementById('add-level-btn-mobile') as HTMLButtonElement | null;
    const generateLevelBtnMobile = document.getElementById('generate-level-btn-mobile') as HTMLButtonElement | null;
    const saveAllBtnMobile = document.getElementById('save-all-btn-mobile') as HTMLButtonElement | null;
    const shareLevelBtnMobile = document.getElementById('share-level-btn-mobile') as HTMLButtonElement | null;
    const backToMenuBtnMobile = document.getElementById('back-to-menu-btn-mobile') as HTMLButtonElement | null;
    const userProfileBtnMobile = document.getElementById('user-profile-btn-mobile') as HTMLButtonElement | null;
    const logoutBtnMobile = document.getElementById('logout-btn-mobile') as HTMLButtonElement | null;
    const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
    
    // Sincronizar selectores cuando cambien
    store.dom.ui.levelSelectorEl?.addEventListener('change', () => {
        syncLevelSelectors(false);
        // Actualizar el número de nivel en el game-ui cuando cambia el selector
        if (store.dom.ui.levelCountEl && store.dom.ui.levelSelectorEl) {
            const selectedIndex = parseInt(store.dom.ui.levelSelectorEl.value ?? '0', 10);
            store.dom.ui.levelCountEl.textContent = `${selectedIndex + 1}`;
        }
        // No actualizar el nombre de la campaña aquí, solo se actualiza al seleccionar la campaña
    });
    
    levelSelectorMobile?.addEventListener('change', () => {
        syncLevelSelectors(true);
        // Actualizar el número de nivel en el game-ui cuando cambia el selector mobile
        if (store.dom.ui.levelCountEl && levelSelectorMobile) {
            const selectedIndex = parseInt(levelSelectorMobile.value ?? '0', 10);
            store.dom.ui.levelCountEl.textContent = `${selectedIndex + 1}`;
        }
        // No actualizar el nombre de la campaña aquí, solo se actualiza al seleccionar la campaña
    });
    
    // Jugar Nivel (mobile) - usar selector mobile
    playTestBtnMobile?.addEventListener('click', () => {
        const index = parseInt(levelSelectorMobile?.value ?? store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        const currentBuffer = JSON.parse(JSON.stringify(store.editorLevel));
        const cleanedLevel = purgeEmptyRowsAndColumns(currentBuffer);
        store.levelDataStore[index] = JSON.parse(JSON.stringify(cleanedLevel));
        store.editorLevel = cleanedLevel;
        const payload = cleanedLevel.map(row => row.join(''));
        store.levelDesigns = JSON.parse(JSON.stringify(store.initialLevels));
        store.levelDesigns[index] = payload;
        startGame(store, null, index, true);
    });
    
    // Nuevo Nivel (mobile) - duplicar lógica
    addLevelBtnMobile?.addEventListener('click', () => {
        store.dom.ui.addLevelBtn?.click();
        // Sincronizar selector después de agregar
        setTimeout(() => syncLevelSelectors(false), 100);
    });
    
    // Generar Nivel (mobile) - duplicar lógica
    generateLevelBtnMobile?.addEventListener('click', () => {
        store.dom.ui.generateLevelBtn?.click();
        // Sincronizar selector después de generar
        setTimeout(() => syncLevelSelectors(false), 100);
    });
    
    // Guardar (mobile) - duplicar lógica
    saveAllBtnMobile?.addEventListener('click', () => {
        store.dom.ui.saveAllBtn?.click();
    });
    
    // Compartir Nivel (mobile) - duplicar lógica
    shareLevelBtnMobile?.addEventListener('click', async () => {
        await shareLevelToGallery(store);
    });
    
    // Volver al Menú (mobile)
    backToMenuBtnMobile?.addEventListener('click', () => {
        showMenu(store);
    });
    
    // Mi Área (mobile) - abrir modal de perfil
    userProfileBtnMobile?.addEventListener('click', () => {
        const profileBtn = document.getElementById('user-profile-btn') as HTMLButtonElement | null;
        profileBtn?.click();
    });
    
    // Cerrar sesión (mobile) - usar modal directamente
    logoutBtnMobile?.addEventListener('click', () => {
        const { exitModalEl, exitTitleEl, exitTextEl, exitConfirmBtn, exitCancelBtn } = store.dom.ui;
        if (!exitModalEl) return;
        if (exitTitleEl) exitTitleEl.textContent = t('modals.logoutConfirm');
        if (exitTextEl) exitTextEl.textContent = t('modals.logoutMessage');
        exitModalEl.classList.remove('hidden');
        const confirmHandler = () => {
            // Cerrar sesión en Netlify Identity si está disponible
            const ni: any = (window as any).netlifyIdentity;
            if (ni && ni.currentUser()) {
                ni.logout();
            }
            // Limpiar localStorage
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
            if (levelEditorBtn) {
                levelEditorBtn.textContent = 'INGRESAR';
            }
            const updateUserArea = () => {
                const userAreaMobile = document.getElementById('user-area-mobile');
                if (userAreaMobile) {
                    userAreaMobile.style.display = 'none';
                }
            };
            updateUserArea();
            showMenu(store);
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
    });


};

/**
 * Muestra el modal de "Level Complete" cuando se completa un nivel desde el editor
 */
export const showLevelCompleteModal = (store: GameStore) => {
    const levelCompleteModal = document.getElementById('level-complete-modal');
    if (levelCompleteModal) {
        levelCompleteModal.classList.remove('hidden');
    }
};

/**
 * Configura los atajos de teclado para mejorar la navegación
 * ESC: Cerrar modales, P: Pausar, R: Reiniciar, E: Editor, M: Menú, S: Settings
 */
const setupKeyboardShortcuts = (store: GameStore) => {
    document.addEventListener('keydown', (e) => {
        // Ignorar si estamos en un input o textarea
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            return;
        }
        
        // ESC: Cerrar modales abiertos
        if (e.key === 'Escape') {
            const galleryModal = document.getElementById('gallery-modal');
            const profileModal = document.getElementById('profile-modal');
            const settingsModal = document.getElementById('settings-modal');
            const creditsModal = document.getElementById('credits-modal');
            const authModal = document.getElementById('auth-choice-modal');
            const pauseMenu = document.getElementById('pause-menu-modal');
            const gameoverModal = document.getElementById('gameover-modal');
            const levelCompleteModal = document.getElementById('level-complete-modal');
            
            if (gameoverModal && !gameoverModal.classList.contains('hidden')) {
                return; // No cerrar Game Over con ESC
            }
            if (levelCompleteModal && !levelCompleteModal.classList.contains('hidden')) {
                return; // No cerrar Level Complete con ESC
            }
            if (galleryModal && !galleryModal.classList.contains('hidden')) {
                galleryModal.classList.add('hidden');
                return;
            }
            if (profileModal && !profileModal.classList.contains('hidden')) {
                profileModal.classList.add('hidden');
                return;
            }
            if (authModal && !authModal.classList.contains('hidden')) {
                authModal.classList.add('hidden');
                return;
            }
            if (settingsModal && !settingsModal.classList.contains('hidden')) {
                settingsModal.classList.add('hidden');
                return;
            }
            if (creditsModal && !creditsModal.classList.contains('hidden')) {
                creditsModal.classList.add('hidden');
                creditsModal.classList.remove('paolo-activated');
                return;
            }
            if (pauseMenu && !pauseMenu.classList.contains('hidden')) {
                pauseMenu.classList.add('hidden');
                return;
            }
        }
        
        // Atajos de teclado para el editor: Ctrl+Z (undo) y Shift+Ctrl+Z (redo)
        if (store.appState === 'editing') {
            // Ctrl+Z: Deshacer
            if (e.key === 'z' && e.ctrlKey && !e.shiftKey) {
                e.preventDefault();
                undo(store);
                updateUndoRedoButtons(store);
                return;
            }
            // Shift+Ctrl+Z: Rehacer
            if (e.key === 'z' && e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                redo(store);
                updateUndoRedoButtons(store);
                return;
            }
        }
        
        // Solo procesar otros atajos si no estamos en modo playing (donde hay input de teclado)
        if (store.appState === 'playing') {
            // P: Pausar/Reanudar
            if (e.key.toLowerCase() === 'p') {
                const hamburgerBtn = document.getElementById('hamburger-btn');
                hamburgerBtn?.click();
            }
            // R: Reiniciar nivel
            if (e.key.toLowerCase() === 'r') {
                const restartBtn = document.getElementById('restart-game-btn');
                restartBtn?.click();
            }
        }
        
        // E: Abrir Editor (solo desde menú o juego)
        if (e.key.toLowerCase() === 'e' && (store.appState === 'menu' || store.appState === 'playing')) {
            const levelEditorBtn = document.getElementById('level-editor-btn');
            if (levelEditorBtn && store.appState === 'menu') {
                levelEditorBtn.click();
            }
        }
        
        // M: Volver al Menú Principal
        if (e.key.toLowerCase() === 'm' && store.appState !== 'menu') {
            const backToMenuBtn = document.getElementById('back-to-menu-btn-game');
            backToMenuBtn?.click();
        }
        
        // S: Abrir Configuración
        if (e.key.toLowerCase() === 's' && store.appState !== 'editing') {
            const settingsBtn = document.getElementById('settings-btn');
            settingsBtn?.click();
        }
    });
};

