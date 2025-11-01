/**
 * Sistema de configuración del juego
 * 
 * Maneja:
 * - Configuración de audio (volumen música y efectos)
 * - Configuración de gráficos (scanline, glow, brightness, contrast)
 * - Persistencia en localStorage
 */

export interface GameSettings {
    audio: {
        musicVolume: number;      // 0.0 - 1.0
        sfxVolume: number;        // 0.0 - 1.0
    };
    graphics: {
        scanline: boolean;        // Efecto de scanlines CRT
        glow: boolean;             // Efectos de glow (shadowBlur)
        brightness: boolean;       // Efecto de brillo del canvas
        contrast: boolean;         // Efecto de contraste del canvas
        vignette: boolean;        // Efecto de vignette (opcional)
        showFps: boolean;          // Mostrar contador de FPS
    };
}

/**
 * Detecta si el dispositivo es móvil
 */
const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 1024 && window.matchMedia('(orientation: landscape)').matches);
};

// Configuración por defecto para desktop (todos los efectos activados)
const DEFAULT_SETTINGS: GameSettings = {
    audio: {
        musicVolume: 0.3,
        sfxVolume: 0.5,
    },
    graphics: {
        scanline: true,
        glow: true,
        brightness: true,
        contrast: true,
        vignette: true,
        showFps: false, // Por defecto oculto
    },
};

// Configuración por defecto para móvil (todos los efectos desactivados para mejor rendimiento)
const DEFAULT_MOBILE_SETTINGS: GameSettings = {
    audio: {
        musicVolume: 0.3,
        sfxVolume: 0.5,
    },
    graphics: {
        scanline: false,
        glow: false,
        brightness: false,
        contrast: false,
        vignette: false,
        showFps: false, // Por defecto oculto en mobile también
    },
};

const SETTINGS_KEY = 'hero_game_settings';

/**
 * Carga la configuración desde localStorage o retorna valores por defecto
 * 
 * En móvil, por defecto todos los efectos gráficos están desactivados
 * para mejorar el rendimiento. Si el usuario ya tiene configuración guardada,
 * se respeta esa configuración.
 */
export const loadSettings = (): GameSettings => {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Si hay configuración guardada, usarla (respetar preferencias del usuario)
            const defaults = isMobileDevice() ? DEFAULT_MOBILE_SETTINGS : DEFAULT_SETTINGS;
            // Merge con defaults para asegurar que todas las propiedades existen
            return {
                audio: {
                    ...defaults.audio,
                    ...parsed.audio,
                },
                graphics: {
                    ...defaults.graphics,
                    ...parsed.graphics,
                },
            };
        }
    } catch (error) {
        console.warn('Error cargando configuración:', error);
    }
    // Si no hay configuración guardada, usar defaults según el dispositivo
    return isMobileDevice() ? { ...DEFAULT_MOBILE_SETTINGS } : { ...DEFAULT_SETTINGS };
};

/**
 * Guarda la configuración en localStorage
 */
export const saveSettings = (settings: GameSettings): void => {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error guardando configuración:', error);
    }
};

/**
 * Actualiza una parte específica de la configuración
 */
export const updateSettings = (updates: Partial<GameSettings>): GameSettings => {
    const current = loadSettings();
    const updated = {
        audio: { ...current.audio, ...updates.audio },
        graphics: { ...current.graphics, ...updates.graphics },
    };
    saveSettings(updated);
    return updated;
};

/**
 * Resetea la configuración a los valores por defecto según el dispositivo
 */
export const resetSettings = (): GameSettings => {
    const defaults = isMobileDevice() ? DEFAULT_MOBILE_SETTINGS : DEFAULT_SETTINGS;
    saveSettings({ ...defaults });
    return { ...defaults };
};

/**
 * Aplica la configuración de gráficos al DOM
 * 
 * OPTIMIZACIÓN DE RENDIMIENTO:
 * - Desactivar efectos reduce el costo de renderizado significativamente
 * - En móviles antiguos, desactivar todos los efectos puede mejorar FPS de 15-20 a 30
 * 
 * @param settings - Configuración de gráficos a aplicar
 */
export const applyGraphicsSettings = (settings: GameSettings['graphics']): void => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
    const gameUi = document.getElementById('game-ui') as HTMLElement;
    const bottomUi = document.getElementById('bottom-ui') as HTMLElement;
    const body = document.body;
    
    if (!canvas || !canvasWrapper) return;
    
    // Aplicar brightness y contrast al canvas
    // OPTIMIZACIÓN: Combinar ambos efectos en una sola operación CSS cuando ambos están activos
    if (settings.brightness && settings.contrast) {
        canvas.style.filter = 'brightness(1.8) contrast(1.1)';
    } else if (settings.brightness) {
        canvas.style.filter = 'brightness(1.4)';
    } else if (settings.contrast) {
        canvas.style.filter = 'contrast(1.1)';
    } else {
        canvas.style.filter = 'none';
    }
    
    // Aplicar scanline mediante clase CSS (canvas y UI)
    if (settings.scanline) {
        canvasWrapper.classList.add('scanline-enabled');
        body.classList.add('scanline-enabled');
        if (gameUi) gameUi.classList.add('scanline-enabled');
        if (bottomUi) bottomUi.classList.add('scanline-enabled');
    } else {
        canvasWrapper.classList.remove('scanline-enabled');
        body.classList.remove('scanline-enabled');
        if (gameUi) gameUi.classList.remove('scanline-enabled');
        if (bottomUi) bottomUi.classList.remove('scanline-enabled');
    }
    
    // Aplicar vignette mediante clase CSS
    if (settings.vignette) {
        canvasWrapper.classList.add('vignette-enabled');
    } else {
        canvasWrapper.classList.remove('vignette-enabled');
    }
    
    // Aplicar glow a los textos de la UI mediante clase CSS
    // Usamos una clase en body para aplicar globalmente el efecto
    if (settings.glow) {
        body.classList.add('glow-enabled');
        if (gameUi) gameUi.classList.add('glow-enabled');
        if (bottomUi) bottomUi.classList.add('glow-enabled');
    } else {
        body.classList.remove('glow-enabled');
        if (gameUi) gameUi.classList.remove('glow-enabled');
        if (bottomUi) bottomUi.classList.remove('glow-enabled');
    }
    
    // Mostrar/ocultar contador de FPS
    const fpsCounter = document.getElementById('fps-counter');
    if (fpsCounter) {
        fpsCounter.style.display = settings.showFps ? 'block' : 'none';
    }
};

/**
 * Indica si los efectos de glow deben aplicarse (para render.ts)
 */
export const shouldApplyGlow = (settings: GameSettings['graphics']): boolean => {
    return settings.glow;
};

