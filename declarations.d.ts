declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.json' {
    const value: any;
    export default value;
}

declare module '*.png' {
    const value: any;
    export default value;
}

declare module '*.jpg' {
    const value: any;
    export default value;
}

declare module '*.jpeg' {
    const value: any;
    export default value;
}

declare module '*.mp3' {
    const value: any;
    export default value;
}

declare module '*.wav' {
    const value: any;
    export default value;
}

declare module '*.ogg' {
    const value: any;
    export default value;
}

declare module '*.mid' {
    const value: any;
    export default value;
}

// Declaración opcional para @capacitor/status-bar (puede no estar instalado)
declare module '@capacitor/status-bar' {
    export const StatusBar: {
        setOverlaysWebView(options: { overlay: boolean }): Promise<void>;
        setStyle(options: { style: 'dark' | 'light' }): Promise<void>;
        setBackgroundColor(options: { color: string }): Promise<void>;
    };
}

// Declaraciones para MIDI.js (vía CDN)
declare global {
    interface Window {
        MIDI: {
            loadPlugin: (options: {
                soundfontUrl?: string;
                instrument?: string;
                onsuccess?: () => void;
                onerror?: (error: any) => void;
            }) => void;
            Player: {
                loadFile: (file: string, callback: () => void) => void;
                start: () => void;
                stop: () => void;
                pause: () => void;
                resume: () => void;
                playing: boolean;
                currentTime: number;
            };
            setVolume: (volume: number) => void;
            audioBuffers: any;
        };
    }
}

declare module 'nipplejs' {
  export interface JoystickManagerOptions {
    catchforce?: boolean;
  }

  export interface EventData {
    type: string;
    target: HTMLElement;
  }

  export interface Joystick {
    angle: {
      radian: number;
    };
    force: number;
    distance?: number; // pixels from base to front
  }

  export interface Position {
    left: string;
    top: string;
  }

  export interface JoystickManagerCreationOptions extends JoystickManagerOptions {
    zone: HTMLElement;
    mode?: 'dynamic' | 'static';
    position?: Position;
    color?: string;
  }

  export interface JoystickManager {
    on(event: 'move', listener: (evt: EventData, data: Joystick) => void): JoystickManager;
    on(event: 'end', listener: (evt: EventData, data: Joystick) => void): JoystickManager;
    destroy(): void;
  }

  export interface NippleJS {
    create(options: JoystickManagerCreationOptions): JoystickManager;
  }

  const nipplejs: NippleJS;
  export default nipplejs;
}