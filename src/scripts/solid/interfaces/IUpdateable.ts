/**
 * SOLID: Interface Segregation Principle (ISP)
 * 
 * Interfaz simple que define un contrato para entidades que pueden actualizarse.
 * 
 * ¿Por qué esta interfaz?
 * - Permite que diferentes tipos de entidades (Player, Enemy, Bomb, etc.)
 *   compartan un comportamiento común sin acoplamiento
 * - Facilita la creación de sistemas genéricos que pueden actualizar
 *   cualquier entidad que implemente esta interfaz
 */
export interface IUpdateable {
    /**
     * Actualiza el estado de la entidad en un frame del juego
     * @param deltaTime - Tiempo transcurrido desde el último frame (opcional)
     */
    update(deltaTime?: number): void;
}

