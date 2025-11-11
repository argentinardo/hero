import type { GameStore } from '../core/types';

/**
 * Soporte para joysticks/gamepads Bluetooth
 * 
 * Mapeo estándar de controles:
 * - Flecha Izq/Der o Stick Izquierdo X: Movimiento horizontal
 * - Flecha Arriba o Stick Izquierdo Y: Volar
 * - Flecha Abajo o Gatillo/L1: Soltar bomba
 * - A/B o Botón 0/1: Disparar láser
 * - Start: Enter (menú/pausa)
 */

interface GamepadMapping {
    connected: boolean;
    index: number | null;
    lastButtons: number[];
    lastAxes: number[];
}

const gamepadState: GamepadMapping = {
    connected: false,
    index: null,
    lastButtons: [] as number[],
    lastAxes: [] as number[],
};

/**
 * Mapea los botones del gamepad a códigos de teclado
 * Estándar Gamepad: 0=A (cross), 1=B (circle), 2=X, 3=Y, 6=L1, 7=R1, 8=L2, 9=R2, 10=Select, 11=Start
 */
const getButtonMapping = (buttonIndex: number): string | null => {
    const mapping: Record<number, string> = {
        0: 'Enter',        // Botón principal -> disparo en juego / confirmar en menús
        10: 'Escape',      // Select (Pausa/Menú)
        11: 'Enter',       // Start (Confirmar/Entrar)
        16: 'Enter',       // Botón central en algunos mandos de TV
        23: 'Enter'        // Botón OK en ciertos mandos Android TV
    };
    return mapping[buttonIndex] ?? null;
};

/**
 * Mapea las flechas direccionales del D-Pad a códigos de teclado
 * Estándar Gamepad: axes 16 (dpad left/right), 17 (dpad up/down)
 */
const getDirectionalMapping = (buttonIndex: number): string | null => {
    const mapping: Record<number, string> = {
        12: 'ArrowUp',     // D-Pad Up
        13: 'ArrowDown',   // D-Pad Down
        14: 'ArrowLeft',   // D-Pad Left
        15: 'ArrowRight',  // D-Pad Right
    };
    return mapping[buttonIndex] || null;
};

/**
 * Estado del D-Pad para detectar cambios
 */
let lastDpadDirection: string | null = null;
let dpadPressCooldown = 0;

/**
 * Procesa el D-Pad cuando está representado como ejes (común en gamepads de TV)
 * Algunos gamepads usan axes[6] y axes[7] para el D-Pad
 */
const processDpadAxes = (gamepad: Gamepad, store: GameStore): { direction: string | null; changed: boolean } => {
    const deadzone = 0.5; // Zona muerta más alta para D-Pad (debe ser presión clara)
    let direction: string | null = null;
    let changed = false;
    
    // Inicializar lastAxes si no existe
    if (gamepadState.lastAxes.length !== gamepad.axes.length) {
        gamepadState.lastAxes = new Array(gamepad.axes.length).fill(0);
    }
    
    // Probar diferentes índices de ejes para D-Pad (varían según el gamepad)
    // Algunos gamepads usan axes[6] y axes[7], otros axes[9] y axes[10]
    const dpadAxesIndices = [
        { h: 6, v: 7 },  // Común en algunos gamepads de TV
        { h: 9, v: 10 }, // Otros gamepads
        { h: 16, v: 17 } // Estándar mencionado en comentarios
    ];
    
    for (const { h, v } of dpadAxesIndices) {
        if (gamepad.axes.length > Math.max(h, v)) {
            const dpadX = gamepad.axes[h];
            const dpadY = gamepad.axes[v];
            const lastDpadX = gamepadState.lastAxes[h] || 0;
            const lastDpadY = gamepadState.lastAxes[v] || 0;
            
            // Detectar dirección actual del D-Pad
            if (Math.abs(dpadX) > deadzone || Math.abs(dpadY) > deadzone) {
                if (Math.abs(dpadY) > Math.abs(dpadX)) {
                    // Vertical tiene prioridad
                    if (dpadY < -deadzone) {
                        direction = 'ArrowUp';
                    } else if (dpadY > deadzone) {
                        direction = 'ArrowDown';
                    }
                } else {
                    // Horizontal
                    if (dpadX < -deadzone) {
                        direction = 'ArrowLeft';
                    } else if (dpadX > deadzone) {
                        direction = 'ArrowRight';
                    }
                }
            }
            
            // Detectar cambio de estado: comparar con el estado anterior guardado en lastAxes
            // Solo reportar cambio si la dirección cambió significativamente
            const wasPressed = Math.abs(lastDpadX) > deadzone || Math.abs(lastDpadY) > deadzone;
            const isCurrentlyPressed = direction !== null;
            
            if (isCurrentlyPressed !== wasPressed) {
                // Cambio de estado: de no presionado a presionado o viceversa
                changed = true;
            } else if (isCurrentlyPressed && wasPressed) {
                // Ambos están presionados, verificar si cambió la dirección
                let lastDirection: string | null = null;
                if (Math.abs(lastDpadY) > Math.abs(lastDpadX)) {
                    if (lastDpadY < -deadzone) {
                        lastDirection = 'ArrowUp';
                    } else if (lastDpadY > deadzone) {
                        lastDirection = 'ArrowDown';
                    }
                } else {
                    if (lastDpadX < -deadzone) {
                        lastDirection = 'ArrowLeft';
                    } else if (lastDpadX > deadzone) {
                        lastDirection = 'ArrowRight';
                    }
                }
                // Si cambió la dirección, reportar cambio
                if (direction !== lastDirection) {
                    changed = true;
                }
            }
            
            // Guardar estado actual
            gamepadState.lastAxes[h] = dpadX;
            gamepadState.lastAxes[v] = dpadY;
            
            if (direction || changed) {
                break; // Ya encontramos una dirección o cambio, no buscar en otros índices
            }
        }
    }
    
    return { direction, changed };
};

/**
 * Mapea los sticks analógicos a códigos de teclado
 * axes[0]: X del stick izquierdo (-1 izq, +1 der)
 * axes[1]: Y del stick izquierdo (-1 arriba, +1 abajo)
 */
const updateAnalogStickState = (gamepad: Gamepad, store: GameStore) => {
    const deadzone = 0.3; // Zona muerta para evitar drift
    
    // Solo usar sticks analógicos si NO estamos en el menú (para evitar interferir con la navegación)
    // En el menú, el D-Pad debe tener prioridad
    
    // Stick izquierdo X (movimiento horizontal)
    const leftX = gamepad.axes[0];
    if (leftX > deadzone) {
        store.keys.ArrowRight = true;
        store.keys.ArrowLeft = false;
    } else if (leftX < -deadzone) {
        store.keys.ArrowLeft = true;
        store.keys.ArrowRight = false;
    } else {
        store.keys.ArrowLeft = false;
        store.keys.ArrowRight = false;
    }
    
    // Stick izquierdo Y (volar)
    const leftY = gamepad.axes[1];
    if (leftY < -deadzone) {
        store.keys.ArrowUp = true;
    } else {
        store.keys.ArrowUp = false;
    }
    
    // Stick derecho Y también puede ser volar (opcional)
    if (gamepad.axes.length > 3) {
        const rightY = gamepad.axes[3];
        if (rightY < -deadzone) {
            store.keys.ArrowUp = true;
        }
    }
};

/**
 * Procesa los botones del gamepad
 * Retorna información sobre acciones del D-Pad para navegación en menú
 */
const processGamepadButtons = (gamepad: Gamepad, store: GameStore): { dpadAction: string | null; selectPressed: boolean; backPressed: boolean } => {
    let dpadAction: string | null = null;
    let selectPressed = false;
    let backPressed = false;
    
    // Procesar botones normales
    gamepad.buttons.forEach((button, index) => {
        const isPressed = button.pressed;
        const wasPressed = gamepadState.lastButtons[index] || false;
        
        // Solo actualizar si el estado cambió
        if (isPressed !== wasPressed) {
            const keyCode = getButtonMapping(index);
            if (keyCode) {
                store.keys[keyCode] = isPressed;
                if (keyCode === 'Enter' && store.appState === 'playing') {
                    store.keys.Space = isPressed;
                }
                
                // Detectar botones de acción para menú
                if (keyCode === 'Enter' && isPressed) {
                    selectPressed = true;
                }
                if (keyCode === 'Escape' && isPressed) {
                    backPressed = true;
                }
            }
        }
    });
    
    // Procesar D-Pad (botones 12-15 en algunos gamepads)
    const dpadMapping: Record<number, string> = {
        12: 'ArrowUp',
        13: 'ArrowDown',
        14: 'ArrowLeft',
        15: 'ArrowRight',
    };
    
    Object.entries(dpadMapping).forEach(([indexStr, keyCode]) => {
        const index = parseInt(indexStr);
        const button = gamepad.buttons[index];
        if (button) {
            const isPressed = button.pressed;
            const wasPressed = gamepadState.lastButtons[index] || false;
            if (isPressed !== wasPressed) {
                store.keys[keyCode] = isPressed;
                // Solo reportar acción si se presionó el botón (el cooldown se maneja en updateGamepadState)
                if (isPressed) {
                    dpadAction = keyCode;
                }
            }
        }
    });
    
    // Guardar estado actual de los botones (inicializar si no existe)
    if (gamepadState.lastButtons.length !== gamepad.buttons.length) {
        gamepadState.lastButtons = new Array(gamepad.buttons.length).fill(0);
    }
    
    // Actualizar estado de botones para la próxima vez
    gamepad.buttons.forEach((button, index) => {
        if (gamepadState.lastButtons[index] !== undefined) {
            gamepadState.lastButtons[index] = button.pressed ? 1 : 0;
        }
    });
    
    return { dpadAction, selectPressed, backPressed };
};

/**
 * Tipo para acciones del gamepad en el menú
 */
export type GamepadMenuAction = {
    direction: 'up' | 'down' | 'left' | 'right' | null;
    select: boolean;
    back: boolean;
};

/**
 * Actualiza el estado del gamepad y retorna acciones para el menú si aplica
 */
export const updateGamepadState = (store: GameStore): GamepadMenuAction | null => {
    // Detectar gamepads conectados
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : null;
    if (!gamepads || gamepads.length === 0) {
        if (gamepadState.connected) {
            console.log('Gamepad desconectado');
            gamepadState.connected = false;
            gamepadState.index = null;
            gamepadState.lastButtons = [];
            gamepadState.lastAxes = [];
        }
        return null;
    }
    
    // Encontrar el primer gamepad válido
    let activeGamepad: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
        const gamepad = gamepads[i];
        if (gamepad && gamepad.connected) {
            activeGamepad = gamepad;
            gamepadState.index = i;
            break;
        }
    }
    
    if (!activeGamepad) {
        if (gamepadState.connected) {
            console.log('Gamepad desconectado');
            gamepadState.connected = false;
            gamepadState.index = null;
            gamepadState.lastButtons = [];
            gamepadState.lastAxes = [];
        }
        return null;
    }
    
    // Primer gamepad conectado
    if (!gamepadState.connected) {
        console.log('Gamepad conectado:', activeGamepad.id);
        gamepadState.connected = true;
    }
    
    // Reducir cooldown en cada frame
    if (dpadPressCooldown > 0) {
        dpadPressCooldown--;
    }
    
    // Procesar D-Pad desde ejes primero (tiene prioridad en gamepads de TV)
    const dpadAxes = processDpadAxes(activeGamepad, store);
    
    // Procesar botones del gamepad
    const buttonActions = processGamepadButtons(activeGamepad, store);
    
    // Determinar la dirección del D-Pad (priorizar ejes si están activos, sino botones)
    let direction: 'up' | 'down' | 'left' | 'right' | null = null;
    
    // Solo procesar si hay un cambio real y no estamos en cooldown
    if (dpadAxes.changed && dpadAxes.direction && dpadPressCooldown === 0) {
        // Mapear dirección de ejes
        switch (dpadAxes.direction) {
            case 'ArrowUp':
                direction = 'up';
                break;
            case 'ArrowDown':
                direction = 'down';
                break;
            case 'ArrowLeft':
                direction = 'left';
                break;
            case 'ArrowRight':
                direction = 'right';
                break;
        }
        // Activar cooldown solo si hay una dirección válida
        if (direction) {
            dpadPressCooldown = 15; // ~250ms a 60fps
            lastDpadDirection = dpadAxes.direction;
        }
    } else if (buttonActions.dpadAction && dpadPressCooldown === 0) {
        // Mapear dirección de botones (solo si no hay dirección de ejes)
        switch (buttonActions.dpadAction) {
            case 'ArrowUp':
                direction = 'up';
                break;
            case 'ArrowDown':
                direction = 'down';
                break;
            case 'ArrowLeft':
                direction = 'left';
                break;
            case 'ArrowRight':
                direction = 'right';
                break;
        }
        // Activar cooldown solo si hay una dirección válida
        if (direction) {
            dpadPressCooldown = 15; // ~250ms a 60fps
            lastDpadDirection = buttonActions.dpadAction;
        }
    }
    
    // Solo actualizar sticks analógicos si NO estamos en el menú
    // (en el menú, el D-Pad debe tener control exclusivo)
    if (store.appState !== 'menu') {
        updateAnalogStickState(activeGamepad, store);
    }
    
    // Retornar acciones para el menú si estamos en modo TV y en el menú
    const { isTvMode } = require('./device');
    if (isTvMode() && store.appState === 'menu' && (direction !== null || buttonActions.selectPressed || buttonActions.backPressed)) {
        return {
            direction,
            select: buttonActions.selectPressed,
            back: buttonActions.backPressed
        };
    }
    
    return null;
};

/**
 * Inicializa los listeners de gamepad
 */
export const initGamepadSupport = () => {
    // Listener para cuando se conecta un gamepad
    window.addEventListener('gamepadconnected', (event) => {
        console.log('Gamepad conectado:', (event as GamepadEvent).gamepad.id);
    });
    
    // Listener para cuando se desconecta un gamepad
    window.addEventListener('gamepaddisconnected', (event) => {
        console.log('Gamepad desconectado:', (event as GamepadEvent).gamepad.id);
    });
    
    console.log('Soporte de gamepad inicializado');
};

