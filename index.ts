import './styles/main.scss';
import { Game } from './core/Game';

// Asegurarse de que el DOM está completamente cargado
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas element not found!');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('2D context not available');
        return;
    }

    // Iniciar el juego
    const game = new Game(canvas, ctx);
    game.start();
});
