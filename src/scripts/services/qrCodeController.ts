/**
 * Controlador del código QR
 * Coordina la lógica entre el servicio QR y la detección de dispositivo
 * Implementa el patrón Strategy y Dependency Injection
 */

import { QRCodeService, QRCodeElements, QRCodeConfig } from './qrCodeService';
import { DeviceDetectionService, DeviceInfo } from './deviceDetectionService';

export interface QRCodeControllerConfig {
    imageSrc: string;
    titleText: string;
    instructionsText: string;
    shouldShowInTV?: boolean; // Permitir mostrar QR en TV si se desea
}

/**
 * Controlador principal del QR
 * Responsabilidad: orquestar la lógica de QR basada en el dispositivo
 */
export class QRCodeController {
    private qrService: QRCodeService;
    private deviceService: DeviceDetectionService;
    private config: QRCodeControllerConfig;
    private unsubscribeDeviceChange: (() => void) | null = null;

    constructor(
        elements: QRCodeElements,
        config: QRCodeControllerConfig,
        qrService?: QRCodeService,
        deviceService?: DeviceDetectionService
    ) {
        this.config = config;
        this.qrService = qrService || new QRCodeService();
        this.deviceService = deviceService || DeviceDetectionService.getInstance();

        // Inicializar servicios
        const qrConfig: QRCodeConfig = {
            imageSrc: config.imageSrc,
            titleText: config.titleText,
            instructionsText: config.instructionsText
        };

        this.qrService.initialize(elements, qrConfig);
    }

    /**
     * Inicia el controlador
     */
    public start(): void {
        this.updateQRVisibility();

        // Suscribirse a cambios de dispositivo (ej: orientación)
        this.unsubscribeDeviceChange = this.deviceService.onDeviceChange(() => {
            this.updateQRVisibility();
        });

        console.log('[QRCodeController] Iniciado');
    }

    /**
     * Detiene el controlador y limpia recursos
     */
    public stop(): void {
        if (this.unsubscribeDeviceChange) {
            this.unsubscribeDeviceChange();
            this.unsubscribeDeviceChange = null;
        }
        this.qrService.destroy();
        this.deviceService.destroy();
        console.log('[QRCodeController] Detenido');
    }

    /**
     * Actualiza la visibilidad del QR basado en el dispositivo
     */
    private updateQRVisibility(): void {
        const deviceInfo = this.deviceService.detect();

        if (this.shouldShowQR(deviceInfo)) {
            this.qrService.show();
        } else {
            this.qrService.hide();
        }

        this.logDebug(deviceInfo);
    }

    /**
     * Determina si el QR debe ser visible
     */
    private shouldShowQR(deviceInfo: DeviceInfo): boolean {
        // Mostrar QR solo en desktop
        if (deviceInfo.isDesktop) {
            return true;
        }

        // Opcionalmente, permitir en TV si está configurado
        if (this.config.shouldShowInTV && deviceInfo.isTV) {
            return true;
        }

        return false;
    }

    /**
     * Obtiene el estado actual del QR
     */
    public getQRState() {
        return this.qrService.getState();
    }

    /**
     * Obtiene la información del dispositivo
     */
    public getDeviceInfo() {
        return this.deviceService.detect();
    }

    /**
     * Log de depuración
     */
    private logDebug(deviceInfo: DeviceInfo): void {
        console.log('[QRCodeController] Información del dispositivo:', {
            isDesktop: deviceInfo.isDesktop,
            isMobile: deviceInfo.isMobile,
            isTablet: deviceInfo.isTablet,
            isTV: deviceInfo.isTV,
            hasTouch: deviceInfo.hasTouch,
            resolution: `${deviceInfo.windowWidth}x${deviceInfo.windowHeight}`,
            qrState: this.qrService.getState()
        });
    }
}

