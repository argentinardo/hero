/**
 * Servicio para detectar el tipo de dispositivo
 * Abstrae la lógica de detección del resto de la aplicación
 */

export interface DeviceInfo {
    isDesktop: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isTV: boolean;
    hasTouch: boolean;
    windowWidth: number;
    windowHeight: number;
}

/**
 * Detecta el tipo de dispositivo basado en múltiples criterios
 * Responsabilidad única: detectar dispositivo
 */
export class DeviceDetectionService {
    private static instance: DeviceDetectionService;
    private cachedInfo: DeviceInfo | null = null;
    private resizeListener: (() => void) | null = null;

    private constructor() {
        // Singleton
    }

    /**
     * Obtiene la instancia única del servicio
     */
    public static getInstance(): DeviceDetectionService {
        if (!DeviceDetectionService.instance) {
            DeviceDetectionService.instance = new DeviceDetectionService();
        }
        return DeviceDetectionService.instance;
    }

    /**
     * Detecta información del dispositivo
     */
    public detect(): Readonly<DeviceInfo> {
        // Validar que estamos en el navegador
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
            return Object.freeze({
                isDesktop: false,
                isMobile: false,
                isTablet: false,
                isTV: false,
                hasTouch: false,
                windowWidth: 0,
                windowHeight: 0
            });
        }

        const info: DeviceInfo = {
            isDesktop: this.isDesktop(),
            isMobile: this.isMobile(),
            isTablet: this.isTablet(),
            isTV: this.isTV(),
            hasTouch: this.hasTouch(),
            windowWidth: window.innerWidth || document.documentElement.clientWidth || 0,
            windowHeight: window.innerHeight || document.documentElement.clientHeight || 0
        };

        return Object.freeze(info);
    }

    /**
     * Detecta si es escritorio
     */
    private isDesktop(): boolean {
        if (this.isTV()) {
            return false;
        }

        const ua = navigator.userAgent || '';
        const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isMobileUA || isIPad) {
            return false;
        }

        const hasTouch = this.hasTouch();
        const screenWidth = window.screen?.width ?? window.innerWidth ?? 0;
        const screenHeight = window.screen?.height ?? window.innerHeight ?? 0;
        const largestDimension = Math.max(screenWidth, screenHeight);
        const smallestDimension = Math.min(screenWidth, screenHeight);

        if (hasTouch && (largestDimension < 1920 || smallestDimension < 1024)) {
            return false;
        }

        const windowWidth = window.innerWidth || document.documentElement.clientWidth || 0;

        if (windowWidth >= 1024 && !hasTouch) {
            return true;
        }

        if (!hasTouch && largestDimension >= 1280) {
            return true;
        }

        return !hasTouch && windowWidth >= 768;
    }

    /**
     * Detecta si es móvil
     */
    private isMobile(): boolean {
        const ua = navigator.userAgent || '';
        const isMobileUA = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);

        if (isMobileUA) {
            return true;
        }

        const hasTouch = this.hasTouch();
        const windowWidth = window.innerWidth || document.documentElement.clientWidth || 0;

        return hasTouch && windowWidth < 768;
    }

    /**
     * Detecta si es tablet
     */
    private isTablet(): boolean {
        const ua = navigator.userAgent || '';
        const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        if (isIPad) {
            return true;
        }

        const hasTouch = this.hasTouch();
        const windowWidth = window.innerWidth || document.documentElement.clientWidth || 0;

        return hasTouch && windowWidth >= 768 && windowWidth < 1024;
    }

    /**
     * Detecta si es TV
     */
    private isTV(): boolean {
        const ua = navigator.userAgent || '';
        return /LG|SAMSUNG|Philips|VIZIO|Sony|Tizen|WebOS|SmartTV/i.test(ua);
    }

    /**
     * Detecta si tiene soporte táctil
     */
    private hasTouch(): boolean {
        return (
            ('ontouchstart' in window) ||
            (typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0) ||
            (typeof (navigator as any).msMaxTouchPoints === 'number' && (navigator as any).msMaxTouchPoints > 0)
        );
    }

    /**
     * Suscribirse a cambios de dispositivo (ej: orientación)
     */
    public onDeviceChange(callback: (info: DeviceInfo) => void): () => void {
        const handler = () => {
            this.cachedInfo = null; // Limpiar caché
            callback(this.detect());
        };

        window.addEventListener('resize', handler);

        return () => {
            window.removeEventListener('resize', handler);
        };
    }

    /**
     * Limpia los listeners
     */
    public destroy(): void {
        if (this.resizeListener) {
            window.removeEventListener('resize', this.resizeListener);
            this.resizeListener = null;
        }
        this.cachedInfo = null;
    }
}

