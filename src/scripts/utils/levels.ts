import { TILE_SIZE } from '../core/constants';

/**
 * Representa un chunk de 20x18 tiles dentro de un nivel
 * @interface Chunk20x18
 */
export interface Chunk20x18 {
    /** Índice de columna del chunk (cada chunk = 20 tiles de ancho) */
    cx: number;
    /** Índice de fila del chunk (cada chunk = 18 tiles de alto) */
    cy: number;
    /** Filas del chunk (máx 18, cada string máx 20 caracteres) */
    rows: string[];
}

/**
 * Nivel completo en formato chunked 20x18
 * @interface ChunkedLevel20x18
 */
export interface ChunkedLevel20x18 {
    /** Ancho total del nivel en tiles */
    width: number;
    /** Alto total del nivel en tiles */
    height: number;
    /** Array de chunks que componen el nivel */
    chunks: Chunk20x18[];
}

/**
 * Archivo completo de niveles en formato chunked
 * @interface ChunkedLevelsFile20x18
 */
export interface ChunkedLevelsFile20x18 {
    /** Formato: siempre 'chunks20x18' */
    format: 'chunks20x18';
    /** Ancho de cada chunk: siempre 20 */
    chunkWidth: number;
    /** Alto de cada chunk: siempre 18 */
    chunkHeight: number;
    /** Array de niveles chunked */
    levels: ChunkedLevel20x18[];
}

/** Ancho de cada chunk en tiles */
const CHUNK_W = 20;
/** Alto de cada chunk en tiles */
const CHUNK_H = 18;

/**
 * Crea un nivel vacío (todo '0') de las dimensiones especificadas
 * @param {number} width - Ancho en tiles
 * @param {number} height - Alto en tiles
 * @returns {string[]} Array de filas llenas de '0'
 */
const createEmptyLevel = (width: number, height: number): string[] =>
    Array.from({ length: height }, () => '0'.repeat(width));

/**
 * Expande un archivo de niveles chunked a arrays de strings
 * Reconstruye cada nivel desde sus chunks 20x18
 * 
 * @param {ChunkedLevelsFile20x18} file - Archivo con niveles en formato chunks20x18
 * @returns {string[][]} Array de niveles expandidos
 * 
 * @example
 * ```typescript
 * const levels = expandChunkedLevels(chunkedFile);
 * // levels[0][0] = primera fila del primer nivel
 * ```
 */
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

/**
 * Expande niveles desde cualquier formato soportado
 * Autodetecta si es legacy (array directo) o chunked (format: chunks20x18)
 * 
 * @param {any} data - Datos de niveles en cualquier formato
 * @returns {string[][]} Array de niveles expandidos
 * 
 * @example
 * ```typescript
 * // Formato legacy
 * const levels1 = expandLevelsFromAny([['111', '0P1'], ['222', '0S2']]);
 * 
 * // Formato chunked
 * const levels2 = expandLevelsFromAny({ format: 'chunks20x18', ... });
 * ```
 */
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

/**
 * Convierte un nivel en formato de filas (string[]) a formato chunked 20x18
 * Solo incluye chunks que tengan al menos un tile no-vacío ('0')
 * 
 * @param {string[]} rows - Array de filas del nivel
 * @returns {ChunkedLevel20x18} Nivel en formato chunked
 * 
 * @example
 * ```typescript
 * const rows = ['1111111', '0P0P0P0', '9999999'];
 * const chunked = chunkifyLevel20x18(rows);
 * // chunked.chunks = [{ cx: 0, cy: 0, rows: [...] }]
 * ```
 */
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

/**
 * Construye un archivo completo de niveles en formato chunked
 * Convierte cada nivel del array a formato chunks20x18
 * 
 * @param {string[][]} levels - Array de niveles en formato de filas
 * @returns {ChunkedLevelsFile20x18} Archivo completo chunked
 * 
 * @example
 * ```typescript
 * const levels = [
 *   ['1111', '0P01'],
 *   ['2222', '0S02']
 * ];
 * const file = buildChunkedFile20x18(levels);
 * // file.levels = [chunked1, chunked2]
 * ```
 */
export const buildChunkedFile20x18 = (levels: string[][]): ChunkedLevelsFile20x18 => ({
    format: 'chunks20x18',
    chunkWidth: CHUNK_W,
    chunkHeight: CHUNK_H,
    levels: levels.map(rows => chunkifyLevel20x18(rows)),
});


