import { TILE_SIZE } from '../core/constants';

export interface LevelGeneratorOptions {
    width: number;
    height: number;
    difficulty: number; // 1-10
}

/**
 * Genera un nivel siguiendo los patrones encontrados en los niveles 1-12
 * 
 * PATRONES IDENTIFICADOS:
 * - Inicio: Siempre igual - borde superior, estructura específica en filas 1-2, héroe en fila 3 con columnas de 3 tiles
 * - Columnas: Siempre de exactamente 3 tiles de altura (C destructibles o K no destructibles)
 * - Final: Minero cerca del final con estructura consistente
 * - Plataformas: Espaciadas con espacios de 3 tiles entre ellas
 */
export const generateLevel = (options: LevelGeneratorOptions): string[] => {
    const { width, height, difficulty } = options;
    const level: string[] = [];
    
    // Inicializar nivel completamente vacío
    for (let y = 0; y < height; y++) {
        level[y] = '0'.repeat(width);
    }
    
    // Crear bordes completos (laterales, superior e inferior)
    for (let y = 0; y < height; y++) {
        // Bordes laterales
        level[y] = '1' + level[y].substring(1, width - 1) + '1';
        // Primera y última fila completamente sólidas
        if (y === 0 || y === height - 1) {
        level[y] = '1'.repeat(width);
        }
    }
    
    // PATRÓN DE INICIO - Siempre igual
    generateStartPattern(level, width, difficulty);
    
    // PATRÓN DE COLUMNAS - Columnas de 3 tiles a lo largo del nivel
    generateColumnPatterns(level, width, height, difficulty);
    
    // PATRÓN DE PLATAFORMAS - Con espacios de 3 tiles
    const platforms = generatePlatformsWithGaps(level, width, height, difficulty);
    
    // PATRÓN DE FINAL - Minero con estructura consistente
    generateEndPattern(level, width, height);
    
    // Colocar enemigos en las plataformas
    placeEnemiesOnPlatforms(level, width, height, difficulty, platforms);
    
    // Agregar obstáculos variados
    addVariedObstacles(level, width, height, difficulty, platforms);
    
    return level;
};

/**
 * Genera el patrón de inicio - Siempre igual
 * Estructura:
 * - Fila 0: Todo '1' (borde superior)
 * - Fila 1-2: '11' inicio, espacios, '1' central (columna), espacios, '11' final
 * - Fila 3-5: '1' inicio, P (héroe), espacios, columnas C de 3 tiles, espacios, '111' final
 */
const generateStartPattern = (level: string[], width: number, difficulty: number) => {
    // Fila 0 ya está completa con '1'
    
    // Fila 1-2: Estructura con columna central
    // Patrón observado: "11000001000000001111" (columna '1' en posición 7)
    const centerCol = 7; // Posición fija de la columna central (como en niveles originales)
    for (let y = 1; y <= 2; y++) {
        const rowArray = Array(width).fill('1'); // Empezar todo con '1'
        // Crear estructura: '11' inicio + espacios + '1' central + espacios + '1111' final
        rowArray[0] = '1';
        rowArray[1] = '1';
        // Espacios desde posición 2 hasta columna central - 1
        for (let x = 2; x < centerCol; x++) {
            rowArray[x] = '0';
        }
        rowArray[centerCol] = '1'; // Columna central
        // Espacios desde columna central + 1 hasta ancho - 4
        for (let x = centerCol + 1; x < width - 4; x++) {
            rowArray[x] = '0';
        }
        // Los últimos 4 ya están como '1' (borde derecho)
        level[y] = rowArray.join('');
    }
    
    // Fila 3-5: Héroe y columnas de 3 tiles
    // Patrón observado: '10P0000C000000000111' (niveles 1-4)
    // O: '30P0000K000000000333' / '3000000K000000000333' (niveles 6+)
    const heroX = 2; // Posición del héroe (después de '1')
    const columnX = 7; // Posición fija de la columna (posición 7 como en los niveles originales)
    
    // Determinar tipo de borde y columna según dificultad
    // Niveles bajos: '1' y 'C', niveles altos: '3' y 'K'
    const borderChar = difficulty > 5 ? '3' : '1';
    const columnType = difficulty > 5 ? 'K' : 'C';
    
    // Fila 3: Héroe y inicio de columna
    // Patrón: borderChar + '0' + 'P' + '0000' + columnType + espacios + borderChar*3
    const row3Array = Array(width).fill(borderChar);
    row3Array[heroX] = 'P';
    row3Array[columnX] = columnType;
    // Mantener espacios vacíos entre elementos
    for (let x = heroX + 1; x < columnX; x++) {
        row3Array[x] = '0';
    }
    for (let x = columnX + 1; x < width - 3; x++) {
        row3Array[x] = '0';
    }
    level[3] = row3Array.join('');
    
    // Fila 4-5: Continuación de la columna (tiles 2 y 3)
    for (let y = 4; y <= 5; y++) {
        const rowArray = Array(width).fill(borderChar);
        rowArray[columnX] = columnType;
        // Mantener espacios alrededor de la columna
        for (let x = 0; x < columnX; x++) {
            if (x < 1) rowArray[x] = borderChar; // Borde izquierdo
            else rowArray[x] = '0';
        }
        for (let x = columnX + 1; x < width - 3; x++) {
            rowArray[x] = '0';
        }
        level[y] = rowArray.join('');
    }
};

/**
 * Genera columnas de 3 tiles a lo largo del nivel
 * Las columnas siempre tienen exactamente 3 tiles de altura
 */
const generateColumnPatterns = (level: string[], width: number, height: number, difficulty: number) => {
    // Número de columnas según dificultad
    const numColumns = Math.min(3 + Math.floor(difficulty / 2), 8);
    
    // Espaciado vertical entre columnas (evitar inicio y final)
    const minY = 7; // Después del patrón de inicio
    const maxY = height - 10; // Antes del patrón final
    
    for (let i = 0; i < numColumns; i++) {
        let attempts = 0;
        while (attempts < 50) {
            const x = Math.floor(Math.random() * (width - 4)) + 2; // Evitar bordes
            const y = minY + Math.floor(Math.random() * (maxY - minY - 3)); // Dejar espacio para 3 tiles
            
            // Verificar que hay espacio para una columna de 3 tiles
            let canPlace = true;
            for (let dy = 0; dy < 3; dy++) {
                if (y + dy >= height - 1 || level[y + dy][x] !== '0') {
                    canPlace = false;
                    break;
                }
            }
            
            // Verificar que hay una plataforma arriba (pared '1')
            if (canPlace && y > 0 && level[y - 1][x] === '1') {
                // Determinar tipo de columna (C destructible o K no destructible)
                const columnType = difficulty > 4 && Math.random() > 0.4 ? 'K' : 'C';
                
                // Colocar columna de 3 tiles
                for (let dy = 0; dy < 3; dy++) {
                    const row = level[y + dy].split('');
                    row[x] = columnType;
                    level[y + dy] = row.join('');
                }
                break;
            }
            attempts++;
        }
    }
};

/**
 * Genera plataformas con altura múltiplo de 3 tiles y espacios vacíos de 3 tiles (raramente múltiplos de 3)
 * Los espacios pueden estar bloqueados por columnas destructibles (C) o de lava (K)
 * Incluye agua/lava (tile '2') y enemigos aleatoriamente
 */
const generatePlatformsWithGaps = (level: string[], width: number, height: number, difficulty: number): Platform[] => {
    const platforms: Platform[] = [];
    
    // Primera plataforma después del inicio (fila 6, después del patrón de inicio que termina en fila 5)
    const firstPlatformY = 6;
    
    // Última posición válida (dejar espacio para final - minero está en height-2)
    const lastValidY = height - 10;
    
    let currentY = firstPlatformY;
    // Ruta principal garantizada: zigzag consistente desde inicio hasta final
    let mainPathX = Math.floor(width / 2); // Iniciar en el centro
    let pathDirection = 1; // 1 = derecha, -1 = izquierda
    const pathStep = Math.floor(width / 8); // Paso del zigzag (más pequeño para caminos más consistentes)
    
    while (currentY < lastValidY) {
        // Determinar altura de esta plataforma (múltiplos de 3: 3, 6, 9, 12, 15)
        const platformHeight = Math.min(
            3 + (Math.floor(Math.random() * 5) * 3), // 3, 6, 9, 12, 15
            15
        );
        
        // Determinar número de huecos en esta plataforma (mínimo 1 garantizado para la ruta principal)
        const numGaps = Math.min(1 + Math.floor(difficulty / 3), 3);
        const gaps: number[] = [];
        
        // Crear la plataforma sólida de múltiples filas
        // IMPORTANTE: Cada fila debe tener al menos un '0' para permitir el descenso
        for (let py = 0; py < platformHeight; py++) {
            const platformRowY = currentY + py;
            
            if (platformRowY >= lastValidY) break;
            
            const row = level[platformRowY].split('');
            
            // Llenar toda la fila con '1' primero (plataforma sólida)
            for (let x = 0; x < width; x++) {
                if (row[x] === '0') {
                    row[x] = '1';
                }
            }
            
            // CRÍTICO: Crear huecos SOLO en la primera iteración (py === 0)
            // Los huecos se extenderán verticalmente a través de TODAS las filas de la plataforma
            // Esto asegura que siempre haya al menos un '0' en cada fila para permitir el descenso
            if (py === 0) {
                // HUECO PRINCIPAL GARANTIZADO - Parte de la ruta principal
                // Este hueco siempre existe para garantizar conectividad
                let mainGapX: number;
                let mainGapWidth: number;
                
                if (platforms.length === 0) {
                    // Primera plataforma: usar posición inicial
                    mainGapX = mainPathX;
                    mainGapWidth = 3; // Hueco de 3 tiles para facilitar el paso
                } else {
                    // Calcular posición del siguiente hueco siguiendo el zigzag
                    // El hueco debe ser alcanzable desde el hueco anterior (con movimiento horizontal del héroe)
                    const previousGap = platforms[platforms.length - 1].gaps[0]; // Hueco principal de la plataforma anterior
                    
                    // Actualizar dirección del zigzag
                    mainPathX += pathDirection * pathStep;
                    
                    // Invertir dirección si nos acercamos a los bordes
                    if (mainPathX >= width - 6) {
                        pathDirection = -1;
                        mainPathX = width - 6;
                    } else if (mainPathX <= 3) {
                        pathDirection = 1;
                        mainPathX = 4;
                    }
                    
                    // Asegurar que el hueco sea alcanzable desde el anterior
                    // El héroe puede moverse hasta 6 tiles horizontalmente entre plataformas
                    const maxHorizontalMove = 6;
                    if (Math.abs(mainPathX - previousGap) > maxHorizontalMove) {
                        // Ajustar para mantener conectividad
                        if (mainPathX > previousGap) {
                            mainPathX = previousGap + maxHorizontalMove;
                        } else {
                            mainPathX = previousGap - maxHorizontalMove;
                        }
                        mainPathX = Math.max(3, Math.min(width - 6, mainPathX));
                    }
                    
                    mainGapX = mainPathX;
                    mainGapWidth = 3; // Hueco mínimo de 3 tiles para garantizar paso
                }
                
                // CRÍTICO: Crear el hueco principal que se extiende verticalmente a través de TODAS las filas
                // Esto garantiza que cada fila tenga al menos un '0' alineado verticalmente
                for (let platformRowOffset = 0; platformRowOffset < platformHeight; platformRowOffset++) {
                    const platformRowToModify = currentY + platformRowOffset;
                    if (platformRowToModify >= lastValidY) break;
                    
                    const rowToModify = level[platformRowToModify].split('');
                    for (let dx = 0; dx < mainGapWidth; dx++) {
                        if (mainGapX + dx < width - 1 && mainGapX + dx >= 1) {
                            rowToModify[mainGapX + dx] = '0';
                        }
                    }
                    level[platformRowToModify] = rowToModify.join('');
                }
                gaps.push(mainGapX);
                
                // HUECOS ADICIONALES OPCIONALES (para dificultad/variación)
                // Solo agregar si no comprometen la ruta principal
                for (let g = 1; g < numGaps; g++) {
        let gapX: number;
                    let gapWidth: number;
                    
                    // Posicionar huecos adicionales lejos del hueco principal
                    const minDistanceFromMain = 5;
                    if (mainGapX < width / 2) {
                        // Si el hueco principal está a la izquierda, poner adicional a la derecha
                        gapX = Math.min(mainGapX + minDistanceFromMain + Math.floor(Math.random() * 4), width - 5);
        } else {
                        // Si está a la derecha, poner adicional a la izquierda
                        gapX = Math.max(mainGapX - minDistanceFromMain - Math.floor(Math.random() * 4), 3);
                    }
                    
                    gapWidth = 1 + Math.floor(Math.random() * 4); // 1-4 tiles
                    
                    // Asegurar que no se solape con otros huecos
                    let tooClose = false;
                    for (const existingGap of gaps) {
                        if (Math.abs(gapX - existingGap) < 6) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (tooClose) continue;
                    
                    // CRÍTICO: Crear el hueco adicional que también se extiende verticalmente
                    // Esto garantiza que todas las filas tengan espacios para el descenso
                    for (let platformRowOffset = 0; platformRowOffset < platformHeight; platformRowOffset++) {
                        const platformRowToModify = currentY + platformRowOffset;
                        if (platformRowToModify >= lastValidY) break;
                        
                        const rowToModify = level[platformRowToModify].split('');
                        for (let dx = 0; dx < gapWidth; dx++) {
                            if (gapX + dx < width - 1 && gapX + dx >= 1) {
                                rowToModify[gapX + dx] = '0';
                            }
                        }
                        level[platformRowToModify] = rowToModify.join('');
                    }
                    
                    gaps.push(gapX);
                }
            }
            
            // Agregar espacio central ocasional (patrón "11111111100111111111")
            if (Math.random() > 0.6 && py === Math.floor(platformHeight / 2)) {
                const centerX = Math.floor(width / 2);
                for (let dx = -1; dx <= 1; dx++) {
                    const x = centerX + dx;
                    if (x >= 1 && x < width - 1 && row[x] === '1') {
                        row[x] = '0';
                    }
                }
            }
            
            level[platformRowY] = row.join('');
        }
        
        // CRÍTICO: Verificar DESPUÉS de crear todos los huecos que cada fila tenga al menos un '0'
        // Esto garantiza que el héroe pueda descender a través de toda la plataforma
        // Verificar cada fila de la plataforma
        for (let checkPy = 0; checkPy < platformHeight; checkPy++) {
            const checkRowY = currentY + checkPy;
            if (checkRowY >= lastValidY) break;
            
            const checkRow = level[checkRowY];
            if (!checkRow.includes('0')) {
                // CRÍTICO: Esta fila no tiene ningún '0', lo que bloquearía el descenso
                // Agregar un hueco de emergencia que se extienda verticalmente
                const emergencyGapX = gaps.length > 0 ? gaps[0] : Math.floor(width / 2);
                const emergencyGapWidth = 3; // 3 tiles para garantizar paso suficiente
                
                // Aplicar el hueco de emergencia a TODAS las filas de la plataforma
                for (let platformRowOffset = 0; platformRowOffset < platformHeight; platformRowOffset++) {
                    const platformRowToModify = currentY + platformRowOffset;
                    if (platformRowToModify >= lastValidY) break;
                    
                    const rowToModify = level[platformRowToModify].split('');
                    for (let dx = 0; dx < emergencyGapWidth; dx++) {
                        if (emergencyGapX + dx < width - 1 && emergencyGapX + dx >= 1) {
                            rowToModify[emergencyGapX + dx] = '0';
                        }
                    }
                    level[platformRowToModify] = rowToModify.join('');
                }
                
                // Agregar este hueco a la lista si no está ya
                if (!gaps.includes(emergencyGapX)) {
                    gaps.push(emergencyGapX);
                }
                
                // Solo necesitamos hacer esto una vez, salir del loop de verificación
                break;
            }
        }
        
        // Guardar el hueco principal de esta plataforma antes de registrarla
        const currentPlatformMainGap = gaps.length > 0 ? gaps[0] : mainPathX;
        
        // Registrar la plataforma (usar la fila superior)
        platforms.push({ y: currentY, gaps });
        
        // Determinar altura del espacio vacío (generalmente 3, raramente múltiplos de 3: 6, 9)
        // 85% probabilidad de 3 tiles, 10% de 6, 5% de 9
        let spaceHeight = 3;
        const spaceRand = Math.random();
        if (spaceRand > 0.95) {
            spaceHeight = 9; // Muy raro
        } else if (spaceRand > 0.85) {
            spaceHeight = 6; // Raro
        }
        
        // Crear el espacio vacío entre plataformas
        const spaceStartY = currentY + platformHeight;
        
        // En el espacio vacío, agregar columnas bloqueadoras (C o K) y agua/lava aleatoriamente
        for (let sy = 0; sy < spaceHeight; sy++) {
            const spaceRowY = spaceStartY + sy;
            
            if (spaceRowY >= lastValidY) break;
            
            const row = level[spaceRowY].split('');
            
            // Agregar columnas bloqueadoras en espacios de 3 tiles
            // Columnas destructibles (C) o de lava (K) que bloquean el paso - siempre de 3 tiles de altura
            // IMPORTANTE: No bloquear la ruta principal
            if (spaceHeight === 3 && sy === 0 && Math.random() > 0.4) {
                // Usar el hueco principal de la plataforma actual para no bloquearlo
                
                // Colocar columna en el espacio (siempre de 3 tiles de altura)
                // Asegurar que no bloquee el hueco principal de la ruta
                let columnX: number;
                let attempts = 0;
                
                // Intentar encontrar una posición que no bloquee la ruta principal
                do {
                    columnX = Math.floor(width / 2) + (Math.random() > 0.5 ? -3 : 3);
                    attempts++;
                    // Asegurar que esté al menos a 3 tiles del hueco principal para no bloquear
                } while (attempts < 10 && Math.abs(columnX - currentPlatformMainGap) < 4);
                
                if (columnX >= 1 && columnX < width - 1 && Math.abs(columnX - currentPlatformMainGap) >= 3) {
                    const columnType = difficulty > 5 && Math.random() > 0.5 ? 'K' : 'C';
                    
                    // Crear columna de exactamente 3 tiles de altura
                    for (let cy = 0; cy < 3 && (spaceStartY + cy) < lastValidY; cy++) {
                        const colRowY = spaceStartY + cy;
                        const colRow = level[colRowY].split('');
                        colRow[columnX] = columnType;
                        level[colRowY] = colRow.join('');
                    }
                }
            }
            
            // Agregar agua/lava (tile '2') aleatoriamente en el suelo del espacio
            // IMPORTANTE: No bloquear completamente la ruta principal
            if (sy === spaceHeight - 1 && Math.random() > 0.7) {
                // Usar el hueco principal de la plataforma actual (ya guardado arriba)
                
                // Agregar pequeñas áreas de agua/lava (2-4 tiles)
                // Evitar colocar agua directamente en la ruta principal o muy cerca
                let waterStart: number;
                let waterWidth: number;
                let attempts = 0;
                
                do {
                    waterStart = Math.floor(Math.random() * (width - 6)) + 2;
                    waterWidth = 2 + Math.floor(Math.random() * 3); // 2-4 tiles
                    attempts++;
                    // Evitar que el agua bloquee la ruta principal (dejar al menos 2 tiles de espacio)
                } while (attempts < 10 && 
                         waterStart <= currentPlatformMainGap + 3 && 
                         waterStart + waterWidth >= currentPlatformMainGap - 2);
                
                // Si después de 10 intentos no encontramos una posición segura, usar una posición lejos de la ruta
                if (attempts >= 10) {
                    if (currentPlatformMainGap < width / 2) {
                        // Si la ruta está a la izquierda, poner agua a la derecha
                        waterStart = width - 6;
                    } else {
                        // Si la ruta está a la derecha, poner agua a la izquierda
                        waterStart = 2;
                    }
                    waterWidth = 2;
                }
                
                // Crear el área de agua/lava
                for (let wx = 0; wx < waterWidth; wx++) {
                    if (waterStart + wx < width - 1 && waterStart + wx >= 1) {
                        row[waterStart + wx] = '2';
                    }
                }
            }
            
            level[spaceRowY] = row.join('');
        }
        
        // Avanzar: altura de plataforma + altura del espacio vacío
        currentY += platformHeight + spaceHeight;
    }
    
    return platforms;
};

/**
 * Genera el patrón de final - Estructura consistente con el minero
 * Patrón observado en niveles originales:
 * - Antepenúltima fila: "110000S0000000001111" o similar (espacios con enemigos opcionales)
 * - Penúltima fila: "11000000000000001111" o "11900000000000001111" (minero '9' en posición 2 o cerca)
 * - Última fila: Todo '1' (borde inferior)
 */
const generateEndPattern = (level: string[], width: number, height: number) => {
    // Última fila ya está completa con '1' (borde inferior)
    
    // Penúltima fila: Colocar minero siguiendo el patrón "11900000000000001111"
    // Patrón: '11' inicio + minero '9' en posición 2 + espacios + '1111' final
    const minerY = height - 2;
    const minerX = 2; // Posición fija del minero (como en niveles originales)
    
    // Limpiar espacio alrededor del minero (3x3)
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const mx = minerX + dx;
            const my = minerY + dy;
            if (mx >= 0 && mx < width && my >= 0 && my < height) {
                const row = level[my].split('');
                if (row[mx] === '1' || row[mx] === '0') {
                    row[mx] = '0';
                }
                level[my] = row.join('');
            }
        }
    }
    
    // Colocar el minero
    const row = level[minerY].split('');
    row[minerX] = '9';
    // Asegurar bordes: '11' inicio y '1111' final
    row[0] = '1';
    row[1] = '1';
    for (let x = minerX + 1; x < width - 4; x++) {
        if (row[x] === '1') row[x] = '0'; // Espacios entre minero y borde final
    }
    row[width - 4] = '1';
    row[width - 3] = '1';
    row[width - 2] = '1';
    row[width - 1] = '1';
    level[minerY] = row.join('');
    
    // Antepenúltima fila: Patrón "110000S0000000001111" o similar
    // Espacios con posibles enemigos (serán colocados después por placeEnemiesOnPlatforms)
    const antepenultimateY = height - 3;
    if (antepenultimateY > 0) {
        const row = level[antepenultimateY].split('');
        // Asegurar bordes: '11' inicio y '1111' final
        row[0] = '1';
        row[1] = '1';
        // Mantener espacios en el centro (ya están como '0' por defecto)
        row[width - 4] = '1';
        row[width - 3] = '1';
        row[width - 2] = '1';
        row[width - 1] = '1';
        level[antepenultimateY] = row.join('');
    }
};

interface Platform {
    y: number;
    gaps: number[];
}

/**
 * Coloca enemigos siguiendo los patrones de los niveles originales
 */
const placeEnemiesOnPlatforms = (level: string[], width: number, height: number, difficulty: number, platforms: Platform[]) => {
    // Calcular número de enemigos según dificultad
    const spiderCount = Math.min(2 + Math.floor(difficulty / 2), 8);
    const viperCount = Math.min(1 + Math.floor(difficulty / 3), 5);
    const batCount = Math.min(1 + Math.floor(difficulty / 4), 4);
    
    // Colocar arañas - deben colgar de plataformas
    for (let i = 0; i < spiderCount; i++) {
        placeSpider(level, width, height, platforms);
    }
    
    // Colocar víboras - deben estar en paredes
    for (let i = 0; i < viperCount; i++) {
        placeViper(level, width, height);
    }
    
    // Colocar murciélagos - vuelan en espacios
    for (let i = 0; i < batCount; i++) {
        placeBat(level, width, height);
    }
};

const placeSpider = (level: string[], width: number, height: number, platforms: Platform[]) => {
    let attempts = 0;
    
    // Intentar colocar en plataformas conocidas primero
    for (const platform of platforms) {
        if (attempts >= 30) break;
        
        for (const gapX of platform.gaps) {
            // Colocar araña cerca de los huecos de las plataformas
            const spiderX = gapX + Math.floor(Math.random() * 3) - 1; // Variación pequeña
            const spiderY = platform.y + 1; // Justo debajo de la plataforma
            
            if (spiderX >= 1 && spiderX < width - 1 && 
                spiderY < height - 1 && 
                level[spiderY][spiderX] === '0' &&
                level[platform.y][spiderX] === '1') {
                const row = level[spiderY].split('');
                row[spiderX] = 'S';
                level[spiderY] = row.join('');
                return;
            }
            attempts++;
        }
    }
    
    // Fallback: colocación aleatoria tradicional
    while (attempts < 50) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        if (y > 0 && y < height - 2 && 
            level[y - 1][x] === '1' && 
            level[y][x] === '0' &&
            level[y + 1] && level[y + 1][x] === '0') {
            const row = level[y].split('');
            row[x] = 'S';
            level[y] = row.join('');
            return;
        }
        attempts++;
    }
};

const placeViper = (level: string[], width: number, height: number) => {
    let attempts = 0;
    
    while (attempts < 50) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Verificar que haya una pared a la izquierda o derecha
        const hasLeftWall = x > 1 && level[y][x - 1] === '1';
        const hasRightWall = x < width - 2 && level[y][x + 1] === '1';
        
        if ((hasLeftWall || hasRightWall) && 
            y > 0 && y < height - 1 &&
            level[y][x] === '0') {
            const row = level[y].split('');
            row[x] = 'V';
            level[y] = row.join('');
            return;
        }
        attempts++;
    }
};

const placeBat = (level: string[], width: number, height: number) => {
    let attempts = 0;
    
    while (attempts < 50) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Los murciélagos pueden estar en espacios vacíos
        if (y > 0 && y < height - 1 &&
            level[y][x] === '0') {
            const row = level[y].split('');
            row[x] = '8';
            level[y] = row.join('');
            return;
        }
        attempts++;
    }
};

/**
 * Agrega obstáculos variados manteniendo la estructura base
 * Nota: El agua/lava ya se agrega en generatePlatformsWithGaps, aquí solo agregamos elementos adicionales
 */
const addVariedObstacles = (level: string[], width: number, height: number, difficulty: number, platforms: Platform[]) => {
    // Agregar agua/lava adicional ocasionalmente en espacios entre plataformas
    const extraWaterCount = Math.min(Math.floor(difficulty / 4), 3);
    for (let i = 0; i < extraWaterCount; i++) {
        addWaterObstacle(level, width, height);
    }
    
    // Agregar luces (tile 'L') ocasionalmente
    if (difficulty > 3 && Math.random() > 0.5) {
        addLight(level, width, height);
    }
};

const addWaterObstacle = (level: string[], width: number, height: number) => {
    let attempts = 0;
    
    while (attempts < 30) {
        const x = Math.floor(Math.random() * (width - 6)) + 3;
        const y = Math.floor(Math.random() * (height - 8)) + 4;
        
        // Verificar que estamos en un espacio vacío
        if (level[y][x] === '0' && level[y][x + 1] === '0') {
            // Crear obstáculo de agua de 2-3 tiles
            const blockLength = Math.random() > 0.5 ? 2 : 3;
            let canPlace = true;
            
            for (let dx = 0; dx < blockLength; dx++) {
                if (x + dx >= width - 1 || level[y][x + dx] !== '0') {
                    canPlace = false;
                    break;
                }
            }
            
            if (canPlace) {
                const row = level[y].split('');
                for (let dx = 0; dx < blockLength; dx++) {
                    row[x + dx] = '2';
                }
                level[y] = row.join('');
                return;
            }
        }
        attempts++;
    }
};

const addLight = (level: string[], width: number, height: number) => {
    let attempts = 0;
    
    while (attempts < 30) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Las luces van en espacios vacíos, preferiblemente cerca de paredes
        if (level[y][x] === '0') {
            const hasNearbyWall = 
                (x > 0 && level[y][x - 1] === '1') ||
                (x < width - 1 && level[y][x + 1] === '1');
            
            if (hasNearbyWall) {
                const row = level[y].split('');
                row[x] = 'L';
                level[y] = row.join('');
                return;
            }
        }
        attempts++;
    }
};
