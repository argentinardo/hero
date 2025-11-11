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
 * Detecta si la aplicación está corriendo en un dispositivo desktop (no móvil, no TV).
 * 
 * @returns true si es desktop, false en caso contrario
 */
export const isDesktopMode = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
        return false;
    }
    
    // No es desktop si es TV
    if (isTvMode()) {
        return false;
    }
    
    // Detectar móvil por User Agent (más estricto - excluir tablets que podrían tener pantallas grandes)
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    // iPad puede tener User Agent de Safari desktop, así que verificamos también por otras características
    const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    if (isMobileUA || isIPad) {
        return false;
    }
    
    // Detectar móvil por touch - pero ser más permisivo con pantallas grandes
    const hasTouch =
        ('ontouchstart' in window) ||
        (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) ||
        (typeof (navigator as any).msMaxTouchPoints === 'number' && (navigator as any).msMaxTouchPoints > 0);
    
    // Si tiene touch, verificar el tamaño de la pantalla
    const screenWidth = window.screen?.width ?? window.innerWidth ?? 0;
    const screenHeight = window.screen?.height ?? window.innerHeight ?? 0;
    const largestDimension = Math.max(screenWidth, screenHeight);
    const smallestDimension = Math.min(screenWidth, screenHeight);
    
    // Si tiene touch y pantalla pequeña o es tablet (pantalla mediana), es móvil/tablet
    if (hasTouch) {
        // Tablets típicamente tienen al menos 768px en la dimensión más pequeña
        // Pero si la pantalla es muy grande (>= 1920px), probablemente es una pantalla táctil de escritorio
        if (largestDimension < 1920 && smallestDimension < 1024) {
            return false;
        }
    }
    
    // Verificar también el ancho de la ventana (más confiable para detectar desktop real)
    const windowWidth = window.innerWidth || document.documentElement.clientWidth || 0;
    const windowHeight = window.innerHeight || document.documentElement.clientHeight || 0;
    
    // Desktop típicamente tiene ventanas más anchas (>= 1024px)
    // Y no es móvil si el ancho es significativo
    if (windowWidth >= 1024 && !hasTouch) {
        return true;
    }
    
    // Si no es TV, no es móvil por UA, y tiene pantalla grande sin touch, es desktop
    if (!hasTouch && largestDimension >= 1280) {
        return true;
    }
    
    // Por defecto, si no hay touch y la ventana es ancha, considerar desktop
    // (útil para desarrollo o pantallas no táctiles)
    return !hasTouch && windowWidth >= 768;
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


