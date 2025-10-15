import type { GameStore } from '../core/types';

interface JoystickState {
    isDragging: boolean;
    isMovingStick: boolean;
    containerX: number;
    containerY: number;
    stickOffsetX: number;
    stickOffsetY: number;
    dragStartX: number;
    dragStartY: number;
    angle: number;
    force: number;
}

export class VirtualJoystick {
    private container: HTMLElement;
    private joystickBase: HTMLElement;
    private joystickStick: HTMLElement;
    private store: GameStore;
    private state: JoystickState;
    private readonly maxDistance = 35; // Máxima distancia del stick desde el centro
    private animationFrame: number | null = null;

    constructor(store: GameStore) {
        this.store = store;
        
        this.container = document.getElementById('virtual-joystick-container') as HTMLElement;
        this.joystickBase = document.getElementById('joystick-base') as HTMLElement;
        this.joystickStick = document.getElementById('joystick-stick') as HTMLElement;

        this.state = {
            isDragging: false,
            isMovingStick: false,
            containerX: 0,
            containerY: 0,
            stickOffsetX: 0,
            stickOffsetY: 0,
            dragStartX: 0,
            dragStartY: 0,
            angle: 0,
            force: 0,
        };

        this.setupEventListeners();
    }

    private setupEventListeners() {
        // Eventos para arrastrar el contenedor
        this.joystickBase.addEventListener('touchstart', this.handleContainerTouchStart.bind(this), { passive: false });
        
        // Eventos para mover el stick
        this.joystickStick.addEventListener('touchstart', this.handleStickTouchStart.bind(this), { passive: false });
        
        // Eventos globales
        document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }

    private handleContainerTouchStart(event: TouchEvent) {
        // Si el toque empieza en el stick, no procesar como arrastre de contenedor
        if (event.target === this.joystickStick) {
            return;
        }
        
        event.preventDefault();
        const touch = event.touches[0];
        
        this.state.isDragging = true;
        this.container.classList.add('dragging');
        
        const rect = this.container.getBoundingClientRect();
        this.state.dragStartX = touch.clientX - rect.left;
        this.state.dragStartY = touch.clientY - rect.top;
    }

    private handleStickTouchStart(event: TouchEvent) {
        event.preventDefault();
        event.stopPropagation();
        
        this.state.isMovingStick = true;
        this.joystickStick.style.cursor = 'grabbing';
    }

    private handleTouchMove(event: TouchEvent) {
        if (!this.state.isDragging && !this.state.isMovingStick) {
            return;
        }
        
        event.preventDefault();
        const touch = event.touches[0];

        if (this.state.isDragging) {
            // Arrastrar el contenedor completo
            const newX = touch.clientX - this.state.dragStartX;
            const newY = touch.clientY - this.state.dragStartY;
            
            // Limitar el movimiento dentro de la ventana
            const maxX = window.innerWidth - this.container.offsetWidth;
            const maxY = window.innerHeight - this.container.offsetHeight;
            
            const clampedX = Math.max(0, Math.min(newX, maxX));
            const clampedY = Math.max(0, Math.min(newY, maxY));
            
            this.container.style.right = 'auto';
            this.container.style.bottom = 'auto';
            this.container.style.transform = 'none';
            this.container.style.left = `${clampedX}px`;
            this.container.style.top = `${clampedY}px`;
            
        } else if (this.state.isMovingStick) {
            // Mover el stick dentro de la base
            const baseRect = this.joystickBase.getBoundingClientRect();
            const baseCenterX = baseRect.left + baseRect.width / 2;
            const baseCenterY = baseRect.top + baseRect.height / 2;
            
            const deltaX = touch.clientX - baseCenterX;
            const deltaY = touch.clientY - baseCenterY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX);
            
            // Limitar la distancia al máximo permitido
            const clampedDistance = Math.min(distance, this.maxDistance);
            
            this.state.stickOffsetX = clampedDistance * Math.cos(angle);
            this.state.stickOffsetY = clampedDistance * Math.sin(angle);
            this.state.angle = angle;
            this.state.force = clampedDistance / this.maxDistance;
            
            this.joystickStick.style.transform = `translate(${this.state.stickOffsetX}px, ${this.state.stickOffsetY}px)`;
            
            // Actualizar las teclas del store basándose en el movimiento
            this.updateStoreKeys();
        }
    }

    private handleTouchEnd(event: TouchEvent) {
        if (this.state.isDragging) {
            this.state.isDragging = false;
            this.container.classList.remove('dragging');
        }
        
        if (this.state.isMovingStick) {
            this.state.isMovingStick = false;
            this.joystickStick.style.cursor = 'grab';
            
            // Animar el stick de vuelta al centro
            this.animateStickToCenter();
            
            // Resetear las teclas
            this.resetStoreKeys();
        }
    }

    private animateStickToCenter() {
        const animate = () => {
            const speed = 0.2;
            this.state.stickOffsetX *= (1 - speed);
            this.state.stickOffsetY *= (1 - speed);
            
            // Si está muy cerca del centro, terminar
            if (Math.abs(this.state.stickOffsetX) < 0.5 && Math.abs(this.state.stickOffsetY) < 0.5) {
                this.state.stickOffsetX = 0;
                this.state.stickOffsetY = 0;
                this.joystickStick.style.transform = 'translate(0, 0)';
                this.animationFrame = null;
                return;
            }
            
            this.joystickStick.style.transform = `translate(${this.state.stickOffsetX}px, ${this.state.stickOffsetY}px)`;
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        this.animationFrame = requestAnimationFrame(animate);
    }

    private updateStoreKeys() {
        if (this.state.force <= 0.2) {
            this.resetStoreKeys();
            return;
        }
        
        const angle = this.state.angle;
        const up = -Math.sin(angle); // Negativo porque Y crece hacia abajo
        const right = Math.cos(angle);
        
        // Detectar dirección hacia arriba
        this.store.keys.ArrowUp = up > 0.5;
        
        // Detectar dirección horizontal
        if (Math.abs(right) > 0.3) {
            if (right > 0) {
                this.store.keys.ArrowRight = true;
                this.store.keys.ArrowLeft = false;
            } else {
                this.store.keys.ArrowLeft = true;
                this.store.keys.ArrowRight = false;
            }
        } else {
            this.store.keys.ArrowLeft = false;
            this.store.keys.ArrowRight = false;
        }
    }

    private resetStoreKeys() {
        this.store.keys.ArrowUp = false;
        this.store.keys.ArrowLeft = false;
        this.store.keys.ArrowRight = false;
    }

    public destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        // Limpiar event listeners si es necesario
    }

    public show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    public hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }
}
