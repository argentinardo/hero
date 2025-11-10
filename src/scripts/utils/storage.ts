/**
 * Utilidades para localStorage con namespace por usuario
 * Cada usuario tiene su propio espacio en localStorage para evitar conflictos
 */

/**
 * Obtiene el ID del usuario actual
 * Usa user.sub de Netlify Identity, o email como fallback
 */
export const getCurrentUserId = (): string | null => {
    try {
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        if (user) {
            // Prioridad: sub (ID único de Netlify Identity) > email
            return user.sub || user.email || null;
        }
        // Fallback: email desde localStorage
        const email = localStorage.getItem('userEmail');
        return email ? email.toLowerCase() : null;
    } catch (error) {
        console.error('Error obteniendo user ID:', error);
        return null;
    }
};

/**
 * Genera una clave de localStorage con namespace del usuario
 * Formato: `hero_user_{userId}_{key}`
 */
const getUserStorageKey = (key: string, userId: string | null = null): string => {
    const currentUserId = userId || getCurrentUserId();
    if (currentUserId) {
        // Normalizar el userId para usarlo como parte de la clave
        const normalizedUserId = currentUserId.replace(/[^a-zA-Z0-9]/g, '_');
        return `hero_user_${normalizedUserId}_${key}`;
    }
    // Si no hay usuario, usar la clave sin namespace (para datos globales)
    return `hero_global_${key}`;
};

/**
 * Obtiene un valor de localStorage con namespace del usuario
 */
export const getUserStorage = (key: string): string | null => {
    const storageKey = getUserStorageKey(key);
    return localStorage.getItem(storageKey);
};

/**
 * Guarda un valor en localStorage con namespace del usuario
 */
export const setUserStorage = (key: string, value: string): void => {
    const storageKey = getUserStorageKey(key);
    localStorage.setItem(storageKey, value);
};

/**
 * Elimina un valor de localStorage con namespace del usuario
 */
export const removeUserStorage = (key: string): void => {
    const storageKey = getUserStorageKey(key);
    localStorage.removeItem(storageKey);
};

/**
 * Limpia todos los datos de localStorage de un usuario específico
 */
export const clearUserStorage = (userId?: string | null): void => {
    const targetUserId = userId || getCurrentUserId();
    if (!targetUserId) {
        return;
    }
    
    const normalizedUserId = targetUserId.replace(/[^a-zA-Z0-9]/g, '_');
    const prefix = `hero_user_${normalizedUserId}_`;
    
    // Obtener todas las claves que empiezan con el prefijo del usuario
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keysToRemove.push(key);
        }
    }
    
    // Eliminar todas las claves del usuario
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
    });
    
    console.log(`✅ Limpiados ${keysToRemove.length} elementos de localStorage para usuario: ${targetUserId}`);
};

/**
 * Limpia los datos del usuario anterior cuando se cambia de usuario
 * Se debe llamar cuando un usuario se desloguea o se loguea otro usuario
 */
export const clearPreviousUserData = (): void => {
    // Obtener el userId anterior desde localStorage (sin namespace)
    const previousUserEmail = localStorage.getItem('userEmail');
    
    if (previousUserEmail) {
        // Limpiar datos del usuario anterior
        clearUserStorage(previousUserEmail.toLowerCase());
    }
    
    // También limpiar datos globales antiguos (sin namespace) si existen
    const legacyKeys = [
        'hero_campaigns',
        'userLevels',
        'nickname',
        'avatar'
    ];
    
    legacyKeys.forEach(key => {
        if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`✅ Eliminada clave legacy: ${key}`);
        }
    });
};

/**
 * Migra datos legacy (sin namespace) al namespace del usuario actual
 * Se debe llamar una vez cuando se detecta que hay datos legacy
 */
export const migrateLegacyData = (): void => {
    const userId = getCurrentUserId();
    if (!userId) {
        return;
    }
    
    const legacyMappings: Array<{ legacy: string; new: string }> = [
        { legacy: 'hero_campaigns', new: 'campaigns' },
        { legacy: 'userLevels', new: 'levels' },
        { legacy: 'nickname', new: 'nickname' },
        { legacy: 'avatar', new: 'avatar' }
    ];
    
    let migrated = false;
    legacyMappings.forEach(({ legacy, new: newKey }) => {
        const legacyValue = localStorage.getItem(legacy);
        if (legacyValue) {
            // Verificar si ya existe en el namespace del usuario
            const userValue = getUserStorage(newKey);
            if (!userValue) {
                // Migrar solo si no existe en el namespace del usuario
                setUserStorage(newKey, legacyValue);
                migrated = true;
                console.log(`✅ Migrado ${legacy} → ${getUserStorageKey(newKey)}`);
            }
            // Eliminar el dato legacy después de migrar
            localStorage.removeItem(legacy);
        }
    });
    
    if (migrated) {
        console.log('✅ Migración de datos legacy completada');
    }
};

