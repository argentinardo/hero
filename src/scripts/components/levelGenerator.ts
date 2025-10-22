import { TILE_SIZE } from '../core/constants';

export interface LevelGeneratorOptions {
    width: number;
    height: number;
    difficulty: number; // 1-10
}

export const generateLevel = (options: LevelGeneratorOptions): string[] => {
    const { width, height, difficulty } = options;
    const level: string[] = [];
    
    // Inicializar nivel completamente vacío
    for (let y = 0; y < height; y++) {
        level[y] = '0'.repeat(width);
    }
    
    // Crear bordes laterales completos (100% del ancho)
    for (let y = 0; y < height; y++) {
        level[y] = '1'.repeat(width);
    }
    
    // Crear borde superior
    level[0] = '1'.repeat(width);
    
    // Crear borde inferior
    level[height - 1] = '1'.repeat(width);
    
    // Generar plataformas con espacios de EXACTAMENTE 3 tiles
    const platforms = generatePlatformsWithGaps(level, width, height, difficulty);
    
    // Colocar player en la parte superior
    placePlayer(level, width);
    
    // Colocar minero en la parte inferior
    placeMiner(level, width, height);
    
    // Colocar enemigos en las plataformas
    placeEnemiesOnPlatforms(level, width, height, difficulty);
    
    // Agregar bloques destructibles para bloquear caminos
    addBlockingDestructibles(level, width, height, difficulty, platforms);
    
    return level;
};

interface Platform {
    y: number;
    gaps: number[];
}

const generatePlatformsWithGaps = (level: string[], width: number, height: number, difficulty: number): Platform[] => {
    const platforms: Platform[] = [];
    
    // Calcular número de plataformas - SIEMPRE con espacios de 3 tiles entre ellas
    // Estructura: Plataforma (1 tile) + Espacio vacío (3 tiles) = 4 tiles por ciclo
    const platformSpacing = 4; // 1 fila de plataforma + 3 espacios vacíos
    
    // Primera plataforma después del player (fila 1) + 3 espacios = fila 5
    const firstPlatformY = 5; // Borde(0) + Player(1) + 3 vacíos(2,3,4) + plataforma(5)
    
    // Última posición válida (dejar espacio para 3 tiles vacíos + minero + borde)
    const lastValidY = height - 6; // altura - 6 para dejar espacio al final
    
    const numPlatforms = Math.floor((lastValidY - firstPlatformY) / platformSpacing) + 1;
    
    let lastGapX = Math.floor(width / 2); // Posición inicial del hueco
    
    for (let i = 0; i < numPlatforms; i++) {
        const platformY = firstPlatformY + (i * platformSpacing);
        
        if (platformY >= lastValidY) break; // No crear plataforma muy cerca del fondo
        
        // Crear plataforma completa (ya está llena de '1' por los bordes)
        // No necesitamos cambiar nada aquí ya que el nivel ya está lleno de '1'
        
        // Determinar posición del hueco principal
        let gapX: number;
        const minDistance = Math.floor(width / 5);
        const maxDistance = Math.floor(width / 3);
        
        // Alternar el hueco entre izquierda y derecha
        if (i % 2 === 0) {
            // Mover hacia la derecha
            gapX = Math.min(lastGapX + minDistance + Math.floor(Math.random() * (maxDistance - minDistance)), width - 4);
        } else {
            // Mover hacia la izquierda
            gapX = Math.max(lastGapX - minDistance - Math.floor(Math.random() * (maxDistance - minDistance)), 3);
        }
        
        const gaps: number[] = [gapX];
        
        // Crear el hueco principal (3 tiles de ancho)
        for (let dx = 0; dx < 3; dx++) {
            if (gapX + dx < width - 1) {
                level[platformY] = level[platformY].substring(0, gapX + dx) + '0' + level[platformY].substring(gapX + dx + 1);
            }
        }
        
        lastGapX = gapX;
        
        // En dificultad alta, crear un hueco adicional
        if (difficulty > 5 && Math.random() > 0.5) {
            let extraGapX: number;
            if (gapX < width / 2) {
                // Si el hueco principal está a la izquierda, poner el extra a la derecha
                extraGapX = Math.min(gapX + width / 3, width - 5);
            } else {
                // Si el hueco principal está a la derecha, poner el extra a la izquierda
                extraGapX = Math.max(gapX - width / 3, 3);
            }
            
            // Asegurar que no se solape con el hueco principal
            if (Math.abs(extraGapX - gapX) > 5) {
                for (let dx = 0; dx < 3; dx++) {
                    if (extraGapX + dx < width - 1) {
                        level[platformY] = level[platformY].substring(0, extraGapX + dx) + '0' + level[platformY].substring(extraGapX + dx + 1);
                    }
                }
                gaps.push(extraGapX);
            }
        }
        
        platforms.push({ y: platformY, gaps });
    }
    
    return platforms;
};

const placePlayer = (level: string[], width: number) => {
    // Colocar el jugador más hacia el centro para que se vea correctamente
    const x = Math.floor(width / 2); // Centro horizontal del nivel
    const y = 1;
    // Limpiar el espacio del jugador (crear un hueco de 3x3)
    for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (px < width && py < level.length) {
                level[py] = level[py].substring(0, px) + '0' + level[py].substring(px + 1);
            }
        }
    }
    // Colocar el jugador
    level[y] = level[y].substring(0, x) + 'P' + level[y].substring(x + 1);
};

const placeMiner = (level: string[], width: number, height: number) => {
    // Colocar minero en la última fila antes del borde, pegado al extremo (izquierda o derecha)
    // Ejemplo: 1.......1
    //          1.......1  <- 3 tiles vacíos arriba
    //          1......91  <- Minero pegado al extremo derecho
    //          1========1 <- Borde inferior
    
    // Colocar el minero en el centro para mejor visibilidad
    const minerX = Math.floor(width / 2); // Centro horizontal del nivel
    
    // Posición vertical: última fila antes del borde inferior
    const minerY = height - 2; // Justo antes del borde inferior
    
    // Limpiar un espacio de 3x3 alrededor del minero
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const mx = minerX + dx;
            const my = minerY + dy;
            if (mx >= 0 && mx < width && my >= 0 && my < height) {
                level[my] = level[my].substring(0, mx) + '0' + level[my].substring(mx + 1);
            }
        }
    }
    
    // Colocar el minero
    level[minerY] = level[minerY].substring(0, minerX) + '9' + level[minerY].substring(minerX + 1);
};

const placeEnemiesOnPlatforms = (level: string[], width: number, height: number, difficulty: number) => {
    // Calcular número de enemigos según dificultad (incrementados para más desafío)
    const spiderCount = Math.min(2 + Math.floor(difficulty / 2), 6);
    const viperCount = Math.min(1 + Math.floor(difficulty / 3), 4);
    const batCount = Math.min(1 + Math.floor(difficulty / 4), 3);
    
    // Colocar arañas - deben colgar de plataformas
    for (let i = 0; i < spiderCount; i++) {
        placeSpider(level, width, height);
    }
    
    // Colocar víboras - deben estar en paredes
    for (let i = 0; i < viperCount; i++) {
        placeViper(level, width, height);
    }
    
    // Colocar murciélagos - vuelan en espacios de 3 tiles
    for (let i = 0; i < batCount; i++) {
        placeBat(level, width, height);
    }
};

const placeSpider = (level: string[], width: number, height: number) => {
    let attempts = 0;
    
    while (attempts < 30) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Verificar que haya una plataforma sólida arriba y espacio vacío donde cuelga
        if (y > 0 && y < height - 2 && 
            level[y - 1][x] === '1' && 
            level[y][x] === '0' &&
            level[y + 1] && level[y + 1][x] === '0') {
            level[y] = level[y].substring(0, x) + 'S' + level[y].substring(x + 1);
            return;
        }
        attempts++;
    }
};

const placeViper = (level: string[], width: number, height: number) => {
    let attempts = 0;
    
    while (attempts < 30) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Verificar que haya una pared a la izquierda o derecha y espacio vacío en la posición
        const hasLeftWall = x > 1 && level[y][x - 1] === '1';
        const hasRightWall = x < width - 2 && level[y][x + 1] === '1';
        
        if ((hasLeftWall || hasRightWall) && 
            y > 0 && y < height - 1 &&
            level[y][x] === '0') {
            level[y] = level[y].substring(0, x) + 'V' + level[y].substring(x + 1);
            return;
        }
        attempts++;
    }
};

const placeBat = (level: string[], width: number, height: number) => {
    let attempts = 0;
    
    while (attempts < 30) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Los murciélagos pueden estar en espacios vacíos
        if (y > 0 && y < height - 1 &&
            level[y][x] === '0') {
            level[y] = level[y].substring(0, x) + '8' + level[y].substring(x + 1);
            return;
        }
        attempts++;
    }
};

const addBlockingDestructibles = (level: string[], width: number, height: number, difficulty: number, platforms: Platform[]) => {
    // Tiles destructibles para bloquear caminos (vertical y horizontal)
    const blockCount = Math.min(2 + Math.floor(difficulty / 2), 6);
    
    for (let i = 0; i < blockCount; i++) {
        const blockType = Math.random() > 0.5 ? 'horizontal' : 'vertical';
        
        if (blockType === 'horizontal') {
            // Bloquear un camino horizontal con tierra (2)
            addHorizontalBlocker(level, width, height, platforms);
        } else {
            // Bloquear un camino vertical con columnas (C)
            addVerticalBlocker(level, width, height, platforms);
        }
    }
};

const addHorizontalBlocker = (level: string[], width: number, height: number, platforms: Platform[]) => {
    let attempts = 0;
    
    while (attempts < 20) {
        const x = Math.floor(Math.random() * (width - 6)) + 3;
        const y = Math.floor(Math.random() * (height - 6)) + 3;
        
        // Verificar que estamos en un espacio vacío (no en una plataforma)
        if (level[y][x] === '0' && level[y][x + 1] === '0') {
            // Crear bloqueador horizontal de 2-3 tiles de tierra
            const blockLength = Math.random() > 0.5 ? 2 : 3;
            let canPlace = true;
            
            // Verificar que no hay enemigos o elementos importantes
            for (let dx = 0; dx < blockLength; dx++) {
                if (x + dx >= width - 1 || level[y][x + dx] !== '0') {
                    canPlace = false;
                    break;
                }
            }
            
            if (canPlace) {
                for (let dx = 0; dx < blockLength; dx++) {
                    level[y] = level[y].substring(0, x + dx) + '2' + level[y].substring(x + dx + 1);
                }
                return;
            }
        }
        attempts++;
    }
};

const addVerticalBlocker = (level: string[], width: number, height: number, platforms: Platform[]) => {
    let attempts = 0;
    
    while (attempts < 20) {
        const x = Math.floor(Math.random() * (width - 4)) + 2;
        const y = Math.floor(Math.random() * (height - 8)) + 3;
        
        // Verificar que estamos en un espacio vacío
        if (level[y][x] === '0') {
            // Buscar hasta dónde podemos colocar la columna (hacia arriba)
            let columnHeight = 0;
            let foundPlatform = false;
            
            for (let checkY = y; checkY >= 0 && columnHeight < 3; checkY--) {
                if (level[checkY][x] === '1') {
                    foundPlatform = true;
                    break;
                }
                if (level[checkY][x] !== '0') {
                    break;
                }
                columnHeight++;
            }
            
            // Solo colocar si hay una plataforma arriba y la columna tiene al menos 2 tiles
            if (foundPlatform && columnHeight >= 2) {
                for (let dy = 0; dy < columnHeight; dy++) {
                    if (y - dy >= 0 && level[y - dy][x] === '0') {
                        level[y - dy] = level[y - dy].substring(0, x) + 'C' + level[y - dy].substring(x + 1);
                    }
                }
                return;
            }
        }
        attempts++;
    }
};