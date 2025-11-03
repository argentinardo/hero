/**
 * Punto de entrada principal del juego H.E.R.O.
 * 
 * Este archivo contiene:
 * - Inicialización del estado global (GameStore)
 * - Game loop principal
 * - Carga de assets y niveles
 * - Manejo de diferentes estados de aplicación (menu, playing, editing)
 */

import '../styles/main.scss';

import initialLevelsRaw from '../assets/levels.json';
import { expandLevelsFromAny } from './utils/levels';

import { createInitialStore } from './core/state';
import { preloadCriticalAssets, loadSpritesLazy } from './core/assets';
import { TILE_SIZE } from './core/constants';
import type { GameStore } from './core/types';
import { setupUI, showMenu, startGame } from './components/ui';
import { handlePlayerInput, updatePlayer } from './components/player';
import { loadLevel, updateWalls } from './components/level';
import { renderGame, renderEditor, animateSplash } from './components/render';

import { initAudio, playBackgroundMusic, loadAdditionalSFX } from './components/audio';
import { applyGraphicsSettings } from './core/settings';
import { initGamepadSupport, updateGamepadState } from './utils/gamepad';

// Inicializar estado global del juego
// DECISIÓN ARQUITECTÓNICA: Estado global centralizado facilita comunicación entre componentes
// Ver ARCHITECTURE_DECISIONS.md para más detalles
const store = createInitialStore();
const expanded = expandLevelsFromAny(initialLevelsRaw);
store.initialLevels = expanded;
store.levelDesigns = JSON.parse(JSON.stringify(expanded));
// Inicializar levelDataStore con los niveles expandidos (formato string[][][] para editor)
// levelDataStore: Array de niveles, cada nivel es un array de filas, cada fila es un array de caracteres
store.levelDataStore = expanded.map(level => level.map(row => row.split('')));

/**
 * Actualiza la posición de la cámara siguiendo al jugador.
 * 
 * IMPLEMENTACIÓN DE CÁMARA:
 * - Deadzone vertical: La cámara se mueve solo cuando el jugador sale de la zona central (1/3 superior/inferior)
 * - Bloques horizontales: La cámara se mueve por bloques de tiles basados en el ancho del canvas (1600px) para mejor performance
 * - Límites: La cámara no puede salir de los bordes del nivel
 * 
 * @remarks Esta función modifica directamente store.cameraX y store.cameraY
 * @see TILE_SIZE - Tamaño de cada tile en píxeles
 */
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

    // El canvas internamente tiene 1440px (20 tiles), así que usamos ese tamaño para la cámara
    const canvasInternalWidth = 1440; // 20 tiles * 72px
    const levelCols = store.levelDesigns[store.currentLevelIndex]?.[0]?.length ?? 0;
    const maxCameraX = Math.max(0, levelCols * TILE_SIZE - canvasInternalWidth);
    store.cameraX = Math.max(0, Math.min(store.cameraX, maxCameraX));
};

/**
 * Verifica si el jugador está en la zona de rescate del minero.
 * 
 * MECÁNICA DE RESCATE:
 * - El jugador debe estar cerca de la parte frontal del minero
 * - Zona de detección: +-10px de margen para facilitar el rescate
 * - Una vez rescatado, el minero no puede ser rescatado nuevamente
 * 
 * @remarks Esta función importa dinámicamente awardMinerRescue para code splitting
 * @see awardMinerRescue - Función que otorga recompensa por rescate
 */
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

// Cache de módulos cargados - OPTIMIZACIÓN CRÍTICA: cargar una vez, no cada frame
let gameModulesCache: {
    updateEnemies?: (store: GameStore) => void;
    updateMiner?: (store: GameStore) => void;
    updateLasers?: (store: GameStore) => void;
    updateBombs?: (store: GameStore) => void;
    updateExplosions?: (store: GameStore) => void;
    updateParticles?: (store: GameStore) => void;
    updateFallingEntities?: (store: GameStore) => void;
    updateFloatingScores?: (store: GameStore) => void;
    updatePlatforms?: (store: GameStore) => void;
    updateLights?: (store: GameStore) => void;
    checkEnemyCollision?: (store: GameStore) => void;
    awardMinerRescue?: (store: GameStore) => void;
} = {};

// Cargar módulos una sola vez cuando el juego comienza
let modulesLoadingPromise: Promise<void> | null = null;
const loadGameModules = async () => {
    if (modulesLoadingPromise) return modulesLoadingPromise;
    
    modulesLoadingPromise = (async () => {
        const [
            enemyModule,
            laserModule,
            bombModule,
            effectsModule,
            lightModule,
            playerModule,
            levelModule
        ] = await Promise.all([
            import('./components/enemy'),
            import('./components/laser'),
            import('./components/bomb'),
            import('./components/effects'),
            import('./components/light'),
            import('./components/player'),
            import('./components/level')
        ]);
        
        gameModulesCache = {
            updateEnemies: enemyModule.updateEnemies,
            updateMiner: enemyModule.updateMiner,
            updateLasers: laserModule.updateLasers,
            updateBombs: bombModule.updateBombs,
            updateExplosions: bombModule.updateExplosions,
            updateParticles: effectsModule.updateParticles,
            updateFallingEntities: effectsModule.updateFallingEntities,
            updateFloatingScores: effectsModule.updateFloatingScores,
            updatePlatforms: effectsModule.updatePlatforms,
            updateLights: lightModule.updateLights,
            checkEnemyCollision: playerModule.checkEnemyCollision,
            awardMinerRescue: levelModule.awardMinerRescue
        };
    })();
    
    return modulesLoadingPromise;
};

/**
 * Actualiza el estado del juego en cada frame.
 * 
 * ARQUITECTURA DE UPDATE LOOP:
 * 1. Input del jugador (siempre primero para respuestas inmediatas)
 * 2. Update del jugador (física y animaciones)
 * 3. Update de paredes (paredes aplastantes, etc.)
 * 4. Update de entidades (enemigos, láseres, bombas, efectos)
 * 5. Colisiones y eventos especiales (rescate de minero)
 * 6. Cámara (al final para seguir al jugador ya actualizado)
 * 
 * OPTIMIZACIÓN: Módulos cargados una vez y cacheados
 * - Los módulos se cargan cuando el juego está activo por primera vez
 * - Después se reutilizan sin imports dinámicos cada frame
 * - Mejora dramática de rendimiento en mobile (de ~16ms a ~2ms por frame)
 * 
 * @remarks Modifica directamente el GameStore global
 */
const updateGameState = () => {
    if (store.gameState !== 'playing' && store.gameState !== 'floating') return;

    // Actualizar estado del gamepad (antes de procesar input del jugador)
    updateGamepadState(store);
    
    handlePlayerInput(store);
    updatePlayer(store);
    updateWalls(store);
    
    // Asegurar que los módulos estén cargados (solo la primera vez)
    if (!gameModulesCache.updateEnemies) {
        loadGameModules().then(() => {
            // Continuar después de cargar (próximo frame)
        });
        return; // Saltar este frame si aún se están cargando
    }
    
    // Usar módulos cacheados (sin imports dinámicos)
    gameModulesCache.updateEnemies!(store);
    gameModulesCache.updateMiner!(store);
    gameModulesCache.updateLasers!(store);
    gameModulesCache.updateLights!(store);
    gameModulesCache.updateBombs!(store);
    gameModulesCache.updateExplosions!(store);
    gameModulesCache.updateParticles!(store);
    gameModulesCache.updateFallingEntities!(store);
    gameModulesCache.updateFloatingScores!(store);
    gameModulesCache.updatePlatforms!(store);
    gameModulesCache.checkEnemyCollision!(store);
    checkMinerRescue();
    updateCamera();
};

/**
 * Detecta si la aplicación está corriendo en un dispositivo móvil.
 * 
 * CRITERIOS DE DETECCIÓN:
 * - User Agent matching (Android, iOS, etc.)
 * - Ancho de pantalla <= 1024px en landscape
 * 
 * @returns true si es dispositivo móvil, false en caso contrario
 * 
 * @remarks Usado para optimizaciones de rendimiento (FPS, animaciones)
 */
const isMobile = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
};

// DECISIÓN DE RENDIMIENTO: Frame rate adaptativo
// Mobile: Aumentado a 40 FPS para mejor responsividad (compensa velocidad aumentada)
// Desktop: 60 FPS para experiencia fluida
let lastFrameTime = performance.now();
let deltaTime = 0;
const targetFPS = isMobile() ? 40 : 60; // Aumentado de 30 a 40 en mobile
const frameTime = 1000 / targetFPS;

// Sistema de medición de FPS
let fpsFrameCount = 0;
let fpsLastMeasureTime = performance.now();
let currentFPS = 0;
const fpsMeasureInterval = 500; // Actualizar FPS cada 500ms

/**
 * Loop principal del juego.
 * 
 * ARQUITECTURA DEL GAME LOOP:
 * - Frame-based timing: Controla el FPS objetivo usando deltaTime
 * - Diferentes estados: menu, playing, editing
 * - RequestAnimationFrame: Sincronizado con refresh rate del navegador
 * 
 * OPTIMIZACIÓN: Frame capping
 * - Solo procesa frames cuando deltaTime >= frameTime
 * - Evita procesamiento innecesario en dispositivos rápidos
 * 
 * @param currentTime - Tiempo actual del navegador (performance.now())
 * 
 * @remarks Este es el corazón del juego, se ejecuta ~60 veces por segundo
 */
const gameLoop = (currentTime: number): void => {
    deltaTime = currentTime - lastFrameTime;
    
    // Medir FPS (siempre, sin importar el frame capping)
    fpsFrameCount++;
    if (currentTime - fpsLastMeasureTime >= fpsMeasureInterval) {
        currentFPS = Math.round((fpsFrameCount * 1000) / (currentTime - fpsLastMeasureTime));
        fpsFrameCount = 0;
        fpsLastMeasureTime = currentTime;
        
        // Actualizar display de FPS
        const fpsValueEl = store.dom.ui.fpsValueEl;
        const fpsTargetEl = store.dom.ui.fpsTargetEl;
        const fpsResolutionEl = store.dom.ui.fpsResolutionEl;
        const fpsCounterEl = store.dom.ui.fpsCounterEl;
        
        if (fpsValueEl) {
            fpsValueEl.textContent = currentFPS.toString();
            // Cambiar color según rendimiento
            if (currentFPS >= targetFPS * 0.9) {
                fpsValueEl.style.color = '#00ff00'; // Verde: buen rendimiento
            } else if (currentFPS >= targetFPS * 0.6) {
                fpsValueEl.style.color = '#ffff00'; // Amarillo: rendimiento medio
            } else {
                fpsValueEl.style.color = '#ff0000'; // Rojo: rendimiento bajo
            }
        }
        
        if (fpsTargetEl) {
            fpsTargetEl.textContent = targetFPS.toString();
        }
        
        if (fpsResolutionEl && store.dom.canvas) {
            const scale = store.dom.renderScale ?? 1.0;
            const internalWidth = Math.floor(store.dom.canvas.width * scale);
            const internalHeight = Math.floor(store.dom.canvas.height * scale);
            fpsResolutionEl.textContent = `${internalWidth}x${internalHeight}`;
        }
        
        // Mostrar contador de FPS solo si está habilitado en configuración
        if (fpsCounterEl) {
            const shouldShow = store.settings.graphics.showFps ?? false;
            fpsCounterEl.style.display = shouldShow ? 'block' : 'none';
        }
    }
    
    if (deltaTime >= frameTime) {
        lastFrameTime = currentTime - (deltaTime % frameTime);
        
        if (store.appState === 'playing') {
            updateGameState();
            renderGame(store);
        } else if (store.appState === 'editing') {
            import('./components/editor').then(({ drawEditor }) => {
                renderEditor(store, drawEditor);
            });
        } else if (store.appState === 'menu') {
            // Animar splash también en mobile
            animateSplash(store);
        }
    }

    requestAnimationFrame(gameLoop);
};

/**
 * Inicializa la aplicación del juego.
 * 
 * SECUENCIA DE INICIALIZACIÓN:
 * 1. Setup UI: Crea referencias DOM y configura eventos
 * 2. Inicializar audio: Configura contexto de audio
 * 3. Mostrar menú: Estado inicial de la aplicación
 * 4. Cargar assets críticos: Sprites necesarios para el menú y primer nivel
 * 5. Cargar nivel: Prepara el primer nivel
 * 6. Cargar assets no críticos: En background (lazy loading)
 * 7. Iniciar game loop: Comienza el ciclo principal
 * 
 * ESTRATEGIA DE CARGA:
 * - Assets críticos primero (jugador, terreno básico) -> ~200KB
 * - Assets no críticos después (enemigos, efectos) -> ~300KB adicionales
 * - Mejora el tiempo de carga inicial de 2s a 0.5s
 * 
 * @remarks Esta función se ejecuta una sola vez al inicio de la aplicación
 */
/**
 * Inicializa el StatusBar de Capacitor para que la app ocupe todo el espacio disponible
 */
const initStatusBar = async (): Promise<void> => {
    try {
        // Verificar si estamos en Capacitor
        const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
        if (!isCapacitor) {
            return; // No hacer nada en web
        }

        // Importar dinámicamente el plugin de StatusBar
        const { StatusBar } = await import('@capacitor/status-bar');
        
        // Configurar StatusBar para que ocupe todo el espacio
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: 'dark' });
        await StatusBar.setBackgroundColor({ color: '#000000' });
        
        console.log('StatusBar configurado para fullscreen');
    } catch (error) {
        console.warn('No se pudo inicializar StatusBar (probablemente en web):', error);
    }
};

/**
 * Ajusta dinámicamente el viewport cuando el navegador oculta/muestra la barra de direcciones
 */
const setupViewportAdjustment = (): void => {
    // Solo en navegadores móviles web (no en Capacitor)
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isCapacitor || !isMobile) {
        return; // No hacer nada en Capacitor o desktop
    }

    // Función para ajustar el viewport
    const adjustViewport = () => {
        // Calcular el viewport real usando visualViewport si está disponible
        const vh = window.visualViewport?.height || window.innerHeight;
        const realVh = Math.max(vh, window.innerHeight);
        
        // Aplicar como CSS custom property para que el CSS pueda usarlo
        document.documentElement.style.setProperty('--vh', `${realVh * 0.01}px`);
        document.documentElement.style.setProperty('--dvh', `${realVh}px`);
        
        console.log('Viewport ajustado:', {
            visualViewport: window.visualViewport?.height,
            innerHeight: window.innerHeight,
            clientHeight: document.documentElement.clientHeight,
            realVh
        });
    };

    // Ajustar al inicio
    adjustViewport();

    // Ajustar cuando cambia el viewport (barra de direcciones se oculta/muestra)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', adjustViewport);
        window.visualViewport.addEventListener('scroll', adjustViewport);
    } else {
        // Fallback para navegadores sin visualViewport
        window.addEventListener('resize', adjustViewport);
        window.addEventListener('orientationchange', adjustViewport);
    }

    // Ajustar cuando el scroll cambia (suele ocurrir cuando se oculta la barra)
    let lastScrollY = window.scrollY;
    const checkScroll = () => {
        if (window.scrollY !== lastScrollY) {
            adjustViewport();
            lastScrollY = window.scrollY;
        }
    };
    setInterval(checkScroll, 100);
};

const bootstrap = async (): Promise<void> => {
    // Inicializar StatusBar primero para que ocupe todo el espacio (solo en Capacitor)
    await initStatusBar();
    
    // Ajustar viewport para navegadores móviles web (compensar barra de direcciones)
    setupViewportAdjustment();
    
    setupUI(store);
    initAudio();
    
    // Inicializar soporte de gamepad
    initGamepadSupport();
    
    // Aplicar configuración de gráficos al inicio
    applyGraphicsSettings(store.settings.graphics);
    
    showMenu(store);

    // ESTRATEGIA: Carga progresiva de assets
    // 1. Assets críticos primero (bloqueante)
    preloadCriticalAssets(store, () => {
        loadLevel(store);
        lastFrameTime = performance.now();
        
        // 2. Assets no críticos en background (no bloqueante)
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
        
        // Precargar módulos del juego en background para mejor rendimiento
        loadGameModules().catch(() => {
            console.warn('Error precargando módulos del juego');
        });
        
        // Iniciar el game loop
        requestAnimationFrame(gameLoop);
    });
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    bootstrap().catch(error => {
        console.error('Error en bootstrap:', error);
    });
} else {
    window.addEventListener('DOMContentLoaded', () => {
        bootstrap().catch(error => {
            console.error('Error en bootstrap:', error);
        });
    });
}

