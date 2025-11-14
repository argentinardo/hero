# 🔄 MIGRACIÓN DE NETLIFY IDENTITY A AUTH0

## 📋 PASOS REQUERIDOS

### 1️⃣ CREAR CUENTA Y APP EN AUTH0

1. **Ir a** https://auth0.com
2. **Crear cuenta gratuita** (si no tienes)
3. **Crear nueva aplicación:**
   - Applications → Create Application
   - Name: "HERO Game"
   - Type: **Single Page Application (SPA)**
   - Technology: **React** (o JavaScript)
   - Click "Create"

---

### 2️⃣ CONFIGURAR OAUTH EN GOOGLE CLOUD

1. **Ya deberías tener OAuth configurado en Google Cloud Console**
   - En Google Cloud Console, ve a Credenciales
   - Busca tu OAuth Client ID (el que usas con Netlify Identity)
   - **Agrega estos URI autorizados:**

   ```
   https://YOUR_AUTH0_DOMAIN.auth0.com/login/callback
   https://YOUR_AUTH0_DOMAIN.auth0.com/
   ```

2. **Copia el Client ID y Secret de Google** (los necesitarás para Auth0)

---

### 3️⃣ CONECTAR GOOGLE CON AUTH0

1. **En Auth0 Dashboard:**
   - Ve a Authentication → Social
   - Busca "Google" y haz clic
   - **Conecta con Google:**
     - Pega el **Google Client ID**
     - Pega el **Google Client Secret**
     - Haz clic "Save"

2. **Verifica que Google está conectado:**
   - Connections → Social → Google debe mostrar "Enabled"

---

### 4️⃣ CONFIGURAR APLICACIÓN EN AUTH0

**En la aplicación que creaste ("HERO Game"):**

#### Sección "Settings"
```
Domain: <copia esto - format: nombre.auth0.com>
Client ID: <copia esto también>
Client Secret: <guardalo en lugar seguro>
```

#### "Allowed Callback URLs"
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

### 5️⃣ CREAR API EN AUTH0 (Opcional pero recomendado)

1. **Applications → APIs**
2. **Create API:**
   - Name: "HERO Game API"
   - Identifier: `https://hero-game.com/api`
   - Signing Algorithm: RS256

3. **Copiar el Identifier** - lo usarás como `audience`

---

### 6️⃣ CONFIGURAR LA APP (código)

#### **Archivo: `src/auth0-config.json`**

```json
{
  "domain": "nombre-del-tenant.auth0.com",
  "clientId": "TU_CLIENT_ID_DE_AUTH0",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.hero.game://callback"
}
```

**REEMPLAZAR:**
- `nombre-del-tenant.auth0.com` → Tu dominio Auth0
- `TU_CLIENT_ID_DE_AUTH0` → Tu Client ID de Auth0

---

### 7️⃣ CREAR `auth0-callback.html`

Ya se proporciona en el código. Solo asegúrate que esté en `/src/`

---

### 8️⃣ ACTUALIZAR `index.html`

Reemplaza todo el script de Netlify Identity con Auth0Manager.

**Primero, agrega esto en el `<head>`:**

```html
<!-- Auth0 Configuration -->
<script id="auth0-config" type="application/json">
{
  "domain": "TU_AUTH0_DOMAIN.auth0.com",
  "clientId": "TU_CLIENT_ID",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.hero.game://callback"
}
</script>
```

---

### 9️⃣ ACTUALIZAR `ui.ts`

Se proporciona el código para reemplazar todos los `ni.on()` handlers con Auth0Manager equivalentes.

---

### 🔟 PROBAR LOCALMENTE

```bash
npm run build
npm run dev

# Abre http://localhost:5173
# Haz clic en "Ingresar"
# Selecciona "Google"
# Deberías ver el login de Auth0 con Google
```

---

## 🔐 MIGRACIÓN DE DATOS

### Obtener datos de Netlify Identity

1. **En Netlify Dashboard:**
   - Site Settings → Users
   - Contact Support para solicitar exportación de datos

2. **Los datos que obtiendrás:**
   - Email de usuarios
   - Hashed passwords (no se pueden importar directamente)

### Importar a Auth0

Auth0 proporciona herramientas de migración. Contacta con Auth0 Support para:
- Migración de usuarios
- Mapeo de credenciales
- Datos personalizados (metadatos)

---

## 🔄 FLUJO CON AUTH0 (Vs Netlify Identity)

### ANTES (Netlify Identity)
```
User → Click "Ingresar"
  → ni.open('login')
  → Netlify Identity Modal
  → Google Sign-In
  → hero://auth-callback?token=...
  → Procesado por setupAuthDeepLink()
```

### AHORA (Auth0)
```
User → Click "Ingresar"
  → Auth0Manager.loginWithGoogle()
  → Auth0 Login Page (con Google integrado)
  → Redirige a /callback o com.hero.game://callback
  → Auth0Manager maneja el callback
  → User en app ✅
```

---

## 📦 DETALLES TÉCNICOS

### Auth0Manager (Nuevo)
- ✅ Inicialización automática
- ✅ Manejo de sesiones
- ✅ Login/Logout
- ✅ Google Sign-In nativo
- ✅ Token management
- ✅ Compatible con Capacitor

### Cambios en ui.ts
- ✅ Reemplazar `ni.on('login')` → `await Auth0Manager.login()`
- ✅ Reemplazar `ni.on('logout')` → `await Auth0Manager.logout()`
- ✅ Reemplazar `ni.open('login')` → `await Auth0Manager.loginWithGoogle()`
- ✅ Mantener todos los managers (nicknameManager, authManager)
- ✅ Mantener campaña "Legacy" por defecto

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### "No se carga el modal de login"
- Verificar que el Domain y ClientId son correctos
- Verificar que Allowed Callback URLs incluye tu dominio
- Revisar logs en consola del navegador

### "Error de CORS"
- Verificar que Allowed Web Origins está configurado
- Verificar que CORS tiene todos los orígenes

### "Google Sign-In no funciona"
- Verificar que Google está conectado en Auth0 → Connections → Social
- Verificar que el Google OAuth Client tiene los URI autorizados
- Verificar que "google-oauth2" connection está habilitada

### "En APK se queda en web"
- Verificar que redirectUriMobile es `com.hero.game://callback`
- Verificar que AndroidManifest.xml tiene el intent-filter correcto
- Verificar que setupAuthDeepLink() está registrado

---

## ✅ CHECKLIST DE MIGRACIÓN

- [ ] Crear cuenta Auth0
- [ ] Crear aplicación SPA en Auth0
- [ ] Conectar Google con Auth0
- [ ] Configurar Callback URLs
- [ ] Copiar Domain y ClientId
- [ ] Crear archivo `auth0-config.json`
- [ ] Actualizar `index.html`
- [ ] Crear `auth0-callback.html`
- [ ] Actualizar `ui.ts`
- [ ] Compilar y testear localmente
- [ ] Compilar APK
- [ ] Probar flujo web (http://localhost:5173)
- [ ] Probar flujo APK
- [ ] Verificar nickname sync
- [ ] Verificar campaña "Legacy" cargada

---

## 📞 CONTACTO AUTH0

- **Auth0 Support:** https://auth0.com/support
- **Auth0 Documentation:** https://auth0.com/docs
- **Auth0 Community:** https://community.auth0.com

---

## 🚀 SIGUIENTES PASOS

Una vez completada la migración:

1. **Remover Netlify Identity completamente**
   - Eliminar scripts de Netlify Identity
   - Limpiar referencias en localStorage

2. **Testear migraciones de usuarios**
   - Auth0 puede migrar usuarios desde Netlify Identity

3. **Configurar reglas/acciones en Auth0**
   - Post-login actions
   - Sync con base de datos
   - Enriquecimiento de tokens

4. **Monitoreo**
   - Auth0 Dashboard → Logs para ver eventos de login
   - Verificar tasas de éxito

---

**¿Preguntas?** Revisa la documentación de Auth0 o contacta support.

