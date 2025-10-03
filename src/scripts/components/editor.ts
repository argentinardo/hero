import { TILE_SIZE, TOTAL_LEVELS } from '../core/constants';
import { TILE_TYPES, ANIMATION_DATA } from '../core/assets';
import type { GameStore } from '../core/types';

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

const ensureLevelHeight = (level: string[][], canvasHeight: number) => {
    const minRows = Math.ceil(canvasHeight / TILE_SIZE) + 1;
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
};

const applyMousePaint = (store: GameStore) => {
    const level = store.editorLevel;
    const { gridX, gridY } = store.mouse;
    if (!level[gridY] || level[gridY][gridX] === undefined) {
        return;
    }
    const selected = store.selectedTile;
    if (selected === 'P') {
        ensurePlayerUnique(level, selected, gridX, gridY);
        return;
    }
    level[gridY][gridX] = selected;
};

// Variables para detectar swipes vs movimientos normales
let touchStartY = 0;
let touchStartTime = 0;
let isSwipeGesture = false;

export const bindEditorCanvas = (store: GameStore) => {
    const canvas = store.dom.canvas;
    if (!canvas) {
        return;
    }
    canvas.addEventListener('mousemove', event => {
        if (store.appState !== 'editing') {
            return;
        }

        // Como el canvas está posicionado fijo en (0,0) y ocupa 60% del ancho,
        // las coordenadas del evento están en relación al viewport completo
        // Necesitamos mapear las coordenadas del evento al área del canvas
        const canvasRect = canvas.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const canvasWidth = canvas.width;  // Resolución interna del canvas (1200)
        const canvasHeight = canvas.height;  // Resolución interna del canvas (900)

        // El canvas ocupa el 60% izquierdo del viewport
        const canvasLeftEdge = 0;
        const canvasRightEdge = viewportWidth * 0.6;

        // Calcular coordenadas considerando el posicionamiento real del canvas
        if (event.clientX >= canvasLeftEdge && event.clientX <= canvasRightEdge) {
            // Para X: mapeo proporcional usando la resolución interna del canvas
            const canvasElementWidth = canvasRect.width;  // Tamaño real del elemento (549)
            const scaleX = canvasWidth / canvasElementWidth;  // Factor de escala (1200/549 ≈ 2.186)
            store.mouse.x = (event.clientX - canvasLeftEdge) * scaleX;

            // Para Y: calcular considerando la posición real del canvas en el viewport
            const canvasTopInViewport = canvasRect.top;
            const canvasElementHeight = canvasRect.height;  // Tamaño real del elemento (412)
            const scaleY = canvasHeight / canvasElementHeight;  // Factor de escala (900/412 ≈ 2.184)
            store.mouse.y = (event.clientY - canvasTopInViewport) * scaleY;

            // Debug adicional para verificar coordenadas
            console.log(`Canvas rect: (${canvasRect.left}, ${canvasRect.top}, ${canvasRect.width}, ${canvasRect.height})`);
            console.log(`Viewport: (${viewportWidth}x${viewportHeight})`);
            console.log(`Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);
        } else {
            // Si el evento está fuera del área del canvas, no procesar
            return;
        }

        // Asegurar que las coordenadas estén dentro de los límites del canvas
        store.mouse.x = Math.max(0, Math.min(store.mouse.x, canvasWidth));
        store.mouse.y = Math.max(0, Math.min(store.mouse.y, canvas.height));

        // Calcular coordenadas del mundo considerando la cámara
        // Las coordenadas del mouse ya están en relación a la resolución interna del canvas (1200x900)
        // y el contenido se mueve mediante ctx.translate(0, -store.cameraY) en el contexto de dibujo
        const worldY = store.mouse.y;
        store.mouse.gridX = Math.floor(store.mouse.x / TILE_SIZE);
        store.mouse.gridY = Math.floor(worldY / TILE_SIZE);

        // Debug adicional para verificar el cálculo de grid
        console.log(`World calc: mouse.y=${store.mouse.y}, cameraY=${store.cameraY}, worldY=${worldY}, gridY=${store.mouse.gridY}`);
        console.log(`Tile size: ${TILE_SIZE}, Expected gridY: ${Math.floor(worldY / TILE_SIZE)}`);

        // Debug: Log de coordenadas para identificar el problema
        console.log(`Mouse: (${store.mouse.x.toFixed(2)}, ${store.mouse.y.toFixed(2)}) -> Grid: (${store.mouse.gridX}, ${store.mouse.gridY}) | Event: (${event.clientX}, ${event.clientY})`);

        if (store.mouse.isDown) {
            applyMousePaint(store);
        }
    });

    canvas.addEventListener('mousedown', event => {
        if (store.appState !== 'editing' || event.button !== 0) {
            return;
        }
        store.mouse.isDown = true;
        applyMousePaint(store);
    });

    canvas.addEventListener('mouseup', () => {
        store.mouse.isDown = false;
    });

    canvas.addEventListener('wheel', event => {
        if (store.appState !== 'editing') {
            return;
        }
        event.preventDefault();
        store.cameraY += event.deltaY;
        if (store.editorLevel.length > 0) {
            const levelHeight = store.editorLevel.length * TILE_SIZE;
            if (store.cameraY + (canvas.height ?? 0) > levelHeight - TILE_SIZE) {
                ensureLevelHeight(store.editorLevel, canvas.height ?? 0);
            }
            const maxCameraY = Math.max(0, store.editorLevel.length * TILE_SIZE - (canvas.height ?? 0));
            store.cameraY = Math.max(0, Math.min(store.cameraY, maxCameraY));
        }
    }, { passive: false });

    // Soporte para touch events en móvil
    canvas.addEventListener('touchmove', event => {
        if (store.appState !== 'editing') {
            return;
        }
        event.preventDefault();
        const touch = event.touches[0];

        // Detectar si es un swipe (movimiento rápido para scroll)
        const currentTime = Date.now();
        const timeDiff = currentTime - touchStartTime;
        const currentY = touch.clientY;
        const distanceY = Math.abs(currentY - touchStartY);
        const velocity = distanceY / timeDiff; // píxeles por milisegundo

        // Si el movimiento es rápido (> 0.5 píxeles/ms) y hay distancia suficiente (> 50 píxeles), es un swipe
        if (timeDiff > 50 && velocity > 0.5 && distanceY > 50) {
            isSwipeGesture = true;

            // Calcular scroll basado en el movimiento del swipe
            const deltaY = touchStartY - currentY; // Movimiento positivo hacia arriba = scroll hacia abajo
            const scrollAmount = deltaY * 2; // Multiplicar por 2 para hacer el scroll más sensible

            // Actualizar posición de la cámara
            if (store.editorLevel.length > 0) {
                const levelHeight = store.editorLevel.length * TILE_SIZE;
                const maxCameraY = Math.max(0, levelHeight - (canvas.height ?? 0));

                // Aplicar scroll suave con límites
                store.cameraY = Math.max(0, Math.min(store.cameraY + scrollAmount, maxCameraY));

                // Debug del scroll
                console.log(`Swipe scroll: deltaY=${deltaY}, scrollAmount=${scrollAmount}, new cameraY=${store.cameraY}`);
            }

            return; // No procesar como colocación de tiles
        }

        // Si no es un swipe, procesar como colocación normal de tiles
        if (!isSwipeGesture) {
            // Como el canvas está posicionado fijo en (0,0) y ocupa 60% del ancho,
            // las coordenadas del evento están en relación al viewport completo
            // Necesitamos mapear las coordenadas del evento al área del canvas
            const canvasRect = canvas.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const canvasWidth = canvas.width;  // Resolución interna del canvas (1200)
            const canvasHeight = canvas.height;  // Resolución interna del canvas (900)

            // El canvas ocupa el 60% izquierdo del viewport
            const canvasLeftEdge = 0;
            const canvasRightEdge = viewportWidth * 0.6;

            // Calcular coordenadas considerando el posicionamiento real del canvas
            if (touch.clientX >= canvasLeftEdge && touch.clientX <= canvasRightEdge) {
                // Para X: mapeo proporcional usando la resolución interna del canvas
                const canvasElementWidth = canvasRect.width;  // Tamaño real del elemento (549)
                const scaleX = canvasWidth / canvasElementWidth;  // Factor de escala (1200/549 ≈ 2.186)
                store.mouse.x = (touch.clientX - canvasLeftEdge) * scaleX;

                // Para Y: calcular considerando la posición real del canvas en el viewport
                const canvasTopInViewport = canvasRect.top;
                const canvasElementHeight = canvasRect.height;  // Tamaño real del elemento (412)
                const scaleY = canvasHeight / canvasElementHeight;  // Factor de escala (900/412 ≈ 2.184)
                store.mouse.y = (touch.clientY - canvasTopInViewport) * scaleY;

                // Debug adicional para verificar coordenadas del dispositivo
                console.log(`Device info: touch.clientX=${touch.clientX}, touch.clientY=${touch.clientY}`);
                console.log(`Canvas rect: left=${canvasRect.left}, top=${canvasRect.top}, width=${canvasRect.width}, height=${canvasRect.height}`);
                console.log(`Viewport: ${viewportWidth}x${viewportHeight}`);
                console.log(`Canvas internal: ${canvasWidth}x${canvasHeight}`);
                console.log(`Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);
                console.log(`Touch Y calc: touch.clientY=${touch.clientY}, canvasTop=${canvasTopInViewport}, scaledY=${store.mouse.y.toFixed(2)}`);

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
            // y el contenido se mueve mediante ctx.translate(0, -store.cameraY) en el contexto de dibujo
            const worldY = store.mouse.y;
            store.mouse.gridX = Math.floor(store.mouse.x / TILE_SIZE);
            store.mouse.gridY = Math.floor(worldY / TILE_SIZE);

            // Debug adicional para verificar el cálculo de grid
            console.log(`World calc: mouse.y=${store.mouse.y}, cameraY=${store.cameraY}, worldY=${worldY}, gridY=${store.mouse.gridY}`);
            console.log(`Tile size: ${TILE_SIZE}, Expected gridY: ${Math.floor(worldY / TILE_SIZE)}`);

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
        const touch = event.touches[0];

        // Guardar información inicial para detectar swipes
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        isSwipeGesture = false;

        // Como el canvas está posicionado fijo en (0,0) y ocupa 60% del ancho,
        // las coordenadas del evento están en relación al viewport completo
        // Necesitamos mapear las coordenadas del evento al área del canvas
        const canvasRect = canvas.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const canvasWidth = canvas.width;  // Resolución interna del canvas (1200)
        const canvasHeight = canvas.height;  // Resolución interna del canvas (900)

        // El canvas ocupa el 60% izquierdo del viewport
        const canvasLeftEdge = 0;
        const canvasRightEdge = viewportWidth * 0.6;

        // Calcular coordenadas considerando el posicionamiento real del canvas
        if (touch.clientX >= canvasLeftEdge && touch.clientX <= canvasRightEdge) {
            // Para X: mapeo proporcional usando la resolución interna del canvas
            const canvasElementWidth = canvasRect.width;  // Tamaño real del elemento (549)
            const scaleX = canvasWidth / canvasElementWidth;  // Factor de escala (1200/549 ≈ 2.186)
            store.mouse.x = (touch.clientX - canvasLeftEdge) * scaleX;

            // Para Y: calcular considerando la posición real del canvas en el viewport
            const canvasTopInViewport = canvasRect.top;
            const canvasElementHeight = canvasRect.height;  // Tamaño real del elemento (412)
            const scaleY = canvasHeight / canvasElementHeight;  // Factor de escala (900/412 ≈ 2.184)
            store.mouse.y = (touch.clientY - canvasTopInViewport) * scaleY;

            // Debug adicional para verificar coordenadas del dispositivo
            console.log(`Device info: touch.clientX=${touch.clientX}, touch.clientY=${touch.clientY}`);
            console.log(`Canvas rect: left=${canvasRect.left}, top=${canvasRect.top}, width=${canvasRect.width}, height=${canvasRect.height}`);
            console.log(`Viewport: ${viewportWidth}x${viewportHeight}`);
            console.log(`Canvas internal: ${canvasWidth}x${canvasHeight}`);
            console.log(`Scale factors: X=${scaleX.toFixed(3)}, Y=${scaleY.toFixed(3)}`);
            console.log(`Touch Y calc: touch.clientY=${touch.clientY}, canvasTop=${canvasTopInViewport}, scaledY=${store.mouse.y.toFixed(2)}`);

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
        // y el contenido se mueve mediante ctx.translate(0, -store.cameraY) en el contexto de dibujo
        const worldY = store.mouse.y;
        store.mouse.gridX = Math.floor(store.mouse.x / TILE_SIZE);
        store.mouse.gridY = Math.floor(worldY / TILE_SIZE);

        // Debug adicional para verificar el cálculo de grid
        console.log(`World calc: mouse.y=${store.mouse.y}, cameraY=${store.cameraY}, worldY=${worldY}, gridY=${store.mouse.gridY}`);
        console.log(`Tile size: ${TILE_SIZE}, Expected gridY: ${Math.floor(worldY / TILE_SIZE)}`);

        // Debug: Log de coordenadas para identificar el problema
        console.log(`Touch: (${store.mouse.x.toFixed(2)}, ${store.mouse.y.toFixed(2)}) -> Grid: (${store.mouse.gridX}, ${store.mouse.gridY}) | Event: (${touch.clientX}, ${touch.clientY})`);

        store.mouse.isDown = true;
        applyMousePaint(store);
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        if (store.appState !== 'editing') {
            return;
        }
        store.mouse.isDown = false;

        // Limpiar variables de detección de swipes después de un breve delay
        setTimeout(() => {
            isSwipeGesture = false;
            touchStartY = 0;
            touchStartTime = 0;
        }, 100);
    });
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
        const numTilesX = Math.ceil(canvas.width / TILE_SIZE) + 1;
        const numTilesY = Math.ceil((endY - startY) / TILE_SIZE) + 1;
        
        ctx.save();
        ctx.translate(0, -store.cameraY);
        
        for (let y = 0; y < numTilesY; y++) {
            for (let x = 0; x < numTilesX; x++) {
                const tileX = x * TILE_SIZE;
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
    ctx.translate(0, -store.cameraY);

    const timestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const msPerTick = 1000 / 60;

    store.editorLevel.forEach((row, rowIndex) => {
        row.forEach((tile, colIndex) => {
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
            } else if (tile === 'P') {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.fillRect(colIndex * TILE_SIZE, rowIndex * TILE_SIZE, TILE_SIZE, TILE_SIZE * 2);
            } else if (tile === 'L') {
                // Dibujar luz en el editor con sprite
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
            }
        });
    });

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    const levelWidth = store.editorLevel[0]?.length ?? 0;
    const levelHeight = store.editorLevel.length;
    for (let x = 0; x <= levelWidth * TILE_SIZE; x += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, levelHeight * TILE_SIZE);
        ctx.stroke();
    }
    for (let y = 0; y <= levelHeight * TILE_SIZE; y += TILE_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(levelWidth * TILE_SIZE, y);
        ctx.stroke();
    }

    const selectedSpriteKey = store.selectedTile === 'P' ? null : TILE_TYPES[store.selectedTile]?.sprite;
    if (selectedSpriteKey) {
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
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(store.mouse.gridX * TILE_SIZE, store.mouse.gridY * TILE_SIZE, TILE_SIZE, TILE_SIZE * 2);
        ctx.globalAlpha = 1;
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

    ctx.restore();
};

