/**
 * Funciones de UI para el sistema de campañas
 * 
 * Se separan en un archivo separado para mantener ui.ts más manejable
 */

import type { GameStore } from '../core/types';
import {
    addLevelToCampaign,
    createCampaign,
    deleteCampaign,
    getCampaignLevelIndices,
    reorderCampaignLevels,
    removeLevelFromCampaign,
    saveCampaigns,
    syncCampaignsToServer
} from '../utils/campaigns';
import { t } from '../utils/i18n';

/**
 * Sincroniza el selector de niveles para mostrar solo los niveles de la campaña actual
 */
export const syncLevelSelectorForCampaign = (store: GameStore) => {
    const { levelSelectorEl } = store.dom.ui;
    if (!levelSelectorEl) {
        return;
    }
    
    // Obtener los índices de niveles de la campaña actual
    const levelIndices = getCampaignLevelIndices(store, store.currentCampaignId);
    
    // Limpiar el selector
    levelSelectorEl.innerHTML = '';
    
    // Agregar solo los niveles de la campaña actual
    levelIndices.forEach((levelIndex, orderIndex) => {
        const option = document.createElement('option');
        option.value = `${levelIndex}`;
        option.textContent = `${t('editor.levelNumber')} ${orderIndex + 1}`;
        levelSelectorEl.appendChild(option);
    });
    
    // Seleccionar el primer nivel si hay alguno
    if (levelIndices.length > 0 && levelSelectorEl.options.length > 0) {
        levelSelectorEl.value = `${levelIndices[0]}`;
    }
    
    // Sincronizar selector mobile
    const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
    if (levelSelectorMobile) {
        levelSelectorMobile.innerHTML = levelSelectorEl.innerHTML;
        levelSelectorMobile.value = levelSelectorEl.value;
    }
    
    // Si estamos en el editor, cargar el nivel seleccionado
    if (store.appState === 'editing') {
        const selectedIndex = parseInt(levelSelectorEl.value ?? '0', 10);
        if (store.levelDataStore[selectedIndex]) {
            store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[selectedIndex]));
        }
    }
};

/**
 * Muestra el modal de campañas
 */
export const showCampaignsModal = (store: GameStore) => {
    const modal = document.getElementById('campaigns-modal');
    if (!modal) return;
    
    updateCampaignsModal(store);
    modal.classList.remove('hidden');
};

/**
 * Oculta el modal de campañas
 */
export const hideCampaignsModal = () => {
    const modal = document.getElementById('campaigns-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

/**
 * Actualiza el contenido del modal de campañas
 */
const updateCampaignsModal = (store: GameStore) => {
    // Actualizar lista de campañas
    updateCampaignsList(store);
};

/**
 * Actualiza el selector para agregar nivel a campaña
 */
export const updateAddToCampaignSelector = (store: GameStore) => {
    const selector = document.getElementById('add-to-campaign-selector') as HTMLSelectElement | null;
    if (!selector) return;
    
    const titleEl = document.getElementById('add-to-campaign-title');
    const messageEl = document.getElementById('add-to-campaign-message');
    const newCampaignNameInput = document.getElementById('new-campaign-name-input') as HTMLInputElement | null;
    
    if (titleEl) {
        titleEl.textContent = t('campaigns.addToCampaign');
    }
    if (messageEl) {
        messageEl.textContent = t('campaigns.saveToCampaignMessage');
    }
    
    // Limpiar el input de nueva campaña
    if (newCampaignNameInput) {
        newCampaignNameInput.value = '';
        newCampaignNameInput.placeholder = t('campaigns.campaignNamePlaceholder');
    }
    
    selector.innerHTML = '<option value="">' + t('campaigns.selectCampaign') + '</option>';
    store.campaigns.forEach(campaign => {
        const option = document.createElement('option');
        option.value = campaign.id;
        option.textContent = campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name;
        selector.appendChild(option);
    });
};

/**
 * Actualiza la lista de campañas en el modal
 */
const updateCampaignsList = (store: GameStore) => {
    const listEl = document.getElementById('campaigns-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    if (store.campaigns.length === 0) {
        listEl.innerHTML = '<p class="text-sm opacity-75">' + t('campaigns.noCampaigns') + '</p>';
        return;
    }
    
    store.campaigns.forEach(campaign => {
        const campaignDiv = document.createElement('div');
        campaignDiv.className = 'mb-4 p-3 border-2 border-gray-600 bg-gray-700';
        
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-2';
        
        const name = document.createElement('button');
        name.className = 'nes-btn is-primary text-sm';
        name.style.fontFamily = "'Press Start 2P', monospace";
        name.textContent = campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name;
        
        // Al hacer click en el botón, cargar la campaña en el editor
        name.addEventListener('click', () => {
            store.currentCampaignId = campaign.id;
            hideCampaignsModal();
            
            // Actualizar el nombre de la campaña en el panel izquierdo inmediatamente
            import('./ui').then(({ updateEditorTexts }) => {
                updateEditorTexts(store);
            });
            
            // Sincronizar el selector de niveles para mostrar solo los niveles de esta campaña
            syncLevelSelectorForCampaign(store);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'nes-btn is-error text-xs';
        deleteBtn.textContent = t('campaigns.delete');
        if (campaign.isDefault) {
            deleteBtn.disabled = true;
            deleteBtn.title = t('campaigns.cannotDeleteDefault');
        }
        deleteBtn.addEventListener('click', () => {
            if (confirm('¿Seguro que deseas eliminar esta campaña?')) {
                deleteCampaign(store, campaign.id);
                updateCampaignsModal(store);
            }
        });
        
        header.appendChild(name);
        if (!campaign.isDefault) {
            header.appendChild(deleteBtn);
        }
        
        const levelsList = document.createElement('div');
        levelsList.className = 'mt-2';
        
        if (campaign.levels.length === 0) {
            levelsList.innerHTML = '<p class="text-xs opacity-75">Sin niveles</p>';
        } else {
            const sortedLevels = [...campaign.levels].sort((a, b) => a.order - b.order);
            sortedLevels.forEach((level, idx) => {
                const levelItem = document.createElement('div');
                levelItem.className = 'flex items-center justify-between mb-1 p-1 bg-gray-800';
                
                const levelInfo = document.createElement('span');
                levelInfo.className = 'text-xs';
                levelInfo.textContent = `${t('editor.levelNumber')} ${level.levelIndex + 1} (Orden: ${idx + 1})`;
                
                const controls = document.createElement('div');
                controls.className = 'flex gap-1';
                
                if (!campaign.isDefault) {
                    const moveUpBtn = document.createElement('button');
                    moveUpBtn.className = 'nes-btn text-xs';
                    moveUpBtn.textContent = '↑';
                    moveUpBtn.disabled = idx === 0;
                    moveUpBtn.addEventListener('click', () => {
                        if (idx > 0) {
                            const newOrder = sortedLevels.map((l, i) => ({
                                levelIndex: l.levelIndex,
                                order: i === idx ? idx - 1 : i === idx - 1 ? idx : l.order
                            }));
                            reorderCampaignLevels(store, campaign.id, newOrder);
                            updateCampaignsModal(store);
                        }
                    });
                    
                    const moveDownBtn = document.createElement('button');
                    moveDownBtn.className = 'nes-btn text-xs';
                    moveDownBtn.textContent = '↓';
                    moveDownBtn.disabled = idx === sortedLevels.length - 1;
                    moveDownBtn.addEventListener('click', () => {
                        if (idx < sortedLevels.length - 1) {
                            const newOrder = sortedLevels.map((l, i) => ({
                                levelIndex: l.levelIndex,
                                order: i === idx ? idx + 1 : i === idx + 1 ? idx : l.order
                            }));
                            reorderCampaignLevels(store, campaign.id, newOrder);
                            updateCampaignsModal(store);
                        }
                    });
                    
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'nes-btn is-error text-xs';
                    removeBtn.textContent = t('campaigns.remove');
                    removeBtn.addEventListener('click', () => {
                        removeLevelFromCampaign(store, campaign.id, level.levelIndex);
                        updateCampaignsModal(store);
                    });
                    
                    controls.appendChild(moveUpBtn);
                    controls.appendChild(moveDownBtn);
                    controls.appendChild(removeBtn);
                }
                
                levelItem.appendChild(levelInfo);
                levelItem.appendChild(controls);
                levelsList.appendChild(levelItem);
            });
        }
        
        campaignDiv.appendChild(header);
        campaignDiv.appendChild(levelsList);
        listEl.appendChild(campaignDiv);
    });
};

/**
 * Configura los event listeners del modal de campañas
 */
export const setupCampaignsModal = (store: GameStore) => {
    const modal = document.getElementById('campaigns-modal');
    const closeBtn = document.getElementById('campaigns-modal-close-btn');
    const createBtn = document.getElementById('create-campaign-btn');
    const newCampaignNameInput = document.getElementById('new-campaign-name') as HTMLInputElement | null;
    
    // Modal: Agregar nivel a campaña
    const addToCampaignModal = document.getElementById('add-to-campaign-modal');
    const addToCampaignCancelBtn = document.getElementById('add-to-campaign-cancel-btn');
    const addToCampaignConfirmBtn = document.getElementById('add-to-campaign-confirm-btn');
    const addToCampaignSelector = document.getElementById('add-to-campaign-selector') as HTMLSelectElement | null;
    
    closeBtn?.addEventListener('click', () => {
        hideCampaignsModal();
    });
    
    createBtn?.addEventListener('click', () => {
        if (!newCampaignNameInput || !newCampaignNameInput.value.trim()) {
            return;
        }
        
        createCampaign(store, newCampaignNameInput.value.trim());
        newCampaignNameInput.value = '';
        updateCampaignsModal(store);
        syncCampaignsToServer(store).catch(() => {
            // Ignorar errores de sincronización
        });
    });
    
    // Modal: Agregar nivel a campaña
    const newCampaignNameInputAdd = document.getElementById('new-campaign-name-input') as HTMLInputElement | null;
    const createCampaignAndAddBtn = document.getElementById('create-campaign-and-add-btn');
    
    addToCampaignCancelBtn?.addEventListener('click', () => {
        if (addToCampaignModal) {
            addToCampaignModal.classList.add('hidden');
            // Limpiar el input al cerrar
            if (newCampaignNameInputAdd) {
                newCampaignNameInputAdd.value = '';
            }
        }
    });
    
    // Botón para crear nueva campaña y agregar el nivel
    createCampaignAndAddBtn?.addEventListener('click', () => {
        if (!newCampaignNameInputAdd || !newCampaignNameInputAdd.value.trim()) {
            return;
        }
        
        const campaignName = newCampaignNameInputAdd.value.trim();
        const levelIndex = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        
        // Crear la nueva campaña
        const newCampaign = createCampaign(store, campaignName);
        
        // Agregar el nivel a la nueva campaña
        if (addLevelToCampaign(store, newCampaign.id, levelIndex)) {
            import('./ui').then(({ showNotification }) => {
                showNotification(store, `✅ ${t('campaigns.campaignCreated')} - ${t('campaigns.levelAdded')}`, t('campaigns.levelAdded'));
            });
            
            // Limpiar el input
            newCampaignNameInputAdd.value = '';
            
            // Actualizar el selector de campañas en el modal
            updateAddToCampaignSelector(store);
            
            // Cerrar el modal
            if (addToCampaignModal) {
                addToCampaignModal.classList.add('hidden');
            }
            
            syncCampaignsToServer(store).catch(() => {
                // Ignorar errores de sincronización
            });
        }
    });
    
    addToCampaignConfirmBtn?.addEventListener('click', () => {
        if (!addToCampaignSelector || !addToCampaignSelector.value) {
            return;
        }
        
        const campaignId = addToCampaignSelector.value;
        const levelIndex = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        
        if (addLevelToCampaign(store, campaignId, levelIndex)) {
            import('./ui').then(({ showNotification }) => {
                showNotification(store, `✅ ${t('campaigns.levelAdded')}`, t('campaigns.levelAdded'));
            });
            if (addToCampaignModal) {
                addToCampaignModal.classList.add('hidden');
            }
            syncCampaignsToServer(store).catch(() => {
                // Ignorar errores de sincronización
            });
        }
    });
};

