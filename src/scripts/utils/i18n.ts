/**
 * Sistema de Internacionalización (i18n) para NEW H.E.R.O.
 * 
 * Soporta múltiples idiomas y permite cambiar el idioma dinámicamente.
 */

export type Language = 'es' | 'en' | 'ca';

export interface Translations {
    // Menú principal
    menu: {
        play: string;
        gallery: string;
        tools: string;
        credits: string;
        editor: string;
        login: string;
        loginAction: string;
        logoutAction: string;
        editAction: string;
        installPWA: string;
        playStore: string;
        playStoreComingSoon: string;
        qrScanToPlay: string;
        qrScanInstructions: string;
    };
    // UI del juego
    game: {
        level: string;
        score: string;
        lives: string;
        power: string;
        tnt: string;
        gameOver: string;
        finalScore: string;
        retry: string;
        mainMenu: string;
        pause: string;
        resume: string;
        restart: string;
        settings: string;
        continue: string;
    };
    // Editor
        editor: {
            tools: string;
            edition: string;
            levels: string;
            undo: string;
            redo: string;
            duplicateRow: string;
            deleteRow: string;
            newLevel: string;
            generateLevel: string;
            saveLevel: string;
            saveToFile: string;
            shareLevel: string;
            playTest: string;
            playLevel: string;
            backToEditor: string;
            backToMenu: string;
            confirmSave: string;
            cancel: string;
            speed: string;
            color: string;
            levelNumber: string;
            difficulty: string;
            palette: {
                categories: {
                    characters: string;
                    terrain: string;
                    elements: string;
                    crushingWalls: string;
                    enemies: string;
                };
                tiles: {
                    player: string;
                    miner: string;
                    empty: string;
                    wall: string;
                    water: string;
                    column: string;
                    lavaColumn: string;
                    lava: string;
                    light: string;
                    platform: string;
                    wallLeft: string;
                    wallRight: string;
                    bat: string;
                    spider: string;
                    snake: string;
                    tentacle: string;
                };
            };
        };
    // Usuario
        user: {
            user: string;
            myArea: string;
            logout: string;
            profile: string;
            nickname: string;
            profileTitle: string;
            save: string;
            changeAvatar: string;
        };
    // Modales
        modals: {
            confirm: string;
            cancel: string;
            accept: string;
            close: string;
            yes: string;
            no: string;
            logoutConfirm: string;
            logoutMessage: string;
            saveConfirm: string;
            saveMessage: string;
            restartConfirm: string;
            restartMessage: string;
            confirmAction: string;
            confirmActionMessage: string;
            notification: string;
            entry: string;
            writeHere: string;
            menuTitle: string;
            backToMainMenuTitle: string;
            backToMainMenuMessage: string;
            errors: {
                notLoggedInShare: string;
                sessionExpired: string;
                shareError: string;
                notLoggedInSave: string;
                manualDownload: string;
                notAuthenticated: string;
                tokenExpired: string;
                saveSuccess: string;
                unauthorized: string;
                noConnection: string;
                nicknameSaved: string;
            };
        };
    // Autenticación
    auth: {
        authentication: string;
        loginMessage: string;
        login: string;
        loginWithGoogle: string;
        signup: string;
        createAccount: string;
        continueWithGoogle: string;
    };
    // Configuración
    settings: {
        title: string;
        sound: string;
        graphics: string;
        musicVolume: string;
        sfxVolume: string;
        soundStatus: string;
        soundOn: string;
        soundOff: string;
        scanline: string;
        scanlineDesc: string;
        glow: string;
        glowDesc: string;
        brightness: string;
        brightnessDesc: string;
        contrast: string;
        contrastDesc: string;
        vignette: string;
        vignetteDesc: string;
        blur: string;
        blurDesc: string;
        mobileFullWidth: string;
        mobileFullWidthDesc: string;
        showFps: string;
        language: string;
        controls: string;
        controlMode: string;
        controlModeHybrid: string;
        controlModeOnehand: string;
        controlModeVirtual: string;
        controlModeFixed: string;
    };
    // Galería
    gallery: {
        title: string;
        loading: string;
        sortBy: string;
        mostLiked: string;
        newest: string;
        mostDownloaded: string;
        play: string;
        implement: string;
        likes: string;
        downloads: string;
        author: string;
    };
    // Créditos
    credits: {
        title: string;
        developedBy: string;
        specialThanks: string;
    };
    // Mensajes
    messages: {
        pressEnter: string;
        levelGenerated: string;
        levelSaved: string;
        levelShared: string;
        levelSharedSuccess: string;
        newLevelCreated: string;
        restartLevelTitle: string;
        restartLevelMessage: string;
        levelNamePrompt: string;
        myLevel: string;
        levelDescriptionPrompt: string;
    };
    // Campañas
    campaigns: {
        title: string;
        manage: string;
        create: string;
        delete: string;
        select: string;
        defaultCampaign: string;
        addToCampaign: string;
        selectCampaign: string;
        campaignName: string;
        campaignNamePlaceholder: string;
        levelAdded: string;
        levelRemoved: string;
        levelAlreadyInCampaign: string;
        campaignCreated: string;
        campaignDeleted: string;
        reorderLevels: string;
        moveUp: string;
        moveDown: string;
        remove: string;
        saveToCampaign: string;
        saveToCampaignMessage: string;
        noCampaigns: string;
        cannotDeleteDefault: string;
    };
}

const translations: Record<Language, Translations> = {
    es: {
        menu: {
            play: 'JUGAR',
            gallery: 'GALERÍA',
            tools: 'TOOLS',
            credits: 'CRÉDITOS',
            editor: 'EDITOR',
            login: 'INGRESAR',
            loginAction: 'Iniciar sesión',
            logoutAction: 'Cerrar sesión',
            editAction: 'Editar',
            installPWA: 'Instalar App',
            playStore: 'Play Store',
            playStoreComingSoon: 'Próximamente',
            qrScanToPlay: 'ESCANEA PARA JUGAR EN MÓVIL',
            qrScanInstructions: 'Abre la cámara y escanea el código',
        },
        game: {
            level: 'LEVEL',
            score: 'SCORE',
            lives: 'LIVES',
            power: 'POWER',
            tnt: 'TNT',
            gameOver: 'GAME OVER',
            finalScore: 'Puntuación final',
            retry: 'Volver a Intentar',
            mainMenu: 'Menú Principal',
            pause: 'Pausar',
            resume: 'Continuar',
            restart: 'Reiniciar',
            settings: 'Configuración',
            continue: 'Continuar',
        },
        editor: {
            tools: 'TOOLS',
            edition: 'Edición',
            levels: 'Niveles',
            undo: 'Deshacer',
            redo: 'Rehacer',
            duplicateRow: 'Duplicar Fila',
            deleteRow: 'Borrar Fila',
            newLevel: 'Nuevo Nivel',
            generateLevel: 'Generar Nivel',
            saveLevel: 'Guardar Nivel',
            saveToFile: 'Guardar en Archivo',
            shareLevel: 'Compartir Nivel',
            playTest: 'Probar Nivel',
            playLevel: 'Jugar Nivel',
            backToEditor: 'Volver al Editor',
            backToMenu: 'Volver al Menú',
            confirmSave: 'Confirmar',
            cancel: 'Cancelar',
            speed: 'Velocidad',
            color: 'Color',
            levelNumber: 'Nivel',
            difficulty: 'dificultad',
            palette: {
                categories: {
                    characters: 'Personajes',
                    terrain: 'Terreno',
                    elements: 'Elementos',
                    crushingWalls: 'Paredes Aplastantes',
                    enemies: 'Enemigos',
                },
                tiles: {
                    player: 'Player',
                    miner: 'Minero',
                    empty: 'Vacío',
                    wall: 'Muro',
                    water: 'agua',
                    column: 'Columna',
                    lavaColumn: 'Col. Lava',
                    lava: 'Lava',
                    light: 'Luz',
                    platform: 'Plataforma',
                    wallLeft: 'Pared ←',
                    wallRight: 'Pared →',
                    bat: 'Bat',
                    spider: 'Araña',
                    snake: 'Víbora',
                    tentacle: 'Tentáculo',
                },
            },
        },
        user: {
            user: 'USUARIO',
            myArea: 'Mi Área',
            logout: 'Cerrar sesión',
            profile: 'Mi Área',
            nickname: 'Nickname',
            profileTitle: 'MI ÁREA',
            save: 'Guardar',
            changeAvatar: 'Cambiar Avatar',
        },
        modals: {
            confirm: 'Confirmar',
            cancel: 'Cancelar',
            accept: 'Aceptar',
            close: 'Cerrar',
            yes: 'Sí',
            no: 'No',
            logoutConfirm: 'Cerrar Sesión',
            logoutMessage: '¿Estás seguro de que deseas cerrar sesión?',
            saveConfirm: '¿Estás seguro?',
            saveMessage: 'Esto guardará el nivel actual y todos los cambios en el archivo JSON.',
            restartConfirm: 'Reiniciar Nivel',
            restartMessage: '¿Deseas reiniciar el nivel actual?',
            confirmAction: 'Confirmar acción',
            confirmActionMessage: '¿Seguro que deseas continuar?',
            notification: 'Notificación',
            entry: 'Entrada',
            writeHere: 'Escribe aquí...',
            menuTitle: 'Menú',
            backToMainMenuTitle: 'Menú Inicial',
            backToMainMenuMessage: '¿Deseas volver al menú inicial?',
            errors: {
                notLoggedInShare: 'Debes estar logueado para compartir niveles.',
                sessionExpired: 'No se pudo verificar tu sesión. Por favor, vuelve a iniciar sesión.',
                shareError: 'Error al compartir nivel. Por favor intenta de nuevo.',
                notLoggedInSave: 'Debes estar logueado para guardar los niveles.',
                manualDownload: 'No se pudo guardar automáticamente.\nSe descargó un archivo levels.json con los datos.',
                notAuthenticated: 'Por favor, inicia sesión nuevamente para guardar en la nube.',
                tokenExpired: 'Tu sesión puede haber expirado. Intentando guardar de todos modos...',
                saveSuccess: '¡Tus niveles se han guardado en tu cuenta!',
                unauthorized: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.\nSe guardó una copia local como respaldo.',
                noConnection: 'No hay conexión a Internet.\nSe guardó una copia local.\nReintenta cuando tengas conexión.',
                nicknameSaved: 'Nickname guardado exitosamente',
            },
        },
        auth: {
            authentication: 'Autenticación',
            loginMessage: 'Para poder editar niveles, inicia sesión con tu cuenta de Google.',
            login: 'Entrar',
            loginWithGoogle: 'Entrar con Google',
            signup: 'Crear cuenta',
            createAccount: 'Crear cuenta',
            continueWithGoogle: 'Continuar con Google',
        },
        settings: {
            title: 'Configuración',
            sound: 'Sonido',
            graphics: 'Gráficos',
            musicVolume: 'Volumen Música',
            sfxVolume: 'Volumen Efectos',
            soundStatus: 'Sonido',
            soundOn: 'ON',
            soundOff: 'OFF',
            scanline: 'Scanline (efecto CRT)',
            scanlineDesc: 'Desactiva efectos para mejorar el rendimiento en dispositivos móviles antiguos',
            glow: 'Efectos de Glow (brillo)',
            glowDesc: '',
            brightness: 'Brillo del Canvas',
            brightnessDesc: '',
            contrast: 'Contraste del Canvas',
            contrastDesc: '',
            vignette: 'Vignette (oscurecimiento bordes)',
            vignetteDesc: '',
            blur: 'Blur (desenfoque)',
            blurDesc: '',
            mobileFullWidth: 'Ancho completo en móvil',
            mobileFullWidthDesc: '',
            showFps: 'Mostrar FPS',
            language: 'Idioma',
            controls: 'Controles',
            controlMode: 'Modo de Control',
            controlModeHybrid: 'Híbrido',
            controlModeOnehand: 'Una Mano',
            controlModeVirtual: 'Virtual',
            controlModeFixed: 'Fija',
        },
        gallery: {
            title: 'GALERÍA DE NIVELES',
            loading: 'Cargando niveles...',
            sortBy: 'Ordenar por:',
            mostLiked: 'Más Votados',
            newest: 'Más Nuevos',
            mostDownloaded: 'Más Descargados',
            play: 'Jugar',
            implement: 'Implementar',
            likes: 'Likes',
            downloads: 'Descargas',
            author: 'Autor',
        },
        credits: {
            title: 'Créditos',
            developedBy: 'developed by:',
            specialThanks: 'con la gran ayuda de mi hijo ❤️Paolo❤️',
        },
        messages: {
            pressEnter: 'Presiona ENTER o el botón para empezar',
            levelGenerated: 'Nivel generado automáticamente',
            levelSaved: 'Nivel guardado correctamente',
            levelShared: 'Nivel compartido exitosamente',
            levelSharedSuccess: '¡Tu nivel ahora está disponible en la Galería!',
            newLevelCreated: 'Nivel {n} creado.\nComienza a diseñar tu nivel.',
            restartLevelTitle: 'Reiniciar Nivel',
            restartLevelMessage: '¿Deseas reiniciar el nivel actual?',
            levelNamePrompt: 'Nombre del nivel (aparecerá en la galería):',
            myLevel: 'Mi Nivel',
            levelDescriptionPrompt: 'Descripción opcional del nivel:',
        },
        campaigns: {
            title: 'Campañas',
            manage: 'Gestionar Campañas',
            create: 'Crear Campaña',
            delete: 'Eliminar',
            select: 'Seleccionar Campaña',
            defaultCampaign: 'Legacy',
            addToCampaign: 'Agregar a Campaña',
            selectCampaign: 'Selecciona una campaña',
            campaignName: 'Nombre de la campaña',
            campaignNamePlaceholder: 'Mi Campaña',
            levelAdded: 'Nivel agregado a la campaña',
            levelRemoved: 'Nivel eliminado de la campaña',
            levelAlreadyInCampaign: 'Nivel actualizado en la campaña',
            campaignCreated: 'Campaña creada exitosamente',
            campaignDeleted: 'Campaña eliminada',
            reorderLevels: 'Reordenar Niveles',
            moveUp: 'Subir',
            moveDown: 'Bajar',
            remove: 'Quitar',
            saveToCampaign: 'Guardar en Campaña',
            saveToCampaignMessage: '¿Deseas agregar este nivel a una campaña?',
            noCampaigns: 'No hay campañas disponibles',
            cannotDeleteDefault: 'No se puede eliminar la campaña por defecto',
        },
    },
    en: {
        menu: {
            play: 'PLAY',
            gallery: 'GALLERY',
            tools: 'TOOLS',
            credits: 'CREDITS',
            editor: 'EDITOR',
            login: 'LOGIN',
            loginAction: 'Log in',
            logoutAction: 'Log out',
            editAction: 'Edit',
            installPWA: 'Install App',
            playStore: 'Play Store',
            playStoreComingSoon: 'Coming Soon',
            qrScanToPlay: 'SCAN TO PLAY ON MOBILE',
            qrScanInstructions: 'Open your camera and scan the code',
        },
        game: {
            level: 'LEVEL',
            score: 'SCORE',
            lives: 'LIVES',
            power: 'POWER',
            tnt: 'TNT',
            gameOver: 'GAME OVER',
            finalScore: 'Final Score',
            retry: 'Try Again',
            mainMenu: 'Main Menu',
            pause: 'Pause',
            resume: 'Resume',
            restart: 'Restart',
            settings: 'Settings',
            continue: 'Continue',
        },
        editor: {
            tools: 'TOOLS',
            edition: 'Edition',
            levels: 'Levels',
            undo: 'Undo',
            redo: 'Redo',
            duplicateRow: 'Duplicate Row',
            deleteRow: 'Delete Row',
            newLevel: 'New Level',
            generateLevel: 'Generate Level',
            saveLevel: 'Save Level',
            saveToFile: 'Save to File',
            shareLevel: 'Share Level',
            playTest: 'Test Level',
            playLevel: 'Play Level',
            backToEditor: 'Back to Editor',
            backToMenu: 'Back to Menu',
            confirmSave: 'Confirm',
            cancel: 'Cancel',
            speed: 'Speed',
            color: 'Color',
            levelNumber: 'Level',
            difficulty: 'difficulty',
            palette: {
                categories: {
                    characters: 'Characters',
                    terrain: 'Terrain',
                    elements: 'Elements',
                    crushingWalls: 'Crushing Walls',
                    enemies: 'Enemies',
                },
                tiles: {
                    player: 'Player',
                    miner: 'Miner',
                    empty: 'Empty',
                    wall: 'Wall',
                    water: 'Water',
                    column: 'Column',
                    lavaColumn: 'Lava Column',
                    lava: 'Lava',
                    light: 'Light',
                    platform: 'Platform',
                    wallLeft: 'Wall ←',
                    wallRight: 'Wall →',
                    bat: 'Bat',
                    spider: 'Spider',
                    snake: 'Snake',
                    tentacle: 'Tentacle',
                },
            },
        },
        user: {
            user: 'USER',
            myArea: 'My Area',
            logout: 'Logout',
            profile: 'My Area',
            nickname: 'Nickname',
            profileTitle: 'MY AREA',
            save: 'Save',
            changeAvatar: 'Change Avatar',
        },
        modals: {
            confirm: 'Confirm',
            cancel: 'Cancel',
            accept: 'Accept',
            close: 'Close',
            yes: 'Yes',
            no: 'No',
            logoutConfirm: 'Logout',
            logoutMessage: 'Are you sure you want to logout?',
            saveConfirm: 'Are you sure?',
            saveMessage: 'This will save the current level and all changes to the JSON file.',
            restartConfirm: 'Restart Level',
            restartMessage: 'Do you want to restart the current level?',
            confirmAction: 'Confirm Action',
            confirmActionMessage: 'Are you sure you want to continue?',
            notification: 'Notification',
            entry: 'Entry',
            writeHere: 'Write here...',
            menuTitle: 'Menu',
            backToMainMenuTitle: 'Main Menu',
            backToMainMenuMessage: 'Do you want to return to the main menu?',
            errors: {
                notLoggedInShare: 'You must be logged in to share levels.',
                sessionExpired: 'Could not verify your session. Please log in again.',
                shareError: 'Error sharing level. Please try again.',
                notLoggedInSave: 'You must be logged in to save levels.',
                manualDownload: 'Could not save automatically.\nA levels.json file was downloaded with the data.',
                notAuthenticated: 'Please log in again to save to the cloud.',
                tokenExpired: 'Your session may have expired. Trying to save anyway...',
                saveSuccess: 'Your levels have been saved to your account!',
                unauthorized: 'Your session has expired. Please log in again.\nA local backup was saved.',
                noConnection: 'No internet connection.\nA local backup was saved.\nRetry when you have connection.',
                nicknameSaved: 'Nickname saved successfully',
            },
        },
        auth: {
            authentication: 'Authentication',
            loginMessage: 'To edit levels, please login with your Google account.',
            login: 'Login',
            loginWithGoogle: 'Sign in with Google',
            signup: 'Sign Up',
            createAccount: 'Create Account',
            continueWithGoogle: 'Continue with Google',
        },
        settings: {
            title: 'Settings',
            sound: 'Sound',
            graphics: 'Graphics',
            musicVolume: 'Music Volume',
            sfxVolume: 'SFX Volume',
            soundStatus: 'Sound',
            soundOn: 'ON',
            soundOff: 'OFF',
            scanline: 'Scanline (CRT effect)',
            scanlineDesc: 'Disable effects to improve performance on older mobile devices',
            glow: 'Glow Effects',
            glowDesc: '',
            brightness: 'Canvas Brightness',
            brightnessDesc: '',
            contrast: 'Canvas Contrast',
            contrastDesc: '',
            vignette: 'Vignette (edge darkening)',
            vignetteDesc: '',
            blur: 'Blur',
            blurDesc: '',
            mobileFullWidth: 'Full Width on Mobile',
            mobileFullWidthDesc: '',
            showFps: 'Show FPS',
            language: 'Language',
            controls: 'Controls',
            controlMode: 'Control Mode',
            controlModeHybrid: 'Hybrid',
            controlModeOnehand: 'One Hand',
            controlModeVirtual: 'Virtual',
            controlModeFixed: 'Fixed',
        },
        gallery: {
            title: 'LEVEL GALLERY',
            loading: 'Loading levels...',
            sortBy: 'Sort by:',
            mostLiked: 'Most Liked',
            newest: 'Newest',
            mostDownloaded: 'Most Downloaded',
            play: 'Play',
            implement: 'Implement',
            likes: 'Likes',
            downloads: 'Downloads',
            author: 'Author',
        },
        credits: {
            title: 'Credits',
            developedBy: 'developed by:',
            specialThanks: 'with the great help of my son ❤️Paolo❤️',
        },
        messages: {
            pressEnter: 'Press ENTER or the button to start',
            levelGenerated: 'Level automatically generated',
            levelSaved: 'Level saved successfully',
            levelShared: 'Level shared successfully',
            levelSharedSuccess: 'Your level is now available in the Gallery!',
            newLevelCreated: 'Level {n} created.\nStart designing your level.',
            restartLevelTitle: 'Restart Level',
            restartLevelMessage: 'Do you want to restart the current level?',
            levelNamePrompt: 'Level name (will appear in gallery):',
            myLevel: 'My Level',
            levelDescriptionPrompt: 'Optional level description:',
        },
        campaigns: {
            title: 'Campaigns',
            manage: 'Manage Campaigns',
            create: 'Create Campaign',
            delete: 'Delete',
            select: 'Select Campaign',
            defaultCampaign: 'Legacy',
            addToCampaign: 'Add to Campaign',
            selectCampaign: 'Select a campaign',
            campaignName: 'Campaign name',
            campaignNamePlaceholder: 'My Campaign',
            levelAdded: 'Level added to campaign',
            levelRemoved: 'Level removed from campaign',
            levelAlreadyInCampaign: 'Level updated in campaign',
            campaignCreated: 'Campaign created successfully',
            campaignDeleted: 'Campaign deleted',
            reorderLevels: 'Reorder Levels',
            moveUp: 'Move Up',
            moveDown: 'Move Down',
            remove: 'Remove',
            saveToCampaign: 'Save to Campaign',
            saveToCampaignMessage: 'Do you want to add this level to a campaign?',
            noCampaigns: 'No campaigns available',
            cannotDeleteDefault: 'Cannot delete the default campaign',
        },
    },
    ca: {
        menu: {
            play: 'JUGAR',
            gallery: 'GALERIA',
            tools: 'TOOLS',
            credits: 'CRÈDITS',
            editor: 'EDITOR',
            login: 'INGRESSAR',
            loginAction: 'Iniciar sessió',
            logoutAction: 'Tancar sessió',
            editAction: 'Editar',
            installPWA: 'Instal·lar App',
            playStore: 'Play Store',
            playStoreComingSoon: 'Pròximament',
            qrScanToPlay: 'ESCANEJA PER JUGAR AL MÒBIL',
            qrScanInstructions: 'Obre la càmera i escaneja el codi',
        },
        game: {
            level: 'LEVEL',
            score: 'SCORE',
            lives: 'LIVES',
            power: 'POWER',
            tnt: 'TNT',
            gameOver: 'GAME OVER',
            finalScore: 'Puntuació final',
            retry: 'Tornar a Intentar',
            mainMenu: 'Menú Principal',
            pause: 'Pausar',
            resume: 'Continuar',
            restart: 'Reiniciar',
            settings: 'Configuració',
            continue: 'Continuar',
        },
        editor: {
            tools: 'TOOLS',
            edition: 'Edició',
            levels: 'Nivells',
            undo: 'Desfer',
            redo: 'Refer',
            duplicateRow: 'Duplicar Fila',
            deleteRow: 'Esborrar Fila',
            newLevel: 'Nou Nivell',
            generateLevel: 'Generar Nivell',
            saveLevel: 'Guardar Nivell',
            saveToFile: 'Guardar en Arxiu',
            shareLevel: 'Compartir Nivell',
            playTest: 'Provar Nivell',
            playLevel: 'Jugar Nivell',
            backToEditor: 'Tornar a l\'Editor',
            backToMenu: 'Tornar al Menú',
            confirmSave: 'Confirmar',
            cancel: 'Cancel·lar',
            speed: 'Velocitat',
            color: 'Color',
            levelNumber: 'Nivell',
            difficulty: 'dificultat',
            palette: {
                categories: {
                    characters: 'Personatges',
                    terrain: 'Terreny',
                    elements: 'Elements',
                    crushingWalls: 'Parets Aixafants',
                    enemies: 'Enemics',
                },
                tiles: {
                    player: 'Player',
                    miner: 'Miner',
                    empty: 'Buit',
                    wall: 'Mur',
                    water: 'aigua',
                    column: 'Columna',
                    lavaColumn: 'Col. Lava',
                    lava: 'Lava',
                    light: 'Llum',
                    platform: 'Plataforma',
                    wallLeft: 'Paret ←',
                    wallRight: 'Paret →',
                    bat: 'Ratpenat',
                    spider: 'Aranya',
                    snake: 'Serp',
                    tentacle: 'Tentacle',
                },
            },
        },
        user: {
            user: 'USUARI',
            myArea: 'La Meva Àrea',
            logout: 'Tancar sessió',
            profile: 'La Meva Àrea',
            nickname: 'Nickname',
            profileTitle: 'LA MEVA ÀREA',
            save: 'Guardar',
            changeAvatar: 'Canviar Avatar',
        },
        modals: {
            confirm: 'Confirmar',
            cancel: 'Cancel·lar',
            accept: 'Acceptar',
            close: 'Tancar',
            yes: 'Sí',
            no: 'No',
            logoutConfirm: 'Tancar Sessió',
            logoutMessage: 'Estàs segur que vols tancar sessió?',
            saveConfirm: 'Estàs segur?',
            saveMessage: 'Això guardarà el nivell actual i tots els canvis a l\'arxiu JSON.',
            restartConfirm: 'Reiniciar Nivell',
            restartMessage: 'Vols reiniciar el nivell actual?',
            confirmAction: 'Confirmar acció',
            confirmActionMessage: 'Segur que vols continuar?',
            notification: 'Notificació',
            entry: 'Entrada',
            writeHere: 'Escriu aquí...',
            menuTitle: 'Menú',
            backToMainMenuTitle: 'Menú Inicial',
            backToMainMenuMessage: 'Vols tornar al menú inicial?',
            errors: {
                notLoggedInShare: 'Has d\'estar connectat per compartir nivells.',
                sessionExpired: 'No s\'ha pogut verificar la teva sessió. Si us plau, torna a iniciar sessió.',
                shareError: 'Error en compartir el nivell. Si us plau, torna a intentar.',
                notLoggedInSave: 'Has d\'estar connectat per guardar els nivells.',
                manualDownload: 'No s\'ha pogut guardar automàticament.\nS\'ha descarregat un arxiu levels.json amb les dades.',
                notAuthenticated: 'Si us plau, torna a iniciar sessió per guardar al núvol.',
                tokenExpired: 'La teva sessió pot haver expirat. Intentant guardar de tots maneres...',
                saveSuccess: 'Els teus nivells s\'han guardat al teu compte!',
                unauthorized: 'La teva sessió ha expirat. Si us plau, torna a iniciar sessió.\nS\'ha guardat una còpia local com a còpia de seguretat.',
                noConnection: 'No hi ha connexió a Internet.\nS\'ha guardat una còpia local.\nTorna a intentar quan tenguis connexió.',
                nicknameSaved: 'Nickname guardat exitosament',
            },
        },
        auth: {
            authentication: 'Autenticació',
            loginMessage: 'Per poder editar nivells, inicia sessió amb el teu compte de Google.',
            login: 'Entrar',
            loginWithGoogle: 'Entrar amb Google',
            signup: 'Crear compte',
            createAccount: 'Crear compte',
            continueWithGoogle: 'Continuar amb Google',
        },
        settings: {
            title: 'Configuració',
            sound: 'So',
            graphics: 'Gràfics',
            musicVolume: 'Volum Música',
            sfxVolume: 'Volum Efectes',
            soundStatus: 'So',
            soundOn: 'ON',
            soundOff: 'OFF',
            scanline: 'Scanline (efecte CRT)',
            scanlineDesc: 'Desactiva efectes per millorar el rendiment en dispositius mòbils antics',
            glow: 'Efectes de Glow (brillantor)',
            glowDesc: '',
            brightness: 'Brillantor del Canvas',
            brightnessDesc: '',
            contrast: 'Contrast del Canvas',
            contrastDesc: '',
            vignette: 'Vignette (enfosquiment vores)',
            vignetteDesc: '',
            blur: 'Blur (desenfocament)',
            blurDesc: '',
            mobileFullWidth: 'Ample complet en mòbil',
            mobileFullWidthDesc: '',
            showFps: 'Mostrar FPS',
            language: 'Idioma',
            controls: 'Controles',
            controlMode: 'Modo de Control',
            controlModeHybrid: 'Híbrido',
            controlModeOnehand: 'Una Mano',
            controlModeVirtual: 'Virtual',
            controlModeFixed: 'Fija',
        },
        gallery: {
            title: 'GALERIA DE NIVELLS',
            loading: 'Carregant nivells...',
            sortBy: 'Ordenar per:',
            mostLiked: 'Més Votats',
            newest: 'Més Nous',
            mostDownloaded: 'Més Descarregats',
            play: 'Jugar',
            implement: 'Implementar',
            likes: 'Likes',
            downloads: 'Descàrregues',
            author: 'Autor',
        },
        credits: {
            title: 'Crèdits',
            developedBy: 'developed by:',
            specialThanks: 'amb la gran ajuda del meu fill ❤️Paolo❤️',
        },
        messages: {
            pressEnter: 'Prem ENTER o el botó per començar',
            levelGenerated: 'Nivell generat automàticament',
            levelSaved: 'Nivell guardat correctament',
            levelShared: 'Nivell compartit exitosament',
            levelSharedSuccess: 'El teu nivell ara està disponible a la Galeria!',
            newLevelCreated: 'Nivell {n} creat.\nComença a dissenyar el teu nivell.',
            restartLevelTitle: 'Reiniciar Nivell',
            restartLevelMessage: 'Vols reiniciar el nivell actual?',
            levelNamePrompt: 'Nom del nivell (apareixerà a la galeria):',
            myLevel: 'El Meu Nivell',
            levelDescriptionPrompt: 'Descripció opcional del nivell:',
        },
        campaigns: {
            title: 'Campanyes',
            manage: 'Gestionar Campanyes',
            create: 'Crear Campanya',
            delete: 'Eliminar',
            select: 'Seleccionar Campanya',
            defaultCampaign: 'Legacy',
            addToCampaign: 'Afegir a Campanya',
            selectCampaign: 'Selecciona una campanya',
            campaignName: 'Nom de la campanya',
            campaignNamePlaceholder: 'La Meva Campanya',
            levelAdded: 'Nivell afegit a la campanya',
            levelRemoved: 'Nivell eliminat de la campanya',
            levelAlreadyInCampaign: 'Nivell actualitzat a la campanya',
            campaignCreated: 'Campanya creada exitosament',
            campaignDeleted: 'Campanya eliminada',
            reorderLevels: 'Reordenar Nivells',
            moveUp: 'Pujar',
            moveDown: 'Baixar',
            remove: 'Treure',
            saveToCampaign: 'Guardar a Campanya',
            saveToCampaignMessage: 'Vols afegir aquest nivell a una campanya?',
            noCampaigns: 'No hi ha campanyes disponibles',
            cannotDeleteDefault: 'No es pot eliminar la campanya per defecte',
        },
    },
};

let currentLanguage: Language = 'es';

/**
 * Obtiene el idioma actual del usuario desde localStorage o detecta el idioma del navegador
 */
export const getCurrentLanguage = (): Language => {
    const saved = localStorage.getItem('gameLanguage') as Language | null;
    if (saved && (saved === 'es' || saved === 'en' || saved === 'ca')) {
        return saved;
    }
    
    // Detectar idioma del navegador
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang.startsWith('en')) {
        return 'en';
    }
    if (browserLang.startsWith('ca')) {
        return 'ca';
    }
    return 'es'; // Por defecto español
};

/**
 * Establece el idioma actual
 */
export const setLanguage = (lang: Language): void => {
    currentLanguage = lang;
    localStorage.setItem('gameLanguage', lang);
    // Disparar evento personalizado para que los componentes se actualicen
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
};

/**
 * Obtiene una traducción
 */
export const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[currentLanguage];
    
    for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
            console.warn(`Translation key "${key}" not found for language "${currentLanguage}"`);
            // Intentar obtener del español como fallback
            value = translations.es;
            for (const k2 of keys) {
                value = value?.[k2];
            }
            return value || key;
        }
    }
    
    return value || key;
};

/**
 * Inicializa el sistema de i18n
 */
export const initI18n = (): void => {
    currentLanguage = getCurrentLanguage();
};

// Inicializar al cargar el módulo
initI18n();

