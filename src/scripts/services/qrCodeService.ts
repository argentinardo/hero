/**
 * Servicio para manejar la lógica del código QR
 * Responsabilidad única: gestionar visibilidad y carga del QR
 */

export interface QRCodeElements {
    container: HTMLElement;
    image: HTMLImageElement;
    title?: HTMLElement;
    instructions?: HTMLElement;
}

export interface QRCodeConfig {
    imageSrc: string;
    titleText: string;
    instructionsText: string;
}

export interface QRCodeState {
    isVisible: boolean;
    isLoaded: boolean;
    hasError: boolean;
}

/**
 * Maneja la visibilidad y carga del código QR
 * Principio SOLID: Single Responsibility - solo gestiona el QR
 */
export class QRCodeService {
    private elements: QRCodeElements | null = null;
    private config: QRCodeConfig | null = null;
    private state: QRCodeState = {
        isVisible: false,
        isLoaded: false,
        hasError: false
    };
    private readonly HIDDEN_CLASS = 'hidden';

    constructor(private onStateChange?: (state: QRCodeState) => void) {}

    /**
     * Inicializa el servicio con los elementos del DOM
     */
    public initialize(elements: QRCodeElements, config: QRCodeConfig): void {
        this.elements = elements;
        this.config = config;
        this.setupImageHandlers();
        this.notifyStateChange();
    }

    /**
     * Muestra el código QR
     */
    public show(): void {
        if (!this.elements) {
            return;
        }

        try {
            this.elements.container.classList.remove(this.HIDDEN_CLASS);
            this.setImageSource();
            this.updateTexts();
            this.state.isVisible = true;
            this.notifyStateChange();
        } catch (error) {
            this.state.hasError = true;
            this.notifyStateChange();
        }
    }

    /**
     * Oculta el código QR
     */
    public hide(): void {
        if (!this.elements) {
            return;
        }

        this.elements.container.classList.add(this.HIDDEN_CLASS);
        this.state.isVisible = false;
        this.notifyStateChange();
    }

    /**
     * Obtiene el estado actual del QR
     */
    public getState(): Readonly<QRCodeState> {
        return Object.freeze({ ...this.state });
    }

    /**
     * Verifica si el QR está visible
     */
    public isVisible(): boolean {
        return this.state.isVisible;
    }

    /**
     * Verifica si la imagen se cargó correctamente
     */
    public isLoaded(): boolean {
        return this.state.isLoaded;
    }

    /**
     * Verifica si hay algún error
     */
    public hasError(): boolean {
        return this.state.hasError;
    }

    /**
     * Configura los handlers de carga de imagen
     */
    private setupImageHandlers(): void {
        if (!this.elements?.image) {
            return;
        }

        this.elements.image.onload = () => {
            this.state.isLoaded = true;
            this.state.hasError = false;
            this.notifyStateChange();
        };

        this.elements.image.onerror = () => {
            this.state.hasError = true;
            this.state.isLoaded = false;
            this.notifyStateChange();
            this.hide();
        };
    }

    /**
     * Establece la fuente de la imagen
     */
    private setImageSource(): void {
        if (!this.elements?.image || !this.config?.imageSrc) {
            return;
        }

        this.elements.image.src = this.config.imageSrc;
        this.elements.image.alt = this.config.titleText;

        // Si la imagen ya está en caché del navegador, activar onload manualmente
        if (this.elements.image.complete && this.elements.image.naturalHeight !== 0) {
            this.state.isLoaded = true;
            this.notifyStateChange();
        }
    }

    /**
     * Actualiza los textos del QR
     */
    private updateTexts(): void {
        if (!this.elements || !this.config) {
            return;
        }

        if (this.elements.title) {
            this.elements.title.textContent = this.config.titleText;
        }

        if (this.elements.instructions) {
            this.elements.instructions.textContent = this.config.instructionsText;
        }
    }

    /**
     * Notifica cambios de estado
     */
    private notifyStateChange(): void {
        if (this.onStateChange) {
            this.onStateChange({ ...this.state });
        }
    }


    /**
     * Limpia el servicio
     */
    public destroy(): void {
        if (this.elements?.image) {
            this.elements.image.onload = null;
            this.elements.image.onerror = null;
            this.elements.image.src = '';
        }
        this.elements = null;
        this.config = null;
        this.state = {
            isVisible: false,
            isLoaded: false,
            hasError: false
        };
    }
}

