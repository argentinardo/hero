/**
 * Auth0Manager - Simple Authentication Manager
 */

import { Auth0Client } from '@auth0/auth0-spa-js';

interface Auth0User {
    email: string;
    name?: string;
    picture?: string;
    sub: string;
}

export const Auth0Manager = {
    client: null as Auth0Client | null,
    isInitialized: false,
    
    async initialize(config: any): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            const isProd = window.location.hostname.includes('netlify.app');
            const redirect_uri = isProd ? config.redirectUriProd : config.redirectUri;

            console.log(`[Auth0] Usando redirect_uri: ${redirect_uri}`);
            
            this.client = new Auth0Client({
                domain: config.domain,
                clientId: config.clientId,
                authorizationParams: {
                    redirect_uri: redirect_uri,
                },
                cacheLocation: 'localstorage',
                useRefreshTokens: true,
            });
            
            this.isInitialized = true;
            console.log('[Auth0] ✅ Inicializado');
            
            // Verificar sesión existente
            const user = await this.client.getUser();
            if (user) {
                console.log('[Auth0] Sesión activa:', user.email);
                localStorage.setItem('isLoggedIn', 'true');
            }
        } catch (error) {
            console.error('[Auth0] Error inicializando:', error);
            throw error;
        }
    },
    
    async loginWithGoogle(): Promise<Auth0User | null> {
        if (!this.client) throw new Error('Auth0 no inicializado');
        
        try {
            console.log('[Auth0] Iniciando Google login...');
            
            await this.client.loginWithPopup({
                authorizationParams: {
                    connection: 'google-oauth2',
                }
            });
            
            const user = await this.client.getUser();
            if (user) {
                console.log('[Auth0] ✅ Login exitoso:', user.email);
                localStorage.setItem('isLoggedIn', 'true');
                return {
                    email: user.email || '',
                    name: user.name,
                    picture: user.picture,
                    sub: user.sub || ''
                };
            }
            return null;
        } catch (error) {
            console.error('[Auth0] Error en login:', error);
            throw error;
        }
    },
    
    async logout(): Promise<void> {
        if (!this.client) return;
        
        try {
            console.log('[Auth0] Cerrando sesión...');
            await this.client.logout({ logoutParams: { returnTo: window.location.origin } });
            localStorage.removeItem('isLoggedIn');
            console.log('[Auth0] ✅ Sesión cerrada');
        } catch (error) {
            console.error('[Auth0] Error cerrando sesión:', error);
        }
    },
    
    async getUser(): Promise<Auth0User | null> {
        if (!this.client) return null;
        
        try {
            const user = await this.client.getUser();
            if (user) {
                return {
                    email: user.email || '',
                    name: user.name,
                    picture: user.picture,
                    sub: user.sub || ''
                };
            }
            return null;
        } catch (error) {
            console.error('[Auth0] Error obteniendo usuario:', error);
            return null;
        }
    }
};

export default Auth0Manager;
