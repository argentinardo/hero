# Solución: Error de CORS en APK - Auth0

## Problema
La APK está usando `https://localhost` como origen, pero Auth0 no lo tiene en su lista de orígenes permitidos, causando errores de CORS.

## Error que ves:
```
Access to fetch at 'https://dev-xgqa1ebceww6f4x6.us.auth0.com/oauth/token' 
from origin 'https://localhost' has been blocked by CORS policy
```

## Solución: Agregar `https://localhost` a Auth0

### Paso 1: Ir al Dashboard de Auth0
1. Ve a https://manage.auth0.com
2. Inicia sesión
3. Selecciona tu tenant: `dev-xgqa1ebceww6f4x6`

### Paso 2: Configurar la Aplicación
1. Ve a **Applications** → **HERO Game** (o el nombre de tu aplicación)
2. Haz clic en **Settings**

### Paso 3: Agregar `https://localhost` a las URLs Permitidas

#### En "Allowed Callback URLs" (agregar al final, una por línea):
```
https://newhero.netlify.app/auth0-callback.html
http://localhost:8080/auth0-callback.html
com.newhero.game://dev-xgqa1ebceww6f4x6.us.auth0.com/capacitor/com.newhero.game/callback
https://localhost
https://localhost/
```

#### En "Allowed Logout URLs" (agregar al final):
```
https://newhero.netlify.app
http://localhost:8080
https://localhost
https://localhost/
```

#### En "Allowed Web Origins" (agregar al final):
```
https://newhero.netlify.app
http://localhost:8080
http://localhost:5173
https://localhost
https://localhost/
```

#### En "Cross-Origin Resource Sharing (CORS)" (agregar al final):
```
https://newhero.netlify.app
http://localhost:8080
http://localhost:5173
https://localhost
https://localhost/
```

### Paso 4: Guardar Cambios
1. **IMPORTANTE**: Haz clic en **"Save Changes"** al final de la página
2. Espera unos segundos para que los cambios se propaguen

### Paso 5: Probar la APK
1. Reinstala la APK en tu dispositivo
2. Intenta hacer login con Google
3. El error de CORS debería desaparecer

## Nota Importante
- Los cambios en Auth0 pueden tardar unos segundos en propagarse
- Si el error persiste, espera 1-2 minutos y vuelve a intentar
- Asegúrate de que todas las URLs estén exactamente como se muestra arriba (con y sin trailing slash)

## URLs Finales Completas

Después de agregar todo, tus URLs deberían verse así:

**Allowed Callback URLs:**
```
https://newhero.netlify.app/auth0-callback.html
http://localhost:8080/auth0-callback.html
com.newhero.game://dev-xgqa1ebceww6f4x6.us.auth0.com/capacitor/com.newhero.game/callback
https://localhost
https://localhost/
```

**Allowed Web Origins:**
```
https://newhero.netlify.app
http://localhost:8080
http://localhost:5173
https://localhost
https://localhost/
```

**Allowed Logout URLs:**
```
https://newhero.netlify.app
http://localhost:8080
https://localhost
https://localhost/
```

**CORS:**
```
https://newhero.netlify.app
http://localhost:8080
http://localhost:5173
https://localhost
https://localhost/
```

