/**
 * SOLID: Single Responsibility Principle (SRP)
 * 
 * PlayerInputHandler
 * 
 * RESPONSABILIDAD ÚNICA: Procesar el input del jugador y traducirlo a intenciones.
 * 
 * ¿Por qué separar esto?
 * - El manejo de input puede cambiar (teclado, gamepad, touch, IA)
 * - Facilita el testing (puedes simular inputs)
 * - Permite grabar/reproducir partidas fácilmente
 * - No mezcla lógica de input con física o animación
 * 
 * ¿Qué NO hace esta clase?
 * - No mueve al jugador (eso es responsabilidad de PlayerPhysics)
 * - No renderiza (responsabilidad de PlayerRenderer)
 * - No resuelve colisiones (responsabilidad de PlayerCollisionResolver)
 */

import type { IInputProvider } from '../../interfaces/IInputProvider';

/**
 * Representa las intenciones del jugador basadas en el input
 */
export interface PlayerIntentions {
    moveLeft: boolean;
    moveRight: boolean;
    wantsToFly: boolean;
    wantsToShoot: boolean;
    wantsToDropBomb: boolean;
}

export class PlayerInputHandler {
    private inputProvider: IInputProvider;
    
    /**
     * @param inputProvider - Proveedor de input (inyección de dependencia - DIP)
     */
    constructor(inputProvider: IInputProvider) {
        this.inputProvider = inputProvider;
    }
    
    /**
     * Procesa el input y devuelve las intenciones del jugador
     * 
     * Nota: Esta función no modifica el estado del jugador directamente.
     * Solo traduce inputs a intenciones, manteniendo SRP.
     */
    getIntentions(): PlayerIntentions {
        const state = this.inputProvider.getInputState();
        
        return {
            moveLeft: state.left,
            moveRight: state.right,
            wantsToFly: state.up,
            wantsToShoot: state.shoot,
            wantsToDropBomb: state.down,
        };
    }
    
    /**
     * Permite cambiar el proveedor de input en tiempo de ejecución
     * Útil para cambiar entre controles de teclado, gamepad, etc.
     */
    setInputProvider(inputProvider: IInputProvider): void {
        this.inputProvider = inputProvider;
    }
}

