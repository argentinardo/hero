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

export const bindEditorCanvas = (store: GameStore) => {
    const canvas = store.dom.canvas;
    if (!canvas) {
        return;
    }
    canvas.addEventListener('mousemove', event => {
        if (store.appState !== 'editing') {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        store.mouse.x = event.clientX - rect.left;
        store.mouse.y = event.clientY - rect.top;
        const worldY = store.mouse.y + store.cameraY;
        store.mouse.gridX = Math.floor(store.mouse.x / TILE_SIZE);
        store.mouse.gridY = Math.floor(worldY / TILE_SIZE);
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

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    }

    ctx.restore();
};

