/**
 * Utilidad para guardar niveles que funciona tanto en web como en Android
 */

// Detectar si estamos en Capacitor (Android/iOS)
const isCapacitor = () => {
    return (window as any).Capacitor !== undefined;
};

/**
 * Guarda los niveles en el almacenamiento apropiado
 */
export const saveLevels = async (levels: string[][][]): Promise<boolean> => {
    const payload = levels.map(level => level.map(row => row.join('')));
    
    // Si estamos en web y hay servidor disponible
    if (!isCapacitor()) {
        try {
            const response = await fetch('/api/save-levels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error saving to server:', error);
            // Fallback a localStorage
            return saveToLocalStorage(payload);
        }
    } else {
        // En Capacitor, usar localStorage o Filesystem API
        return saveToLocalStorage(payload);
    }
};

/**
 * Guarda en localStorage como fallback
 */
const saveToLocalStorage = (payload: string[][]): boolean => {
    try {
        localStorage.setItem('hero-levels', JSON.stringify(payload, null, 4));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
};

/**
 * Descarga los niveles como archivo JSON
 */
export const downloadLevels = (levels: string[][][]): void => {
    const payload = levels.map(level => level.map(row => row.join('')));
    const blob = new Blob([JSON.stringify(payload, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'levels.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

/**
 * Carga niveles desde localStorage
 */
export const loadLevelsFromStorage = (): string[][] | null => {
    try {
        const stored = localStorage.getItem('hero-levels');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
    return null;
};

