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
import { isLegacyPasswordOverrideActive, isLegacySuperUser, requestLegacyUnlock } from '../utils/legacyAccess';

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
    
    // Solo inicializar levelDataStore si está vacío o tiene menos niveles que initialLevels
    if (store.levelDataStore.length < store.initialLevels.length) {
        store.levelDataStore = Array.from({ length: store.initialLevels.length }, (_, index) => {
            const level = store.initialLevels[index] ?? store.initialLevels[0];
            return level ? level.map(row => row.split('')) : [];
        });
    }
    
    store.selectedTile = '1';
    store.mouse = { x: 0, y: 0, gridX: 0, gridY: 0, isDown: false };
    
    // Inicializar el editor avanzado
    initializeAdvancedEditor(store);
};

const applyMousePaint = (store: GameStore) => {
    // Verificar si es Legacy (solo lectura)
    // Usar require para acceso síncrono ya que esta función se llama frecuentemente
    const { getCurrentCampaign } = require('../utils/campaigns');
    const currentCampaign = getCurrentCampaign(store);
    const isLegacyCampaign = currentCampaign?.isDefault === true;
    
    // Legacy requiere permisos especiales
    if (isLegacyCampaign && !isLegacySuperUser() && !isLegacyPasswordOverrideActive()) {
        requestLegacyUnlock(store).catch(() => {});
        return;
    }
    
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
        const canvasWidth = canvas.width;  // Resolución interna del canvas (1600)
        const canvasHeight = canvas.height;  // Resolución interna del canvas (1000)

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
        // Usar tamaño escalado para calcular la posición del grid
        const zoomScale = store.dom.zoomScale ?? 1.0;
        const scaledTileSize = TILE_SIZE * zoomScale;
        store.mouse.gridX = Math.floor(worldX / scaledTileSize);
        store.mouse.gridY = Math.floor(worldY / scaledTileSize);

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
            // Si estamos en modo de duplicación de fila
            if (store.duplicateRowMode) {
                duplicateRowAtPosition(store, store.mouse.gridY);
                return;
            }
            
            // Si estamos en modo de borrado de fila
            if (store.deleteRowMode) {
                deleteRowAtPosition(store, store.mouse.gridY);
                return;
            }
            
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
        
        // Zoom con Ctrl + rueda del mouse (cambia tamaño de tiles, no del canvas)
        if (event.ctrlKey || event.metaKey) {
            // Inicializar zoomScale si no existe
            if (!store.dom.zoomScale) {
                store.dom.zoomScale = 1;
            }
            
            // Calcular factor de zoom (hacia arriba = zoom in, hacia abajo = zoom out)
            // Usar una función exponencial para un zoom más natural
            const zoomFactor = Math.pow(1.1, -event.deltaY / 100); // Zoom suave y exponencial
            const newZoom = store.dom.zoomScale * zoomFactor;
            
            // Limitar zoom entre 0.25x y 2x (para permitir ver más área del mapa)
            const minZoom = 0.25;
            const maxZoom = 2.0;
            store.dom.zoomScale = Math.max(minZoom, Math.min(maxZoom, newZoom));
            
            // No escalar el canvas wrapper, solo actualizar zoomScale
            // El zoom se aplicará en drawEditor al renderizar los tiles
            
            return; // No hacer scroll cuando se hace zoom
        }
        
        // Scroll horizontal con Shift + rueda del mouse o deltaX
        if (event.shiftKey || event.deltaX !== 0) {
            const deltaX = event.shiftKey ? event.deltaY : event.deltaX;
            const prevCameraX = store.cameraX;
            store.cameraX += deltaX;
            
            if (store.editorLevel.length > 0 && store.editorLevel[0]) {
                const zoomScale = store.dom.zoomScale ?? 1.0;
                const scaledTileSize = TILE_SIZE * zoomScale;
                
                // Expandir horizontalmente a la izquierda si es necesario
                if (store.cameraX < scaledTileSize * 2) {
                    const colsToAdd = 5; // Agregar 5 columnas a la izquierda
                    
                    // Agregar columnas al inicio de cada fila
                    for (let row of store.editorLevel) {
                        for (let i = 0; i < colsToAdd; i++) {
                            row.unshift('0');
                        }
                    }
                    
                    // Ajustar la posición de la cámara para compensar las nuevas columnas
                    store.cameraX += colsToAdd * scaledTileSize;
                }
                
                const levelWidth = store.editorLevel[0].length * scaledTileSize;
                
                // Expandir horizontalmente a la derecha si es necesario
                if (store.cameraX + canvas.width > levelWidth - scaledTileSize) {
                    const minCols = Math.ceil((store.cameraX + canvas.width + scaledTileSize * 5) / scaledTileSize);
                    
                    // Agregar columnas al final de todas las filas
                    for (let row of store.editorLevel) {
                        while (row.length < minCols) {
                            row.push('0');
                        }
                    }
                }
                
                // Calcular límites de cámara considerando el zoom
                const maxCameraX = Math.max(0, store.editorLevel[0].length * scaledTileSize - canvas.width);
                store.cameraX = Math.max(0, Math.min(store.cameraX, maxCameraX));
            }
        } else {
            // Scroll vertical normal
            const prevCameraY = store.cameraY;
            store.cameraY += event.deltaY;
            if (store.editorLevel.length > 0) {
                const zoomScale = store.dom.zoomScale ?? 1.0;
                const scaledTileSize = TILE_SIZE * zoomScale;
                
                // Expandir verticalmente hacia arriba si es necesario
                if (store.cameraY < scaledTileSize * 2) {
                    const rowsToAdd = 5; // Agregar 5 filas arriba
                    const rowWidth = store.editorLevel[0]?.length ?? 0;
                    
                    // Agregar filas al inicio
                    for (let i = 0; i < rowsToAdd; i++) {
                        store.editorLevel.unshift(Array(rowWidth).fill('0'));
                    }
                    
                    // Ajustar la posición de la cámara para compensar las nuevas filas
                    store.cameraY += rowsToAdd * scaledTileSize;
                }
                
                const levelHeight = store.editorLevel.length * scaledTileSize;
                
                // Expandir verticalmente hacia abajo si es necesario
                if (store.cameraY + (canvas.height ?? 0) > levelHeight - scaledTileSize) {
                    const minRows = Math.ceil((store.cameraY + canvas.height + scaledTileSize * 5) / scaledTileSize);
                    ensureLevelHeight(store.editorLevel, minRows);
                }
                
                // Calcular límites de cámara considerando el zoom
                const maxCameraY = Math.max(0, store.editorLevel.length * scaledTileSize - (canvas.height ?? 0));
                store.cameraY = Math.max(0, Math.min(store.cameraY, maxCameraY));
            }
        }
    }, { passive: false });

    // Soporte para touch events en móvil
    canvas.addEventListener('touchmove', event => {
        if (store.appState !== 'editing') {
            return;
        }

        const touches = event.touches;

        // Si hay dos dedos y estamos en un gesto de dos dedos, NO prevenir comportamiento por defecto
        // Esto permite el scroll nativo de dos dedos para generar más espacio
        if (touches.length === 2 && isTwoFingerGesture) {
            // NO hacer preventDefault para permitir scroll nativo del navegador
            // El scroll nativo generará más espacio automáticamente
            const currentY1 = touches[0].clientY;
            const currentY2 = touches[1].clientY;
            const currentTwoFingerY = (currentY1 + currentY2) / 2;

            // Calcular movimiento relativo desde la última posición
            const deltaY = lastTwoFingerY - currentTwoFingerY; // Movimiento positivo hacia arriba = scroll hacia abajo
            const scrollAmount = deltaY * 0.75; // Factor de sensibilidad (reducido a la mitad para hacer el pan 2x más lento)

            // Actualizar posición de la cámara
            if (store.editorLevel.length > 0) {
                const levelHeight = store.editorLevel.length * TILE_SIZE;
                const maxCameraY = Math.max(0, levelHeight - (canvas.height ?? 0));

                // Aplicar scroll suave con límites
                store.cameraY = Math.max(0, Math.min(store.cameraY + scrollAmount, maxCameraY));
            }

            // Actualizar posición para el siguiente cálculo
            lastTwoFingerY = currentTwoFingerY;
            // NO hacer preventDefault - permitir scroll nativo
            return; // No procesar como colocación de tiles
        }
        
        // Solo prevenir el comportamiento por defecto para un dedo (para dibujar)
        event.preventDefault();

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

        const touches = event.touches;

        // Si hay dos dedos tocando, NO prevenir el comportamiento por defecto
        // Esto permite el scroll nativo de dos dedos para generar más espacio
        if (touches.length === 2) {
            touchStartY1 = touches[0].clientY;
            touchStartY2 = touches[1].clientY;
            touchStartTime = Date.now();
            isTwoFingerGesture = true;
            lastTwoFingerY = (touchStartY1 + touchStartY2) / 2;
            // NO hacer preventDefault para permitir scroll nativo
            return; // No procesar como toque normal
        }
        
        // Solo prevenir el comportamiento por defecto para un dedo (para dibujar)
        event.preventDefault();

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
        const canvasWidth = canvas.width;  // Resolución interna del canvas (1600)
        const canvasHeight = canvas.height;  // Resolución interna del canvas (1000)

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
        // Usar tamaño escalado para calcular la posición del grid
        const zoomScale = store.dom.zoomScale ?? 1.0;
        const scaledTileSize = TILE_SIZE * zoomScale;
        store.mouse.gridX = Math.floor(worldX / scaledTileSize);
        store.mouse.gridY = Math.floor(worldY / scaledTileSize);

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

    // Soporte para teclas de flecha para scroll en el editor
    const editorKeys: Record<string, boolean> = {};
    
    window.addEventListener('keydown', (event) => {
        if (store.appState !== 'editing') return;
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
        editorKeys[event.key] = true;
    });
    
    window.addEventListener('keyup', (event) => {
        if (store.appState !== 'editing') return;
        if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
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
        
        const zoomScale = store.dom.zoomScale ?? 1.0;
        const scaledTileSize = TILE_SIZE * zoomScale;
        const scrollSpeed = 5; // Píxeles por frame (reducido a la mitad para hacer el pan 2x más lento)
        
        // Scroll horizontal (A/D o flechas izquierda/derecha)
        if (editorKeys['ArrowLeft']) {
            const prevCameraX = store.cameraX;
            store.cameraX = Math.max(0, store.cameraX - scrollSpeed);
            
            // Expandir horizontalmente a la izquierda si es necesario
            if (store.cameraX < scaledTileSize * 2 && store.editorLevel.length > 0) {
                const colsToAdd = 5; // Agregar 5 columnas a la izquierda
                
                // Agregar columnas al inicio de cada fila
                for (let row of store.editorLevel) {
                    for (let i = 0; i < colsToAdd; i++) {
                        row.unshift('0');
                    }
                }
                
                // Ajustar la posición de la cámara para compensar las nuevas columnas
                store.cameraX += colsToAdd * scaledTileSize;
            }
        }
        if (editorKeys['ArrowRight']) {
            if (store.editorLevel.length > 0 && store.editorLevel[0]) {
                const levelWidth = store.editorLevel[0].length * scaledTileSize;
                const maxCameraX = Math.max(0, levelWidth - canvas.width);
                
                // Si estamos cerca del borde derecho, expandir el nivel
                if (store.cameraX + canvas.width > levelWidth - scaledTileSize * 2) {
                    const minCols = Math.ceil((store.cameraX + canvas.width + scaledTileSize * 5) / scaledTileSize);
                    ensureLevelWidth(store.editorLevel, minCols);
                }
                
                store.cameraX = Math.min(maxCameraX, store.cameraX + scrollSpeed);
            }
        }
        
        // Scroll vertical (W/S o flechas arriba/abajo)
        if (editorKeys['ArrowUp']) {
            const prevCameraY = store.cameraY;
            store.cameraY = Math.max(0, store.cameraY - scrollSpeed);
            
            // Expandir verticalmente hacia arriba si es necesario
            if (store.cameraY < scaledTileSize * 2 && store.editorLevel.length > 0) {
                const rowsToAdd = 5; // Agregar 5 filas arriba
                const rowWidth = store.editorLevel[0]?.length ?? 0;
                
                // Agregar filas al inicio
                for (let i = 0; i < rowsToAdd; i++) {
                    store.editorLevel.unshift(Array(rowWidth).fill('0'));
                }
                
                // Ajustar la posición de la cámara para compensar las nuevas filas
                store.cameraY += rowsToAdd * scaledTileSize;
            }
        }
        if (editorKeys['ArrowDown']) {
            if (store.editorLevel.length > 0) {
                const levelHeight = store.editorLevel.length * scaledTileSize;
                const maxCameraY = Math.max(0, levelHeight - canvas.height);
                
                // Expandir verticalmente hacia abajo si es necesario
                if (store.cameraY + canvas.height > levelHeight - scaledTileSize * 2) {
                    const minRows = Math.ceil((store.cameraY + canvas.height + scaledTileSize * 5) / scaledTileSize);
                    ensureLevelHeight(store.editorLevel, minRows);
                }
                
                store.cameraY = Math.min(maxCameraY, store.cameraY + scrollSpeed);
            }
        }
    };
    
    // Llamar a updateEditorScroll en cada frame
    setInterval(updateEditorScroll, 16); // ~60 FPS
    
    
    // ===== MOVER CANVAS CON BOTONES DIRECCIONALES =====
    const moveCanvasWithArrows = () => {
        const panSpeed = 7.5; // píxeles por frame (reducido a la mitad para hacer el pan 2x más lento)
        
        if (store.keys.ArrowUp) {
            store.cameraY = Math.max(0, store.cameraY - panSpeed);
        }
        if (store.keys.ArrowDown && store.editorLevel.length > 0) {
            const zoomScale = store.dom.zoomScale ?? 1.0;
            const scaledTileSize = TILE_SIZE * zoomScale;
            const levelHeight = store.editorLevel.length * scaledTileSize;
            const maxCameraY = Math.max(0, levelHeight - (canvas?.height ?? 0));
            store.cameraY = Math.min(maxCameraY, store.cameraY + panSpeed);
        }
        if (store.keys.ArrowLeft) {
            store.cameraX = Math.max(0, store.cameraX - panSpeed);
        }
        if (store.keys.ArrowRight && store.editorLevel.length > 0 && store.editorLevel[0]) {
            const zoomScale = store.dom.zoomScale ?? 1.0;
            const scaledTileSize = TILE_SIZE * zoomScale;
            const levelWidth = store.editorLevel[0].length * scaledTileSize;
            const maxCameraX = Math.max(0, levelWidth - (canvas?.width ?? 0));
            store.cameraX = Math.min(maxCameraX, store.cameraX + panSpeed);
        }
    };
    
    // Intervalo para mover canvas con flechas
    setInterval(() => {
        if (store.appState === 'editing') {
            moveCanvasWithArrows();
        }
    }, 16);
};

export const updateEditorLevelFromSelector = (store: GameStore) => {
    const index = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
    
    // Cargar el nivel desde levelDataStore
    // Si el nivel está vacío o no existe, usar una copia del nivel 1 de Legacy
    if (store.levelDataStore[index] && store.levelDataStore[index].length > 0) {
        store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[index]));
    } else {
        // Si el nivel está vacío, usar una copia del nivel 1 de Legacy
        const legacyLevel1 = store.initialLevels[0] || store.levelDataStore[0];
        if (legacyLevel1) {
            if (typeof legacyLevel1[0] === 'string') {
                // Es string[] (filas como strings), convertir a string[][]
                store.editorLevel = (legacyLevel1 as string[]).map(row => row.split(''));
            } else {
                // Ya es string[][]
                store.editorLevel = JSON.parse(JSON.stringify(legacyLevel1));
            }
            // Guardar en levelDataStore para que no se pierda
            store.levelDataStore[index] = JSON.parse(JSON.stringify(store.editorLevel));
            store.initialLevels[index] = store.editorLevel.map(row => row.join(''));
            console.log(`[Editor] ✅ Nivel ${index} estaba vacío, se cargó plantilla del nivel 1 de Legacy`);
        } else {
            console.error(`[Editor] ❌ No se pudo cargar el nivel ${index}. Nivel 1 de Legacy no encontrado.`);
            store.editorLevel = [];
        }
    }
    
    // Centrar la cámara en el jugador si existe
    const canvas = store.dom.canvas;
    if (canvas && store.editorLevel.length > 0) {
        let playerCol = 0;
        let playerRow = 0;
        outerCenter: for (let r = 0; r < store.editorLevel.length; r++) {
            const c = store.editorLevel[r]?.indexOf('P') ?? -1;
            if (c !== -1) {
                playerRow = r;
                playerCol = c;
                break outerCenter;
            }
        }
        const levelCols = store.editorLevel[0]?.length ?? 0;
        const levelRows = store.editorLevel.length;
        const levelWidth = levelCols * TILE_SIZE;
        const levelHeight = levelRows * TILE_SIZE;
        // El canvas internamente tiene 1440px (20 tiles), así que usamos ese tamaño para la cámara
        const canvasInternalWidth = 1440; // 20 tiles * 72px
        const desiredX = playerCol * TILE_SIZE - canvasInternalWidth / 2;
        const desiredY = playerRow * TILE_SIZE - (canvas?.height ?? 0) / 2;
        const maxCamX = Math.max(0, levelWidth - canvasInternalWidth);
        const maxCamY = Math.max(0, levelHeight - canvas.height);
        store.cameraX = Math.max(0, Math.min(desiredX, maxCamX));
        store.cameraY = Math.max(0, Math.min(desiredY, maxCamY));
    } else {
        store.cameraX = 0;
        store.cameraY = 0;
    }
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

    // Obtener factor de zoom (por defecto 1.0)
    const zoomScale = store.dom.zoomScale ?? 1.0;
    const scaledTileSize = TILE_SIZE * zoomScale;

    // Dibujar fondo con background tiles y efecto parallax
    const backgroundSprite = store.sprites.background;
    if (backgroundSprite) {
        // Efecto parallax: el fondo se mueve más lento que la cámara
        const parallaxFactor = 0.5; // 0.5 = mitad de velocidad (más profundidad)
        const parallaxCameraX = store.cameraX * parallaxFactor;
        const parallaxCameraY = store.cameraY * parallaxFactor;
        
        const startY = Math.floor(parallaxCameraY / scaledTileSize) * scaledTileSize;
        const endY = parallaxCameraY + canvas.height;
        const startX = Math.floor(parallaxCameraX / scaledTileSize) * scaledTileSize;
        const endX = parallaxCameraX + canvas.width;
        const numTilesX = Math.ceil((endX - startX) / scaledTileSize) + 1;
        const numTilesY = Math.ceil((endY - startY) / scaledTileSize) + 1;
        
        ctx.save();
        ctx.translate(-parallaxCameraX, -parallaxCameraY);
        
        for (let y = 0; y < numTilesY; y++) {
            for (let x = 0; x < numTilesX; x++) {
                const tileX = startX + x * scaledTileSize;
                const tileY = startY + y * scaledTileSize;
                ctx.drawImage(backgroundSprite, tileX, tileY, scaledTileSize, scaledTileSize);
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

    // Calcular ventana visible en tiles (usando tamaño escalado)
    const startCol = Math.max(0, Math.floor(store.cameraX / scaledTileSize));
    const endCol = Math.min((store.editorLevel[0]?.length ?? 0) - 1, Math.ceil((store.cameraX + canvas.width) / scaledTileSize));
    const startRow = Math.max(0, Math.floor(store.cameraY / scaledTileSize));
    const endRow = Math.min(store.editorLevel.length - 1, Math.ceil((store.cameraY + canvas.height) / scaledTileSize));

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
            
            if (tile === 'A') {
                // Plataforma: usar sprite base.png 60x15 apoyado al fondo del tile
                const baseSprite = store.sprites.base;
                const scaledPlatformWidth = 60 * zoomScale;
                const scaledPlatformHeight = 15 * zoomScale;
                const px = colIndex * scaledTileSize + (scaledTileSize - scaledPlatformWidth) / 2;
                const py = rowIndex * scaledTileSize + scaledTileSize - scaledPlatformHeight;
                
                if (baseSprite) {
                    ctx.drawImage(baseSprite, px, py, scaledPlatformWidth, scaledPlatformHeight);
                } else {
                    // Fallback al rectángulo amarillo si no se ha cargado el sprite
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(px, py, scaledPlatformWidth, scaledPlatformHeight);
                }
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
                        colIndex * scaledTileSize,
                        rowIndex * scaledTileSize,
                        scaledTileSize,
                        scaledTileSize
                    );
                } else {
                    // Fallback: círculo amarillo
                    const centerX = colIndex * scaledTileSize + scaledTileSize / 2;
                    const centerY = rowIndex * scaledTileSize + scaledTileSize / 2;
                    const radius = scaledTileSize / 3;
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
                        colIndex * scaledTileSize,
                        rowIndex * scaledTileSize,
                        scaledTileSize,
                        scaledTileSize
                    );
                }
                // Si no hay sprite de fondo, no dibujar nada (mantener transparente)
            } else if (tile === 'H' || tile === 'J') {
                // Paredes aplastantes: dibujar con efectos eléctricos
                const config = store.crushingWallConfig || { speed: 1.5, color: '#cc0000' };
                
                // Efecto de brillo (glow) exterior
                ctx.shadowColor = '#00ffff'; // Color eléctrico azul-cian
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                // Tint eléctrico con gradiente
                const gradient = ctx.createLinearGradient(
                    colIndex * scaledTileSize, 
                    rowIndex * scaledTileSize, 
                    (colIndex + 1) * scaledTileSize, 
                    (rowIndex + 1) * scaledTileSize
                );
                gradient.addColorStop(0, config.color);
                gradient.addColorStop(0.5, '#ff4444'); // Rojo más brillante en el centro
                gradient.addColorStop(1, config.color);
                
                ctx.fillStyle = gradient;
                ctx.fillRect(colIndex * scaledTileSize, rowIndex * scaledTileSize, scaledTileSize, scaledTileSize);
                
                // Efecto de parpadeo eléctrico
                const time = Date.now() * 0.01;
                const flickerIntensity = Math.sin(time) * 0.3 + 0.7; // Oscila entre 0.4 y 1.0
                
                ctx.globalAlpha = flickerIntensity;
                ctx.fillStyle = '#ffffff';
                const borderOffset = 2 * zoomScale;
                ctx.fillRect(
                    colIndex * scaledTileSize + borderOffset, 
                    rowIndex * scaledTileSize + borderOffset, 
                    scaledTileSize - borderOffset * 2, 
                    scaledTileSize - borderOffset * 2
                );
                
                // Efecto de arco eléctrico en los bordes
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 1 * zoomScale;
                ctx.globalAlpha = flickerIntensity * 0.8;
                
                // Dibujar líneas eléctricas en los bordes
                ctx.beginPath();
                ctx.moveTo(colIndex * scaledTileSize, rowIndex * scaledTileSize);
                ctx.lineTo((colIndex + 1) * scaledTileSize, rowIndex * scaledTileSize);
                ctx.moveTo(colIndex * scaledTileSize, (rowIndex + 1) * scaledTileSize);
                ctx.lineTo((colIndex + 1) * scaledTileSize, (rowIndex + 1) * scaledTileSize);
                ctx.moveTo(colIndex * scaledTileSize, rowIndex * scaledTileSize);
                ctx.lineTo(colIndex * scaledTileSize, (rowIndex + 1) * scaledTileSize);
                ctx.moveTo((colIndex + 1) * scaledTileSize, rowIndex * scaledTileSize);
                ctx.lineTo((colIndex + 1) * scaledTileSize, (rowIndex + 1) * scaledTileSize);
                ctx.stroke();
                
                // Resetear efectos
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
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
                            colIndex * scaledTileSize,
                            rowIndex * scaledTileSize,
                            scaledTileSize,
                            scaledTileSize,
                        );
                    } else {
                        ctx.drawImage(sprite, colIndex * scaledTileSize, rowIndex * scaledTileSize, scaledTileSize, scaledTileSize);
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
                // Dibujar jugador con sprite hero-success.png - ocupando 2 tiles de altura
                const playerSprite = store.sprites.P_success;
                if (playerSprite) {
                    // Asegurar que el sprite ocupe exactamente 2 tiles de altura
                    ctx.drawImage(
                        playerSprite,
                        0,
                        0,
                        playerSprite.width,
                        playerSprite.height,
                        colIndex * scaledTileSize,
                        rowIndex * scaledTileSize - scaledTileSize, // Empezar un tile arriba para ocupar 2 tiles
                        scaledTileSize,
                        scaledTileSize * 2
                    );
                } else {
                    // Fallback: rectángulo rojo ocupando 2 tiles
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                    ctx.fillRect(colIndex * scaledTileSize, rowIndex * scaledTileSize - scaledTileSize, scaledTileSize, scaledTileSize * 2);
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
                        const naturalWidth = 78 * zoomScale; // Ancho natural escalado
                        const naturalHeight = minerSprite.height * zoomScale;
                        // Centrar el sprite dentro del espacio de 2 tiles
                        const offsetX = (scaledTileSize * 2 - naturalWidth) / 2;
                        
                        ctx.save();
                        if (shouldFlip) {
                            // Reflejar horizontalmente
                            ctx.translate(colIndex * scaledTileSize + scaledTileSize * 2, rowIndex * scaledTileSize);
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
                                colIndex * scaledTileSize + offsetX,
                                rowIndex * scaledTileSize,
                                naturalWidth,
                                naturalHeight
                            );
                        }
                        ctx.restore();
                    } else {
                        const naturalWidth = 78 * zoomScale;
                        const naturalHeight = minerSprite.height * zoomScale;
                        const offsetX = (scaledTileSize * 2 - naturalWidth) / 2;
                        
                        ctx.save();
                        if (shouldFlip) {
                            ctx.translate(colIndex * scaledTileSize + scaledTileSize * 2, rowIndex * scaledTileSize);
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
                                colIndex * scaledTileSize + offsetX,
                                rowIndex * scaledTileSize,
                                naturalWidth,
                                naturalHeight
                            );
                        }
                        ctx.restore();
                    }
                } else {
                    // Fallback: rectángulo azul ocupando 2 tiles de ancho
                    ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
                    ctx.fillRect(colIndex * scaledTileSize, rowIndex * scaledTileSize, scaledTileSize * 2, scaledTileSize);
                }
            } else if (tile === 'T') {
                // Dibujar tentáculo vertical con sprite tentaculo.png - tamaño 64x128 (dos tiles)
                const tentacleSprite = store.sprites.T;
                if (tentacleSprite) {
                    // Usar animación específica del tentáculo (standby por defecto en editor)
                    const frameIndex = 0; // Frame de standby para el editor
                    
                    // Calcular posición en la grilla 6x5 (frames de 60x120)
                    const frameWidth = 60;  // Ancho de cada frame
                    const frameHeight = 120; // Alto de cada frame
                    const framesPerRow = 6;   // Frames por fila
                    
                    const row = Math.floor(frameIndex / framesPerRow);
                    const col = frameIndex % framesPerRow;
                    
                    const sourceX = col * frameWidth;
                    // Fix: Ajustar offset Y por 1 pixel para evitar sangrado del frame superior
                    const sourceY = row * frameHeight + 1;
                    
                    ctx.drawImage(
                        tentacleSprite,
                        sourceX, sourceY, frameWidth, frameHeight - 2,
                        colIndex * scaledTileSize,
                        (rowIndex - 1) * scaledTileSize, // Un tile arriba para ser vertical
                        scaledTileSize, // Ancho del sprite
                        scaledTileSize * 2  // Alto del sprite (dos tiles)
                    );
                } else {
                    // Fallback: rectángulo verde
                    ctx.fillStyle = 'rgba(34, 139, 34, 0.8)';
                    ctx.fillRect(colIndex * scaledTileSize, rowIndex * scaledTileSize, 60 * zoomScale, 120 * zoomScale);
                }
            }
        }
    }

    // Grid fina (cada tile) solo en viewport
    ctx.strokeStyle = '#444';
    ctx.lineWidth = Math.max(0.5, 1 * zoomScale); // Ajustar grosor de línea según zoom
    const levelWidth = store.editorLevel[0]?.length ?? 0;
    const levelHeight = store.editorLevel.length;
    const gridStartX = startCol * scaledTileSize;
    const gridEndX = Math.min(levelWidth * scaledTileSize, (endCol + 1) * scaledTileSize);
    const gridStartY = startRow * scaledTileSize;
    const gridEndY = Math.min(levelHeight * scaledTileSize, (endRow + 1) * scaledTileSize);

    for (let x = gridStartX; x <= gridEndX; x += scaledTileSize) {
        ctx.beginPath();
        ctx.moveTo(x, gridStartY);
        ctx.lineTo(x, gridEndY);
        ctx.stroke();
    }
    for (let y = gridStartY; y <= gridEndY; y += scaledTileSize) {
        ctx.beginPath();
        ctx.moveTo(gridStartX, y);
        ctx.lineTo(gridEndX, y);
        ctx.stroke();
    }

    // Grid gruesa (cada 20x18 tiles = tamaño de viewport 1200x1080)
    // Origen definido por la posición del jugador: 3 tiles a la izquierda y 3 arriba
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = Math.max(1, 2 * zoomScale); // Ajustar grosor según zoom
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

    const originTileX = Math.max(0, playerCol - 3);
    const originTileY = Math.max(0, playerRow - 3);

    // Calcular primera línea mayor visible hacia la izquierda y arriba, restringida al viewport
    const viewportStartTilesX = startCol;
    const viewportEndTilesX = endCol + 1;
    const firstKx = Math.ceil((viewportStartTilesX - originTileX) / majorCols);
    let tileX = originTileX + firstKx * majorCols;
    while (tileX <= viewportEndTilesX) {
        const gx = tileX * scaledTileSize;
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
        const gy = tileY * scaledTileSize;
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
        ctx.lineWidth = Math.max(1, 3 * zoomScale);
        const centerX = store.mouse.gridX * scaledTileSize + scaledTileSize / 2;
        const centerY = store.mouse.gridY * scaledTileSize + scaledTileSize / 2;
        const crossSize = scaledTileSize / 3;
        
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
                    store.mouse.gridX * scaledTileSize,
                    store.mouse.gridY * scaledTileSize,
                    scaledTileSize,
                    scaledTileSize,
                );
            } else {
                ctx.drawImage(sprite, store.mouse.gridX * scaledTileSize, store.mouse.gridY * scaledTileSize, scaledTileSize, scaledTileSize);
            }
            ctx.globalAlpha = 1;
        }
    } else if (store.selectedTile === 'P') {
        // Preview del jugador con sprite hero-success.png - ocupando 2 tiles de altura
        const playerSprite = store.sprites.P_success;
        if (playerSprite) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(
                playerSprite,
                0,
                0,
                playerSprite.width,
                playerSprite.height,
                store.mouse.gridX * scaledTileSize,
                store.mouse.gridY * scaledTileSize - scaledTileSize, // Empezar un tile arriba para ocupar 2 tiles
                scaledTileSize,
                scaledTileSize * 2
            );
            ctx.globalAlpha = 1;
        } else {
            // Fallback: rectángulo rojo ocupando 2 tiles
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(store.mouse.gridX * scaledTileSize, store.mouse.gridY * scaledTileSize - scaledTileSize, scaledTileSize, scaledTileSize * 2);
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
                const naturalWidth = 78 * zoomScale;
                const naturalHeight = minerSprite.height * zoomScale;
                const offsetX = (scaledTileSize * 2 - naturalWidth) / 2;
                ctx.drawImage(
                    minerSprite,
                    frameIndex * frameWidth,
                    0,
                    frameWidth,
                    minerSprite.height,
                    store.mouse.gridX * scaledTileSize + offsetX,
                    store.mouse.gridY * scaledTileSize,
                    naturalWidth,
                    naturalHeight
                );
            } else {
                const naturalWidth = 78 * zoomScale;
                const naturalHeight = minerSprite.height * zoomScale;
                const offsetX = (scaledTileSize * 2 - naturalWidth) / 2;
                ctx.drawImage(
                    minerSprite,
                    0,
                    0,
                    78,
                    minerSprite.height,
                    store.mouse.gridX * scaledTileSize + offsetX,
                    store.mouse.gridY * scaledTileSize,
                    naturalWidth,
                    naturalHeight
                );
            }
            ctx.globalAlpha = 1;
        } else {
            // Fallback: rectángulo azul ocupando 2 tiles de ancho
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
            ctx.fillRect(store.mouse.gridX * scaledTileSize, store.mouse.gridY * scaledTileSize, scaledTileSize * 2, scaledTileSize);
            ctx.globalAlpha = 1;
        }
    }
    else if (store.selectedTile === 'T') {
        // Preview del tentáculo con sprite tentaculo.png - tamaño 60x120
        const tentacleSprite = store.sprites.T;
        if (tentacleSprite) {
            ctx.globalAlpha = 0.5;
            const { anim, effectiveFrames, totalFrames } = resolveAnimation(store.selectedTile, 'T');
            if (anim && effectiveFrames > 0 && totalFrames > 0) {
                const frameDuration = Math.max(1, anim.speed) * msPerTick;
                const frameIndex = Math.floor(timestamp / frameDuration) % effectiveFrames;
                
                // Calcular posición en la grilla 6x5 (frames de 60x120)
                const frameWidth = 60;  // Ancho de cada frame
                const frameHeight = 120; // Alto de cada frame
                const framesPerRow = 6;   // Frames por fila
                
                const row = Math.floor(frameIndex / framesPerRow);
                const col = frameIndex % framesPerRow;
                
                const sourceX = col * frameWidth;
                const sourceY = row * frameHeight;
                
                ctx.drawImage(
                    tentacleSprite,
                    sourceX, sourceY, frameWidth, frameHeight,
                    store.mouse.gridX * scaledTileSize,
                    (store.mouse.gridY - 1) * scaledTileSize,
                    scaledTileSize, // Ancho del sprite
                    scaledTileSize * 2  // Alto del sprite
                );
            } else {
                ctx.drawImage(
                    tentacleSprite,
                    0,
                    0,
                    tentacleSprite.width,
                    tentacleSprite.height,
                    store.mouse.gridX * scaledTileSize,
                    (store.mouse.gridY - 1) * scaledTileSize,
                    scaledTileSize,
                    scaledTileSize * 2
                );
            }
            ctx.globalAlpha = 1;
        } else {
            // Fallback: rectángulo verde
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = 'rgba(34, 139, 34, 0.8)';
            ctx.fillRect(store.mouse.gridX * scaledTileSize, (store.mouse.gridY - 1) * scaledTileSize, scaledTileSize, scaledTileSize * 2);
            ctx.globalAlpha = 1;
        }
    }
    else if (store.selectedTile === 'L') {
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
                store.mouse.gridX * scaledTileSize,
                store.mouse.gridY * scaledTileSize,
                scaledTileSize,
                scaledTileSize
            );
            ctx.globalAlpha = 1;
        } else {
            // Fallback: círculo amarillo
            ctx.globalAlpha = 0.5;
            const centerX = store.mouse.gridX * scaledTileSize + scaledTileSize / 2;
            const centerY = store.mouse.gridY * scaledTileSize + scaledTileSize / 2;
            const radius = scaledTileSize / 3;
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    } else if (store.selectedTile === 'A') {
        // Preview de plataforma: 60x10 al fondo del tile
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#ffff00';
        const scaledPlatformWidth = 60 * zoomScale;
        const scaledPlatformHeight = 10 * zoomScale;
        const px = store.mouse.gridX * scaledTileSize + (scaledTileSize - scaledPlatformWidth) / 2;
        const py = store.mouse.gridY * scaledTileSize + scaledTileSize - scaledPlatformHeight;
        ctx.fillRect(px, py, scaledPlatformWidth, scaledPlatformHeight);
        ctx.globalAlpha = 1;
    } else if (store.selectedTile === 'H' || store.selectedTile === 'J') {
        // Preview de pared aplastante con color configurado
        ctx.globalAlpha = 0.5;
        const config = store.crushingWallConfig || { speed: 1.5, color: '#cc0000' };
        ctx.fillStyle = config.color;
        ctx.fillRect(store.mouse.gridX * scaledTileSize, store.mouse.gridY * scaledTileSize, scaledTileSize, scaledTileSize);
        ctx.globalAlpha = 1;
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
        ctx.lineWidth = Math.max(1, 2 * zoomScale);
        ctx.strokeRect(
            startX * scaledTileSize,
            startY * scaledTileSize,
            (endX - startX + 1) * scaledTileSize,
            (endY - startY + 1) * scaledTileSize
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
                                const playerSprite = store.sprites.P_success;
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
                            } else if (store.selectedTile === 'H' || store.selectedTile === 'J') {
                                // Preview de paredes aplastantes en área
                                const config = store.crushingWallConfig || { speed: 1.5, color: '#cc0000' };
                                ctx.fillStyle = config.color;
                                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
                            } else if (store.selectedTile === 'A') {
                                // Preview de plataforma en área
                                ctx.globalAlpha = 0.3;
                                ctx.fillStyle = '#ffff00';
                                const px = x * TILE_SIZE + (TILE_SIZE - 60) / 2;
                                const py = y * TILE_SIZE + TILE_SIZE - 10;
                                ctx.fillRect(px, py, 60, 10);
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

    // Feedback visual para modo de duplicación de fila
    if (store.duplicateRowMode) {
        const mouseRow = store.mouse.gridY;
        if (mouseRow >= 0 && mouseRow < store.editorLevel.length) {
            // Dibujar overlay de la fila completa
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#00ff00'; // Verde semitransparente
            ctx.fillRect(0, mouseRow * TILE_SIZE, store.editorLevel[0]?.length * TILE_SIZE, TILE_SIZE);
            
            // Dibujar borde de la fila
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, mouseRow * TILE_SIZE, store.editorLevel[0]?.length * TILE_SIZE, TILE_SIZE);
            
            ctx.restore();
        }
    }

    // Feedback visual para modo de borrado de fila
    if (store.deleteRowMode) {
        const mouseRow = store.mouse.gridY;
        if (mouseRow >= 0 && mouseRow < store.editorLevel.length) {
            // Dibujar overlay de la fila completa
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ff0000'; // Rojo semitransparente
            ctx.fillRect(0, mouseRow * TILE_SIZE, store.editorLevel[0]?.length * TILE_SIZE, TILE_SIZE);
            
            // Dibujar borde de la fila
            ctx.globalAlpha = 0.8;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, mouseRow * TILE_SIZE, store.editorLevel[0]?.length * TILE_SIZE, TILE_SIZE);
            
            // Dibujar X de borrado en el centro
            ctx.globalAlpha = 0.9;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            const centerX = (store.editorLevel[0]?.length * TILE_SIZE) / 2;
            const centerY = mouseRow * TILE_SIZE + TILE_SIZE / 2;
            const crossSize = TILE_SIZE / 2;
            
            ctx.beginPath();
            ctx.moveTo(centerX - crossSize, centerY - crossSize);
            ctx.lineTo(centerX + crossSize, centerY + crossSize);
            ctx.moveTo(centerX + crossSize, centerY - crossSize);
            ctx.lineTo(centerX - crossSize, centerY + crossSize);
            ctx.stroke();
            
            ctx.restore();
        }
    }

    ctx.restore();
};

// Función para activar el modo de duplicación de fila
export const activateDuplicateRowMode = (store: GameStore) => {
    store.duplicateRowMode = true;
    // Desactivar el modo de borrado si estaba activo
    store.deleteRowMode = false;
    // "Olvidar" el tile seleccionado - limpiar selección visual e interna
    const selected = store.dom.ui.paletteEl?.querySelector('.tile-item.selected');
    if (selected) {
        selected.classList.remove('selected');
    }
    // Resetear el tile seleccionado a un valor neutro para evitar interferencias
    store.selectedTile = '0'; // Tile vacío
    // Cambiar el cursor para indicar el modo especial
    if (store.dom.canvas) {
        store.dom.canvas.style.cursor = 'copy';
    }
};

// Función para duplicar la fila en la posición del mouse
export const duplicateRowAtPosition = (store: GameStore, rowIndex: number) => {
    const level = store.editorLevel;
    if (!level || level.length === 0) return;
    
    if (rowIndex < 0 || rowIndex >= level.length) return;
    
    // Guardar en historial antes de hacer cambios
    saveToHistory(store);
    
    // Crear una copia profunda de la fila actual
    const rowToDuplicate = [...level[rowIndex]];
    
    // Insertar la fila duplicada justo debajo de la fila actual
    level.splice(rowIndex + 1, 0, rowToDuplicate);
    
    // Actualizar botones de undo/redo
    updateUndoRedoButtons(store);
    
    // NO desactivar el modo - permanecerá activo hasta que se seleccione otro elemento de la paleta
};

// Función para activar el modo de borrado de fila
export const activateDeleteRowMode = (store: GameStore) => {
    store.deleteRowMode = true;
    // Desactivar el modo de duplicación si estaba activo
    store.duplicateRowMode = false;
    // "Olvidar" el tile seleccionado - limpiar selección visual e interna
    const selected = store.dom.ui.paletteEl?.querySelector('.tile-item.selected');
    if (selected) {
        selected.classList.remove('selected');
    }
    // Resetear el tile seleccionado a un valor neutro para evitar interferencias
    store.selectedTile = '0'; // Tile vacío
    // Cambiar el cursor para indicar el modo especial
    if (store.dom.canvas) {
        store.dom.canvas.style.cursor = 'not-allowed';
    }
};

// Función para borrar la fila en la posición del mouse
export const deleteRowAtPosition = (store: GameStore, rowIndex: number) => {
    const level = store.editorLevel;
    if (!level || level.length === 0) return;
    
    if (rowIndex < 0 || rowIndex >= level.length) return;
    
    // No permitir borrar si solo queda una fila
    if (level.length <= 1) return;
    
    // Guardar en historial antes de hacer cambios
    saveToHistory(store);
    
    // Eliminar la fila
    level.splice(rowIndex, 1);
    
    // Actualizar botones de undo/redo
    updateUndoRedoButtons(store);
    
    // NO desactivar el modo - permanecerá activo hasta que se seleccione otro elemento de la paleta
};

