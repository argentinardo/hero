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
    const campaign = store.campaigns.find(c => c.id === store.currentCampaignId);
    levelIndices.forEach((levelIndex, orderIndex) => {
        const option = document.createElement('option');
        option.value = `${levelIndex}`;
        
        // Buscar el nivel en la campaña para obtener su nombre personalizado
        let levelName = `${t('editor.levelNumber')} ${orderIndex + 1}`;
        if (campaign) {
            const campaignLevel = campaign.levels.find(l => l.levelIndex === levelIndex);
            if (campaignLevel?.name) {
                levelName = campaignLevel.name;
            }
        }
        
        option.textContent = levelName;
        levelSelectorEl.appendChild(option);
    });
    
    // Seleccionar el primer nivel si hay alguno
    if (levelIndices.length > 0 && levelSelectorEl.options.length > 0) {
        const firstLevelIndex = levelIndices[0];
        levelSelectorEl.value = `${firstLevelIndex}`;
        
        // Sincronizar selector mobile
        const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
        if (levelSelectorMobile) {
            levelSelectorMobile.innerHTML = levelSelectorEl.innerHTML;
            levelSelectorMobile.value = levelSelectorEl.value;
        }
        
        // Si estamos en el editor, cargar el nivel seleccionado
        if (store.appState === 'editing') {
            // Cargar el nivel en el editor
            if (store.levelDataStore[firstLevelIndex] && store.levelDataStore[firstLevelIndex].length > 0) {
                store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[firstLevelIndex]));
            } else {
                // Si el nivel está vacío, usar una copia del nivel 1 de Legacy
                const legacyLevel1 = store.initialLevels[0] || store.levelDataStore[0];
                if (legacyLevel1) {
                    if (typeof legacyLevel1[0] === 'string') {
                        // Es string[] (filas como strings), convertir a string[][]
                        store.editorLevel = (legacyLevel1 as string[]).map(row => row.split(''));
                    } else {
                        // Ya es string[][]
                        store.editorLevel = JSON.parse(JSON.stringify(legacyLevel1));
                    }
                    // Guardar en levelDataStore para que no se pierda
                    store.levelDataStore[firstLevelIndex] = JSON.parse(JSON.stringify(store.editorLevel));
                    store.initialLevels[firstLevelIndex] = store.editorLevel.map(row => row.join(''));
                }
            }
        }
    } else {
        // Si no hay niveles, sincronizar selector mobile vacío
        const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
        if (levelSelectorMobile) {
            levelSelectorMobile.innerHTML = levelSelectorEl.innerHTML;
        }
    }
};

/**
 * Muestra el modal de campañas
 * @param isPlayMode - Si es true, muestra solo nombres para seleccionar y jugar. Si es false, muestra el gestor completo.
 */
export const showCampaignsModal = (store: GameStore, isPlayMode: boolean = false) => {
    const modal = document.getElementById('campaigns-modal');
    if (!modal) return;
    
    // Cerrar paneles del editor cuando se abre el modal
    if (store.appState === 'editing') {
        const userPanel = document.getElementById('user-panel');
        const editorPanel = document.getElementById('editor-panel');
        
        if (userPanel && !userPanel.classList.contains('collapsed')) {
            userPanel.classList.add('collapsed');
        }
        
        if (editorPanel && !editorPanel.classList.contains('collapsed')) {
            editorPanel.classList.add('collapsed');
        }
        
        // Actualizar estados visuales de los paneles
        const editorToggleBtn = document.getElementById('editor-toggle') as HTMLButtonElement | null;
        const userPanelToggleBtn = document.getElementById('user-panel-toggle') as HTMLButtonElement | null;
        const editorPanelTitle = document.getElementById('editor-panel-title');
        const userPanelTitle = document.getElementById('user-panel-title');
        
        // Actualizar estado visual del panel del editor
        if (editorPanel && editorToggleBtn && editorPanelTitle) {
            editorToggleBtn.style.display = 'flex';
            const editorIconSpan = editorPanelTitle.querySelector('.toggle-icon-title');
            if (editorIconSpan) {
                (editorIconSpan as HTMLElement).style.display = 'none';
            }
        }
        
        // Actualizar estado visual del panel de usuario
        if (userPanel && userPanelToggleBtn && userPanelTitle) {
            userPanelToggleBtn.style.display = 'flex';
            const userIconSpan = userPanelTitle.querySelector('.toggle-icon-title');
            if (userIconSpan) {
                (userIconSpan as HTMLElement).style.display = 'none';
            }
        }
        
        // Ajustar posición del canvas
        const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;
        if (canvasWrapper) {
            canvasWrapper.style.left = '0';
            canvasWrapper.style.width = '100vw';
        }
    }
    
    updateCampaignsModal(store, isPlayMode);
    modal.classList.remove('hidden');
};

/**
 * Oculta el modal de campañas
 * Guarda los niveles antes de cerrar
 */
export const hideCampaignsModal = async (store?: GameStore) => {
    // Si hay store, guardar los niveles antes de cerrar
    if (store) {
        try {
            // Guardar el nivel actual del editor si hay cambios
            if (store.editorLevel && store.dom.ui.levelSelectorEl) {
                const index = parseInt(store.dom.ui.levelSelectorEl.value ?? '0', 10);
                if (store.levelDataStore[index]) {
                    // Limpiar filas y columnas vacías antes de guardar
                    const { purgeEmptyRowsAndColumns } = await import('./ui');
                    const cleanedLevel = purgeEmptyRowsAndColumns(store.editorLevel);
                    store.levelDataStore[index] = JSON.parse(JSON.stringify(cleanedLevel));
                    store.editorLevel = cleanedLevel;
                }
            }
            
            // Sincronizar campañas con el servidor
            const { syncCampaignsToServer, getCurrentCampaign } = await import('../utils/campaigns');
            const currentCampaign = getCurrentCampaign(store);
            const isLegacyCampaign = currentCampaign?.isDefault === true;
            
            // Si es Legacy, guardar en localStorage
            if (isLegacyCampaign) {
                const { buildChunkedFile20x18 } = await import('../utils/levels');
                const levelsAsStrings = store.levelDataStore.map((level: string[][]) => 
                    level.map((row: string[]) => row.join(''))
                );
                const fullPayload = buildChunkedFile20x18(levelsAsStrings);
                
                try {
                    localStorage.setItem('userLevels', JSON.stringify(fullPayload));
                    console.log('[Campaigns] Niveles guardados en localStorage');
                } catch (localError) {
                    console.error('[Campaigns] Error guardando en localStorage:', localError);
                }
            } else {
                // Para otras campañas, sincronizar con el servidor
                await syncCampaignsToServer(store).catch((error) => {
                    console.error('[Campaigns] Error sincronizando campañas:', error);
                });
            }
        } catch (error) {
            console.error('[Campaigns] Error guardando niveles antes de cerrar:', error);
        }
    }
    
    const modal = document.getElementById('campaigns-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
};

/**
 * Actualiza el contenido del modal de campañas
 */
const updateCampaignsModal = (store: GameStore, isPlayMode: boolean = false) => {
    // Actualizar título del modal
    const modalTitle = document.getElementById('campaigns-modal-title');
    if (modalTitle) {
        modalTitle.textContent = isPlayMode ? t('campaigns.select') : t('campaigns.title');
    }
    
    // Ocultar/mostrar secciones según el modo
    const manageSection = document.querySelector('#campaigns-modal .border-t-2');
    
    if (isPlayMode) {
        // Modo jugar: solo mostrar lista de campañas sin gestión
        if (manageSection) {
            (manageSection as HTMLElement).style.display = 'none';
        }
        updateCampaignsListForPlay(store);
    } else {
        // Modo gestión: mostrar todo
        if (manageSection) {
            (manageSection as HTMLElement).style.display = 'block';
        }
        updateCampaignsList(store);
    }
};

/**
 * Actualiza la lista de campañas para modo jugar (solo nombres, sin niveles)
 */
const updateCampaignsListForPlay = (store: GameStore) => {
    const listEl = document.getElementById('campaigns-list');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    if (store.campaigns.length === 0) {
        listEl.innerHTML = '<p class="text-sm opacity-75">' + t('campaigns.noCampaigns') + '</p>';
        return;
    }
    
    store.campaigns.forEach(campaign => {
        const campaignBtn = document.createElement('button');
        campaignBtn.className = 'nes-btn is-primary w-full mb-3 text-sm';
        campaignBtn.style.fontFamily = "'Press Start 2P', monospace";
        campaignBtn.textContent = campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name;
        
        // Al hacer click, iniciar el juego con esa campaña
        campaignBtn.addEventListener('click', async () => {
            // Obtener los niveles de la campaña
            const levelIndices = getCampaignLevelIndices(store, campaign.id);
            
            // Validar que la campaña tenga niveles
            if (levelIndices.length === 0) {
                // Mostrar advertencia y permanecer en el popup de campañas
                const { showNotification } = await import('./ui');
                showNotification(store, `⚠️ Advertencia`, 'La campaña está vacía. Agrega niveles antes de seleccionarla.');
                return; // No cerrar el modal ni cambiar la campaña
            }
            
            store.currentCampaignId = campaign.id;
            await hideCampaignsModal(store);
            
            // Iniciar el juego desde el primer nivel
            import('./ui').then(({ startGame }) => {
                startGame(store, null, levelIndices[0], false);
            });
        });
        
        listEl.appendChild(campaignBtn);
    });
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
        // IMPORTANTE: Legacy es de solo lectura - no se pueden agregar niveles nuevos
        // Solo mostrar campañas personalizadas en el selector para agregar niveles
        if (campaign.isDefault) {
            return; // Omitir Legacy del selector
        }
        const option = document.createElement('option');
        option.value = campaign.id;
        option.textContent = campaign.name;
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
        campaignDiv.setAttribute('data-campaign-id', campaign.id);
        
        const header = document.createElement('div');
        header.className = 'flex items-center justify-between mb-2';
        
        const name = document.createElement('button');
        name.className = 'nes-btn is-primary text-sm';
        name.style.fontFamily = "'Press Start 2P', monospace";
        name.textContent = campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name;
        
        // Al hacer click en el botón, cargar la campaña en el editor
        name.addEventListener('click', async () => {
            // Validar que la campaña tenga niveles
            if (campaign.levels.length === 0) {
                // Mostrar advertencia y permanecer en el popup de campañas
                const { showNotification } = await import('./ui');
                showNotification(store, `⚠️ Advertencia`, 'La campaña está vacía. Agrega niveles antes de seleccionarla.');
                return; // No cerrar el modal ni cambiar la campaña
            }
            
            store.currentCampaignId = campaign.id;
            await hideCampaignsModal(store);
            
            // Obtener los índices de niveles de la campaña
            const levelIndices = getCampaignLevelIndices(store, campaign.id);
            const firstLevelIndex = levelIndices.length > 0 ? levelIndices[0] : 0;
            
            // Si no estamos en el editor, iniciarlo
            if (store.appState !== 'editing') {
                import('./ui').then(async ({ startEditor }) => {
                    await startEditor(store, true);
                    // Después de iniciar el editor, sincronizar y cargar el primer nivel
                    syncLevelSelectorForCampaign(store);
                    // Asegurar que el selector esté en el primer nivel
                    if (store.dom.ui.levelSelectorEl) {
                        store.dom.ui.levelSelectorEl.value = firstLevelIndex.toString();
                    }
                    // Sincronizar también el selector mobile
                    const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
                    if (levelSelectorMobile && store.dom.ui.levelSelectorEl) {
                        levelSelectorMobile.innerHTML = store.dom.ui.levelSelectorEl.innerHTML;
                        levelSelectorMobile.value = store.dom.ui.levelSelectorEl.value;
                    }
                    // Cargar el primer nivel en el editor
                    import('./editor').then(({ updateEditorLevelFromSelector }) => {
                        updateEditorLevelFromSelector(store);
                    });
                    // Actualizar los textos del editor
                    import('./ui').then(({ updateEditorTexts, updateUiBar }) => {
                        updateEditorTexts(store);
                        updateUiBar(store);
                    });
                });
            } else {
                // Si ya estamos en el editor, sincronizar y cargar el primer nivel
                syncLevelSelectorForCampaign(store);
                // Asegurar que el selector esté en el primer nivel
                if (store.dom.ui.levelSelectorEl) {
                    store.dom.ui.levelSelectorEl.value = firstLevelIndex.toString();
                }
                // Sincronizar también el selector mobile
                const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
                if (levelSelectorMobile && store.dom.ui.levelSelectorEl) {
                    levelSelectorMobile.innerHTML = store.dom.ui.levelSelectorEl.innerHTML;
                    levelSelectorMobile.value = store.dom.ui.levelSelectorEl.value;
                }
                // Cargar el primer nivel en el editor
                import('./editor').then(({ updateEditorLevelFromSelector }) => {
                    updateEditorLevelFromSelector(store);
                });
                // Actualizar los textos del editor
                import('./ui').then(({ updateEditorTexts, updateUiBar }) => {
                    updateEditorTexts(store);
                    updateUiBar(store);
                });
            }
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'nes-btn is-error text-xs';
        deleteBtn.textContent = t('campaigns.delete');
        if (campaign.isDefault) {
            deleteBtn.disabled = true;
            deleteBtn.title = t('campaigns.cannotDeleteDefault');
        }
        deleteBtn.addEventListener('click', () => {
            // Usar modal de confirmación en lugar de alert
            const exitModalEl = document.getElementById('exit-modal');
            const exitTitleEl = document.getElementById('exit-title');
            const exitTextEl = document.getElementById('exit-text');
            const exitConfirmBtn = document.getElementById('exit-confirm-btn');
            const exitCancelBtn = document.getElementById('exit-cancel-btn');
            
            if (!exitModalEl || !exitTitleEl || !exitTextEl || !exitConfirmBtn || !exitCancelBtn) {
                return;
            }
            
            exitTitleEl.textContent = t('campaigns.delete');
            exitTextEl.textContent = `¿Seguro que deseas eliminar la campaña "${campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name}"?`;
            exitModalEl.classList.remove('hidden');
            
            const confirmHandler = async () => {
                await deleteCampaign(store, campaign.id);
                updateCampaignsModal(store);
                exitModalEl.classList.add('hidden');
                exitConfirmBtn.removeEventListener('click', confirmHandler);
                exitCancelBtn.removeEventListener('click', cancelHandler);
            };
            
            const cancelHandler = () => {
                exitModalEl.classList.add('hidden');
                exitConfirmBtn.removeEventListener('click', confirmHandler);
                exitCancelBtn.removeEventListener('click', cancelHandler);
            };
            
            exitConfirmBtn.addEventListener('click', confirmHandler);
            exitCancelBtn.addEventListener('click', cancelHandler);
        });
        
        header.appendChild(name);
        if (!campaign.isDefault) {
            header.appendChild(deleteBtn);
        }
        
        // Crear desplegable para niveles
        const levelsDropdown = document.createElement('div');
        levelsDropdown.className = 'mt-2';
        
        // Botón para abrir/cerrar el desplegable
        const dropdownButton = document.createElement('button');
        dropdownButton.type = 'button';
        dropdownButton.className = 'w-full text-left flex items-center justify-between px-2 py-1 border-2 border-gray-600 bg-gray-700 hover:bg-gray-600';
        dropdownButton.style.fontFamily = "'Press Start 2P', monospace";
        dropdownButton.style.fontSize = '0.7rem';
        
        const dropdownText = document.createElement('span');
        dropdownText.textContent = `${t('editor.levels')} (${campaign.levels.length})`;
        
        const dropdownArrow = document.createElement('span');
        dropdownArrow.textContent = '▶'; // Cerrado por defecto
        dropdownArrow.style.marginLeft = '8px';
        
        dropdownButton.appendChild(dropdownText);
        dropdownButton.appendChild(dropdownArrow);
        
        // Contenedor de la lista de niveles (inicialmente oculto)
        const levelsList = document.createElement('div');
        levelsList.className = 'mt-2 border-2 border-gray-600 bg-gray-800 p-2';
        levelsList.style.display = 'none';
        
        // Guardar referencia al desplegable para poder mantenerlo abierto después de actualizar
        (levelsDropdown as any).campaignId = campaign.id;
        
        if (campaign.levels.length === 0) {
            const noLevelsMsg = document.createElement('p');
            noLevelsMsg.className = 'text-xs opacity-75 text-center mb-2';
            noLevelsMsg.textContent = t('campaigns.noLevelsInCampaign') || 'No hay niveles en esta campaña';
            levelsList.appendChild(noLevelsMsg);
        } else {
            const sortedLevels = [...campaign.levels].sort((a, b) => a.order - b.order);
            sortedLevels.forEach((level, idx) => {
                const levelItem = document.createElement('div');
                levelItem.className = 'flex items-center justify-start mb-1 p-1 bg-gray-800 gap-2';
                levelItem.setAttribute('data-level-index', level.levelIndex.toString());
                
                // Crear contenedor para el nombre editable
                const levelNameContainer = document.createElement('div');
                levelNameContainer.className = 'flex-1';
                
                // CRÍTICO: Usar el índice dentro de la campaña (idx + 1), NO el índice global (level.levelIndex + 1)
                // El nombre debe ser "Nivel" + posición en la campaña + 1
                const defaultName = `${t('editor.levelNumber')} ${idx + 1}`;
                const displayName = level.name || defaultName;
                
                // Crear span que se convertirá en input al hacer click
                const levelInfo = document.createElement('span');
                levelInfo.className = 'text-xs cursor-pointer hover:opacity-75';
                levelInfo.textContent = displayName;
                levelInfo.style.fontFamily = "'Press Start 2P', monospace";
                
                // Función para convertir a input editable
                const makeEditable = () => {
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'nes-input text-xs w-full';
                    input.style.fontFamily = "'Press Start 2P', monospace";
                    input.value = level.name || defaultName;
                    input.style.fontSize = '0.6rem';
                    input.style.padding = '2px 4px';
                    
                    const saveName = () => {
                        import('../utils/campaigns').then(({ updateLevelName }) => {
                            updateLevelName(store, campaign.id, level.levelIndex, input.value);
                            // Actualizar el texto del span sin re-renderizar todo el modal
                            const newName = input.value.trim() || defaultName;
                            levelInfo.textContent = newName;
                            levelNameContainer.replaceChild(levelInfo, input);
                            // Actualizar el objeto level en memoria para que se refleje si se vuelve a renderizar
                            level.name = input.value.trim() || undefined;
                        });
                    };
                    
                    const cancelEdit = () => {
                        levelNameContainer.replaceChild(levelInfo, input);
                    };
                    
                    input.addEventListener('blur', saveName);
                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            input.blur();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                        }
                    });
                    
                    levelNameContainer.replaceChild(input, levelInfo);
                    input.focus();
                    input.select();
                };
                
                levelInfo.addEventListener('click', makeEditable);
                
                levelNameContainer.appendChild(levelInfo);
                
                const controls = document.createElement('div');
                controls.className = 'flex gap-1';
                
                // Botón Editar (disponible para todos los niveles)
                const editBtn = document.createElement('button');
                editBtn.className = 'nes-btn is-primary text-xs';
                editBtn.textContent = '✏️';
                editBtn.title = t('editor.edit') || 'Editar';
                editBtn.addEventListener('click', async () => {
                    // Cerrar el modal de campañas
                    await hideCampaignsModal(store);
                    
                    // IMPORTANTE: Establecer la campaña que contiene este nivel
                    // Usar getCampaignForLevel para encontrar la campaña correcta del nivel
                    const { getCampaignForLevel } = await import('../utils/campaigns');
                    const levelCampaign = getCampaignForLevel(store, level.levelIndex);
                    
                    // Si se encuentra una campaña para este nivel, usarla; si no, usar la campaña actual
                    if (levelCampaign) {
                        store.currentCampaignId = levelCampaign.id;
                        console.log(`[Campaigns] ✅ Campaña establecida para nivel ${level.levelIndex}: ${levelCampaign.name}`);
                    } else {
                        // Fallback: usar la campaña desde donde se está editando
                        store.currentCampaignId = campaign.id;
                        console.log(`[Campaigns] ⚠️ No se encontró campaña para nivel ${level.levelIndex}, usando campaña actual: ${campaign.name}`);
                    }
                    
                    // Sincronizar el selector de niveles para mostrar solo los niveles de esta campaña PRIMERO
                    syncLevelSelectorForCampaign(store);
                    
                    // Después de sincronizar, establecer el nivel correcto en el selector
                    if (store.dom.ui.levelSelectorEl) {
                        store.dom.ui.levelSelectorEl.value = level.levelIndex.toString();
                    }
                    // Sincronizar también el selector mobile
                    const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
                    if (levelSelectorMobile && store.dom.ui.levelSelectorEl) {
                        levelSelectorMobile.value = store.dom.ui.levelSelectorEl.value;
                    }
                    
                    // Cargar el nivel en el editor
                    // Si el nivel existe en levelDataStore, usarlo; si no, usar una copia del nivel 1 de Legacy
                    if (store.levelDataStore[level.levelIndex] && store.levelDataStore[level.levelIndex].length > 0) {
                        store.editorLevel = JSON.parse(JSON.stringify(store.levelDataStore[level.levelIndex]));
                    } else {
                        // Si el nivel está vacío, usar una copia del nivel 1 de Legacy
                        const legacyLevel1 = store.initialLevels[0] || store.levelDataStore[0];
                        if (legacyLevel1) {
                            if (typeof legacyLevel1[0] === 'string') {
                                // Es string[] (filas como strings), convertir a string[][]
                                store.editorLevel = (legacyLevel1 as string[]).map(row => row.split(''));
                            } else {
                                // Ya es string[][]
                                store.editorLevel = JSON.parse(JSON.stringify(legacyLevel1));
                            }
                            // Guardar en levelDataStore para que no se pierda
                            store.levelDataStore[level.levelIndex] = JSON.parse(JSON.stringify(store.editorLevel));
                            store.initialLevels[level.levelIndex] = store.editorLevel.map(row => row.join(''));
                        } else {
                            console.error(`[Campaigns] No se pudo cargar el nivel ${level.levelIndex}. Nivel 1 de Legacy no encontrado.`);
                        }
                    }
                    
                    // Actualizar los textos del editor (nombre de campaña, etc.)
                    import('./ui').then(({ updateEditorTexts, updateUiBar }) => {
                        updateEditorTexts(store);
                        // Actualizar level-count usando updateUiBar que ya tiene la lógica correcta
                        updateUiBar(store);
                    });
                    
                    // Si no estamos en el editor, iniciarlo preservando el nivel actual
                    if (store.appState !== 'editing') {
                        import('./ui').then(async ({ startEditor }) => {
                            await startEditor(store, true);
                            // Después de iniciar el editor, asegurar que todo esté sincronizado
                            syncLevelSelectorForCampaign(store);
                            if (store.dom.ui.levelSelectorEl) {
                                store.dom.ui.levelSelectorEl.value = level.levelIndex.toString();
                            }
                            // Actualizar los textos del editor para mostrar la campaña correcta
                            import('./ui').then(({ updateEditorTexts }) => {
                                updateEditorTexts(store);
                            });
                            // Cargar el nivel en el editor
                            import('./editor').then(({ updateEditorLevelFromSelector }) => {
                                updateEditorLevelFromSelector(store);
                            });
                        });
                    } else {
                        // Si ya estamos en el editor, actualizar el nivel
                        // Sincronizar el selector de niveles para la campaña actual primero
                        syncLevelSelectorForCampaign(store);
                        // Asegurar que el selector esté en el nivel correcto después de sincronizar
                        if (store.dom.ui.levelSelectorEl) {
                            store.dom.ui.levelSelectorEl.value = level.levelIndex.toString();
                        }
                        // Sincronizar también el selector mobile
                        const levelSelectorMobile = document.getElementById('level-selector-mobile') as HTMLSelectElement | null;
                        if (levelSelectorMobile && store.dom.ui.levelSelectorEl) {
                            levelSelectorMobile.innerHTML = store.dom.ui.levelSelectorEl.innerHTML;
                            levelSelectorMobile.value = store.dom.ui.levelSelectorEl.value;
                        }
                        // Actualizar los textos del editor para mostrar la campaña correcta
                        import('./ui').then(({ updateEditorTexts }) => {
                            updateEditorTexts(store);
                        });
                        // Cargar el nivel en el editor
                        import('./editor').then(({ updateEditorLevelFromSelector }) => {
                            updateEditorLevelFromSelector(store);
                        });
                    }
                });
                controls.appendChild(editBtn);
                
                // Legacy es de solo lectura - no mostrar controles de mover/eliminar
                if (!campaign.isDefault) {
                    // Campañas no-Legacy: mostrar botones de mover y eliminar
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
                    removeBtn.textContent = '🗑️';
                    removeBtn.title = t('campaigns.remove') || 'Quitar';
                    removeBtn.addEventListener('click', async () => {
                        // Pedir confirmación antes de borrar
                        const exitModalEl = document.getElementById('exit-modal');
                        const exitTitleEl = document.getElementById('exit-title');
                        const exitTextEl = document.getElementById('exit-text');
                        const exitConfirmBtn = document.getElementById('exit-confirm-btn');
                        const exitCancelBtn = document.getElementById('exit-cancel-btn');
                        
                        if (!exitModalEl || !exitTitleEl || !exitTextEl || !exitConfirmBtn || !exitCancelBtn) {
                            return;
                        }
                        
                        // Obtener el nombre del nivel para mostrar en el mensaje
                        const levelName = level.name || `${t('editor.levelNumber')} ${campaign.levels.findIndex(l => l.levelIndex === level.levelIndex) + 1}`;
                        const campaignName = campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name;
                        
                        exitTitleEl.textContent = t('campaigns.remove') || 'Quitar nivel';
                        exitTextEl.textContent = `¿Seguro que deseas quitar el nivel "${levelName}" de la campaña "${campaignName}"?`;
                        exitModalEl.classList.remove('hidden');
                        
                        const confirmHandler = async () => {
                            await removeLevelFromCampaign(store, campaign.id, level.levelIndex);
                            updateCampaignsModal(store);
                            exitModalEl.classList.add('hidden');
                            exitConfirmBtn.removeEventListener('click', confirmHandler);
                            exitCancelBtn.removeEventListener('click', cancelHandler);
                        };
                        
                        const cancelHandler = () => {
                            exitModalEl.classList.add('hidden');
                            exitConfirmBtn.removeEventListener('click', confirmHandler);
                            exitCancelBtn.removeEventListener('click', cancelHandler);
                        };
                        
                        exitConfirmBtn.addEventListener('click', confirmHandler);
                        exitCancelBtn.addEventListener('click', cancelHandler);
                    });
                    
                    controls.appendChild(moveUpBtn);
                    controls.appendChild(moveDownBtn);
                    controls.appendChild(removeBtn);
                }
                
                levelItem.appendChild(levelNameContainer);
                levelItem.appendChild(controls);
                levelsList.appendChild(levelItem);
            });
        }
        
        // Botón para añadir nivel (al final de la lista)
        // IMPORTANTE: Legacy es de solo lectura - no mostrar botón para Legacy
        const addLevelBtn = document.createElement('button');
        addLevelBtn.className = 'nes-btn is-success w-full mt-2 text-xs';
        addLevelBtn.style.fontFamily = "'Press Start 2P', monospace";
        addLevelBtn.textContent = '+ Añadir nivel';
        
        // Ocultar el botón para Legacy
        if (campaign.isDefault) {
            addLevelBtn.style.display = 'none';
        }
        
        addLevelBtn.addEventListener('click', async () => {
            // Validar que no sea Legacy (doble verificación)
            if (campaign.isDefault) {
                import('./ui').then(({ showNotification }) => {
                    showNotification(store, `❌ Error`, 'Legacy es de solo lectura. No se pueden agregar niveles nuevos.');
                });
                return;
            }
            // Asegurarse de que el desplegable esté abierto antes de añadir el nivel
            if (levelsList.style.display === 'none') {
                levelsList.style.display = 'block';
                dropdownArrow.textContent = '▼';
            }
            
            // Crear un nuevo nivel como réplica del nivel 1 de Legacy
            // Obtener el nivel 1 de Legacy (índice 0)
            const legacyLevel1 = store.initialLevels[0] || store.levelDataStore[0];
            
            if (!legacyLevel1) {
                console.error('[Campaigns] No se pudo encontrar el nivel 1 de Legacy');
                import('./ui').then(({ showNotification }) => {
                    showNotification(store, `❌ Error`, 'No se pudo crear el nivel. Nivel 1 de Legacy no encontrado.');
                });
                return;
            }
            
            // Crear una copia profunda del nivel 1 de Legacy
            // Si legacyLevel1 es string[] (filas como strings), convertir a string[][]
            let newLevel: string[][];
            if (Array.isArray(legacyLevel1[0]) && typeof legacyLevel1[0] === 'string' && legacyLevel1[0].length > 0 && typeof legacyLevel1[0][0] === 'string') {
                // Ya es string[][]
                newLevel = JSON.parse(JSON.stringify(legacyLevel1));
            } else if (typeof legacyLevel1[0] === 'string') {
                // Es string[] (filas como strings), convertir a string[][]
                newLevel = (legacyLevel1 as string[]).map(row => row.split(''));
            } else {
                // Fallback: usar el patrón por defecto del botón "Nuevo Nivel"
                const canvas = store.dom.canvas;
                if (!canvas) return;
                
                const TILE_SIZE = 72;
                const levelWidth = Math.floor(canvas.width / TILE_SIZE);
                const levelHeight = Math.floor(canvas.height / TILE_SIZE) + 5;
                
                const defaultPattern = [
                    "11111111111111111111",
                    "11000001000000001111",
                    "11000001000000001111",
                    "100P000C000000000111",
                    "1000000C000000000111",
                    "1000000C000000000111",
                    "11111111100111111111",
                    "11111111100111111111",
                    "11111111100111111111"
                ];
                
                newLevel = [];
                for (let row = 0; row < defaultPattern.length; row++) {
                    newLevel.push(defaultPattern[row].split(''));
                }
                for (let row = defaultPattern.length; row < levelHeight; row++) {
                    const levelRow: string[] = [];
                    for (let col = 0; col < levelWidth; col++) {
                        levelRow.push('0');
                    }
                    newLevel.push(levelRow);
                }
            }
            
            // Crear una copia profunda del nivel
            const newLevelCopy = JSON.parse(JSON.stringify(newLevel));
            
            // IMPORTANTE: Encontrar el siguiente índice disponible que NO esté en la campaña
            // Primero, obtener todos los índices que ya están en la campaña
            const existingIndices = new Set(campaign.levels.map(l => l.levelIndex));
            
            // Encontrar el siguiente índice disponible
            // Empezar desde el tamaño actual del array (que es el siguiente índice disponible)
            let newLevelIndex = store.levelDataStore.length;
            
            // Asegurarse de que el índice no esté en uso en la campaña
            // Si el índice ya está en la campaña, buscar el siguiente disponible
            while (existingIndices.has(newLevelIndex)) {
                newLevelIndex++;
            }
            
            // Asegurarse de que levelDataStore tenga espacio para el nuevo índice
            // Si el nuevo índice es mayor que el tamaño actual, expandir el array
            // IMPORTANTE: Los niveles intermedios deben ser copias del nivel 1 de Legacy, no vacíos
            // Reutilizar legacyLevel1 ya declarado arriba y crear la copia para expandir
            let legacyLevel1Copy: string[][] = [];
            
            if (legacyLevel1) {
                // Convertir a string[][] si es necesario
                if (Array.isArray(legacyLevel1[0]) && typeof legacyLevel1[0] === 'string' && legacyLevel1[0].length > 0 && typeof legacyLevel1[0][0] === 'string') {
                    // Ya es string[][]
                    legacyLevel1Copy = JSON.parse(JSON.stringify(legacyLevel1));
                } else if (typeof legacyLevel1[0] === 'string') {
                    // Es string[] (filas como strings), convertir a string[][]
                    legacyLevel1Copy = (legacyLevel1 as string[]).map(row => row.split(''));
                } else {
                    // Fallback: usar levelDataStore[0] si está disponible
                    legacyLevel1Copy = store.levelDataStore[0] ? JSON.parse(JSON.stringify(store.levelDataStore[0])) : [];
                }
            }
            
            while (store.levelDataStore.length <= newLevelIndex) {
                // Usar copia del nivel 1 de Legacy en lugar de array vacío
                store.levelDataStore.push(JSON.parse(JSON.stringify(legacyLevel1Copy)));
                store.initialLevels.push(legacyLevel1Copy.map((row: string[]) => row.join('')));
            }
            
            // Agregar el nuevo nivel en el índice calculado
            // Asegurarse de que newLevelCopy tenga contenido antes de guardar
            if (!newLevelCopy || newLevelCopy.length === 0) {
                console.error('[Campaigns] ❌ Error: newLevelCopy está vacío. No se puede crear el nivel.');
                import('./ui').then(({ showNotification }) => {
                    showNotification(store, `❌ Error`, 'No se pudo crear el nivel. El nivel está vacío.');
                });
                return;
            }
            
            // Guardar el nivel en levelDataStore (formato string[][])
            store.levelDataStore[newLevelIndex] = JSON.parse(JSON.stringify(newLevelCopy));
            // Guardar también en initialLevels (formato string[])
            store.initialLevels[newLevelIndex] = newLevelCopy.map((row: string[]) => row.join(''));
            
            console.log(`[Campaigns] ✅ Creando nuevo nivel en índice ${newLevelIndex}. Índices existentes en campaña:`, Array.from(existingIndices), 'Tamaño levelDataStore:', store.levelDataStore.length, 'Filas del nivel:', newLevelCopy.length);
            
            // Agregar el nivel a la campaña
            const result = await addLevelToCampaign(store, campaign.id, newLevelIndex);
            if (result.success) {
                // Sincronizar con el servidor
                syncCampaignsToServer(store).catch(() => {
                    // Ignorar errores de sincronización
                });
                
                // Si el editor está abierto y esta es la campaña actual, sincronizar el selector y cargar el nivel
                if (store.appState === 'editing' && store.currentCampaignId === campaign.id) {
                    // Establecer la campaña actual si no está establecida
                    store.currentCampaignId = campaign.id;
                    
                    // Sincronizar el selector de niveles para mostrar solo los niveles de esta campaña
                    syncLevelSelectorForCampaign(store);
                    
                    // Seleccionar el nuevo nivel
                    if (store.dom.ui.levelSelectorEl) {
                        store.dom.ui.levelSelectorEl.value = newLevelIndex.toString();
                    }
                    
                    // Cargar el nivel en el editor
                    store.editorLevel = JSON.parse(JSON.stringify(newLevelCopy));
                    
                    // Actualizar el editor con el nuevo nivel
                    import('./editor').then(({ updateEditorLevelFromSelector }) => {
                        updateEditorLevelFromSelector(store);
                    });
                }
                
                // Actualizar el modal para reflejar el nuevo nivel
                updateCampaignsModal(store);
                
                // Asegurarse de que el desplegable permanezca abierto después de actualizar
                setTimeout(() => {
                    const updatedCampaignDiv = document.querySelector(`[data-campaign-id="${campaign.id}"]`);
                    if (updatedCampaignDiv) {
                        const updatedLevelsList = (updatedCampaignDiv as HTMLElement).querySelector('.mt-2.border-2.border-gray-600') as HTMLElement | null;
                        const updatedDropdownButton = (updatedCampaignDiv as HTMLElement).querySelector('.w-full.text-left.flex.items-center.justify-between') as HTMLElement | null;
                        const updatedDropdownArrow = updatedDropdownButton?.querySelector('span:last-child') as HTMLElement | null;
                        if (updatedLevelsList && updatedDropdownButton && updatedDropdownArrow) {
                            // Mantener el desplegable abierto
                            updatedLevelsList.style.display = 'block';
                            updatedDropdownArrow.textContent = '▼';
                            
                            // Actualizar el contador de niveles en el botón
                            const updatedDropdownText = updatedDropdownButton.querySelector('span:first-child') as HTMLElement | null;
                            if (updatedDropdownText) {
                                updatedDropdownText.textContent = `${t('editor.levels')} (${campaign.levels.length})`;
                            }
                        }
                    }
                }, 50);
                
                // Hacer foco en el nombre del nuevo nivel para editarlo
                setTimeout(() => {
                    // Buscar el nuevo nivel en la lista actualizada usando el data-level-index
                    const updatedCampaignDiv = document.querySelector(`[data-campaign-id="${campaign.id}"]`) || 
                                               Array.from(document.querySelectorAll('.mb-4.p-3.border-2')).find((div: any) => {
                                                   const nameBtn = div.querySelector('button.nes-btn.is-primary');
                                                   return nameBtn && nameBtn.textContent === (campaign.isDefault ? t('campaigns.defaultCampaign') : campaign.name);
                                               });
                    
                    if (updatedCampaignDiv) {
                        const updatedLevelsList = (updatedCampaignDiv as HTMLElement).querySelector('.mt-2.border-2.border-gray-600');
                        if (updatedLevelsList) {
                            // Buscar el último item de nivel (que debería ser el nuevo)
                            const levelItems = updatedLevelsList.querySelectorAll('[data-level-index]');
                            if (levelItems.length > 0) {
                                // El último item debería ser el nuevo nivel
                                const lastItem = levelItems[levelItems.length - 1] as HTMLElement;
                                const levelNameContainer = lastItem.querySelector('.flex-1');
                                if (levelNameContainer) {
                                    const span = levelNameContainer.querySelector('span.text-xs.cursor-pointer');
                                    if (span) {
                                        // Hacer click para activar la edición
                                        (span as HTMLElement).click();
                                    }
                                }
                            }
                        }
                    }
                }, 200);
            } else {
                import('./ui').then(({ showNotification }) => {
                    showNotification(store, `❌ Error`, 'No se pudo agregar el nivel a la campaña.');
                });
            }
        });
        levelsList.appendChild(addLevelBtn);
        
        // Toggle del desplegable
        dropdownButton.addEventListener('click', () => {
            const isHidden = levelsList.style.display === 'none';
            levelsList.style.display = isHidden ? 'block' : 'none';
            dropdownArrow.textContent = isHidden ? '▼' : '▶';
        });
        
        levelsDropdown.appendChild(dropdownButton);
        levelsDropdown.appendChild(levelsList);
        
        campaignDiv.appendChild(header);
        campaignDiv.appendChild(levelsDropdown);
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
    
    closeBtn?.addEventListener('click', async () => {
        await hideCampaignsModal(store);
    });
    
    createBtn?.addEventListener('click', async () => {
        if (!newCampaignNameInput || !newCampaignNameInput.value.trim()) {
            return;
        }
        
        await createCampaign(store, newCampaignNameInput.value.trim());
        newCampaignNameInput.value = '';
        updateCampaignsModal(store);
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
    createCampaignAndAddBtn?.addEventListener('click', async () => {
        if (!newCampaignNameInputAdd || !newCampaignNameInputAdd.value.trim()) {
            return;
        }
        
        const campaignName = newCampaignNameInputAdd.value.trim();
        const levelIndex = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        
        // Crear la nueva campaña
        const newCampaign = await createCampaign(store, campaignName);
        
        // Agregar el nivel a la nueva campaña
        const result = await addLevelToCampaign(store, newCampaign.id, levelIndex);
        if (result.success) {
            import('./ui').then(({ showNotification }) => {
                if (result.alreadyExists) {
                    showNotification(store, `ℹ️ ${t('campaigns.levelAlreadyInCampaign')}`, 'El nivel ya estaba en la campaña y se ha actualizado.');
                } else {
                    showNotification(store, `✅ ${t('campaigns.campaignCreated')} - ${t('campaigns.levelAdded')}`, t('campaigns.levelAdded'));
                }
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
    
    addToCampaignConfirmBtn?.addEventListener('click', async () => {
        if (!addToCampaignSelector || !addToCampaignSelector.value) {
            return;
        }
        
        const campaignId = addToCampaignSelector.value;
        const levelIndex = parseInt(store.dom.ui.levelSelectorEl?.value ?? '0', 10);
        
        // IMPORTANTE: Guardar los cambios del nivel antes de agregarlo a la campaña
        // Esto asegura que los cambios editados se persistan
        // Nota: purgeEmptyRowsAndColumns se usa desde ui.ts, pero aquí simplemente guardamos el nivel actual
        if (store.editorLevel && store.levelDataStore[levelIndex]) {
            // Guardar el nivel actual del editor (ya viene limpio del editor)
            store.levelDataStore[levelIndex] = JSON.parse(JSON.stringify(store.editorLevel));
        }
        
        const result = await addLevelToCampaign(store, campaignId, levelIndex);
        if (result.success) {
            const { getCurrentCampaign } = await import('../utils/campaigns');
            const currentCampaign = getCurrentCampaign(store);
            const isLegacyCampaign = currentCampaign?.isDefault === true;
            
            // Si es Legacy y el nivel ya existía, guardar en el archivo del proyecto
            if (isLegacyCampaign && result.alreadyExists) {
                // Guardar en el archivo del proyecto para Legacy
                const { buildChunkedFile20x18 } = await import('../utils/levels');
                
                // Convertir todos los niveles a strings (ya están limpios del editor)
                const levelsAsStrings = store.levelDataStore.map((level: string[][]) => 
                    level.map((row: string[]) => row.join(''))
                );
                
                // Payload completo para Legacy
                const fullPayload = buildChunkedFile20x18(levelsAsStrings);
                
                // Guardar en localStorage
                try {
                    localStorage.setItem('userLevels', JSON.stringify(fullPayload));
                    console.log('Cambios de campaña Legacy guardados en localStorage');
                } catch (localError) {
                    console.error('Error guardando en localStorage:', localError);
                }
                
                // Intentar guardar directamente en el archivo del proyecto (solo en desarrollo)
                try {
                    const response = await fetch('/api/save-levels', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(fullPayload),
                    });
                    
                    if (response.ok) {
                        console.log('Archivo levels.json guardado exitosamente en src/assets/levels.json');
                        const { showNotification } = await import('./ui');
                        showNotification(store, `💾 Nivel actualizado`, 'Archivo levels.json guardado en src/assets/levels.json');
                    } else {
                        // Fallback: descargar el archivo
                        const blob = new Blob([JSON.stringify(fullPayload, null, 4)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const anchor = document.createElement('a');
                        anchor.href = url;
                        anchor.download = 'levels.json';
                        document.body.appendChild(anchor);
                        anchor.click();
                        document.body.removeChild(anchor);
                        URL.revokeObjectURL(url);
                        const { showNotification } = await import('./ui');
                        showNotification(store, `💾 Nivel actualizado`, 'Archivo levels.json descargado. Reemplaza src/assets/levels.json con el archivo descargado.');
                    }
                } catch (apiError) {
                    // Fallback: descargar el archivo
                    const blob = new Blob([JSON.stringify(fullPayload, null, 4)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = 'levels.json';
                    document.body.appendChild(anchor);
                    anchor.click();
                    document.body.removeChild(anchor);
                    URL.revokeObjectURL(url);
                    const { showNotification } = await import('./ui');
                    showNotification(store, `💾 Nivel actualizado`, 'Archivo levels.json descargado. Reemplaza src/assets/levels.json con el archivo descargado.');
                }
            } else {
                // Para otras campañas o cuando se agrega un nivel nuevo, solo sincronizar
                syncCampaignsToServer(store).catch(() => {
                    // Ignorar errores de sincronización
                });
            }
            
            import('./ui').then(({ showNotification }) => {
                if (result.alreadyExists) {
                    if (isLegacyCampaign) {
                        showNotification(store, `💾 ${t('campaigns.levelAlreadyInCampaign')}`, 'Nivel actualizado. Archivo levels.json descargado.');
                    } else {
                        showNotification(store, `ℹ️ ${t('campaigns.levelAlreadyInCampaign')}`, 'El nivel ya estaba en la campaña y se ha actualizado.');
                    }
                } else {
                    showNotification(store, `✅ ${t('campaigns.levelAdded')}`, t('campaigns.levelAdded'));
                }
            });
            
            if (addToCampaignModal) {
                addToCampaignModal.classList.add('hidden');
            }
        } else {
            import('./ui').then(({ showNotification }) => {
                showNotification(store, `❌ Error`, 'No se pudo agregar el nivel a la campaña.');
            });
        }
    });
};

