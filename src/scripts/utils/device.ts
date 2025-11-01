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
 * Obtiene la URL base para las funciones de Netlify según el entorno.
 * En web usa URL relativa, en Android/Capacitor usa URL completa.
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
    
    // En web, usar URL relativa (funciona porque estamos en el mismo dominio)
    return '';
};


