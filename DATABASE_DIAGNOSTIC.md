# Diagnóstico de Conexión a Base de Datos

## Función de Prueba Creada

He creado una función de prueba `test-db.js` que puedes usar para verificar la conexión a la base de datos.

### Cómo usar:

1. **Desplegar la función:**
   ```bash
   git add netlify/functions/test-db.js
   git commit -m "Add database test function"
   git push
   ```

2. **Probar la conexión:**
   - Abre en el navegador: `https://newhero.netlify.app/.netlify/functions/test-db`
   - O desde la consola del navegador:
     ```javascript
     fetch('https://newhero.netlify.app/.netlify/functions/test-db')
       .then(r => r.json())
       .then(console.log)
     ```

3. **Revisar los logs:**
   - Ve a Netlify Dashboard → Functions → test-db
   - Revisa los logs para ver qué está pasando

## Verificaciones Agregadas

### 1. Verificación de Variable de Entorno
- Todas las funciones ahora verifican si `NETLIFY_DATABASE_URL` está presente
- Si no está, devuelven un error claro

### 2. Logging Detallado
- Logs antes de inicializar la conexión
- Logs después de inicializar exitosamente
- Logs antes y después de cada query
- Logs de errores con detalles completos

### 3. Manejo de Errores Mejorado
- Errores de conexión se capturan y reportan claramente
- Errores de queries incluyen código de error de PostgreSQL
- Stack traces completos para debugging

## Posibles Problemas y Soluciones

### Problema 1: NETLIFY_DATABASE_URL no configurada

**Síntoma:** Error "Database not configured: NETLIFY_DATABASE_URL environment variable is missing"

**Solución:**
1. Ve a Netlify Dashboard → Site settings → Environment variables
2. Verifica que `NETLIFY_DATABASE_URL` esté configurada
3. Si no está, agrega la variable con la URL de conexión de Neon

### Problema 2: URL de conexión incorrecta

**Síntoma:** Error de conexión al inicializar `neon()`

**Solución:**
1. Verifica que la URL de Neon sea correcta
2. Formato esperado: `postgresql://user:password@host:port/database?sslmode=require`
3. Asegúrate de que la base de datos esté activa en Neon

### Problema 3: Permisos de la base de datos

**Síntoma:** Error al crear tablas o hacer queries

**Solución:**
1. Verifica que el usuario de la base de datos tenga permisos para crear tablas
2. Verifica que la base de datos exista en Neon

### Problema 4: Timeout de conexión

**Síntoma:** La función se queda colgada o timeout

**Solución:**
1. Verifica que la base de datos de Neon esté activa (no en pausa)
2. Verifica la configuración de red/firewall en Neon

## Pasos de Diagnóstico

1. **Probar la función test-db:**
   - Debería devolver información de la base de datos
   - Si falla, revisa los logs en Netlify

2. **Revisar logs de las funciones:**
   - Ve a Netlify Dashboard → Functions
   - Revisa los logs de `profile` y `levels`
   - Busca mensajes de error específicos

3. **Verificar variables de entorno:**
   - En Netlify Dashboard → Site settings → Environment variables
   - Verifica que `NETLIFY_DATABASE_URL` esté presente
   - Verifica que el valor sea correcto

4. **Verificar la base de datos en Neon:**
   - Ve a tu dashboard de Neon
   - Verifica que la base de datos esté activa
   - Verifica que puedas conectarte manualmente

## Logs Esperados

Cuando todo funciona correctamente, deberías ver en los logs:

```
NETLIFY_DATABASE_URL presente: true
Inicializando conexión a la base de datos...
Conexión a la base de datos inicializada exitosamente
Asegurando tabla users...
Tabla users verificada/creada exitosamente
Ejecutando query GET para usuario: ...
Query GET exitosa, perfil obtenido: Sí
```

Si ves errores, los logs mostrarán exactamente dónde falla.

