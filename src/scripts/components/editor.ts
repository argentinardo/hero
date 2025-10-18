import { TILE_SIZE, TOTAL_LEVELS } from '../core/constants';
import { TILE_TYPES, ANIMATION_DATA } from '../core/assets';
import type { GameStore } from '../core/types';
import { generateLevel, LevelGeneratorOptions } from './levelGenerator';
import { 
    saveToHistory, 
    paintArea,
    updateUndoRedoButtons,
    initializeAdvancedEditor
} from './advancedEditor';

const ensurePlayerUnique = (level: string[][], tile: string, x: number, y: number) => {
    if (tile !== 'P') {
        return;
    }
    for (let row = 0; row < level.length; row++) {
        const index = level[row].indexOf('P');
        if (index !== -1) {
            level[row][index] = '0';
        }
    }
    level[y][x] = tile;
};

const ensureLevelHeight = (level: string[][], minRows: number) => {
    while (level.length < minRows) {
        level.push(Array(level[0]?.length ?? 0).fill('0'));
    }
};

export const setupEditorState = (store: GameStore) => {
    store.editorLevel = (store.levelDesigns[0] ?? []).map(row => row.split(''));
    store.levelDataStore = Array.from({ length: TOTAL_LEVELS }, (_, index) => {
        const level = store.initialLevels[index] ?? store.initialLevels[0];
        return level ? level.map(row => row.split('')) : [];
    });
    store.selectedTile = '1';
    store.mouse = { x: 0, y: 0, gridX: 0, gridY: 0, isDown: false };
    
    // Inicializar el editor avanzado
    initializeAdvancedEditor(store);
};

const applyMousePaint = (store: GameStore) => {
    const level = store.editorLevel;
    const { gridX, gridY } = store.mouse;
    if (!level[gridY] || level[gridY][gridX] === undefined) {
        return;
    }
    
    // Solo guardar en historial en el primer click, no en cada movimiento
    if (!store.mouse.isDragging) {
        saveToHistory(store);
        store.mouse.isDragging = true;
    }
    
    const selected = store.selectedTile;
    if (selected === 'P') {
        ensurePlayerUnique(level, selected, gridX, gridY);
        return;
    }
    if (selected === '9') {
        ensureMinerUnique(level, selected, gridX, gridY);
        return;
    }
    level[gridY][gridX] = selected;
};

const ensureMinerUnique = (level: string[][], tile: string, x: number, y: number) => {
    // Eliminar cualquier miner existente
    for (let row = 0; row < level.length; row++) {
        for (let col = 0; col < level[row].length; col++) {
            if (level[row][col] === '9') {
                level[row][col] = '0';
            }
        }
    }
    // Colocar el nuevo miner
    level[y][x] = tile;
};

// Variables para detectar gestos con dos dedos
let touchStartY1 = 0;
let touchStartY2 = 0;
let touchStartTime = 0;
let isTwoFingerGesture = false;
let lastTwoFingerY = 0;

export const bindEditorCanvas = (store: GameStore) => {
    const canvas = store.dom.canvas;
    if (!canvas) {
        return;
    }
    // Evitar scroll por botón medio del navegador en el canvas
    canvas.addEventListener('mousedown', e => {
        if (store.appState !== 'editing') return;
        if (e.button === 1) {
            e.preventDefault();
        }
    });
    canvas.addEventListener('mousemove', event => {
        if (store.appState !== 'editing') {
            return;
        }

        // Obtener las coordenadas reales del canvas en el viewport
        const canvasRect = canvas.getBoundingClientRect();
        const canvasWidth = canvas.width;  // Resolución interna del canvas (1200)
        const canvasHeight = canvas.height;  // Resolución interna del canvas (900)

        // Verificar si el mouse está dentro del área del canvas
        if (event.clientX >= canvasRect.left && event.clientX <= canvasRect.right &&
            event.clientY >= canvasRect.top && event.clientY <= canvasRect.bottom) {
            
            // Calcular coordenadas relativas al canvas
            const relativeX = event.clientX - canvasRect.left;
            const relativeY = event.clientY - canvasRect.top;
            
            // Convertir a coordenadas del canvas interno usando el factor de escala
            const scaleX = canvasWidth / canvasRect.width;
            const scaleY = canvasHeight / canvasRect.height;
            
            store.mouse.x = relativeX * scaleX;
            store.mouse.y = relativeY * scaleY;

            // Debug para verificar coordenadas
            console.log(`Canvas rect: (${canvasRect.left}, ${canvasRect.top}, ${canvasRect.width}, ${canvasRect.height})`);
            console.log(`Mouse relative: (${relativeX}, ${relativeY})`);
            console.log(`Mouse canvas: (${store.mouse.x.toFixed(1)}, ${store.mouse.y.toFixed(1)})`);
            console.log(`Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);
        } else {
            // Si el evento está fuera del área del canvas, no procesar
            return;
        }

        // Asegurar que las coordenadas estén dentro de los límites del canvas
        store.mouse.x = Math.max(0, Math.min(store.mouse.x, canvasWidth));
        store.mouse.y = Math.max(0, Math.min(store.mouse.y, canvas.height));

        // Calcular coordenadas del mundo considerando la cámara
        // Las coordenadas del mouse están en relación al contenido visible del canvas
        // pero necesitamos convertirlas a coordenadas del mundo absoluto considerando el scroll
        // Como el contenido se mueve mediante ctx.translate(-cameraX, -cameraY), necesitamos
        // sumar cameraX y cameraY para obtener las coordenadas correctas del mundo
        const worldX = store.mouse.x + store.cameraX;
        const worldY = store.mouse.y + store.cameraY;
        store.mouse.gridX = Math.floor(worldX / TILE_SIZE);
        store.mouse.gridY = Math.floor(worldY / TILE_SIZE);

        // Debug adicional para verificar el cálculo de grid
        console.log(`World calc: mouse.x=${store.mouse.x}, mouse.y=${store.mouse.y}, cameraX=${store.cameraX}, cameraY=${store.cameraY}, worldX=${worldX}, worldY=${worldY}, gridX=${store.mouse.gridX}, gridY=${store.mouse.gridY}`);

        // Debug: Log de coordenadas para identificar el problema
        console.log(`Mouse: (${store.mouse.x.toFixed(2)}, ${store.mouse.y.toFixed(2)}) -> Grid: (${store.mouse.gridX}, ${store.mouse.gridY}) | Event: (${event.clientX}, ${event.clientY})`);

        // Panning con botón medio (hand tool)
        if (store.mouse.isPanning) {
            const dx = store.mouse.x - (store.mouse.panStartMouseX ?? store.mouse.x);
            const dy = store.mouse.y - (store.mouse.panStartMouseY ?? store.mouse.y);
            const startCamX = store.mouse.panStartCameraX ?? store.cameraX;
            const startCamY = store.mouse.panStartCameraY ?? store.cameraY;
            store.cameraX = Math.max(0, startCamX - dx);
            store.cameraY = Math.max(0, startCamY - dy);
        }

        if (store.mouse.isDown) {
            applyMousePaint(store);
        }
    });

    canvas.addEventListener('mousedown', event => {
        if (store.appState !== 'editing') return;
        if (event.button === 1) {
            // Iniciar pan con botón medio
            store.mouse.isPanning = true;
            store.mouse.panStartMouseX = store.mouse.x;
            store.mouse.panStartMouseY = store.mouse.y;
            store.mouse.panStartCameraX = store.cameraX;
            store.mouse.panStartCameraY = store.cameraY;
            canvas.style.cursor = 'grabbing';
            event.preventDefault();
            return;
        }
        if (event.button === 0) {
            store.mouse.isDown = true;
            store.mouse.isDragging = false;
            store.mouse.startX = store.mouse.gridX;
            store.mouse.startY = store.mouse.gridY;
            applyMousePaint(store);
        }
    });

    canvas.addEventListener('mouseup', (event) => {
        if (store.appState === 'editing' && event.button === 1) {
            store.mouse.isPanning = false;
            canvas.style.cursor = '';
        }
        if (store.mouse.isDown && store.mouse.isDragging && 
            store.mouse.startX !== undefined && store.mouse.startY !== undefined) {
            // Si hubo drag, pintar el área completa
            paintArea(store, store.mouse.startX, store.mouse.startY, store.mouse.gridX, store.mouse.gridY, store.selectedTile);
        }
        store.mouse.isDown = false;
        store.mouse.isDragging = false;
        updateUndoRedoButtons(store);
    });

    canvas.addEventListener('mouseleave', () => {
        if (store.appState !== 'editing') return;
        if (store.mouse.isPanning) {
            store.mouse.isPanning = false;
            canvas.style.cursor = '';
        }
        store.mouse.isDown = false;
        store.mouse.isDragging = false;
    });

    canvas.addEventListener('wheel', event => {
        if (store.appState !== 'editing') {
            return;
        }
        event.preventDefault();
        
        // Scroll horizontal con Shift + rueda del mouse o deltaX
        if (event.shiftKey || event.deltaX !== 0) {
            const deltaX = event.shiftKey ? event.deltaY : event.deltaX;
            const prevCameraX = store.cameraX;
            store.cameraX += deltaX;
            
            if (store.editorLevel.length > 0 && store.editorLevel[0]) {
                // Expandir horizontalmente a la izquierda si es necesario
                if (store.cameraX < TILE_SIZE * 2) {
                    const colsToAdd = 5; // Agregar 5 columnas a la izquierda
                    
                    // Agregar columnas al inicio de cada fila
                    for (let row of store.editorLevel) {
                        for (let i = 0; i < colsToAdd; i++) {
                            row.unshift('0');
                        }
                    }
                    
                    // Ajustar la posición de la cámara para compensar las nuevas columnas
                    store.cameraX += colsToAdd * TILE_SIZE;
                }
                
                const levelWidth = store.editorLevel[0].length * TILE_SIZE;
                
                // Expandir horizontalmente a la derecha si es necesario
                if (store.cameraX + canvas.width > levelWidth - TILE_SIZE) {
                    const minCols = Math.ceil((store.cameraX + canvas.width + TILE_SIZE * 5) / TILE_SIZE);
                    
                    // Agregar columnas al final de todas las filas
                    for (let row of store.editorLevel) {
                        while (row.length < minCols) {
                            row.push('0');
                        }
                    }
                }
                
                const maxCameraX = Math.max(0, store.editorLevel[0].length * TILE_SIZE - canvas.width);
                store.cameraX = Math.max(0, Math.min(store.cameraX, maxCameraX));
            }
        } else {
            // Scroll vertical normal
            const prevCameraY = store.cameraY;
            store.cameraY += event.deltaY;
            if (store.editorLevel.length > 0) {
                // Expandir verticalmente hacia arriba si es necesario
                if (store.cameraY < TILE_SIZE * 2) {
                    const rowsToAdd = 5; // Agregar 5 filas arriba
                    const rowWidth = store.editorLevel[0]?.length ?? 0;
                    
                    // Agregar filas al inicio
                    for (let i = 0; i < rowsToAdd; i++) {
                        store.editorLevel.unshift(Array(rowWidth).fill('0'));
                    }
                    
                    // Ajustar la posición de la cámara para compensar las nuevas filas
                    store.cameraY += rowsToAdd * TILE_SIZE;
                }
                
                const levelHeight = store.editorLevel.length * TILE_SIZE;
                
                // Expandir verticalmente hacia abajo si es necesario
                if (store.cameraY + (canvas.height ?? 0) > levelHeight - TILE_SIZE) {
                    const minRows = Math.ceil((store.cameraY + canvas.height + TILE_SIZE * 5) / TILE_SIZE);
                    ensureLevelHeight(store.editorLevel, minRows);
                }
                
                const maxCameraY = Math.max(0, store.editorLevel.length * TILE_SIZE - (canvas.height ?? 0));
                store.cameraY = Math.max(0, Math.min(store.cameraY, maxCameraY));
            }
        }
    }, { passive: false });

    // Soporte para touch events en móvil
    canvas.addEventListener('touchmove', event => {
        if (store.appState !== 'editing') {
            return;
        }
        event.preventDefault();

        const touches = event.touches;

        // Si hay dos dedos y estamos en un gesto de dos dedos, procesar como scroll
        if (touches.length === 2 && isTwoFingerGesture) {
            const currentY1 = touches[0].clientY;
            const currentY2 = touches[1].clientY;
            const currentTwoFingerY = (currentY1 + currentY2) / 2;

            // Calcular movimiento relativo desde la última posición
            const deltaY = lastTwoFingerY - currentTwoFingerY; // Movimiento positivo hacia arriba = scroll hacia abajo
            const scrollAmount = deltaY * 1.5; // Factor de sensibilidad

            // Actualizar posición de la cámara
            if (store.editorLevel.length > 0) {
                const levelHeight = store.editorLevel.length * TILE_SIZE;
                const maxCameraY = Math.max(0, levelHeight - (canvas.height ?? 0));

                // Aplicar scroll suave con límites
                store.cameraY = Math.max(0, Math.min(store.cameraY + scrollAmount, maxCameraY));

                // Debug del scroll con dos dedos
                console.log(`Two-finger scroll: deltaY=${deltaY}, scrollAmount=${scrollAmount}, new cameraY=${store.cameraY}`);
            }

            // Actualizar posición para el siguiente cálculo
            lastTwoFingerY = currentTwoFingerY;
            return; // No procesar como colocación de tiles
        }

        // Si hay un solo dedo, procesar como colocación normal de tiles
        if (touches.length === 1 && !isTwoFingerGesture) {
            // Como el canvas está posicionado fijo en (0,0) y ocupa 60% del ancho,
            // las coordenadas del evento están en relación al viewport completo
            // Necesitamos mapear las coordenadas del evento al área del canvas
            const canvasRect = canvas.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const canvasWidth = canvas.width;  // Resolución interna del canvas (1200)
            const canvasHeight = canvas.height;  // Resolución interna del canvas (900)

            // Verificar si el touch está dentro del área del canvas
            if (touches[0].clientX >= canvasRect.left && touches[0].clientX <= canvasRect.right &&
                touches[0].clientY >= canvasRect.top && touches[0].clientY <= canvasRect.bottom) {
                
                // Calcular coordenadas relativas al canvas
                const relativeX = touches[0].clientX - canvasRect.left;
                const relativeY = touches[0].clientY - canvasRect.top;
                
                // Convertir a coordenadas del canvas interno usando el factor de escala
                const scaleX = canvasWidth / canvasRect.width;
                const scaleY = canvasHeight / canvasRect.height;
                
                store.mouse.x = relativeX * scaleX;
                store.mouse.y = relativeY * scaleY;

                // Debug adicional para verificar coordenadas del dispositivo
                console.log(`Device info: touch.clientX=${touches[0].clientX}, touch.clientY=${touches[0].clientY}`);
                console.log(`Canvas rect: left=${canvasRect.left}, top=${canvasRect.top}, width=${canvasRect.width}, height=${canvasRect.height}`);
                console.log(`Viewport: ${viewportWidth}x${viewportHeight}`);
                console.log(`Canvas internal: ${canvasWidth}x${canvasHeight}`);
                console.log(`Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);
                console.log(`Touch Y calc: touch.clientY=${touches[0].clientY}, canvasTop=${canvasRect.top}, scaledY=${store.mouse.y.toFixed(2)}`);

                // Verificar si hay algún offset del sistema del navegador
                const visualViewport = window.visualViewport;
                if (visualViewport) {
                    console.log(`Visual viewport: offsetLeft=${visualViewport.offsetLeft}, offsetTop=${visualViewport.offsetTop}`);
                    console.log(`Visual viewport size: ${visualViewport.width}x${visualViewport.height}`);
                }
            } else {
                // Si el evento está fuera del área del canvas, no procesar
                return;
            }

            // Asegurar que las coordenadas estén dentro de los límites del canvas
            store.mouse.x = Math.max(0, Math.min(store.mouse.x, canvasWidth));
            store.mouse.y = Math.max(0, Math.min(store.mouse.y, canvas.height));

            // Calcular coordenadas del mundo considerando la cámara
            // Las coordenadas del mouse ya están en relación a la resolución interna del canvas (1200x900)
            // y el contenido se mueve mediante ctx.translate(-cameraX, -cameraY) en el contexto de dibujo
            const worldX = store.mouse.x + store.cameraX;
            const worldY = store.mouse.y + store.cameraY;
            store.mouse.gridX = Math.floor(worldX / TILE_SIZE);
            store.mouse.gridY = Math.floor(worldY / TILE_SIZE);

            // Debug adicional para verificar el cálculo de grid
            console.log(`Touch world calc: mouse.x=${store.mouse.x}, mouse.y=${store.mouse.y}, cameraX=${store.cameraX}, cameraY=${store.cameraY}, worldX=${worldX}, worldY=${worldY}, gridX=${store.mouse.gridX}, gridY=${store.mouse.gridY}`);

            if (store.mouse.isDown) {
                applyMousePaint(store);
            }
        }
    }, { passive: false });

    canvas.addEventListener('touchstart', event => {
        if (store.appState !== 'editing') {
            return;
        }
        event.preventDefault();

        const touches = event.touches;

        // Si hay dos dedos tocando, iniciar gesto de dos dedos
        if (touches.length === 2) {
            touchStartY1 = touches[0].clientY;
            touchStartY2 = touches[1].clientY;
            touchStartTime = Date.now();
            isTwoFingerGesture = true;
            lastTwoFingerY = (touchStartY1 + touchStartY2) / 2;
            return; // No procesar como toque normal
        }

        // Si hay un solo dedo, procesar normalmente
        if (touches.length === 1) {
            isTwoFingerGesture = false;
        }

        // Como el canvas está posicionado fijo en (0,0) y ocupa 60% del ancho,
        // las coordenadas del evento están en relación al viewport completo
        // Necesitamos mapear las coordenadas del evento al área del canvas
        const canvasRect = canvas.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const canvasWidth = canvas.width;  // Resolución interna del canvas (1200)
        const canvasHeight = canvas.height;  // Resolución interna del canvas (900)

        // Verificar si el touch está dentro del área del canvas
        if (touches[0].clientX >= canvasRect.left && touches[0].clientX <= canvasRect.right &&
            touches[0].clientY >= canvasRect.top && touches[0].clientY <= canvasRect.bottom) {
            
            // Calcular coordenadas relativas al canvas
            const relativeX = touches[0].clientX - canvasRect.left;
            const relativeY = touches[0].clientY - canvasRect.top;
            
            // Convertir a coordenadas del canvas interno usando el factor de escala
            const scaleX = canvasWidth / canvasRect.width;
            const scaleY = canvasHeight / canvasRect.height;
            
            store.mouse.x = relativeX * scaleX;
            store.mouse.y = relativeY * scaleY;

            // Debug adicional para verificar coordenadas del dispositivo
            console.log(`Device info: touch.clientX=${touches[0].clientX}, touch.clientY=${touches[0].clientY}`);
            console.log(`Canvas rect: left=${canvasRect.left}, top=${canvasRect.top}, width=${canvasRect.width}, height=${canvasRect.height}`);
            console.log(`Viewport: ${viewportWidth}x${viewportHeight}`);
            console.log(`Canvas internal: ${canvasWidth}x${canvasHeight}`);
            console.log(`Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);
            console.log(`Touch Y calc: touch.clientY=${touches[0].clientY}, canvasTop=${canvasRect.top}, scaledY=${store.mouse.y.toFixed(2)}`);

            // Verificar si hay algún offset del sistema del navegador
            const visualViewport = window.visualViewport;
            if (visualViewport) {
                console.log(`Visual viewport: offsetLeft=${visualViewport.offsetLeft}, offsetTop=${visualViewport.offsetTop}`);
                console.log(`Visual viewport size: ${visualViewport.width}x${visualViewport.height}`);
            }
        } else {
            // Si el evento está fuera del área del canvas, no procesar
            return;
        }

        // Asegurar que las coordenadas estén dentro de los límites del canvas
        store.mouse.x = Math.max(0, Math.min(store.mouse.x, canvasWidth));
        store.mouse.y = Math.max(0, Math.min(store.mouse.y, canvas.height));

        // Calcular coordenadas del mundo considerando la cámara
        // Las coordenadas del mouse están en relación al contenido visible del canvas
        // pero necesitamos convertirlas a coordenadas del mundo absoluto considerando el scroll
        // Como el contenido se mueve mediante ctx.translate(-cameraX, -cameraY), necesitamos
        // sumar cameraX y cameraY para obtener las coordenadas correctas del mundo
        const worldX = store.mouse.x + store.cameraX;
        const worldY = store.mouse.y + store.cameraY;
        store.mouse.gridX = Math.floor(worldX / TILE_SIZE);
        store.mouse.gridY = Math.floor(worldY / TILE_SIZE);

        // Debug adicional para verificar el cálculo de grid
        console.log(`Touchstart world calc: mouse.x=${store.mouse.x}, mouse.y=${store.mouse.y}, cameraX=${store.cameraX}, cameraY=${store.cameraY}, worldX=${worldX}, worldY=${worldY}, gridX=${store.mouse.gridX}, gridY=${store.mouse.gridY}`);

        // Debug: Log de coordenadas para identificar el problema
        console.log(`Touch: (${store.mouse.x.toFixed(2)}, ${store.mouse.y.toFixed(2)}) -> Grid: (${store.mouse.gridX}, ${store.mouse.gridY}) | Event: (${touches[0].clientX}, ${touches[0].clientY})`);

        store.mouse.isDown = true;
        applyMousePaint(store);
    }, { passive: false });

    canvas.addEventListener('touchend', event => {
        if (store.appState !== 'editing') {
            return;
        }
        store.mouse.isDown = false;

        // Limpiar variables de detección de gestos con dos dedos
        setTimeout(() => {
            isTwoFingerGesture = false;
            touchStartY1 = 0;
            touchStartY2 = 0;
            touchStartTime = 0;
            lastTwoFingerY = 0;
        }, 100);
    });

    // Soporte para teclas WASD y flechas para scroll en el editor
    const editorKeys: Record<string, boolean> = {};
    
    window.addEventListener('keydown', (event) => {
        if (store.appState !== 'editing') return;
        
        // Marcar tecla como presionada
        editorKeys[event.key] = true;
    });
    
    window.addEventListener('keyup', (event) => {
        if (store.appState !== 'editing') return;
        
        // Marcar tecla como no presionada
        editorKeys[event.key] = false;
    });
    
    // Función para expandir el nivel horizontalmente si es necesario
    const ensureLevelWidth = (level: string[][], minCols: number) => {
        if (level.length === 0) return;
        
        const currentWidth = level[0]?.length ?? 0;
        if (currentWidth < minCols) {
            // Agregar columnas a todas las filas
            for (let row of level) {
                while (row.length < minCols) {
                    row.push('0');
                }
            }
        }
    };
    
    // Función para actualizar el scroll del editor basado en teclas presionadas
    const updateEditorScroll = () => {
        if (store.appState !== 'editing') return;
        
        const scrollSpeed = 10; // Píxeles por frame
        
        // Scroll horizontal (A/D o flechas izquierda/derecha)
        if (editorKeys['a'] || editorKeys['A'] || editorKeys['ArrowLeft']) {
            const prevCameraX = store.cameraX;
            store.cameraX = Math.max(0, store.cameraX - scrollSpeed);
            
            // Expandir horizontalmente a la izquierda si es necesario
            if (store.cameraX < TILE_SIZE * 2 && store.editorLevel.length > 0) {
                const colsToAdd = 5; // Agregar 5 columnas a la izquierda
                
                // Agregar columnas al inicio de cada fila
                for (let row of store.editorLevel) {
                    for (let i = 0; i < colsToAdd; i++) {
                        row.unshift('0');
                    }
                }
                
                // Ajustar la posición de la cámara para compensar las nuevas columnas
                store.cameraX += colsToAdd * TILE_SIZE;
            }
        }
        if (editorKeys['d'] || editorKeys['D'] || editorKeys['ArrowRight']) {
            if (store.editorLevel.length > 0 && store.editorLevel[0]) {
                const levelWidth = store.editorLevel[0].length * TILE_SIZE;
                const maxCameraX = Math.max(0, levelWidth - canvas.width);
                
                // Si estamos cerca del borde derecho, expandir el nivel
                if (store.cameraX + canvas.width > levelWidth - TILE_SIZE * 2) {
                    const minCols = Math.ceil((store.cameraX + canvas.width + TILE_SIZE * 5) / TILE_SIZE);
                    ensureLevelWidth(store.editorLevel, minCols);
                }
                
                store.cameraX = Math.min(maxCameraX, store.cameraX + scrollSpeed);
            }
        }
        
        // Scroll vertical (W/S o flechas arriba/abajo)
        if (editorKeys['w'] || editorKeys['W'] || editorKeys['ArrowUp']) {
            const prevCameraY = store.cameraY;
            store.cameraY = Math.max(0, store.cameraY - scrollSpeed);
            
            // Expandir verticalmente hacia arriba si es necesario
            if (store.cameraY < TILE_SIZE * 2 && store.editorLevel.length > 0) {
                const rowsToAdd = 5; // Agregar 5 filas arriba
                const rowWidth = store.editorLevel[0]?.length ?? 0;
                
                // Agregar filas al inicio
                for (let i = 0; i < rowsToAdd; i++) {
                    store.editorLevel.unshift(Array(rowWidth).fill('0'));
                }
                
                // Ajustar la posición de la cámara para compensar las nuevas filas
                store.cameraY += rowsToAdd * TILE_SIZE;
            }
        }
        if (editorKeys['s'] || editorKeys['S'] || editorKeys['ArrowDown']) {
            if (store.editorLevel.length > 0) {
                const levelHeight = store.editorLevel.length * TILE_SIZE;
                const maxCameraY = Math.max(0, levelHeight - canvas.height);
                
                // Expandir verticalmente hacia abajo si es necesario
                if (store.cameraY + canvas.height > levelHeight - TILE_SIZE * 2) {
                    const minRows = Math.ceil((store.cameraY + canvas.height + TILE_SIZE * 5) / TILE_SIZE);
                    ensureLevelHeight(store.editorLevel, minRows);
                }
                
                store.cameraY = Math.min(maxCameraY, store.cameraY + scrollSpeed);
            }
        }
    };
    
    // Llamar a updateEditorScroll en cada frame
    setInterval(updateEditorScroll, 16); // ~60 FPS
};

export const updateEditorLevelFromSelector = (store: GameStore) => {
    const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
    store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[index] ?? []));
};

const MINER_TOTAL_FRAMES = 6;

const resolveAnimation = (tile: string, spriteKey?: string) => {
    let anim = ANIMATION_DATA[tile as keyof typeof ANIMATION_DATA] ?? (spriteKey ? ANIMATION_DATA[spriteKey as keyof typeof ANIMATION_DATA] : undefined);
    let effectiveFrames = anim?.frames ?? 0;
    let totalFrames = anim?.frames ?? 0;

    if (tile === '9') {
        anim = ANIMATION_DATA['9_idle'];
        effectiveFrames = Math.min(anim.frames, 2);
        totalFrames = MINER_TOTAL_FRAMES;
    }

    return { anim, effectiveFrames, totalFrames };
};

export const drawEditor = (store: GameStore) => {
    const ctx = store.dom.ctx;
    const canvas = store.dom.canvas;
    if (!ctx || !canvas) {
        return;
    }

    // Dibujar fondo con background tiles
    const backgroundSprite = store.sprites.background;
    if (backgroundSprite) {
        const startY = Math.floor(store.cameraY / TILE_SIZE) * TILE_SIZE;
        const endY = store.cameraY + canvas.height;
        const startX = Math.floor(store.cameraX / TILE_SIZE) * TILE_SIZE;
        const endX = store.cameraX + canvas.width;
        const numTilesX = Math.ceil((endX - startX) / TILE_SIZE) + 1;
        const numTilesY = Math.ceil((endY - startY) / TILE_SIZE) + 1;
        
        ctx.save();
        ctx.translate(-store.cameraX, -store.cameraY);
        
        for (let y = 0; y < numTilesY; y++) {
            for (let x = 0; x < numTilesX; x++) {
                const tileX = startX + x * TILE_SIZE;
                const tileY = startY + y * TILE_SIZE;
                ctx.drawImage(backgroundSprite, tileX, tileY, TILE_SIZE, TILE_SIZE);
            }
        }
        
        ctx.restore();
    } else {
        // Fallback: fondo gris oscuro
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.save();
    ctx.translate(-store.cameraX, -store.cameraY);

    const timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const msPerTick = 1000 / 60;

    // Calcular ventana visible en tiles
    const startCol = Math.max(0, Math.floor(store.cameraX / TILE_SIZE));
    const endCol = Math.min((store.editorLevel[0]?.length ?? 0) - 1, Math.ceil((store.cameraX + canvas.width) / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(store.cameraY / TILE_SIZE));
    const endRow = Math.min(store.editorLevel.length - 1, Math.ceil((store.cameraY + canvas.height) / TILE_SIZE));

    // Primera pasada: dibujar tiles normales y tiles especiales de 1x1 solo en viewport
    for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
        const row = store.editorLevel[rowIndex] ?? [];
        for (let colIndex = startCol; colIndex <= endCol; colIndex++) {
            const tile = row[colIndex];
            // Casos especiales que se manejan en segunda pasada
            if (tile === 'P' || tile === '9') {
                // Estos tiles ocupan múltiples espacios, se dibujan después
                continue;
            }
            
            if (tile === 'L') {
                // Dibujar luz con sprite luz.png
                const lightSprite = store.sprites.L;
                if (lightSprite) {
                    const frameWidth = lightSprite.width / 2; // 2 frames (encendida/apagada)
                    ctx.drawImage(
                        lightSprite,
                        0, // Frame 0 (encendida)
                        0,
                        frameWidth,
                        lightSprite.height,
                        colIndex * TILE_SIZE,
                        rowIndex * TILE_SIZE,
                        TILE_SIZE,
                        TILE_SIZE
                    );
                } else {
                    // Fallback: círculo amarillo
                    const centerX = colIndex * TILE_SIZE + TILE_SIZE / 2;
                    const centerY = rowIndex * TILE_SIZE + TILE_SIZE / 2;
                    const radius = TILE_SIZE / 3;
                    ctx.fillStyle = '#ffff00';
                    ctx.beginPath();
                    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (tile === '0') {
                // Dibujar espacio vacío con background_small.png
                const backgroundSprite = store.sprites.background;
                if (backgroundSprite) {
                    ctx.drawImage(
                        backgroundSprite,
                        0,
                        0,
                        backgroundSprite.width,
                        backgroundSprite.height,
                        colIndex * TILE_SIZE,
                        rowIndex * TILE_SIZE,
                        TILE_SIZE,
                        TILE_SIZE
                    );
                }
                // Si no hay sprite de fondo, no dibujar nada (mantener transparente)
            } else {
                // Tiles normales
                const spriteKey = TILE_TYPES[tile]?.sprite;
                const sprite = spriteKey ? store.sprites[spriteKey] : undefined;
                if (sprite) {
                    const { anim, effectiveFrames, totalFrames } = resolveAnimation(tile, spriteKey);
                    if (anim && effectiveFrames > 0 && totalFrames > 0) {
                        const frameDuration = Math.max(1, anim.speed) * msPerTick;
                        const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
                        const frameWidth = sprite.width / totalFrames;
                        ctx.drawImage(
                            sprite,
                            frameIndex * frameWidth,
                            0,
                            frameWidth,
                            sprite.height,
                            colIndex * TILE_SIZE,
                            rowIndex * TILE_SIZE,
                            TILE_SIZE,
                            TILE_SIZE,
                        );
                    } else {
                        ctx.drawImage(sprite, colIndex * TILE_SIZE, rowIndex * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    }
                }
            }
        }
    }

    // Segunda pasada: dibujar tiles que ocupan múltiples espacios (Player y Miner) solo en viewport extendido ligeramente
    const paddedStartCol = Math.max(0, startCol - 2);
    const paddedEndCol = Math.min((store.editorLevel[0]?.length ?? 0) - 1, endCol + 2);
    const paddedStartRow = Math.max(0, startRow - 2);
    const paddedEndRow = Math.min(store.editorLevel.length - 1, endRow + 2);

    for (let rowIndex = paddedStartRow; rowIndex <= paddedEndRow; rowIndex++) {
        const row = store.editorLevel[rowIndex] ?? [];
        for (let colIndex = paddedStartCol; colIndex <= paddedEndCol; colIndex++) {
            const tile = row[colIndex];
            if (tile === 'P') {
                // Dibujar jugador con sprite hero-die.png - ocupando 2 tiles de altura
                const playerSprite = store.sprites.P_die;
                if (playerSprite) {
                    // Asegurar que el sprite ocupe exactamente 2 tiles de altura
                    ctx.drawImage(
                        playerSprite,
                        0,
                        0,
                        playerSprite.width,
                        playerSprite.height,
                        colIndex * TILE_SIZE,
                        rowIndex * TILE_SIZE - TILE_SIZE, // Empezar un tile arriba para ocupar 2 tiles
                        TILE_SIZE,
                        TILE_SIZE * 2
                    );
                } else {
                    // Fallback: rectángulo rojo ocupando 2 tiles
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                    ctx.fillRect(colIndex * TILE_SIZE, rowIndex * TILE_SIZE - TILE_SIZE, TILE_SIZE, TILE_SIZE * 2);
                }
            } else if (tile === '9') {
                // Dibujar miner con sprite miner_small.png - ocupando 2 tiles de ancho (120px) pero mostrando imagen a 78px
                const minerSprite = store.sprites['9'];
                if (minerSprite) {
                    // Determinar orientación: el miner mira hacia la pared (está orientado con la pared a su derecha por defecto)
                    const leftTile = row[colIndex - 1];
                    const rightTile = row[colIndex + 1];
                    let shouldFlip = false;
                    
                    // Si hay pared a la izquierda, reflejar el miner para que mire hacia ella
                    if (leftTile && leftTile !== '0' && leftTile !== undefined) {
                        shouldFlip = true;
                    } else if (rightTile && rightTile !== '0' && rightTile !== undefined) {
                        shouldFlip = false;
                    }
                    
                    const { anim, effectiveFrames, totalFrames } = resolveAnimation(tile, '9');
                    if (anim && effectiveFrames > 0 && totalFrames > 0) {
                        const frameDuration = Math.max(1, anim.speed) * msPerTick;
                        const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
                        const frameWidth = minerSprite.width / totalFrames; // 468 / 6 = 78px
                        const naturalWidth = 78; // Ancho natural de cada frame del miner
                        const naturalHeight = minerSprite.height;
                        // Centrar el sprite de 78px dentro del espacio de 120px (2 tiles)
                        const offsetX = (TILE_SIZE * 2 - naturalWidth) / 2;
                        
                        ctx.save();
                        if (shouldFlip) {
                            // Reflejar horizontalmente
                            ctx.translate(colIndex * TILE_SIZE + TILE_SIZE * 2, rowIndex * TILE_SIZE);
                            ctx.scale(-1, 1);
                            ctx.drawImage(
                                minerSprite,
                                frameIndex * frameWidth,
                                0,
                                frameWidth,
                                minerSprite.height,
                                offsetX,
                                0,
                                naturalWidth,
                                naturalHeight
                            );
                        } else {
                            ctx.drawImage(
                                minerSprite,
                                frameIndex * frameWidth,
                                0,
                                frameWidth,
                                minerSprite.height,
                                colIndex * TILE_SIZE + offsetX,
                                rowIndex * TILE_SIZE,
                                naturalWidth,
                                naturalHeight
                            );
                        }
                        ctx.restore();
                    } else {
                        const naturalWidth = 78;
                        const naturalHeight = minerSprite.height;
                        const offsetX = (TILE_SIZE * 2 - naturalWidth) / 2;
                        
                        ctx.save();
                        if (shouldFlip) {
                            ctx.translate(colIndex * TILE_SIZE + TILE_SIZE * 2, rowIndex * TILE_SIZE);
                            ctx.scale(-1, 1);
                            ctx.drawImage(
                                minerSprite,
                                0,
                                0,
                                78,
                                minerSprite.height,
                                offsetX,
                                0,
                                naturalWidth,
                                naturalHeight
                            );
                        } else {
                            ctx.drawImage(
                                minerSprite,
                                0,
                                0,
                                78,
                                minerSprite.height,
                                colIndex * TILE_SIZE + offsetX,
                                rowIndex * TILE_SIZE,
                                naturalWidth,
                                naturalHeight
                            );
                        }
                        ctx.restore();
                    }
                } else {
                    // Fallback: rectángulo azul ocupando 2 tiles de ancho
                    ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
                    ctx.fillRect(colIndex * TILE_SIZE, rowIndex * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE);
                }
            }
        }
    }

    // Grid fina (cada tile) solo en viewport
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    const levelWidth = store.editorLevel[0]?.length ?? 0;
    const levelHeight = store.editorLevel.length;
    const gridStartX = startCol * TILE_SIZE;
    const gridEndX = Math.min(levelWidth * TILE_SIZE, (endCol + 1) * TILE_SIZE);
    const gridStartY = startRow * TILE_SIZE;
    const gridEndY = Math.min(levelHeight * TILE_SIZE, (endRow + 1) * TILE_SIZE);

    for (let x = gridStartX; x <= gridEndX; x += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, gridStartY);
        ctx.lineTo(x, gridEndY);
        ctx.stroke();
    }
    for (let y = gridStartY; y <= gridEndY; y += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(gridStartX, y);
        ctx.lineTo(gridEndX, y);
        ctx.stroke();
    }

    // Grid gruesa (cada 20x18 tiles = tamaño de viewport 1200x1080)
    // Origen definido por la posición del jugador: 2 tiles a la izquierda y 3 arriba
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    const majorCols = 20;
    const majorRows = 18;

    // Encontrar posición del jugador en editorLevel
    let playerCol = 0;
    let playerRow = 0;
    outer: for (let r = 0; r < levelHeight; r++) {
        const c = store.editorLevel[r]?.indexOf('P') ?? -1;
        if (c !== -1) {
            playerRow = r;
            playerCol = c;
            break outer;
        }
    }

    const originTileX = Math.max(0, playerCol - 2);
    const originTileY = Math.max(0, playerRow - 3);

    // Calcular primera línea mayor visible hacia la izquierda y arriba, restringida al viewport
    const viewportStartTilesX = startCol;
    const viewportEndTilesX = endCol + 1;
    const firstKx = Math.ceil((viewportStartTilesX - originTileX) / majorCols);
    let tileX = originTileX + firstKx * majorCols;
    while (tileX <= viewportEndTilesX) {
        const gx = tileX * TILE_SIZE;
        ctx.beginPath();
        ctx.moveTo(gx, gridStartY);
        ctx.lineTo(gx, gridEndY);
        ctx.stroke();
        tileX += majorCols;
    }

    const viewportStartTilesY = startRow;
    const viewportEndTilesY = endRow + 1;
    const firstKy = Math.ceil((viewportStartTilesY - originTileY) / majorRows);
    let tileY = originTileY + firstKy * majorRows;
    while (tileY <= viewportEndTilesY) {
        const gy = tileY * TILE_SIZE;
        ctx.beginPath();
        ctx.moveTo(gridStartX, gy);
        ctx.lineTo(gridEndX, gy);
        ctx.stroke();
        tileY += majorRows;
    }

    // Preview del tile seleccionado con 50% de opacidad
    const selectedSpriteKey = store.selectedTile === 'P' ? null : TILE_TYPES[store.selectedTile]?.sprite;
    
    if (store.selectedTile === '0') {
        // Para tile vacío (borrar), mostrar una X roja semitransparente
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        const centerX = store.mouse.gridX * TILE_SIZE + TILE_SIZE / 2;
        const centerY = store.mouse.gridY * TILE_SIZE + TILE_SIZE / 2;
        const crossSize = TILE_SIZE / 3;
        
        ctx.beginPath();
        ctx.moveTo(centerX - crossSize, centerY - crossSize);
        ctx.lineTo(centerX + crossSize, centerY + crossSize);
        ctx.moveTo(centerX + crossSize, centerY - crossSize);
        ctx.lineTo(centerX - crossSize, centerY + crossSize);
        ctx.stroke();
        ctx.globalAlpha = 1;
    } else if (selectedSpriteKey) {
        const sprite = store.sprites[selectedSpriteKey];
        if (sprite) {
            ctx.globalAlpha = 0.5;
            const { anim, effectiveFrames, totalFrames } = resolveAnimation(store.selectedTile, selectedSpriteKey);
            if (anim && effectiveFrames > 0 && totalFrames > 0) {
                const frameDuration = Math.max(1, anim.speed) * msPerTick;
                const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
                const frameWidth = sprite.width / totalFrames;
                ctx.drawImage(
                    sprite,
                    frameIndex * frameWidth,
                    0,
                    frameWidth,
                    sprite.height,
                    store.mouse.gridX * TILE_SIZE,
                    store.mouse.gridY * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE,
                );
            } else {
                ctx.drawImage(sprite, store.mouse.gridX * TILE_SIZE, store.mouse.gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
            ctx.globalAlpha = 1;
        }
    } else if (store.selectedTile === 'P') {
        // Preview del jugador con sprite hero-die.png - ocupando 2 tiles de altura
        const playerSprite = store.sprites.P_die;
        if (playerSprite) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(
                playerSprite,
                0,
                0,
                playerSprite.width,
                playerSprite.height,
                store.mouse.gridX * TILE_SIZE,
                store.mouse.gridY * TILE_SIZE - TILE_SIZE, // Empezar un tile arriba para ocupar 2 tiles
                TILE_SIZE,
                TILE_SIZE * 2
            );
            ctx.globalAlpha = 1;
        } else {
            // Fallback: rectángulo rojo ocupando 2 tiles
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(store.mouse.gridX * TILE_SIZE, store.mouse.gridY * TILE_SIZE - TILE_SIZE, TILE_SIZE, TILE_SIZE * 2);
            ctx.globalAlpha = 1;
        }
    } else if (store.selectedTile === '9') {
        // Preview del miner con sprite miner_small.png - ocupando 2 tiles (120px) pero mostrando a 78px
        const minerSprite = store.sprites['9'];
        if (minerSprite) {
            ctx.globalAlpha = 0.5;
            const { anim, effectiveFrames, totalFrames } = resolveAnimation(store.selectedTile, '9');
            if (anim && effectiveFrames > 0 && totalFrames > 0) {
                const frameDuration = Math.max(1, anim.speed) * msPerTick;
                const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
                const frameWidth = minerSprite.width / totalFrames; // 468 / 6 = 78px
                const naturalWidth = 78;
                const naturalHeight = minerSprite.height;
                const offsetX = (TILE_SIZE * 2 - naturalWidth) / 2;
                ctx.drawImage(
                    minerSprite,
                    frameIndex * frameWidth,
                    0,
                    frameWidth,
                    minerSprite.height,
                    store.mouse.gridX * TILE_SIZE + offsetX,
                    store.mouse.gridY * TILE_SIZE,
                    naturalWidth,
                    naturalHeight
                );
            } else {
                const naturalWidth = 78;
                const naturalHeight = minerSprite.height;
                const offsetX = (TILE_SIZE * 2 - naturalWidth) / 2;
                ctx.drawImage(
                    minerSprite,
                    0,
                    0,
                    78,
                    minerSprite.height,
                    store.mouse.gridX * TILE_SIZE + offsetX,
                    store.mouse.gridY * TILE_SIZE,
                    naturalWidth,
                    naturalHeight
                );
            }
            ctx.globalAlpha = 1;
        } else {
            // Fallback: rectángulo azul ocupando 2 tiles de ancho
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
            ctx.fillRect(store.mouse.gridX * TILE_SIZE, store.mouse.gridY * TILE_SIZE, TILE_SIZE * 2, TILE_SIZE);
            ctx.globalAlpha = 1;
        }
    } else if (store.selectedTile === 'L') {
        // Preview de luz con sprite
        const lightSprite = store.sprites.L;
        if (lightSprite) {
            ctx.globalAlpha = 0.5;
            const frameWidth = lightSprite.width / 2; // 2 frames
            ctx.drawImage(
                lightSprite,
                0, // Frame 0 (encendida)
                0,
                frameWidth,
                lightSprite.height,
                store.mouse.gridX * TILE_SIZE,
                store.mouse.gridY * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE
            );
            ctx.globalAlpha = 1;
        } else {
            // Fallback: círculo amarillo
            ctx.globalAlpha = 0.5;
            const centerX = store.mouse.gridX * TILE_SIZE + TILE_SIZE / 2;
            const centerY = store.mouse.gridY * TILE_SIZE + TILE_SIZE / 2;
            const radius = TILE_SIZE / 3;
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // Preview del área de drag-to-draw si estamos arrastrando
    if (store.mouse.isDown && store.mouse.isDragging && 
        store.mouse.startX !== undefined && store.mouse.startY !== undefined) {
        
        const startX = Math.min(store.mouse.startX, store.mouse.gridX);
        const endX = Math.max(store.mouse.startX, store.mouse.gridX);
        const startY = Math.min(store.mouse.startY, store.mouse.gridY);
        const endY = Math.max(store.mouse.startY, store.mouse.gridY);
        
        // Dibujar rectángulo de selección
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            startX * TILE_SIZE,
            startY * TILE_SIZE,
            (endX - startX + 1) * TILE_SIZE,
            (endY - startY + 1) * TILE_SIZE
        );
        
        // Si no es tile vacío, mostrar preview de todos los tiles del área
        if (store.selectedTile !== '0') {
            const selectedSpriteKey = store.selectedTile === 'P' ? null : TILE_TYPES[store.selectedTile]?.sprite;
            if (selectedSpriteKey) {
                const sprite = store.sprites[selectedSpriteKey];
                if (sprite) {
                    ctx.globalAlpha = 0.3;
                    for (let y = startY; y <= endY; y++) {
                        for (let x = startX; x <= endX; x++) {
                            // Manejar casos especiales para el preview del área
                            if (store.selectedTile === 'P') {
                                // Preview del jugador en área - ocupando 2 tiles de altura
                                const playerSprite = store.sprites.P_die;
                                if (playerSprite) {
                                    ctx.drawImage(
                                        playerSprite,
                                        0,
                                        0,
                                        playerSprite.width,
                                        playerSprite.height,
                                        x * TILE_SIZE,
                                        y * TILE_SIZE - TILE_SIZE, // Empezar un tile arriba para ocupar 2 tiles
                                        TILE_SIZE,
                                        TILE_SIZE * 2
                                    );
                                }
                            } else if (store.selectedTile === '9') {
                                // Preview del miner en área - ocupando 2 tiles (120px) pero mostrando a 78px
                                const minerSprite = store.sprites['9'];
                                if (minerSprite) {
                                    const { anim, effectiveFrames, totalFrames } = resolveAnimation(store.selectedTile, '9');
                                    if (anim && effectiveFrames > 0 && totalFrames > 0) {
                                        const frameDuration = Math.max(1, anim.speed) * msPerTick;
                                        const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
                                        const frameWidth = minerSprite.width / totalFrames; // 468 / 6 = 78px
                                        const naturalWidth = 78;
                                        const naturalHeight = minerSprite.height;
                                        const offsetX = (TILE_SIZE * 2 - naturalWidth) / 2;
                                        ctx.drawImage(
                                            minerSprite,
                                            frameIndex * frameWidth,
                                            0,
                                            frameWidth,
                                            minerSprite.height,
                                            x * TILE_SIZE + offsetX,
                                            y * TILE_SIZE,
                                            naturalWidth,
                                            naturalHeight
                                        );
                                    } else {
                                        const naturalWidth = 78;
                                        const naturalHeight = minerSprite.height;
                                        const offsetX = (TILE_SIZE * 2 - naturalWidth) / 2;
                                        ctx.drawImage(
                                            minerSprite,
                                            0,
                                            0,
                                            78,
                                            minerSprite.height,
                                            x * TILE_SIZE + offsetX,
                                            y * TILE_SIZE,
                                            naturalWidth,
                                            naturalHeight
                                        );
                                    }
                                }
                            } else {
                                // Preview normal de otros tiles
                                const { anim, effectiveFrames, totalFrames } = resolveAnimation(store.selectedTile, selectedSpriteKey);
                                if (anim && effectiveFrames > 0 && totalFrames > 0) {
                                    const frameDuration = Math.max(1, anim.speed) * msPerTick;
                                    const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
                                    const frameWidth = sprite.width / totalFrames;
                                    ctx.drawImage(
                                        sprite,
                                        frameIndex * frameWidth,
                                        0,
                                        frameWidth,
                                        sprite.height,
                                        x * TILE_SIZE,
                                        y * TILE_SIZE,
                                        TILE_SIZE,
                                        TILE_SIZE,
                                    );
                                } else {
                                    ctx.drawImage(sprite, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                                }
                            }
                        }
                    }
                }
            }
        } else if (store.selectedTile === '0') {
            // Para borrar, mostrar X rojas en toda el área
            ctx.globalAlpha = 0.3;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            for (let y = startY; y <= endY; y++) {
                for (let x = startX; x <= endX; x++) {
                    const centerX = x * TILE_SIZE + TILE_SIZE / 2;
                    const centerY = y * TILE_SIZE + TILE_SIZE / 2;
                    const crossSize = TILE_SIZE / 4;
                    
                    ctx.beginPath();
                    ctx.moveTo(centerX - crossSize, centerY - crossSize);
                    ctx.lineTo(centerX + crossSize, centerY + crossSize);
                    ctx.moveTo(centerX + crossSize, centerY - crossSize);
                    ctx.lineTo(centerX - crossSize, centerY + crossSize);
                    ctx.stroke();
                }
            }
        }
        ctx.globalAlpha = 1;
    }

    ctx.restore();
};

