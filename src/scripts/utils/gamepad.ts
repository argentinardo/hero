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
 * Mapea los sticks analógicos a códigos de teclado
 * axes[0]: X del stick izquierdo (-1 izq, +1 der)
 * axes[1]: Y del stick izquierdo (-1 arriba, +1 abajo)
 */
const updateAnalogStickState = (gamepad: Gamepad, store: GameStore) => {
    const deadzone = 0.3; // Zona muerta para evitar drift
    
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
 */
const processGamepadButtons = (gamepad: Gamepad, store: GameStore) => {
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
            }
        }
    });
    
    // Guardar estado actual de los botones (inicializar si no existe)
    if (gamepadState.lastButtons.length !== gamepad.buttons.length) {
        gamepadState.lastButtons = new Array(gamepad.buttons.length).fill(0);
    }
};

/**
 * Actualiza el estado del gamepad
 */
export const updateGamepadState = (store: GameStore) => {
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
        return;
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
        return;
    }
    
    // Primer gamepad conectado
    if (!gamepadState.connected) {
        console.log('Gamepad conectado:', activeGamepad.id);
        gamepadState.connected = true;
    }
    
    // Procesar input del gamepad
    processGamepadButtons(activeGamepad, store);
    updateAnalogStickState(activeGamepad, store);
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

