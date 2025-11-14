# 🔐 GUÍA COMPLETA: MIGRACIÓN AUTH0

## 🎯 RESUMEN EJECUTIVO

**Problema:** Netlify está deprecando Identity  
**Solución:** Migrar a Auth0 (compatible con todo lo que construimos)  
**Tiempo:** ~30 minutos  
**Complejidad:** Baja (pasos claros y ordenados)

---

## 📊 FLUJO VISUAL

### ANTES (Netlify Identity)
```
┌─────────────┐
│   User      │
│  Click      │
│ "Ingresar"  │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Netlify Identity    │
│ Widget Modal        │
│ (deprecated ❌)     │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ Selecciona Google   │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────────────┐
│ auth-callback.html          │
│ (Netlify redirige aquí)     │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ hero://auth-callback        │
│ (Deep link a app)           │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ setupAuthDeepLink()         │
│ (Procesa token)             │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ ✅ Usuario logueado en app  │
│ 📋 Legacy campaña cargada   │
│ 👤 Nickname sincronizado    │
└─────────────────────────────┘
```

### AHORA (Auth0)
```
┌─────────────┐
│   User      │
│  Click      │
│ "Ingresar"  │
└──────┬──────┘
       │
       ▼
┌────────────────────────────┐
│ Auth0Manager.               │
│ loginWithGoogle()           │
│ (nuevo ✅)                  │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ Auth0 Login Page           │
│ (with Google integrated)   │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ auth0-callback.html        │
│ (Auth0 redirige aquí)      │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ com.hero.game://callback   │
│ (o /callback en web)       │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ handleAuth0Callback()      │
│ (Procesa authorization)    │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ authManager.               │
│ handleLoginSuccess()       │
│ (Nuestro manager)          │
└──────┬─────────────────────┘
       │
       ▼
┌────────────────────────────┐
│ ✅ Usuario logueado en app │
│ 📋 Legacy campaña cargada  │
│ 👤 Nickname sincronizado   │
└────────────────────────────┘
```

---

## 🚀 PASO A PASO

### PASO 1: Crear Cuenta Auth0

1. Ve a https://auth0.com
2. Haz clic en "Sign Up"
3. Completa el formulario:
   - Email: tu email
   - Password: contraseña segura
   - Name: tu nombre
4. Verifica tu email
5. Completa el onboarding (puedes saltarlo)

---

### PASO 2: Crear Aplicación SPA

1. **En Auth0 Dashboard:**
   - Click izquierdo: "Applications" → "Applications"
   - Botón azul: "+ Create Application"

2. **Formulario:**
   - **Name:** `HERO Game` (o similar)
   - **Application Type:** "Single Page Application"
   - **Technology:** "React" (aunque uses TypeScript)
   - Click: "Create"

3. **Copiar datos:**
   ```
   Domain: xxxxxxx.auth0.com
   Client ID: COPIA_ESTO
   Client Secret: COPIA_ESTO
   ```

---

### PASO 3: Conectar Google con Auth0

1. **En Auth0 Dashboard:**
   - Menú izquierdo: "Authentication" → "Connections" → "Social"
   - Busca: "Google"
   - Click: "Google" → "Connect"

2. **Cuadro de diálogo:**
   - **Client ID (Google):** (necesitas el de Google Cloud)
   - **Client Secret (Google):** (necesitas el de Google Cloud)
   - Click: "Save"

3. **Habilitar para la app:**
   - Ve a: Applications → HERO Game
   - Pestaña: "Connections"
   - Busca "Google" en la lista
   - Activa el toggle

---

### PASO 4: Configurar Callbacks en Auth0

**En Applications → HERO Game → Settings:**

#### "Allowed Callback URLs" (CRÍTICO)
```
https://newhero.netlify.app/callback
https://newhero.netlify.app/auth0-callback.html
http://localhost:3000/callback
http://localhost:5173/callback
com.hero.game://callback
```

#### "Allowed Logout URLs"
```
https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
```

#### "Allowed Web Origins"
```
https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
https://localhost
```

#### "Cross-Origin Resource Sharing (CORS)"
```
https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
```

---

### PASO 5: Crear API (Opcional)

Si quieres usar tokens para tu backend:

1. **Applications → APIs**
2. **+ Create API:**
   - Name: `HERO Game API`
   - Identifier: `https://hero-game.com/api`
   - Signing Algorithm: `RS256`
3. **Copiar el Identifier:**
   ```
   https://hero-game.com/api
   ```

---

### PASO 6: Crear `auth0-config.json`

**Ruta:** `src/auth0-config.json`

```json
{
  "domain": "tu-dominio.auth0.com",
  "clientId": "TU_CLIENT_ID_DE_AUTH0",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.hero.game://callback"
}
```

**REEMPLAZAR:**
- `tu-dominio.auth0.com` → Tu dominio Auth0
- `TU_CLIENT_ID_DE_AUTH0` → Tu Client ID
- `https://hero-game.com/api` → Tu API Identifier (si creaste una)

---

### PASO 7: Actualizar `index.html`

**Agregar en el `<head>` (antes de closing `</head>`):**

```html
<!-- Auth0 Configuration -->
<script id="auth0-config" type="application/json">
{
  "domain": "tu-dominio.auth0.com",
  "clientId": "TU_CLIENT_ID_DE_AUTH0",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.hero.game://callback"
}
</script>

<!-- Auth0 SDK from CDN -->
<script src="https://cdn.auth0.com/js/auth0-spa-js/9.25.0/auth0-spa-js.production.js"></script>

<!-- Initialize Auth0 -->
<script>
async function initializeAuth0() {
    const configEl = document.getElementById('auth0-config');
    const config = JSON.parse(configEl.textContent);
    
    // Import Auth0Manager (será compilado en el bundle)
    const { Auth0Manager } = await import('./scripts/auth0-manager.ts');
    
    try {
        await Auth0Manager.initialize(config);
        console.log('[Init] ✅ Auth0Manager inicializado');
        
        // Verificar si hay un callback de Auth0 (después de login)
        await Auth0Manager.handleCallback();
    } catch (error) {
        console.error('[Init] Error inicializando Auth0:', error);
    }
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth0);
} else {
    initializeAuth0();
}
</script>
```

---

### PASO 8: Actualizar `ui.ts`

**Reemplazar los handlers de Netlify Identity:**

```typescript
// ANTES (Netlify Identity)
const authLoginBtn = document.getElementById('auth-login-btn');
authLoginBtn?.addEventListener('click', async () => {
    const ni = (window as any).netlifyIdentity;
    ni.open('login');
});

// AHORA (Auth0)
const authLoginBtn = document.getElementById('auth-login-btn');
authLoginBtn?.addEventListener('click', async () => {
    const { Auth0Manager } = await import('../auth0-manager');
    await Auth0Manager.loginWithGoogle();
});
```

**Para logout:**

```typescript
// ANTES (Netlify Identity)
const logoutBtn = document.getElementById('logout-btn');
logoutBtn?.addEventListener('click', async () => {
    const ni = (window as any).netlifyIdentity;
    ni.logout();
});

// AHORA (Auth0)
const logoutBtn = document.getElementById('logout-btn');
logoutBtn?.addEventListener('click', async () => {
    const { Auth0Manager } = await import('../auth0-manager');
    await Auth0Manager.logout();
});
```

---

### PASO 9: Crear Handler de Callback

**En `ui.ts`, agregar esta función:**

```typescript
/**
 * Maneja el callback de Auth0
 */
export const handleAuth0Callback = async () => {
    try {
        console.log('[Auth0 Callback Handler] Procesando callback...');
        
        const { Auth0Manager } = await import('../auth0-manager');
        const user = await Auth0Manager.checkSession();
        
        if (user) {
            console.log('[Auth0 Callback Handler] ✅ Usuario autenticado:', user.email);
            
            // Usar nuestro authManager (que ya existe)
            await authManager.handleLoginSuccess(user);
            
            // Cerrar modal si está abierto
            const authModal = document.getElementById('auth-choice-modal');
            if (authModal) {
                authModal.classList.add('hidden');
            }
            
            // Iniciar editor
            startEditor(store);
        }
    } catch (error) {
        console.error('[Auth0 Callback Handler] Error:', error);
    }
};

// Llamar al cargar la página si hay callback
document.addEventListener('DOMContentLoaded', handleAuth0Callback);
```

---

### PASO 10: Compilar y Probar

```bash
# Compilar
npm run build

# Sincronizar con Capacitor
npx cap sync

# Servir localmente
npm run dev

# Abrir http://localhost:5173
```

**Probar:**
1. Haz clic en "Ingresar"
2. Selecciona "Ingresar con Google"
3. Deberías ver login de Auth0 con Google
4. Loguéate
5. Deberías ser redirigido a la app
6. ✅ Nickname cargado
7. ✅ Legacy campaña activa

---

## 🔧 ESTRUCTURA DE ARCHIVOS

```
src/
├── index.html ..................... (Actualizado con Auth0)
├── auth0-callback.html ............ (Nuevo)
├── auth0-config.json .............. (Nuevo - Configuración)
├── scripts/
│   ├── auth0-manager.ts ........... (Nuevo - Gestor Auth0)
│   ├── components/ui.ts ........... (Actualizado - handlers)
│   └── ...
└── ...
```

---

## 🔍 VERIFICACIÓN

### En la Web

```
✅ npm run dev → http://localhost:5173
✅ Clic "Ingresar"
✅ Login con Google
✅ Redirigido a /callback
✅ Usuario en app
✅ Nickname sincronizado
✅ Legacy campaña activa
```

### En la APK

```
✅ Instalar APK compilada
✅ Abrir app
✅ Clic "Ingresar"
✅ Login con Google
✅ Redirigido a app (no a web) ✅
✅ Usuario en app
✅ Nickname sincronizado
✅ Legacy campaña activa
```

---

## 🆘 TROUBLESHOOTING

### "Error: OIDC configuration cannot be fetched"
**Solución:** Verifica que el Domain es correcto en auth0-config.json

### "Error: Invalid client_id"
**Solución:** Verifica que el Client ID es correcto

### "Redirect URI mismatch"
**Solución:** Asegúrate que todos los Allowed Callback URLs están configurados en Auth0

### "Google Sign-In no funciona"
**Solución:** 
1. Verifica que Google está conectado en Auth0 → Connections → Social
2. Verifica que Google está habilitado en Applications → HERO Game → Connections

### "En APK se queda en web"
**Solución:**
1. Verifica que `com.hero.game://callback` está en Allowed Callback URLs
2. Verifica que AndroidManifest.xml tiene el intent-filter correcto
3. Verifica que setupAuthDeepLink() está activo

---

## 📚 REFERENCIAS

- **Auth0 Docs:** https://auth0.com/docs
- **Auth0 SPA JS:** https://auth0.com/docs/libraries/auth0-spa-js
- **Auth0 Community:** https://community.auth0.com

---

## ✅ CHECKLIST FINAL

- [ ] Cuenta Auth0 creada
- [ ] Aplicación SPA creada
- [ ] Google conectado con Auth0
- [ ] Callback URLs configuradas
- [ ] auth0-config.json creado
- [ ] index.html actualizado
- [ ] auth0-callback.html en lugar
- [ ] ui.ts actualizado
- [ ] Compilación exitosa
- [ ] Testeado en web (localhost)
- [ ] APK compilada
- [ ] Testeado en APK
- [ ] Nickname sincronizado
- [ ] Legacy campaña por defecto
- [ ] Netlify Identity removido (opcional)

---

**¡Listo! ✨ Tu app ahora usa Auth0 en lugar de Netlify Identity**

