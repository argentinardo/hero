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
        campaignBtn.addEventListener('click', () => {
            store.currentCampaignId = campaign.id;
            hideCampaignsModal();
            
            // Obtener los niveles de la campaña y empezar desde el primero
            const levelIndices = getCampaignLevelIndices(store, campaign.id);
            
            if (levelIndices.length > 0) {
                import('./ui').then(({ startGame }) => {
                    startGame(store, null, levelIndices[0], false);
                });
            }
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
        // IMPORTANTE: La campaña Legacy ahora es editable, así que se incluye en el selector
        const option = document.createElement('option');
        option.value = campaign.id;
        // Mostrar el nombre traducido para Legacy
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
        
        if (campaign.levels.length === 0) {
            const noLevelsMsg = document.createElement('p');
            noLevelsMsg.className = 'text-xs opacity-75 text-center';
            noLevelsMsg.textContent = t('campaigns.noCampaigns');
            levelsList.appendChild(noLevelsMsg);
        } else {
            const sortedLevels = [...campaign.levels].sort((a, b) => a.order - b.order);
            sortedLevels.forEach((level, idx) => {
                const levelItem = document.createElement('div');
                levelItem.className = 'flex items-center justify-start mb-1 p-1 bg-gray-800 gap-2';
                
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
                controls.className = 'gap-1';
                
                // Legacy es de solo lectura - no mostrar controles de edición
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
                    removeBtn.textContent = t('campaigns.remove');
                    removeBtn.addEventListener('click', async () => {
                        await removeLevelFromCampaign(store, campaign.id, level.levelIndex);
                        updateCampaignsModal(store);
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
    
    closeBtn?.addEventListener('click', () => {
        hideCampaignsModal();
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

