/**
 * SOLID: Single Responsibility Principle (SRP)
 * 
 * PlayerPhysics
 * 
 * RESPONSABILIDAD ÚNICA: Manejar la física y movimiento del jugador.
 * 
 * ¿Por qué separar esto?
 * - La física es compleja (gravedad, velocidad, aceleración, límites)
 * - Puede cambiar independientemente (ajustes de gameplay)
 * - Facilita el testing (puedes probar física aisladamente)
 * - Hace el código más legible y mantenible
 * 
 * ¿Qué NO hace esta clase?
 * - No lee input directamente (usa las intenciones procesadas)
 * - No dibuja al jugador
 * - No resuelve colisiones (solo actualiza posición)
 */

/**
 * Estado físico del jugador
 */
export interface PlayerPhysicsState {
    // Posición
    x: number;
    y: number;
    
    // Velocidad
    vx: number;
    vy: number;
    
    // Estado
    isGrounded: boolean;
    isApplyingThrust: boolean;
    isChargingFly: boolean;
    flyChargeTimer: number;
    
    // Dirección (-1 izquierda, 1 derecha)
    direction: 1 | -1;
}

/**
 * Configuración de física del jugador
 */
export interface PlayerPhysicsConfig {
    gravity: number;
    playerSpeed: number;
    thrustPower: number;
    maxUpwardSpeed: number;
    flyChargeTime: number;
}

export class PlayerPhysics {
    private state: PlayerPhysicsState;
    private config: PlayerPhysicsConfig;
    
    /**
     * @param initialState - Estado inicial de la física
     * @param config - Configuración de constantes físicas
     */
    constructor(initialState: PlayerPhysicsState, config: PlayerPhysicsConfig) {
        this.state = { ...initialState };
        this.config = config;
    }
    
    /**
     * Actualiza la física del jugador basándose en las intenciones
     * 
     * @param intentions - Las intenciones del jugador (de PlayerInputHandler)
     * @param hasEnergy - Si el jugador tiene energía para volar
     * @returns Estado actualizado de la física
     */
    update(intentions: { moveLeft: boolean; moveRight: boolean; wantsToFly: boolean }, hasEnergy: boolean): PlayerPhysicsState {
        // 1. Actualizar velocidad horizontal basada en intenciones
        this.updateHorizontalVelocity(intentions);
        
        // 2. Actualizar estado de vuelo
        this.updateFlightState(intentions.wantsToFly, hasEnergy);
        
        // 3. Aplicar gravedad (si no está cargando vuelo)
        if (!this.state.isChargingFly) {
            this.state.vy += this.config.gravity;
        }
        
        // 4. Limitar velocidad vertical máxima
        if (this.state.vy < -this.config.maxUpwardSpeed) {
            this.state.vy = -this.config.maxUpwardSpeed;
        }
        
        // 5. Actualizar posición
        this.state.x += this.state.vx;
        this.state.y += this.state.vy;
        
        return { ...this.state };
    }
    
    /**
     * Actualiza la velocidad horizontal según las intenciones de movimiento
     */
    private updateHorizontalVelocity(intentions: { moveLeft: boolean; moveRight: boolean }): void {
        if (intentions.moveLeft) {
            this.state.vx = -this.config.playerSpeed;
            this.state.direction = -1;
        } else if (intentions.moveRight) {
            this.state.vx = this.config.playerSpeed;
            this.state.direction = 1;
        } else {
            this.state.vx = 0;
        }
    }
    
    /**
     * Actualiza el estado de vuelo (carga de jet pack y empuje)
     */
    private updateFlightState(wantsToFly: boolean, hasEnergy: boolean): void {
        // Iniciar carga de vuelo si está en el suelo y quiere volar
        const canStartCharging = wantsToFly && this.state.isGrounded && 
                                !this.state.isApplyingThrust && !this.state.isChargingFly;
        
        if (canStartCharging) {
            this.state.isChargingFly = true;
            this.state.vy = -1; // Pequeño impulso inicial
        }
        
        // Si suelta la tecla, cancelar carga y empuje
        if (!wantsToFly) {
            this.state.isChargingFly = false;
            this.state.flyChargeTimer = 0;
            this.state.isApplyingThrust = false;
        }
        
        // Procesar carga de vuelo
        if (this.state.isChargingFly) {
            this.state.flyChargeTimer++;
            this.state.vy = 0; // Mantener quieto mientras carga
            
            // Si completó la carga, activar empuje
            if (this.state.flyChargeTimer >= this.config.flyChargeTime) {
                this.state.isChargingFly = false;
                this.state.flyChargeTimer = 0;
                this.state.isApplyingThrust = true;
            }
        } 
        // Aplicar empuje si está en el aire y quiere volar
        else if (wantsToFly && !this.state.isGrounded && hasEnergy) {
            this.state.isApplyingThrust = true;
        }
        
        // Aplicar fuerza de empuje
        if (this.state.isApplyingThrust && hasEnergy) {
            this.state.vy -= this.config.thrustPower;
        } else {
            this.state.isApplyingThrust = false;
        }
    }
    
    /**
     * Establece si el jugador está en el suelo (llamado por el sistema de colisiones)
     */
    setGrounded(grounded: boolean): void {
        this.state.isGrounded = grounded;
    }
    
    /**
     * Ajusta la posición del jugador (usado por resolución de colisiones)
     */
    setPosition(x: number, y: number): void {
        this.state.x = x;
        this.state.y = y;
    }
    
    /**
     * Ajusta la velocidad del jugador (usado por resolución de colisiones)
     */
    setVelocity(vx: number, vy: number): void {
        this.state.vx = vx;
        this.state.vy = vy;
    }
    
    /**
     * Obtiene el estado actual de la física
     */
    getState(): Readonly<PlayerPhysicsState> {
        return { ...this.state };
    }
    
    /**
     * Resetea el estado físico
     */
    reset(newState: Partial<PlayerPhysicsState>): void {
        this.state = { ...this.state, ...newState };
    }
}

