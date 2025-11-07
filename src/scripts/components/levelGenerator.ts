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
    // CRÍTICO: Tanto C (destructible) como K (lava) siempre tienen exactamente 3 tiles de altura
    const heroX = 2; // Posición del héroe (después de '1')
    const columnX = 7; // Posición fija de la columna (posición 7 como en los niveles originales)
    
    // Determinar tipo de borde y columna según dificultad
    // Niveles bajos: '1' y 'C', niveles altos: '3' y 'K'
    const borderChar = difficulty > 5 ? '3' : '1';
    const columnType = difficulty > 5 ? 'K' : 'C';
    
    // Fila 3: Héroe y inicio de columna (tile 1 de 3)
    // Patrón: borderChar + '0' + 'P' + '0000' + columnType + espacios + borderChar*3
    // CRÍTICO: La columna empieza justo después de la plataforma (fila 2) y tiene 3 tiles
    const row3Array = Array(width).fill(borderChar);
    row3Array[heroX] = 'P';
    row3Array[columnX] = columnType; // Tile 1 de la columna (C o K)
    // Mantener espacios vacíos entre elementos
    for (let x = heroX + 1; x < columnX; x++) {
        row3Array[x] = '0';
    }
    for (let x = columnX + 1; x < width - 3; x++) {
        row3Array[x] = '0';
    }
    level[3] = row3Array.join('');
    
    // Fila 4-5: Continuación de la columna (tiles 2 y 3 de 3)
    // CRÍTICO: Estas dos filas completan la columna de 3 tiles (C o K)
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
 * CRÍTICO: Tanto las columnas destructibles (C) como las de lava (K) tienen exactamente 3 tiles
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
            
            // Verificar que hay una plataforma arriba (pared '1')
            // CRÍTICO: La columna debe empezar justo después de la plataforma (y)
            // y tener exactamente 3 tiles de altura, sin espacios vacíos arriba
            const hasPlatformAbove = y > 0 && level[y - 1][x] === '1';
            
            if (!hasPlatformAbove) {
                attempts++;
                continue;
            }
            
            // Verificar que hay espacio para exactamente 3 tiles de columna
            // Las 3 filas deben estar vacías (tile '0') y dentro de los límites
            let canPlace = true;
            for (let dy = 0; dy < 3; dy++) {
                const checkY = y + dy;
                if (checkY >= height - 1 || level[checkY][x] !== '0') {
                    canPlace = false;
                    break;
                }
            }
            
            if (canPlace) {
                // Determinar tipo de columna (C destructible o K lava)
                // CRÍTICO: Tanto C como K tienen exactamente 3 tiles de altura
                const columnType = difficulty > 4 && Math.random() > 0.4 ? 'K' : 'C';
                
                // CRÍTICO: Colocar columna de exactamente 3 tiles de altura
                // Empezar justo después de la plataforma (y), sin espacios vacíos arriba
                // Esto aplica tanto para C (destructible) como para K (lava)
                for (let dy = 0; dy < 3; dy++) {
                    const colRowY = y + dy;
                    if (colRowY < height - 1) {
                        const row = level[colRowY].split('');
                        row[x] = columnType; // C o K, ambos con 3 tiles
                        level[colRowY] = row.join('');
                    }
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
    // Esta ruta está diseñada para que el héroe tenga que encontrar el camino correcto
    // Las columnas bloquean caminos secundarios, forzando al héroe a seguir el zigzag
    let mainPathX = Math.floor(width / 2); // Iniciar en el centro
    let pathDirection = 1; // 1 = derecha, -1 = izquierda
    const pathStep = Math.floor(width / 6); // Paso del zigzag (más pronunciado para crear desafío)
    
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
                
                // HUECOS ADICIONALES OPCIONALES (caminos secundarios que pueden ser callejones sin salida)
                // Estos caminos pueden estar bloqueados más adelante o llevar a lugares peligrosos
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
                    
                    gapWidth = 1 + Math.floor(Math.random() * 3); // 1-3 tiles (más estrechos que el principal)
                    
                    // Asegurar que no se solape con otros huecos
                    let tooClose = false;
                    for (const existingGap of gaps) {
                        if (Math.abs(gapX - existingGap) < 6) {
                            tooClose = true;
                            break;
                        }
                    }
                    if (tooClose) continue;
                    
                    // Crear el hueco adicional que también se extiende verticalmente
                    // Marcar estos como caminos secundarios (pueden ser bloqueados después)
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
        // CRÍTICO: El espacio mínimo debe ser de 3 tiles para que el héroe pueda pasar
        // 85% probabilidad de 3 tiles, 10% de 6, 5% de 9
        // NUNCA menos de 3 tiles
        let spaceHeight = 3;
        const spaceRand = Math.random();
        if (spaceRand > 0.95) {
            spaceHeight = 9; // Muy raro
        } else if (spaceRand > 0.85) {
            spaceHeight = 6; // Raro
        }
        // Asegurar mínimo de 3 tiles
        spaceHeight = Math.max(3, spaceHeight);
        
        // Crear el espacio vacío entre plataformas
        const spaceStartY = currentY + platformHeight;
        
        // En el espacio vacío, agregar columnas bloqueadoras (C o K) y agua/lava aleatoriamente
        for (let sy = 0; sy < spaceHeight; sy++) {
            const spaceRowY = spaceStartY + sy;
            
            if (spaceRowY >= lastValidY) break;
            
            const row = level[spaceRowY].split('');
            
            // Agregar columnas bloqueadoras en espacios de 3 tiles
            // Columnas destructibles (C) o de lava (K) que bloquean el paso - SIEMPRE de 3 tiles de altura
            // CRÍTICO: Tanto C (destructible) como K (lava) tienen exactamente 3 tiles de altura
            // Estas columnas pueden bloquear caminos secundarios (creando callejones sin salida)
            // pero NUNCA bloquean la ruta principal garantizada
            // IMPORTANTE: Las columnas funcionan como obstáculos para forzar al héroe a encontrar el camino correcto
            // CRÍTICO: Las columnas deben empezar justo después de la plataforma superior (spaceStartY)
            // y tener exactamente 3 tiles de altura, sin espacios vacíos arriba (aplica para C y K)
            if (spaceHeight >= 3 && sy === 0) {
                // Determinar si esta columna bloqueará un camino secundario o solo será decorativa
                // Aumentar probabilidad de bloquear caminos secundarios para crear desafío
                const shouldBlockPath = Math.random() > 0.3; // 70% de chance de bloquear un camino secundario
                
                let columnX: number;
                let attempts = 0;
                
                if (shouldBlockPath && gaps.length > 1) {
                    // Bloquear un camino secundario (no el principal que está en gaps[0])
                    // Elegir aleatoriamente uno de los caminos secundarios
                    const secondaryGapIndex = 1 + Math.floor(Math.random() * (gaps.length - 1));
                    const targetGapX = gaps[secondaryGapIndex];
                    
                    // Colocar columna directamente sobre el camino secundario para bloquearlo
                    // Esto fuerza al héroe a usar el camino principal
                    columnX = targetGapX + Math.floor(Math.random() * 3) - 1; // Pequeña variación
                    columnX = Math.max(1, Math.min(width - 2, columnX));
                } else {
                    // Columna decorativa/bloqueadora aleatoria (no bloquea la ruta principal)
                    // Colocar columnas estratégicamente para crear obstáculos que obliguen al héroe
                    // a encontrar el camino correcto (zigzag)
                    do {
                        // Colocar columnas cerca del centro pero no en la ruta principal
                        // Esto crea un patrón de obstáculos que guía al héroe
                        const centerOffset = Math.floor(width / 4);
                        columnX = currentPlatformMainGap + (Math.random() > 0.5 ? centerOffset : -centerOffset);
                        columnX = Math.max(1, Math.min(width - 2, columnX));
                        attempts++;
                        // Asegurar que esté al menos a 4 tiles del hueco principal para no bloquear
                    } while (attempts < 10 && Math.abs(columnX - currentPlatformMainGap) < 4);
                }
                
                if (columnX >= 1 && columnX < width - 1) {
                    // Verificar que hay plataforma arriba (debe ser '1' en spaceStartY - 1)
                    const hasPlatformAbove = spaceStartY > 0 && 
                                           spaceStartY - 1 >= 0 && 
                                           level[spaceStartY - 1][columnX] === '1';
                    
                    // Verificar que hay espacio para exactamente 3 tiles de columna
                    // La columna debe empezar en spaceStartY (primera fila del espacio vacío)
                    // y ocupar exactamente 3 filas consecutivas
                    let canPlaceColumn = hasPlatformAbove;
                    if (canPlaceColumn) {
                        // Verificar que las 3 filas están vacías y dentro del espacio
                        for (let cy = 0; cy < 3; cy++) {
                            const checkRowY = spaceStartY + cy;
                            if (checkRowY >= height - 1 || checkRowY >= lastValidY) {
                                canPlaceColumn = false;
                                break;
                            }
                            if (level[checkRowY][columnX] !== '0') {
                                canPlaceColumn = false;
                                break;
                            }
                        }
                    }
                    
                    if (canPlaceColumn) {
                        // Si está bloqueando un camino secundario, usar K (lava) más frecuentemente
                        // Si es decorativa, usar C o K según dificultad
                        // CRÍTICO: Tanto C como K tienen exactamente 3 tiles de altura
                        const isBlockingSecondary = shouldBlockPath && gaps.length > 1 && 
                                                    Math.abs(columnX - (gaps.length > 1 ? gaps[1] : currentPlatformMainGap)) < 3;
                        const columnType = (isBlockingSecondary && Math.random() > 0.3) || 
                                          (difficulty > 5 && Math.random() > 0.5) ? 'K' : 'C';
                        
                        // CRÍTICO: Crear columna de exactamente 3 tiles de altura
                        // Empezar justo después de la plataforma superior (spaceStartY)
                        // Sin espacios vacíos arriba - la columna debe tocar la plataforma
                        // Esto aplica tanto para C (destructible) como para K (lava)
                        for (let cy = 0; cy < 3; cy++) {
                            const colRowY = spaceStartY + cy;
                            if (colRowY < height - 1 && colRowY < lastValidY) {
                                const colRow = level[colRowY].split('');
                                colRow[columnX] = columnType; // C o K, ambos con 3 tiles
                                level[colRowY] = colRow.join('');
                            }
                        }
                    }
                }
            }
            
            // Agregar agua/lava (tile '2') aleatoriamente en el suelo del espacio
            // CRÍTICO: El agua SIEMPRE debe estar a la altura del piso (última fila del espacio)
            // Nunca puede haber agua suelta ni en el techo
            // Puede colocarse en caminos secundarios para crear trampas, pero NUNCA en la ruta principal
            if (sy === spaceHeight - 1) {
                // Verificar que esta es realmente la última fila del espacio (suelo)
                // y que hay una plataforma debajo (siguiente plataforma o borde inferior)
                const isFloorLevel = (spaceRowY === height - 2) || 
                                    (spaceRowY < height - 1 && level[spaceRowY + 1] && 
                                     level[spaceRowY + 1].split('').some(c => c === '1'));
                
                if (isFloorLevel) {
                    const waterChance = 0.5; // 50% de chance de agregar agua/lava
                    const shouldTrapSecondary = gaps.length > 1 && Math.random() > 0.4; // 60% de chance si hay caminos secundarios
                    
                    if (Math.random() < waterChance) {
                        let waterStart: number;
                        let waterWidth: number;
                        let attempts = 0;
                        
                        if (shouldTrapSecondary && gaps.length > 1) {
                            // Colocar agua/lava en un camino secundario para crear una trampa
                            const trapGapIndex = 1 + Math.floor(Math.random() * (gaps.length - 1));
                            const trapGapX = gaps[trapGapIndex];
                            waterStart = Math.max(1, trapGapX - 1);
                            waterWidth = 2 + Math.floor(Math.random() * 2); // 2-3 tiles
                        } else {
                            // Agua/lava aleatoria pero evitando la ruta principal
                            do {
                                waterStart = Math.floor(Math.random() * (width - 6)) + 2;
                                waterWidth = 2 + Math.floor(Math.random() * 3); // 2-4 tiles
                                attempts++;
                                // Evitar que el agua bloquee la ruta principal (dejar al menos 3 tiles de espacio)
                            } while (attempts < 10 && 
                                     waterStart <= currentPlatformMainGap + 3 && 
                                     waterStart + waterWidth >= currentPlatformMainGap - 2);
                            
                            // Si después de 10 intentos no encontramos una posición segura, usar una posición lejos de la ruta
                            if (attempts >= 10) {
                                if (currentPlatformMainGap < width / 2) {
                                    waterStart = width - 6;
                                } else {
                                    waterStart = 2;
                                }
                                waterWidth = 2;
                            }
                        }
                        
                        // Crear el área de agua/lava SOLO en el suelo
                        for (let wx = 0; wx < waterWidth; wx++) {
                            if (waterStart + wx < width - 1 && waterStart + wx >= 1) {
                                row[waterStart + wx] = '2';
                            }
                        }
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
 * 
 * IMPORTANTE: El minero siempre está en un rincón con piso debajo
 */
const generateEndPattern = (level: string[], width: number, height: number) => {
    // Última fila ya está completa con '1' (borde inferior - esto es el piso)
    
    // Penúltima fila: Colocar minero siguiendo el patrón "11900000000000001111"
    // Patrón: '11' inicio + minero '9' en posición 2 + espacios + '1111' final
    const minerY = height - 2;
    const minerX = 2; // Posición fija del minero en el rincón (como en niveles originales)
    
    // Asegurar que hay piso debajo del minero (última fila ya es '1')
    // Limpiar espacio alrededor del minero (3x3) pero mantener el piso
    for (let dy = -1; dy <= 0; dy++) { // Solo limpiar arriba y en la misma fila, no abajo
        for (let dx = -1; dx <= 1; dx++) {
            const mx = minerX + dx;
            const my = minerY + dy;
            if (mx >= 0 && mx < width && my >= 0 && my < height - 1) { // No tocar la última fila (piso)
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
    // CRÍTICO: Solo colocar enemigos en lugares accesibles desde el camino principal
    for (const platform of platforms) {
        if (attempts >= 30) break;
        
        // Priorizar el hueco principal (gaps[0]) para asegurar accesibilidad
        const mainGapX = platform.gaps[0];
        if (mainGapX !== undefined) {
            // Colocar araña cerca del hueco principal (accesible)
            const spiderX = mainGapX + Math.floor(Math.random() * 5) - 2; // Variación pequeña alrededor del hueco
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
        
        // También intentar con otros huecos si hay
        for (let g = 1; g < platform.gaps.length; g++) {
            const gapX = platform.gaps[g];
            const spiderX = gapX + Math.floor(Math.random() * 3) - 1;
            const spiderY = platform.y + 1;
            
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
    
    // Fallback: colocación aleatoria tradicional, pero verificando accesibilidad
    while (attempts < 50) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Verificar que es accesible: debe haber un camino vertical de al menos 3 tiles
        let isAccessible = true;
        let verticalSpace = 0;
        for (let checkY = y; checkY < height - 1; checkY++) {
            if (level[checkY][x] === '0') {
                verticalSpace++;
            } else {
                break;
            }
        }
        
        // Verificar que hay espacio vertical suficiente (mínimo 3 tiles)
        if (verticalSpace < 3) {
            isAccessible = false;
        }
        
        if (isAccessible && y > 0 && y < height - 2 && 
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
    
    // Las víboras deben estar entre dos tiles de terreno a lo alto:
    // 111  (tile '1' arriba)
    // 11V  (víbora 'V' en espacio '0')
    // 111  (tile '1' abajo)
    // CRÍTICO: Deben ser accesibles (el héroe debe poder llegar hasta ellas)
    while (attempts < 100) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 8)) + 4; // Dejar espacio arriba y abajo
        
        // Verificar el patrón: arriba y abajo deben ser '1', el medio debe ser '0'
        const hasTopTerrain = y > 0 && level[y - 1][x] === '1';
        const hasBottomTerrain = y < height - 1 && level[y + 1][x] === '1';
        const isEmptySpace = level[y][x] === '0';
        
        // Verificar también que los lados no bloqueen (opcional pero mejor gameplay)
        const hasSideSpace = (x > 0 && level[y][x - 1] === '0') || 
                            (x < width - 1 && level[y][x + 1] === '0');
        
        // CRÍTICO: Verificar accesibilidad - debe haber un pasillo de al menos 3 tiles de altura
        // Verificar espacio vertical arriba y abajo
        let verticalSpaceAbove = 0;
        for (let checkY = y - 1; checkY >= 0 && level[checkY][x] === '0'; checkY--) {
            verticalSpaceAbove++;
        }
        
        let verticalSpaceBelow = 0;
        for (let checkY = y + 1; checkY < height && level[checkY][x] === '0'; checkY++) {
            verticalSpaceBelow++;
        }
        
        // El espacio total debe ser al menos 3 tiles (el héroe tiene 2 tiles de altura)
        const totalVerticalSpace = verticalSpaceAbove + 1 + verticalSpaceBelow; // +1 por el tile de la víbora
        
        if (hasTopTerrain && hasBottomTerrain && isEmptySpace && hasSideSpace && totalVerticalSpace >= 3) {
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
    
    // CRÍTICO: Los murciélagos deben estar en espacios accesibles
    // Deben tener al menos 3 tiles de altura vertical para que el héroe pueda alcanzarlos
    while (attempts < 100) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Verificar que el tile esté vacío (no puede ser lava/agua, paredes, etc.)
        if (y <= 0 || y >= height - 1 || level[y][x] !== '0') {
            attempts++;
            continue;
        }
        
        // CRÍTICO: Verificar accesibilidad vertical - debe haber al menos 3 tiles de altura libre
        let verticalSpaceAbove = 0;
        for (let checkY = y - 1; checkY >= 0 && level[checkY][x] === '0'; checkY--) {
            verticalSpaceAbove++;
        }
        
        let verticalSpaceBelow = 0;
        for (let checkY = y + 1; checkY < height && level[checkY][x] === '0'; checkY++) {
            verticalSpaceBelow++;
        }
        
        const totalVerticalSpace = verticalSpaceAbove + 1 + verticalSpaceBelow; // +1 por el tile del murciélago
        
        // Debe haber al menos 3 tiles de altura vertical
        if (totalVerticalSpace < 3) {
            attempts++;
            continue;
        }
        
        // Verificar que no esté demasiado cerca de lava (3 tiles de radio)
        let tooCloseToLava = false;
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const checkY = y + dy;
                const checkX = x + dx;
                if (checkY >= 0 && checkY < height && checkX >= 0 && checkX < width) {
                    if (level[checkY][checkX] === '2') {
                        tooCloseToLava = true;
                        break;
                    }
                }
            }
            if (tooCloseToLava) break;
        }
        
        if (tooCloseToLava) {
            attempts++;
            continue;
        }
        
        // Verificar que tenga espacio para moverse (al menos 2 tiles libres a cada lado)
        const minSpace = 2;
        let hasSpaceLeft = true;
        let hasSpaceRight = true;
        
        for (let dx = 1; dx <= minSpace; dx++) {
            if (x - dx < 0 || level[y][x - dx] !== '0') {
                hasSpaceLeft = false;
                break;
            }
            // También verificar que no sea lava
            if (level[y][x - dx] === '2') {
                hasSpaceLeft = false;
                break;
            }
        }
        
        for (let dx = 1; dx <= minSpace; dx++) {
            if (x + dx >= width || level[y][x + dx] !== '0') {
                hasSpaceRight = false;
                break;
            }
            // También verificar que no sea lava
            if (level[y][x + dx] === '2') {
                hasSpaceRight = false;
                break;
            }
        }
        
        // Colocar solo si tiene espacio suficiente en al menos una dirección
        if (hasSpaceLeft || hasSpaceRight) {
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
    
    // CRÍTICO: El agua siempre debe estar a la altura del piso
    // Verificar que hay piso debajo (tile '1' o borde inferior)
    while (attempts < 30) {
        const x = Math.floor(Math.random() * (width - 6)) + 3;
        const y = Math.floor(Math.random() * (height - 8)) + 4;
        
        // Verificar que estamos en un espacio vacío
        if (level[y][x] === '0' && level[y][x + 1] === '0') {
            // CRÍTICO: Verificar que hay piso debajo (no puede haber agua suelta)
            const hasFloorBelow = (y === height - 2) || // Última fila antes del borde (borde es piso)
                                 (y < height - 1 && level[y + 1] && 
                                  level[y + 1].split('').some((c, idx) => 
                                      (idx >= x && idx < x + 3) && (c === '1' || c === '3')));
            
            // También verificar que NO hay piso arriba (no puede estar en el techo)
            const hasCeilingAbove = y > 0 && level[y - 1] && 
                                   level[y - 1].split('').some((c, idx) => 
                                       (idx >= x && idx < x + 3) && (c === '1' || c === '3'));
            
            if (!hasFloorBelow || hasCeilingAbove) {
                attempts++;
                continue;
            }
            
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
