# Configuración de Google OAuth en Netlify Identity

Este documento explica cómo configurar Google OAuth para que funcione con el botón "Continuar con Google" en la aplicación.

## ⚠️ Importante

Netlify Identity está en desuso, pero aún funciona para sitios que ya lo tienen configurado. Si estás configurando esto por primera vez, considera alternativas como Auth0 o Supabase Auth.

## Pasos para configurar Google OAuth

### 1. Configurar Google OAuth en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** → **Credentials**
4. Haz clic en **Create Credentials** → **OAuth client ID**
5. Configura el consent screen si es la primera vez:
   - Tipo de aplicación: **External** (o Internal si es para organización)
   - Completa la información requerida
6. **IMPORTANTE**: Crea el OAuth Client ID con el tipo correcto:
   - Tipo de aplicación: **Web application** (NO "Installed application" o "Desktop app")
   - Nombre: "New H.E.R.O. - Netlify Identity"
   - **Authorized JavaScript origins**:
     ```
     https://newhero.netlify.app
     https://newhero.netlify.app/.netlify/identity
     ```
   - **Authorized redirect URIs**:
     ```
     https://newhero.netlify.app/.netlify/identity/callback
     ```
7. Después de crear, verás una pantalla con:
   - **Your Client ID**: `xxxxx-xxxxx.apps.googleusercontent.com`
   - **Your Client Secret**: `GOCSPX-xxxxx` (este es el que necesitas)
8. Copia ambos valores: **Client ID** y **Client Secret**

**⚠️ Nota importante**: Si el JSON que descargaste no tiene `client_secret`, significa que creaste un OAuth Client ID de tipo "Installed application" o "Desktop app". Necesitas crear uno nuevo de tipo "Web application" para que incluya el `client_secret`.

### 2. Configurar en Netlify Dashboard

1. Ve a tu sitio en [Netlify Dashboard](https://app.netlify.com/)
2. Selecciona tu sitio: **newhero** (o el nombre de tu sitio)
3. En el menú lateral izquierdo, haz clic en **Site settings** (Configuración del sitio)
4. En el menú de configuración, busca y haz clic en **Identity** (Autenticación)
5. En la página de Identity, desplázate hacia abajo hasta encontrar la sección **External providers** (Proveedores externos) o **Services** (Servicios)
6. Haz clic en **Enable Identity** (Habilitar Identity) si aún no está habilitado
7. En la sección de **External providers**, haz clic en **Add provider** (Agregar proveedor) o en el botón **+ Add provider**
8. En el menú desplegable, selecciona **Google**
9. Se abrirá un formulario donde debes ingresar:
   - **Client ID**: Pega aquí el Client ID que copiaste de Google Cloud Console
   - **Client Secret**: Pega aquí el Client Secret que copiaste de Google Cloud Console
10. Haz clic en **Save** (Guardar) o **Save provider** (Guardar proveedor)

**Ubicación exacta en el dashboard:**
```
Netlify Dashboard
  └── Tu Sitio (newhero)
      └── Site settings (Configuración del sitio)
          └── Identity (Autenticación)
              └── External providers / Services (Proveedores externos / Servicios)
                  └── Add provider (+ Agregar proveedor)
                      └── Seleccionar "Google"
                          └── Ingresar Client ID y Client Secret
                              └── Guardar
```

### 3. Verificar la configuración

1. Después de guardar, el provider de Google debería aparecer como "Enabled" en la lista de providers
2. Prueba el botón "Continuar con Google" en la aplicación
3. Deberías ser redirigido a Google para autenticarte
4. Después de autenticarte, serás redirigido de vuelta a la aplicación

### Si descargaste un JSON sin client_secret

Si el archivo JSON que descargaste tiene este formato:
```json
{
  "installed": {
    "client_id": "...",
    "project_id": "...",
    "auth_uri": "...",
    "token_uri": "..."
  }
}
```

**Esto significa que creaste un OAuth Client ID de tipo "Installed application" o "Desktop app".**

**Solución:**
1. Ve a Google Cloud Console → **APIs & Services** → **Credentials**
2. Busca tu OAuth Client ID existente
3. **NO lo uses** - necesitas crear uno nuevo
4. Haz clic en **Create Credentials** → **OAuth client ID**
5. Esta vez selecciona **Web application** (no "Installed application")
6. Completa los campos de Authorized JavaScript origins y Redirect URIs
7. Después de crear, verás el **Client ID** y **Client Secret** en la pantalla
8. Copia ambos valores manualmente (no descargues el JSON, ya que algunos formatos no incluyen el secret)

## Solución de problemas

### Error: "Unsupported provider: Provider is not enabled"

Este error significa que:
1. El provider de Google no está habilitado en Netlify Identity
2. O las credenciales no están correctamente configuradas

**Solución paso a paso:**
1. Ve a **Netlify Dashboard** → Tu sitio → **Site settings** → **Identity**
2. Verifica que **Identity** esté habilitado (debería decir "Enabled" o "Habilitado")
3. En la sección **External providers** o **Services**, verifica que **Google** aparezca en la lista
4. Si Google no aparece:
   - Haz clic en **Add provider** o el botón **+**
   - Selecciona **Google**
   - Ingresa el **Client ID** y **Client Secret** de Google Cloud Console
   - Haz clic en **Save**
5. Verifica que las URIs de redirección en Google Cloud Console coincidan exactamente con:
   - `https://newhero.netlify.app/.netlify/identity/callback`
6. Asegúrate de que el sitio esté desplegado en Netlify (no funciona en localhost sin configuración adicional)

### No encuentro la opción "External providers" o "Services"

Si no ves la sección de providers externos:
- Asegúrate de que **Identity** esté habilitado primero
- Puede estar en una sección colapsada o más abajo en la página
- Busca botones como "Add provider", "Enable provider", o "Configure external providers"
- Si usas la interfaz en español, busca "Proveedores externos" o "Servicios externos"

### El botón no aparece o no funciona

- Verifica que Netlify Identity esté habilitado en tu sitio
- Verifica que el widget de Netlify Identity se esté cargando correctamente (revisa la consola del navegador)
- Asegúrate de que estés usando la URL correcta del sitio en producción

## Notas adicionales

- Los providers externos solo funcionan en sitios desplegados en Netlify (no en localhost)
- Si cambias las URLs de redirección en Google Cloud Console, actualiza también la configuración en Netlify
- El proceso de autenticación puede tardar unos minutos en propagarse después de la configuración inicial

