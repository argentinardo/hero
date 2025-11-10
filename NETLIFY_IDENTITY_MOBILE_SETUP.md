# Configuración de Netlify Identity para App Móvil

Este documento explica cómo configurar Netlify Identity para que funcione correctamente con la autenticación de Google en la app móvil (APK).

## Problema

Cuando te logueas en la APK a través de Google, Netlify Identity redirige al navegador web (`newhero.netlify.app`) en lugar de regresar a la app móvil.

## Solución Implementada

Se ha implementado un sistema de callback personalizado que:

1. Detecta si la autenticación viene de la app móvil
2. Usa un callback personalizado (`auth-callback.html`) que redirige usando un esquema personalizado (`hero://`)
3. La app móvil captura el deep link y completa la autenticación

## Configuración en Netlify Identity

### ⚠️ IMPORTANTE: No necesitas cambiar nada en Netlify Identity

Netlify Identity usa su callback estándar (`/.netlify/identity/callback`) y procesa el token automáticamente. El código implementado detecta cuando la autenticación viene de la app móvil y configura el `redirectUrl` para que Netlify Identity redirija a `auth-callback.html` después de procesar el token.

### 1. Configurar en Google Cloud Console (OPCIONAL - Solo si quieres usar el callback personalizado directamente)

**NOTA**: Normalmente NO necesitas hacer esto, ya que el código maneja la redirección automáticamente. Solo hazlo si quieres que Google redirija directamente a `auth-callback.html` en lugar de pasar por el callback de Netlify Identity.

Si decides hacerlo:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Busca tu OAuth 2.0 Client ID (el que usas para Netlify Identity)
5. Haz clic en **Edit**
6. En **Authorized redirect URIs**, **ADEMÁS** de la URI existente (`https://newhero.netlify.app/.netlify/identity/callback`), agrega:

```
https://newhero.netlify.app/auth-callback.html
```

7. Haz clic en **Save**

**IMPORTANTE**: Debes mantener AMBAS URIs:
- `https://newhero.netlify.app/.netlify/identity/callback` (para web)
- `https://newhero.netlify.app/auth-callback.html` (para app móvil)

### 3. Verificar la Configuración

Después de configurar:

1. **En la app móvil**: Cuando inicies sesión con Google, deberías ser redirigido de vuelta a la app en lugar de quedarte en el navegador web.

2. **En el navegador web**: La autenticación seguirá funcionando normalmente usando el callback estándar de Netlify Identity.

## Cómo Funciona

1. **Usuario inicia sesión en la app móvil**:
   - Netlify Identity detecta que está en la app móvil (Capacitor)
   - Configura el `redirectUrl` a `/auth-callback.html`

2. **Google autentica al usuario**:
   - Google redirige a `https://newhero.netlify.app/auth-callback.html?access_token=...`

3. **Callback personalizado procesa la autenticación**:
   - `auth-callback.html` detecta que viene de la app móvil
   - Extrae el token de la URL
   - Redirige usando el esquema personalizado: `hero://auth-callback?access_token=...`

4. **App móvil captura el deep link**:
   - Android captura el deep link `hero://`
   - La app procesa el token y completa la autenticación
   - El usuario queda logueado en la app

## Archivos Modificados

- `src/auth-callback.html`: Página de callback personalizada
- `src/index.html`: Configuración de Netlify Identity para usar callback personalizado en app móvil
- `src/scripts/components/ui.ts`: Manejo de deep links de autenticación
- `android/app/src/main/AndroidManifest.xml`: Registro del esquema personalizado `hero://`
- `capacitor.config.json`: Configuración de deep links
- `webpack.config.js`: Copia de `auth-callback.html` al dist

## Notas Importantes

- El callback personalizado solo se usa en la app móvil (Capacitor)
- En el navegador web, Netlify Identity usa su callback estándar
- El esquema personalizado `hero://` está registrado en Android para capturar deep links
- La app móvil escucha eventos de deep links usando el plugin `App` de Capacitor

## Troubleshooting

### El usuario sigue siendo redirigido al navegador web

1. Verifica que el redirect URI en Netlify Identity sea exactamente `https://newhero.netlify.app/auth-callback.html`
2. Verifica que el redirect URI en Google Cloud Console sea el mismo
3. Asegúrate de que `auth-callback.html` esté en el directorio `dist/` después de construir
4. Verifica que el AndroidManifest.xml tenga el intent filter para `hero://`

### La autenticación no se completa en la app

1. Verifica los logs de la consola en la app móvil
2. Asegúrate de que el plugin `App` de Capacitor esté instalado
3. Verifica que el deep link se esté capturando correctamente

### Error: "No se recibió el token de autenticación"

1. Verifica que Google esté redirigiendo correctamente a `auth-callback.html`
2. Verifica que el token esté en los parámetros de la URL
3. Revisa los logs del navegador cuando se abre `auth-callback.html`

