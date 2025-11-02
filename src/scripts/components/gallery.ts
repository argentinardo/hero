import { GameStore } from '../core/types';
import { getNetlifyBaseUrl } from '../utils/device';

export interface GalleryLevel {
    level_id: string;
    user_id: string;
    name: string;
    description?: string;
    data: any;
    screenshot?: string;
    likes_count: number;
    downloads_count: number;
    created_at: string;
    updated_at: string;
    nickname?: string;
    avatar_url?: string;
    user_liked?: boolean;
}

let currentGalleryLevels: GalleryLevel[] = [];
let currentSort: 'likes' | 'newest' | 'downloads' = 'likes';

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

const loadGalleryLevels = async (store: GameStore, sortType: 'likes' | 'newest' | 'downloads' = 'likes') => {
    const galleryGrid = document.getElementById('gallery-levels-grid');
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 p-8"><p>Cargando niveles...</p></div>';

    try {
        const baseUrl = getNetlifyBaseUrl();
        const res = await fetch(`${baseUrl}/.netlify/functions/gallery?sort=${sortType}&limit=50`);
        
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const result = await res.json();
        
        if (!result.ok || !Array.isArray(result.data)) {
            galleryGrid.innerHTML = '<div class="col-span-full text-center text-red-500 p-8"><p>Error cargando la galería</p></div>';
            return;
        }

        currentGalleryLevels = result.data;
        renderGalleryLevels(store, result.data);
        
    } catch (error) {
        console.error('Error cargando galería:', error);
        galleryGrid.innerHTML = '<div class="col-span-full text-center text-red-500 p-8"><p>Error: No se pudo conectar al servidor</p></div>';
    }
};

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
                await toggleLike(levelId);
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

const toggleLike = async (levelId: string): Promise<void> => {
    try {
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        
        if (!user) {
            alert('Necesitas iniciar sesión para votar');
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
        alert('Error al votar. Por favor intenta de nuevo.');
    }
};

const playLevel = async (store: GameStore, levelId: string): Promise<void> => {
    const level = currentGalleryLevels.find(l => l.level_id === levelId);
    if (!level) return;

    // Convertir los datos del nivel al formato esperado por el juego
    let levelData;
    if (level.data.format === 'chunks20x18' && Array.isArray(level.data.chunks)) {
        // Convertir de chunks a formato de nivel
        levelData = convertChunksToLevel(level.data.chunks);
    } else if (Array.isArray(level.data)) {
        levelData = level.data;
    } else {
        alert('Formato de nivel no compatible');
        return;
    }

    // Cargar el nivel en el store y empezar a jugar
    store.levelDataStore.push(levelData);
    store.currentLevelIndex = store.levelDataStore.length - 1;
    
    // Cerrar el modal de la galería y empezar el juego
    document.getElementById('gallery-modal')?.classList.add('hidden');
    
    // Importar y llamar a startGame para evitar dependencia circular
    const { startGame } = await import('./ui');
    startGame(store);
};

const implementLevel = async (store: GameStore, levelId: string): Promise<void> => {
    const level = currentGalleryLevels.find(l => l.level_id === levelId);
    if (!level) return;

    try {
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        
        if (!user) {
            alert('Necesitas iniciar sesión para implementar niveles');
            return;
        }

        const token = await user.jwt();
        const baseUrl = getNetlifyBaseUrl();
        
        // Convertir los datos al formato adecuado
        let levelData;
        if (level.data.format === 'chunks20x18' && Array.isArray(level.data.chunks)) {
            levelData = level.data;
        } else if (Array.isArray(level.data)) {
            // Convertir a formato chunks20x18
            levelData = {
                format: 'chunks20x18',
                chunks: convertLevelToChunks(level.data)
            };
        } else {
            alert('Formato de nivel no compatible');
            return;
        }

        // Preguntar por un nombre personalizado
        const customName = prompt(`¿Cómo quieres llamar a tu versión de "${level.name}"?`, `${level.name} (mi versión)`);
        if (!customName) return;

        const res = await fetch(`${baseUrl}/.netlify/functions/gallery/${levelId}/implement`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                modified_data: levelData,
                name: customName
            })
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        const result = await res.json();
        
        alert('✅ Nivel implementado en tu cuenta. Ahora puedes editarlo en el Editor.');
        
        // Cerrar la galería y abrir el editor
        document.getElementById('gallery-modal')?.classList.add('hidden');
        
        // Importar y llamar a startEditor para evitar dependencia circular
        const { startEditor } = await import('./ui');
        await startEditor(store);
        
    } catch (error) {
        console.error('Error implementando nivel:', error);
        alert('Error al implementar nivel. Por favor intenta de nuevo.');
    }
};

// Funciones auxiliares para convertir entre formatos
const convertChunksToLevel = (chunks: any[]): any => {
    // TODO: Implementar conversión de chunks20x18 a formato de nivel
    return chunks;
};

const convertLevelToChunks = (level: any[]): any[] => {
    // TODO: Implementar conversión de nivel a chunks20x18
    return [];
};

