# 🎯 GUÍA VISUAL: CONFIGURACIÓN AUTH0 PASO A PASO

## PASO 1: CREAR CUENTA EN AUTH0

### 1.1 Ve a Auth0
- Abre: https://auth0.com
- Haz clic en: **"Sign Up"** (botón azul arriba a la derecha)

### 1.2 Completa el formulario
```
Email: _____________________________ (usa tu email)
Password: __________________________ (contraseña fuerte)
Name: _____________________________ (tu nombre)
```

### 1.3 Verifica tu email
- Auth0 te enviará un email de verificación
- Haz clic en el enlace del email
- Completa el onboarding (o sáltalo si quieres)

### 1.4 Ingresa al Dashboard
- Deberías ver el Dashboard de Auth0
- Tendrá un menú a la izquierda

---

## PASO 2: CREAR UNA APLICACIÓN SPA

### 2.1 Ir a Applications
```
MENÚ IZQUIERDO:
Busca: "Applications"
Haz clic en: "Applications"
```

### 2.2 Crear nueva aplicación
```
Verás un botón azul: "+ Create Application"
Haz clic en él
```

### 2.3 Completar formulario
```
┌─────────────────────────────────────────┐
│ CREATE APPLICATION DIALOG               │
├─────────────────────────────────────────┤
│ Name: HERO Game                         │
│                                         │
│ What is your application type?          │
│ ○ Traditional Web Application           │
│ ○ Single Page Application (SPA) ◄─ ESTE│
│ ○ Regular Web Apps                      │
│ ○ Confidential Applications              │
│ ○ Native                                 │
│ ○ Machine to Machine                    │
│                                         │
│ What technology stack are you using?    │
│ [Dropdown: React] ◄─ Selecciona React   │
│                                         │
│ [CREATE]                                │
└─────────────────────────────────────────┘
```

### 2.4 Esperar creación
- Verás un loading spinner
- Cuando termine, llegarás a la página Settings de tu app

---

## PASO 3: COPIAR TUS CREDENCIALES

### 3.1 En la página de tu app "HERO Game"
```
DEBERÍAS VER ESTOS DATOS:

Domain: dev-xgqa1ebceww6f4x6.us.auth0.com  ◄─ CÓPIALO AQUÍ
Client ID: 09DWQqEc0FUTvyuMPWRfnOoEi3YBwhyM      ◄─ CÓPIALO AQUÍ
Client Secret: WJYT1tk1UQ7_Gt20q6tK3hRlOPdcg6MBZLUWAyXFSxZpm_PJJMTwsyM0NO2ZGnwq ◄─ GUÁRDALO (no lo compartas)
```

### 3.2 Guardar en un lugar seguro
```
📝 COPIAR ESTOS DATOS Y GUARDAR:

Domain: _________________________________
Client ID: _________________________________
Client Secret: _________________________________
```

---

## PASO 4: CONECTAR GOOGLE

### 4.1 Ir a Social Connections
```
MENÚ IZQUIERDO:
Busca: "Authentication"
Haz clic en: "Authentication"

En el submenu:
Busca: "Social"
Haz clic en: "Social"
```

### 4.2 Buscar Google
```
Verás una lista de proveedores
Busca: "Google"
Encontrarás: Google (icono de Google)
Haz clic en: "Google"
```

### 4.3 Conectar Google
```
Verás un botón: "Connect"
Haz clic en él

Se abrirá un diálogo pidiendo:
- Google Client ID
- Google Client Secret
```

### 4.4 Obtener credenciales de Google
**YA TIENES ESTO DESDE ANTES, así que:**

1. Ve a: https://console.cloud.google.com
2. En el menu izquierdo: "Credenciales"
3. Busca tu "OAuth 2.0 Client ID"
4. Haz clic en él
5. Copia:
   - **Client ID:** (cópialo)
   - **Client Secret:** (cópialo)

### 4.5 Pegar en Auth0
```
En el diálogo de Google en Auth0:

Client ID (Google): [PEGA_AQUI]
Client Secret (Google): [PEGA_AQUI]

Haz clic: "Save"
```

### 4.6 Verificar que Google está conectado
```
MENÚ IZQUIERDO:
Applications → HERO Game

Pestaña: "Connections"

Busca: "Google"
Deberías ver: Toggle ACTIVADO (azul)

Si NO está activado:
Haz clic en el toggle para activarlo
```

---

## PASO 5: CONFIGURAR CALLBACK URLs

### 5.1 Ir a Settings de tu app
```
MENÚ IZQUIERDO:
Applications → HERO Game

Pestaña: "Settings"
```

### 5.2 Buscar "Allowed Callback URLs"
```
En la página Settings, busca:
"Allowed Callback URLs"

Es un texto box grande
```

### 5.3 Copiar y pegar estos URLs
```
COPIA ESTO EXACTO (una línea por línea):

https://newhero.netlify.app/callback
https://newhero.netlify.app/auth0-callback.html
http://localhost:3000/callback
http://localhost:5173/callback
com.new.h.e.r.o.game://callback
```

### 5.4 Guardarlo
```
Haz scroll hacia abajo
Deberías ver un botón: "Save Changes"
Haz clic en él
```

---

## PASO 6: CONFIGURAR OTROS URLs

### 6.1 "Allowed Logout URLs"
```
Busca en la misma página:
"Allowed Logout URLs"

COPIA Y PEGA:
https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
```

### 6.2 "Allowed Web Origins"
```
Busca:
"Allowed Web Origins"

COPIA Y PEGA:
https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
```

### 6.3 "Cross-Origin Resource Sharing (CORS)"
```
Busca:
"CORS Allowed Origins"

COPIA Y PEGA:
https://newhero.netlify.app
http://localhost:3000
http://localhost:5173
```

### 6.4 GUARDA TODO
```
Scroll hacia abajo
Botón: "Save Changes"
Haz clic
```

---

## PASO 7: CREAR ARCHIVO auth0-config.json

### 7.1 Abrir proyecto en tu editor

En **Visual Studio Code**:
```
Abre la carpeta: d:\repos\hero
```

### 7.2 Crear nuevo archivo
```
Click derecho en la carpeta "src/"
Selecciona: "New File"
Nombre: auth0-config.json
```

### 7.3 Copiar contenido
```
COPIA ESTO EXACTO:

{
  "domain": "TU_DOMAIN.auth0.com",
  "clientId": "TU_CLIENT_ID",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.new.h.e.r.o.game://callback"
}
```

### 7.4 REEMPLAZAR TUS DATOS
```
BUSCA ESTO:
"domain": "TU_DOMAIN.auth0.com"

REEMPLAZA TU_DOMAIN CON:
El domain que copiaste en PASO 3
Ejemplo: "ejemplo123.auth0.com"

RESULTADO:
"domain": "ejemplo123.auth0.com"

═══════════════════════════════════════

BUSCA ESTO:
"clientId": "TU_CLIENT_ID"

REEMPLAZA TU_CLIENT_ID CON:
El Client ID que copiaste en PASO 3
Ejemplo: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

RESULTADO:
"clientId": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

### 7.5 Guardar archivo
```
Ctrl + S (en Windows)
```

---

## ✅ VERIFICACIÓN FINAL

Después de completar todos los pasos, deberías tener:

```
☑ Cuenta en Auth0 creada
☑ Aplicación SPA "HERO Game" creada
☑ Domain copiado: _________________________
☑ Client ID copiado: _________________________
☑ Google conectado en Auth0
☑ Callback URLs configuradas:
  ☑ https://newhero.netlify.app/callback
  ☑ https://newhero.netlify.app/auth0-callback.html
  ☑ http://localhost:5173/callback
  ☑ com.new.h.e.r.o.game://callback
☑ Logout URLs configuradas
☑ Web Origins configuradas
☑ CORS Origins configuradas
☑ Archivo auth0-config.json creado en src/
☑ auth0-config.json tiene tus datos reales
```

---

## 🆘 SI ALGO SALE MAL

### Error: "No se puede conectar Google"
```
Solución:
1. Verifica que tienes Google Client ID y Secret correctos
2. Verifica que son del proyecto correcto en Google Cloud
3. Intenta copiar/pegar de nuevo (sin espacios)
```

### Error: "Redirect URI mismatch"
```
Solución:
1. Verifica que los URLs están exactos (sin typos)
2. Mayúsculas/minúsculas importan
3. No pueden haber espacios al inicio o final
4. Haz scroll y busca la sección exacta (no confundas con otras)
```

### Error: "Domain not found"
```
Solución:
1. Verifica que el domain es: xxxxx.auth0.com
2. No es solo: xxxxx
3. Copia el domain completo de Settings
```

### Error: "Archivo auth0-config.json no se crea"
```
Solución:
1. Verifica que lo creaste en la carpeta: src/
2. NO en: src/scripts/ 
3. Nombre correcto: auth0-config.json (sin espacios)
4. Verifica que se guardó (aparece en el árbol de archivos)
```

---

## 📞 CHECKLIST PARA COMUNICARME

Cuando hayas completado TODO, avísame con:

```
✅ Cuenta Auth0 creada: SÍ / NO
✅ App SPA creada: SÍ / NO
✅ Domain: _______________________________
✅ Client ID: _______________________________
✅ Google conectado: SÍ / NO
✅ Callbacks configuradas: SÍ / NO
✅ auth0-config.json creado: SÍ / NO

Pega aquí el contenido exacto de tu auth0-config.json:
{
  "domain": "________________",
  "clientId": "________________",
  "audience": "https://hero-game.com/api",
  "redirectUri": "https://newhero.netlify.app/callback",
  "redirectUriMobile": "com.new.h.e.r.o.game://callback"
}
```

---

## 🚀 CUANDO TERMINES

Una vez que hayas completado TODO esto y me avises:

```
YO HARÉ:
✅ Actualizar index.html
✅ Actualizar ui.ts
✅ Compilar
✅ Sincronizar Capacitor

Y LISTO: Tu app migrará a Auth0 🎉
```

---

**¿Algún paso no entiendes? Pregunta específicamente cuál.** 👍

