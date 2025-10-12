import type { GameStore } from '../core/types';
import { TILE_SIZE } from '../core/constants';

// Sistema de historial para undo/redo
export const saveToHistory = (store: GameStore) => {
    const currentState = JSON.parse(JSON.stringify(store.editorLevel));
    
    // Si estamos en el medio del historial, truncar todo lo que viene después
    if (store.editorHistoryIndex < store.editorHistory.length - 1) {
        store.editorHistory = store.editorHistory.slice(0, store.editorHistoryIndex + 1);
    }
    
    // Agregar el nuevo estado al historial
    store.editorHistory.push(currentState);
    store.editorHistoryIndex = store.editorHistory.length - 1;
    
    // Limitar el historial a 50 estados para evitar usar demasiada memoria
    if (store.editorHistory.length > 50) {
        store.editorHistory.shift();
        store.editorHistoryIndex--;
    }
};

export const undo = (store: GameStore) => {
    if (store.editorHistoryIndex > 0) {
        store.editorHistoryIndex--;
        store.editorLevel = JSON.parse(JSON.stringify(store.editorHistory[store.editorHistoryIndex]));
    }
};

export const redo = (store: GameStore) => {
    if (store.editorHistoryIndex < store.editorHistory.length - 1) {
        store.editorHistoryIndex++;
        store.editorLevel = JSON.parse(JSON.stringify(store.editorHistory[store.editorHistoryIndex]));
    }
};


// Función de llenado (flood fill)
export const floodFill = (store: GameStore, startX: number, startY: number, newTile: string) => {
    if (!store.editorLevel[startY] || store.editorLevel[startY][startX] === undefined) return;
    
    const originalTile = store.editorLevel[startY][startX];
    if (originalTile === newTile) return; // No hay nada que cambiar
    
    saveToHistory(store);
    
    const visited = new Set<string>();
    const stack: [number, number][] = [[startX, startY]];
    
    while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        if (!store.editorLevel[y] || store.editorLevel[y][x] !== originalTile) continue;
        
        store.editorLevel[y][x] = newTile;
        
        // Agregar vecinos al stack
        if (y > 0) stack.push([x, y - 1]);
        if (y < store.editorLevel.length - 1) stack.push([x, y + 1]);
        if (x > 0) stack.push([x - 1, y]);
        if (x < (store.editorLevel[y]?.length || 0) - 1) stack.push([x + 1, y]);
    }
};

// Función para pintar área rectangular
export const paintArea = (store: GameStore, startX: number, startY: number, endX: number, endY: number, tile: string) => {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);
    const minY = Math.min(startY, endY);
    const maxY = Math.max(startY, endY);
    
    saveToHistory(store);
    
    // Asegurar que el nivel sea lo suficientemente grande
    const maxRequiredY = maxY;
    const maxRequiredX = maxX;
    
    // Expandir el nivel si es necesario
    while (store.editorLevel.length <= maxRequiredY) {
        const rowWidth = store.editorLevel[0]?.length || 0;
        store.editorLevel.push(Array(Math.max(rowWidth, maxRequiredX + 1)).fill('0'));
    }
    
    // Expandir las filas existentes si es necesario
    for (let y = 0; y < store.editorLevel.length; y++) {
        while (store.editorLevel[y].length <= maxRequiredX) {
            store.editorLevel[y].push('0');
        }
    }
    
    // Pintar el área
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (store.editorLevel[y] && store.editorLevel[y][x] !== undefined) {
                if (tile === 'P') {
                    // Para el jugador, eliminar otros jugadores primero
                    for (let row = 0; row < store.editorLevel.length; row++) {
                        const index = store.editorLevel[row].indexOf('P');
                        if (index !== -1) {
                            store.editorLevel[row][index] = '0';
                        }
                    }
                }
                store.editorLevel[y][x] = tile;
            }
        }
    }
};

// Función para borrar área rectangular
export const eraseArea = (store: GameStore, startX: number, startY: number, endX: number, endY: number) => {
    paintArea(store, startX, startY, endX, endY, '0');
};


// Función para actualizar el estado de los botones undo/redo
export const updateUndoRedoButtons = (store: GameStore) => {
    const { undoBtn, redoBtn } = store.dom.ui;
    
    if (undoBtn) {
        undoBtn.disabled = store.editorHistoryIndex <= 0;
        undoBtn.className = undoBtn.disabled 
            ? 'w-full bg-gray-500 p-2 border-2 border-white text-xs opacity-50 cursor-not-allowed'
            : 'w-full bg-gray-600 hover:bg-gray-700 p-2 border-2 border-white text-xs';
    }
    
    if (redoBtn) {
        redoBtn.disabled = store.editorHistoryIndex >= store.editorHistory.length - 1;
        redoBtn.className = redoBtn.disabled 
            ? 'w-full bg-gray-500 p-2 border-2 border-white text-xs opacity-50 cursor-not-allowed'
            : 'w-full bg-gray-600 hover:bg-gray-700 p-2 border-2 border-white text-xs';
    }
};


// Función para inicializar el editor avanzado
export const initializeAdvancedEditor = (store: GameStore) => {
    // Guardar el estado inicial en el historial
    saveToHistory(store);
    
    // Actualizar botones
    updateUndoRedoButtons(store);
};
