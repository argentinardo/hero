// index.ts
/**
 * Punto de entrada principal para la arquitectura SOLID del proyecto H.E.R.O.
 */

// Interfaces principales
export * from './interfaces';

// Servicios y dependencias
export * from './DependencyContainer';

// Importar tipos necesarios
import { 
    Game, 
    GameConfiguration, 
    GameFactory 
} from './DependencyContainer';
import { 
    IEntity, 
    Vector2, 
    GameContext, 
    IRenderer, 
    ILogger 
} from './interfaces';

/**
 * Función principal para inicializar el juego con arquitectura SOLID
 * 
 * @param canvas Elemento canvas del DOM
 * @returns Instancia del juego configurada
 */
export function initializeSOLIDGame(canvas: HTMLCanvasElement): Game {
    console.log('🏗️ Inicializando juego H.E.R.O. con arquitectura SOLID...');
    
    // Crear configuración
    const config = new GameConfiguration();
    
    // Crear juego usando factory
    const game = GameFactory.createDefaultGame();
    
    console.log('✅ Juego inicializado correctamente');
    
    return game;
}

/**
 * Función para crear un juego de prueba
 * 
 * @returns Instancia del juego con mocks para testing
 */
export function createTestGame(): Game {
    console.log('🧪 Creando juego de prueba...');
    
    const game = GameFactory.createTestGame();
    
    console.log('✅ Juego de prueba creado');
    
    return game;
}

/**
 * Función para ejecutar un ejemplo básico
 */
export function runBasicExample(): void {
    console.log('🎮 Ejecutando ejemplo básico...');
    
    // Crear canvas si no existe
    let canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'gameCanvas';
        canvas.width = 800;
        canvas.height = 600;
        document.body.appendChild(canvas);
    }
    
    // Inicializar juego
    const game = initializeSOLIDGame(canvas);
    
    // Crear una entidad básica de ejemplo
    const exampleEntity = new ExampleEntity();
    game.addEntity(exampleEntity);
    
    // Iniciar el juego
    game.start();
    
    console.log('🚀 Ejemplo ejecutándose...');
}

// Clase de ejemplo para demostrar el uso
class ExampleEntity implements IEntity {
    public readonly id: string;
    private position: Vector2;
    private isActiveFlag: boolean = true;
    
    constructor() {
        this.id = `example_${Date.now()}`;
        const { Vector2Impl } = require('./interfaces');
        this.position = new Vector2Impl(100, 100);
    }
    
    update(context: GameContext): void {
        // Mover la entidad basada en input
        const input = context.inputProvider.getMovementInput();
        this.position = this.position.add(input.multiply(context.deltaTime * 0.1));
        
        // Log de estado cada segundo
        if (Math.random() < 0.01) {
            console.log(`Entity ${this.id} at position (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`);
        }
    }
    
    render(renderer: IRenderer): void {
        // Dibujar un rectángulo simple
        const { RectangleImpl } = require('./interfaces');
        const rect = new RectangleImpl(this.position.x, this.position.y, 20, 20);
        renderer.drawRectangle(rect, '#00ff00');
        
        // Dibujar texto con ID
        renderer.drawText(this.id, this.position, '#ffffff', 12);
    }
    
    isActive(): boolean {
        return this.isActiveFlag;
    }
    
    destroy(): void {
        this.isActiveFlag = false;
    }
}

// Exportar por defecto la función principal
export default initializeSOLIDGame;
