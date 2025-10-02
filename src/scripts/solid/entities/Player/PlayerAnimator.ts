/**
 * SOLID: Single Responsibility Principle (SRP)
 * 
 * PlayerAnimator
 * 
 * RESPONSABILIDAD ÚNICA: Manejar las animaciones del jugador.
 * 
 * ¿Por qué separar esto?
 * - Las animaciones pueden cambiar independientemente de la física
 * - Facilita agregar/modificar animaciones sin tocar otra lógica
 * - El código de animación puede ser complejo (estados, transiciones, frames)
 * - Permite reutilizar el sistema de animación para otras entidades
 * 
 * ¿Qué NO hace esta clase?
 * - No dibuja al jugador (solo gestiona el estado de animación)
 * - No procesa input
 * - No calcula física
 */

export type PlayerAnimationState = 'stand' | 'walk' | 'jump' | 'fly';

/**
 * Configuración de una animación
 */
export interface AnimationConfig {
    frames: number;        // Número de frames
    speed: number;         // Velocidad (frames del juego por frame de animación)
    loop?: boolean;        // Si la animación se repite
    reverse?: boolean;     // Si se reproduce al revés
}

/**
 * Estado de animación del jugador
 */
export interface PlayerAnimationStateData {
    currentState: PlayerAnimationState;
    currentFrame: number;
    animationTick: number;
}

export class PlayerAnimator {
    private state: PlayerAnimationStateData;
    private animations: Record<PlayerAnimationState, AnimationConfig>;
    
    /**
     * @param animations - Configuraciones de todas las animaciones del jugador
     */
    constructor(animations: Record<PlayerAnimationState, AnimationConfig>) {
        this.animations = animations;
        this.state = {
            currentState: 'stand',
            currentFrame: 0,
            animationTick: 0,
        };
    }
    
    /**
     * Actualiza la animación basándose en el estado físico del jugador
     * 
     * Esta función determina qué animación debe reproducirse según:
     * - Si está en el suelo o en el aire
     * - Si se está moviendo horizontalmente
     * - Si está volando/saltando
     * 
     * @param physicsState - Estado físico del jugador
     */
    update(physicsState: {
        isGrounded: boolean;
        isChargingFly: boolean;
        isApplyingThrust: boolean;
        vx: number;
    }): void {
        // 1. Determinar qué animación debería estar activa
        const desiredState = this.determineAnimationState(physicsState);
        
        // 2. Si cambió el estado, resetear la animación
        if (this.state.currentState !== desiredState) {
            this.changeAnimation(desiredState);
        }
        
        // 3. Avanzar el frame de la animación actual
        this.advanceFrame();
    }
    
    /**
     * Determina qué animación debe reproducirse según el estado físico
     */
    private determineAnimationState(physicsState: {
        isGrounded: boolean;
        isChargingFly: boolean;
        isApplyingThrust: boolean;
        vx: number;
    }): PlayerAnimationState {
        // En el suelo
        if (physicsState.isGrounded) {
            // Cargando vuelo
            if (physicsState.isChargingFly) {
                return 'jump';
            }
            // Caminando
            if (physicsState.vx !== 0) {
                return 'walk';
            }
            // Parado
            return 'stand';
        }
        
        // En el aire
        // Si está volando y completó la transición de jump a fly
        if (physicsState.isApplyingThrust || physicsState.isChargingFly) {
            const jumpAnim = this.animations.jump;
            if (this.state.currentState === 'jump' && 
                this.state.currentFrame === jumpAnim.frames - 1) {
                return 'fly';
            }
            if (this.state.currentState !== 'fly') {
                return 'jump';
            }
        }
        
        // Saltando sin empuje
        return 'jump';
    }
    
    /**
     * Cambia a una nueva animación, reseteando frames
     */
    private changeAnimation(newState: PlayerAnimationState): void {
        this.state.currentState = newState;
        this.state.currentFrame = 0;
        this.state.animationTick = 0;
    }
    
    /**
     * Avanza el frame de la animación actual
     */
    private advanceFrame(): void {
        const anim = this.animations[this.state.currentState];
        if (!anim) return;
        
        this.state.animationTick++;
        
        // Si no ha pasado suficiente tiempo, no avanzar frame
        if (this.state.animationTick < anim.speed) {
            return;
        }
        
        // Resetear tick
        this.state.animationTick = 0;
        
        // Animación reversa
        if (anim.reverse) {
            this.state.currentFrame = (this.state.currentFrame - 1 + anim.frames) % anim.frames;
            return;
        }
        
        // Animación sin loop (se queda en el último frame)
        if (anim.loop === false) {
            this.state.currentFrame = Math.min(this.state.currentFrame + 1, anim.frames - 1);
            return;
        }
        
        // Animación con loop (por defecto)
        this.state.currentFrame = (this.state.currentFrame + 1) % anim.frames;
    }
    
    /**
     * Obtiene el estado actual de la animación
     * (usado por el renderer para saber qué frame dibujar)
     */
    getState(): Readonly<PlayerAnimationStateData> {
        return { ...this.state };
    }
    
    /**
     * Obtiene la configuración de una animación específica
     */
    getAnimationConfig(state: PlayerAnimationState): AnimationConfig {
        return this.animations[state];
    }
}

