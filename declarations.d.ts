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