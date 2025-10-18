import { TILE_SIZE } from '../core/constants';

export interface Chunk20x18 {
    cx: number; // chunk column index (each chunk width = 20 tiles)
    cy: number; // chunk row index (each chunk height = 18 tiles)
    rows: string[]; // length <= 18, each string length <= 20
}

export interface ChunkedLevel20x18 {
    width: number;  // total tiles width
    height: number; // total tiles height
    chunks: Chunk20x18[];
}

export interface ChunkedLevelsFile20x18 {
    format: 'chunks20x18';
    chunkWidth: number;   // always 20
    chunkHeight: number;  // always 18
    levels: ChunkedLevel20x18[];
}

const CHUNK_W = 20;
const CHUNK_H = 18;

const createEmptyLevel = (width: number, height: number): string[] =>
    Array.from({ length: height }, () => '0'.repeat(width));

export const expandChunkedLevels = (file: ChunkedLevelsFile20x18): string[][] => {
    const levels: string[][] = [];
    for (const level of file.levels) {
        // Start with an empty level of the declared size
        let rows = createEmptyLevel(level.width, level.height);
        // Fill chunks
        for (const chunk of level.chunks) {
            for (let y = 0; y < CHUNK_H; y++) {
                const srcRow = chunk.rows[y] ?? '';
                const dstRowIndex = chunk.cy * CHUNK_H + y;
                if (dstRowIndex >= level.height) {
                    break;
                }
                const dstRow = rows[dstRowIndex].split('');
                for (let x = 0; x < CHUNK_W; x++) {
                    const ch = srcRow[x] ?? '0';
                    const dstColIndex = chunk.cx * CHUNK_W + x;
                    if (dstColIndex >= level.width) {
                        break;
                    }
                    if (ch !== '0' && ch !== undefined) {
                        dstRow[dstColIndex] = ch;
                    }
                }
                rows[dstRowIndex] = dstRow.join('');
            }
        }
        levels.push(rows);
    }
    return levels;
};

export const expandLevelsFromAny = (data: any): string[][] => {
    // Legacy format: string[][] (levels -> rows -> string)
    if (Array.isArray(data) && (data.length === 0 || Array.isArray(data[0]))) {
        return data as string[][];
    }
    // Chunked format
    if (data && data.format === 'chunks20x18' && Array.isArray(data.levels)) {
        return expandChunkedLevels(data as ChunkedLevelsFile20x18);
    }
    // Unknown -> fallback empty
    return [];
};

export const chunkifyLevel20x18 = (rows: string[]): ChunkedLevel20x18 => {
    const height = rows.length;
    const width = rows[0]?.length ?? 0;
    const chunks: Chunk20x18[] = [];
    const chunkRows = Math.ceil(height / CHUNK_H);
    const chunkCols = Math.ceil(width / CHUNK_W);

    for (let cy = 0; cy < chunkRows; cy++) {
        for (let cx = 0; cx < chunkCols; cx++) {
            // Extract rows for this chunk
            const part: string[] = [];
            let isAllZero = true;
            for (let y = 0; y < CHUNK_H; y++) {
                const srcY = cy * CHUNK_H + y;
                if (srcY >= height) break;
                const row = rows[srcY] ?? '';
                const slice = row.substring(cx * CHUNK_W, cx * CHUNK_W + CHUNK_W).padEnd(CHUNK_W, '0');
                if (isAllZero && /[^0]/.test(slice)) {
                    isAllZero = false;
                }
                part.push(slice);
            }
            if (!isAllZero) {
                // Trim trailing empty rows inside the chunk
                let lastNonEmpty = part.length - 1;
                for (; lastNonEmpty >= 0; lastNonEmpty--) {
                    if (/[^0]/.test(part[lastNonEmpty])) break;
                }
                chunks.push({ cx, cy, rows: part.slice(0, lastNonEmpty + 1) });
            }
        }
    }

    return { width, height, chunks };
};

export const buildChunkedFile20x18 = (levels: string[][]): ChunkedLevelsFile20x18 => ({
    format: 'chunks20x18',
    chunkWidth: CHUNK_W,
    chunkHeight: CHUNK_H,
    levels: levels.map(rows => chunkifyLevel20x18(rows)),
});


