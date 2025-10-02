/**
 * SOLID: Interface Segregation Principle (ISP)
 * 
 * Interfaz para entidades que pueden ser renderizadas.
 * 
 * ¿Por qué separar IUpdateable de IRenderable?
 * - Una entidad puede necesitar actualizarse pero no renderizarse (ej: triggers)
 * - Una entidad puede necesitar renderizarse pero no actualizarse (ej: decoraciones estáticas)
 * - Siguiendo ISP, no forzamos a las clases a implementar métodos que no necesitan
 */
export interface IRenderable {
    /**
     * Renderiza la entidad en el canvas
     * @param ctx - Contexto de renderizado del canvas
     * @param cameraY - Posición Y de la cámara para calcular offset
     */
    render(ctx: CanvasRenderingContext2D, cameraY: number): void;
}

