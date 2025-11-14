/**
 * Auth0Manager - Gestor centralizado de autenticación con Auth0
 * Usa @auth0/auth0-spa-js desde npm (no CDN)
 */

import { Auth0Client, Auth0ClientOptions } from '@auth0/auth0-spa-js';

interface Auth0Config {
    domain: string;
    clientId: string;
    audience?: string;
    redirectUri: string;
    redirectUriMobile?: string;
}

interface Auth0User {
    email: string;
    name?: string;
    picture?: string;
    sub: string;
}

export const Auth0Manager = {
    config: null as Auth0Config | null,
    auth0Instance: null as Auth0Client | null,
    currentUser: null as Auth0User | null,
    isInitialized: false,
    
    /**
     * Inicializa Auth0 con la configuración proporcionada
     */
    async initialize(config: Auth0Config): Promise<void> {
        if (this.isInitialized) {
            console.log('[Auth0Manager] Ya está inicializado');
            return;
        }
        
        try {
            this.config = config;
            console.log('[Auth0Manager] Inicializando con dominio:', config.domain);
            
            // Crear la instancia de Auth0Client
            console.log('[Auth0Manager] Creando cliente Auth0...');
            const auth0ClientOptions: Auth0ClientOptions = {
                domain: config.domain,
                clientId: config.clientId,
                ...(config.audience && { audience: config.audience }),
                authorizationParams: {
                    redirect_uri: this.getRedirectUri(),
                },
                cacheLocation: 'localstorage',
                useRefreshTokens: true,
            };
            
            this.auth0Instance = new Auth0Client(auth0ClientOptions);
            console.log('[Auth0Manager] ✅ Cliente Auth0 creado correctamente');
            
            // Marcar como inicializado
            this.isInitialized = true;
            console.log('[Auth0Manager] ✅✅ Auth0 completamente inicializado');
            
            // Verificar si el usuario ya está logueado
            await this.checkSession();
        } catch (error) {
            console.error('[Auth0Manager] ❌ Error inicializando Auth0:', error);
            console.error('[Auth0Manager] Error details:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'N/A'
            });
            throw error;
        }
    },
    
    /**
     * Obtiene la URI de redirección apropiada según el entorno
     */
    getRedirectUri(): string {
        const isCapacitor = typeof (window as any).Capacitor !== 'undefined';
        const isAndroid = /Android/i.test(navigator.userAgent);
        const isMobileApp = isCapacitor || isAndroid;
        
        if (isMobileApp && this.config?.redirectUriMobile) {
            console.log('[Auth0Manager] Usando redirectUri móvil:', this.config.redirectUriMobile);
            return this.config.redirectUriMobile;
        }
        
        if (this.config?.redirectUri) {
            console.log('[Auth0Manager] Usando redirectUri web:', this.config.redirectUri);
            return this.config.redirectUri;
        }
        
        throw new Error('No se configuró redirectUri en Auth0Config');
    },
    
    /**
     * Inicia sesión con Google usando Auth0
     */
    async loginWithGoogle(): Promise<Auth0User | null> {
        try {
            console.log('[Auth0Manager] Iniciando Google Sign-In...');
            
            if (!this.isInitialized || !this.auth0Instance) {
                throw new Error('Auth0 no está inicializado');
            }
            
            await this.auth0Instance.loginWithPopup({
                authorizationParams: {
                    connection: 'google-oauth2',
                }
            });
            
            const user = await this.auth0Instance.getUser();
            const token = await this.auth0Instance.getTokenSilently();
            
            if (user && user.email) {
                this.currentUser = {
                    email: user.email,
                    name: user.name,
                    picture: user.picture,
                    sub: user.sub || ''
                };
                localStorage.setItem('auth0_token', token);
                localStorage.setItem('isLoggedIn', 'true');
                console.log('[Auth0Manager] ✅ Google Sign-In exitoso:', user.email);
            }
            
            return this.currentUser;
        } catch (error) {
            console.error('[Auth0Manager] Error en Google Sign-In:', error);
            throw error;
        }
    },
    
    /**
     * Verifica si el usuario tiene una sesión activa
     */
    async checkSession(): Promise<boolean> {
        try {
            if (!this.auth0Instance) {
                return false;
            }
            
            const user = await this.auth0Instance.getUser();
            if (user && user.email) {
                this.currentUser = {
                    email: user.email,
                    name: user.name,
                    picture: user.picture,
                    sub: user.sub || ''
                };
                const token = await this.auth0Instance.getTokenSilently();
                localStorage.setItem('auth0_token', token);
                localStorage.setItem('isLoggedIn', 'true');
                console.log('[Auth0Manager] ✅ Sesión activa:', user.email);
                return true;
            }
            return false;
        } catch (error) {
            console.log('[Auth0Manager] Sin sesión activa');
            return false;
        }
    },
    
    /**
     * Obtiene el usuario actual
     */
    getCurrentUser(): Auth0User | null {
        return this.currentUser;
    },
    
    /**
     * Obtiene el token de acceso
     */
    async getAccessToken(): Promise<string | null> {
        try {
            if (!this.auth0Instance) {
                return null;
            }
            return await this.auth0Instance.getTokenSilently();
        } catch (error) {
            console.error('[Auth0Manager] Error obteniendo token:', error);
            return null;
        }
    },
    
    /**
     * Cierra sesión
     */
    async logout(): Promise<void> {
        try {
            console.log('[Auth0Manager] Cerrando sesión...');
            if (this.auth0Instance) {
                await this.auth0Instance.logout({ logoutParams: { returnTo: window.location.origin } });
            }
            this.currentUser = null;
            localStorage.removeItem('auth0_token');
            localStorage.removeItem('isLoggedIn');
            console.log('[Auth0Manager] ✅ Sesión cerrada');
        } catch (error) {
            console.error('[Auth0Manager] Error cerrando sesión:', error);
            throw error;
        }
    },
    
    /**
     * Procesa el callback de Auth0
     */
    async handleRedirectCallback(): Promise<Auth0User | null> {
        try {
            if (!this.auth0Instance) {
                return null;
            }
            
            await this.auth0Instance.handleRedirectCallback();
            const user = await this.auth0Instance.getUser();
            
            if (user && user.email) {
                this.currentUser = {
                    email: user.email,
                    name: user.name,
                    picture: user.picture,
                    sub: user.sub || ''
                };
                const token = await this.auth0Instance.getTokenSilently();
                localStorage.setItem('auth0_token', token);
                localStorage.setItem('isLoggedIn', 'true');
                console.log('[Auth0Manager] ✅ Callback procesado:', user.email);
                return this.currentUser;
            }
            
            return null;
        } catch (error) {
            console.error('[Auth0Manager] Error procesando callback:', error);
            throw error;
        }
    }
};

export default Auth0Manager;
