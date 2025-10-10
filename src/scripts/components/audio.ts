import type { GameStore } from '../core/types';

// Importar archivos de audio
import mainMusic from '../../assets/audio/main.mp3';
import jetpackSound from '../../assets/audio/jetpack.mp3';
import laserSound from '../../assets/audio/laser.mp3';
import lifedownSound from '../../assets/audio/lifedown.mp3';
import stepsSound from '../../assets/audio/steps.mp3';
import bombSound from '../../assets/audio/bomb.mp3';
import successLevelSound from '../../assets/audio/success_level.mp3';

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
    },
    isMuted: false,
    musicVolume: 0.3,
    sfxVolume: 0.5,
};

// Inicializar el sistema de audio
export const initAudio = () => {
    try {
        // Crear audio de música de fondo
        audioSystem.bgMusic = new Audio(mainMusic);
        audioSystem.bgMusic.loop = true;
        audioSystem.bgMusic.volume = audioSystem.musicVolume;

        // Crear efectos de sonido
        audioSystem.sounds.jetpack = new Audio(jetpackSound);
        audioSystem.sounds.jetpack.loop = true; // El jetpack suena mientras vuela
        audioSystem.sounds.jetpack.volume = audioSystem.sfxVolume;

        audioSystem.sounds.laser = new Audio(laserSound);
        audioSystem.sounds.laser.volume = audioSystem.sfxVolume;

        audioSystem.sounds.lifedown = new Audio(lifedownSound);
        audioSystem.sounds.lifedown.volume = audioSystem.sfxVolume;

        audioSystem.sounds.steps = new Audio(stepsSound);
        audioSystem.sounds.steps.loop = true; // Los pasos suenan en loop mientras camina
        audioSystem.sounds.steps.volume = audioSystem.sfxVolume * 0.6; // Más bajo que otros efectos

        audioSystem.sounds.bomb = new Audio(bombSound);
        audioSystem.sounds.bomb.volume = audioSystem.sfxVolume;

        audioSystem.sounds.successLevel = new Audio(successLevelSound);
        audioSystem.sounds.successLevel.volume = audioSystem.sfxVolume;

        console.log('Sistema de audio inicializado correctamente');
    } catch (error) {
        console.error('Error al inicializar el sistema de audio:', error);
    }
};

// Reproducir música de fondo
export const playBackgroundMusic = () => {
    if (audioSystem.bgMusic && !audioSystem.isMuted) {
        audioSystem.bgMusic.play().catch(error => {
            console.log('No se pudo reproducir la música automáticamente:', error);
        });
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

// Reproducir sonido de éxito al completar nivel
export const playSuccessLevelSound = () => {
    if (audioSystem.sounds.successLevel && !audioSystem.isMuted) {
        audioSystem.sounds.successLevel.currentTime = 0;
        audioSystem.sounds.successLevel.play().catch(error => {
            console.log('Error al reproducir success level:', error);
        });
    }
};

// Silenciar/Activar audio
export const toggleMute = () => {
    audioSystem.isMuted = !audioSystem.isMuted;
    
    if (audioSystem.isMuted) {
        pauseBackgroundMusic();
        stopJetpackSound();
        stopStepsSound();
    } else {
        playBackgroundMusic();
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
