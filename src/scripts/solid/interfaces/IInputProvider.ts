/**
 * SOLID: Dependency Inversion Principle (DIP)
 * 
 * Abstracción para proveedores de input.
 * 
 * ¿Por qué esta abstracción?
 * - El Player no debe depender directamente de cómo se obtiene el input
 *   (teclado, gamepad, táctil, IA, replay, etc.)
 * - Permite cambiar la implementación del input sin modificar el Player
 * - Facilita el testing (puedes inyectar un MockInputProvider)
 * - Permite grabar y reproducir partidas fácilmente
 */
export interface IInputProvider {
    /**
     * Verifica si una tecla está presionada
     * @param key - El nombre de la tecla (ej: 'ArrowLeft', 'Space')
     * @returns true si la tecla está presionada
     */
    isKeyPressed(key: string): boolean;
    
    /**
     * Obtiene el estado actual de todas las teclas relevantes
     * @returns Objeto con el estado de las teclas
     */
    getInputState(): {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
        shoot: boolean;
    };
}

