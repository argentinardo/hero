/**
 * Auth0Manager - Simple Authentication Manager
 */

import { Auth0Client } from '@auth0/auth0-spa-js';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

interface Auth0User {
    email: string;
    name?: string;
    picture?: string;
    sub: string;
}

export const Auth0Manager = {
    client: null as Auth0Client | null,
    isInitialized: false,
    config: null as { domain: string; clientId: string } | null,
    
    async initialize(config: any): Promise<void> {
        if (this.isInitialized) return;
        
        try {
            const isProd = window.location.hostname.includes('netlify.app');
            const isApk = Capacitor.isNativePlatform();
            
            let redirect_uri = config.redirectUri; // Default to localhost
            if (isApk) {
                redirect_uri = config.redirectUriApk;
            } else if (isProd) {
                redirect_uri = config.redirectUriProd;
            }

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
            
            // Guardar configuración para uso posterior
            this.config = {
                domain: config.domain,
                clientId: config.clientId
            };
            
            this.isInitialized = true;
            console.log('[Auth0] ✅ Inicializado');
            
            // CRÍTICO: Verificar si hay un callback pendiente de procesar
            // El SDK de Auth0 procesa automáticamente los redirects cuando detecta code y state en la URL
            try {
                // Primero verificar si hay parámetros de callback en la URL (web)
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');
                
                if (code && state && !isApk) {
                    // Es un callback de web, procesar con el SDK
                    console.log('[Auth0] 🔄 Detectado callback en URL, procesando...');
                    try {
                        await this.client.handleRedirectCallback();
                        console.log('[Auth0] ✅ Callback procesado correctamente');
                        
                        // Limpiar la URL removiendo los parámetros
                        window.history.replaceState({}, document.title, window.location.pathname);
                        
                        // Verificar autenticación después del callback
                        const isAuthenticated = await this.client.isAuthenticated();
                        if (isAuthenticated) {
                            const user = await this.client.getUser();
                            if (user) {
                                console.log('[Auth0] ✅ Usuario autenticado después del callback:', user.email);
                                localStorage.setItem('isLoggedIn', 'true');
                                return;
                            }
                        }
                    } catch (callbackError) {
                        console.error('[Auth0] ❌ Error procesando callback:', callbackError);
                    }
                }
                
                const isAuthenticated = await this.client.isAuthenticated();
                console.log('[Auth0] isAuthenticated:', isAuthenticated);
                
                if (isAuthenticated) {
                    const user = await this.client.getUser();
                    if (user) {
                        console.log('[Auth0] ✅ Sesión activa detectada:', user.email);
                        localStorage.setItem('isLoggedIn', 'true');
                        return; // Ya hay sesión, no necesitamos hacer nada más
                    }
                }
            } catch (error) {
                console.log('[Auth0] No hay sesión activa o error verificando:', error);
            }
        } catch (error) {
            console.error('[Auth0] Error inicializando:', error);
            throw error;
        }
    },
    





    async loginWithGoogle(): Promise<Auth0User | null> {
        if (!this.client) throw new Error('Auth0 no inicializado');
        
        try {
            console.log('[Auth0] Preparando para loginWithRedirect...');
            const isApk = Capacitor.isNativePlatform();
            
            const options: any = {
                authorizationParams: {
                    connection: 'google-oauth2',
                }
            };
            
            // CRÍTICO: En Capacitor, usar Browser.open() según documentación de Auth0
            if (isApk) {
                console.log('[Auth0] 📱 Usando Browser.open() para Capacitor');
                options.openUrl = async (url: string) => {
                    console.log('[Auth0] Abriendo URL en Browser:', url);
                    await Browser.open({
                        url,
                        windowName: '_self'
                    });
                };
            }
            
            await this.client.loginWithRedirect(options);
            
            // ¡IMPORTANTE! El código que sigue a esta línea no se ejecutará
            // porque la aplicación redirige al usuario. El resultado se procesará
            // cuando la app vuelva a abrirse.
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
            const isApk = Capacitor.isNativePlatform();
            
            // Obtener configuración para el returnTo correcto
            const config = await fetch('/auth0-config.json').then(r => r.json());
            const logoutUri = isApk ? config.redirectUriApk : window.location.origin;
            
            const logoutOptions: any = {
                logoutParams: {
                    returnTo: logoutUri
                }
            };
            
            // CRÍTICO: En Capacitor, usar Browser.open() según documentación de Auth0
            if (isApk) {
                console.log('[Auth0] 📱 Usando Browser.open() para logout en Capacitor');
                logoutOptions.openUrl = async (url: string) => {
                    console.log('[Auth0] Abriendo URL de logout en Browser:', url);
                    await Browser.open({
                        url,
                        windowName: '_self'
                    });
                };
            }
            
            await this.client.logout(logoutOptions);
            localStorage.removeItem('isLoggedIn');
            console.log('[Auth0] ✅ Sesión cerrada');
        } catch (error) {
            console.error('[Auth0] Error cerrando sesión:', error);
        }
    },
    
    async handleRedirectCallback(url: string): Promise<Auth0User | null> {
        console.log('[Auth0] ========== INICIANDO handleRedirectCallback ==========');
        console.log('[Auth0] URL recibida:', url);
        
        const isApk = Capacitor.isNativePlatform();
        
        // CRÍTICO: Cerrar el Browser después de recibir el callback (según documentación de Auth0)
        if (isApk) {
            try {
                console.log('[Auth0] 📱 Cerrando Browser de Capacitor...');
                await Browser.close();
                console.log('[Auth0] ✅ Browser cerrado');
            } catch (browserError) {
                console.warn('[Auth0] No se pudo cerrar Browser (puede que ya esté cerrado):', browserError);
            }
        }
        
        if (!this.client) {
            console.error('[Auth0] ❌ Client no inicializado');
            throw new Error('Auth0 client no inicializado');
        }
        
        // CRÍTICO: El SDK de Auth0 SPA JS maneja PKCE automáticamente
        // Necesitamos simular que la URL está en window.location para que el SDK la procese
        // Guardar la URL original
        const originalUrl = window.location.href;
        const originalSearch = window.location.search;
        
        try {
            // Extraer los parámetros de la URL del deep link
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const state = urlObj.searchParams.get('state');
            const error = urlObj.searchParams.get('error');
            
            if (error) {
                console.error('[Auth0] ❌ Error en callback:', error);
                throw new Error(`Error de autenticación: ${error}`);
            }
            
            if (!code || !state) {
                console.error('[Auth0] ❌ No hay code o state en la URL');
                return null;
            }
            
            console.log('[Auth0] ✅ Code y state encontrados');
            
            // Construir una URL temporal con los parámetros para que el SDK la procese
            // El SDK lee de window.location, así que necesitamos simularlo
            const tempUrl = new URL(window.location.origin + window.location.pathname);
            tempUrl.searchParams.set('code', code);
            tempUrl.searchParams.set('state', state);
            
            // Usar el método del SDK que maneja PKCE automáticamente
            // Nota: El SDK de Auth0 SPA JS no acepta URL como parámetro,
            // pero podemos usar el método interno o procesar manualmente con PKCE
            
            // Intentar usar el método del SDK primero
            try {
                // El SDK espera que window.location tenga los parámetros
                // Como no podemos cambiar window.location directamente,
                // usamos el método manual pero necesitamos el code_verifier del SDK
                
                // El SDK almacena el code_verifier en localStorage con una clave específica
                // Buscar el code_verifier en el cache del SDK
                if (!this.config) {
                    throw new Error('Configuración no disponible');
                }
                
                // Buscar code_verifier en localStorage - el SDK puede almacenarlo de varias formas
                let codeVerifier: string | null = null;
                
                // Intentar diferentes formatos de clave
                const possibleKeys = [
                    `@@auth0spajs@@::${this.config.clientId}::${this.config.domain}::code_verifier`,
                    `@@auth0spajs@@::${this.config.clientId}::${this.config.domain}::@@code_verifier@@`,
                    `auth0spajs::${this.config.clientId}::${this.config.domain}::code_verifier`,
                ];
                
                for (const key of possibleKeys) {
                    codeVerifier = localStorage.getItem(key);
                    if (codeVerifier) {
                        console.log(`[Auth0] ✅ Code verifier encontrado en clave: ${key}`);
                        break;
                    }
                }
                
                // Si no se encuentra con las claves conocidas, buscar en todos los items de localStorage
                if (!codeVerifier) {
                    console.log('[Auth0] 🔍 Buscando code_verifier en todos los items de localStorage...');
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.includes('code_verifier') || key.includes('codeVerifier'))) {
                            const value = localStorage.getItem(key);
                            console.log(`[Auth0] 🔍 Encontrado posible code_verifier en clave: ${key}`, value ? 'valor presente' : 'sin valor');
                            if (value && value.length > 20) { // code_verifier debe ser largo
                                codeVerifier = value;
                                console.log(`[Auth0] ✅ Code verifier encontrado en: ${key}`);
                                break;
                            }
                        }
                    }
                }
                
                if (codeVerifier) {
                    console.log('[Auth0] ✅ Code verifier encontrado, usando PKCE');
                    return await this.handleRedirectCallbackWithPKCE(url, codeVerifier);
                } else {
                    console.warn('[Auth0] ⚠️ No se encontró code_verifier');
                    console.warn('[Auth0] 📋 Items en localStorage que contienen auth0:', 
                        Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
                            .filter(key => key && key.includes('auth0'))
                            .map(key => `${key}: ${localStorage.getItem(key!)?.substring(0, 50)}...`)
                    );
                    
                    // ÚLTIMO INTENTO: Intentar usar el método handleRedirectCallback del SDK
                    // El SDK puede tener el code_verifier en su estado interno
                    console.log('[Auth0] 🔄 Intentando usar handleRedirectCallback del SDK directamente...');
                    try {
                        // Construir una URL temporal en window.location para que el SDK la procese
                        // Guardar la URL original
                        const originalHref = window.location.href;
                        const originalSearch = window.location.search;
                        
                        // Crear una URL temporal con los parámetros del deep link
                        const tempUrl = new URL(url);
                        const tempSearch = tempUrl.search;
                        
                        // Usar history.replaceState para simular que window.location tiene los parámetros
                        const newUrl = window.location.origin + window.location.pathname + tempSearch;
                        window.history.replaceState({}, '', newUrl);
                        
                        try {
                            // Intentar que el SDK procese el callback
                            const result = await this.client!.handleRedirectCallback();
                            console.log('[Auth0] ✅ SDK procesó el callback correctamente:', result);
                            
                            // Restaurar URL original
                            window.history.replaceState({}, '', originalHref);
                            
                            // Obtener usuario después del callback
                            const user = await this.client!.getUser();
                            if (user) {
                                localStorage.setItem('isLoggedIn', 'true');
                                return {
                                    email: user.email || '',
                                    name: user.name,
                                    picture: user.picture,
                                    sub: user.sub || ''
                                };
                            } else {
                                console.warn('[Auth0] ⚠️ SDK procesó callback pero no se obtuvo usuario');
                                return null;
                            }
                        } catch (sdkCallbackError) {
                            // Restaurar URL original en caso de error
                            window.history.replaceState({}, '', originalHref);
                            throw sdkCallbackError;
                        }
                    } catch (sdkMethodError) {
                        console.error('[Auth0] ❌ Error usando método del SDK:', sdkMethodError);
                        throw new Error('code_verifier no encontrado y SDK no pudo procesar el callback');
                    }
                }
            } catch (sdkError) {
                console.warn('[Auth0] ⚠️ Error procesando callback, intentando método manual:', sdkError);
                // No intentar método manual sin PKCE porque fallará
                throw sdkError;
            }
        } catch (error) {
            console.error('[Auth0] ❌ Error general en handleRedirectCallback:', error);
            throw error;
        } finally {
            // Restaurar la URL original (aunque no podemos cambiar window.location realmente)
            // Esto es solo para limpieza conceptual
        }
    },
    
    async handleRedirectCallbackWithPKCE(url: string, codeVerifier: string): Promise<Auth0User | null> {
        console.log('[Auth0] [PKCE] Procesando callback con PKCE...');
        
        try {
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const state = urlObj.searchParams.get('state');
            
            if (!code || !state) {
                throw new Error('No hay code o state en la URL');
            }
            
            // Obtener configuración
            const config = await fetch('/auth0-config.json').then(r => r.json());
            const domain = config.domain;
            const clientId = config.clientId;
            const redirectUri = config.redirectUriApk;
            
            // Intercambiar código por token con PKCE
            const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    code: code,
                    redirect_uri: redirectUri,
                    code_verifier: codeVerifier, // CRÍTICO: PKCE requiere code_verifier
                }),
            });
            
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                console.error('[Auth0] ❌ Error intercambiando código con PKCE:', errorData);
                throw new Error(`Error: ${errorData.error_description || errorData.error}`);
            }
            
            const tokenData = await tokenResponse.json();
            console.log('[Auth0] ✅ Token obtenido con PKCE');
            
            // Procesar el token igual que en el método manual
            const idToken = tokenData.id_token;
            if (!idToken) {
                throw new Error('No se recibió id_token');
            }
            
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            console.log('[Auth0] ✅ Usuario decodificado:', payload.email);
            
            // Guardar tokens en localStorage para que el SDK los use después
            if (this.client) {
                const cacheKey = `@@auth0spajs@@::${clientId}::${domain}::@@user@@`;
                localStorage.setItem(cacheKey, JSON.stringify({
                    ...tokenData,
                    decodedToken: { sub: payload.sub }
                }));
            }
            
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('auth0_access_token', tokenData.access_token);
            localStorage.setItem('auth0_id_token', idToken);
            
            const user: Auth0User = {
                email: payload.email || '',
                name: payload.name,
                picture: payload.picture,
                sub: payload.sub || ''
            };
            
            console.log('[Auth0] ✅✅✅ LOGIN COMPLETADO:', user.email);
            return user;
            
        } catch (error) {
            console.error('[Auth0] ❌❌❌ ERROR en handleRedirectCallbackWithPKCE:', error);
            throw error;
        }
    },
    
    async handleRedirectCallbackManual(url: string): Promise<Auth0User | null> {
        console.log('[Auth0] [MANUAL] Procesando callback manualmente...');
        
        try {
            // Extraer parámetros de la URL
            const urlObj = new URL(url);
            const code = urlObj.searchParams.get('code');
            const state = urlObj.searchParams.get('state');
            const error = urlObj.searchParams.get('error');
            
            if (error) {
                console.error('[Auth0] ❌ Error en callback:', error);
                throw new Error(`Error de autenticación: ${error}`);
            }
            
            if (!code || !state) {
                console.error('[Auth0] ❌ No hay code o state en la URL');
                return null;
            }
            
            console.log('[Auth0] ✅ Code y state encontrados');
            
            // Obtener configuración
            const config = await fetch('/auth0-config.json').then(r => r.json());
            const domain = config.domain;
            const clientId = config.clientId;
            const redirectUri = config.redirectUriApk; // El que usamos en la APK
            
            console.log('[Auth0] Intercambiando código por token...');
            console.log('[Auth0] Domain:', domain);
            console.log('[Auth0] Redirect URI:', redirectUri);
            
            // Intercambiar código por token directamente
            const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    code: code,
                    redirect_uri: redirectUri,
                }),
            });
            
            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.json();
                console.error('[Auth0] ❌ Error intercambiando código:', errorData);
                throw new Error(`Error: ${errorData.error_description || errorData.error}`);
            }
            
            const tokenData = await tokenResponse.json();
            console.log('[Auth0] ✅ Token obtenido');
            
            // Decodificar el ID token para obtener el usuario
            const idToken = tokenData.id_token;
            if (!idToken) {
                throw new Error('No se recibió id_token');
            }
            
            // Decodificar JWT (sin verificar firma, solo para obtener datos)
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            console.log('[Auth0] ✅ Usuario decodificado:', payload.email);
            
            // Guardar tokens en localStorage para que el SDK los use después
            if (this.client) {
                const cacheKey = `@@auth0spajs@@::${clientId}::${domain}::@@user@@`;
                localStorage.setItem(cacheKey, JSON.stringify({
                    ...tokenData,
                    decodedToken: { sub: payload.sub }
                }));
            }
            
            // Guardar estado de login
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('auth0_access_token', tokenData.access_token);
            localStorage.setItem('auth0_id_token', idToken);
            
            const user: Auth0User = {
                email: payload.email || '',
                name: payload.name,
                picture: payload.picture,
                sub: payload.sub || ''
            };
            
            console.log('[Auth0] ✅✅✅ LOGIN COMPLETADO:', user.email);
            return user;
            
        } catch (error) {
            console.error('[Auth0] ❌❌❌ ERROR en handleRedirectCallbackManual:', error);
            throw error;
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
