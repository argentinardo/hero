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


