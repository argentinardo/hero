/**
 * Sistema de Gestión de Campañas
 * 
 * Permite crear, guardar, cargar y gestionar campañas de niveles.
 * Las campañas permiten organizar niveles en secuencias personalizadas.
 */

import type { Campaign, CampaignLevel, GameStore } from '../core/types';
import { getUserStorage, setUserStorage } from './storage';

const CAMPAIGNS_STORAGE_KEY = 'campaigns'; // Ahora se usa con namespace
const DEFAULT_CAMPAIGN_ID = 'default';

/**
 * Crea la campaña por defecto (Legacy) con los niveles originales desde levels.json
 * IMPORTANTE: Esta campaña siempre se sirve desde assets/levels.json y es editable
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
        name: 'Legacy',
        levels,
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
};

/**
 * Carga las campañas desde localStorage (con namespace del usuario)
 */
export const loadCampaigns = (): Campaign[] => {
    try {
        const stored = getUserStorage(CAMPAIGNS_STORAGE_KEY);
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
 * Guarda las campañas en localStorage (con namespace del usuario)
 */
export const saveCampaigns = (campaigns: Campaign[]): void => {
    try {
        setUserStorage(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
    } catch (error) {
        console.error('Error guardando campañas:', error);
    }
};

/**
 * Inicializa las campañas del store
 * IMPORTANTE: La campaña original siempre se crea desde levels.json (totalLevels)
 * y siempre debe reflejar todos los niveles disponibles desde levels.json
 */
export const initializeCampaigns = (store: GameStore, totalLevels: number): void => {
    const loaded = loadCampaigns();
    
    if (loaded.length === 0) {
        // Si no hay campañas guardadas, crear la por defecto con todos los niveles desde levels.json
        store.campaigns = [createDefaultCampaign(totalLevels)];
        saveCampaigns(store.campaigns);
    } else {
        store.campaigns = loaded;
        
        // Actualizar la campaña por defecto para que siempre refleje levels.json
        // Si tiene menos niveles o más niveles, actualizarla para que coincida con levels.json
        const defaultCampaign = store.campaigns.find(c => c.id === DEFAULT_CAMPAIGN_ID);
        if (defaultCampaign) {
            // Si la campaña por defecto tiene diferente cantidad de niveles, actualizarla
            // Esto asegura que siempre refleje levels.json
            if (defaultCampaign.levels.length !== totalLevels) {
                // Crear una nueva campaña por defecto con todos los niveles desde levels.json
                const updatedDefault = createDefaultCampaign(totalLevels);
                // Reemplazar la campaña por defecto existente
                const index = store.campaigns.findIndex(c => c.id === DEFAULT_CAMPAIGN_ID);
                if (index >= 0) {
                    store.campaigns[index] = updatedDefault;
                    saveCampaigns(store.campaigns);
                }
            }
        } else {
            // Si no existe la campaña por defecto, agregarla desde levels.json
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
export const createCampaign = async (store: GameStore, name: string): Promise<Campaign> => {
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
    
    // Sincronizar con el servidor
    await syncCampaignsToServer(store).catch((error) => {
        console.error('Error sincronizando campaña nueva:', error);
    });
    
    return newCampaign;
};

/**
 * Elimina una campaña (no permite eliminar la por defecto)
 */
export const deleteCampaign = async (store: GameStore, campaignId: string): Promise<boolean> => {
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
    
    // Sincronizar con el servidor
    await syncCampaignsToServer(store).catch((error) => {
        console.error('Error sincronizando después de eliminar campaña:', error);
    });
    
    return true;
};

/**
 * Agrega un nivel a una campaña
 * NOTA: Ahora se permite editar la campaña original
 * Si el nivel ya existe, retorna true (el nivel ya está en la campaña)
 */
export const addLevelToCampaign = async (store: GameStore, campaignId: string, levelIndex: number): Promise<{ success: boolean; alreadyExists: boolean }> => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        return { success: false, alreadyExists: false };
    }
    
    // Verificar que el nivel no esté ya en la campaña
    const exists = campaign.levels.some(l => l.levelIndex === levelIndex);
    if (exists) {
        // El nivel ya existe, actualizar la fecha de modificación
        campaign.updatedAt = Date.now();
        saveCampaigns(store.campaigns);
        
        // Sincronizar con el servidor
        await syncCampaignsToServer(store).catch((error) => {
            console.error('Error sincronizando después de actualizar campaña:', error);
        });
        
        return { success: true, alreadyExists: true };
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
    
    // Sincronizar con el servidor
    await syncCampaignsToServer(store).catch((error) => {
        console.error('Error sincronizando después de agregar nivel a campaña:', error);
    });
    
    return { success: true, alreadyExists: false };
};

/**
 * Elimina un nivel de una campaña
 * NOTA: Legacy es de solo lectura - no se permite eliminar niveles
 */
export const removeLevelFromCampaign = async (store: GameStore, campaignId: string, levelIndex: number): Promise<boolean> => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        return false;
    }
    
    // Legacy es de solo lectura - no se puede modificar
    if (campaign.isDefault) {
        return false;
    }
    
    // Para campañas no-Legacy, eliminar de la lista de la campaña
    campaign.levels = campaign.levels.filter(l => l.levelIndex !== levelIndex);
    
    // Reordenar los niveles restantes
    campaign.levels.sort((a, b) => a.order - b.order);
    campaign.levels.forEach((level, index) => {
        level.order = index;
    });
    
    campaign.updatedAt = Date.now();
    saveCampaigns(store.campaigns);
    
    // Sincronizar con el servidor
    await syncCampaignsToServer(store).catch((error) => {
        console.error('Error sincronizando después de eliminar nivel de campaña:', error);
    });
    
    return true;
};

/**
 * Reordena los niveles de una campaña
 * NOTA: Ahora se permite editar la campaña original
 */
export const reorderCampaignLevels = (
    store: GameStore, 
    campaignId: string, 
    newOrder: Array<{ levelIndex: number; order: number }>
): boolean => {
    const campaign = store.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
        return false;
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
 * IMPORTANTE: La campaña original NO se guarda en el servidor, siempre se sirve desde levels.json
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
        
        // IMPORTANTE: Excluir la campaña original al sincronizar
        // La campaña original siempre se sirve desde levels.json
        const campaignsToSync = store.campaigns.filter(c => c.id !== DEFAULT_CAMPAIGN_ID);
        
        const baseUrl = (window as any).NETLIFY_BASE_URL || '';
        const res = await fetch(`${baseUrl}/.netlify/functions/campaigns`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                campaigns: campaignsToSync
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
 * IMPORTANTE: La campaña original siempre se sirve desde levels.json
 * Si existe una campaña original en la BD, se elimina automáticamente
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
                // IMPORTANTE: Eliminar cualquier campaña original de la BD
                // La campaña original siempre se sirve desde levels.json
                const campaignsWithoutDefault = data.campaigns.filter((c: Campaign) => c.id !== DEFAULT_CAMPAIGN_ID);
                
                // Si había una campaña original en la BD, eliminarla del servidor
                const hadDefaultInServer = data.campaigns.some((c: Campaign) => c.id === DEFAULT_CAMPAIGN_ID);
                if (hadDefaultInServer) {
                    console.log('Campaña original encontrada en BD, eliminándola del servidor...');
                    // Intentar eliminarla del servidor
                    try {
                        await fetch(`${baseUrl}/.netlify/functions/campaigns`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ campaignId: DEFAULT_CAMPAIGN_ID })
                        });
                    } catch (e) {
                        console.warn('No se pudo eliminar la campaña original del servidor (puede que el endpoint DELETE no exista):', e);
                    }
                }
                
                // Crear la campaña original desde levels.json (siempre usar levels.json)
                const originalCount = store.initialLevels.length;
                const defaultCampaign = createDefaultCampaign(originalCount);
                
                // Agregar la campaña original al inicio (siempre desde levels.json)
                campaignsWithoutDefault.unshift(defaultCampaign);
                
                store.campaigns = campaignsWithoutDefault;
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

