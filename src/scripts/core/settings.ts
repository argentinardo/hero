/**
 * Sistema de configuración del juego
 * 
 * Maneja:
 * - Configuración de audio (volumen música y efectos)
 * - Configuración de gráficos (scanline, glow, brightness, contrast)
 * - Persistencia en localStorage
 */

import { getCurrentLanguage, type Language } from '../utils/i18n';

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
        blur: number;             // Efecto de blur en píxeles (0 = desactivado)
        showFps: boolean;          // Mostrar contador de FPS
        mobileFullWidth: boolean;  // En mobile: ocupar todo el ancho ignorando max-width de relación de aspecto
    };
    language: Language;        // Idioma del juego
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
        blur: 1.5,                 // Blur por defecto de 1.5px
        showFps: false, // Por defecto oculto
        mobileFullWidth: false,    // No aplica en desktop
    },
    language: 'es',
};

// Configuración por defecto para móvil (todos los efectos activados excepto showFps para mejor rendimiento)
const DEFAULT_MOBILE_SETTINGS: GameSettings = {
    audio: {
        musicVolume: 0.3,
        sfxVolume: 0.5,
    },
    graphics: {
        scanline: true,   // Activado en móvil
        glow: true,       // Activado en móvil
        brightness: true, // Activado en móvil
        contrast: true,   // Activado en móvil
        vignette: true,   // Activado en móvil
        blur: 0.7,       // Blur por defecto de 0.7px en móvil (menor que desktop para mejor rendimiento)
        showFps: false,   // Por defecto oculto en mobile
        mobileFullWidth: false,   // Por defecto respeta relación de aspecto en mobile
    },
    language: 'es',
};

const SETTINGS_KEY = 'hero_game_settings';

/**
 * Carga la configuración desde localStorage o retorna valores por defecto
 * 
 * En móvil, por defecto todos los efectos gráficos están activados
 * excepto showFps para no distraer. Si el usuario ya tiene configuración guardada,
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
                language: parsed.language || getCurrentLanguage() || defaults.language,
            };
        }
    } catch (error) {
        console.warn('Error cargando configuración:', error);
    }
    // Si no hay configuración guardada, usar defaults según el dispositivo
    const defaults = isMobileDevice() ? { ...DEFAULT_MOBILE_SETTINGS } : { ...DEFAULT_SETTINGS };
    defaults.language = getCurrentLanguage();
    return defaults;
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
        language: updates.language || current.language,
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
 * - Por defecto en móvil todos los efectos están activados para mejor experiencia visual
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
    
    // Aplicar brightness, contrast y blur al canvas
    // OPTIMIZACIÓN: Combinar todos los efectos en una sola operación CSS cuando están activos
    const filterParts: string[] = [];
    
    if (settings.brightness) {
        filterParts.push('brightness(1.4)');
    }
    if (settings.contrast) {
        filterParts.push('contrast(1.1)');
    }
    if (settings.blur && settings.blur > 0) {
        filterParts.push(`blur(${settings.blur}px)`);
    }
    
    if (filterParts.length > 0) {
        canvas.style.filter = filterParts.join(' ');
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
    
    // Aplicar clase mobile-fullwidth al canvas para remover el max-width en mobile
    // El CSS media query ya se encarga de que solo se aplique en mobile landscape
    if (settings.mobileFullWidth) {
        canvas.classList.add('mobile-fullwidth');
        console.log('Clase mobile-fullwidth agregada al canvas, mobileFullWidth:', settings.mobileFullWidth);
    } else {
        canvas.classList.remove('mobile-fullwidth');
        console.log('Clase mobile-fullwidth removida del canvas, mobileFullWidth:', settings.mobileFullWidth);
    }
};

/**
 * Indica si los efectos de glow deben aplicarse (para render.ts)
 */
export const shouldApplyGlow = (settings: GameSettings['graphics']): boolean => {
    return settings.glow;
};

