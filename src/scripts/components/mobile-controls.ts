/**
 * Sistema de controles móviles con 4 modos:
 * - hybrid: Control fijo + virtual arrastrable + botones bomba y láser
 * - onehand: Sin control fijo izquierdo, sin botón bomba. Bomba con direccional abajo, fire como switch
 * - virtual: Solo joystick virtual + 2 botones
 * - fixed: Solo control fijo, sin joystick virtual
 */

import type { GameStore } from '../core/types';
import type { ControlMode } from '../core/settings';
import nipplejs from 'nipplejs';
import type { EventData as NippleEvent, Joystick as NippleJoystick } from 'nipplejs';
import { isTvMode } from '../utils/device';

/**
 * Restaura la posición por defecto de action-zone
 */
const resetActionZonePosition = () => {
    const actionZone = document.getElementById('action-zone');
    if (actionZone) {
        actionZone.style.top = '';
        actionZone.style.right = '';
        actionZone.style.left = '';
        actionZone.style.bottom = '';
        actionZone.style.transform = '';
        actionZone.style.flexDirection = '';
        actionZone.style.justifyContent = '';
        actionZone.style.paddingTop = '';
        actionZone.style.paddingBottom = '';
        actionZone.style.marginTop = '';
    }
};

/**
 * Aplica el modo de control configurado
 */
export const applyControlMode = (store: GameStore, mode: ControlMode) => {
    // Solo aplicar si estamos en un dispositivo táctil y no en modo TV
    if (!('ontouchstart' in window) || isTvMode()) {
        return;
    }
    
    const { mobileControlsEl } = store.dom.ui;
    const directionalButtons = document.getElementById('directional-buttons');
    const bombBtn = document.getElementById('bomb-btn');
    const shootBtn = document.getElementById('shoot-btn');
    const joystickZone = document.getElementById('joystick-zone');
    
    // Activar el contenedor de controles móviles
    if (mobileControlsEl) {
        mobileControlsEl.dataset.active = 'true';
    }
    
    // Resetear todos los controles
    if (store.joystickManager) {
        store.joystickManager.destroy();
        store.joystickManager = null;
    }
    
    // Resetear estado de botones
    store.keys.ArrowUp = false;
    store.keys.ArrowLeft = false;
    store.keys.ArrowRight = false;
    store.keys.ArrowDown = false;
    store.keys.Space = false;
    store.isLaserSticky = false;
    
    if (shootBtn) {
        shootBtn.classList.remove('sticky-active');
        shootBtn.classList.remove('active');
    }
    
    // Resetear contador de taps
    lastShootTap = 0;
    
    switch (mode) {
        case 'hybrid':
            // Mostrar control fijo y botón bomba, resetear posición de action-zone
            if (directionalButtons) directionalButtons.style.display = 'flex';
            if (bombBtn) bombBtn.style.display = '';
            if (shootBtn) {
                shootBtn.style.display = '';
                shootBtn.style.top = '';
            }
            resetActionZonePosition();
            setupHybridMode(store);
            break;
            
        case 'onehand':
            // Ocultar control fijo y botón bomba, mover action-zone abajo derecha con flex-direction row
            if (directionalButtons) directionalButtons.style.display = 'none';
            if (bombBtn) bombBtn.style.display = 'none';
            if (shootBtn) {
                shootBtn.style.display = '';
                shootBtn.style.top = '0';
            }
            const actionZone = document.getElementById('action-zone');
            if (actionZone) {
                actionZone.style.top = '40px';
                actionZone.style.right = '0';
                actionZone.style.left = 'auto';
                actionZone.style.bottom = 'auto';
                actionZone.style.transform = 'none';
                actionZone.style.flexDirection = 'row';
                actionZone.style.justifyContent = 'flex-end';
                actionZone.style.paddingTop = '';
                actionZone.style.paddingBottom = '';
                actionZone.style.marginTop = '40px';
            }
            setupOneHandMode(store);
            break;
            
        case 'virtual':
            // Ocultar control fijo, mostrar solo joystick virtual + botones
            if (directionalButtons) directionalButtons.style.display = 'none';
            if (bombBtn) bombBtn.style.display = '';
            if (shootBtn) {
                shootBtn.style.display = '';
                shootBtn.style.top = '';
            }
            resetActionZonePosition();
            setupVirtualMode(store);
            break;
            
        case 'fixed':
            // Solo control fijo, sin joystick virtual
            if (directionalButtons) directionalButtons.style.display = 'flex';
            if (bombBtn) bombBtn.style.display = '';
            if (shootBtn) {
                shootBtn.style.display = '';
                shootBtn.style.top = '';
            }
            resetActionZonePosition();
            setupFixedMode(store);
            break;
    }
};

/**
 * Modo Híbrido: Control fijo + virtual + botones
 */
const setupHybridMode = (store: GameStore) => {
    const { joystickZoneEl } = store.dom.ui;
    if (!joystickZoneEl) return;
    
    // Crear joystick virtual flotante
    store.joystickManager = nipplejs.create({
        zone: joystickZoneEl,
        mode: 'dynamic',
        position: { left: '50%', top: '50%' },
        color: 'white',
        catchforce: true,
    });
    
    store.joystickManager.on('move', (_evt: NippleEvent, data: NippleJoystick) => {
        const angle = data.angle.radian;
        const force = data.force;
        if (force <= 0.2) return;
        
        const up = Math.sin(angle);
        const right = Math.cos(angle);
        store.keys.ArrowUp = up > 0.5;
        
        if (Math.abs(right) > 0.3) {
            if (right > 0) {
                store.keys.ArrowRight = true;
                store.keys.ArrowLeft = false;
            } else {
                store.keys.ArrowLeft = true;
                store.keys.ArrowRight = false;
            }
        } else {
            store.keys.ArrowLeft = false;
            store.keys.ArrowRight = false;
        }
    });
    
    store.joystickManager.on('end', () => {
        store.keys.ArrowUp = false;
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
    });
    
    // Configurar botones direccionales fijos
    setupDirectionalButtons(store);
    
    // Configurar botones de acción
    setupActionButtons(store, true);
};

/**
 * Modo Una Mano: Sin control fijo, bomba con direccional abajo, fire como switch
 */
const setupOneHandMode = (store: GameStore) => {
    const { joystickZoneEl } = store.dom.ui;
    if (!joystickZoneEl) return;
    
    // Crear joystick virtual flotante
    store.joystickManager = nipplejs.create({
        zone: joystickZoneEl,
        mode: 'dynamic',
        position: { left: '50%', top: '50%' },
        color: 'white',
        catchforce: true,
    });
    
    store.joystickManager.on('move', (_evt: NippleEvent, data: NippleJoystick) => {
        const angle = data.angle.radian;
        const force = data.force;
        if (force <= 0.2) return;
        
        const up = Math.sin(angle);
        const right = Math.cos(angle);
        const down = -up;
        
        store.keys.ArrowUp = up > 0.5;
        store.keys.ArrowDown = down > 0.5; // Bomba con direccional abajo
        
        if (Math.abs(right) > 0.3) {
            if (right > 0) {
                store.keys.ArrowRight = true;
                store.keys.ArrowLeft = false;
            } else {
                store.keys.ArrowLeft = true;
                store.keys.ArrowRight = false;
            }
        } else {
            store.keys.ArrowLeft = false;
            store.keys.ArrowRight = false;
        }
    });
    
    store.joystickManager.on('end', () => {
        store.keys.ArrowUp = false;
        store.keys.ArrowDown = false;
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
    });
    
    // Configurar botones de acción (fire como switch)
    setupActionButtons(store, false, true);
};

/**
 * Modo Fija: Solo control fijo, sin joystick virtual
 */
const setupFixedMode = (store: GameStore) => {
    // No crear joystick virtual, solo usar botones direccionales fijos
    setupDirectionalButtons(store);
    
    // Configurar botones de acción normales
    setupActionButtons(store, true);
};

/**
 * Modo Virtual: Solo joystick virtual + 2 botones
 */
const setupVirtualMode = (store: GameStore) => {
    const { joystickZoneEl } = store.dom.ui;
    if (!joystickZoneEl) return;
    
    // Crear joystick virtual flotante
    store.joystickManager = nipplejs.create({
        zone: joystickZoneEl,
        mode: 'dynamic',
        position: { left: '50%', top: '50%' },
        color: 'white',
        catchforce: true,
    });
    
    store.joystickManager.on('move', (_evt: NippleEvent, data: NippleJoystick) => {
        const angle = data.angle.radian;
        const force = data.force;
        if (force <= 0.2) return;
        
        const up = Math.sin(angle);
        const right = Math.cos(angle);
        store.keys.ArrowUp = up > 0.5;
        
        if (Math.abs(right) > 0.3) {
            if (right > 0) {
                store.keys.ArrowRight = true;
                store.keys.ArrowLeft = false;
            } else {
                store.keys.ArrowLeft = true;
                store.keys.ArrowRight = false;
            }
        } else {
            store.keys.ArrowLeft = false;
            store.keys.ArrowRight = false;
        }
    });
    
    store.joystickManager.on('end', () => {
        store.keys.ArrowUp = false;
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
    });
    
    // Configurar botones de acción normales
    setupActionButtons(store, true);
};

/**
 * Configura los botones direccionales fijos
 */
const setupDirectionalButton = (store: GameStore, buttonId: string, keys: string[]) => {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    const handleStart = () => {
        store.keys.ArrowUp = false;
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
        
        keys.forEach(key => {
            store.keys[key as keyof typeof store.keys] = true;
        });
        
        button.classList.add('active');
    };
    
    const handleEnd = () => {
        store.keys.ArrowUp = false;
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
        
        button.classList.remove('active');
    };
    
    button.addEventListener('touchstart', handleStart, { passive: true });
    button.addEventListener('touchend', handleEnd, { passive: true });
    button.addEventListener('touchcancel', handleEnd, { passive: true });
    button.addEventListener('mousedown', handleStart);
    button.addEventListener('mouseup', handleEnd);
    button.addEventListener('mouseleave', handleEnd);
};

const setupDirectionalButtons = (store: GameStore) => {
    const buttonDirections: Record<string, string[]> = {
        'btn-up': ['ArrowUp'],
        'btn-left': ['ArrowLeft'],
        'btn-right': ['ArrowRight'],
        'btn-up-left': ['ArrowUp', 'ArrowLeft'],
        'btn-up-right': ['ArrowUp', 'ArrowRight']
    };
    
    Object.entries(buttonDirections).forEach(([buttonId, keys]) => {
        setupDirectionalButton(store, buttonId, keys);
    });
};

// Variables para almacenar handlers y poder removerlos
let bombTouchStartHandler: ((e: TouchEvent) => void) | null = null;
let bombTouchEndHandler: ((e: TouchEvent) => void) | null = null;
let shootTouchStartHandler: ((e: TouchEvent) => void) | null = null;
let shootTouchEndHandler: ((e: TouchEvent) => void) | null = null;
let shootMouseDownHandler: ((e: MouseEvent) => void) | null = null;
let shootMouseUpHandler: ((e: MouseEvent) => void) | null = null;
let shootClickHandler: ((e: MouseEvent) => void) | null = null;
let lastShootTap = 0; // Variable global para el modo normal

/**
 * Configura los botones de acción (FIRE y TNT)
 * @param showBomb - Si mostrar el botón de bomba
 * @param fireAsSwitch - Si fire funciona como switch (toggle)
 */
const setupActionButtons = (store: GameStore, showBomb: boolean = true, fireAsSwitch: boolean = false) => {
    const shootBtn = document.getElementById('shoot-btn');
    const bombBtn = document.getElementById('bomb-btn');
    
    // Limpiar listeners anteriores
    if (bombBtn && bombTouchStartHandler && bombTouchEndHandler) {
        bombBtn.removeEventListener('touchstart', bombTouchStartHandler);
        bombBtn.removeEventListener('touchend', bombTouchEndHandler);
    }
    if (shootBtn) {
        if (shootTouchStartHandler) {
            shootBtn.removeEventListener('touchstart', shootTouchStartHandler);
        }
        if (shootTouchEndHandler) {
            shootBtn.removeEventListener('touchend', shootTouchEndHandler);
            shootBtn.removeEventListener('touchcancel', shootTouchEndHandler);
        }
        if (shootMouseDownHandler) {
            shootBtn.removeEventListener('mousedown', shootMouseDownHandler);
        }
        if (shootMouseUpHandler) {
            shootBtn.removeEventListener('mouseup', shootMouseUpHandler);
            shootBtn.removeEventListener('mouseleave', shootMouseUpHandler);
        }
        if (shootClickHandler) {
            shootBtn.removeEventListener('click', shootClickHandler);
        }
    }
    
    if (showBomb && bombBtn) {
        bombTouchStartHandler = (event: TouchEvent) => {
            event.preventDefault();
            store.keys.ArrowDown = true;
        };
        bombTouchEndHandler = (event: TouchEvent) => {
            event.preventDefault();
            store.keys.ArrowDown = false;
        };
        bombBtn.addEventListener('touchstart', bombTouchStartHandler);
        bombBtn.addEventListener('touchend', bombTouchEndHandler);
    }
    
    if (shootBtn) {
        if (fireAsSwitch) {
            // Modo switch: un click activa/desactiva
            shootTouchStartHandler = (event: TouchEvent) => {
                event.preventDefault();
                event.stopPropagation();
                store.isLaserSticky = !store.isLaserSticky;
                store.keys.Space = store.isLaserSticky;
                
                // Actualizar estado visual del botón
                if (store.isLaserSticky) {
                    shootBtn.classList.add('sticky-active');
                } else {
                    shootBtn.classList.remove('sticky-active');
                }
            };
            
            shootClickHandler = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                store.isLaserSticky = !store.isLaserSticky;
                store.keys.Space = store.isLaserSticky;
                if (store.isLaserSticky) {
                    shootBtn.classList.add('sticky-active');
                } else {
                    shootBtn.classList.remove('sticky-active');
                }
            };
            
            // Agregar listeners
            shootBtn.addEventListener('touchstart', shootTouchStartHandler, { passive: false });
            shootBtn.addEventListener('click', shootClickHandler);
        } else {
            // Modo normal: mantener presionado o doble click para sticky
            // Resetear el contador de taps cuando se cambia de modo
            lastShootTap = 0; // Usar la variable global
            
            shootTouchStartHandler = (event: TouchEvent) => {
                event.preventDefault();
                event.stopPropagation();
                const now = Date.now();
                
                // Si ya está en modo sticky, un toque lo desactiva
                if (store.isLaserSticky) {
                    store.isLaserSticky = false;
                    store.keys.Space = false;
                    shootBtn.classList.remove('sticky-active');
                    lastShootTap = 0;
                    return;
                }
                
                // Doble tap para activar sticky
                if (lastShootTap && now - lastShootTap < 300) {
                    store.isLaserSticky = true;
                    store.keys.Space = true;
                    shootBtn.classList.add('sticky-active');
                    lastShootTap = 0;
                    return;
                }
                
                // Primer toque: disparo normal
                lastShootTap = now;
                store.keys.Space = true;
                shootBtn.classList.add('active'); // Mostrar visualmente que está presionado
            };
            
            shootTouchEndHandler = (event: TouchEvent) => {
                event.preventDefault();
                event.stopPropagation();
                // Solo detener disparo si no está en modo sticky
                if (!store.isLaserSticky) {
                    store.keys.Space = false;
                    shootBtn.classList.remove('active'); // Remover clase visual
                }
            };
            
            shootMouseDownHandler = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                const now = Date.now();
                
                if (store.isLaserSticky) {
                    store.isLaserSticky = false;
                    store.keys.Space = false;
                    shootBtn.classList.remove('sticky-active');
                    lastShootTap = 0;
                    return;
                }
                
                if (lastShootTap && now - lastShootTap < 300) {
                    store.isLaserSticky = true;
                    store.keys.Space = true;
                    shootBtn.classList.add('sticky-active');
                    lastShootTap = 0;
                    return;
                }
                
                lastShootTap = now;
                store.keys.Space = true;
                shootBtn.classList.add('active');
            };
            
            shootMouseUpHandler = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (!store.isLaserSticky) {
                    store.keys.Space = false;
                    shootBtn.classList.remove('active');
                }
            };
            
            // Agregar listeners
            shootBtn.addEventListener('touchstart', shootTouchStartHandler, { passive: false });
            shootBtn.addEventListener('touchend', shootTouchEndHandler, { passive: false });
            shootBtn.addEventListener('touchcancel', shootTouchEndHandler, { passive: false });
            shootBtn.addEventListener('mousedown', shootMouseDownHandler);
            shootBtn.addEventListener('mouseup', shootMouseUpHandler);
            shootBtn.addEventListener('mouseleave', shootMouseUpHandler);
        }
    }
};

