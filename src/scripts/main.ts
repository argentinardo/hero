/**
 * # NEW H.E.R.O. - Motor de Juego
 * 
 * Punto de entrada principal del juego H.E.R.O.
 * 
 * Este es el archivo principal que orquesta todo el funcionamiento del juego.
 * 
 * ## Arquitectura del Juego
 * 
 * El juego sigue una arquitectura basada en un **game loop** principal que se ejecuta
 * aproximadamente 60 veces por segundo (o 30 FPS en móviles para mejor rendimiento).
 * 
 * ### Flujo Principal:
 * 
 * 1. **Inicialización** (`bootstrap()`):
 *    - Configuración del StatusBar (solo en Capacitor)
 *    - Ajuste del viewport para navegadores móviles
 *    - Setup de la UI (referencias DOM, event listeners)
 *    - Inicialización del sistema de audio
 *    - Configuración de gamepad (joystick Bluetooth)
 *    - Aplicación de configuraciones gráficas
 *    - Carga de assets críticos (sprites del jugador, terreno básico)
 *    - Inicio del game loop
 * 
 * 2. **Game Loop** (`gameLoop()`):
 *    - Se ejecuta usando `requestAnimationFrame` para sincronización con el navegador
 *    - Controla el frame rate (60 FPS desktop, 30 FPS móvil)
 *    - Actualiza el estado del juego según el estado actual:
 *      - **menu**: Muestra el menú principal con animación de splash
 *      - **playing**: Actualiza física del jugador, enemigos, colisiones, y renderiza
 *      - **editing**: Renderiza el editor de niveles con herramientas de edición
 * 
 * 3. **Estados del Juego**:
 *    - `menu`: Estado inicial, muestra menú principal
 *    - `playing`: Juego activo, jugador controlando al héroe
 *    - `editing`: Editor de niveles, permite crear/modificar niveles
 * 
 * ## Componentes Principales
 * 
 * - **GameStore**: Estado global centralizado del juego (vidas, energía, posición, nivel actual, etc.)
 * - **Player**: Lógica del jugador (movimiento, física, colisiones, animaciones)
 * - **Level**: Sistema de niveles (carga, renderizado de tiles, colisiones)
 * - **Render**: Motor de renderizado (dibuja sprites, efectos, UI)
 * - **Audio**: Sistema de sonido (música de fondo, efectos de sonido)
 * - **UI**: Interfaz de usuario (menús, modales, configuración)
 * 
 * ## Flujo de Renderizado
 * 
 * 1. El canvas tiene dimensiones internas fijas (1440px ancho = 20 tiles)
 * 2. El CSS escala el canvas visualmente a 1600px para mejor uso del espacio
 * 3. En móvil, el canvas muestra 20 tiles de ancho x 9 tiles de alto
 * 4. El renderizado usa un sistema de cámara que sigue al jugador
 * 5. Solo se renderizan los elementos visibles en pantalla (culling)
 * 
 * ## Sistema de Cámara
 * 
 * La cámara sigue al jugador con una "deadzone":
 * - Si el jugador está en el centro (1/3 superior/inferior), la cámara no se mueve
 * - Si el jugador sale de la deadzone, la cámara se desplaza suavemente
 * - La cámara se mueve por bloques de tiles para mejor performance
 * - No puede salir de los bordes del nivel
 * 
 * @see {@link GameStore} - Estado global del juego
 * @see {@link handlePlayerInput} - Manejo de entrada del usuario
 * @see {@link updatePlayer} - Actualización de física del jugador
 * @see {@link renderGame} - Motor de renderizado
 * 
 * @module Main
 * @author NEW H.E.R.O. Development Team
 * @since 1.0.0
 */

import '../styles/main.scss';

import initialLevelsRaw from '../assets/levels.json';
import { expandLevelsFromAny } from './utils/levels';

import { createInitialStore } from './core/state';
import { preloadCriticalAssets, loadSpritesLazy } from './core/assets';
import { TILE_SIZE } from './core/constants';
import type { GameStore } from './core/types';
import { setupUI, showMenu, startGame, handleGamepadMenuActions } from './components/ui';
import { handlePlayerInput, updatePlayer } from './components/player';
import { loadLevel, updateWalls } from './components/level';
import { renderGame, renderEditor, animateSplash } from './components/render';

import { initAudio, playBackgroundMusic, loadAdditionalSFX, setMusicVolume, setSFXVolume } from './components/audio';
import { applyGraphicsSettings, loadSettings } from './core/settings';
import { initGamepadSupport, updateGamepadState } from './utils/gamepad';
import { isTvMode } from './utils/device';

// ============================================
// MANEJO GLOBAL DE ERRORES - CRÍTICO PARA DEBUG
// ============================================
// Capturar TODOS los errores no manejados para debugging en APK
window.addEventListener('error', (event) => {
    console.error('❌ ERROR GLOBAL NO CAPTURADO:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        stack: event.error?.stack
    });
    // Intentar mostrar en pantalla también (útil en APK)
    try {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:99999;font-family:monospace;font-size:12px;white-space:pre-wrap;';
        errorDiv.textContent = `ERROR: ${event.message}\n${event.error?.stack || 'No stack trace'}`;
        document.body.appendChild(errorDiv);
    } catch (e) {
        // Si no podemos mostrar en pantalla, al menos loguear
        console.error('No se pudo mostrar error en pantalla:', e);
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ PROMISE RECHAZADA NO MANEJADA:', {
        reason: event.reason,
        promise: event.promise
    });
    // Intentar mostrar en pantalla también
    try {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;background:orange;color:white;padding:20px;z-index:99999;font-family:monospace;font-size:12px;white-space:pre-wrap;';
        errorDiv.textContent = `PROMISE REJECTED: ${String(event.reason)}\n${event.reason?.stack || ''}`;
        document.body.appendChild(errorDiv);
    } catch (e) {
        console.error('No se pudo mostrar promise rejection en pantalla:', e);
    }
});

console.log('[Main] ✅ Handlers globales de errores configurados');

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
// Inicializar levelNames con nombres generados automáticamente
store.levelNames = expanded.map((_, index) => `Level ${index + 1}`);
// Inicializar sistema de campañas
import('./utils/campaigns').then(({ initializeCampaigns }) => {
    initializeCampaigns(store, expanded.length);
});

/**
 * Actualiza la posición de la cámara siguiendo al jugador.
 * 
 * ## Sistema de Cámara
 * 
 * El juego utiliza un sistema de cámara inteligente que sigue al jugador de forma suave
 * y eficiente:
 * 
 * ### Deadzone Vertical
 * - La cámara tiene una "zona muerta" vertical en el centro de la pantalla
 * - Si el jugador está en el 1/3 superior o inferior del viewport, la cámara no se mueve
 * - Solo cuando el jugador sale de esta zona, la cámara comienza a seguir
 * - Esto evita que la cámara se mueva constantemente con pequeños movimientos
 * 
 * ### Movimiento por Bloques
 * - La cámara se mueve por bloques de tiles (no pixel a pixel)
 * - Cada bloque es del tamaño del ancho del canvas (20 tiles = 1440px)
 * - Esto mejora el rendimiento al reducir cálculos de scroll
 * - El movimiento es suave pero eficiente
 * 
 * ### Límites
 * - La cámara no puede salir de los bordes del nivel
 * - Si el nivel es más pequeño que el viewport, la cámara se centra
 * - Si el nivel es más grande, la cámara se limita a los bordes
 * 
 * @remarks Esta función modifica directamente `store.cameraX` y `store.cameraY`
 * 
 * @example
 * ```typescript
 * // Se llama automáticamente en el game loop
 * updateCamera();
 * ```
 * 
 * @see {@link TILE_SIZE} - Tamaño de cada tile en píxeles (72px)
 * @see {@link GameStore} - Estado global del juego
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

// Cache para el editor
let editorModuleCache: { drawEditor?: (store: GameStore) => void } | null = null;
let editorLoadingPromise: Promise<void> | null = null;

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
 * ## Arquitectura del Game Loop
 * 
 * El game loop es el corazón del juego y se ejecuta continuamente usando
 * `requestAnimationFrame` para sincronización con el refresh rate del navegador.
 * 
 * ### Frame-based Timing
 * - Controla el FPS objetivo usando `deltaTime` (tiempo transcurrido desde el último frame)
 * - Desktop: 60 FPS (target)
 * - Móvil: 40 FPS (optimizado para mejor rendimiento)
 * - Solo procesa frames cuando `deltaTime >= frameTime` (frame capping)
 * 
 * ### Estados del Juego
 * 
 * El loop maneja diferentes estados de la aplicación:
 * - **menu**: Muestra el menú principal con animación de splash
 * - **playing**: Juego activo, actualiza física, colisiones, y renderiza
 * - **editing**: Editor de niveles, renderiza herramientas de edición
 * 
 * ### Flujo por Frame
 * 
 * 1. **Cálculo de deltaTime**: Tiempo transcurrido desde el último frame
 * 2. **Frame Capping**: Solo procesa si `deltaTime >= frameTime`
 * 3. **Actualización según estado**:
 *    - `menu`: Animación de splash
 *    - `playing`: Actualiza estado del juego, renderiza
 *    - `editing`: Renderiza editor
 * 4. **Medición de FPS**: Actualiza contador de FPS cada 500ms
 * 5. **Siguiente frame**: Llama a `requestAnimationFrame` para el próximo frame
 * 
 * ### Optimizaciones
 * 
 * - **Frame Capping**: Evita procesamiento innecesario en dispositivos rápidos
 * - **Lazy Loading**: Módulos del juego se cargan solo cuando se necesitan
 * - **Culling**: Solo se renderizan elementos visibles en pantalla
 * 
 * @param {number} currentTime - Tiempo actual del navegador (`performance.now()`)
 * 
 * @remarks Este es el corazón del juego, se ejecuta aproximadamente 40-60 veces por segundo
 * 
 * @example
 * ```typescript
 * // Iniciado automáticamente en bootstrap()
 * requestAnimationFrame(gameLoop);
 * ```
 * 
 * @see {@link updateGameState} - Actualiza el estado del juego
 * @see {@link renderGame} - Renderiza el juego
 * @see {@link requestAnimationFrame} - API del navegador para animaciones
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
            if (!editorModuleCache) {
                if (!editorLoadingPromise) {
                    editorLoadingPromise = import('./components/editor').then((editorModule) => {
                        editorModuleCache = { drawEditor: editorModule.drawEditor };
                    });
                }
                // Saltar este frame si aún se está cargando - la promesa se resolverá en el siguiente frame
                    requestAnimationFrame(gameLoop);
                    return;
                }
            // editorModuleCache está garantizado aquí después de la verificación anterior
            const drawEditorFn = editorModuleCache.drawEditor;
            if (drawEditorFn) {
                renderEditor(store, drawEditorFn);
            }
        } else if (store.appState === 'menu') {
            // Forzar estilo retro en el menú
            const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                               (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
            
            // Aplicar temporalmente estilo retro para el menú
            applyGraphicsSettings({
                ...store.settings.graphics,
                style: 'retro',
                scanline: true,
                glow: true,
                brightness: true,
                contrast: true,
                vignette: true,
                blur: isMobileDevice ? 0.7 : 1.5,
                showFps: false,
            });

            // Animar splash también en mobile
            animateSplash(store);
            
            // Procesar gamepad para navegación en el menú (modo TV)
            // Solo procesar una vez por frame para evitar activaciones múltiples
            const gamepadAction = updateGamepadState(store);
            if (gamepadAction) {
                handleGamepadMenuActions(store, gamepadAction);
            }
        }
    }

    requestAnimationFrame(gameLoop);
};

/**
 * Inicializa el StatusBar de Capacitor para que la app ocupe todo el espacio disponible.
 * 
 * Esta función configura el StatusBar de Android para que la aplicación ocupe
 * todo el espacio de la pantalla, incluyendo el área detrás de la barra de estado.
 * 
 * Solo se ejecuta en entornos Capacitor (Android/iOS), no en web.
 * 
 * @returns {Promise<void>} Promise que se resuelve cuando la configuración está completa
 * 
 * @remarks Si el plugin `@capacitor/status-bar` no está instalado, la función
 * simplemente retorna sin hacer nada (no crítico)
 * 
 * @see {@link https://capacitorjs.com/docs/apis/status-bar} - Documentación del plugin
 */
const initStatusBar = async (): Promise<void> => {
    try {
        // Verificar si estamos en Capacitor
        const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
        if (!isCapacitor) {
            return; // No hacer nada en web
        }

        // Intentar importar dinámicamente el plugin de StatusBar
        // Usar una función que construye la ruta dinámicamente para evitar que webpack lo analice
        let StatusBar: any;
        try {
            // Usar import directo en lugar de dinámico para evitar warnings de webpack
            // El módulo @capacitor/status-bar es opcional y está instalado
            const statusBarModule = await import('@capacitor/status-bar');
            StatusBar = statusBarModule?.StatusBar;
        } catch (importError: any) {
            // El módulo no está disponible - esto es normal si no está instalado
            // Webpack puede mostrar un warning, pero esto es esperado y no crítico
            if (importError?.code === 'MODULE_NOT_FOUND' || 
                importError?.message?.includes('Cannot resolve') ||
                importError?.message?.includes('Cannot find module')) {
                // Silencioso: no es un error crítico, el plugin es opcional
                // El warning de webpack es esperado y puede ignorarse
            } else {
            }
            return; // Salir silenciosamente si el módulo no existe
        }

        if (!StatusBar) {
            return;
        }
        
        // Configurar StatusBar para que ocupe todo el espacio
        console.log('[initStatusBar] Configurando StatusBar...');
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: 'dark' });
        await StatusBar.setBackgroundColor({ color: '#000000' });
        console.log('[initStatusBar] ✅ StatusBar configurado correctamente');
    } catch (error) {
        console.error('[initStatusBar] ❌ Error configurando StatusBar:', error);
        console.error('[initStatusBar] Stack trace:', error instanceof Error ? error.stack : 'No stack');
        // Re-lanzar el error para que el bootstrap lo capture
        throw error;
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

/**
 * Inicializa la aplicación del juego.
 * 
 * ## Secuencia de Inicialización
 * 
 * Esta función es el punto de entrada principal después de que el DOM está listo.
 * Orquesta toda la inicialización del juego en el orden correcto:
 * 
 * ### 1. Configuración de Plataforma
 * - **StatusBar** (solo Capacitor): Configura la barra de estado para fullscreen
 * - **Viewport Adjustment** (solo web móvil): Ajusta el viewport para compensar la barra de direcciones
 * 
 * ### 2. Setup de Sistemas
 * - **UI**: Crea referencias DOM y configura todos los event listeners
 * - **Audio**: Inicializa el contexto de audio y carga sonidos
 * - **Gamepad**: Configura soporte para joystick Bluetooth
 * - **Graphics**: Aplica configuraciones gráficas (blur, scanlines, etc.)
 * 
 * ### 3. Estado Inicial
 * - **Menú**: Muestra el menú principal (estado inicial de la aplicación)
 * 
 * ### 4. Carga de Assets
 * 
 * #### Assets Críticos (Bloqueante)
 * - Sprites del jugador (caminar, volar, saltar)
 * - Terreno básico (suelo, paredes)
 * - Tamaño aproximado: ~200KB
 * - **Bloqueante**: El juego no inicia hasta que estos se carguen
 * 
 * #### Assets No Críticos (Background)
 * - Enemigos (arañas, víboras, murciélagos)
 * - Efectos (explosiones, partículas)
 * - Tamaño aproximado: ~300KB adicionales
 * - **No bloqueante**: Se cargan en background mientras el juego ya está corriendo
 * 
 * ### 5. Inicio del Game Loop
 * - Una vez cargados los assets críticos, inicia el `gameLoop`
 * - El loop se ejecuta continuamente usando `requestAnimationFrame`
 * 
 * ## Estrategia de Carga
 * 
 * La estrategia de carga progresiva mejora significativamente el tiempo de carga:
 * - **Antes**: ~2 segundos (todos los assets bloqueantes)
 * - **Ahora**: ~0.5 segundos (solo assets críticos)
 * 
 * Los assets no críticos se cargan en background y están disponibles cuando se necesitan.
 * 
 * @returns {Promise<void>} Promise que se resuelve cuando la inicialización está completa
 * 
 * @remarks Esta función se ejecuta una sola vez al inicio de la aplicación
 * 
 * @example
 * ```typescript
 * // Llamado automáticamente cuando el DOM está listo
 * if (document.readyState === 'complete' || document.readyState === 'interactive') {
 *     bootstrap().catch(error => console.error('Error en bootstrap:', error));
 * }
 * ```
 * 
 * @see {@link gameLoop} - Loop principal del juego
 * @see {@link preloadCriticalAssets} - Carga de assets críticos
 * @see {@link loadSpritesLazy} - Carga diferida de sprites
 */
/**
 * Registra el Service Worker para habilitar funcionalidad PWA
 */
const registerServiceWorker = async (): Promise<void> => {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/'
            });
            
            // Escuchar actualizaciones del Service Worker
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // Nueva versión disponible
                        }
                    });
                }
            });
        } catch (error) {
            // Error silencioso
        }
    }
};

const bootstrap = async (): Promise<void> => {
    console.log('[Bootstrap] 🚀 Iniciando bootstrap...');
    
    // Mostrar loading screen con splash-fixed como fondo
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        // Cargar splash-fixed inmediatamente para mostrarlo como fondo
        const { SPRITE_SOURCES } = await import('./core/assets');
        const splashFixedSrc = SPRITE_SOURCES['splash-fixed'];
        if (splashFixedSrc) {
            loadingScreen.style.backgroundImage = `url(${splashFixedSrc})`;
        }
        loadingScreen.classList.remove('hidden');
    }
    
    try {
        // CRÍTICO: Inicializar Auth0 PRIMERO para procesar callbacks temprano
        console.log('[Bootstrap] Paso 1: Inicializando Auth0...');
        try {
            const { initializeAuth0 } = await import('./components/ui');
            await initializeAuth0();
            console.log('[Bootstrap] ✅ Auth0 inicializado temprano');
        } catch (error) {
            console.warn('[Bootstrap] ⚠️ Error inicializando Auth0 (no crítico):', error);
            console.error('[Bootstrap] Stack trace Auth0:', error instanceof Error ? error.stack : 'No stack');
        }
        
        // Inicializar StatusBar primero para que ocupe todo el espacio (solo en Capacitor)
        console.log('[Bootstrap] Paso 2: Inicializando StatusBar...');
        try {
            await initStatusBar();
            console.log('[Bootstrap] ✅ StatusBar inicializado');
        } catch (error) {
            console.error('[Bootstrap] ❌ ERROR CRÍTICO en initStatusBar:', error);
            console.error('[Bootstrap] Stack trace StatusBar:', error instanceof Error ? error.stack : 'No stack');
            throw error; // Re-lanzar porque puede ser crítico
        }
        
        // Ajustar viewport para navegadores móviles web (compensar barra de direcciones)
        console.log('[Bootstrap] Paso 3: Configurando viewport...');
        try {
            setupViewportAdjustment();
            console.log('[Bootstrap] ✅ Viewport configurado');
        } catch (error) {
            console.error('[Bootstrap] ❌ ERROR en setupViewportAdjustment:', error);
            console.error('[Bootstrap] Stack trace viewport:', error instanceof Error ? error.stack : 'No stack');
        }
        
        // Registrar Service Worker para PWA (no bloqueante)
        console.log('[Bootstrap] Paso 4: Registrando Service Worker...');
        registerServiceWorker().catch((error) => {
            console.warn('[Bootstrap] ⚠️ Error registrando Service Worker (no crítico):', error);
        });
        
        console.log('[Bootstrap] Paso 5: Configurando UI...');
        try {
            setupUI(store);
            console.log('[Bootstrap] ✅ UI configurada');
        } catch (error) {
            console.error('[Bootstrap] ❌ ERROR CRÍTICO en setupUI:', error);
            console.error('[Bootstrap] Stack trace UI:', error instanceof Error ? error.stack : 'No stack');
            throw error;
        }
        
        console.log('[Bootstrap] Paso 6: Inicializando audio...');
        try {
            initAudio();
            console.log('[Bootstrap] ✅ Audio inicializado');
        } catch (error) {
            console.error('[Bootstrap] ❌ ERROR en initAudio:', error);
            console.error('[Bootstrap] Stack trace audio:', error instanceof Error ? error.stack : 'No stack');
        }
        
        const mobileControlsEl = store.dom.ui.mobileControlsEl;
        if (mobileControlsEl) {
            if (isTvMode()) {
                mobileControlsEl.dataset.active = 'false';
                mobileControlsEl.style.display = 'none';
            } else {
                mobileControlsEl.style.removeProperty('display');
            }
        }
        
        // Inicializar soporte de gamepad
        console.log('[Bootstrap] Paso 7: Inicializando gamepad...');
        try {
            initGamepadSupport();
            console.log('[Bootstrap] ✅ Gamepad inicializado');
        } catch (error) {
            console.error('[Bootstrap] ❌ ERROR en initGamepadSupport:', error);
            console.error('[Bootstrap] Stack trace gamepad:', error instanceof Error ? error.stack : 'No stack');
        }
        
        // Cargar configuración desde BD/localStorage y aplicar
        console.log('[Bootstrap] Paso 8: Cargando configuración...');
        loadSettings().then(settings => {
            store.settings = settings;
            applyGraphicsSettings(store.settings.graphics);
            setMusicVolume(store.settings.audio.musicVolume);
            setSFXVolume(store.settings.audio.sfxVolume);
            console.log('[Bootstrap] ✅ Configuración cargada y aplicada');
        }).catch(err => {
            console.warn('[Bootstrap] ⚠️ Error cargando configuración:', err);
            console.error('[Bootstrap] Stack trace settings:', err instanceof Error ? err.stack : 'No stack');
            // Aplicar configuración por defecto
            applyGraphicsSettings(store.settings.graphics);
        });
        
        console.log('[Bootstrap] Paso 9: Mostrando menú...');
        try {
            showMenu(store);
            console.log('[Bootstrap] ✅ Menú mostrado');
        } catch (error) {
            console.error('[Bootstrap] ❌ ERROR CRÍTICO en showMenu:', error);
            console.error('[Bootstrap] Stack trace menu:', error instanceof Error ? error.stack : 'No stack');
            throw error;
        }

        // ESTRATEGIA: Carga progresiva de assets
        // 1. Assets críticos primero (bloqueante)
        console.log('[Bootstrap] Paso 10: Cargando assets críticos...');
        preloadCriticalAssets(store, () => {
            console.log('[Bootstrap] ✅ Assets críticos cargados');
            
            // Ocultar loading screen cuando los assets críticos estén cargados
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
            
            try {
                loadLevel(store);
                lastFrameTime = performance.now();
                
                // 2. Assets no críticos en background (no bloqueante)
                const nonCriticalSprites = ['P_jump', 'P_fly', 'P_die', 'P_success', '8', 'S', 'V', 'V_death', 'T', '9', 'bomb', 'explosion', '3', 'L'];
                loadSpritesLazy(store, nonCriticalSprites).catch((error) => {
                    console.warn('[Bootstrap] ⚠️ Error cargando sprites no críticos:', error);
                });
                
                loadAdditionalSFX().catch((error) => {
                    console.warn('[Bootstrap] ⚠️ Error cargando SFX adicionales:', error);
                });
                
                // Precargar módulos del juego en background para mejor rendimiento
                loadGameModules().catch((error) => {
                    console.warn('[Bootstrap] ⚠️ Error precargando módulos:', error);
                });
                
                // Iniciar el game loop
                console.log('[Bootstrap] ✅ Iniciando game loop...');
                requestAnimationFrame(gameLoop);
            } catch (error) {
                console.error('[Bootstrap] ❌ ERROR CRÍTICO después de cargar assets:', error);
                console.error('[Bootstrap] Stack trace post-assets:', error instanceof Error ? error.stack : 'No stack');
                throw error;
            }
        });
        
        console.log('[Bootstrap] ✅ Bootstrap completado exitosamente');
    } catch (error) {
        console.error('[Bootstrap] ❌❌❌ ERROR FATAL EN BOOTSTRAP ❌❌❌');
        console.error('[Bootstrap] Error:', error);
        console.error('[Bootstrap] Stack:', error instanceof Error ? error.stack : 'No stack');
        console.error('[Bootstrap] Tipo:', typeof error);
        console.error('[Bootstrap] Constructor:', error?.constructor?.name);
        
        // Intentar mostrar error en pantalla
        try {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);color:red;padding:40px;z-index:99999;font-family:monospace;font-size:14px;white-space:pre-wrap;overflow:auto;';
            errorDiv.innerHTML = `
                <h1 style="color:red;font-size:24px;">❌ ERROR FATAL EN BOOTSTRAP</h1>
                <p><strong>Error:</strong> ${String(error)}</p>
                <p><strong>Stack:</strong></p>
                <pre style="background:#222;padding:10px;border-radius:4px;">${error instanceof Error ? error.stack : 'No stack trace'}</pre>
            `;
            document.body.appendChild(errorDiv);
        } catch (e) {
            console.error('No se pudo mostrar error fatal en pantalla:', e);
        }
        
        // Re-lanzar para que el handler global lo capture
        throw error;
    }
};

// Función para iniciar la aplicación con manejo robusto de errores
const startApp = () => {
    console.log('[Main] 🚀 Iniciando aplicación...');
    console.log('[Main] ReadyState:', document.readyState);
    console.log('[Main] Capacitor disponible:', typeof (window as any).Capacitor !== 'undefined');
    
    bootstrap().catch((error) => {
        console.error('[Main] ❌❌❌ ERROR FATAL AL INICIAR APLICACIÓN ❌❌❌');
        console.error('[Main] Error:', error);
        console.error('[Main] Stack:', error instanceof Error ? error.stack : 'No stack');
        
        // Intentar mostrar error en pantalla
        try {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.95);color:red;padding:40px;z-index:99999;font-family:monospace;font-size:16px;white-space:pre-wrap;overflow:auto;';
            errorDiv.innerHTML = `
                <h1 style="color:red;font-size:28px;margin-bottom:20px;">❌ ERROR FATAL</h1>
                <p style="color:yellow;font-size:18px;margin-bottom:10px;"><strong>La aplicación no pudo iniciarse</strong></p>
                <p style="margin-bottom:10px;"><strong>Error:</strong> ${String(error)}</p>
                <p style="margin-bottom:10px;"><strong>Stack Trace:</strong></p>
                <pre style="background:#222;padding:15px;border-radius:4px;overflow:auto;max-height:400px;">${error instanceof Error ? error.stack : 'No stack trace disponible'}</pre>
                <p style="margin-top:20px;color:#888;font-size:12px;">Revisa los logs de la consola para más detalles</p>
            `;
            document.body.appendChild(errorDiv);
        } catch (e) {
            console.error('[Main] No se pudo mostrar error en pantalla:', e);
        }
    });
};

// Iniciar cuando el DOM esté listo
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('[Main] DOM ya está listo, iniciando inmediatamente...');
    startApp();
} else {
    console.log('[Main] Esperando DOMContentLoaded...');
    window.addEventListener('DOMContentLoaded', () => {
        console.log('[Main] DOMContentLoaded disparado, iniciando...');
        startApp();
    });
}

