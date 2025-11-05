# Guía de Credenciales de Google OAuth

## Problema Común: JSON sin client_secret

Si descargaste un archivo JSON de Google Cloud Console y tiene este formato:

```json
{
  "installed": {
    "client_id": "685850035577-6h1ab54g6vsib9rsh323m2676cqapsit.apps.googleusercontent.com",
    "project_id": "disco-plane-477312-g6",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
  }
}
```

**Esto significa que creaste un OAuth Client ID de tipo "Installed application" o "Desktop app".**

## Solución: Crear OAuth Client ID de tipo "Web application"

### Paso 1: Ir a Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto (en tu caso: `disco-plane-477312-g6`)
3. Ve a **APIs & Services** → **Credentials**

### Paso 2: Crear nuevo OAuth Client ID

1. Haz clic en **Create Credentials** → **OAuth client ID**
2. Si es la primera vez, configura el consent screen:
   - Tipo: **External** (o Internal si es para organización)
   - Completa la información requerida
3. En el formulario de OAuth Client ID:
   - **Application type**: Selecciona **Web application** (NO "Installed application" ni "Desktop app")
   - **Name**: "New H.E.R.O. - Netlify Identity"
4. Configura las URIs:
   - **Authorized JavaScript origins**:
     ```
     https://newhero.netlify.app
     https://newhero.netlify.app/.netlify/identity
     ```
   - **Authorized redirect URIs**:
     ```
     https://newhero.netlify.app/.netlify/identity/callback
     ```
5. Haz clic en **Create**

### Paso 3: Obtener Client ID y Client Secret

Después de crear, verás una pantalla con:

```
Your Client ID
685850035577-xxxxxxxxxx.apps.googleusercontent.com

Your Client Secret
GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**⚠️ IMPORTANTE**: 
- Copia ambos valores **ahora mismo** - el Client Secret solo se muestra una vez
- Si cierras esta ventana, tendrás que crear un nuevo Client ID
- **NO descargues el JSON** - algunos formatos no incluyen el secret

### Paso 4: Configurar en Netlify

1. Ve a Netlify Dashboard → Tu sitio → **Site settings** → **Identity**
2. En **External providers**, haz clic en **Add provider**
3. Selecciona **Google**
4. Ingresa:
   - **Client ID**: El Client ID que copiaste
   - **Client Secret**: El Client Secret que copiaste (el que empieza con `GOCSPX-`)
5. Guarda los cambios

## Tipos de OAuth Client ID

| Tipo | Incluye client_secret | Uso |
|------|----------------------|-----|
| **Web application** | ✅ Sí | Para aplicaciones web (Netlify Identity) |
| Installed application | ❌ No | Para aplicaciones de escritorio |
| Desktop app | ❌ No | Para aplicaciones de escritorio |
| Android | ❌ No | Para apps Android nativas |
| iOS | ❌ No | Para apps iOS nativas |

**Para Netlify Identity, SIEMPRE usa "Web application".**

## Verificar que tienes las credenciales correctas

Si tienes un archivo JSON con este formato, tienes las credenciales correctas:

```json
{
  "web": {
    "client_id": "...",
    "project_id": "...",
    "auth_uri": "...",
    "token_uri": "...",
    "auth_provider_x509_cert_url": "...",
    "client_secret": "GOCSPX-...",
    "redirect_uris": ["https://newhero.netlify.app/.netlify/identity/callback"]
  }
}
```

Nota la diferencia:
- ✅ `"web"` → Correcto (tiene `client_secret`)
- ❌ `"installed"` → Incorrecto (no tiene `client_secret`)

## Si perdiste el Client Secret

Si ya cerraste la ventana y no tienes el Client Secret:

1. Ve a Google Cloud Console → **APIs & Services** → **Credentials**
2. Encuentra tu OAuth Client ID
3. Haz clic en el ícono de editar (lápiz)
4. Si el Client Secret no es visible, tendrás que crear uno nuevo:
   - Haz clic en **Reset** o crea un nuevo Client ID
   - Esta vez copia el Client Secret inmediatamente

