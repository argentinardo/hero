# Desarrollo en Localhost - Guía Completa

## Problema Resuelto 🔧

Anteriormente, cuando intentabas conectarte a la app desde **localhost**, recibías un error indicando que la URL de Netlify Identity no podía ser determinada, y el sistema te pedía manualmente la URL de Netlify.

## Solución Implementada ✅

Ahora la aplicación detecta automáticamente si está corriendo en **localhost** y configura correctamente:

1. **Netlify Identity URL**: Usa la URL de producción (`https://newhero.netlify.app/.netlify/identity`) para autenticarse
2. **URLs de Funciones Netlify**: Usa la URL de producción (`https://newhero.netlify.app`) para guardar y cargar niveles

## Cómo Funciona

### 1. Detección Automática de Entorno (`src/index.html`)

El script al cargar la página detecta:
- ¿Estamos en **Netlify** (dominio `.netlify.app` o `.netlify.live`)?
  - ✅ Usa la URL del sitio actual
- ¿Estamos en **localhost** o **127.0.0.1**?
  - ✅ Usa `https://newhero.netlify.app` (producción)
- ¿Estamos en otro dominio?
  - ✅ Usa `https://newhero.netlify.app` (producción)

```javascript
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isNetlifyHost = /\.netlify\.(app|live)$/i.test(window.location.host);

if (isNetlifyHost) {
    identityUrl = window.location.origin + '/.netlify/identity';
} else if (isDevelopment) {
    identityUrl = 'https://newhero.netlify.app/.netlify/identity';
}
```

### 2. Configuración de URLs de Funciones (`src/scripts/utils/device.ts`)

La función `getNetlifyBaseUrl()` ahora devuelve:
- En **Netlify**: `window.location.origin`
- En **localhost**: `https://newhero.netlify.app` ✅
- En otros entornos: `''` (URL relativa)

### 3. Permiso en Funciones Serverless (`netlify/functions/levels.js`)

Las funciones ya permiten peticiones desde:
- `https://newhero.netlify.app`
- `http://localhost`
- `http://localhost:8080`
- `http://localhost:5173`
- `capacitor://localhost`
- `ionic://localhost`

## Para Usar en Desarrollo

### 1. Instalar dependencias
```bash
npm install
# o
pnpm install
```

### 2. Ejecutar servidor de desarrollo
```bash
npm run dev
# o
pnpm dev
```

### 3. Abrir en navegador
```
http://localhost:5173
```

### 4. Iniciar sesión
- Haz clic en "Iniciar Sesión" o "Crear Cuenta"
- La app **automáticamente** detectará localhost y usará las credenciales de Netlify Identity
- No verás ningún modal pidiendo la URL de Netlify ✅

### 5. Guardar niveles
- Los niveles se guardarán directamente en la base de datos de Netlify
- Las llamadas se harán a `https://newhero.netlify.app/.netlify/functions/levels`
- Todo funciona transparentemente sin que debas hacer nada especial ✅

## Información Técnica

### Cambios Realizados

1. **`src/index.html`**
   - Agregado meta tag dinámico `netlify-identity-meta` (antes hardcodeado)
   - Script de inicialización detecta ambiente automáticamente
   - Actualiza URLs según dónde se está ejecutando la app

2. **`src/scripts/utils/device.ts`**
   - Función `getNetlifyBaseUrl()` ahora maneja localhost
   - Usa URL de producción para funciones serverless en desarrollo

3. **`netlify/functions/levels.js`**
   - Ya tenía soporte para CORS desde localhost
   - Valida automáticamente tokens de Netlify Identity

### CORS Headers

Las funciones de Netlify devuelven headers CORS apropiados:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Troubleshooting

### "Error: No pude conectarme"
- Asegúrate de que `https://newhero.netlify.app` está accesible
- Verifica que tu firewall no está bloqueando peticiones CORS
- Abre la consola del navegador (F12) y busca errores de CORS

### "El nivel no se guarda"
- Verifica que estés autenticado (debería haber un user en la esquina)
- Revisa la consola (F12 → Network) para ver las peticiones a `https://newhero.netlify.app/.netlify/functions/levels`
- Asegúrate que tienes un token válido de Netlify Identity

### "Veo un modal pidiendo URL de Netlify"
- Esto **no debería ocurrir** más con los cambios realizados
- Si ocurre, intenta limpiar localStorage:
  ```javascript
  localStorage.clear();
  location.reload();
  ```

## Para Desarrollo Futuro

Si necesitas cambiar la URL de Netlify en producción:

1. Busca `newhero.netlify.app` en el código
2. Reemplázalo por tu nueva URL
3. Archivos importantes:
   - `src/index.html` (línea 52)
   - `src/scripts/utils/device.ts` (línea 151)
   - `netlify/functions/levels.js` (línea 21)

## Resumen

✅ **Ya no necesitas hacer nada especial para desarrollar en localhost**
✅ **La app detecta automáticamente tu entorno**
✅ **Los niveles se guardan en la base de datos de Netlify**
✅ **Autenticación funcionando sin problemas**

¡Listo para desarrollar! 🚀


