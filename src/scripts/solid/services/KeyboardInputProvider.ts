/**
 * SOLID: Dependency Inversion Principle (DIP)
 * 
 * KeyboardInputProvider
 * 
 * Implementación concreta de IInputProvider para teclado.
 * 
 * ¿Por qué esta separación?
 * - El Player no sabe de dónde viene el input (teclado, gamepad, IA)
 * - Podemos crear otras implementaciones (GamepadInputProvider, TouchInputProvider)
 * - Facilita el testing (MockInputProvider)
 * - Permite grabar/reproducir partidas (ReplayInputProvider)
 * 
 * Ejemplo de Inversión de Dependencias:
 * - ANTES: Player dependía directamente del objeto keys global
 * - AHORA: Player depende de la interfaz IInputProvider
 * - Esta clase implementa esa interfaz para teclado específicamente
 */

import type { IInputProvider } from '../interfaces/IInputProvider';

export class KeyboardInputProvider implements IInputProvider {
    /**
     * @param keys - Referencia al objeto de teclas del juego
     *              (típicamente store.keys en el código original)
     */
    constructor(private keys: Record<string, boolean>) {}
    
    /**
     * Verifica si una tecla específica está presionada
     */
    isKeyPressed(key: string): boolean {
        return this.keys[key] || false;
    }
    
    /**
     * Obtiene el estado simplificado de las teclas relevantes para el player
     * 
     * Nota: Esto abstrae los nombres específicos de las teclas.
     * El Player no necesita saber que "left" es "ArrowLeft",
     * solo necesita saber si el jugador quiere moverse a la izquierda.
     */
    getInputState(): {
        left: boolean;
        right: boolean;
        up: boolean;
        down: boolean;
        shoot: boolean;
    } {
        return {
            left: this.isKeyPressed('ArrowLeft'),
            right: this.isKeyPressed('ArrowRight'),
            up: this.isKeyPressed('ArrowUp'),
            down: this.isKeyPressed('ArrowDown'),
            shoot: this.isKeyPressed('Space'),
        };
    }
    
    /**
     * Permite actualizar la referencia al objeto de teclas
     * (útil si el sistema de input cambia en runtime)
     */
    setKeys(keys: Record<string, boolean>): void {
        this.keys = keys;
    }
}

/**
 * Ejemplo de otra implementación: MockInputProvider para testing
 */
export class MockInputProvider implements IInputProvider {
    private mockKeys: Record<string, boolean> = {};
    
    /**
     * Simula presionar una tecla (útil en tests)
     */
    pressKey(key: string): void {
        this.mockKeys[key] = true;
    }
    
    /**
     * Simula soltar una tecla (útil en tests)
     */
    releaseKey(key: string): void {
        this.mockKeys[key] = false;
    }
    
    /**
     * Simula presionar múltiples teclas a la vez
     */
    pressKeys(...keys: string[]): void {
        keys.forEach(key => this.pressKey(key));
    }
    
    /**
     * Limpia todos los inputs
     */
    clearAll(): void {
        this.mockKeys = {};
    }
    
    isKeyPressed(key: string): boolean {
        return this.mockKeys[key] || false;
    }
    
    getInputState() {
        return {
            left: this.isKeyPressed('ArrowLeft'),
            right: this.isKeyPressed('ArrowRight'),
            up: this.isKeyPressed('ArrowUp'),
            down: this.isKeyPressed('ArrowDown'),
            shoot: this.isKeyPressed('Space'),
        };
    }
}

/**
 * Ejemplo de implementación para IA/NPC
 */
export class AIInputProvider implements IInputProvider {
    private targetX: number = 0;
    private targetY: number = 0;
    private currentX: number = 0;
    private currentY: number = 0;
    private shouldShoot: boolean = false;
    
    /**
     * Configura el objetivo al que la IA debe moverse
     */
    setTarget(x: number, y: number): void {
        this.targetX = x;
        this.targetY = y;
    }
    
    /**
     * Actualiza la posición actual de la entidad controlada por IA
     */
    updatePosition(x: number, y: number): void {
        this.currentX = x;
        this.currentY = y;
    }
    
    /**
     * Configura si la IA debe disparar
     */
    setShooting(shoot: boolean): void {
        this.shouldShoot = shoot;
    }
    
    isKeyPressed(key: string): boolean {
        // La IA no usa teclas individuales, usa el estado calculado
        return false;
    }
    
    /**
     * La IA calcula su input basándose en la posición del objetivo
     */
    getInputState() {
        const deltaX = this.targetX - this.currentX;
        const deltaY = this.targetY - this.currentY;
        const threshold = 10; // Margen de error
        
        return {
            left: deltaX < -threshold,
            right: deltaX > threshold,
            up: deltaY < -threshold,
            down: deltaY > threshold,
            shoot: this.shouldShoot,
        };
    }
}

