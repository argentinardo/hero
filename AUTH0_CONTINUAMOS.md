# 🚀 CONTINUAMOS - PASO A PASO

## ✅ LO QUE YA COMPLETASTE

```
✅ PASO 1: Cuenta Auth0 creada
✅ PASO 2: App SPA "HERO Game" creada
✅ PASO 3: Credenciales copiadas
   Domain: dev-xgqa1ebceww6f4x6.us.auth0.com
   Client ID: 09DWQqEc0FUTvyuMPWRfnOoEi3YBwhyM
   Client Secret: WJYT1tk1UQ7_Gt20q6tK3hRlOPdcg6MBZLUWAyXFSxZpm_PJJMTwsyM0NO2ZGnwq

✅ PASO 5 (Parcial): URLs configuradas
   ✅ Allowed Callback URLs: 5 URLs pegados
   ✅ Allowed Logout URLs: 3 URLs pegados
   ⏳ Web Origins: Vacío (no necesario)
   ⏳ CORS Origins: Vacío (no necesario)
```

---

## ⏳ LO QUE FALTA (MUY POCO)

```
⏳ PASO 4: CONECTAR GOOGLE (si aún no lo hiciste)
⏳ PASO 6: GUARDAR CAMBIOS en Auth0
⏳ PASO 7: CREAR auth0-config.json en tu proyecto
```

---

## 📋 PASO 4: CONECTAR GOOGLE (OPCIONAL - Si no lo hiciste)

### ¿YA CONECTASTE GOOGLE?

**SI SÍ → Salta a PASO 6**

**SI NO → Sigue esto:**

### 4.1 En Auth0 Dashboard
```
Menú izquierdo:
Authentication → Social → Google
```

### 4.2 Buscar Google
Verás una lista. Busca "Google" y haz clic.

### 4.3 Clic en "Connect"
Se abrirá un diálogo pidiendo:
```
Client ID (Google): [Pega aquí tu Google Client ID]
Client Secret (Google): [Pega aquí tu Google Client Secret]
```

### 4.4 Obtener datos de Google Cloud
**Si NO tienes estos datos:**

1. Ve a: https://console.cloud.google.com
2. Menú izquierdo: "Credenciales"
3. Busca tu OAuth 2.0 Client ID
4. Haz clic en él
5. Copia: Client ID y Client Secret

### 4.5 Pegar en Auth0
En el diálogo de Google:
```
Client ID (Google): [PEGA_AQUI]
Client Secret (Google): [PEGA_AQUI]

Clic: "Save"
```

### 4.6 Habilitar Google para HERO Game
```
Applications → HERO Game → Connections

Busca: "Google"
Toggle: Activar (debe estar AZUL)
```

---

## ✅ PASO 6: GUARDAR CAMBIOS

**IMPORTANTE: No olvides esto**

```
En Applications → HERO Game → Settings

Scroll hacia el FINAL de la página
Botón: "Save Changes"

HAZ CLIC EN ÉL
```

Sin esto, los cambios NO se guardan.

---

## 📦 PASO 7: CREAR auth0-config.json EN TU PROYECTO

### 7.1 Abre Visual Studio Code

En la carpeta: `d:\repos\hero`

### 7.2 Crear archivo

```
Click derecho en la carpeta "src/"
Selecciona: "New File"
Nombre: auth0-config.json
```

### 7.3 Copiar contenido

Pega ESTO exactamente:

```json
{
  "domain": "dev-xgqa1ebceww6f4x6.us.auth0.com",
  "clientId": "09DWQqEc0FUTvyuMPWRfnOoEi3YBwhyM",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.hero.game://callback"
}
```

### 7.4 Guardar archivo

```
Ctrl + S
```

Verifica que aparece en el árbol de archivos.

---

## 🎉 CUANDO TERMINES TODO

Avísame y dime:

```
✅ Google conectado: SÍ / NO
✅ Cambios guardados en Auth0: SÍ / NO
✅ auth0-config.json creado: SÍ / NO

Contenido de auth0-config.json:
{
  "domain": "dev-xgqa1ebceww6f4x6.us.auth0.com",
  "clientId": "09DWQqEc0FUTvyuMPWRfnOoEi3YBwhyM",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.hero.game://callback"
}
```

---

## 🤖 CUANDO CONFIRMES

**YO HARÉ AUTOMÁTICAMENTE:**

```
✅ Actualizar index.html con Auth0
✅ Actualizar ui.ts con handlers
✅ Compilar proyecto
✅ Sincronizar Capacitor
✅ Listo para testear
```

---

## 🚀 ¿NECESITAS AYUDA EN ALGO ESPECÍFICO?

Dime exactamente en cuál paso estás atascado o qué error ves. 👍

