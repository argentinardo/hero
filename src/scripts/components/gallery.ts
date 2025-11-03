import { GameStore } from '../core/types';
import { getNetlifyBaseUrl } from '../utils/device';
import { expandChunkedLevels, chunkifyLevel20x18 } from '../utils/levels';
import { showNotification, showPromptModal } from './ui';

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
    const sortDownloadsBtn = document.getElementById('gallery-sort-downloads');

    // Abrir galería
    galleryBtn?.addEventListener('click', async () => {
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

    sortDownloadsBtn?.addEventListener('click', async () => {
        setActiveSortButton('downloads');
        await loadGalleryLevels(store, 'downloads');
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
        const res = await fetch(`${baseUrl}/.netlify/functions/gallery?sort=${sortType}&limit=50`);
        
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
                    ❤️ ${level.likes_count} • ⬇️ ${level.downloads_count}
                </span>
                <button class="gallery-like-btn px-3 py-1 border border-white text-xs ${likeButtonClass}" 
                        data-level-id="${level.level_id}">
                    ${level.user_liked ? '❤️ Ya votaste' : '❤️ Me gusta'}
                </button>
            </div>
            <div class="flex gap-2">
                <button class="gallery-play-btn flex-1 bg-green-600 hover:bg-green-700 p-2 border border-white text-xs" 
                        data-level-id="${level.level_id}">
                    Jugar
                </button>
                <button class="gallery-implement-btn flex-1 bg-blue-600 hover:bg-blue-700 p-2 border border-white text-xs" 
                        data-level-id="${level.level_id}">
                    Implementar
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
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        
        if (!user) {
            showNotification(store, 'Acción requerida', 'Necesitas iniciar sesión para votar');
            return;
        }

        const token = await user.jwt();
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
                loadGalleryLevels({} as GameStore, currentSort);
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

    // Convertir los datos del nivel al formato esperado por el juego
    let levelData;
    if (level.data.format === 'chunks20x18' && level.data.width && level.data.height && Array.isArray(level.data.chunks)) {
        // Convertir de chunks a formato de nivel
        const expanded = expandChunkedLevels({
            format: 'chunks20x18',
            chunkWidth: 20,
            chunkHeight: 18,
            levels: [level.data]
        });
        levelData = expanded[0]?.map(row => row.split('')) || [];
    } else if (Array.isArray(level.data)) {
        levelData = level.data;
    } else if (level.data.level && Array.isArray(level.data.level)) {
        levelData = level.data.level;
    } else {
        showNotification(store, 'Error', 'Formato de nivel no compatible');
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
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        
        if (!user) {
            showNotification(store, 'Acción requerida', 'Necesitas iniciar sesión para implementar niveles');
            return;
        }

        const token = await user.jwt();
        const baseUrl = getNetlifyBaseUrl();
        
        // Convertir los datos al formato adecuado
        let levelDataArray: string[][];
        if (level.data.format === 'chunks20x18' && level.data.width && level.data.height && Array.isArray(level.data.chunks)) {
            // Convertir de chunks a array primero
            const expanded = expandChunkedLevels({
                format: 'chunks20x18',
                chunkWidth: 20,
                chunkHeight: 18,
                levels: [level.data]
            });
            levelDataArray = expanded[0]?.map(row => row.split('')) || [];
        } else if (Array.isArray(level.data)) {
            levelDataArray = level.data;
        } else if (level.data.level && Array.isArray(level.data.level)) {
            levelDataArray = level.data.level;
        } else {
            showNotification(store, 'Error', 'Formato de nivel no compatible');
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
        
        showNotification(store, 'Éxito', '✅ Nivel implementado en tu cuenta. Ahora puedes editarlo en Herramientas.');
        
        // Cerrar la galería y abrir el editor
        document.getElementById('gallery-modal')?.classList.add('hidden');
        
        // Importar y llamar a startEditor para evitar dependencia circular
        const { startEditor } = await import('./ui');
        await startEditor(store);
        
    } catch (error) {
        console.error('Error implementando nivel:', error);
        showNotification(store, 'Error', 'Error al implementar nivel. Por favor intenta de nuevo.');
    }
};

// Las funciones de conversión ahora usan las importadas de levels.ts

