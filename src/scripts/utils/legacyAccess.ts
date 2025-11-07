import type { GameStore } from '../core/types';

export const LEGACY_SUPERUSER_EMAIL = 'damiannardini@gmail.com';
export const LEGACY_SUPERUSER_PASSWORD = 'suspicacia';
export const LEGACY_PASSWORD_OVERRIDE_KEY = 'hero_legacy_override';

export const getLoggedInEmail = (): string | null => {
    const ni: any = (window as any).netlifyIdentity;
    const user = ni?.currentUser?.();
    const email = user?.email || localStorage.getItem('userEmail');
    if (!email) {
        return null;
    }
    return email.toLowerCase();
};

export const isLegacySuperUser = (): boolean => {
    const email = getLoggedInEmail();
    return email === LEGACY_SUPERUSER_EMAIL;
};

export const isLegacyPasswordOverrideActive = (): boolean => {
    try {
        return sessionStorage.getItem(LEGACY_PASSWORD_OVERRIDE_KEY) === 'true';
    } catch {
        return false;
    }
};

export const activateLegacyPasswordOverride = () => {
    try {
        sessionStorage.setItem(LEGACY_PASSWORD_OVERRIDE_KEY, 'true');
    } catch {}
};

export const clearLegacyPasswordOverride = () => {
    try {
        sessionStorage.removeItem(LEGACY_PASSWORD_OVERRIDE_KEY);
    } catch {}
};

let legacyUnlockHandler: ((store: GameStore) => Promise<boolean>) | null = null;
let legacyUnlockInProgress = false;

export const registerLegacyUnlockHandler = (handler: (store: GameStore) => Promise<boolean>) => {
    legacyUnlockHandler = handler;
};

export const requestLegacyUnlock = async (store: GameStore): Promise<boolean> => {
    if (!legacyUnlockHandler) {
        return false;
    }
    if (legacyUnlockInProgress) {
        return false;
    }
    legacyUnlockInProgress = true;
    try {
        return await legacyUnlockHandler(store);
    } finally {
        legacyUnlockInProgress = false;
    }
};

