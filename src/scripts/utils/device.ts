export const vibrate = (pattern: number | number[]) => {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            // @ts-ignore: vibrate está disponible en navegadores móviles compatibles
            navigator.vibrate(pattern);
        }
    } catch {
        // Silencioso: vibración no soportada
    }
};

/**
 * Detecta si la aplicación se está ejecutando en un entorno similar a una TV.
 * Se considera TV cuando no hay soporte táctil y la pantalla es de gran tamaño (>= 1280px).
 */
export const isTvMode = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
    }

    const ua = navigator.userAgent || '';
    const uaLower = ua.toLowerCase();
    const tvKeywords = [
        'smart-tv',
        'smarttv',
        'appletv',
        'googletv',
        'androidtv',
        'bravia',
        'hbbtv',
        'netcast',
        'webos',
        'tizen',
        'hisense',
        'firetv',
        'viera',
        'crystal',
        'roku',
        'aquos'
    ];
    if (tvKeywords.some(keyword => uaLower.includes(keyword))) {
        return true;
    }

    const hasTouch =
        ('ontouchstart' in window) ||
        (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) ||
        (typeof (navigator as any).msMaxTouchPoints === 'number' && (navigator as any).msMaxTouchPoints > 0);

    const screenWidth = window.screen?.width ?? window.innerWidth ?? 0;
    const screenHeight = window.screen?.height ?? window.innerHeight ?? 0;
    const largestDimension = Math.max(screenWidth, screenHeight);

    return !hasTouch && largestDimension >= 1280;
};

/**
 * Obtiene la URL base para las funciones de Netlify según el entorno.
 * En web usa URL relativa o la URL del sitio actual si es Netlify, en Android/Capacitor usa URL completa.
 */
export const getNetlifyBaseUrl = (): string => {
    // Detectar si estamos en Capacitor (Android/iOS)
    const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // En Capacitor o en navegador móvil sin dominio Netlify, usar URL completa
    if (isCapacitor || (isAndroid || isIOS)) {
        return 'https://newhero.netlify.app';
    }
    
    // Detectar si estamos en un dominio de Netlify
    const isNetlifyHost = /\.netlify\.(app|live)$/i.test(window.location.host);
    
    // Si estamos en Netlify, usar la URL del sitio actual (funciona para branch deploys también)
    if (isNetlifyHost) {
        return window.location.origin;
    }
    
    // En desarrollo local o otros entornos, usar URL relativa
    return '';
};


