/**
 * SOLID: Interface Segregation Principle (ISP)
 * 
 * Interfaz para entidades con las que se puede colisionar.
 * 
 * ¿Por qué esta interfaz?
 * - Separa la responsabilidad de colisión del resto de la lógica
 * - Permite que un sistema de colisiones genérico maneje cualquier entidad colisionable
 * - No todas las entidades necesitan colisionar (ej: partículas, efectos visuales)
 */
export interface ICollider {
    /**
     * Obtiene el bounds/hitbox de la entidad para detección de colisiones
     */
    getBounds(): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    
    /**
     * Maneja la colisión con otra entidad
     * @param other - La otra entidad con la que colisiona
     */
    onCollision?(other: ICollider): void;
}

