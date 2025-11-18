# Debug de APK - Ver Logs de Android

## Problema
La APK se abre y se cierra inmediatamente sin mostrar logs visibles.

## Solución Implementada

Se ha agregado manejo robusto de errores que:
1. **Captura TODOS los errores no manejados** (window.error y unhandledrejection)
2. **Muestra errores en pantalla** (útil cuando no puedes ver la consola)
3. **Logs detallados en cada paso** del bootstrap
4. **Stack traces completos** para debugging

## Cómo Ver los Logs en Android

### Opción 1: Android Studio Logcat (Recomendado)

1. Abre Android Studio
2. Conecta tu dispositivo Android o inicia un emulador
3. Ve a la pestaña **Logcat** (abajo de la pantalla)
4. Filtra por:
   - **Package**: `com.newhero.game`
   - **Tag**: `chromium` o `console` (para ver console.log)
   - **Level**: `Error` o `Verbose` (para ver todos los logs)

5. Instala la APK y observa los logs en tiempo real

### Opción 2: ADB desde Terminal

```bash
# Conecta tu dispositivo y ejecuta:
adb logcat | grep -E "(chromium|console|ERROR|Bootstrap|Main)"

# O para ver TODOS los logs de la app:
adb logcat | grep "com.newhero.game"

# O para ver solo errores:
adb logcat *:E | grep "com.newhero.game"
```

### Opción 3: Chrome DevTools (Si la app se abre aunque sea un segundo)

1. Abre Chrome en tu PC
2. Ve a `chrome://inspect`
3. Conecta tu dispositivo Android
4. Deberías ver tu app en la lista
5. Haz clic en "inspect" para ver la consola

### Opción 4: Ver Logs en el Dispositivo

Si la app muestra un error en pantalla (gracias al nuevo código), simplemente toma una captura de pantalla.

## Qué Buscar en los Logs

Busca estos mensajes para identificar dónde falla:

```
[Main] 🚀 Iniciando aplicación...
[Bootstrap] 🚀 Iniciando bootstrap...
[Bootstrap] Paso 1: Inicializando Auth0...
[Bootstrap] Paso 2: Inicializando StatusBar...
[Bootstrap] Paso 3: Configurando viewport...
[Bootstrap] Paso 5: Configurando UI...
[Bootstrap] Paso 6: Inicializando audio...
[Bootstrap] Paso 9: Mostrando menú...
[Bootstrap] Paso 10: Cargando assets críticos...
```

Si ves un error, buscarás algo como:

```
❌ ERROR GLOBAL NO CAPTURADO
❌ ERROR CRÍTICO en [nombre del paso]
❌❌❌ ERROR FATAL EN BOOTSTRAP ❌❌❌
```

## Errores Comunes y Soluciones

### Error: "Cannot find module" o "Module not found"
- **Causa**: Un módulo no se está cargando correctamente
- **Solución**: Verifica que todos los imports estén correctos

### Error: "Cannot read property X of undefined"
- **Causa**: Un objeto no está inicializado cuando se intenta usar
- **Solución**: Revisa el orden de inicialización en bootstrap()

### Error: "Network request failed" o "Failed to fetch"
- **Causa**: Problema de red o CORS
- **Solución**: Verifica la configuración de Capacitor y las URLs

### Error: "StatusBar is not defined"
- **Causa**: El plugin de StatusBar no está instalado o no está disponible
- **Solución**: Verifica que @capacitor/status-bar esté instalado

## Próximos Pasos

1. **Compila la nueva versión** con los cambios de manejo de errores
2. **Instala la APK** en tu dispositivo
3. **Abre los logs** usando una de las opciones arriba
4. **Ejecuta la app** y observa los logs
5. **Comparte los logs** que aparezcan, especialmente cualquier línea que contenga "ERROR" o "❌"

## Comandos Útiles

```bash
# Limpiar logs anteriores
adb logcat -c

# Ver logs en tiempo real con filtro
adb logcat -s chromium:V console:V *:E

# Guardar logs a un archivo
adb logcat > android_logs.txt

# Ver solo errores de JavaScript
adb logcat | grep -i "javascript\|error\|exception"
```

## Notas

- Los logs ahora incluyen **stack traces completos** para facilitar el debugging
- Los errores también se muestran **en pantalla** si la app puede renderizar
- Cada paso del bootstrap tiene su propio log para identificar exactamente dónde falla

