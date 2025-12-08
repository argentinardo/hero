import type { GameStore } from '../core/types';
import { Capacitor } from '@capacitor/core';

/**
 * Obtiene la ruta correcta para un archivo de audio según el entorno
 * En Capacitor/Android, los archivos están en la raíz del webDir (dist/audio/)
 * En web, los archivos están en /audio/ desde la raíz
 */
const getAudioPath = (filename: string): string => {
    try {
        const isCapacitor = Capacitor.isNativePlatform();
        
        if (isCapacitor) {
            // En Capacitor, usar ruta relativa desde la raíz del webDir
            // Los archivos están en dist/audio/ después del build
            // Usar ruta relativa que funcione en el contexto de la app
            const relativePath = `./audio/${filename}`;
            
            // Intentar usar convertFileSrc si está disponible
            if (typeof Capacitor.convertFileSrc === 'function') {
                try {
                    return Capacitor.convertFileSrc(relativePath);
                } catch (error) {
                    console.warn('[Audio] Error usando convertFileSrc, usando ruta relativa:', error);
                }
            }
            
            // Fallback: usar ruta relativa simple
            return relativePath;
        } else {
            // En web, usar ruta relativa para compatibilidad con itch.io
            // Webpack copia los archivos a ./audio/ en dist
            return `./audio/${filename}`;
        }
    } catch (error) {
        console.warn('[Audio] Error obteniendo ruta de audio, usando fallback:', error);
        // Fallback: ruta relativa simple
        return `./audio/${filename}`;
    }
};

// Rutas de archivos de audio (sin imports estáticos para mejor compatibilidad con Capacitor)
const audioFiles = {
    main: getAudioPath('main.mp3'),
    jetpack: getAudioPath('jetpack.mp3'),
    laser: getAudioPath('laser.mp3'),
    lifedown: getAudioPath('lifedown.mp3'),
    steps: getAudioPath('steps.mp3'),
    bombFire: getAudioPath('bomb_fire.mp3'),
    bombBoom: getAudioPath('bomb_boom.mp3'),
    enemyKill: getAudioPath('enemy_kill.mp3'),
    successLevel: getAudioPath('success_level.mp3'),
    toy: getAudioPath('toy.mp3'),
    brick: getAudioPath('brick.mp3'),
    bulb: getAudioPath('bulb.mp3'),
    energyDrain: getAudioPath('energy-drain.mp3'),
    tentacle: getAudioPath('tentacle.mp3'),
    wallHit: getAudioPath('wall_hit.mp3'),
    oneUp: getAudioPath('1up.mp3'),
};

// Interfaz para el sistema de audio
interface AudioSystem {
    bgMusic: HTMLAudioElement | null;
    sounds: {
        jetpack: HTMLAudioElement | null;
        laser: HTMLAudioElement | null;
        lifedown: HTMLAudioElement | null;
        steps: HTMLAudioElement | null;
        bomb: HTMLAudioElement | null; // Mantener para compatibilidad, ya no se usa
        bombFire: HTMLAudioElement | null;
        bombBoom: HTMLAudioElement | null;
        successLevel: HTMLAudioElement | null;
        enemyKill: HTMLAudioElement | null;
        toy: HTMLAudioElement | null;
        brick: HTMLAudioElement | null;
        bulb: HTMLAudioElement | null;
        energyDrain: HTMLAudioElement | null;
        tentacle: HTMLAudioElement | null;
        wallHit: HTMLAudioElement | null;
        oneUp: HTMLAudioElement | null;
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
        bomb: null, // Mantener para compatibilidad, ya no se usa
        bombFire: null,
        bombBoom: null,
        successLevel: null,
        enemyKill: null,
        toy: null,
        brick: null,
        bulb: null,
        energyDrain: null,
        tentacle: null,
        wallHit: null,
        oneUp: null,
    },
    isMuted: false,
    musicVolume: 0.3,
    sfxVolume: 0.5,
};

/**
 * Crea un elemento de audio de forma robusta con manejo de errores
 */
const createAudioElement = (src: string, options: { loop?: boolean; volume?: number } = {}): HTMLAudioElement | null => {
    try {
        const audio = new Audio();
        audio.src = src;
        if (options.loop !== undefined) audio.loop = options.loop;
        if (options.volume !== undefined) audio.volume = options.volume;
        audio.preload = 'auto';
        
        // Manejar errores de carga
        audio.addEventListener('error', (e) => {
            console.warn(`[Audio] Error cargando audio: ${src}`, e);
        });
        
        return audio;
    } catch (error) {
        console.error(`[Audio] Error creando elemento de audio para ${src}:`, error);
        return null;
    }
};

// Inicializar solo efectos de sonido críticos
export const initAudio = () => {
    try {
        // Crear solo efectos de sonido críticos (archivos pequeños)
        audioSystem.sounds.laser = createAudioElement(audioFiles.laser, { volume: audioSystem.sfxVolume });
        audioSystem.sounds.lifedown = createAudioElement(audioFiles.lifedown, { volume: audioSystem.sfxVolume });
        audioSystem.sounds.bomb = createAudioElement(audioFiles.bombBoom, { volume: audioSystem.sfxVolume }); // Mantener para compatibilidad
        audioSystem.sounds.enemyKill = createAudioElement(audioFiles.enemyKill, { volume: audioSystem.sfxVolume });
        audioSystem.sounds.toy = createAudioElement(audioFiles.toy, { volume: audioSystem.sfxVolume });
        audioSystem.sounds.brick = createAudioElement(audioFiles.brick, { volume: audioSystem.sfxVolume });
        audioSystem.sounds.bulb = createAudioElement(audioFiles.bulb, { volume: audioSystem.sfxVolume });

        console.log('[Audio] ✅ Audio crítico inicializado correctamente');
    } catch (error) {
        console.error('[Audio] ❌ Error al inicializar el sistema de audio:', error);
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
        const audio = createAudioElement(audioFiles.main, { 
            loop: true, 
            volume: audioSystem.musicVolume 
        });
        
        if (!audio) {
            console.warn('[Audio] ⚠️ No se pudo crear elemento de audio para música de fondo');
            reject(new Error('Failed to create audio element'));
            return;
        }
        
        audio.preload = 'auto'; // Precargar para mejor rendimiento en Capacitor
        
        const onCanPlay = () => {
            audioSystem.bgMusic = audio;
            console.log('[Audio] ✅ Música de fondo cargada dinámicamente');
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            resolve();
        };
        
        const onError = (e: Event) => {
            console.warn('[Audio] ⚠️ No se pudo cargar la música de fondo:', audioFiles.main, e);
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            reject(new Error('Failed to load background music'));
        };
        
        audio.addEventListener('canplaythrough', onCanPlay, { once: true });
        audio.addEventListener('error', onError, { once: true });
        
        // Cargar el archivo
        audio.load();
        
        // Timeout de seguridad (10 segundos)
        setTimeout(() => {
            if (!audioSystem.bgMusic) {
                console.warn('[Audio] ⚠️ Timeout cargando música de fondo');
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                // Continuar aunque no se haya cargado completamente
                audioSystem.bgMusic = audio;
                resolve();
            }
        }, 10000);
    });
};

// Función para cargar efectos de sonido adicionales de forma lazy
export const loadAdditionalSFX = async (): Promise<void> => {
    return new Promise((resolve) => {
        const sfxToLoad = [
            { key: 'jetpack', src: audioFiles.jetpack, loop: true },
            { key: 'steps', src: audioFiles.steps, loop: true },
            { key: 'successLevel', src: audioFiles.successLevel, loop: false },
            { key: 'energyDrain', src: audioFiles.energyDrain, loop: true },
            { key: 'tentacle', src: audioFiles.tentacle, loop: false },
            { key: 'bombFire', src: audioFiles.bombFire, loop: true },
            { key: 'bombBoom', src: audioFiles.bombBoom, loop: false },
            { key: 'wallHit', src: audioFiles.wallHit, loop: false },
            { key: 'oneUp', src: audioFiles.oneUp, loop: false }
        ];

        let loaded = 0;
        let failed = 0;
        const total = sfxToLoad.length;

        if (total === 0) {
            resolve();
            return;
        }

        const checkComplete = () => {
            if (loaded + failed === total) {
                console.log(`[Audio] ✅ Efectos de sonido cargados: ${loaded}/${total} (${failed} fallidos)`);
                resolve(); // Continuar aunque algunos fallen
            }
        };

        sfxToLoad.forEach(({ key, src, loop }) => {
            const audio = createAudioElement(src, { 
                loop, 
                volume: audioSystem.sfxVolume 
            });
            
            if (!audio) {
                console.warn(`[Audio] ⚠️ No se pudo crear elemento de audio para: ${key}`);
                failed++;
                checkComplete();
                return;
            }
            
            audio.preload = 'auto'; // Precargar para mejor rendimiento en Capacitor
            
            const onCanPlay = () => {
                audioSystem.sounds[key as keyof typeof audioSystem.sounds] = audio;
                loaded++;
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                checkComplete();
            };
            
            const onError = (e: Event) => {
                console.warn(`[Audio] ⚠️ No se pudo cargar el efecto de sonido: ${key}`, src, e);
                failed++;
                audio.removeEventListener('canplaythrough', onCanPlay);
                audio.removeEventListener('error', onError);
                checkComplete();
            };
            
            audio.addEventListener('canplaythrough', onCanPlay, { once: true });
            audio.addEventListener('error', onError, { once: true });
            
            // Cargar el archivo
            audio.load();
            
            // Timeout de seguridad por archivo (5 segundos)
            setTimeout(() => {
                if (!audioSystem.sounds[key as keyof typeof audioSystem.sounds]) {
                    console.warn(`[Audio] ⚠️ Timeout cargando: ${key}`);
                    audio.removeEventListener('canplaythrough', onCanPlay);
                    audio.removeEventListener('error', onError);
                    // Continuar aunque no se haya cargado completamente
                    audioSystem.sounds[key as keyof typeof audioSystem.sounds] = audio;
                    loaded++;
                    checkComplete();
                }
            }, 5000);
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
            // Evitar solapamientos: si ya está sonando, no reiniciar
            if (!audioSystem.bgMusic.paused && audioSystem.bgMusic.currentTime > 0) {
                return;
            }
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
    // Detener todos los sonidos de bombFire activos
    stopAllBombFireSounds();
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
    // Detener todos los sonidos de bombFire activos
    stopAllBombFireSounds();
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

// Mapa para rastrear instancias de bombFire por bomba activa
// Clave: string con coordenadas "x,y" de la bomba, Valor: HTMLAudioElement
const activeBombFireSounds = new Map<string, HTMLAudioElement>();

// Reproducir sonido de explosión de bomba (DEPRECADO: usar playBombBoomSound)
export const playBombSound = () => {
    playBombBoomSound();
};

// Detener sonido de explosión de bomba (DEPRECADO: usar stopBombFireSound con coordenadas)
export const stopBombSound = () => {
    // Ya no se usa, mantenido para compatibilidad
};

// Reproducir sonido de mecha de bomba en loop (una instancia por bomba)
// Usa coordenadas (x, y) como clave para evitar problemas con índices cambiantes
export const playBombFireSound = (x: number, y: number) => {
    if (audioSystem.isMuted) return;
    
    const key = `${x},${y}`;
    
    // Si ya hay un sonido para esta bomba, no hacer nada
    if (activeBombFireSounds.has(key)) return;
    
    // Crear nueva instancia de audio para esta bomba específica
    const fireSound = createAudioElement(audioFiles.bombFire, { 
        loop: true, 
        volume: audioSystem.sfxVolume 
    });
    
    if (!fireSound) {
        console.warn('[Audio] ⚠️ No se pudo crear sonido de bomb_fire');
        return;
    }
    
    activeBombFireSounds.set(key, fireSound);
    
    fireSound.play().catch(error => {
        console.warn('[Audio] ⚠️ Error al reproducir bomb_fire:', error);
        activeBombFireSounds.delete(key);
    });
};

// Detener sonido de mecha de bomba específica usando coordenadas
export const stopBombFireSound = (x: number, y: number) => {
    const key = `${x},${y}`;
    const fireSound = activeBombFireSounds.get(key);
    if (fireSound) {
        fireSound.pause();
        fireSound.currentTime = 0;
        activeBombFireSounds.delete(key);
    }
};

// Detener todos los sonidos de mecha activos
export const stopAllBombFireSounds = () => {
    activeBombFireSounds.forEach((sound, key) => {
        sound.pause();
        sound.currentTime = 0;
        activeBombFireSounds.delete(key);
    });
};

// Reproducir sonido de explosión de bomba (una sola vez, no loop)
export const playBombBoomSound = () => {
    if (audioSystem.sounds.bombBoom && !audioSystem.isMuted) {
        // Crear clon para permitir múltiples explosiones simultáneas
        const boomClone = audioSystem.sounds.bombBoom.cloneNode(true) as HTMLAudioElement;
        boomClone.volume = audioSystem.sfxVolume;
        boomClone.play().catch(() => {});
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

// Reproducir sonido del latigazo del tentáculo
export const playTentacleSound = () => {
    if (audioSystem.sounds.tentacle && !audioSystem.isMuted) {
        const tentacleClone = audioSystem.sounds.tentacle.cloneNode(true) as HTMLAudioElement;
        tentacleClone.volume = audioSystem.sfxVolume;
        tentacleClone.play().catch(() => {});
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

// Reproducir sonido cuando las paredes aplastantes chocan
export const playWallHitSound = () => {
    if (audioSystem.sounds.wallHit && !audioSystem.isMuted) {
        const wallHitClone = audioSystem.sounds.wallHit.cloneNode(true) as HTMLAudioElement;
        wallHitClone.volume = audioSystem.sfxVolume;
        wallHitClone.play().catch(() => {});
    }
};

// Reproducir sonido cuando el héroe gana una vida extra
export const playOneUpSound = () => {
    if (audioSystem.sounds.oneUp && !audioSystem.isMuted) {
        const oneUpClone = audioSystem.sounds.oneUp.cloneNode(true) as HTMLAudioElement;
        oneUpClone.volume = audioSystem.sfxVolume;
        oneUpClone.play().catch(() => {});
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
        stopAllBombFireSounds();
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
    // Actualizar volumen de todos los bombFire activos
    activeBombFireSounds.forEach(sound => {
        sound.volume = audioSystem.sfxVolume;
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

// Verificar si la música de fondo está sonando actualmente
export const isBackgroundMusicPlaying = (): boolean => {
    return audioSystem.bgMusic !== null && 
           !audioSystem.bgMusic.paused && 
           audioSystem.bgMusic.currentTime > 0 &&
           !audioSystem.isMuted;
};