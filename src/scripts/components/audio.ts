import type { GameStore } from '../core/types';

// Importar archivos de audio
// Cargar música de fondo dinámicamente desde el servidor
const mainMusicUrl = '/src/assets/audio/main.mp3';
import jetpackSound from '../../assets/audio/jetpack.mp3';
import laserSound from '../../assets/audio/laser.mp3';
import lifedownSound from '../../assets/audio/lifedown.mp3';
import stepsSound from '../../assets/audio/steps.mp3';
import bombSound from '../../assets/audio/bomb.mp3';
import enemyKillSound from '../../assets/audio/enemy_kill.mp3';
import successLevelSound from '../../assets/audio/success_level.mp3';
import toyBounceSound from '../../assets/audio/toy.mp3';
import brickBounceSound from '../../assets/audio/brick.mp3';
import bulbOffSound from '../../assets/audio/bulb.mp3';
import energyDrainSound from '../../assets/audio/energy-drain.mp3';

// Interfaz para el sistema de audio
interface AudioSystem {
    bgMusic: HTMLAudioElement | null;
    sounds: {
        jetpack: HTMLAudioElement | null;
        laser: HTMLAudioElement | null;
        lifedown: HTMLAudioElement | null;
        steps: HTMLAudioElement | null;
        bomb: HTMLAudioElement | null;
        successLevel: HTMLAudioElement | null;
        enemyKill: HTMLAudioElement | null;
        toy: HTMLAudioElement | null;
        brick: HTMLAudioElement | null;
        bulb: HTMLAudioElement | null;
        energyDrain: HTMLAudioElement | null;
    };
    isMuted: boolean;
    musicVolume: number;
    sfxVolume: number;
}

// Sistema de audio global
let audioSystem: AudioSystem = {
    bgMusic: null,
    sounds: {
        jetpack: null,
        laser: null,
        lifedown: null,
        steps: null,
        bomb: null,
        successLevel: null,
        enemyKill: null,
        toy: null,
        brick: null,
        bulb: null,
        energyDrain: null,
    },
    isMuted: false,
    musicVolume: 0.3,
    sfxVolume: 0.5,
};

// Inicializar solo efectos de sonido críticos
export const initAudio = () => {
    try {
        // Crear solo efectos de sonido críticos (archivos pequeños)
        audioSystem.sounds.laser = new Audio(laserSound);
        audioSystem.sounds.laser.volume = audioSystem.sfxVolume;

        audioSystem.sounds.lifedown = new Audio(lifedownSound);
        audioSystem.sounds.lifedown.volume = audioSystem.sfxVolume;

        audioSystem.sounds.bomb = new Audio(bombSound);
        audioSystem.sounds.bomb.volume = audioSystem.sfxVolume;

        audioSystem.sounds.enemyKill = new Audio(enemyKillSound);
        audioSystem.sounds.enemyKill.volume = audioSystem.sfxVolume;

        audioSystem.sounds.toy = new Audio(toyBounceSound);
        audioSystem.sounds.toy.volume = audioSystem.sfxVolume;

        audioSystem.sounds.brick = new Audio(brickBounceSound);
        audioSystem.sounds.brick.volume = audioSystem.sfxVolume;

        audioSystem.sounds.bulb = new Audio(bulbOffSound);
        audioSystem.sounds.bulb.volume = audioSystem.sfxVolume;

        console.log('Audio crítico inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar el sistema de audio:', error);
    }
};

// Función para cargar música de fondo de forma lazy
export const loadBackgroundMusic = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (audioSystem.bgMusic) {
            resolve();
            return;
        }

        // Cargar dinámicamente el archivo de audio
        const audio = new Audio();
        audio.loop = true;
        audio.volume = audioSystem.musicVolume;
        audio.preload = 'none'; // No precargar para evitar incluirlo en el bundle
        
        audio.addEventListener('canplaythrough', () => {
            audioSystem.bgMusic = audio;
            console.log('Música de fondo cargada dinámicamente');
            resolve();
        });
        
        audio.addEventListener('error', () => {
            console.warn('No se pudo cargar la música de fondo');
            reject(new Error('Failed to load background music'));
        });
        
        // Cargar el archivo solo cuando se necesite
        audio.src = mainMusicUrl;
        audio.load();
    });
};

// Función para cargar efectos de sonido adicionales de forma lazy
export const loadAdditionalSFX = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const sfxToLoad = [
            { key: 'jetpack', src: jetpackSound, loop: true },
            { key: 'steps', src: stepsSound, loop: true },
            { key: 'successLevel', src: successLevelSound, loop: false },
            { key: 'energyDrain', src: energyDrainSound, loop: true }
        ];

        let loaded = 0;
        const total = sfxToLoad.length;

        if (total === 0) {
            resolve();
            return;
        }

        sfxToLoad.forEach(({ key, src, loop }) => {
            const audio = new Audio();
            if (loop) audio.loop = true;
            audio.volume = audioSystem.sfxVolume;
            audio.preload = 'none'; // No precargar para evitar incluirlo en el bundle
            
            audio.addEventListener('canplaythrough', () => {
                audioSystem.sounds[key as keyof typeof audioSystem.sounds] = audio;
                loaded++;
                if (loaded === total) {
                    console.log('Efectos de sonido adicionales cargados dinámicamente');
                    resolve();
                }
            });
            
            audio.addEventListener('error', () => {
                console.warn(`No se pudo cargar el efecto de sonido: ${key}`);
                loaded++;
                if (loaded === total) {
                    resolve(); // Continuar aunque algunos fallen
                }
            });
            
            // Cargar el archivo solo cuando se necesite
            audio.src = src;
            audio.load();
        });
    });
};

// Reproducir música de fondo (con lazy loading)
export const playBackgroundMusic = async () => {
    try {
        // Cargar música de fondo si no está cargada
        if (!audioSystem.bgMusic) {
            await loadBackgroundMusic();
        }
        
        if (audioSystem.bgMusic && !audioSystem.isMuted) {
            audioSystem.bgMusic.play().catch(error => {
                console.log('No se pudo reproducir la música automáticamente:', error);
            });
        }
    } catch (error) {
        console.warn('Error cargando música de fondo:', error);
    }
};

// Pausar música de fondo
export const pauseBackgroundMusic = () => {
    if (audioSystem.bgMusic) {
        audioSystem.bgMusic.pause();
    }
};

// Reproducir sonido de jetpack
export const playJetpackSound = () => {
    if (audioSystem.sounds.jetpack && !audioSystem.isMuted) {
        if (audioSystem.sounds.jetpack.paused) {
            audioSystem.sounds.jetpack.currentTime = 0;
            audioSystem.sounds.jetpack.play().catch(error => {
                console.log('Error al reproducir jetpack:', error);
            });
        }
    }
};

// Detener sonido de jetpack
export const stopJetpackSound = () => {
    if (audioSystem.sounds.jetpack) {
        audioSystem.sounds.jetpack.pause();
        audioSystem.sounds.jetpack.currentTime = 0;
    }
};

// Reproducir sonido de drenaje de energía
export const playEnergyDrainSound = () => {
    if (audioSystem.sounds.energyDrain && !audioSystem.isMuted) {
        if (audioSystem.sounds.energyDrain.paused) {
            audioSystem.sounds.energyDrain.currentTime = 0;
            audioSystem.sounds.energyDrain.play().catch(error => {
                console.log('Error al reproducir energy drain:', error);
            });
        }
    }
};

// Detener sonido de drenaje de energía
export const stopEnergyDrainSound = () => {
    if (audioSystem.sounds.energyDrain) {
        audioSystem.sounds.energyDrain.pause();
        audioSystem.sounds.energyDrain.currentTime = 0;
    }
};

// Reproducir sonido de láser
export const playLaserSound = () => {
    if (audioSystem.sounds.laser && !audioSystem.isMuted) {
        // Crear una copia del audio para permitir múltiples disparos simultáneos
        const laserClone = audioSystem.sounds.laser.cloneNode(true) as HTMLAudioElement;
        laserClone.volume = audioSystem.sfxVolume;
        laserClone.play().catch(error => {
            console.log('Error al reproducir láser:', error);
        });
    }
};

// Reproducir sonido de perder vida
export const playLifedownSound = () => {
    if (audioSystem.sounds.lifedown && !audioSystem.isMuted) {
        audioSystem.sounds.lifedown.currentTime = 0;
        audioSystem.sounds.lifedown.play().catch(error => {
            console.log('Error al reproducir lifedown:', error);
        });
    }
};

// Ejecutar callback cuando termine el sonido de perder vida
export const onLifedownEnded = (callback: () => void) => {
    const snd = audioSystem.sounds.lifedown;
    if (!snd) return;
    snd.addEventListener('ended', () => {
        try {
            callback();
        } catch (e) {
            console.error(e);
        }
    }, { once: true });
};

// Detener todos los sonidos excepto el de perder vida
export const stopAllSfxExceptLifedown = () => {
    const { jetpack, laser, steps, bomb, successLevel, energyDrain } = audioSystem.sounds;
    [jetpack, steps, bomb, successLevel, energyDrain].forEach(snd => {
        if (snd) {
            snd.pause();
            snd.currentTime = 0;
        }
    });
    // Para el láser, no es loop; pausar clones no es trivial, así que solo pausamos la instancia base
    if (laser) {
        try { laser.pause(); /* noop if not playing */ } catch {}
    }
    // Pausar música de fondo
    if (audioSystem.bgMusic) {
        audioSystem.bgMusic.pause();
    }
};

// Detener todos los sonidos excepto el de éxito de nivel
export const stopAllSfxExceptSuccessLevel = () => {
    const { jetpack, laser, steps, bomb, successLevel, energyDrain } = audioSystem.sounds;
    // Pausar todos los SFX que puedan estar en loop o activos, excepto successLevel
    [jetpack, steps, bomb, energyDrain].forEach(snd => {
        if (snd) {
            snd.pause();
            snd.currentTime = 0;
        }
    });
    // El láser usa clones para múltiples disparos; pausamos la instancia base si existe
    if (laser) {
        try { laser.pause(); } catch {}
    }
    // Pausar música de fondo para que destaque el éxito
    if (audioSystem.bgMusic) {
        audioSystem.bgMusic.pause();
    }
    // No pausar ni resetear successLevel aquí; se gestionará al reproducir
};

// Reproducir sonido de pasos
export const playStepsSound = () => {
    if (audioSystem.sounds.steps && !audioSystem.isMuted) {
        if (audioSystem.sounds.steps.paused) {
            audioSystem.sounds.steps.currentTime = 0;
            audioSystem.sounds.steps.play().catch(error => {
                console.log('Error al reproducir pasos:', error);
            });
        }
    }
};

// Detener sonido de pasos
export const stopStepsSound = () => {
    if (audioSystem.sounds.steps) {
        audioSystem.sounds.steps.pause();
        audioSystem.sounds.steps.currentTime = 0;
    }
};

// Reproducir sonido de explosión de bomba
export const playBombSound = () => {
    if (audioSystem.sounds.bomb && !audioSystem.isMuted) {
        audioSystem.sounds.bomb.currentTime = 0;
        audioSystem.sounds.bomb.play().catch(error => {
            console.log('Error al reproducir bomba:', error);
        });
    }
};

// Detener sonido de explosión de bomba
export const stopBombSound = () => {
    if (audioSystem.sounds.bomb) {
        audioSystem.sounds.bomb.pause();
        audioSystem.sounds.bomb.currentTime = 0;
    }
};


// Reproducir sonido de éxito al completar nivel
export const playSuccessLevelSound = () => {
    if (audioSystem.sounds.successLevel && !audioSystem.isMuted) {
        audioSystem.sounds.successLevel.currentTime = 0;
        audioSystem.sounds.successLevel.play().catch(error => {
            console.log('Error al reproducir success level:', error);
        });
    }
};

// Ejecutar callback cuando termine el sonido de éxito
export const onSuccessLevelEnded = (callback: () => void) => {
    const snd = audioSystem.sounds.successLevel;
    if (!snd) return;
    snd.addEventListener('ended', () => {
        try {
            callback();
        } catch (e) {
            console.error(e);
        }
    }, { once: true });
};

// Reproducir sonido al eliminar enemigo
export const playEnemyKillSound = () => {
    if (audioSystem.sounds.enemyKill && !audioSystem.isMuted) {
        // Crear clon para permitir kills simultáneos
        const killClone = audioSystem.sounds.enemyKill.cloneNode(true) as HTMLAudioElement;
        killClone.volume = audioSystem.sfxVolume;
        killClone.play().catch(() => {});
    }
};

// Reproducir sonido de rebote tipo "toy"
export const playToyBounce = () => {
    if (audioSystem.sounds.toy && !audioSystem.isMuted) {
        const toyClone = audioSystem.sounds.toy.cloneNode(true) as HTMLAudioElement;
        toyClone.volume = audioSystem.sfxVolume;
        toyClone.play().catch(() => {});
    }
};

// Reproducir sonido de rebote de ladrillo
export const playBrickBounce = () => {
    if (audioSystem.sounds.brick && !audioSystem.isMuted) {
        const brickClone = audioSystem.sounds.brick.cloneNode(true) as HTMLAudioElement;
        brickClone.volume = audioSystem.sfxVolume;
        brickClone.play().catch(() => {});
    }
};

// Reproducir sonido al apagar una luz
export const playBulbOff = () => {
    if (audioSystem.sounds.bulb && !audioSystem.isMuted) {
        const bulbClone = audioSystem.sounds.bulb.cloneNode(true) as HTMLAudioElement;
        bulbClone.volume = audioSystem.sfxVolume;
        bulbClone.play().catch(() => {});
    }
};

// Silenciar/Activar audio
export const toggleMute = () => {
    audioSystem.isMuted = !audioSystem.isMuted;
    
    if (audioSystem.isMuted) {
        pauseBackgroundMusic();
        stopJetpackSound();
        stopStepsSound();
        stopEnergyDrainSound();
    } else {
        playBackgroundMusic().catch(() => {});
    }
    
    return audioSystem.isMuted;
};

// Ajustar volumen de música
export const setMusicVolume = (volume: number) => {
    audioSystem.musicVolume = Math.max(0, Math.min(1, volume));
    if (audioSystem.bgMusic) {
        audioSystem.bgMusic.volume = audioSystem.musicVolume;
    }
};

// Ajustar volumen de efectos de sonido
export const setSFXVolume = (volume: number) => {
    audioSystem.sfxVolume = Math.max(0, Math.min(1, volume));
    Object.values(audioSystem.sounds).forEach(sound => {
        if (sound) {
            sound.volume = audioSystem.sfxVolume;
        }
    });
};

// Obtener estado del audio
export const getAudioState = () => {
    return {
        isMuted: audioSystem.isMuted,
        musicVolume: audioSystem.musicVolume,
        sfxVolume: audioSystem.sfxVolume,
    };
};
