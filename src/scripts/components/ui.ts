import nipplejs from 'nipplejs';
import type { EventData as NippleEvent, Joystick as NippleJoystick } from 'nipplejs';
import { App as CapApp } from '@capacitor/app';

import type { GameStore } from '../core/types';
import { TILE_TYPES, preloadAssets, ANIMATION_DATA, SPRITE_SOURCES } from '../core/assets';
import { buildChunkedFile20x18 } from '../utils/levels';
import { getNetlifyBaseUrl, isTvMode, isDesktopMode } from '../utils/device';
import { QRCodeController } from '../services';
import { TOTAL_LEVELS, TILE_SIZE } from '../core/constants';
import { loadLevel } from './level';
import { generateLevel } from './levelGenerator';
import { playBackgroundMusic, pauseBackgroundMusic, toggleMute, getAudioState, setMusicVolume, setSFXVolume, isBackgroundMusicPlaying } from './audio';
import { loadSettings, saveSettings, updateSettings, applyGraphicsSettings, type ControlMode, type GraphicsStyle } from '../core/settings';
import { applyControlMode } from './mobile-controls';
import { t, setLanguage, getCurrentLanguage, type Language } from '../utils/i18n';

// Helper para guardar settings con idioma incluido
const saveSettingsWithLanguage = async (settings: any) => {
    const lang = (settings as any).language || getCurrentLanguage();
    await saveSettings({ ...settings, language: lang } as any);
};
import { 
    undo, 
    redo, 
    updateUndoRedoButtons, 
    initializeAdvancedEditor
} from './advancedEditor';

// Variable global para el controlador del QR
let qrCodeController: QRCodeController | null = null;

/**
 * Inicializa el controlador del código QR
 * Responsabilidad: configurar el QR para el menú principal
 */
const initializeQRCodeController = (): void => {
    try {
        // Detener controlador anterior si existe
        if (qrCodeController) {
            qrCodeController.stop();
        }

        // Obtener elementos del DOM
        const qrContainer = document.getElementById('qr-code-container') as HTMLElement | null;
        const qrImage = document.getElementById('qr-code-image') as HTMLImageElement | null;
        const qrTitle = document.getElementById('qr-code-title') as HTMLElement | null;
        const qrInstructions = document.getElementById('qr-code-instructions') as HTMLElement | null;

        // Validar que todos los elementos existan
        if (!qrContainer || !qrImage) {
            console.warn('[initializeQRCodeController] Elementos del QR no encontrados en el DOM');
            return;
        }

        // Obtener fuente del QR - usar ruta estática en lugar de módulo de webpack
        const qrSrc = '/qr.png';

        // Crear controlador con inyección de dependencias
        qrCodeController = new QRCodeController(
            {
                container: qrContainer,
                image: qrImage,
                title: qrTitle || undefined,
                instructions: qrInstructions || undefined
            },
            {
                imageSrc: qrSrc,
                titleText: t('menu.qrScanToPlay'),
                instructionsText: t('menu.qrScanInstructions'),
                shouldShowInTV: false // No mostrar en TV por ahora
            }
        );

        // Iniciar controlador
        qrCodeController.start();
    } catch (error) {
        console.error('[initializeQRCodeController] Error al inicializar QR:', error);
    }
};

import { activateDuplicateRowMode, activateDeleteRowMode } from './editor';
import { setupGallery } from './gallery';

/**
 * Configura el modal del QR code y botón mobile
 */
const setupQRCodeModal = (): void => {
    const qrModal = document.getElementById('qr-code-modal');
    const closeBtn = document.getElementById('close-qr-modal');
    const mobileQrBtn = document.getElementById('mobile-qr-btn');
    
    if (!qrModal || !closeBtn || !mobileQrBtn) {
        console.warn('[setupQRCodeModal] Elementos del modal QR no encontrados');
        return;
    }

    // Cerrar modal cuando se presiona la X
    closeBtn.addEventListener('click', () => {
        qrModal.classList.add('hidden');
    });

    // Cerrar modal cuando se presiona fuera de él
    qrModal.addEventListener('click', (e) => {
        if (e.target === qrModal) {
            qrModal.classList.add('hidden');
        }
    });

    // Abrir modal cuando se presiona el botón mobile
    mobileQrBtn.addEventListener('click', () => {
        qrModal.classList.remove('hidden');
    });
};

import { 
    LEGACY_SUPERUSER_EMAIL,
    LEGACY_SUPERUSER_PASSWORD,
    activateLegacyPasswordOverride,
    clearLegacyPasswordOverride,
    isLegacyPasswordOverrideActive,
    isLegacySuperUser,
    registerLegacyUnlockHandler
} from '../utils/legacyAccess';

const requestLegacyPasswordUnlock = async (store: GameStore): Promise<boolean> => {
    const password = await showPromptModal(
        store,
        'Introduce la contraseña para editar la campaña Legacy:'
    );
    if (!password) {
        showNotification(store, '❌ Operación cancelada', 'No se ingresó ninguna contraseña.');
        return false;
    }
    if (password.trim().toLowerCase() === LEGACY_SUPERUSER_PASSWORD) {
        activateLegacyPasswordOverride();
        showNotification(store, '✅ Acceso otorgado', 'Ahora puedes guardar cambios en la campaña Legacy durante esta sesión.');
        return true;
    }
    showNotification(store, '❌ Contraseña incorrecta', 'No tienes permisos para editar la campaña Legacy.');
    return false;
};

registerLegacyUnlockHandler(requestLegacyPasswordUnlock);

type PrimaryUserAction = 'login' | 'logout' | 'editor';

const resolvePrimaryAction = (store: GameStore): { action: PrimaryUserAction; label: string } => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        return {
            action: 'login',
            label: t('menu.loginAction') ?? t('menu.login'),
        };
    }
    if (store.appState === 'playing') {
        return {
            action: 'editor',
            label: t('menu.editAction') ?? t('menu.editor'),
        };
    }
    return {
        action: 'logout',
        label: t('menu.logoutAction') ?? t('user.logout'),
    };
};

const applyHamburgerLabel = (label: string) => {
    const buttonIds = ['hamburger-btn', 'hamburger-btn-mobile'];
    for (const id of buttonIds) {
        const btn = document.getElementById(id) as HTMLButtonElement | null;
        if (!btn) continue;
        const labelEl = btn.querySelector('.hamburger-label') as HTMLElement | null;
        if (labelEl) {
            labelEl.textContent = label;
        } else {
            btn.textContent = label;
        }
        btn.setAttribute('aria-label', label);
    }
};

const updateHamburgerButtonLabel = (_store: GameStore) => {
    applyHamburgerLabel('MENU');
};

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

/**
 * Cierra los paneles del editor (usuario y tools) cuando se abre un modal
 * Esta función debe ser llamada cuando se abre cualquier modal en el editor
 */
const closeEditorPanels = (store: GameStore): void => {
    // Solo cerrar si estamos en modo editor
    if (store.appState !== 'editing') {
        return;
    }
    
    const userPanel = document.getElementById('user-panel');
    const editorPanel = document.getElementById('editor-panel');
    
    if (userPanel && !userPanel.classList.contains('collapsed')) {
        userPanel.classList.add('collapsed');
    }
    
    if (editorPanel && !editorPanel.classList.contains('collapsed')) {
        editorPanel.classList.add('collapsed');
    }
    
    // Actualizar estados visuales de los paneles
    const editorToggleBtn = document.getElementById('editor-toggle') as HTMLButtonElement | null;
    const userPanelToggleBtn = document.getElementById('user-panel-toggle') as HTMLButtonElement | null;
    const editorPanelTitle = document.getElementById('editor-panel-title');
    const userPanelTitle = document.getElementById('user-panel-title');
    
    // Actualizar estado visual del panel del editor
    if (editorPanel && editorToggleBtn && editorPanelTitle) {
        editorToggleBtn.style.display = 'flex';
        const editorIconSpan = editorPanelTitle.querySelector('.toggle-icon-title');
        if (editorIconSpan) {
            (editorIconSpan as HTMLElement).style.display = 'none';
        }
    }
    
    // Actualizar estado visual del panel de usuario
    if (userPanel && userPanelToggleBtn && userPanelTitle) {
        userPanelToggleBtn.style.display = 'flex';
        const userIconSpan = userPanelTitle.querySelector('.toggle-icon-title');
        if (userIconSpan) {
            (userIconSpan as HTMLElement).style.display = 'none';
        }
    }
    
    // Ajustar posición del canvas
    const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
    if (canvasWrapper) {
        canvasWrapper.style.left = '0';
        canvasWrapper.style.width = '100vw';
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
    // Establecer la URL del logo usando ruta estática
    if (ui.heroLogoEl) {
        (ui.heroLogoEl as HTMLImageElement).src = '/hero-logo.png';
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

let tvMenuKeyHandler: ((event: KeyboardEvent) => void) | null = null;
let tvMenuButtons: HTMLButtonElement[] = [];
let tvMenuFocusIndex = 0;
let tvMenuCleanupFns: Array<() => void> = [];
let openPauseMenu: (() => void) | null = null;

const teardownTvMenuNavigation = () => {
    if (tvMenuKeyHandler) {
        window.removeEventListener('keydown', tvMenuKeyHandler, true);
        tvMenuKeyHandler = null;
    }
    tvMenuCleanupFns.forEach(cleanup => cleanup());
    tvMenuCleanupFns = [];
    tvMenuButtons.forEach(btn => btn.classList.remove('tv-focused'));
    tvMenuButtons = [];
    tvMenuFocusIndex = 0;
};

const setTvMenuFocus = (targetIndex: number, options: { programmatic?: boolean } = {}) => {
    if (!tvMenuButtons.length) {
        return;
    }
    const programmatic = options.programmatic ?? true;
    
    // Función helper para obtener el siguiente índice válido (saltando botones deshabilitados)
    const getNextValidIndex = (startIndex: number, direction: number): number => {
        let currentIndex = startIndex;
        let attempts = 0;
        const maxAttempts = tvMenuButtons.length; // Máximo una vuelta completa
        
        // Mover al siguiente índice en la dirección especificada
        while (attempts < maxAttempts) {
            currentIndex = ((currentIndex + direction + tvMenuButtons.length) % tvMenuButtons.length);
            const btn = tvMenuButtons[currentIndex];
            // Solo saltar botones que estén realmente deshabilitados (propiedad disabled)
            // No saltar por la clase 'is-disabled' ya que se usa solo para estilos visuales
            // (por ejemplo, en los botones de idioma donde 'is-disabled' indica que no es el idioma actual pero sigue siendo clickeable)
            if (btn && !btn.disabled) {
                return currentIndex;
            }
            attempts++;
        }
        
        // Si todos están deshabilitados, devolver el índice original
        return startIndex;
    };
    
    const currentIndex = tvMenuFocusIndex;
    
    // Determinar la dirección de movimiento
    // Si targetIndex es currentIndex - 1, mover hacia atrás
    // Si targetIndex es currentIndex + 1, mover hacia adelante
    // Si es cualquier otro valor, calcular la dirección relativa
    let direction: number;
    
    if (targetIndex === currentIndex - 1 || (targetIndex < 0 && currentIndex === 0)) {
        // Movimiento explícito hacia atrás
        direction = -1;
    } else if (targetIndex === currentIndex + 1 || (targetIndex >= tvMenuButtons.length && currentIndex === tvMenuButtons.length - 1)) {
        // Movimiento explícito hacia adelante
        direction = 1;
    } else {
        // Movimiento a un índice específico, calcular dirección
        const normalizedTarget = ((targetIndex % tvMenuButtons.length) + tvMenuButtons.length) % tvMenuButtons.length;
        if (normalizedTarget === currentIndex) {
            direction = 0;
        } else {
            // Calcular la diferencia más corta
            let diff = normalizedTarget - currentIndex;
            if (Math.abs(diff) > tvMenuButtons.length / 2) {
                diff = diff > 0 ? diff - tvMenuButtons.length : diff + tvMenuButtons.length;
            }
            direction = diff < 0 ? -1 : 1;
        }
    }
    
    // Obtener el siguiente índice válido en la dirección determinada
    let normalizedIndex: number;
    if (direction === 0) {
        // Mismo índice, verificar si está deshabilitado
        normalizedIndex = currentIndex;
        const btn = tvMenuButtons[normalizedIndex];
        if (btn && btn.disabled) {
            // Si está deshabilitado, buscar el siguiente válido hacia adelante
            normalizedIndex = getNextValidIndex(normalizedIndex, 1);
        }
    } else {
        // Mover en la dirección determinada, saltando botones deshabilitados
        normalizedIndex = getNextValidIndex(currentIndex, direction);
    }
    
    tvMenuFocusIndex = normalizedIndex;

    tvMenuButtons.forEach((btn, idx) => {
        if (idx === normalizedIndex) {
            btn.classList.add('tv-focused');
            btn.classList.add('highlighted');
            if (programmatic && document.activeElement !== btn) {
                try {
                    (btn as any).focus({ preventScroll: true });
                } catch {
                    btn.focus();
                }
            }
        } else {
            btn.classList.remove('tv-focused');
            btn.classList.remove('highlighted');
        }
    });
};
const initializeTvMenuNavigation = (store: GameStore) => {
    teardownTvMenuNavigation();

    // Ahora la navegación funciona siempre, no solo en modo TV
    const startGameBtn = store.dom.ui.startGameBtn ?? (document.getElementById('start-game-btn') as HTMLButtonElement | null);
    const galleryBtn = document.getElementById('gallery-btn') as HTMLButtonElement | null;
    const levelEditorBtn = store.dom.ui.levelEditorBtn ?? (document.getElementById('level-editor-btn') as HTMLButtonElement | null);
    const shareGameBtn = document.getElementById('share-game-btn') as HTMLButtonElement | null;
    const creditsBtn = document.getElementById('credits-btn') as HTMLButtonElement | null;
    const langEsBtn = document.getElementById('lang-es-btn') as HTMLButtonElement | null;
    const langCaBtn = document.getElementById('lang-ca-btn') as HTMLButtonElement | null;
    const langEnBtn = document.getElementById('lang-en-btn') as HTMLButtonElement | null;

    // Incluir todos los botones del menú: principales y de idioma
    tvMenuButtons = [
        startGameBtn, 
        galleryBtn, 
        levelEditorBtn, 
        shareGameBtn,
        creditsBtn,
        langEsBtn,
        langCaBtn,
        langEnBtn
    ].filter(Boolean) as HTMLButtonElement[];

    if (!tvMenuButtons.length) {
        return;
    }

    tvMenuButtons.forEach((btn, index) => {
        btn.setAttribute('tabindex', '0');
        if (!btn.classList.contains('menu-item')) {
            btn.classList.add('menu-item');
        }
        const handleFocus = () => {
            setTvMenuFocus(index, { programmatic: false });
        };
        btn.addEventListener('focus', handleFocus);
        tvMenuCleanupFns.push(() => btn.removeEventListener('focus', handleFocus));
    });

    const handleKeyDown = (event: KeyboardEvent) => {
        if (store.appState !== 'menu') {
            return;
        }

        const activeElement = document.activeElement as HTMLElement | null;
        const isTargetMenuButton = tvMenuButtons.includes(activeElement as HTMLButtonElement);
        
        // Manejar teclas de flecha normales y también las normalizadas para TV
        const normalizedCode = normalizeTvKeyCode(event);
        const key = event.key;
        const code = event.code;
        
        // Detectar teclas de flecha directamente
        const isArrowKey = key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight' ||
                          code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight' ||
                          normalizedCode === 'ArrowUp' || normalizedCode === 'ArrowDown' || 
                          normalizedCode === 'ArrowLeft' || normalizedCode === 'ArrowRight';
        const isEnterKey = key === 'Enter' || code === 'Enter' || normalizedCode === 'Enter';
        const isNavigableKey = isArrowKey || isEnterKey;

        if (!isNavigableKey) {
            return;
        }

        // No interceptar si el usuario está escribiendo en un input
        if (!isTargetMenuButton && activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) {
            return;
        }

        // Si no hay ningún botón del menú enfocado y se presiona una flecha, enfocar el primero
        if (!isTargetMenuButton && isArrowKey && tvMenuButtons.length > 0) {
            event.preventDefault();
            setTvMenuFocus(0);
            return;
        }

        if (key === 'ArrowLeft' || key === 'ArrowUp' || normalizedCode === 'ArrowLeft' || normalizedCode === 'ArrowUp') {
            event.preventDefault();
            setTvMenuFocus(tvMenuFocusIndex - 1);
            return;
        }

        if (key === 'ArrowRight' || key === 'ArrowDown' || normalizedCode === 'ArrowRight' || normalizedCode === 'ArrowDown') {
            event.preventDefault();
            setTvMenuFocus(tvMenuFocusIndex + 1);
            return;
        }

        if (isEnterKey && tvMenuButtons[tvMenuFocusIndex]) {
            const targetBtn = tvMenuButtons[tvMenuFocusIndex];
            // No hacer clic si el botón está realmente deshabilitado (solo verificar propiedad disabled)
            if (!targetBtn.disabled) {
                event.preventDefault();
                targetBtn.click();
            }
        }
    };

    tvMenuKeyHandler = handleKeyDown;
    window.addEventListener('keydown', tvMenuKeyHandler, true);

    const applyInitialFocus = () => {
        setTvMenuFocus(0);
        const target = tvMenuButtons[0];
        if (target && document.activeElement !== target) {
            try {
                (target as any).focus({ preventScroll: true });
            } catch {
                target.focus();
            }
        }
    };

    // Asegurar que el DOM haya actualizado estilos antes de enfocar
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => applyInitialFocus());
    } else {
        applyInitialFocus();
    }

    // Refuerzo adicional después de un breve retraso (algunos navegadores TV ignoran el focus inmediato)
    const fallbackTimer = setTimeout(applyInitialFocus, 100);
    tvMenuCleanupFns.push(() => clearTimeout(fallbackTimer));
};

export const showMenu = (store: GameStore) => {
    // Cargar nickname desde la base de datos al volver al menú
    loadUserNicknameFromDB().catch(err => console.warn('[Nickname] Error en showMenu:', err));
    
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
    activePauseReasons.clear();
    store.isPaused = false;
    if (store.player) {
        store.player.isFrozen = false;
    }
    setBodyClass('menu');
    updateHamburgerButtonLabel(store);
    
    // Ocultar cruceta de direcciones cuando se vuelve al menú
    const dpadEl = document.getElementById('editor-dpad');
    if (dpadEl) {
        dpadEl.style.display = 'none';
        // Resetear estados de los botones
        const dpadButtons = dpadEl.querySelectorAll('.dpad-btn');
        dpadButtons.forEach(btn => btn.classList.remove('active'));
        // Resetear keys
        store.keys.ArrowUp = false;
        store.keys.ArrowDown = false;
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
    }
    
    // Mostrar selector de idioma (banderas) cuando esté en el menú
    const languageSelectorContainer = document.getElementById('language-selector-container');
    if (languageSelectorContainer) {
        languageSelectorContainer.style.display = 'block';
    }
    
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
    
    // Actualizar textos según idioma actual (después de configurar los elementos básicos)
    updateAllTexts(store);
    
    // Configurar controlador del código QR
    initializeQRCodeController();
    
    // Configurar modal del QR code
    setupQRCodeModal();

    if (mobileControlsEl) {
        if (isTvMode()) {
            mobileControlsEl.dataset.active = 'false';
            mobileControlsEl.style.display = 'none';
        } else if ('ontouchstart' in window) {
            mobileControlsEl.dataset.active = 'false';
            mobileControlsEl.style.removeProperty('display');
        }
    }
    if (store.joystickManager) {
        store.joystickManager.destroy();
        store.joystickManager = null;
    }

    initializeTvMenuNavigation(store);

    // Actualizar botón de editor según estado de login
    const updateEditorButton = () => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
        if (levelEditorBtn) {
            levelEditorBtn.textContent = isLoggedIn ? t('menu.editor') : t('menu.login');
        }
        updateHamburgerButtonLabel(store);
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
    if (!canvas || !canvasWrapper || !('ontouchstart' in window) || isTvMode()) {
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
    if (!('ontouchstart' in window) || isTvMode()) {
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
    updateHamburgerButtonLabel(store);
    
    teardownTvMenuNavigation();
    
    // Ocultar selector de idioma (banderas) cuando esté en juego
    const languageSelectorContainer = document.getElementById('language-selector-container');
    if (languageSelectorContainer) {
        languageSelectorContainer.style.display = 'none';
    }
    // Ocultar QR code cuando se inicia el juego
    if (qrCodeController) {
        qrCodeController.stop();
        qrCodeController = null;
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
    if (store.dom.ui.mobileControlsEl) {
        const mobileControlsEl = store.dom.ui.mobileControlsEl;
        if (isTvMode()) {
            mobileControlsEl.dataset.active = 'false';
            mobileControlsEl.style.display = 'none';
            store.isLaserSticky = false;
            store.keys.Space = false;
            store.keys.ArrowDown = false;
        } else if ('ontouchstart' in window) {
            mobileControlsEl.dataset.active = 'false';
            mobileControlsEl.style.removeProperty('display');
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
        // Si hay una campaña seleccionada, asegurar que todos sus niveles estén disponibles
        let maxLevelIndex = Math.max(store.levelDataStore.length - 1, store.initialLevels.length - 1);
        
        if (store.currentCampaignId) {
            const { getCampaignLevelIndices } = require('../utils/campaigns');
            const campaignLevelIndices = getCampaignLevelIndices(store, store.currentCampaignId);
            if (campaignLevelIndices.length > 0) {
                maxLevelIndex = Math.max(maxLevelIndex, ...campaignLevelIndices);
            }
        }
        
        if (startIndex !== undefined) {
            maxLevelIndex = Math.max(maxLevelIndex, startIndex);
        }
        
        // Construir levelDesigns asegurando que todos los índices necesarios existan
        store.levelDesigns = [];
        for (let i = 0; i <= maxLevelIndex; i++) {
            if (store.levelDataStore[i] && store.levelDataStore[i].length > 0) {
                // Usar nivel de levelDataStore
                store.levelDesigns[i] = store.levelDataStore[i].map(row => row.join(''));
            } else if (store.initialLevels[i]) {
                // Usar nivel de initialLevels como fallback
                // initialLevels es string[][], cada nivel es string[] (filas como strings)
                const level = store.initialLevels[i];
                // level ya es string[] (formato correcto para levelDesigns)
                store.levelDesigns[i] = level;
            } else {
                // Si no hay nivel disponible, crear uno vacío como último recurso
                console.warn(`[startGame] Nivel ${i} no encontrado en levelDataStore ni initialLevels`);
                store.levelDesigns[i] = [];
            }
        }
    }
    // Establecer índice inicial
    store.currentLevelIndex = startIndex ?? 0;
    
    // Validar que el nivel existe antes de continuar
    if (!store.levelDesigns[store.currentLevelIndex] || store.levelDesigns[store.currentLevelIndex].length === 0) {
        console.error(`[startGame] Error: El nivel ${store.currentLevelIndex} no existe o está vacío`);
        console.error(`[startGame] levelDesigns.length: ${store.levelDesigns.length}, levelDataStore.length: ${store.levelDataStore.length}, initialLevels.length: ${store.initialLevels.length}`);
        // Intentar usar el nivel 0 como fallback
        if (store.levelDesigns[0] && store.levelDesigns[0].length > 0) {
            store.currentLevelIndex = 0;
        } else {
            // Si ni siquiera el nivel 0 existe, mostrar error y volver al menú
            import('./ui').then(({ showNotification }) => {
                showNotification(store, 'Error', 'No se pudo cargar el nivel. Por favor, intenta de nuevo.');
                showMenu(store);
            });
            return;
        }
    }
    
    // Asegurar que levelNames tiene el tamaño correcto
    // Si los levelNames no coinciden con levelDesigns, generarlos
    if (store.levelNames.length !== store.levelDesigns.length) {
        store.levelNames = store.levelDesigns.map((_, index) => `Level ${index + 1}`);
    }
    
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

/**
 * NUEVO: Sistema reactivo centralizado de nickname
 * - Carga desde BD automáticamente
 * - Actualiza en TODOS los elementos de UI
 */
const nicknameManager = {
    currentNickname: '',
    
    async loadFromDB(): Promise<string> {
        try {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (!isLoggedIn) return 'Usuario';

            // Obtener token de Auth0
            const Auth0Manager = await initializeAuth0();
            const token = await Auth0Manager.getAccessToken();
            if (!token) {
                console.warn('[NicknameManager] No se pudo obtener token de Auth0');
                console.warn('[NicknameManager] isLoggedIn:', localStorage.getItem('isLoggedIn'));
                console.warn('[NicknameManager] auth0_access_token en localStorage:', localStorage.getItem('auth0_access_token') ? 'presente' : 'ausente');
                return 'Usuario';
            }

            console.log('[NicknameManager] Token obtenido (primeros 20 caracteres):', token.substring(0, 20) + '...');

            const { getNetlifyBaseUrl } = await import('../utils/device');
            const baseUrl = getNetlifyBaseUrl();
            console.log('[NicknameManager] Haciendo petición a:', `${baseUrl}/.netlify/functions/profile`);

            const res = await fetch(`${baseUrl}/.netlify/functions/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                console.warn('[NicknameManager] Error obteniendo perfil:', res.status, res.statusText);
                return 'Usuario';
            }

            const profile = await res.json();
            console.log('[NicknameManager] Perfil cargado de BD:', profile.data?.nickname);
            return profile.data?.nickname || 'Usuario';
        } catch (error) {
            console.error('[NicknameManager] Error cargando de BD:', error);
            return 'Usuario';
        }
    },

    async saveToDB(nickname: string): Promise<boolean> {
        try {
            // Obtener token de Auth0
            const Auth0Manager = await initializeAuth0();
            const token = await Auth0Manager.getAccessToken();
            if (!token) {
                console.warn('[NicknameManager] No se pudo obtener token de Auth0 para guardar');
                console.warn('[NicknameManager] isLoggedIn:', localStorage.getItem('isLoggedIn'));
                console.warn('[NicknameManager] auth0_access_token en localStorage:', localStorage.getItem('auth0_access_token') ? 'presente' : 'ausente');
                return false;
            }

            console.log('[NicknameManager] Token obtenido para guardar (primeros 20 caracteres):', token.substring(0, 20) + '...');

            const { getNetlifyBaseUrl } = await import('../utils/device');
            const baseUrl = getNetlifyBaseUrl();
            console.log('[NicknameManager] Guardando nickname en:', `${baseUrl}/.netlify/functions/profile`);

            const res = await fetch(`${baseUrl}/.netlify/functions/profile`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ nickname })
            });

            if (res.ok) {
                console.log('[NicknameManager] ✅ Nickname guardado en BD:', nickname);
                return true;
            } else {
                console.error('[NicknameManager] Error guardando nickname:', res.status, res.statusText);
            }
        } catch (error) {
            console.error('[NicknameManager] Error guardando en BD:', error);
        }
        return false;
    },

    async updateAllUI(nickname?: string): Promise<void> {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        // Si se proporciona un nickname explícito, usarlo
        if (nickname) {
            this.currentNickname = nickname;
        } else if (isLoggedIn && !this.currentNickname) {
            // Si el usuario está logueado pero no hay nickname cargado, cargarlo desde la BD
            console.log('[NicknameManager] No hay nickname cargado, cargando desde BD...');
            const loadedNickname = await this.loadFromDB();
            this.currentNickname = loadedNickname;
        }
        
        const nicknameToUse = nickname || this.currentNickname || 'Usuario';

        // Actualizar TODOS los elementos
        // 1. user-panel-nickname (dentro de user-panel-title)
        const userPanelNickname = document.getElementById('user-panel-nickname');
        if (userPanelNickname) {
            userPanelNickname.textContent = isLoggedIn ? nicknameToUse.toUpperCase() : 'USER';
            console.log('[NicknameManager] ✅ user-panel-nickname actualizado:', nicknameToUse.toUpperCase());
        } else {
            console.warn('[NicknameManager] ⚠️ user-panel-nickname no encontrado');
        }

        // 2. username-display
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = isLoggedIn ? nicknameToUse : 'Usuario';
        }

        // 3. profile-nickname-input (input del modal de perfil)
        const profileNicknameInput = document.getElementById('profile-nickname-input') as HTMLInputElement | null;
        if (profileNicknameInput) {
            profileNicknameInput.value = isLoggedIn ? nicknameToUse : '';
            console.log('[NicknameManager] ✅ profile-nickname-input actualizado:', nicknameToUse);
        } else {
            console.warn('[NicknameManager] ⚠️ profile-nickname-input no encontrado');
        }

        console.log('[NicknameManager] ✅ UI actualizado con:', nicknameToUse);
    },

    async initialize(): Promise<void> {
        const nickname = await this.loadFromDB();
        await this.updateAllUI(nickname);
    }
};

/**
 * Gestor de autenticación mejorado
 * - Maneja login/logout
 * - Carga "Legacy" por defecto al cambiar usuario
 * - Sincroniza el nickname
 */
const authManager = {
    async handleLoginSuccess(user: any, store?: GameStore): Promise<void> {
        try {
            console.log('[AuthManager] ✅ Login exitoso para:', user?.email);
            
            // 1. Marcar como logueado
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUserEmail', user?.email || '');
            
            // 2. Cargar nickname desde BD
            await nicknameManager.initialize();
            
            // 3. Cargar configuración desde BD
            if (store) {
                try {
                    const settings = await loadSettings();
                    store.settings = settings;
                    applyGraphicsSettings(store.settings.graphics);
                    setMusicVolume(store.settings.audio.musicVolume);
                    setSFXVolume(store.settings.audio.sfxVolume);
                    console.log('[AuthManager] ✅ Configuración cargada desde BD después del login');
                } catch (error) {
                    console.warn('[AuthManager] Error cargando configuración después del login:', error);
                }
            }
            
            // 4. Cargar campañas desde el servidor (si hay store disponible)
            if (store) {
                try {
                    const { loadCampaignsFromServer } = await import('../utils/campaigns');
                    const loaded = await loadCampaignsFromServer(store);
                    if (loaded) {
                        console.log('[AuthManager] ✅ Campañas cargadas desde el servidor');
                    } else {
                        console.log('[AuthManager] ℹ️ No se encontraron campañas en el servidor (primera vez)');
                    }
                } catch (campaignError) {
                    console.error('[AuthManager] Error cargando campañas:', campaignError);
                }
            }
            
            // 5. Cargar "Legacy" como campaña por defecto
            console.log('[AuthManager] 📋 Configurando campaña "Legacy" por defecto...');
            localStorage.setItem('selectedCampaign', 'legacy');
            localStorage.setItem('selectedCampaignName', 'Legacy');
            
            // CRÍTICO: Establecer la campaña Legacy como activa en el store SIEMPRE al hacer login
            if (store) {
                const DEFAULT_CAMPAIGN_ID = 'default'; // ID de la campaña Legacy
                // SIEMPRE establecer Legacy, incluso si había otra campaña seleccionada
                store.currentCampaignId = DEFAULT_CAMPAIGN_ID;
                console.log('[AuthManager] ✅ Campaña Legacy establecida como activa (siempre al hacer login):', store.currentCampaignId);
                
                // Sincronizar el selector de niveles para mostrar los niveles de Legacy
                if (store.appState === 'editing') {
                    const { syncLevelSelectorForCampaign } = await import('./campaigns-ui');
                    syncLevelSelectorForCampaign(store);
                }
            }
            
            console.log('[AuthManager] ✅ Usuario autenticado completamente');
        } catch (error) {
            console.error('[AuthManager] Error en handleLoginSuccess:', error);
        }
    },

    async handleLogout(store?: GameStore): Promise<void> {
        try {
            console.log('[AuthManager] 🚪 Logout ejecutado');
            
            // CRÍTICO: Si estamos en el editor, cerrarlo y volver al menú
            if (store && store.appState === 'editing') {
                console.log('[AuthManager] Cerrando editor y volviendo al menú...');
                showMenu(store);
            }
            
            // Limpiar datos de usuario
            localStorage.setItem('isLoggedIn', 'false');
            localStorage.removeItem('currentUserEmail');
            localStorage.removeItem('username');
            localStorage.removeItem('userEmail');
            
            // Resetear nickname en UI
            const userPanelNickname = document.getElementById('user-panel-nickname');
            if (userPanelNickname) {
                userPanelNickname.textContent = 'USER';
            }
            
            // Actualizar botón del editor
            const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
            if (levelEditorBtn) {
                levelEditorBtn.textContent = t('menu.login');
            }
            
            // Actualizar hamburger button
            if (store) {
                updateHamburgerButtonLabel(store);
            }
            
            console.log('[AuthManager] ✅ Logout completado');
        } catch (error) {
            console.error('[AuthManager] Error en handleLogout:', error);
        }
    },

    /**
     * Verifica si el usuario cambió de cuenta
     * @returns true si cambió de usuario
     */
    didUserChange(newUserEmail: string): boolean {
        const currentEmail = localStorage.getItem('currentUserEmail');
        const changed = currentEmail && currentEmail !== newUserEmail;
        if (changed) {
            console.log('[AuthManager] 🔄 Cambio de usuario detectado:', currentEmail, '→', newUserEmail);
        }
        return changed || false;
    }
};

/**
 * DEPRECATED: Usar nicknameManager.initialize() en su lugar
 * Se mantiene por compatibilidad
 */
const refreshNicknameUI = async (): Promise<void> => {
    await nicknameManager.initialize();
};

/**
 * DEPRECATED: Usar nicknameManager.initialize() en su lugar
 */
const loadUserNicknameFromDB = async (): Promise<void> => {
    await nicknameManager.initialize();
};

export const startEditor = async (store: GameStore, preserveCurrentLevel: boolean = false, skipAuthCheck: boolean = false) => {
    // CRÍTICO: Verificar autenticación antes de permitir acceso al editor
    if (!skipAuthCheck) {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            console.warn('[startEditor] ❌ Acceso denegado: usuario no autenticado');
            // Mostrar modal de autenticación
            const modal = document.getElementById('auth-choice-modal');
            if (modal) {
                // Cerrar paneles del editor cuando se abre el modal
                closeEditorPanels(store);
                modal.classList.remove('hidden');
                modal.style.display = 'flex';
                console.log('[startEditor] Modal de autenticación mostrado');
            }
            // Volver al menú si estamos en otro estado
            if (store.appState !== 'menu') {
                showMenu(store);
            }
            return;
        }
    }
    
    // Cargar nickname desde la base de datos al entrar al editor
    await loadUserNicknameFromDB();
    
    // Si NO se preserva el nivel actual, siempre cargar el nivel 1 de Legacy
    if (!preserveCurrentLevel) {
        const DEFAULT_CAMPAIGN_ID = 'default'; // ID de la campaña Legacy
        store.currentCampaignId = DEFAULT_CAMPAIGN_ID;
        console.log('[startEditor] ✅ Cargando nivel 1 de Legacy (inicio del editor)');
        
        // Cargar el nivel 1 (índice 0) en el editor
        if (store.levelDataStore[0]) {
            store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[0]));
        } else if (store.initialLevels[0]) {
            store.editorLevel = (store.initialLevels[0] as string[]).map(row => row.split(''));
        }
        
        // Establecer el selector en el nivel 1
        if (store.dom.ui.levelSelectorEl) {
            store.dom.ui.levelSelectorEl.value = '0';
        }
    } else {
        // Si se preserva el nivel, mantener la campaña actual si existe
        // Si no hay campaña seleccionada y el usuario está logueado, usar Legacy
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn && !store.currentCampaignId) {
            const DEFAULT_CAMPAIGN_ID = 'default'; // ID de la campaña Legacy
            store.currentCampaignId = DEFAULT_CAMPAIGN_ID;
            console.log('[startEditor] ✅ Campaña Legacy establecida como activa para usuario logueado');
        }
    }
    
    // Cargar editor de forma lazy
    const { setupEditorState, bindEditorCanvas } = await import('./editor');
    // Solo llamar setupEditorState si no se preserva el nivel (ya lo configuramos arriba)
    if (!preserveCurrentLevel) {
        // setupEditorState carga el nivel 0, pero ya lo configuramos arriba, así que solo inicializamos el estado básico
        store.selectedTile = '1';
        store.mouse = { x: 0, y: 0, gridX: 0, gridY: 0, isDown: false };
        const { initializeAdvancedEditor } = await import('./advancedEditor');
        initializeAdvancedEditor(store);
    } else {
        setupEditorState(store);
    }
    bindEditorCanvas(store);
    teardownTvMenuNavigation();
    
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
    
    // CRÍTICO: Si el usuario está logueado, asegurar que Legacy sea la campaña activa
    const isLoggedInForCampaign = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedInForCampaign && !store.currentCampaignId) {
        const DEFAULT_CAMPAIGN_ID = 'default'; // ID de la campaña Legacy
        store.currentCampaignId = DEFAULT_CAMPAIGN_ID;
        console.log('[startEditor] ✅ Campaña Legacy establecida como activa (selector de niveles)');
    }
    
    // Actualizar el selector de niveles
    // Si hay una campaña seleccionada, mostrar solo los niveles de esa campaña
    if (store.currentCampaignId) {
        import('./campaigns-ui').then(async ({ syncLevelSelectorForCampaign }) => {
            syncLevelSelectorForCampaign(store);
            // Si no se preserva el nivel, asegurar que el selector esté en el nivel 1 (índice 0)
            if (!preserveCurrentLevel && store.dom.ui.levelSelectorEl) {
                const { getCampaignLevelIndices } = await import('../utils/campaigns');
                const levelIndices = getCampaignLevelIndices(store, store.currentCampaignId);
                if (levelIndices.length > 0 && levelIndices[0] === 0) {
                    store.dom.ui.levelSelectorEl.value = '0';
                }
            }
        }).catch(() => {
            // Si falla, usar el método normal
            syncLevelSelector(store);
            if (!preserveCurrentLevel && store.dom.ui.levelSelectorEl) {
                store.dom.ui.levelSelectorEl.value = '0';
            }
        });
    } else {
        // Si no hay campaña seleccionada, mostrar todos los niveles
        syncLevelSelector(store);
        if (!preserveCurrentLevel && store.dom.ui.levelSelectorEl) {
            store.dom.ui.levelSelectorEl.value = '0';
        }
    }
    
    store.appState = 'editing';
    setBodyClass('editing');
    updateHamburgerButtonLabel(store);
    
    // Ocultar selector de idioma (banderas) cuando esté en editor
    const languageSelectorContainer = document.getElementById('language-selector-container');
    if (languageSelectorContainer) {
        languageSelectorContainer.style.display = 'none';
    }
    // Ocultar QR code cuando se inicia el editor
    if (qrCodeController) {
        qrCodeController.stop();
        qrCodeController = null;
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
        
        // CRÍTICO: Actualizar nickname usando nicknameManager para mantener consistencia
        // Esto asegura que user-panel-nickname esté "observando" el nickname
        await nicknameManager.updateAllUI();
        
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const { getUserStorage } = await import('../utils/storage');
        const nickname = nicknameManager.currentNickname || getUserStorage('nickname') || localStorage.getItem('username') || 'Usuario';
        
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
        
        const userPanelAvatar = document.getElementById('user-panel-avatar');
        
        // Actualizar avatar si está guardado (default: Player)
        const savedAvatar = getUserStorage('avatar') || 'P';
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
        const { getUserStorage } = await import('../utils/storage');
        const nickname = getUserStorage('nickname') || localStorage.getItem('username');
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
        bindSectionToggle('save-section-toggle', 'save-section-arrow', 'save-section-content');
        bindSectionToggle('actions-section-toggle', 'actions-section-arrow', 'actions-section-content');
        
        // Para la sección de campaña, solo toggle normal (el botón interno abre el modal)
        bindSectionToggle('campaign-section-toggle', 'campaign-section-arrow', 'campaign-section-content');
        
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
        
        // Botón de campaña (dentro de la sección de campaña)
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
    
    // Inicializar la cruceta de direcciones (D-Pad) para mobile
    const isMobile = window.innerWidth <= 1024;
    const dpadEl = document.getElementById('editor-dpad');
    if (dpadEl && isMobile) {
        setupEditorDpad(store);
    }
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
        // En el editor, usar el índice del selector en lugar de currentLevelIndex
        let levelIndexToUse = store.currentLevelIndex;
        if (store.appState === 'editing' && store.dom.ui.levelSelectorEl) {
            const selectedIndex = parseInt(store.dom.ui.levelSelectorEl.value ?? '0', 10);
            if (!isNaN(selectedIndex)) {
                levelIndexToUse = selectedIndex;
            }
        }
        
        // Obtener nombre del nivel desde la campaña
        import('../utils/campaigns').then(({ getCurrentCampaign, getCampaignLevelIndices, getLevelNameFromCampaign }) => {
            // Intentar obtener el nombre del nivel desde la campaña
            const levelName = getLevelNameFromCampaign(store, levelIndexToUse);
            if (levelName) {
                levelCountEl.textContent = levelName;
            } else {
                // Si no hay nombre, mostrar el número de orden en la campaña
                const campaign = getCurrentCampaign(store);
                if (campaign && campaign.levels.length > 0) {
                    const levelIndices = getCampaignLevelIndices(store, campaign.id);
                    const positionInCampaign = levelIndices.findIndex(idx => idx === levelIndexToUse);
                    if (positionInCampaign >= 0) {
                        levelCountEl.textContent = `${positionInCampaign + 1}`;
                    } else {
                        levelCountEl.textContent = `${levelIndexToUse + 1}`;
                    }
                } else {
                    levelCountEl.textContent = `${levelIndexToUse + 1}`;
                }
            }
        }).catch(() => {
            levelCountEl.textContent = `${levelIndexToUse + 1}`;
        });
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
            // Fix: Ajustar offset Y por 1 pixel para evitar sangrado del frame superior
            const sourceY = row * frameHeight + 1;
            
            // Escalar para que quepa en el canvas de la paleta
            const scaleX = canvas.width / frameWidth;
            const scaleY = canvas.height / (frameHeight - 2); // Usar altura corregida
            const scale = Math.min(scaleX, scaleY);
            const scaledWidth = frameWidth * scale;
            const scaledHeight = (frameHeight - 2) * scale;
            const offsetX = (canvas.width - scaledWidth) / 2;
            const offsetY = (canvas.height - scaledHeight) / 2;
            
            ctx.drawImage(
                tentacleSprite,
                sourceX, sourceY, frameWidth, frameHeight - 2,
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

const activePauseReasons = new Set<string>();

const TV_KEY_CODE_ALIASES: Record<string, string> = {
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    Enter: 'Enter',
    NumpadEnter: 'Enter',
    NumpadCenter: 'Enter',
    Numpad5: 'Enter',
    Select: 'Enter',
    Numpad8: 'ArrowUp',
    Numpad2: 'ArrowDown',
    Numpad4: 'ArrowLeft',
    Numpad6: 'ArrowRight',
    Space: 'Space',
    Spacebar: 'Space',
    MediaPlayPause: 'Space',
    GamepadButton0: 'Space',
    GamepadButton1: 'Space',
    GamepadButton2: 'Enter',
    GamepadButton3: 'Escape',
    Backspace: 'Escape',
    Escape: 'Escape',
    BrowserBack: 'Escape'
};

const TV_KEY_VALUE_ALIASES: Record<string, string> = {
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
    Enter: 'Enter',
    Return: 'Enter',
    Confirm: 'Enter',
    Execute: 'Enter',
    Go: 'Enter',
    Accept: 'Enter',
    OK: 'Enter',
    Ok: 'Enter',
    Select: 'Enter',
    Center: 'Enter',
    ' ': 'Space',
    Spacebar: 'Space',
    Play: 'Space',
    Pause: 'Space',
    'Play/Pause': 'Space',
    MediaPlayPause: 'Space',
    Back: 'Escape'
};

const TV_LEGACY_KEYCODE_ALIASES: Record<number, string> = {
    19: 'ArrowUp',
    20: 'ArrowDown',
    21: 'ArrowLeft',
    22: 'ArrowRight',
    13: 'Enter',
    23: 'Enter',
    32: 'Space',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    66: 'Enter',
    67: 'Escape',
    85: 'Space',
    96: 'Enter',
    461: 'Escape',
    8: 'Escape'
};

const resolveLegacyTvCode = (event: KeyboardEvent): string | null => {
    const legacyCode = (event as KeyboardEvent & { keyCode?: number; which?: number }).keyCode
        ?? (event as KeyboardEvent & { keyCode?: number; which?: number }).which;
    if (typeof legacyCode === 'number') {
        return TV_LEGACY_KEYCODE_ALIASES[legacyCode] ?? null;
    }
    return null;
};

const normalizeTvKeyCode = (event: KeyboardEvent): string => {
    const code = event.code;
    const key = event.key;
    const legacyMatch = resolveLegacyTvCode(event);
    const directionalKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

    const normalizedFromCode = (() => {
        if (code && code !== 'Unidentified') {
            return TV_KEY_CODE_ALIASES[code] ?? code;
        }
        return null;
    })();

    const normalizedFromKey = (() => {
        if (key && key !== 'Unidentified') {
            return TV_KEY_VALUE_ALIASES[key] ?? key;
        }
        return null;
    })();

    if (legacyMatch && directionalKeys.has(legacyMatch)) {
        if (!normalizedFromCode || normalizedFromCode === 'Enter' || normalizedFromCode === 'Space' || normalizedFromCode === normalizedFromKey) {
            return legacyMatch;
        }
    }

    if (normalizedFromCode && normalizedFromCode !== 'Unidentified') {
        return normalizedFromCode;
    }

    if (normalizedFromKey && normalizedFromKey !== 'Unidentified') {
        return normalizedFromKey;
    }

    if (legacyMatch) {
        return legacyMatch;
    }

    return code && code !== 'Unidentified'
        ? code
        : key && key !== 'Unidentified'
            ? key
            : 'Unidentified';
};

type TvInputAction = 'up' | 'down' | 'left' | 'right' | 'select' | 'fire' | 'back' | 'unknown';

const TV_ACTION_FROM_KEY_NAME: Record<string, TvInputAction> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    Enter: 'select',
    NumpadEnter: 'select',
    Select: 'select',
    Center: 'select',
    OK: 'select',
    Ok: 'select',
    Space: 'fire',
    Spacebar: 'fire',
    MediaPlayPause: 'fire',
    Play: 'fire',
    Pause: 'fire',
    'Play/Pause': 'fire',
    Escape: 'back',
    BrowserBack: 'back',
    Backspace: 'back',
    Back: 'back'
};

const TV_ACTION_FROM_KEYCODE: Record<number, TvInputAction> = {
    19: 'up',
    38: 'up',
    20: 'down',
    40: 'down',
    21: 'left',
    37: 'left',
    22: 'right',
    39: 'right',
    23: 'select',
    13: 'select',
    96: 'select',
    66: 'select',
    86: 'fire',
    85: 'fire',
    160: 'fire',
    164: 'fire',
    32: 'fire',
    8: 'back',
    461: 'back',
    27: 'back',
    111: 'back'
};

const getEventKeyCode = (event: KeyboardEvent): number | null => {
    const keyCode = (event as KeyboardEvent & { keyCode?: number; which?: number }).keyCode
        ?? (event as KeyboardEvent & { keyCode?: number; which?: number }).which;
    return typeof keyCode === 'number' ? keyCode : null;
};

const resolveTvInputAction = (event: KeyboardEvent): TvInputAction => {
    const code = event.code && event.code !== 'Unidentified'
        ? TV_KEY_CODE_ALIASES[event.code] ?? event.code
        : null;
    if (code) {
        const actionFromCode = TV_ACTION_FROM_KEY_NAME[code];
        if (actionFromCode) {
            return actionFromCode;
        }
    }

    const key = event.key && event.key !== 'Unidentified'
        ? TV_KEY_VALUE_ALIASES[event.key] ?? event.key
        : null;
    if (key) {
        const actionFromKey = TV_ACTION_FROM_KEY_NAME[key];
        if (actionFromKey) {
            return actionFromKey;
        }
    }

    const legacyCode = getEventKeyCode(event);
    if (legacyCode !== null) {
        const actionFromLegacy = TV_ACTION_FROM_KEYCODE[legacyCode];
        if (actionFromLegacy) {
            return actionFromLegacy;
        }
    }

    return 'unknown';
};

const handleTvMenuControls = (store: GameStore, action: TvInputAction, isPressed = true): boolean => {
    if (!tvMenuButtons.length) {
        initializeTvMenuNavigation(store);
    }
    if (!tvMenuButtons.length || action === 'unknown' || action === 'fire') {
        return action !== 'unknown';
    }

    if (!isPressed) {
        return action === 'select' || action === 'back';
    }

    if (action === 'down' || action === 'right') {
        setTvMenuFocus(tvMenuFocusIndex + 1);
        return true;
    }
    if (action === 'up' || action === 'left') {
        setTvMenuFocus(tvMenuFocusIndex - 1);
        return true;
    }
    if (action === 'select') {
        const current = tvMenuButtons[tvMenuFocusIndex];
        if (current) {
            current.click();
            return true;
        }
    }
    if (action === 'back') {
        showMenu(store);
        return true;
    }
    return false;
};

/**
 * Procesa acciones del gamepad para navegación en el menú
 * Convierte acciones del gamepad a TvInputAction y las procesa
 */
export const handleGamepadMenuActions = (store: GameStore, gamepadAction: { direction: 'up' | 'down' | 'left' | 'right' | null; select: boolean; back: boolean }): boolean => {
    if (!gamepadAction) {
        return false;
    }
    
    // Procesar dirección del D-Pad
    if (gamepadAction.direction) {
        let tvAction: TvInputAction;
        switch (gamepadAction.direction) {
            case 'up':
                tvAction = 'up';
                break;
            case 'down':
                tvAction = 'down';
                break;
            case 'left':
                tvAction = 'left';
                break;
            case 'right':
                tvAction = 'right';
                break;
            default:
                return false;
        }
        return handleTvMenuControls(store, tvAction, true);
    }
    
    // Procesar botón select
    if (gamepadAction.select) {
        return handleTvMenuControls(store, 'select', true);
    }
    
    // Procesar botón back
    if (gamepadAction.back) {
        return handleTvMenuControls(store, 'back', true);
    }
    
    return false;
};

const handleTvGameplayControls = (store: GameStore, action: TvInputAction, isPressed: boolean): boolean => {
    switch (action) {
        case 'up':
            store.keys.ArrowUp = isPressed;
            if (isPressed) {
                store.keys.ArrowDown = false;
            }
            return true;
        case 'down':
            store.keys.ArrowDown = isPressed;
            if (isPressed) {
                store.keys.ArrowUp = false;
            }
            return true;
        case 'left':
            if (isPressed) {
                store.keys.ArrowLeft = true;
                store.keys.ArrowRight = false;
            } else {
                store.keys.ArrowLeft = false;
            }
            return true;
        case 'right':
            if (isPressed) {
                store.keys.ArrowRight = true;
                store.keys.ArrowLeft = false;
            } else {
                store.keys.ArrowRight = false;
            }
            return true;
        case 'select':
        case 'fire':
            // En modo TV, el botón OK/Select controla el láser
            store.keys.Space = isPressed;
            return true;
        case 'back':
            if (isPressed) {
                if (store.appState === 'playing') {
                    openPauseMenu?.();
                } else {
                    showMenu(store);
                }
            }
            return true;
        default:
            return false;
    }
};

const TV_NAVIGATION_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter']);
const TV_FIRE_KEYS = new Set(['Enter', 'Space']);

const pauseGame = (store: GameStore, reason: string, options?: { freezePlayer?: boolean }) => {
    const wasEmpty = activePauseReasons.size === 0;
    activePauseReasons.add(reason);
    if (wasEmpty) {
        store.isPaused = true;
        if (options?.freezePlayer !== false && store.player) {
            store.player.isFrozen = true;
        }
        pauseBackgroundMusic();
    } else if (options?.freezePlayer && store.player) {
        store.player.isFrozen = true;
    }
};

const resumeGame = (store: GameStore, reason: string, options?: { unfreezePlayer?: boolean }) => {
    if (!activePauseReasons.has(reason)) {
        return;
    }
    activePauseReasons.delete(reason);
    if (activePauseReasons.size === 0) {
        store.isPaused = false;
        if (options?.unfreezePlayer !== false && store.player) {
            store.player.isFrozen = false;
        }
        if (store.appState === 'playing' && store.gameState === 'playing') {
            playBackgroundMusic().catch(() => {});
        }
    }
};

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

        // Para paredes aplastantes, crear estructura especial con texto arriba y flecha abajo
        if (key === 'H' || key === 'J') {
            const labelContainer = document.createElement('div');
            labelContainer.className = 'tile-label-container';
            labelContainer.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 2px;';
            
            const label = document.createElement('span');
            label.className = 'tile-label';
            label.textContent = name;
            label.style.cssText = 'font-size: 0.7rem;';
            
            const arrow = document.createElement('span');
            arrow.className = 'tile-arrow';
            // Intercambiar flechas: H tiene → y J tiene ←
            arrow.textContent = key === 'H' ? '→' : '←';
            arrow.style.cssText = 'font-size: 1rem !important';
            
            labelContainer.appendChild(label);
            labelContainer.appendChild(arrow);
            
            tileDiv.appendChild(preview);
            tileDiv.appendChild(labelContainer);
        } else {
            const label = document.createElement('span');
            label.className = 'tile-label';
            label.textContent = name;

            tileDiv.appendChild(preview);
            tileDiv.appendChild(label);
        }
        
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

/**
 * Configura el manejo de deep links de autenticación para la app móvil.
 * CRÍTICO: Esto DEBE ejecutarse ANTES de cualquier login para interceptar callbacks.
 * Cuando la app recibe un callback de autenticación (com.newhero.game://auth-callback?...),
 * procesa el token y completa el login en la APK (NO en web).
 */
const setupAuthDeepLink = (store: GameStore) => {
    // CRÍTICO: Logs inmediatos para verificar que se ejecuta
    console.log('🔵🔵🔵 [setupAuthDeepLink] ========== INICIANDO ==========');
    console.log('🔵🔵🔵 [setupAuthDeepLink] window:', typeof window);
    console.log('🔵🔵🔵 [setupAuthDeepLink] window.Capacitor:', typeof (window as any).Capacitor);
    
    // Detectar si estamos en Capacitor
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
    console.log('🔵🔵🔵 [setupAuthDeepLink] CRÍTICO: Inicializando setup de deep link, isCapacitor:', isCapacitor);
    console.log('🔵🔵🔵 [setupAuthDeepLink] window.Capacitor:', (window as any).Capacitor);
    console.log('🔵🔵🔵 [setupAuthDeepLink] User Agent:', navigator.userAgent);
    
    // También verificar si estamos en Android
    const isAndroid = /Android/i.test(navigator.userAgent);
    console.log('🔵🔵🔵 [setupAuthDeepLink] isAndroid:', isAndroid);
    
    if (!isCapacitor) {
        console.log('🔴🔴🔴 [setupAuthDeepLink] No es Capacitor, saltando setup de deep link');
        console.log('🔴🔴🔴 [setupAuthDeepLink] Pero isAndroid es:', isAndroid);
        // Si estamos en Android pero no detectamos Capacitor, puede ser un problema de timing
        if (isAndroid) {
            console.log('🔴🔴🔴 [setupAuthDeepLink] ⚠️ Android detectado pero Capacitor no disponible. Esperando...');
            // Intentar de nuevo después de un delay
            setTimeout(() => {
                console.log('🔴🔴🔴 [setupAuthDeepLink] Reintentando después de delay...');
                setupAuthDeepLink(store);
            }, 1000);
        }
        return; // Solo funciona en app móvil
    }
    
    console.log('🟢🟢🟢 [setupAuthDeepLink] ✅ Capacitor detectado, configurando deep link handler');

    // Función para procesar el callback de autenticación
    const handleAuthCallback = async (url: string) => {

    };

    // Escuchar eventos de deep link de Capacitor
    // CRÍTICO: Según documentación de Auth0, usar App.addListener('appUrlOpen') y handleRedirectCallback
    try {
        // Verificar si estamos en Capacitor antes de usar CapApp
        const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
        console.log('🟢🟢🟢 [setupAuthDeepLink] Capacitor disponible:', isCapacitor);
        
        if (isCapacitor && CapApp) {
            console.log('🟢🟢🟢 [setupAuthDeepLink] ✅ Configurando listener de deep links con @capacitor/app');
            
            // CRÍTICO: Según documentación de Auth0, manejar appUrlOpen y llamar handleRedirectCallback
            CapApp.addListener('appUrlOpen', async (data: { url: string }) => {
                console.log('[setupAuthDeepLink] Deep link recibido (appUrlOpen):', data.url);
                
                // CRÍTICO: Según documentación de Auth0, verificar si tiene code y state
                if (data.url.includes('state') && (data.url.includes('code') || data.url.includes('error'))) {
                    console.log('[setupAuthDeepLink] ✅ Callback de Auth0 detectado (code/state presente)');
                    try {
                        const mgr = await initializeAuth0();
                        // handleRedirectCallback ya cierra el Browser automáticamente
                        const user = await mgr.handleRedirectCallback(data.url);
                        
                        if (user && user.email) {
                            console.log('[setupAuthDeepLink] ✅ Usuario autenticado desde callback:', user.email);
                            const email = user.email.toLowerCase();
                            const username = email.split('@')[0];
                            
                            localStorage.setItem('username', username);
                            localStorage.setItem('userEmail', email);
                            
                            // Usar authManager para manejar login completo
                            await authManager.handleLoginSuccess(user, store);
                            
                            // Actualizar UI
                            const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
                            if (levelEditorBtn) {
                                levelEditorBtn.textContent = t('menu.editor');
                            }
                            updateHamburgerButtonLabel(store);
                            
                            // Cargar niveles del usuario
                            await tryLoadUserLevels(store);
                            
                            // Ocultar modal de "Ingresando..." antes de abrir el editor
                            const loggingInModal = document.getElementById('logging-in-modal');
                            if (loggingInModal) {
                                loggingInModal.classList.add('hidden');
                                loggingInModal.style.display = 'none';
                            }
                            
                            // Si estamos en el menú, iniciar el editor (skipAuthCheck porque ya estamos autenticados)
                            if (store.appState === 'menu') {
                                startEditor(store, false, true);
                            }
                        } else {
                            console.error('[setupAuthDeepLink] ❌ Callback procesado pero no se obtuvo usuario');
                            // Ocultar modal en caso de error
                            const loggingInModal = document.getElementById('logging-in-modal');
                            if (loggingInModal) {
                                loggingInModal.classList.add('hidden');
                                loggingInModal.style.display = 'none';
                            }
                        }
                    } catch (err) {
                        console.error('[setupAuthDeepLink] ❌ Error procesando callback (appUrlOpen):', err);
                        // Ocultar modal en caso de error
                        const loggingInModal = document.getElementById('logging-in-modal');
                        if (loggingInModal) {
                            loggingInModal.classList.add('hidden');
                            loggingInModal.style.display = 'none';
                        }
                    }
                } else {
                    // No es un callback de Auth0, procesar como deep link normal
                    handleAuthCallback(data.url);
                }
            });

            // Verificar URL de lanzamiento cuando la app se abre desde cero
            CapApp.getLaunchUrl()
                .then((result) => {
                    if (result && result.url) {
                        // App abierta con deep link
                        console.log('[setupAuthDeepLink] URL de lanzamiento:', result.url);
                        try {
                            if (result.url.includes('code=') && result.url.includes('state=')) {
                                console.log('Listener [getLaunchUrl] detectó URL de login (Auth0).');
                                (async () => {
                                    try {
                                        const mgr = await initializeAuth0();
                                        const user = await mgr.handleRedirectCallback(result.url);
                                        
                                        if (user && user.email) {
                                            console.log('[setupAuthDeepLink] ✅ Usuario autenticado desde callback:', user.email);
                                            const email = user.email.toLowerCase();
                                            const username = email.split('@')[0];
                                            
                                            localStorage.setItem('username', username);
                                            localStorage.setItem('userEmail', email);
                                            
                                            // Usar authManager para manejar login completo
                                            await authManager.handleLoginSuccess(user, store);
                                            
                                            // Actualizar UI
                                            const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
                                            if (levelEditorBtn) {
                                                levelEditorBtn.textContent = t('menu.editor');
                                            }
                                            updateHamburgerButtonLabel(store);
                                            
                                            // Cargar niveles del usuario
                                            await tryLoadUserLevels(store);
                                            
                                            // Ocultar modal de "Ingresando..." antes de abrir el editor
                                            const loggingInModal = document.getElementById('logging-in-modal');
                                            if (loggingInModal) {
                                                loggingInModal.classList.add('hidden');
                                                loggingInModal.style.display = 'none';
                                            }
                                            
                                            // Si estamos en el menú, iniciar el editor
                                            if (store.appState === 'menu') {
                                                startEditor(store);
                                            }
                                            
                                            console.log('[setupAuthDeepLink] ✅ Login completado! Usuario: ' + user.email);
                                        } else {
                                            console.error('[setupAuthDeepLink] ❌ Callback procesado pero no se obtuvo usuario');
                                        }
                                    } catch (err) {
                                        console.error('[setupAuthDeepLink] ❌ Error procesando callback (getLaunchUrl):', err);
                                        // Ocultar modal en caso de error
                                        const loggingInModal = document.getElementById('logging-in-modal');
                                        if (loggingInModal) {
                                            loggingInModal.classList.add('hidden');
                                            loggingInModal.style.display = 'none';
                                        }
                                    }
                                })();
                            } else {
                                handleAuthCallback(result.url);
                            }
                        } catch (e) {
                            console.warn('Error en getLaunchUrl handler:', e);
                        }
                    } else {
                        // Esto es normal cuando la app se abre directamente sin un deep link
                        // No es un error, simplemente significa que la app se abrió normalmente
                        console.log('[setupAuthDeepLink] getLaunchUrl sin URL - app abierta normalmente (no es un error)');
                    }
                })
                .catch((error: any) => {
                    console.warn('[setupAuthDeepLink] Error en getLaunchUrl:', error);
                });
        }
    } catch (error) {
        console.error('[setupAuthDeepLink] ❌ ERROR CRÍTICO: Fallo al configurar los listeners:', error);
        console.warn('No se pudo configurar el listener de deep links:', error);
    }

    // También verificar la URL actual en caso de que la app se haya abierto desde un deep link
    console.log('🔵🔵🔵 [setupAuthDeepLink] Verificando window.location.href:', window.location.href);
    if (window.location.href.startsWith('com.newhero.game://')) {
        console.log('🔵🔵🔵 [setupAuthDeepLink] ✅ Deep link detectado en window.location!');
        handleAuthCallback(window.location.href);
    }
    
    // CRÍTICO: También escuchar cuando la app se reanuda (después de volver del navegador)
    if (isCapacitor && CapApp) {
        console.log('🔵🔵🔵 [setupAuthDeepLink] Configurando listener de appStateChange...');
        CapApp.addListener('appStateChange', (state: { isActive: boolean }) => {
            console.log('🔵🔵🔵 [setupAuthDeepLink] appStateChange:', state);
            if (state.isActive) {
                console.log('🔵🔵🔵 [setupAuthDeepLink] App se reanudó, verificando getLaunchUrl...');
                CapApp.getLaunchUrl()
                    .then((result) => {
                        if (result && result.url) {
                            console.log('🔵🔵🔵 [setupAuthDeepLink] ✅ URL encontrada al reanudar:', result.url);
                            if (result.url.includes('code=') && result.url.includes('state=')) {
                                console.log('🔵🔵🔵 [setupAuthDeepLink] ✅ Callback de Auth0 detectado!');
                                (async () => {
                                    try {
                                        const mgr = await initializeAuth0();
                                        const user = await mgr.handleRedirectCallback(result.url);
                                        if (user && user.email) {
                                            console.log('[setupAuthDeepLink] ✅ Usuario autenticado desde callback:', user.email);
                                            const email = user.email.toLowerCase();
                                            const username = email.split('@')[0];
                                            localStorage.setItem('username', username);
                                            localStorage.setItem('userEmail', email);
                                            await authManager.handleLoginSuccess(user);
                                            const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
                                            if (levelEditorBtn) {
                                                levelEditorBtn.textContent = t('menu.editor');
                                            }
                                            updateHamburgerButtonLabel(store);
                                            await tryLoadUserLevels(store);
                                            if (store.appState === 'menu') {
                                                startEditor(store);
                                            }
                                            console.log('[setupAuthDeepLink] ✅ Login completado! Usuario: ' + user.email);
                                        }
                                    } catch (err) {
                                        console.error('Error procesando callback al reanudar:', err);
                                    }
                                })();
                            }
                        }
                    })
                    .catch((error: any) => {
                        console.log('🔵🔵🔵 [setupAuthDeepLink] getLaunchUrl al reanudar sin URL:', error);
                    });
            }
        });
    }
    
    console.log('🔵🔵🔵 [setupAuthDeepLink] ========== COMPLETADO ==========');
};

import Auth0Manager from '../auth0-manager';

// 🔐 INICIALIZAR AUTH0 - Función reutilizable
let auth0ManagerInstance: any = null;
let auth0InitPromise: Promise<any> | null = null;

export async function initializeAuth0() {
    if (auth0InitPromise) {
        return auth0InitPromise;
    }

    if (auth0ManagerInstance && auth0ManagerInstance.isInitialized) {
        return auth0ManagerInstance;
    }

    auth0InitPromise = (async () => {
        try {
            auth0ManagerInstance = Auth0Manager; // Use the imported manager

            console.log('[Auth0 Init] Cargando configuración desde /auth0-config.json...');
            const response = await fetch('/auth0-config.json');
            if (!response.ok) {
                throw new Error(`No se pudo cargar auth0-config.json: ${response.statusText}`);
            }
            const config = await response.json();
            console.log('[Auth0 Init] ✅ Configuración cargada.');

            await auth0ManagerInstance.initialize(config);
            
            return auth0ManagerInstance;
        } catch (error) {
            console.error('[Auth0 Init] ❌ Error fatal inicializando Auth0:', error);
            auth0InitPromise = null; 
            throw error;
        }
    })();

    return auth0InitPromise;
}

export const setupUI = (store: GameStore) => {
    // Auth0 ya se está inicializando en el nivel del módulo
    
    console.log('🔵🔵🔵 [setupUI] Iniciando setupUI...');
    console.log('🔵🔵🔵 [setupUI] Capacitor disponible:', typeof (window as any).Capacitor !== 'undefined');
    
    attachDomReferences(store);
    updateHamburgerButtonLabel(store);
    syncLevelSelector(store);
    setupLevelData(store);
    setupMenuButtons(store);
    setupGallery(store);
    setupKeyboardShortcuts(store);
    
    // Configurar zoom con pinch en mobile
    setupPinchZoom(store);
    
    // Manejar deep links de autenticación (app móvil)
    console.log('🔵🔵🔵 [setupUI] Llamando a setupAuthDeepLink...');
    setupAuthDeepLink(store);
    console.log('🔵🔵🔵 [setupUI] setupAuthDeepLink completado.');
    
    // CRÍTICO: Si el usuario ya está logueado al iniciar la app, cargar el nickname desde la BD
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
        console.log('[setupUI] Usuario ya logueado, cargando nickname desde BD...');
        nicknameManager.initialize().catch(err => {
            console.warn('[setupUI] Error cargando nickname al iniciar:', err);
        });
    }
    
    // CRÍTICO: Función para procesar login (reutilizable)
    const processAuth0Login = async (user: any) => {
        if (!user || !user.email) return;
        
        console.log('[setupUI] ✅ Procesando login:', user.email);
        const email = user.email.toLowerCase();
        const username = email.split('@')[0];
        
        localStorage.setItem('username', username);
        localStorage.setItem('userEmail', email);
        
        // Usar authManager para manejar login completo
        await authManager.handleLoginSuccess(user, store);
        
        // Actualizar UI
        const levelEditorBtn = document.getElementById('level-editor-btn') as HTMLButtonElement | null;
        if (levelEditorBtn) {
            levelEditorBtn.textContent = 'INGRESAR';
        }
        updateHamburgerButtonLabel(store);
        
        // Cargar niveles del usuario
        await tryLoadUserLevels(store);
        
        // Ocultar modal de "Ingresando..." antes de abrir el editor
        const loggingInModal = document.getElementById('logging-in-modal');
        if (loggingInModal) {
            loggingInModal.classList.add('hidden');
            loggingInModal.style.display = 'none';
        }
        
        // Si estamos en el menú, iniciar el editor (skipAuthCheck porque ya estamos autenticados)
        if (store.appState === 'menu') {
            startEditor(store, false, true);
        }
    };
    
    // CRÍTICO: Listener para eventos de login de Auth0 (web)
    window.addEventListener('auth0:login', async (event: any) => {
        console.log('[setupUI] 🔔 Evento auth0:login recibido:', event.detail);
        const user = event.detail?.user;
        if (user) {
            await processAuth0Login(user);
            // Limpiar el estado pendiente después de procesar
            localStorage.removeItem('auth0:login:pending');
        }
    });
    
    // CRÍTICO: Verificar si hay un login pendiente (por si el evento se perdió)
    const checkPendingLogin = async () => {
        try {
            const pendingLogin = localStorage.getItem('auth0:login:pending');
            if (pendingLogin) {
                const loginData = JSON.parse(pendingLogin);
                // Solo procesar si tiene menos de 5 segundos (evitar procesar logins antiguos)
                if (Date.now() - loginData.timestamp < 5000) {
                    console.log('[setupUI] 🔍 Login pendiente detectado, procesando...');
                    await processAuth0Login(loginData);
                    localStorage.removeItem('auth0:login:pending');
                } else {
                    // Limpiar login antiguo
                    localStorage.removeItem('auth0:login:pending');
                }
            }
        } catch (error) {
            console.error('[setupUI] Error verificando login pendiente:', error);
        }
    };
    
    // Verificar login pendiente después de un pequeño delay
    setTimeout(checkPendingLogin, 500);
    
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
        const { getUserStorage } = await import('../utils/storage');
        const savedLevels = getUserStorage('levels');
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
        // Verificar si está logueado con Auth0
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            console.warn('[tryLoadUserLevels] Usuario no logueado');
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
        let data: any = null;
        let loadedFromDB = false;
        
        try {
            // Obtener token de Auth0
            const Auth0Manager = await initializeAuth0();
            const token = await Auth0Manager.getAccessToken();
            if (!token) {
                console.warn('[tryLoadUserLevels] No se pudo obtener token de Auth0');
                return;
            }
            
            const res = await fetch(`${baseUrl}/.netlify/functions/levels`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
            });
            
            if (res.ok) {
                data = await res.json();
                loadedFromDB = true;
                console.log('Datos recibidos de la base de datos:', data);
            } else {
                console.log('No hay niveles personalizados en la base de datos o error al cargar');
                // Intentar cargar desde localStorage como respaldo
                const { getUserStorage } = await import('../utils/storage');
                const savedLevels = getUserStorage('levels');
                if (savedLevels) {
                    try {
                        data = JSON.parse(savedLevels);
                        console.log('Niveles cargados desde localStorage como respaldo');
                    } catch (e) {
                        console.error('Error parseando niveles desde localStorage:', e);
                    }
                }
            }
        } catch (error) {
            console.error('Error cargando niveles desde la BD:', error);
            // Intentar cargar desde localStorage como respaldo
            const { getUserStorage } = await import('../utils/storage');
            const savedLevels = getUserStorage('levels');
            if (savedLevels) {
                try {
                    data = JSON.parse(savedLevels);
                    console.log('Niveles cargados desde localStorage como respaldo (error de conexión)');
                } catch (e) {
                    console.error('Error parseando niveles desde localStorage:', e);
                }
            }
        }
        
        // Si no hay datos ni de la BD ni de localStorage, salir
        if (!data) {
            console.log('No hay niveles disponibles ni en la BD ni en localStorage');
            return;
        }
        
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
        
        // No guardar en localStorage - solo en base de datos
        
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
        } else if (levelsToLoad.length > 0) {
            // Si hay niveles pero no más que los originales, puede que sean todos los niveles
            // Incluyendo los originales editados. Guardar todos en localStorage
            const { buildChunkedFile20x18 } = await import('../utils/levels');
            const levelsAsStrings = levelsToLoad.map((lvl: string[] | string[][]) => 
                typeof lvl[0] === 'string' ? lvl as string[] : (lvl as string[][]).map((row: string[]) => row.join(''))
            );
            const fullPayload = buildChunkedFile20x18(levelsAsStrings);
            
            // No guardar en localStorage - solo en base de datos
            
            // Si los niveles cargados incluyen los originales editados, actualizar el store
            if (levelsToLoad.length === originalCount) {
                // Reemplazar los niveles originales con los editados
                const levelDataStore = levelsToLoad.map((lvl: string[]) => 
                    typeof lvl[0] === 'string' ? lvl.map((row: string) => row.split('')) : (lvl as any)
                ) as string[][][];
                const levelDesigns = levelsToLoad.map((lvl: string[] | string[][]) => 
                    typeof lvl[0] === 'string' ? lvl as string[] : (lvl as string[][]).map((row: string[]) => row.join(''))
                );
                
                store.levelDataStore = levelDataStore;
                store.levelDesigns = levelDesigns;
                store.initialLevels = levelDesigns;
                
                syncLevelSelector(store);
                console.log('Niveles originales editados cargados desde la base de datos');
            }
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
    const graphicsStyleSelector = document.getElementById('graphics-style-selector') as HTMLSelectElement | null;
    const graphicsCustomOptions = document.getElementById('graphics-custom-options') as HTMLElement | null;
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

    const toggleElements: (HTMLInputElement | null)[] = [
        scanlineToggle,
        glowToggle,
        brightnessToggle,
        contrastToggle,
        vignetteToggle,
        blurToggle,
        fpsToggle,
        mobileFullWidthToggle,
    ];

    const updateCustomOptionsState = (style: GraphicsStyle) => {
        const isCustomStyle = style === 'custom';
        toggleElements.forEach(toggle => {
            if (toggle) toggle.disabled = !isCustomStyle;
        });
        if (graphicsCustomOptions) {
            graphicsCustomOptions.classList.toggle('hidden', !isCustomStyle);
        }
    };

    const applyGraphicsPreset = (style: GraphicsStyle) => {
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                               (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);

        if (style === 'modern') {
            store.settings.graphics.scanline = false;
            store.settings.graphics.glow = true;
            store.settings.graphics.brightness = false;
            store.settings.graphics.contrast = false;
            store.settings.graphics.vignette = false;
            store.settings.graphics.blur = 0;
            store.settings.graphics.showFps = false;
        } else if (style === 'retro') {
            store.settings.graphics.scanline = true;
            store.settings.graphics.glow = true;
            store.settings.graphics.brightness = true;
            store.settings.graphics.contrast = true;
            store.settings.graphics.vignette = true;
            store.settings.graphics.blur = isMobileDevice ? 0.7 : 1.5;
            store.settings.graphics.showFps = false;
        }

        store.settings.graphics.style = style;
        if (graphicsStyleSelector) graphicsStyleSelector.value = style;
        updateCustomOptionsState(style);
        applyGraphicsSettings({
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false,
        });
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
        updateSettingsUI(store);
    };

    const ensureCustomStyle = () => {
        if (store.settings.graphics.style !== 'custom') {
            store.settings.graphics.style = 'custom';
            if (graphicsStyleSelector) graphicsStyleSelector.value = 'custom';
            updateCustomOptionsState('custom');
        }
    };

    const initialStyle = (store.settings.graphics.style as GraphicsStyle) ?? 'custom';
    updateCustomOptionsState(initialStyle);
    if (graphicsStyleSelector) {
        graphicsStyleSelector.value = initialStyle;
    }
    
    if (!settingsModal) return;
    
    // Configurar selector de modo de control
    if (controlModeSelector) {
        controlModeSelector.value = store.settings.controls.mobileMode;
        
        controlModeSelector.addEventListener('change', (e) => {
            const newMode = (e.target as HTMLSelectElement).value as ControlMode;
            store.settings.controls.mobileMode = newMode;
            saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
            
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
            saveSettings({ ...store.settings, language: newLang } as any).catch(err => {
                console.warn('[Settings] Error guardando configuración:', err);
            });
            updateAllTexts(store);
        });
    }
    
    // Cerrar I/O modal
    const closeModal = () => closeSettingsModal(store);
    
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
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
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
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
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
    graphicsStyleSelector?.addEventListener('change', (e) => {
        const preset = (e.target as HTMLSelectElement).value as GraphicsStyle;
        if (preset === 'custom') {
            store.settings.graphics.style = 'custom';
            updateCustomOptionsState('custom');
            applyGraphicsSettings({
                ...store.settings.graphics,
                showFps: store.settings.graphics.showFps ?? false,
            });
            saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
            updateSettingsUI(store);
        } else {
            applyGraphicsPreset(preset);
        }
    });
    
    // Toggles de gráficos
    scanlineToggle?.addEventListener('change', (e) => {
        ensureCustomStyle();
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.scanline = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
    });
    
    glowToggle?.addEventListener('change', (e) => {
        ensureCustomStyle();
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.glow = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
    });
    
    brightnessToggle?.addEventListener('change', (e) => {
        ensureCustomStyle();
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.brightness = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
    });
    
    contrastToggle?.addEventListener('change', (e) => {
        ensureCustomStyle();
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.contrast = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
    });
    
    vignetteToggle?.addEventListener('change', (e) => {
        ensureCustomStyle();
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.vignette = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
    });
    
    blurToggle?.addEventListener('change', (e) => {
        ensureCustomStyle();
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
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
    });
    
    fpsToggle?.addEventListener('change', (e) => {
        ensureCustomStyle();
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.showFps = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
    });
    
    mobileFullWidthToggle?.addEventListener('change', (e) => {
        ensureCustomStyle();
        const enabled = (e.target as HTMLInputElement).checked;
        store.settings.graphics.mobileFullWidth = enabled;
        applyGraphicsSettings({ 
            ...store.settings.graphics,
            showFps: store.settings.graphics.showFps ?? false
        });
        saveSettingsWithLanguage(store.settings).catch(err => {
            console.warn('[Settings] Error guardando configuración:', err);
        });
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
    const graphicsStyleSelector = document.getElementById('graphics-style-selector') as HTMLSelectElement | null;
    const graphicsCustomOptions = document.getElementById('graphics-custom-options') as HTMLElement | null;
    
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
    
    const currentStyle = (store.settings.graphics.style as GraphicsStyle) ?? 'custom';
    if (graphicsStyleSelector) {
        graphicsStyleSelector.value = currentStyle;
    }
    const isCustomStyle = currentStyle === 'custom';
    const toggleElements: (HTMLInputElement | null)[] = [
        scanlineToggle,
        glowToggle,
        brightnessToggle,
        contrastToggle,
        vignetteToggle,
        blurToggle,
        fpsToggle,
        mobileFullWidthToggle,
    ];
    toggleElements.forEach(toggle => {
        if (toggle) toggle.disabled = !isCustomStyle;
    });
    if (graphicsCustomOptions) {
        graphicsCustomOptions.classList.toggle('hidden', !isCustomStyle);
    }
    
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
    
    // Actualizar textos del QR code (solo visible en desktop)
    const qrCodeTitle = document.getElementById('qr-code-title');
    const qrCodeInstructions = document.getElementById('qr-code-instructions');
    if (qrCodeTitle) {
        qrCodeTitle.textContent = t('menu.qrScanToPlay');
    }
    if (qrCodeInstructions) {
        qrCodeInstructions.textContent = t('menu.qrScanInstructions');
    }
    
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
        const scoreValue = typeof store.lastRunScore === 'number' ? store.lastRunScore : 0;
        gameoverScore.innerHTML = `${t('game.finalScore')}: <span id="gameover-score-value" class="text-yellow-400">${scoreValue}</span>`;
        store.dom.ui.gameoverScoreValue = document.getElementById('gameover-score-value') as HTMLSpanElement | null;
    }
    if (gameoverRetryBtn) gameoverRetryBtn.textContent = t('game.retry');
    if (gameoverMenuBtn) gameoverMenuBtn.textContent = t('game.mainMenu');
    
    // Modal de configuración
    const settingsTitle = document.querySelector('#settings-modal .title');
    const settingsLanguageTitle = document.getElementById('settings-language-title');
    const settingsLanguageLabel = document.getElementById('settings-language-label');
    if (settingsTitle) settingsTitle.textContent = t('settings.title');
    if (settingsLanguageTitle) settingsLanguageTitle.textContent = t('settings.language');
    if (settingsLanguageLabel) settingsLanguageLabel.textContent = `${t('settings.language')}:`;
    
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
    updatePauseMenuTexts(store);
    
    // Modal de autenticación
    updateAuthModalTexts();
    
    // Créditos
    updateCreditsTexts();
    
    updateHamburgerButtonLabel(store);
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
    
    // Sección Campaña y Niveles - Mostrar nombre de la campaña actual
    const campaignSectionToggle = document.querySelector('#campaign-section-toggle span:first-child');
    const levelsSectionToggle = document.querySelector('#levels-section-toggle span:first-child');
    const levelsSectionMobileTitle = document.querySelector('#user-panel h3.text-center');
    const campaignTitleBtn = document.getElementById('campaign-title-btn');
    
    // Obtener el nombre de la campaña actual (no del nivel, sino de la campaña seleccionada)
    import('../utils/campaigns').then(({ getCurrentCampaign }) => {
        const campaign = getCurrentCampaign(store);
        const campaignName = campaign 
            ? (campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name)
            : t('editor.levels');
        
        if (campaignSectionToggle) campaignSectionToggle.textContent = t('campaigns.title');
        if (levelsSectionToggle) levelsSectionToggle.textContent = t('editor.levels');
        if (levelsSectionMobileTitle) levelsSectionMobileTitle.textContent = campaignName.toUpperCase();
        if (campaignTitleBtn) campaignTitleBtn.textContent = campaignName.toUpperCase();
    }).catch(() => {
        // Fallback si hay error
        if (campaignSectionToggle) campaignSectionToggle.textContent = t('campaigns.title');
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
const updatePauseMenuTexts = (store: GameStore) => {
    const pauseMenuTitle = document.querySelector('#pause-menu-modal .title');
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    const pauseMainMenuBtn = document.getElementById('pause-mainmenu-btn');
    const pauseSettingsBtn = document.getElementById('pause-settings-btn');
    const pauseCreditsBtn = document.getElementById('pause-credits-btn');
    const pauseDynamicBtn = document.getElementById('pause-dynamic-btn');
    
    if (pauseMenuTitle) pauseMenuTitle.textContent = t('modals.menuTitle');
    if (pauseResumeBtn) pauseResumeBtn.textContent = t('game.resume');
    if (pauseMainMenuBtn) pauseMainMenuBtn.textContent = t('modals.backToMainMenuTitle');
    if (pauseSettingsBtn) pauseSettingsBtn.textContent = t('game.settings');
    if (pauseCreditsBtn) pauseCreditsBtn.textContent = t('menu.credits');
    if (pauseDynamicBtn) {
        const { label } = resolvePrimaryAction(store);
        pauseDynamicBtn.textContent = label;
    }
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
    const authLoginBtn = document.getElementById('auth-login-btn');
    const authSignupBtn = document.getElementById('auth-signup-btn');
    const authCancelBtn = document.getElementById('auth-cancel-btn');
    
    if (authModalTitle) authModalTitle.textContent = t('auth.authentication');
    if (authModalMessage) authModalMessage.textContent = t('auth.loginMessage') || 'Para poder editar niveles, inicia sesión con tu cuenta de Google.';
    
    // Actualizar botón de login preservando el logo de Google
    if (authLoginBtn) {
        // Asegurar que el botón tenga el estilo correcto y el logo
        authLoginBtn.style.display = 'flex';
        authLoginBtn.style.alignItems = 'center';
        authLoginBtn.style.justifyContent = 'center';
        authLoginBtn.style.gap = '8px';
        
        // Verificar si ya tiene el SVG del logo
        const existingSvg = authLoginBtn.querySelector('svg');
        const span = authLoginBtn.querySelector('span');
        
        if (!existingSvg) {
            // No hay logo, crear el botón completo con logo y texto
            authLoginBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>${t('auth.loginWithGoogle') || 'Entrar con Google'}</span>
            `;
        } else if (span) {
            // Ya tiene logo, solo actualizar el texto
            span.textContent = t('auth.loginWithGoogle') || 'Entrar con Google';
        }
    }
    
    if (authSignupBtn) authSignupBtn.textContent = t('auth.createAccount');
    if (authCancelBtn) authCancelBtn.textContent = t('modals.cancel');
};

const closeSettingsModal = (store: GameStore) => {
    const settingsModal = document.getElementById('settings-modal');
    if (!settingsModal || settingsModal.classList.contains('hidden')) return;
    settingsModal.classList.add('hidden');
    if (store.appState === 'playing') {
        resumeGame(store, 'settings');
    }
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
    
    // Cerrar paneles del editor cuando se abre el modal (si estamos en editor)
    if (store.appState === 'editing') {
        closeEditorPanels(store);
    }
    
    if (store.appState === 'playing') {
        pauseGame(store, 'settings');
    }
    
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
    _hamburgerMenu: HTMLElement | null,
    _pauseResumeBtn: HTMLButtonElement | null,
    _restartGameBtn: HTMLButtonElement | null,
    _backToMenuBtnGame: HTMLButtonElement | null,
    _resumeEditorBtnMenu: HTMLButtonElement | null,
    _creditsBtnHamburger: HTMLButtonElement | null
) => {
    const showPauseMenu = () => {
        const pauseMenu = document.getElementById('pause-menu-modal');
        if (!pauseMenu) return;
        pauseGame(store, 'pause-menu');
        pauseMenu.classList.remove('hidden');
    };
    
    hamburgerBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        showPauseMenu();
    });
    
    hamburgerBtnMobile?.addEventListener('click', (e) => {
        e.stopPropagation();
        showPauseMenu();
    });
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
    const pauseSettingsBtn = document.getElementById('pause-settings-btn') as HTMLButtonElement | null;
    const pauseMainMenuBtn = document.getElementById('pause-mainmenu-btn') as HTMLButtonElement | null;
    const pauseDynamicBtn = document.getElementById('pause-dynamic-btn') as HTMLButtonElement | null;
    const pauseCreditsBtn = document.getElementById('pause-credits-btn') as HTMLButtonElement | null;
    // Función para verificar si el usuario está logueado
    const checkLoginStatus = async (): Promise<{ isLoggedIn: boolean; username: string | null }> => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        // Priorizar nickname sobre username (con namespace)
        try {
            const { getUserStorage } = await import('../utils/storage');
            const nickname = getUserStorage('nickname');
            const username = nickname || localStorage.getItem('username');
            return { isLoggedIn, username: username || null };
        } catch {
            // Fallback si hay error
            const username = localStorage.getItem('username');
            return { isLoggedIn, username: username || null };
        }
    };

    // Función para actualizar el botón de editor según el estado de login
    const refreshPauseDynamicButton = () => {
        if (!pauseDynamicBtn) return;
        const { label } = resolvePrimaryAction(store);
        pauseDynamicBtn.textContent = label;
    };

    const updateEditorButton = async () => {
        const { isLoggedIn } = await checkLoginStatus();
        if (levelEditorBtn) {
            levelEditorBtn.textContent = isLoggedIn ? t('menu.editor') : t('menu.login');
        }
        updateHamburgerButtonLabel(store);
        refreshPauseDynamicButton();
    };

    // Función para actualizar el área de usuario en el editor (desktop y mobile)
    const updateUserArea = async () => {
        const { isLoggedIn, username } = await checkLoginStatus();
        
        // CRÍTICO: Si el usuario está logueado, asegurar que el nickname se carga desde la BD
        // Esto actualiza la UI con el nickname correcto desde la base de datos
        if (isLoggedIn) {
            await nicknameManager.updateAllUI();
        } else {
            // Si no está logueado, solo actualizar la UI con valores por defecto
            await nicknameManager.updateAllUI('Usuario');
        }
        
        // Asegurar que usamos nickname si está disponible (con namespace)
        const { getUserStorage } = await import('../utils/storage');
        const displayName = nicknameManager.currentNickname || getUserStorage('nickname') || username;
        
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
        const userPanelAvatar = document.getElementById('user-panel-avatar');
        
        // Usar el nickname del manager en lugar del displayName
        const currentNickname = nicknameManager.currentNickname || displayName;
        
        if (userAreaMobile) {
            if (isLoggedIn && currentNickname) {
                userAreaMobile.style.display = 'block';
                // El nickname ya fue actualizado por nicknameManager.updateAllUI()
                // Actualizar avatar si está guardado (default: Player)
                const savedAvatar = getUserStorage('avatar') || 'P';
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
                // El nickname ya fue actualizado por nicknameManager.updateAllUI() cuando no hay login
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
    levelEditorBtn?.addEventListener('click', async () => {
        const { isLoggedIn } = await checkLoginStatus();
        if (!isLoggedIn) {
            // Mostrar modal de elección
            const modal = document.getElementById('auth-choice-modal');
            if (modal) {
                modal.classList.remove('hidden');
                // Asegurar que el modal está visible
                modal.style.display = 'flex';
                console.log('[Auth Modal] Modal de autenticación mostrado. Display:', window.getComputedStyle(modal).display, 'Z-index:', window.getComputedStyle(modal).zIndex);
            }
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
    
    // Compartir Juego
    const shareGameBtn = document.getElementById('share-game-btn') as HTMLButtonElement | null;
    shareGameBtn?.addEventListener('click', () => {
        shareGameOnSocialMedia();
    });
    
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
    const authLoginBtn = document.getElementById('auth-login-btn') as HTMLButtonElement | null;
    const authSignupBtn = document.getElementById('auth-signup-btn') as HTMLButtonElement | null;
    const authCancelBtn = document.getElementById('auth-cancel-btn') as HTMLButtonElement | null;
    // Funciones para mostrar/ocultar el modal de "Ingresando..."
    const showLoggingInModal = () => {
        const modal = document.getElementById('logging-in-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            console.log('[UI] Modal de "Ingresando..." mostrado');
        }
    };
    
    const hideLoggingInModal = () => {
        const modal = document.getElementById('logging-in-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
            console.log('[UI] Modal de "Ingresando..." ocultado');
        }
    };
    
    const closeAuthModal = () => {
        if (authModal) {
            authModal.classList.add('hidden');
            authModal.style.display = 'none';
        }
    };
    authCancelBtn?.addEventListener('click', closeAuthModal);
    
    authLoginBtn?.addEventListener('click', async () => {
        console.log('[authLoginBtn] ✅ Botón LOGIN presionado - Iniciando con Auth0');
        closeAuthModal();
        showLoggingInModal(); // Mostrar modal de "Ingresando..."
        
        try {
            // Inicializar Auth0 primero
            console.log('[authLoginBtn] Inicializando Auth0...');
            const Auth0Manager = await initializeAuth0();
            console.log('[authLoginBtn] ✅ Auth0 inicializado, llamando a loginWithGoogle()');
            
            const user = await Auth0Manager.loginWithGoogle();
            
            if (user && user.email) {
                console.log('[authLoginBtn] ✅ Usuario autenticado:', user.email);
                const email = user.email.toLowerCase();
                const username = email.split('@')[0];
                
                localStorage.setItem('username', username);
                localStorage.setItem('userEmail', email);
                
                // Usar authManager para manejar login completo
                await authManager.handleLoginSuccess(user, store);
                
                updateEditorButton();
                updateUserArea();
                hideLoggingInModal(); // Ocultar modal antes de abrir el editor
                startEditor(store, false, true); // skipAuthCheck porque ya estamos autenticados
            } else {
                console.log('[authLoginBtn] ⏳ Login con redirect iniciado. Esperando callback de Auth0...');
                // El modal se ocultará cuando se complete el callback en setupAuthDeepLink
            }
        } catch (error) {
            console.error('[authLoginBtn] ❌ No se pudo autenticar con Google. La razón exacta es:', error);
            hideLoggingInModal(); // Ocultar modal en caso de error
        }
    });
    authSignupBtn?.addEventListener('click', async () => {
        console.log('[authSignupBtn] ✅ Botón SIGNUP presionado - Iniciando con Auth0');
        closeAuthModal();
        
        try {
            const { Auth0Manager } = await import('../auth0-manager');
            console.log('[authSignupBtn] Llamando a Auth0Manager.loginWithGoogle() para registro');
            const user = await Auth0Manager.loginWithGoogle();
            
            if (user && user.email) {
                console.log('[authSignupBtn] ✅ Usuario registrado/autenticado:', user.email);
                const email = user.email.toLowerCase();
                const username = email.split('@')[0];
                
                localStorage.setItem('username', username);
                localStorage.setItem('userEmail', email);
                
                // Usar authManager para manejar login completo
                await authManager.handleLoginSuccess(user, store);
                
                updateEditorButton();
                updateUserArea();
                startEditor(store, false, true); // skipAuthCheck porque ya estamos autenticados
            } else {
                console.error('[authSignupBtn] ❌ No se pudo autenticar con Google');
            }
        } catch (error) {
            console.error('[authSignupBtn] ❌ Error en signup:', error);
        }
    });

    // Handler del botón de cerrar sesión
    const logoutBtn = document.getElementById('logout-btn') as HTMLButtonElement | null;
    logoutBtn?.addEventListener('click', () => {
        openExitModal(t('modals.logoutConfirm'), t('modals.logoutMessage'), async () => {
            try {
                // Cerrar sesión en Auth0
                const { Auth0Manager } = await import('../auth0-manager');
                await Auth0Manager.logout();
            } catch (error) {
                console.error('[logoutBtn] Error cerrando sesión con Auth0:', error);
            }
            
            // Usar authManager para limpiar (pasar store para cerrar editor si está abierto)
            await authManager.handleLogout(store);
            
            // Actualizar UI
            updateEditorButton();
            updateUserArea();
            
            // Limpiar override de password legacy
            clearLegacyPasswordOverride();
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
    
    profileBtn?.addEventListener('click', async () => {
        console.log('[Profile Modal Open] Abriendo modal de perfil');
        // Cerrar paneles del editor cuando se abre el modal
        closeEditorPanels(store);
        profileModal?.classList.remove('hidden');
        
        // Cargar datos del usuario desde Auth0
        try {
            const { Auth0Manager } = await import('../auth0-manager');
            const user = await Auth0Manager.getUser();
            
            if (user && profileEmailDisplay) {
                profileEmailDisplay.value = user.email || '';
                console.log('[Profile Modal Open] ✅ Email cargado desde Auth0:', user.email);
            } else if (profileEmailDisplay) {
                // Fallback: intentar obtener del localStorage
                const storedEmail = localStorage.getItem('currentUserEmail');
                if (storedEmail) {
                    profileEmailDisplay.value = storedEmail;
                    console.log('[Profile Modal Open] ✅ Email cargado desde localStorage:', storedEmail);
                } else {
                    profileEmailDisplay.value = '';
                    console.warn('[Profile Modal Open] ⚠️ No se pudo obtener email del usuario');
                }
            }
        } catch (error) {
            console.error('[Profile Modal Open] Error obteniendo usuario de Auth0:', error);
            // Fallback: intentar obtener del localStorage
            if (profileEmailDisplay) {
                const storedEmail = localStorage.getItem('currentUserEmail');
                if (storedEmail) {
                    profileEmailDisplay.value = storedEmail;
                } else {
                    profileEmailDisplay.value = '';
                }
            }
        }
        
        // CRÍTICO: Usar nicknameManager para obtener el nickname actual (más confiable)
        // Esto asegura que profile-nickname-input esté "observando" el nickname
        await nicknameManager.updateAllUI();
        
        // Actualizar el input con el nickname del manager
        if (profileNicknameInput) {
            profileNicknameInput.value = nicknameManager.currentNickname || '';
            console.log('[Profile Modal Open] ✅ profile-nickname-input actualizado con:', nicknameManager.currentNickname);
        }
        // Cargar avatar actual (default: Player)
        const profileAvatarPreview = document.getElementById('profile-avatar-preview') as HTMLCanvasElement | null;
        const { getUserStorage: getUserStorageForAvatar } = await import('../utils/storage');
        const savedAvatar = getUserStorageForAvatar('avatar') || 'P';
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
    profileAvatarBtn?.addEventListener('click', async () => {
        // Lista de avatares disponibles (códigos de personajes del juego)
        // Player, Murciélago, Araña, Víbora, Tentáculo, Minero
        const avatares = ['P', '8', 'S', 'V', 'T', '9'];
        const { getUserStorage, setUserStorage } = await import('../utils/storage');
        const currentAvatar = getUserStorage('avatar') || 'P';
        const currentIndex = avatares.indexOf(currentAvatar);
        const nextIndex = (currentIndex + 1) % avatares.length;
        const newAvatar = avatares[nextIndex];
        
        // Guardar nuevo avatar con namespace
        setUserStorage('avatar', newAvatar);
        
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
    
    // Agregar validación de límite de 10 caracteres al input
    profileNicknameInput?.addEventListener('input', (e) => {
        const input = e.target as HTMLInputElement;
        if (input.value.length > 10) {
            input.value = input.value.substring(0, 10);
        }
    });
    
    profileSaveBtn?.addEventListener('click', async () => {
        if (!profileNicknameInput) return;
        let newNickname = profileNicknameInput.value.trim();
        
        // Asegurar que no exceda 10 caracteres
        if (newNickname.length > 10) {
            newNickname = newNickname.substring(0, 10);
            profileNicknameInput.value = newNickname;
        }
        
        if (newNickname) {
            console.log('[Profile Save] Guardando nickname:', newNickname);
            
            // Usar nicknameManager para guardar y actualizar
            await nicknameManager.saveToDB(newNickname);
            await nicknameManager.updateAllUI(newNickname);
            
            // Actualizar área de usuario
            updateUserArea();
            
            // Mostrar confirmación
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
        // CRÍTICO: No interceptar teclas si el usuario está escribiendo en un input/textarea
        const activeElement = document.activeElement as HTMLElement | null;
        const isInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.tagName === 'SELECT' ||
            (activeElement.isContentEditable === true)
        );
        
        // Si está escribiendo en un input, no procesar las teclas (excepto Escape para cerrar modales)
        if (isInputFocused && event.key !== 'Escape') {
            return;
        }
        
        const tvModeActive = isTvMode();
        if (tvModeActive) {
            const keyCodeValue = getEventKeyCode(event);
            console.log(`MANDO PRESIONADO -> Key: '${event.key}', KeyCode: '${keyCodeValue ?? 'unknown'}'`);
            const tvAction = resolveTvInputAction(event);
            if (tvAction !== 'unknown') {
                event.preventDefault();
                const handled =
                    store.appState === 'menu'
                        ? handleTvMenuControls(store, tvAction, true)
                        : (store.appState === 'playing' || store.gameState === 'playing' || store.gameState === 'floating')
                            ? handleTvGameplayControls(store, tvAction, true)
                            : false;
                if (handled) {
                    return;
                }
            }
        }

        const normalizedCode = normalizeTvKeyCode(event);
        const legacyCode = resolveLegacyTvCode(event);

        if (event.code && event.code !== 'Unidentified') {
            store.keys[event.code] = true;
        }
        if (normalizedCode && normalizedCode !== 'Unidentified') {
            store.keys[normalizedCode] = true;
        } else if (legacyCode) {
            store.keys[legacyCode] = true;
        }

        const fireKey = normalizedCode !== 'Unidentified' ? normalizedCode : event.code;
        if (fireKey && TV_FIRE_KEYS.has(fireKey) && store.appState === 'playing') {
            store.keys.Space = true;
            event.preventDefault();
        }

        if (normalizedCode === 'Enter' && store.appState === 'menu') {
            const startButton = store.dom.ui.startGameBtn ?? (document.getElementById('start-game-btn') as HTMLButtonElement | null);
            const activeElement = document.activeElement as HTMLElement | null;
            const isTv = isTvMode();

            const shouldTriggerStart = (() => {
                if (!startButton) {
                    return false;
                }
                if (isTv) {
                    if (!tvMenuButtons.length) {
                        return true;
                    }
                    return activeElement === startButton;
                }
                return !activeElement || activeElement === document.body || activeElement === startButton;
            })();

            if (shouldTriggerStart && startButton) {
                event.preventDefault();
                startButton.click();
            }
        } else if (normalizedCode === 'Enter' && (store.gameState === 'gameover' || store.gameState === 'win')) {
            showMenu(store);
        }
    });
    window.addEventListener('keyup', event => {
        const tvModeActive = isTvMode();
        if (tvModeActive) {
            const tvAction = resolveTvInputAction(event);
            if (tvAction !== 'unknown') {
                event.preventDefault();
                const handled =
                    store.appState === 'menu'
                        ? handleTvMenuControls(store, tvAction, false)
                        : (store.appState === 'playing' || store.gameState === 'playing' || store.gameState === 'floating')
                            ? handleTvGameplayControls(store, tvAction, false)
                            : false;
                if (handled) {
                    return;
                }
            }
        }

        const normalizedCode = normalizeTvKeyCode(event);
        const legacyCode = resolveLegacyTvCode(event);

        if (event.code && event.code !== 'Unidentified') {
            store.keys[event.code] = false;
        }
        if (normalizedCode && normalizedCode !== 'Unidentified') {
            store.keys[normalizedCode] = false;
        } else if (legacyCode) {
            store.keys[legacyCode] = false;
        }

        if (normalizedCode && TV_FIRE_KEYS.has(normalizedCode)) {
            store.keys.Space = false;
        }
        if (normalizedCode === 'Escape' || event.code === 'Escape') {
            if (store.appState === 'playing') {
                resumeGame(store, 'pause-menu', { unfreezePlayer: true });
            } else {
                showMenu(store);
            }
        }
    });

    // Confirmación de acciones (Menú y Reiniciar)
    const openExitModal = (title: string, text: string, onConfirm: () => void, onCancel?: () => void) => {
        if (!exitModalEl) return;
        // Cerrar paneles del editor cuando se abre el modal
        closeEditorPanels(store);
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
            if (onCancel) onCancel();
        };
        exitConfirmBtn?.addEventListener('click', confirmHandler);
        exitCancelBtn?.addEventListener('click', cancelHandler);
    };

    // Abrir menú flotante
    openPauseMenu = () => {
        if (pauseMenu) {
            pauseGame(store, 'pause-menu');
            pauseMenu.classList.remove('hidden');
        }
    };
    const closePauseMenu = (releaseLock: boolean = true) => {
        if (pauseMenu) {
            pauseMenu.classList.add('hidden');
        }
        if (releaseLock) {
            resumeGame(store, 'pause-menu');
        }
    };
    if (pauseMenu) {
        pauseMenu.addEventListener('click', (event) => {
            if (event.target === pauseMenu) {
                closePauseMenu();
            }
        });
    }
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
    });
    pauseMainMenuBtn?.addEventListener('click', () => {
        closePauseMenu();
        showMenu(store);
    });
    pauseDynamicBtn?.addEventListener('click', async () => {
        const primary = resolvePrimaryAction(store);
        if (primary.action === 'login') {
            closePauseMenu();
            const authModal = document.getElementById('auth-choice-modal');
            authModal?.classList.remove('hidden');
        } else if (primary.action === 'editor') {
            closePauseMenu();
            // Verificar autenticación antes de abrir el editor
            const { isLoggedIn } = await checkLoginStatus();
            if (!isLoggedIn) {
                const authModal = document.getElementById('auth-choice-modal');
                authModal?.classList.remove('hidden');
                return;
            }
            startEditor(store, true);
        } else {
            // Logout
            closePauseMenu(false);
            openExitModal(t('modals.logoutConfirm'), t('modals.logoutMessage'), async () => {
                try {
                    // Cerrar sesión en Auth0
                    const { Auth0Manager } = await import('../auth0-manager');
                    await Auth0Manager.logout();
                } catch (error) {
                    console.error('[pauseDynamicBtn] Error cerrando sesión con Auth0:', error);
                }
                
                // Usar authManager para limpiar (pasar store para cerrar editor si está abierto)
                await authManager.handleLogout(store);
                
                // Actualizar UI
                updateEditorButton();
                updateUserArea();
                
                // Limpiar override de password legacy
                clearLegacyPasswordOverride();
                
                showMenu(store);
                resumeGame(store, 'pause-menu');
            }, () => {
                resumeGame(store, 'pause-menu');
            });
        }
    });
    pauseCreditsBtn?.addEventListener('click', () => {
        closePauseMenu();
        creditsModal?.classList.remove('hidden');
        // Remover clase de activación al abrir para resetear animaciones
        creditsModal?.classList.remove('paolo-activated');
        // NO iniciar partículas automáticamente - solo cuando se hace click en Paolo
    });
    
    // Botón de configuración en el menú de pausa
    pauseSettingsBtn?.addEventListener('click', () => {
        openSettingsModal(store);
        closePauseMenu(false);
        resumeGame(store, 'pause-menu');
    });

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
export const purgeEmptyRowsAndColumns = (level: string[][]): string[][] => {
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
 * Comparte el link del juego en redes sociales y copia a portapapeles
 * Muestra opciones para Twitter, Facebook, WhatsApp y copia directa
 */
const shareGameOnSocialMedia = (): void => {
    const gameUrl = window.location.origin;
    
    // Crear modal de compartir
    const modal = document.createElement('div');
    modal.id = 'share-game-modal';
    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    const shareOptions = `
        <div style="background: #222; border: 2px solid #fff; padding: 20px; max-width: 400px; border-radius: 8px; text-align: center;">
            <h2 style="font-family: 'Press Start 2P'; font-size: 18px; margin-bottom: 20px; color: #fff;">COMPARTIR JUEGO</h2>
            
            <!-- URL de compartir -->
            <div style="margin-bottom: 15px; display: flex; gap: 5px;">
                <input id="share-url-input" type="text" value="${gameUrl}" readonly style="flex: 1; padding: 8px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; font-size: 12px; font-family: monospace;" />
                <button id="share-copy" style="padding: 8px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">COPIAR</button>
            </div>
            
            <!-- Botones de redes sociales -->
            <div style="display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; margin-bottom: 15px;">
                <button id="share-twitter" style="flex: 1; min-width: 80px; padding: 10px; background: #1DA1F2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">TWITTER</button>
                <button id="share-facebook" style="flex: 1; min-width: 80px; padding: 10px; background: #1877F2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">FACEBOOK</button>
                <button id="share-whatsapp" style="flex: 1; min-width: 80px; padding: 10px; background: #25D366; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">WHATSAPP</button>
            </div>
            
            <!-- Botón cerrar -->
            <button id="share-close" style="width: 100%; padding: 10px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">CERRAR</button>
        </div>
    `;
    
    modal.innerHTML = shareOptions;
    document.body.appendChild(modal);
    
    // Event listeners
    const closeBtn = modal.querySelector('#share-close') as HTMLButtonElement;
    const copyBtn = modal.querySelector('#share-copy') as HTMLButtonElement;
    const twitterBtn = modal.querySelector('#share-twitter') as HTMLButtonElement;
    const facebookBtn = modal.querySelector('#share-facebook') as HTMLButtonElement;
    const whatsappBtn = modal.querySelector('#share-whatsapp') as HTMLButtonElement;
    const urlInput = modal.querySelector('#share-url-input') as HTMLInputElement;
    
    // Cerrar modal
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    // Copiar URL
    copyBtn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(gameUrl);
            copyBtn.textContent = '✓ COPIADO';
            copyBtn.style.background = '#4CAF50';
            setTimeout(() => {
                copyBtn.textContent = 'COPIAR';
            }, 2000);
        } catch (err) {
            console.error('Error al copiar:', err);
            alert('No se pudo copiar. Copia manualmente desde el campo de arriba.');
        }
    });
    
    // Twitter
    twitterBtn.addEventListener('click', () => {
        const text = `¡Juega H.E.R.O.! Un juego de plataformas retro increíble 🎮`;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(gameUrl)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
    });
    
    // Facebook
    facebookBtn.addEventListener('click', () => {
        const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(gameUrl)}`;
        window.open(facebookUrl, '_blank', 'width=600,height=400');
    });
    
    // WhatsApp
    whatsappBtn.addEventListener('click', () => {
        const text = `¡Echa un vistazo a este increíble juego de plataformas retro! 🎮`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + gameUrl)}`;
        window.open(whatsappUrl, '_blank');
    });
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

    try {
        console.log('=== INICIANDO COMPARTIR NIVEL ===');
        
        // CRÍTICO: Usar Auth0 en lugar de Netlify Identity
        const Auth0Manager = await initializeAuth0();
        const token = await Auth0Manager.getAccessToken();
        
        if (!token) {
            console.error('No se pudo obtener token de Auth0');
            showNotification(store, `❌ ${t('modals.errors.sessionExpired')}`, t('modals.errors.sessionExpired'));
            return;
        }
        
        const baseUrl = getNetlifyBaseUrl();
        console.log('Token obtenido de Auth0, baseUrl:', baseUrl);
        
        // Verificar que el nivel del editor existe y no está vacío
        if (!store.editorLevel || store.editorLevel.length === 0) {
            showNotification(store, `❌ Error`, 'El nivel está vacío. Por favor crea un nivel antes de compartir.');
            console.log('Nivel vacío');
            return;
        }
        
        console.log('Nivel editor válido, tamaño:', store.editorLevel.length);
        
        // Obtener el nivel actual del editor
        const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        const cleanedLevel = purgeEmptyRowsAndColumns(store.editorLevel);
        
        console.log('Nivel limpiado, tamaño:', cleanedLevel?.length);
        
        // Verificar que el nivel limpiado no está vacío
        if (!cleanedLevel || cleanedLevel.length === 0 || (cleanedLevel[0] && cleanedLevel[0].length === 0)) {
            showNotification(store, `❌ Error`, 'El nivel está vacío después de limpiar. Por favor agrega contenido al nivel.');
            console.log('Nivel limpiado vacío');
            return;
        }
        
        // Convertir a formato chunks20x18
        const levelsAsStrings = [cleanedLevel.map(row => row.join(''))];
        let levelData;
        try {
            levelData = buildChunkedFile20x18(levelsAsStrings);
            console.log('Datos convertidos exitosamente:', levelData);
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
            console.log('Screenshot generado:', screenshot ? 'Sí (tamaño: ' + screenshot.length + ' chars)' : 'No');
        } catch (screenshotError: any) {
            console.error('Error generando screenshot:', screenshotError);
            screenshot = ''; // Continuar sin screenshot si falla
        }
        
        // Preguntar por nombre y descripción
        console.log('Pidiendo nombre del nivel...');
        const name = await showPromptModal(store, t('messages.levelNamePrompt'), `${t('messages.myLevel')} ${index + 1}`);
        if (!name) {
            console.log('Usuario canceló nombre');
            return;
        }
        
        console.log('Nombre:', name);
        
        console.log('Pidiendo descripción del nivel...');
        const description = await showPromptModal(store, t('messages.levelDescriptionPrompt'), '');
        
        console.log('Descripción:', description || '(vacía)');
        
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
        
        console.log('Enviando fetch a:', galleryUrl);
        console.log('Payload size:', JSON.stringify(payload).length);
        
        const res = await fetch(galleryUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        console.log('Respuesta status:', res.status, res.statusText);
        
        if (!res.ok) {
            const errorText = await res.text().catch(() => 'Error desconocido');
            console.error('Error del servidor:', res.status, errorText);
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        const result = await res.json();
        console.log('Resultado:', result);
        
        if (result.ok) {
            showNotification(store, `✅ ${t('messages.levelShared')}`, t('messages.levelSharedSuccess'));
            console.log('Nivel compartido exitosamente');
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
        
        // Si el nivel está vacío o no existe, usar una copia del nivel 1 de Legacy
        if (store.levelDataStore[index] && store.levelDataStore[index].length > 0) {
            store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[index]));
        } else {
            // Si el nivel está vacío, usar una copia del nivel 1 de Legacy
            const legacyLevel1 = store.initialLevels[0] || store.levelDataStore[0];
            if (legacyLevel1) {
                if (typeof legacyLevel1[0] === 'string') {
                    // Es string[] (filas como strings), convertir a string[][]
                    store.editorLevel = (legacyLevel1 as string[]).map(row => row.split(''));
                } else {
                    // Ya es string[][]
                    store.editorLevel = JSON.parse(JSON.stringify(legacyLevel1));
                }
                // Guardar en levelDataStore para que no se pierda
                store.levelDataStore[index] = JSON.parse(JSON.stringify(store.editorLevel));
                store.initialLevels[index] = store.editorLevel.map(row => row.join(''));
                console.log(`[Editor] ✅ Nivel ${index} estaba vacío, se cargó plantilla del nivel 1 de Legacy`);
            } else {
                console.error(`[Editor] ❌ No se pudo cargar el nivel ${index}. Nivel 1 de Legacy no encontrado.`);
                store.editorLevel = [];
            }
        }
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
        // Actualizar el nombre del nivel en el game-ui cuando cambia el selector
        const levelCountEl = store.dom.ui.levelCountEl;
        if (levelCountEl && store.dom.ui.levelSelectorEl) {
            const selectedIndex = parseInt(store.dom.ui.levelSelectorEl.value ?? '0', 10);
            import('../utils/campaigns').then(({ getCurrentCampaign, getCampaignLevelIndices, getLevelNameFromCampaign }) => {
                if (!levelCountEl) return;
                // Intentar obtener el nombre del nivel desde la campaña
                const levelName = getLevelNameFromCampaign(store, selectedIndex);
                if (levelName) {
                    levelCountEl.textContent = levelName;
                } else {
                    // Si no hay nombre, mostrar el número de orden en la campaña
                    const campaign = getCurrentCampaign(store);
                    if (campaign && campaign.levels.length > 0) {
                        const levelIndices = getCampaignLevelIndices(store, campaign.id);
                        const positionInCampaign = levelIndices.findIndex(idx => idx === selectedIndex);
                        if (positionInCampaign >= 0) {
                            levelCountEl.textContent = `${positionInCampaign + 1}`;
                        } else {
                            levelCountEl.textContent = `${selectedIndex + 1}`;
                        }
                    } else {
                        levelCountEl.textContent = `${selectedIndex + 1}`;
                    }
                }
            }).catch(() => {
                if (levelCountEl) {
                    levelCountEl.textContent = `${selectedIndex + 1}`;
                }
            });
        }
    });

    store.dom.ui.addLevelBtn?.addEventListener('click', () => {
        // Crear un nuevo nivel como réplica del nivel 1 de Legacy
        // Obtener el nivel 1 de Legacy (índice 0)
        const legacyLevel1 = store.initialLevels[0] || store.levelDataStore[0];
        
        if (!legacyLevel1) {
            console.error('[Editor] No se pudo encontrar el nivel 1 de Legacy');
            showNotification(store, `❌ Error`, 'No se pudo crear el nivel. Nivel 1 de Legacy no encontrado.');
            return;
        }
        
        // Crear una copia profunda del nivel 1 de Legacy
        // Si legacyLevel1 es string[] (filas como strings), convertir a string[][]
        let newLevel: string[][];
        if (Array.isArray(legacyLevel1[0]) && typeof legacyLevel1[0] === 'string' && legacyLevel1[0].length > 0 && typeof legacyLevel1[0][0] === 'string') {
            // Ya es string[][]
            newLevel = JSON.parse(JSON.stringify(legacyLevel1));
        } else if (typeof legacyLevel1[0] === 'string') {
            // Es string[] (filas como strings), convertir a string[][]
            newLevel = (legacyLevel1 as string[]).map(row => row.split(''));
        } else {
            // Fallback: usar levelDataStore[0] si está disponible
            newLevel = store.levelDataStore[0] ? JSON.parse(JSON.stringify(store.levelDataStore[0])) : [];
        }
        
        // Agregar el nuevo nivel al final del array
        store.levelDataStore.push(JSON.parse(JSON.stringify(newLevel)));
        store.initialLevels.push(newLevel.map((row: string[]) => row.join('')));
        
        // Cargar el nuevo nivel en el editor
        store.editorLevel = JSON.parse(JSON.stringify(newLevel));
        
        // Seleccionar el nuevo nivel
        const newIndex = store.levelDataStore.length - 1;
        
        // Centrar la cámara en el jugador si existe
        const canvas = store.dom.canvas;
        if (canvas && newLevel.length > 0) {
            let playerCol = 0;
            let playerRow = 0;
            // Buscar la posición del jugador en el nivel
            outerLoop: for (let r = 0; r < newLevel.length; r++) {
                const c = newLevel[r]?.indexOf('P') ?? -1;
                if (c !== -1) {
                    playerRow = r;
                    playerCol = c;
                    break outerLoop;
                }
            }
            const levelCols = newLevel[0]?.length ?? 0;
            const levelRows = newLevel.length;
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
        }
        
        // Reinicializar el editor avanzado
        initializeAdvancedEditor(store);
        
        // Agregar automáticamente el nuevo nivel a la campaña actual (no a legacy)
        // Y luego actualizar el selector para mostrar solo los niveles de la campaña actual
        import('../utils/campaigns').then(async ({ getCurrentCampaign, addLevelToCampaign, getCampaignLevelIndices }) => {
            const currentCampaign = getCurrentCampaign(store);
            if (currentCampaign && !currentCampaign.isDefault) {
                // Solo agregar a campañas que no sean Legacy (Legacy es de solo lectura)
                await addLevelToCampaign(store, currentCampaign.id, newIndex);
                
                // Obtener la posición del nivel en la campaña (order + 1 para mostrar)
                const levelIndices = getCampaignLevelIndices(store, currentCampaign.id);
                const positionInCampaign = levelIndices.findIndex(idx => idx === newIndex);
                const levelNumber = positionInCampaign >= 0 ? positionInCampaign + 1 : newIndex + 1;
                
                // Actualizar el selector para mostrar solo los niveles de la campaña actual
                import('./campaigns-ui').then(({ syncLevelSelectorForCampaign }) => {
                    syncLevelSelectorForCampaign(store);
                    // Seleccionar el nuevo nivel después de sincronizar
                    if (store.dom.ui.levelSelectorEl) {
                        store.dom.ui.levelSelectorEl.value = newIndex.toString();
                        // Cargar el nivel seleccionado
                        loadLevelFromStore();
                    }
                });
                
                // Mostrar notificación con el número correcto del nivel en la campaña
                showNotification(store, `➕ ${t('editor.newLevel')}`, t('messages.newLevelCreated').replace('{n}', `${levelNumber}`));
            } else {
                // Si es Legacy o no hay campaña, usar el selector normal
                syncLevelSelector(store);
                if (store.dom.ui.levelSelectorEl) {
                    store.dom.ui.levelSelectorEl.value = newIndex.toString();
                }
                // Mostrar notificación con el índice global
                showNotification(store, `➕ ${t('editor.newLevel')}`, t('messages.newLevelCreated').replace('{n}', `${newIndex + 1}`));
            }
        });
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
        // Cerrar paneles del editor cuando se abre el modal
        closeEditorPanels(store);
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
            
            // Actualizar levelDataStore con el nivel generado para que se pueda cargar después
            if (!store.levelDataStore[index]) {
                store.levelDataStore[index] = [];
            }
            store.levelDataStore[index] = store.editorLevel.map(row => [...row]);
            
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
            
            // Agregar automáticamente el nivel generado a la campaña actual (no a legacy)
            // Y luego actualizar el selector para mostrar solo los niveles de la campaña actual
            import('../utils/campaigns').then(async ({ getCurrentCampaign, addLevelToCampaign, getCampaignLevelIndices }) => {
                const currentCampaign = getCurrentCampaign(store);
                if (currentCampaign && !currentCampaign.isDefault) {
                    // Solo agregar a campañas que no sean Legacy (Legacy es de solo lectura)
                    await addLevelToCampaign(store, currentCampaign.id, index);
                    
                    // Obtener la posición del nivel en la campaña (order + 1 para mostrar)
                    const levelIndices = getCampaignLevelIndices(store, currentCampaign.id);
                    const positionInCampaign = levelIndices.findIndex(idx => idx === index);
                    const levelNumber = positionInCampaign >= 0 ? positionInCampaign + 1 : index + 1;
                    
                    // Actualizar el selector para mostrar solo los niveles de la campaña actual
                    import('./campaigns-ui').then(({ syncLevelSelectorForCampaign }) => {
                        syncLevelSelectorForCampaign(store);
                        // Seleccionar el nivel generado después de sincronizar
                        if (store.dom.ui.levelSelectorEl) {
                            store.dom.ui.levelSelectorEl.value = index.toString();
                            // Cargar el nivel seleccionado
                            loadLevelFromStore();
                        }
                    });
                    
                    // Mostrar notificación con el número correcto del nivel en la campaña
                    showNotification(store, `🎲 ${t('editor.generateLevel')}`, `${t('messages.levelGenerated')} (${t('editor.levelNumber')} ${levelNumber}, ${t('editor.difficulty')}: ${difficulty})`);
                } else {
                    // Si es Legacy o no hay campaña, usar el selector normal
                    syncLevelSelector(store);
                    if (store.dom.ui.levelSelectorEl) {
                        store.dom.ui.levelSelectorEl.value = index.toString();
                    }
                    // Mostrar notificación con el índice global
                    showNotification(store, `🎲 ${t('editor.generateLevel')}`, `${t('messages.levelGenerated')} (${t('editor.levelNumber')} ${index + 1}, ${t('editor.difficulty')}: ${difficulty})`);
                }
            });
            
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
            if (!isLegacySuperUser() && !isLegacyPasswordOverrideActive()) {
                const unlocked = await requestLegacyPasswordUnlock(store);
                if (!unlocked) {
                    ensureEditorVisible(store);
                    return;
                }
            }
            // Payload completo para Legacy (todos los niveles de levels.json)
            const fullPayload = buildChunkedFile20x18(levelsAsStrings);
            
            // No guardar en localStorage - solo en servidor
            
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
            
            // No guardar copia en JSON para Legacy
            showNotification(store, `⚠️ ${t('modals.errors.saveSuccess')}`, 'Los cambios de Legacy se han guardado en el servidor.');
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
            // No descargar JSON - solo guardar en servidor
            showNotification(store, `⚠️ ${t('modals.errors.manualDownload')}`, 'Los niveles se han guardado en el servidor.');
            ensureEditorVisible(store);
        };

        // Intentar obtener el token JWT del usuario de Auth0
        const { Auth0Manager } = await import('../auth0-manager');
        let token: string | null = null;
        
        try {
            token = await Auth0Manager.getAccessToken();
            if (token) {
                console.log('[saveAllLevelsToFile] Token JWT de Auth0 obtenido exitosamente');
            } else {
                console.warn('[saveAllLevelsToFile] No se pudo obtener token de Auth0');
            }
        } catch (error) {
            console.error('[saveAllLevelsToFile] Error obteniendo token de Auth0:', error);
        }

        // Si aún no hay token, mostrar mensaje
        if (!token) {
            console.warn('[saveAllLevelsToFile] No se pudo obtener token JWT. El usuario puede no estar autenticado correctamente.');
            showNotification(store, `❌ ${t('modals.errors.notAuthenticated')}`, t('modals.errors.notAuthenticated'));
            return;
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

            console.log('[saveAllLevelsToFile] Intentando guardar niveles personalizados en Netlify:', {
                baseUrl,
                hasToken: !!token,
                endpoint: `${baseUrl}/.netlify/functions/levels`,
                originalLevels: originalCount,
                customLevels: customLevels.length
            });

            // IMPORTANTE: Solo guardar niveles personalizados adicionales en la BD
            // Los niveles originales siempre se sirven desde levels.json
            console.log('[saveAllLevelsToFile] Enviando payload a servidor:', {
                format: customPayload.format,
                levelsCount: customPayload.levels?.length || 0,
                hasToken: !!token
            });
            
            const response = await fetch(`${baseUrl}/.netlify/functions/levels`, {
                method: 'POST',
                headers,
                body: JSON.stringify(customPayload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[saveAllLevelsToFile] Error en respuesta de Netlify:', response.status, errorText);
                
                // Si es 401, el token puede haber expirado
                if (response.status === 401) {
                    console.warn('[saveAllLevelsToFile] Token expirado, intentando obtener nuevo token...');
                    try {
                        const { Auth0Manager } = await import('../auth0-manager');
                        const newToken = await Auth0Manager.getAccessToken();
                        if (newToken) {
                            // Reintentar con el nuevo token
                            const retryResponse = await fetch(`${baseUrl}/.netlify/functions/levels`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${newToken}`,
                                },
                                body: JSON.stringify(customPayload),
                            });
                            
                            if (retryResponse.ok) {
                                const retryResult = await retryResponse.json();
                                if (retryResult.ok) {
                                    console.log('[saveAllLevelsToFile] Niveles guardados exitosamente después de refrescar token');
                                    showNotification(store, `💾 ${t('modals.errors.saveSuccess')}`, t('modals.errors.saveSuccess'));
                                    ensureEditorVisible(store);
                                    return;
                                }
                            } else {
                                const retryErrorText = await retryResponse.text();
                                console.error('[saveAllLevelsToFile] Error en reintento:', retryResponse.status, retryErrorText);
                            }
                        }
                    } catch (retryError) {
                        console.error('[saveAllLevelsToFile] Error en reintento:', retryError);
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
            
            // No guardar en localStorage - solo en servidor
            
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

    // Función para validar que el nivel tiene hero y minero
    const validateLevelContent = (levelGrid: string[][]): { isValid: boolean; message: string } => {
        let hasHero = false;
        let hasMiner = false;
        
        for (let row of levelGrid) {
            for (let cell of row) {
                if (cell === 'P') hasHero = true;
                if (cell === '9') hasMiner = true;
            }
        }
        
        if (!hasHero && !hasMiner) {
            return { isValid: false, message: '⚠️ El nivel debe tener al menos un HÉROE (P) y un MINERO (9) para poder jugarse' };
        } else if (!hasHero) {
            return { isValid: false, message: '⚠️ El nivel necesita un HÉROE (P) para poder jugarse' };
        } else if (!hasMiner) {
            return { isValid: false, message: '⚠️ El nivel necesita un MINERO (9) para poder jugarse' };
        }
        
        return { isValid: true, message: '' };
    };

    saveAllBtn?.addEventListener('click', async () => {
        // Guardar automáticamente en la campaña actual
        const { getCurrentCampaign } = await import('../utils/campaigns');
        const { addLevelToCampaign, syncCampaignsToServer } = await import('../utils/campaigns');
        
        const currentCampaign = getCurrentCampaign(store);
        if (!currentCampaign) {
            showNotification(store, `❌ Error`, 'No hay campaña seleccionada');
            return;
        }
        
        // Validar contenido del nivel antes de guardar
        const validation = validateLevelContent(store.editorLevel);
        if (!validation.isValid) {
            showNotification(store, '❌ Validación fallida', validation.message);
            return;
        }
        
        const legacyCampaignSelected = currentCampaign.isDefault === true;
        if (legacyCampaignSelected && !isLegacySuperUser() && !isLegacyPasswordOverrideActive()) {
            const unlocked = await requestLegacyPasswordUnlock(store);
            if (!unlocked) {
                ensureEditorVisible(store);
                return;
            }
        }
        
        const levelIndex = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        
        // Limpiar filas y columnas vacías antes de guardar
        const cleanedLevel = purgeEmptyRowsAndColumns(store.editorLevel);
        store.levelDataStore[levelIndex] = JSON.parse(JSON.stringify(cleanedLevel));
        // Actualizar también el nivel del editor con la versión limpia
        store.editorLevel = cleanedLevel;
        
        // Agregar el nivel a la campaña actual (o actualizar si ya existe)
        // IMPORTANTE: Legacy es de solo lectura - no se pueden agregar niveles nuevos
        // Solo se pueden actualizar los niveles existentes (0-19)
        const result = await addLevelToCampaign(store, currentCampaign.id, levelIndex);
        
        if (result.success) {
            const isLegacyCampaign = currentCampaign.isDefault === true;
            
            // Si es Legacy y el nivel está fuera del rango válido (0-19), mostrar error
            if (isLegacyCampaign && (levelIndex < 0 || levelIndex >= 20)) {
                showNotification(store, `❌ Error`, 'Legacy solo tiene 20 niveles fijos (0-19). No se pueden agregar niveles nuevos.');
                ensureEditorVisible(store);
                return;
            }
            
            if (isLegacyCampaign) {
                await saveAllLevelsToFile();
                const message = result.alreadyExists
                    ? 'Nivel actualizado en la campaña Legacy'
                    : 'Nivel agregado a la campaña Legacy';
                showNotification(store, `💾 ${message}`, 'Archivo levels.json actualizado para Legacy (via descarga o endpoint local).');
                ensureEditorVisible(store);
                return;
            }
            
            // Para otras campañas: sincronizar con el servidor
            await syncCampaignsToServer(store);
            
            // IMPORTANTE: También guardar los niveles en la base de datos
            // Esto asegura que los niveles se persistan en la tabla levels
            await saveAllLevelsToFile();
            
            const message = result.alreadyExists 
                ? 'Nivel actualizado en la campaña'
                : 'Nivel agregado a la campaña';
            showNotification(store, `💾 ${message}`, `${message}: ${currentCampaign.name}`);
            
            // Asegurar que el editor permanezca visible y con el nivel cargado
            ensureEditorVisible(store);
            
            // Si no estamos en el editor, iniciarlo
            if (store.appState !== 'editing') {
                startEditor(store, true);
            } else {
                // Guardar el índice del nivel actual antes de sincronizar
                const currentLevelIndex = levelIndex;
                
                // Sincronizar el selector de niveles para la campaña actual
                const { syncLevelSelectorForCampaign } = await import('./campaigns-ui');
                syncLevelSelectorForCampaign(store);
                
                // IMPORTANTE: Después de sincronizar, volver a establecer el nivel que se estaba editando
                if (store.dom.ui.levelSelectorEl) {
                    store.dom.ui.levelSelectorEl.value = currentLevelIndex.toString();
                }
                // Sincronizar también el selector mobile
                const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
                if (levelSelectorMobile && store.dom.ui.levelSelectorEl) {
                    levelSelectorMobile.value = store.dom.ui.levelSelectorEl.value;
                }
                
                // Recargar el nivel en el editor para asegurar coherencia
                const { updateEditorLevelFromSelector } = await import('./editor');
                updateEditorLevelFromSelector(store);
                
                // Actualizar el nombre del nivel en level-count
                updateUiBar(store);
            }
        } else {
            showNotification(store, `❌ Error`, 'No se pudo guardar el nivel');
            ensureEditorVisible(store);
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
        
        // Asegurar que el editor permanezca visible y con el nivel cargado
        ensureEditorVisible(store);
        
        // Si no estamos en el editor, iniciarlo
        if (store.appState !== 'editing') {
            startEditor(store, true);
        } else {
            // Asegurar que el selector esté sincronizado con el nivel actual
            if (store.dom.ui.levelSelectorEl) {
                store.dom.ui.levelSelectorEl.value = index.toString();
            }
            // Sincronizar el selector de niveles para la campaña actual
            const { syncLevelSelectorForCampaign } = await import('./campaigns-ui');
            syncLevelSelectorForCampaign(store);
            // Recargar el nivel en el editor para asegurar coherencia
            const { updateEditorLevelFromSelector } = await import('./editor');
            updateEditorLevelFromSelector(store);
        }
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
        // Actualizar el nombre del nivel en el game-ui cuando cambia el selector
        const levelCountEl = store.dom.ui.levelCountEl;
        if (levelCountEl && store.dom.ui.levelSelectorEl) {
            const selectedIndex = parseInt(store.dom.ui.levelSelectorEl.value ?? '0', 10);
            import('../utils/campaigns').then(({ getCurrentCampaign, getCampaignLevelIndices, getLevelNameFromCampaign }) => {
                if (!levelCountEl) return;
                // Intentar obtener el nombre del nivel desde la campaña
                const levelName = getLevelNameFromCampaign(store, selectedIndex);
                if (levelName) {
                    levelCountEl.textContent = levelName;
                } else {
                    // Si no hay nombre, mostrar el número de orden en la campaña
                    const campaign = getCurrentCampaign(store);
                    if (campaign && campaign.levels.length > 0) {
                        const levelIndices = getCampaignLevelIndices(store, campaign.id);
                        const positionInCampaign = levelIndices.findIndex(idx => idx === selectedIndex);
                        if (positionInCampaign >= 0) {
                            levelCountEl.textContent = `${positionInCampaign + 1}`;
                        } else {
                            levelCountEl.textContent = `${selectedIndex + 1}`;
                        }
                    } else {
                        levelCountEl.textContent = `${selectedIndex + 1}`;
                    }
                }
            }).catch(() => {
                if (levelCountEl) {
                    levelCountEl.textContent = `${selectedIndex + 1}`;
                }
            });
        }
        // No actualizar el nombre de la campaña aquí, solo se actualiza al seleccionar la campaña
    });
    
    levelSelectorMobile?.addEventListener('change', () => {
        syncLevelSelectors(true);
        // Actualizar el nombre del nivel en el game-ui cuando cambia el selector mobile
        const levelCountEl = store.dom.ui.levelCountEl;
        if (levelCountEl && levelSelectorMobile) {
            const selectedIndex = parseInt(levelSelectorMobile.value ?? '0', 10);
            import('../utils/campaigns').then(({ getCurrentCampaign, getCampaignLevelIndices, getLevelNameFromCampaign }) => {
                if (!levelCountEl) return;
                // Intentar obtener el nombre del nivel desde la campaña
                const levelName = getLevelNameFromCampaign(store, selectedIndex);
                if (levelName) {
                    levelCountEl.textContent = levelName;
                } else {
                    // Si no hay nombre, mostrar el número de orden en la campaña
                    const campaign = getCurrentCampaign(store);
                    if (campaign && campaign.levels.length > 0) {
                        const levelIndices = getCampaignLevelIndices(store, campaign.id);
                        const positionInCampaign = levelIndices.findIndex(idx => idx === selectedIndex);
                        if (positionInCampaign >= 0) {
                            levelCountEl.textContent = `${positionInCampaign + 1}`;
                        } else {
                            levelCountEl.textContent = `${selectedIndex + 1}`;
                        }
                    } else {
                        levelCountEl.textContent = `${selectedIndex + 1}`;
                    }
                }
            }).catch(() => {
                if (levelCountEl) {
                    levelCountEl.textContent = `${selectedIndex + 1}`;
                }
            });
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
        // Cerrar paneles del editor cuando se abre el modal
        closeEditorPanels(store);
        if (exitTitleEl) exitTitleEl.textContent = t('modals.logoutConfirm');
        if (exitTextEl) exitTextEl.textContent = t('modals.logoutMessage');
        exitModalEl.classList.remove('hidden');
        const confirmHandler = async () => {
            try {
                // Cerrar sesión en Auth0
                const { Auth0Manager } = await import('../auth0-manager');
                await Auth0Manager.logout();
            } catch (error) {
                console.error('[logoutBtnMobile] Error cerrando sesión con Auth0:', error);
            }
            
            // Usar authManager para limpiar (pasar store para cerrar editor si está abierto)
            await authManager.handleLogout(store);
            
            // Limpiar override de password legacy
            clearLegacyPasswordOverride();
            
            // showMenu ya actualiza la UI, incluyendo el botón del editor
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
 * Muestra el modal de victoria de campaña con animación de confetti
 */
export const showCampaignVictoryModal = (store: GameStore) => {
    const victoryModal = document.getElementById('campaign-victory-modal');
    const victoryScoreValue = document.getElementById('victory-score-value');
    const victoryMessage = document.getElementById('campaign-victory-message');
    const mainMenuBtn = document.getElementById('campaign-victory-mainmenu-btn');
    
    if (!victoryModal) return;
    
    // Obtener nombre de la campaña actual
    const { getCurrentCampaign } = require('../utils/campaigns');
    const campaign = getCurrentCampaign(store);
    const campaignName = campaign?.name || 'Campaña';
    
    // Actualizar mensaje con el nombre de la campaña
    if (victoryMessage) {
        victoryMessage.textContent = `¡Felicitaciones! Has completado la campaña "${campaignName}".`;
    }
    
    // Mostrar el modal
    victoryModal.classList.remove('hidden');
    
    // Mostrar la puntuación
    const finalScore = store.lastRunScore || store.score;
    if (victoryScoreValue) {
        // Animación de conteo de puntos
        let currentScore = 0;
        const targetScore = finalScore;
        const duration = 2000; // 2 segundos
        const startTime = Date.now();
        
        const animateScore = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            currentScore = Math.floor(targetScore * progress);
            if (victoryScoreValue) {
                victoryScoreValue.textContent = currentScore.toLocaleString();
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateScore);
            } else {
                if (victoryScoreValue) {
                    victoryScoreValue.textContent = targetScore.toLocaleString();
                }
            }
        };
        
        requestAnimationFrame(animateScore);
    }
    
    // Animación de confetti
    const confettiCanvas = document.getElementById('victory-confetti') as HTMLCanvasElement;
    if (confettiCanvas) {
        const ctx = confettiCanvas.getContext('2d');
        if (ctx) {
            confettiCanvas.width = window.innerWidth;
            confettiCanvas.height = window.innerHeight;
            
            const confetti: Array<{
                x: number;
                y: number;
                vx: number;
                vy: number;
                color: string;
                size: number;
                rotation: number;
                rotationSpeed: number;
            }> = [];
            
            // Crear partículas de confetti (menos numerosas y más lentas)
            const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
            for (let i = 0; i < 50; i++) {
                confetti.push({
                    x: Math.random() * confettiCanvas.width,
                    y: -Math.random() * confettiCanvas.height,
                    vx: (Math.random() - 0.5) * 1.5,
                    vy: Math.random() * 0.8 + 0.5,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    size: Math.random() * 8 + 4,
                    rotation: Math.random() * Math.PI * 2,
                    rotationSpeed: (Math.random() - 0.5) * 0.1
                });
            }
            
            const animateConfetti = () => {
                ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
                
                confetti.forEach(particle => {
                    particle.x += particle.vx;
                    particle.y += particle.vy;
                    particle.rotation += particle.rotationSpeed;
                    // Sin gravedad - velocidad constante
                    
                    ctx.save();
                    ctx.translate(particle.x, particle.y);
                    ctx.rotate(particle.rotation);
                    ctx.fillStyle = particle.color;
                    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
                    ctx.restore();
                    
                    // Reiniciar partícula si sale de la pantalla
                    if (particle.y > confettiCanvas.height) {
                        particle.y = -10;
                        particle.x = Math.random() * confettiCanvas.width;
                    }
                });
                
                if (!victoryModal.classList.contains('hidden')) {
                    requestAnimationFrame(animateConfetti);
                }
            };
            
            animateConfetti();
        }
    }
    
    // Configurar botón de menú principal
    if (mainMenuBtn) {
        // Remover cualquier listener previo
        const newMainMenuBtn = mainMenuBtn.cloneNode(true) as HTMLButtonElement;
        mainMenuBtn.parentNode?.replaceChild(newMainMenuBtn, mainMenuBtn);
        
        const handleMainMenu = () => {
            victoryModal.classList.add('hidden');
            // Usar la función showMenu para volver al menú inicial correctamente
            showMenu(store);
        };
        
        newMainMenuBtn.addEventListener('click', handleMainMenu);
    }
};

/**
 * Configura la cruceta de direcciones (D-Pad) para panear el canvas en el editor mobile
 * Emula exactamente lo que hacen las flechas del teclado, incluyendo la expansión del nivel
 */
const setupEditorDpad = (store: GameStore) => {
    const dpadUp = document.getElementById('dpad-up') as HTMLButtonElement | null;
    const dpadDown = document.getElementById('dpad-down') as HTMLButtonElement | null;
    const dpadLeft = document.getElementById('dpad-left') as HTMLButtonElement | null;
    const dpadRight = document.getElementById('dpad-right') as HTMLButtonElement | null;
    
    if (!dpadUp || !dpadDown || !dpadLeft || !dpadRight) return;
    
    // Mostrar la cruceta en mobile
    const dpadEl = document.getElementById('editor-dpad');
    if (dpadEl) {
        dpadEl.style.display = 'block';
    }
    
    // Map para mantener track de qué botones están presionados
    const buttonStates: Record<string, boolean> = {
        'dpad-up': false,
        'dpad-down': false,
        'dpad-left': false,
        'dpad-right': false
    };
    
    // Función para actualizar el estado de las teclas en store.keys
    const updateKeyStates = () => {
        store.keys.ArrowUp = buttonStates['dpad-up'];
        store.keys.ArrowDown = buttonStates['dpad-down'];
        store.keys.ArrowLeft = buttonStates['dpad-left'];
        store.keys.ArrowRight = buttonStates['dpad-right'];
    };
    
    // Crear eventos de teclado sintéticos para que el sistema de editor los procese
    const createKeyEvent = (key: string, type: 'keydown' | 'keyup') => {
        const keyMap: Record<string, string> = {
            'dpad-up': 'ArrowUp',
            'dpad-down': 'ArrowDown',
            'dpad-left': 'ArrowLeft',
            'dpad-right': 'ArrowRight'
        };
        
        const event = new KeyboardEvent(type, {
            key: keyMap[key],
            code: keyMap[key],
            bubbles: true,
            cancelable: true
        });
        
        return event;
    };
    
    // Manejar touchstart y pointerdown
    const handleButtonDown = (buttonId: string) => {
        return (e: Event) => {
            e.preventDefault();
            if (!buttonStates[buttonId]) {
                buttonStates[buttonId] = true;
                const btn = e.target as HTMLElement;
                btn.classList.add('active');
                updateKeyStates();
                // Disparar evento de teclado sintético para que el editor lo procese
                window.dispatchEvent(createKeyEvent(buttonId, 'keydown'));
            }
        };
    };
    
    // Manejar touchend y pointerup
    const handleButtonUp = (buttonId: string) => {
        return (e: Event) => {
            e.preventDefault();
            if (buttonStates[buttonId]) {
                buttonStates[buttonId] = false;
                const btn = e.target as HTMLElement;
                btn.classList.remove('active');
                updateKeyStates();
                // Disparar evento de teclado sintético para que el editor lo procese
                window.dispatchEvent(createKeyEvent(buttonId, 'keyup'));
            }
        };
    };
    
    // Setup listeners para cada botón
    const setupButtonListeners = (btn: HTMLButtonElement, buttonId: string) => {
        // Touch events
        btn.addEventListener('touchstart', handleButtonDown(buttonId), { passive: false });
        btn.addEventListener('touchend', handleButtonUp(buttonId), { passive: false });
        btn.addEventListener('touchcancel', handleButtonUp(buttonId), { passive: false });
        
        // Pointer events (para mouse y pen también)
        btn.addEventListener('pointerdown', handleButtonDown(buttonId), { passive: false });
        btn.addEventListener('pointerup', handleButtonUp(buttonId), { passive: false });
        btn.addEventListener('pointercancel', handleButtonUp(buttonId), { passive: false });
        
        // Limpiar estado si se pierde el foco
        btn.addEventListener('pointerleave', () => {
            if (buttonStates[buttonId]) {
                buttonStates[buttonId] = false;
                btn.classList.remove('active');
                updateKeyStates();
                window.dispatchEvent(createKeyEvent(buttonId, 'keyup'));
            }
        });
    };
    
    setupButtonListeners(dpadUp, 'dpad-up');
    setupButtonListeners(dpadDown, 'dpad-down');
    setupButtonListeners(dpadLeft, 'dpad-left');
    setupButtonListeners(dpadRight, 'dpad-right');
    
    // ===== HACER EL D-PAD DRAGGABLE =====
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    const handleDragStart = (e: PointerEvent | TouchEvent) => {
        // Permitir drag solo desde el botón central (dpad-draw) o desde el contenedor
        const target = e.target as HTMLElement;
        const isDpadDraw = target.classList.contains('dpad-draw');
        const isDpadContainer = target.classList.contains('dpad-container') || target.classList.contains('editor-dpad');
        const isOtherButton = target.classList.contains('dpad-btn') && !isDpadDraw;
        
        if (isOtherButton) {
            return;
        }
        
        isDragging = true;
        dpadEl?.classList.add('dragging');
        
        const clientX = e instanceof PointerEvent ? e.clientX : e.touches?.[0]?.clientX ?? 0;
        const clientY = e instanceof PointerEvent ? e.clientY : e.touches?.[0]?.clientY ?? 0;
        
        dragStartX = clientX;
        dragStartY = clientY;
        
        // Obtener posición actual del elemento
        const rect = dpadEl?.getBoundingClientRect();
        if (rect) {
            dragOffsetX = clientX - rect.left;
            dragOffsetY = clientY - rect.top;
        }
    };
    
    const handleDragMove = (e: PointerEvent | TouchEvent) => {
        if (!isDragging || !dpadEl) return;
        
        e.preventDefault();
        
        const clientX = e instanceof PointerEvent ? e.clientX : e.touches?.[0]?.clientX ?? 0;
        const clientY = e instanceof PointerEvent ? e.clientY : e.touches?.[0]?.clientY ?? 0;
        
        const deltaX = clientX - dragStartX;
        const deltaY = clientY - dragStartY;
        
        // Calcular nueva posición
        const rect = dpadEl.getBoundingClientRect();
        let newLeft = rect.left + deltaX;
        let newTop = rect.top + deltaY;
        
        // Limitar al viewport
        const minX = 0;
        const maxX = window.innerWidth - rect.width;
        const minY = 0;
        const maxY = window.innerHeight - rect.height;
        
        newLeft = Math.max(minX, Math.min(maxX, newLeft));
        newTop = Math.max(minY, Math.min(maxY, newTop));
        
        // Aplicar nueva posición
        dpadEl.style.position = 'fixed';
        dpadEl.style.left = newLeft + 'px';
        dpadEl.style.top = newTop + 'px';
        dpadEl.style.bottom = 'auto';
        dpadEl.style.transform = 'none';
        
        dragStartX = clientX;
        dragStartY = clientY;
    };
    
    const handleDragEnd = () => {
        isDragging = false;
        dpadEl?.classList.remove('dragging');
    };
    
    // Listeners para drag
    if (dpadEl) {
        // Pointer events
        dpadEl.addEventListener('pointerdown', handleDragStart as EventListener, { passive: false });
        document.addEventListener('pointermove', handleDragMove as EventListener, { passive: false });
        document.addEventListener('pointerup', handleDragEnd);
        document.addEventListener('pointercancel', handleDragEnd);
        
        // Touch events como fallback
        dpadEl.addEventListener('touchstart', handleDragStart as EventListener, { passive: false });
        document.addEventListener('touchmove', handleDragMove as EventListener, { passive: false });
        document.addEventListener('touchend', handleDragEnd);
        document.addEventListener('touchcancel', handleDragEnd);
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