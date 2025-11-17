# Solución a Errores de Deep Links de Auth0

## Errores Identificados

### Error 1: "Failed to launch 'com.newhero.game://callback?...' because the scheme does not have a registered handler"

**Causa:**
- El `auth0-callback.html` se carga en el Browser de Capacitor (un WebView del navegador Chrome)
- Cuando intenta redirigir a `com.newhero.game://callback`, el navegador no puede manejar ese scheme porque solo está registrado en la app Android, no en el navegador
- El navegador no sabe qué hacer con un scheme personalizado que no está registrado en el sistema del navegador

**Solución Aplicada:**
1. **Android Intent URLs**: Se cambió a usar Android Intent URLs que el navegador Chrome puede manejar
   - Formato: `intent://callback?code=...&state=...#Intent;scheme=com.newhero.game;package=com.newhero.game;end`
   - El navegador Chrome reconoce este formato y puede abrir la app nativa
2. **Fallback a deep link directo**: Si el Intent URL falla, se intenta el deep link directo
3. **AndroidManifest.xml actualizado**: Se aseguró que todos los intent-filters usen el scheme correcto `com.newhero.game`
4. **Package name corregido**: Se cambió de `com.new.h.e.r.o.game` a `com.newhero.game` porque `new` es una palabra reservada de Java

### Error 2: "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received"

**Causa:**
- Este error ocurre cuando un listener de mensajes (como los de Capacitor o extensiones de Chrome) retorna `true` para indicar que responderá asíncronamente
- El canal de mensajes se cierra antes de que se envíe la respuesta
- En el contexto de `auth0-callback.html`, esto puede ocurrir cuando:
  - Se intenta redirigir usando `window.location.href` en un WebView
  - El contexto del WebView se pierde durante la redirección
  - Hay listeners de mensajes que no se limpian correctamente

**Solución Aplicada:**
1. Se cambió de `window.location.href` a `window.location.replace()` como método principal
   - `replace()` es más seguro porque no agrega una entrada al historial
   - Evita problemas con el historial del navegador en WebViews
2. Se agregó manejo de errores con try-catch
3. Se agregó un fallback a `window.location.href` si `replace()` falla
4. Se agregó un último recurso usando `window.open()` si ambos fallan

## Cambios Realizados

### 1. AndroidManifest.xml

Se agregó un intent-filter específico para `com.newhero.game://callback`:

```xml
<!-- Deep link para callback directo (com.newhero.game://callback) -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data 
        android:scheme="com.newhero.game"
        android:host="callback" />
</intent-filter>
```

### 2. auth0-callback.html

Se cambió a usar Android Intent URLs que el navegador puede manejar:

```javascript
// Construir el deep link
const deepLinkUrl = 'com.newhero.game://callback?code=...&state=...';

// Construir el Intent URL (funciona desde el navegador)
const intentUrl = 'intent://callback?code=...&state=...' +
    '#Intent;scheme=com.newhero.game;package=com.newhero.game;end';

try {
    // Intentar usar Android Intent URL primero (funciona desde navegador)
    window.location.href = intentUrl;
} catch (e) {
    // Fallback: intentar deep link directo
    window.location.replace(deepLinkUrl);
    // ... más fallbacks
}
```

**Por qué funciona:**
- El navegador Chrome en Android reconoce el formato `intent://` y puede abrir apps nativas
- El Intent URL especifica el scheme y el package de la app
- Si la app está instalada, Android la abre automáticamente

## Pasos para Aplicar los Cambios

1. **Reconstruir la app Android:**
   ```bash
   npm run build
   npx cap sync android
   ```

2. **Reinstalar la app en el dispositivo:**
   - Desinstala la app actual completamente
   - Reinstala la nueva versión
   - Esto asegura que los nuevos intent-filters se registren correctamente

3. **Verificar que los deep links funcionen:**
   - Abre la app
   - Intenta iniciar sesión con Auth0
   - Verifica que el callback se procese correctamente

## Verificación

Para verificar que los cambios funcionan:

1. **Verificar AndroidManifest.xml:**
   - Asegúrate de que los tres intent-filters estén presentes
   - Verifica que el intent-filter para `callback` tenga `android:host="callback"`

2. **Verificar auth0-callback.html:**
   - Revisa los logs en la consola cuando se ejecuta el callback
   - Verifica que no haya errores de redirección

3. **Probar el flujo completo:**
   - Inicia sesión desde la app móvil
   - Verifica que el callback se procese sin errores
   - Confirma que el usuario quede autenticado

## Notas Importantes

- **Reinstalación requerida:** Los cambios en `AndroidManifest.xml` requieren una reinstalación completa de la app para que surtan efecto
- **Orden de intent-filters:** Android evalúa los intent-filters en orden, por lo que los más específicos deben ir primero
- **Manejo de errores:** El código ahora tiene múltiples niveles de fallback para asegurar que la redirección siempre funcione

## Troubleshooting

Si los errores persisten:

1. **Verifica que la app esté completamente desinstalada antes de reinstalar**
2. **Revisa los logs de Android Studio** para ver si hay errores de registro de intent-filters
3. **Verifica que el scheme `com.newhero.game` no esté siendo usado por otra app**
4. **Prueba el deep link manualmente usando `adb`:**
   ```bash
   adb shell am start -a android.intent.action.VIEW -d "com.newhero.game://callback?code=test&state=test"
   ```

