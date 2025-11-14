# ✅ CHECKLIST INTERACTIVO: AUTH0 MIGRATION

## 🟢 PASO 1: CREAR CUENTA AUTH0 (5 min)

**Status:** ⏳ Pendiente

```
[ ] Ir a https://auth0.com
[ ] Hacer clic "Sign Up"
[ ] Completar formulario:
    [ ] Email
    [ ] Password
    [ ] Name
    [ ] Plan: "Free" (gratuito)
[ ] Verificar email
[ ] Completar onboarding (o saltarlo)
[ ] Acceder al Dashboard
```

**Después:** Deberías ver el Dashboard de Auth0

---

## 🟢 PASO 2: CREAR APLICACIÓN SPA (5 min)

**Status:** ⏳ Pendiente

```
En Auth0 Dashboard:
[ ] Menú izquierda → Applications
[ ] Botón azul "+ Create Application"
[ ] Formulario:
    [ ] Name: "HERO Game"
    [ ] Type: "Single Page Application"
    [ ] Technology: "React"
    [ ] Click "Create"

Después de crear:
[ ] Copiar DOMAIN: ___________________
[ ] Copiar CLIENT ID: ___________________
[ ] Copiar CLIENT SECRET: ___________________
```

---

## 🟢 PASO 3: CONECTAR GOOGLE (10 min)

**Status:** ⏳ Pendiente

### 3.1: En Google Cloud Console
```
[ ] Abrir https://console.cloud.google.com
[ ] Encontrar tu OAuth 2.0 Client ID
[ ] Copiar:
    [ ] Client ID: ___________________
    [ ] Client Secret: ___________________
```

### 3.2: En Auth0
```
[ ] Menú izquierda → Authentication → Connections
[ ] Buscar "Social"
[ ] Hacer clic en "Google"
[ ] Hacer clic en "Connect"
[ ] Pegar:
    [ ] Google Client ID
    [ ] Google Client Secret
[ ] Click "Save"

Después:
[ ] Ir a Applications → HERO Game
[ ] Pestaña "Connections"
[ ] Buscar "Google" en la lista
[ ] Activar el toggle
```

---

## 🟡 PASO 4: CONFIGURAR CALLBACKS EN AUTH0 (5 min)

**Status:** ⏳ Pendiente

### En Applications → HERO Game → Settings

#### "Allowed Callback URLs"
```
[ ] Copiar y pegar esto:

https://newhero.netlify.app/callback
https://newhero.netlify.app/auth0-callback.html
http://localhost:3000/callback
http://localhost:5173/callback
com.hero.game://callback
```

#### "Allowed Logout URLs"
```
[ ] Copiar y pegar esto:

https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
```

#### "Allowed Web Origins"
```
[ ] Copiar y pegar esto:

https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
```

#### "CORS Allowed Origins"
```
[ ] Copiar y pegar esto:

https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
```

---

## 🟡 PASO 5: CREAR API (OPCIONAL) (5 min)

**Status:** ⏳ Pendiente

```
[ ] Menú izquierda → Applications → APIs
[ ] Botón "+ Create API"
[ ] Formulario:
    [ ] Name: "HERO Game API"
    [ ] Identifier: "https://hero-game.com/api"
    [ ] Signing Algorithm: "RS256"
    [ ] Click "Create"

Después:
[ ] Copiar el Identifier: ___________________
```

---

## 🔵 PASO 6: CREAR auth0-config.json (2 min)

**Status:** ⏳ Pendiente

```
CREAR ARCHIVO: src/auth0-config.json

CONTENIDO:
{
  "domain": "TU_DOMAIN_AQUI.auth0.com",
  "clientId": "TU_CLIENT_ID_AQUI",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.hero.game://callback"
}

REEMPLAZAR:
[ ] TU_DOMAIN_AQUI con tu dominio Auth0
[ ] TU_CLIENT_ID_AQUI con tu Client ID de Auth0
```

---

## 🟣 PASO 7: ACTUALIZAR index.html (cuando confirms)

**Status:** ⏳ Esperar instrucciones

```
[ ] Yo proporciono el código exacto
[ ] Tú actualizas index.html
```

---

## 🟣 PASO 8: ACTUALIZAR ui.ts (cuando confirmes)

**Status:** ⏳ Esperar instrucciones

```
[ ] Yo proporciono el código exacto
[ ] Tú actualizas ui.ts
```

---

## 🟣 PASO 9: COMPILAR Y TESTEAR

**Status:** ⏳ Cuando completemos pasos anteriores

```
Cuando tengas todo listo:

[ ] npm run build
[ ] npx cap sync
[ ] npm run dev
[ ] Abre http://localhost:5173
[ ] Click "Ingresar"
[ ] Click "Ingresar con Google"
[ ] Loguéate
[ ] ✅ Deberías estar en la app
[ ] ✅ Nickname debería estar cargado
[ ] ✅ Legacy campaña debería estar activa
```

---

## 📊 RESUMEN DE DATOS

```
Domain Auth0: ___________________________
Client ID: ___________________________
Client Secret: ___________________________
Google Client ID: ___________________________
Google Client Secret: ___________________________
API Identifier: ___________________________
```

---

## 🎯 SIGUIENTE ACCIÓN

**1. Completa PASOS 1-6 (15 minutos)**

**2. Avísame cuando tengas:**
   - Auth0 Domain
   - Auth0 Client ID
   - Google conectado en Auth0
   - auth0-config.json creado

**3. Yo actualizo el código (5 minutos)**

**4. Compilas y pruebas (5 minutos)**

---

## 🚨 POSIBLES ERRORES

| Error | Solución |
|-------|----------|
| "Cannot fetch OIDC config" | Verifica Domain correcto |
| "Invalid client_id" | Verifica Client ID correcto |
| "Redirect URI mismatch" | Verifica Allowed Callback URLs |
| "Google no funciona" | Verifica Google está en Connections |
| "En APK se va a web" | Verifica com.hero.game://callback en URLs |

---

## 💡 TIPS

1. **Copia y pega los URLs exactos** (no escribas manualmente)
2. **Guarda tu Client Secret en lugar seguro**
3. **No commits auth0-config.json a GitHub** (tiene datos sensibles)
4. **Puedes crear múltiples apps** (una para dev, una para prod)
5. **Auth0 gratis = 7,500 logins/mes** (más que suficiente)

---

## 📞 AYUDA

- **¿Cómo creo cuenta en Auth0?** → EMAIL: hello@auth0.com
- **¿No recibo email de verificación?** → Revisa spam
- **¿Perdí mis credenciales?** → Puedes verlas siempre en Dashboard
- **¿Preguntas técnicas?** → https://community.auth0.com

---

**Cuando completes los PASOS 1-6, avísame para continuar.** ✅

🚀 **¡Vamos!**

