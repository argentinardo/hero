import { GameStore } from '../core/types';
import { getNetlifyBaseUrl } from '../utils/device';
import { expandChunkedLevels, chunkifyLevel20x18 } from '../utils/levels';
import { showNotification, showPromptModal, initializeAuth0 } from './ui';

/**
 * Representa un nivel público en la galería
 * @interface GalleryLevel
 */
export interface GalleryLevel {
    /** ID único del nivel en la base de datos */
    level_id: string;
    /** ID del usuario que creó el nivel */
    user_id: string;
    /** Nombre del nivel mostrado en la galería */
    name: string;
    /** Descripción opcional del nivel */
    description?: string;
    /** Datos del nivel en formato chunks20x18 o array */
    data: any;
    /** Base64 de la captura de pantalla del nivel (miniatura 200x200px) */
    screenshot?: string;
    /** Número de likes/votos recibidos */
    likes_count: number;
    /** Número de veces que se ha implementado/descargado */
    downloads_count: number;
    /** Fecha de creación en formato ISO */
    created_at: string;
    /** Fecha de última actualización en formato ISO */
    updated_at: string;
    /** Nickname del creador del nivel */
    nickname?: string;
    /** URL del avatar del creador (futuro) */
    avatar_url?: string;
    /** Si el usuario actual ha dado like al nivel */
    user_liked?: boolean;
}

/** Almacén temporal de los niveles actuales de la galería */
let currentGalleryLevels: GalleryLevel[] = [];
/** Tipo de ordenamiento actual aplicado a la galería */
let currentSort: 'likes' | 'newest' | 'downloads' = 'likes';

/**
 * Detecta si el dispositivo es móvil
 */
const isMobileDevice = (): boolean => {
    // Verificar ancho de pantalla (móvil típicamente < 768px)
    const isSmallScreen = window.innerWidth < 768;
    
    // Verificar si tiene capacidades táctiles
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Verificar user agent para dispositivos móviles
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    
    // Es móvil si cumple alguna de estas condiciones
    return isSmallScreen || (hasTouchScreen && isMobileUserAgent);
};

/**
 * Activa el modo pantalla completa (equivalente a presionar F11)
 * Solo funciona en dispositivos móviles, no en desktop
 * Compatible con todos los navegadores modernos
 */
const requestFullscreen = (): void => {
    // Solo activar pantalla completa en dispositivos móviles
    if (!isMobileDevice()) {
        return;
    }
    
    const element = document.documentElement;
    
    if (element.requestFullscreen) {
        element.requestFullscreen().catch((err) => {
            console.warn('Error al activar pantalla completa:', err);
        });
    } else if ((element as any).webkitRequestFullscreen) {
        // Safari
        (element as any).webkitRequestFullscreen();
    } else if ((element as any).msRequestFullscreen) {
        // IE/Edge antiguo
        (element as any).msRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
        // Firefox antiguo
        (element as any).mozRequestFullScreen();
    }
};

/**
 * Configura los event listeners y la inicialización de la galería de niveles
 * Se conecta a los botones de la interfaz y maneja la carga/ordenamiento de niveles
 * 
 * @param {GameStore} store - Store del juego que contiene el estado global
 * 
 * @example
 * ```typescript
 * setupGallery(store);
 * ```
 */
export const setupGallery = (store: GameStore) => {
    const galleryBtn = document.getElementById('gallery-btn');
    const galleryModal = document.getElementById('gallery-modal');
    const galleryCloseBtn = document.getElementById('gallery-close-btn');
    const galleryGrid = document.getElementById('gallery-levels-grid');
    
    const sortLikesBtn = document.getElementById('gallery-sort-likes');
    const sortNewestBtn = document.getElementById('gallery-sort-newest');

    // Abrir galería
    galleryBtn?.addEventListener('click', async () => {
        requestFullscreen();
        galleryModal?.classList.remove('hidden');
        await loadGalleryLevels(store, 'likes');
    });

    // Cerrar galería
    galleryCloseBtn?.addEventListener('click', () => {
        galleryModal?.classList.add('hidden');
    });

    // Botones de ordenamiento
    sortLikesBtn?.addEventListener('click', async () => {
        setActiveSortButton('likes');
        await loadGalleryLevels(store, 'likes');
    });

    sortNewestBtn?.addEventListener('click', async () => {
        setActiveSortButton('newest');
        await loadGalleryLevels(store, 'newest');
    });


};

/**
 * Actualiza la UI para marcar el botón de ordenamiento activo
 * 
 * @param {string} sortType - Tipo de ordenamiento: 'likes', 'newest' o 'downloads'
 */
const setActiveSortButton = (sortType: 'likes' | 'newest' | 'downloads') => {
    currentSort = sortType;
    
    // Remover clase activa de todos
    document.querySelectorAll('.gallery-sort-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-purple-700');
        btn.classList.add('bg-gray-700');
    });

    // Agregar clase activa al botón seleccionado
    const activeBtn = document.getElementById(`gallery-sort-${sortType}`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-purple-700');
        activeBtn.classList.remove('bg-gray-700');
    }
};

/**
 * Carga los niveles de la galería desde el servidor
 * Si falla la conexión, muestra los 5 primeros niveles oficiales como respaldo
 * 
 * @param {GameStore} store - Store del juego
 * @param {string} sortType - Tipo de ordenamiento ('likes' | 'newest' | 'downloads')
 * 
 * @returns {Promise<void>}
 */
const loadGalleryLevels = async (store: GameStore, sortType: 'likes' | 'newest' | 'downloads' = 'likes') => {
    const galleryGrid = document.getElementById('gallery-levels-grid');
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 p-8"><p>Cargando niveles...</p></div>';

    try {
        const baseUrl = getNetlifyBaseUrl();
        
        // Intentar obtener token de Auth0 si el usuario está logueado
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        let headers: HeadersInit = {};
        
        if (isLoggedIn) {
            try {
                const Auth0Manager = await initializeAuth0();
                const token = await Auth0Manager.getAccessToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            } catch (error) {
                console.warn('Error obteniendo token para cargar galería:', error);
                // Continuar sin token si hay error
            }
        }
        
        const res = await fetch(`${baseUrl}/.netlify/functions/gallery?sort=${sortType}&limit=50`, {
            headers
        });
        
        // Si hay error o no hay niveles, mostrar niveles por defecto
        if (!res.ok || res.status !== 200) {
            console.log('No hay conexión o no hay niveles en la BD, mostrando niveles por defecto');
            showDefaultLevels(store);
            return;
        }

        const result = await res.json();
        
        // Si no hay datos o el resultado está vacío, mostrar niveles por defecto
        if (!result.ok || !Array.isArray(result.data) || result.data.length === 0) {
            console.log('No hay niveles en la galería, mostrando niveles por defecto');
            showDefaultLevels(store);
            return;
        }

        currentGalleryLevels = result.data;
        renderGalleryLevels(store, result.data);
        
    } catch (error) {
        console.error('Error cargando galería:', error);
        // En caso de error, mostrar niveles por defecto
        showDefaultLevels(store);
    }
};

/**
 * Muestra los primeros 5 niveles oficiales del juego cuando no hay conexión
 * o cuando la galería está vacía. Genera miniaturas automáticamente.
 * 
 * @param {GameStore} store - Store del juego que contiene los niveles oficiales
 */
const showDefaultLevels = (store: GameStore) => {
    // Mostrar los 5 primeros niveles del juego
    const defaultLevels: GalleryLevel[] = [];
    
    for (let i = 0; i < Math.min(5, store.levelDataStore.length); i++) {
        const levelData = store.levelDataStore[i];
        if (!levelData) continue;
        
        // Generar captura de pantalla del nivel
        const screenshot = generateLevelScreenshot(levelData);
        
        defaultLevels.push({
            level_id: `default-${i}`,
            user_id: 'system',
            name: `Nivel ${i + 1}`,
            description: `Nivel oficial ${i + 1}`,
            data: {
                format: 'array',
                level: levelData
            },
            screenshot: screenshot,
            likes_count: 0,
            downloads_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            nickname: 'Sistema',
            user_liked: false
        });
    }
    
    currentGalleryLevels = defaultLevels;
    renderGalleryLevels(store, defaultLevels);
};

/**
 * Genera una imagen Base64 de miniatura (200x200px) de un nivel
 * Renderiza cada tile con un color representativo para crear una vista previa
 * 
 * @param {string[][]} levelData - Matriz de tiles del nivel
 * @returns {string} Base64 de la imagen PNG generada
 */
const generateLevelScreenshot = (levelData: string[][]): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 200; // Ancho de miniatura
    canvas.height = 200; // Alto de miniatura
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return '';
    
    // Fondo negro
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calcular escala para que el nivel quepa en la miniatura
    const levelWidth = levelData[0]?.length || 20;
    const levelHeight = levelData.length;
    const scaleX = canvas.width / levelWidth;
    const scaleY = canvas.height / levelHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Renderizar tiles básicos
    for (let row = 0; row < levelHeight; row++) {
        for (let col = 0; col < levelWidth; col++) {
            const tile = levelData[row]?.[col] || '0';
            const x = col * scale;
            const y = row * scale;
            
            // Seleccionar color según tipo de tile
            let color = '#000';
            switch (tile) {
                case '1':
                    color = '#8B4513'; // Ladrillo
                    break;
                case '2':
                    color = '#0080FF'; // Agua
                    break;
                case '3':
                    color = '#FF4500'; // Lava
                    break;
                case 'P':
                    color = '#FF0000'; // Jugador
                    break;
                case '9':
                    color = '#00FFFF'; // Minero
                    break;
                case '8':
                    color = '#808080'; // Murciélago
                    break;
                case 'S':
                    color = '#800080'; // Araña
                    break;
                case 'C':
                    color = '#804040'; // Destructible
                    break;
                default:
                    if (tile !== '0') {
                        color = '#404040'; // Otros tiles
                    }
                    break;
            }
            
            if (color !== '#000') {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, scale, scale);
            }
        }
    }
    
    // Convertir canvas a base64
    return canvas.toDataURL('image/png');
};

/**
 * Renderiza los niveles de la galería en la UI como cards
 * Crea elementos DOM dinámicamente con screenshot, likes, acciones, etc.
 * 
 * @param {GameStore} store - Store del juego
 * @param {GalleryLevel[]} levels - Array de niveles a mostrar
 */
const renderGalleryLevels = (store: GameStore, levels: GalleryLevel[]) => {
    const galleryGrid = document.getElementById('gallery-levels-grid');
    if (!galleryGrid) return;

    if (levels.length === 0) {
        galleryGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 p-8"><p>No hay niveles en la galería aún</p></div>';
        return;
    }

    galleryGrid.innerHTML = '';

    levels.forEach(level => {
        const card = document.createElement('div');
        card.className = 'bg-gray-800 border-2 border-gray-700 p-4 rounded hover:border-purple-500 transition-colors';
        
        // Captura de pantalla o placeholder
        const screenshotHtml = level.screenshot 
            ? `<img src="${level.screenshot}" alt="${level.name}" class="w-full h-32 object-cover mb-3 rounded border border-gray-600" />`
            : `<div class="w-full h-32 bg-gray-700 flex items-center justify-center text-gray-500 text-xs rounded mb-3 border border-gray-600">
                Sin captura
            </div>`;

        const likeButtonClass = level.user_liked 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-gray-600 hover:bg-red-600';

        card.innerHTML = `
            ${screenshotHtml}
            <h3 class="font-bold text-lg mb-2 truncate" title="${level.name}">${level.name}</h3>
            <p class="text-xs text-gray-400 mb-3 truncate" title="${level.nickname || level.user_id}">
                Por: ${level.nickname || level.user_id?.split('@')[0] || 'Anónimo'}
            </p>
            <div class="flex justify-between items-center mb-3">
                <span class="text-xs text-gray-500">
                    ❤️ ${level.likes_count}
                </span>
                <button class="gallery-like-btn px-3 py-1 border border-white text-xs ${likeButtonClass}" 
                        data-level-id="${level.level_id}">
                    ${level.user_liked ? '❤️ Ya votaste' : '❤️ Me gusta'}
                </button>
            </div>
            <div class="flex gap-2 mb-2">
                <button class="gallery-play-btn flex-1 bg-green-600 hover:bg-green-700 p-2 border border-white text-xs" 
                        data-level-id="${level.level_id}">
                    Jugar
                </button>
            </div>
        `;

        galleryGrid.appendChild(card);
    });

    // Event listeners para los botones
    document.querySelectorAll('.gallery-like-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const levelId = target.getAttribute('data-level-id');
            if (levelId) {
                await toggleLike(store, levelId);
            }
        });
    });

    document.querySelectorAll('.gallery-play-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const levelId = target.getAttribute('data-level-id');
            if (levelId) {
                await playLevel(store, levelId);
            }
        });
    });

    document.querySelectorAll('.gallery-implement-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const levelId = target.getAttribute('data-level-id');
            if (levelId) {
                await implementLevel(store, levelId);
            }
        });
    });
};

/**
 * Alterna el estado de "Me gusta" de un nivel
 * Incrementa o decrementa los likes según si el usuario ya votó antes
 * 
 * @param {GameStore} store - Store del juego
 * @param {string} levelId - ID del nivel a votar
 * @returns {Promise<void>}
 */
const toggleLike = async (store: GameStore, levelId: string): Promise<void> => {
    try {
        // Verificar si el usuario está logueado
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            showNotification(store, 'Acción requerida', 'Necesitas iniciar sesión para votar');
            return;
        }

        // CRÍTICO: Usar Auth0 en lugar de Netlify Identity
        const Auth0Manager = await initializeAuth0();
        const token = await Auth0Manager.getAccessToken();
        
        if (!token) {
            console.error('No se pudo obtener token de Auth0');
            showNotification(store, 'Error', 'No se pudo verificar tu sesión. Por favor inicia sesión de nuevo.');
            return;
        }

        const baseUrl = getNetlifyBaseUrl();
        
        const res = await fetch(`${baseUrl}/.netlify/functions/gallery/${levelId}/like`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();
        
        // Recargar los niveles para actualizar los contadores
        const galleryModal = document.getElementById('gallery-modal');
        if (galleryModal && !galleryModal.classList.contains('hidden')) {
            const galleryGrid = document.getElementById('gallery-levels-grid');
            if (galleryGrid) {
                galleryGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 p-8"><p>Cargando...</p></div>';
            }
            // Recargar después de un breve delay para que la DB se actualice
            setTimeout(() => {
                loadGalleryLevels(store, currentSort);
            }, 500);
        }
        
    } catch (error) {
        console.error('Error dando like:', error);
        showNotification(store, 'Error', 'Error al votar. Por favor intenta de nuevo.');
    }
};

/**
 * Carga y reproduce un nivel de la galería
 * Convierte automáticamente entre formatos chunks20x18 y array según sea necesario
 * 
 * @param {GameStore} store - Store del juego
 * @param {string} levelId - ID del nivel a jugar
 * @returns {Promise<void>}
 */
const playLevel = async (store: GameStore, levelId: string): Promise<void> => {
    const level = currentGalleryLevels.find(l => l.level_id === levelId);
    if (!level) return;

    console.log('Intentando cargar nivel:', levelId, 'Formato detectado:', level.data);

    // Convertir los datos del nivel al formato esperado por el juego
    let levelData: string[][] = [];
    
    try {
        // Caso 1: Formato chunks20x18 completo (nivel individual con chunks)
        if (level.data.format === 'chunks20x18' && level.data.width && level.data.height && Array.isArray(level.data.chunks)) {
            console.log('Formato detectado: chunks20x18 (nivel individual)');
            const expanded = expandChunkedLevels({
                format: 'chunks20x18',
                chunkWidth: 20,
                chunkHeight: 18,
                levels: [level.data]
            });
            levelData = expanded[0]?.map(row => row.split('')) || [];
        }
        // Caso 2: Formato chunks20x18 con levels (archivo completo)
        else if (level.data.format === 'chunks20x18' && Array.isArray(level.data.levels) && level.data.levels.length > 0) {
            console.log('Formato detectado: chunks20x18 (archivo completo)');
            const expanded = expandChunkedLevels(level.data);
            levelData = expanded[0]?.map(row => row.split('')) || [];
        }
        // Caso 3: Array directo de filas (string[])
        else if (Array.isArray(level.data) && level.data.length > 0) {
            console.log('Formato detectado: array directo');
            // Verificar si son strings (legacy) o arrays de strings
            if (typeof level.data[0] === 'string') {
                levelData = level.data.map(row => row.split(''));
            } else if (Array.isArray(level.data[0])) {
                levelData = level.data as string[][];
            }
        }
        // Caso 4: Objeto con propiedad level
        else if (level.data.level && Array.isArray(level.data.level)) {
            console.log('Formato detectado: objeto con propiedad level');
            if (typeof level.data.level[0] === 'string') {
                levelData = level.data.level.map((row: string) => row.split(''));
            } else {
                levelData = level.data.level as string[][];
            }
        }
        // Caso 5: Objeto con propiedad data que contiene el nivel
        else if (level.data.data) {
            console.log('Formato detectado: objeto anidado con data');
            const nestedData = level.data.data;
            if (nestedData.format === 'chunks20x18' && Array.isArray(nestedData.levels)) {
                const expanded = expandChunkedLevels(nestedData);
                levelData = expanded[0]?.map(row => row.split('')) || [];
            } else if (Array.isArray(nestedData)) {
                if (typeof nestedData[0] === 'string') {
                    levelData = nestedData.map((row: string) => row.split(''));
                } else {
                    levelData = nestedData as string[][];
                }
            }
        }
        // Caso 6: Nivel individual con chunks pero sin formato explícito
        else if (level.data.chunks && Array.isArray(level.data.chunks) && level.data.width && level.data.height) {
            console.log('Formato detectado: chunks sin formato explícito');
            const expanded = expandChunkedLevels({
                format: 'chunks20x18',
                chunkWidth: 20,
                chunkHeight: 18,
                levels: [level.data]
            });
            levelData = expanded[0]?.map(row => row.split('')) || [];
        }
        
        if (!levelData || levelData.length === 0) {
            console.error('No se pudo convertir el nivel. Estructura completa:', JSON.stringify(level.data, null, 2));
            showNotification(store, 'Error', 'Formato de nivel no compatible. Ver consola para más detalles.');
            return;
        }
        
        console.log('Nivel convertido exitosamente. Filas:', levelData.length);
    } catch (error) {
        console.error('Error convirtiendo nivel:', error, 'Datos:', level.data);
        showNotification(store, 'Error', 'Error al procesar el nivel. Ver consola para más detalles.');
        return;
    }

    // Cerrar el modal de la galería
    document.getElementById('gallery-modal')?.classList.add('hidden');
    
    // Convertir a formato string para startGame
    const levelDataString = levelData.map((row: string[]) => row.join(''));
    
    // Importar y llamar a startGame para evitar dependencia circular
    const { startGame } = await import('./ui');
    // Usar levelOverride para jugar solo este nivel
    startGame(store, levelDataString, 0, false);
};

/**
 * Implementa un nivel de la galería en la cuenta del usuario
 * Permite copiar un nivel público a los niveles privados del usuario para editarlo
 * Pide un nombre personalizado antes de guardar
 * 
 * @param {GameStore} store - Store del juego
 * @param {string} levelId - ID del nivel a implementar
 * @returns {Promise<void>}
 */
const implementLevel = async (store: GameStore, levelId: string): Promise<void> => {
    const level = currentGalleryLevels.find(l => l.level_id === levelId);
    if (!level) return;

    try {
        // Verificar si el usuario está logueado
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            showNotification(store, 'Acción requerida', 'Necesitas iniciar sesión para implementar niveles');
            return;
        }

        // CRÍTICO: Usar Auth0 en lugar de Netlify Identity
        const Auth0Manager = await initializeAuth0();
        const token = await Auth0Manager.getAccessToken();
        
        if (!token) {
            console.error('No se pudo obtener token de Auth0');
            showNotification(store, 'Error', 'No se pudo verificar tu sesión. Por favor inicia sesión de nuevo.');
            return;
        }

        const baseUrl = getNetlifyBaseUrl();
        
        // Convertir los datos al formato adecuado
        let levelDataArray: string[][] = [];
        
        console.log('Intentando implementar nivel:', levelId, 'Formato detectado:', level.data);
        
        try {
            // Caso 1: Formato chunks20x18 completo (nivel individual con chunks)
            if (level.data.format === 'chunks20x18' && level.data.width && level.data.height && Array.isArray(level.data.chunks)) {
                console.log('Formato detectado: chunks20x18 (nivel individual)');
                const expanded = expandChunkedLevels({
                    format: 'chunks20x18',
                    chunkWidth: 20,
                    chunkHeight: 18,
                    levels: [level.data]
                });
                levelDataArray = expanded[0]?.map(row => row.split('')) || [];
            }
            // Caso 2: Formato chunks20x18 con levels (archivo completo)
            else if (level.data.format === 'chunks20x18' && Array.isArray(level.data.levels) && level.data.levels.length > 0) {
                console.log('Formato detectado: chunks20x18 (archivo completo)');
                const expanded = expandChunkedLevels(level.data);
                levelDataArray = expanded[0]?.map(row => row.split('')) || [];
            }
            // Caso 3: Array directo de filas (string[])
            else if (Array.isArray(level.data) && level.data.length > 0) {
                console.log('Formato detectado: array directo');
                // Verificar si son strings (legacy) o arrays de strings
                if (typeof level.data[0] === 'string') {
                    levelDataArray = level.data.map(row => row.split(''));
                } else if (Array.isArray(level.data[0])) {
                    levelDataArray = level.data as string[][];
                }
            }
            // Caso 4: Objeto con propiedad level
            else if (level.data.level && Array.isArray(level.data.level)) {
                console.log('Formato detectado: objeto con propiedad level');
                if (typeof level.data.level[0] === 'string') {
                    levelDataArray = level.data.level.map((row: string) => row.split(''));
                } else {
                    levelDataArray = level.data.level as string[][];
                }
            }
            // Caso 5: Objeto con propiedad data que contiene el nivel
            else if (level.data.data) {
                console.log('Formato detectado: objeto anidado con data');
                const nestedData = level.data.data;
                if (nestedData.format === 'chunks20x18' && Array.isArray(nestedData.levels)) {
                    const expanded = expandChunkedLevels(nestedData);
                    levelDataArray = expanded[0]?.map(row => row.split('')) || [];
                } else if (Array.isArray(nestedData)) {
                    if (typeof nestedData[0] === 'string') {
                        levelDataArray = nestedData.map((row: string) => row.split(''));
                    } else {
                        levelDataArray = nestedData as string[][];
                    }
                }
            }
            // Caso 6: Nivel individual con chunks pero sin formato explícito
            else if (level.data.chunks && Array.isArray(level.data.chunks) && level.data.width && level.data.height) {
                console.log('Formato detectado: chunks sin formato explícito');
                const expanded = expandChunkedLevels({
                    format: 'chunks20x18',
                    chunkWidth: 20,
                    chunkHeight: 18,
                    levels: [level.data]
                });
                levelDataArray = expanded[0]?.map(row => row.split('')) || [];
            }
            
            if (!levelDataArray || levelDataArray.length === 0) {
                console.error('No se pudo convertir el nivel. Estructura completa:', JSON.stringify(level.data, null, 2));
                showNotification(store, 'Error', 'Formato de nivel no compatible. Ver consola para más detalles.');
                return;
            }
            
            console.log('Nivel convertido exitosamente para implementar. Filas:', levelDataArray.length);
        } catch (error) {
            console.error('Error convirtiendo nivel para implementar:', error, 'Datos:', level.data);
            showNotification(store, 'Error', 'Error al procesar el nivel. Ver consola para más detalles.');
            return;
        }
        
        // Convertir a formato chunks20x18 para guardar
        const levelData = {
            format: 'chunks20x18' as const,
            chunkWidth: 20,
            chunkHeight: 18,
            levels: [chunkifyLevel20x18(levelDataArray.map(row => row.join('')))]
        };

        // Preguntar por un nombre personalizado usando modal
        const customName = await showPromptModal(store, `¿Cómo quieres llamar a tu versión de "${level.name}"?`, `${level.name} (mi versión)`);
        if (!customName) return;

        const res = await fetch(`${baseUrl}/.netlify/functions/gallery/${levelId}/implement`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                modified_data: {
                    format: 'chunks20x18',
                    chunkWidth: 20,
                    chunkHeight: 18,
                    levels: levelData.levels
                },
                name: customName
            })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();
        
        showNotification(store, 'Éxito', '✅ Nivel implementado en tu cuenta. Ahora puedes editarlo en TOOLS.');
        
        // Cerrar la galería
        document.getElementById('gallery-modal')?.classList.add('hidden');
        
        // Recargar niveles del usuario para que el nuevo nivel aparezca
        const { tryLoadUserLevels } = await import('./ui');
        await tryLoadUserLevels(store);
        
        // Importar y llamar a startEditor para evitar dependencia circular
        const { startEditor } = await import('./ui');
        await startEditor(store);
        
    } catch (error) {
        console.error('Error implementando nivel:', error);
        showNotification(store, 'Error', 'Error al implementar nivel. Por favor intenta de nuevo.');
    }
};

/**
 * FUNCIÓN OBSOLETA - Ya no se usa
 * Comparte un nivel de la galería en redes sociales (REMOVIDA)
 * El compartir ahora se maneja desde el menú principal
 */
/*
const shareLevel = async (store: GameStore, levelId: string, levelName: string, levelCreator: string): Promise<void> => {
    try {
        // Generar URL del nivel
        const gameUrl = window.location.origin;
        const shareUrl = `${gameUrl}?level=${levelId}`;
        
        // Crear mensaje para compartir
        const shareText = `Juega "${levelName}" creado por ${levelCreator} en Hero Game 🎮`;
        const fullShareText = `${shareText}\n${shareUrl}`;
        
        // Intentar usar Web Share API si está disponible
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Hero Game',
                    text: shareText,
                    url: shareUrl
                });
                showNotification(store, 'Éxito', '✅ Compartido exitosamente');
                return;
            } catch (error: any) {
                // Si el usuario cancela la compartición, no mostrar error
                if (error.name === 'AbortError') {
                    return;
                }
                // Si falla, continuar con el método alternativo
                console.log('Web Share API no disponible, usando método alternativo');
            }
        }
        
        // Método alternativo: mostrar opciones de compartir
        const shareOptions = `
            <div style="display: flex; flex-direction: column; gap: 10px; min-width: 300px;">
                <p style="margin: 0; font-size: 14px; color: #ccc;">
                    <strong>${levelName}</strong> de ${levelCreator}
                </p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button id="share-twitter" style="flex: 1; min-width: 80px; padding: 8px; background: #1DA1F2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        𝕏 Twitter
                    </button>
                    <button id="share-facebook" style="flex: 1; min-width: 80px; padding: 8px; background: #1877F2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        📘 Facebook
                    </button>
                    <button id="share-whatsapp" style="flex: 1; min-width: 80px; padding: 8px; background: #25D366; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        💬 WhatsApp
                    </button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <input id="share-url-input" type="text" value="${shareUrl}" readonly style="flex: 1; padding: 8px; background: #333; color: #fff; border: 1px solid #555; border-radius: 4px; font-size: 12px;" />
                    <button id="share-copy" style="padding: 8px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                        Copiar
                    </button>
                </div>
            </div>
        `;
        
        // Crear modal personalizado para compartir
        const modal = document.createElement('div');
        modal.id = 'share-level-modal';
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #222;
            border: 2px solid #666;
            border-radius: 8px;
            padding: 20px;
            z-index: 10000;
            box-shadow: 0 0 20px rgba(0,0,0,0.8);
        `;
        modal.innerHTML = `
            ${shareOptions}
            <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button id="share-close" style="flex: 1; padding: 8px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cerrar
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Event listeners
        const closeBtn = modal.querySelector('#share-close') as HTMLButtonElement;
        const copyBtn = modal.querySelector('#share-copy') as HTMLButtonElement;
        const twitterBtn = modal.querySelector('#share-twitter') as HTMLButtonElement;
        const facebookBtn = modal.querySelector('#share-facebook') as HTMLButtonElement;
        const whatsappBtn = modal.querySelector('#share-whatsapp') as HTMLButtonElement;
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(shareUrl);
                    copyBtn.textContent = '✓ Copiado';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copiar';
                    }, 2000);
                } catch (error) {
                    console.error('Error copiando URL:', error);
                }
            });
        }
        
        if (twitterBtn) {
            twitterBtn.addEventListener('click', () => {
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}`;
                window.open(twitterUrl, '_blank', 'width=600,height=400');
            });
        }
        
        if (facebookBtn) {
            facebookBtn.addEventListener('click', () => {
                const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
                window.open(facebookUrl, '_blank', 'width=600,height=400');
            });
        }
        
        if (whatsappBtn) {
            whatsappBtn.addEventListener('click', () => {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullShareText)}`;
                window.open(whatsappUrl, '_blank');
            });
        }
        
        // Cerrar modal si se presiona Escape
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
        
    } catch (error) {
        console.error('Error compartiendo nivel:', error);
        showNotification(store, 'Error', 'Error al compartir nivel. Por favor intenta de nuevo.');
    }
};
*/

// Las funciones de conversión ahora usan las importadas de levels.ts



