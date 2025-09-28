import type { GameStore } from './types';

export const createInputHandlers = (store: GameStore) => {
    const onKeyDown = (event: KeyboardEvent) => {
        store.keys[event.code] = true;
    };

    const onKeyUp = (event: KeyboardEvent) => {
        store.keys[event.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
    };
};

