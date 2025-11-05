/**
 * Sistema de Gestión de Campañas
 * 
 * Permite crear, guardar, cargar y gestionar campañas de niveles.
 * Las campañas permiten organizar niveles en secuencias personalizadas.
 */

import type { Campaign, CampaignLevel, GameStore } from '../core/types';

const CAMPAIGNS_STORAGE_KEY = 'hero_campaigns';
const DEFAULT_CAMPAIGN_ID = 'default';

/**
 * Crea la campaña por defecto con los niveles originales
 */
export const createDefaultCampaign = (totalLevels: number): Campaign => {
    const levels: CampaignLevel[] = [];
    for (let i = 0; i < totalLevels; i++) {
        levels.push({
            levelIndex: i,
            order: i
        });
    }
    
    return {
        id: DEFAULT_CAMPAIGN_ID,
        name: 'Campaña Original',
        levels,
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
};

/**
 * Carga las campañas desde localStorage
 */
export const loadCampaigns = (): Campaign[] => {
    try {
        const stored = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
        if (stored) {
            const campaigns = JSON.parse(stored) as Campaign[];
            // Asegurar que existe la campaña por defecto
            const hasDefault = campaigns.some(c => c.id === DEFAULT_CAMPAIGN_ID);
            if (!hasDefault) {
                // Si no hay campaña por defecto, la agregamos con 20 niveles por defecto
                // Nota: esto se actualizará cuando se inicialice el store con el número correcto
                campaigns.unshift(createDefaultCampaign(20));
            }
            return campaigns;
        }
    } catch (error) {
        console.error('Error cargando campañas:', error);
    }
    return [];
};

/**
 * Guarda las campañas en localStorage
 */
export const saveCampaigns = (campaigns: Campaign[]): void => {
    try {
        localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    } catch (error) {
        console.error('Error guardando campañas:', error);
    }
};

/**
 * Inicializa las campañas del store
 */
export const initializeCampaigns = (store: GameStore, totalLevels: number): void => {
    const loaded = loadCampaigns();
    
    if (loaded.length === 0) {
        // Si no hay campañas guardadas, crear la por defecto con todos los niveles
        store.campaigns = [createDefaultCampaign(totalLevels)];
        saveCampaigns(store.campaigns);
    } else {
        store.campaigns = loaded;
        
        // Actualizar la campaña por defecto si tiene menos niveles de los que debería
        const defaultCampaign = store.campaigns.find(c => c.id === DEFAULT_CAMPAIGN_ID);
        if (defaultCampaign) {
            // Si la campaña por defecto tiene menos niveles, actualizarla
            if (defaultCampaign.levels.length < totalLevels) {
                // Crear una nueva campaña por defecto con todos los niveles
                const updatedDefault = createDefaultCampaign(totalLevels);
                // Reemplazar la campaña por defecto existente
                const index = store.campaigns.findIndex(c => c.id === DEFAULT_CAMPAIGN_ID);
                if (index >= 0) {
                    store.campaigns[index] = updatedDefault;
                    saveCampaigns(store.campaigns);
                }
            }
        } else {
            // Si no existe la campaña por defecto, agregarla
            store.campaigns.unshift(createDefaultCampaign(totalLevels));
            saveCampaigns(store.campaigns);
        }
    }
    
    // Establecer la campaña por defecto como actual si no hay una seleccionada
    if (!store.currentCampaignId) {
        const defaultCampaign = store.campaigns.find(c => c.id === DEFAULT_CAMPAIGN_ID);
        if (defaultCampaign) {
            store.currentCampaignId = defaultCampaign.id;
        } else if (store.campaigns.length > 0) {
            store.currentCampaignId = store.campaigns[0].id;
        }
    }
};

/**
 * Crea una nueva campaña
 */
export const createCampaign = (store: GameStore, name: string): Campaign => {
    const newCampaign: Campaign = {
        id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        levels: [],
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    store.campaigns.push(newCampaign);
    saveCampaigns(store.campaigns);
    
    return newCampaign;
};

/**
 * Elimina una campaña (no permite eliminar la por defecto)
 */
export const deleteCampaign = (store: GameStore, campaignId: string): boolean => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign || campaign.isDefault) {
        return false;
    }
    
    store.campaigns = store.campaigns.filter(c => c.id !== campaignId);
    
    // Si la campaña eliminada era la actual, cambiar a la por defecto
    if (store.currentCampaignId === campaignId) {
        const defaultCampaign = store.campaigns.find(c => c.id === DEFAULT_CAMPAIGN_ID);
        store.currentCampaignId = defaultCampaign?.id || store.campaigns[0]?.id || null;
    }
    
    saveCampaigns(store.campaigns);
    return true;
};

/**
 * Agrega un nivel a una campaña
 */
export const addLevelToCampaign = (store: GameStore, campaignId: string, levelIndex: number): boolean => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        return false;
    }
    
    // No se puede agregar niveles a la campaña original
    if (campaign.isDefault) {
        return false;
    }
    
    // Verificar que el nivel no esté ya en la campaña
    const exists = campaign.levels.some(l => l.levelIndex === levelIndex);
    if (exists) {
        return false;
    }
    
    // Agregar al final
    const maxOrder = campaign.levels.length > 0 
        ? Math.max(...campaign.levels.map(l => l.order)) 
        : -1;
    
    campaign.levels.push({
        levelIndex,
        order: maxOrder + 1
    });
    
    campaign.updatedAt = Date.now();
    saveCampaigns(store.campaigns);
    
    return true;
};

/**
 * Elimina un nivel de una campaña
 */
export const removeLevelFromCampaign = (store: GameStore, campaignId: string, levelIndex: number): boolean => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign || campaign.isDefault) {
        return false; // No se puede modificar la campaña por defecto
    }
    
    campaign.levels = campaign.levels.filter(l => l.levelIndex !== levelIndex);
    
    // Reordenar los niveles restantes
    campaign.levels.sort((a, b) => a.order - b.order);
    campaign.levels.forEach((level, index) => {
        level.order = index;
    });
    
    campaign.updatedAt = Date.now();
    saveCampaigns(store.campaigns);
    
    return true;
};

/**
 * Reordena los niveles de una campaña
 */
export const reorderCampaignLevels = (
    store: GameStore, 
    campaignId: string, 
    newOrder: Array<{ levelIndex: number; order: number }>
): boolean => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign || campaign.isDefault) {
        return false; // No se puede modificar la campaña por defecto
    }
    
    // Actualizar los órdenes
    newOrder.forEach(({ levelIndex, order }) => {
        const level = campaign.levels.find(l => l.levelIndex === levelIndex);
        if (level) {
            level.order = order;
        }
    });
    
    // Reordenar el array
    campaign.levels.sort((a, b) => a.order - b.order);
    
    campaign.updatedAt = Date.now();
    saveCampaigns(store.campaigns);
    
    return true;
};

/**
 * Actualiza el nombre de un nivel en una campaña
 */
export const updateLevelName = (store: GameStore, campaignId: string, levelIndex: number, name: string): boolean => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        return false;
    }
    
    const level = campaign.levels.find(l => l.levelIndex === levelIndex);
    if (!level) {
        return false;
    }
    
    // Si el nombre está vacío, eliminar el nombre personalizado
    if (name.trim() === '') {
        delete level.name;
    } else {
        level.name = name.trim();
    }
    
    campaign.updatedAt = Date.now();
    saveCampaigns(store.campaigns);
    
    return true;
};

/**
 * Obtiene los índices de niveles de una campaña en orden
 */
export const getCampaignLevelIndices = (store: GameStore, campaignId: string | null): number[] => {
    if (!campaignId) {
        // Si no hay campaña seleccionada, usar la por defecto
        const defaultCampaign = store.campaigns.find(c => c.id === DEFAULT_CAMPAIGN_ID);
        if (defaultCampaign) {
            return defaultCampaign.levels
                .sort((a, b) => a.order - b.order)
                .map(l => l.levelIndex);
        }
        return [];
    }
    
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        return [];
    }
    
    return campaign.levels
        .sort((a, b) => a.order - b.order)
        .map(l => l.levelIndex);
};

/**
 * Obtiene la campaña actual
 */
export const getCurrentCampaign = (store: GameStore): Campaign | null => {
    if (!store.currentCampaignId) {
        return store.campaigns.find(c => c.id === DEFAULT_CAMPAIGN_ID) || null;
    }
    
    return store.campaigns.find(c => c.id === store.currentCampaignId) || null;
};

/**
 * Encuentra la campaña que contiene un nivel específico
 * Si el nivel está en múltiples campañas, devuelve la primera que lo encuentre (priorizando no-default)
 */
export const getCampaignForLevel = (store: GameStore, levelIndex: number): Campaign | null => {
    // Primero buscar en campañas no-default (personalizadas)
    for (const campaign of store.campaigns) {
        if (!campaign.isDefault && campaign.levels.some(l => l.levelIndex === levelIndex)) {
            return campaign;
        }
    }
    
    // Si no está en ninguna campaña personalizada, buscar en la default
    const defaultCampaign = store.campaigns.find(c => c.id === DEFAULT_CAMPAIGN_ID);
    if (defaultCampaign && defaultCampaign.levels.some(l => l.levelIndex === levelIndex)) {
        return defaultCampaign;
    }
    
    // Si no está en ninguna campaña, devolver la default como fallback
    return defaultCampaign || null;
};

/**
 * Sincroniza las campañas con el servidor (si el usuario está logueado)
 */
export const syncCampaignsToServer = async (store: GameStore): Promise<boolean> => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        return false;
    }
    
    try {
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        if (!user) {
            return false;
        }
        
        const token = await user.jwt();
        if (!token) {
            return false;
        }
        
        const baseUrl = (window as any).NETLIFY_BASE_URL || '';
        const res = await fetch(`${baseUrl}/.netlify/functions/campaigns`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaigns: store.campaigns
            })
        });
        
        return res.ok;
    } catch (error) {
        console.error('Error sincronizando campañas:', error);
        return false;
    }
};

/**
 * Carga las campañas desde el servidor (si el usuario está logueado)
 */
export const loadCampaignsFromServer = async (store: GameStore): Promise<boolean> => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        return false;
    }
    
    try {
        const ni: any = (window as any).netlifyIdentity;
        const user = ni?.currentUser?.();
        if (!user) {
            return false;
        }
        
        const token = await user.jwt();
        if (!token) {
            return false;
        }
        
        const baseUrl = (window as any).NETLIFY_BASE_URL || '';
        const res = await fetch(`${baseUrl}/.netlify/functions/campaigns`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (res.ok) {
            const data = await res.json();
            if (data && data.campaigns && Array.isArray(data.campaigns)) {
                // Mantener la campaña por defecto si no existe en el servidor
                const hasDefault = data.campaigns.some((c: Campaign) => c.id === DEFAULT_CAMPAIGN_ID);
                if (!hasDefault && store.levelDataStore.length > 0) {
                    data.campaigns.unshift(createDefaultCampaign(store.levelDataStore.length));
                }
                
                store.campaigns = data.campaigns;
                saveCampaigns(store.campaigns);
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error cargando campañas del servidor:', error);
        return false;
    }
};

