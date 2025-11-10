# Cómo Vaciar la Base de Datos

Este documento explica cómo vaciar completamente todas las tablas de la base de datos Neon, dejando las tablas vacías pero manteniendo su estructura.

## ⚠️ ADVERTENCIA

Esta operación **ELIMINA TODOS LOS DATOS** de todas las tablas:
- `users` - Todos los usuarios
- `user_campaigns` - Todas las campañas
- `levels` - Todos los niveles personalizados
- `gallery_levels` - Todos los niveles de la galería
- `level_likes` - Todos los likes/votos
- `user_implemented_levels` - Todas las implementaciones

**Esta acción NO se puede deshacer.** Asegúrate de tener un backup si necesitas los datos.

## Configuración

### 1. Configurar la Clave de Administración

1. Ve a tu sitio en [Netlify Dashboard](https://app.netlify.com/)
2. Selecciona tu sitio: **newhero** (o el nombre de tu sitio)
3. Ve a **Site configuration** → **Environment variables**
4. Agrega una nueva variable de entorno:
   - **Key**: `ADMIN_SECRET`
   - **Value**: Una clave secreta segura (ej: `mi-clave-super-secreta-2024`)
5. Haz clic en **Save**

### 2. Desplegar la Función

La función `admin-clear-db.js` ya está en el repositorio. Solo necesitas desplegar:

```bash
git add netlify/functions/admin-clear-db.js
git commit -m "Agregar función para vaciar base de datos"
git push
```

Netlify desplegará automáticamente la función.

## Uso

### Opción 1: Usando curl (Terminal)

```bash
curl -X POST https://newhero.netlify.app/.netlify/functions/admin-clear-db \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: tu-clave-secreta-aqui" \
  -d '{}'
```

### Opción 2: Usando JavaScript/Fetch

```javascript
const response = await fetch('https://newhero.netlify.app/.netlify/functions/admin-clear-db', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Admin-Secret': 'tu-clave-secreta-aqui'
  },
  body: JSON.stringify({})
});

const result = await response.json();
console.log(result);
```

### Opción 3: Usando Postman o similar

1. Método: **POST**
2. URL: `https://newhero.netlify.app/.netlify/functions/admin-clear-db`
3. Headers:
   - `Content-Type`: `application/json`
   - `X-Admin-Secret`: `tu-clave-secreta-aqui`
4. Body: `{}` (vacío o cualquier JSON)

## Respuesta Exitosa

Si la operación es exitosa, recibirás una respuesta como esta:

```json
{
  "ok": true,
  "message": "Base de datos vaciada exitosamente",
  "summary": {
    "totalDeleted": 150,
    "tablesProcessed": 6,
    "successCount": 6,
    "failCount": 0
  },
  "details": [
    {
      "table": "level_likes",
      "deleted": 45,
      "success": true,
      "method": "TRUNCATE"
    },
    {
      "table": "user_implemented_levels",
      "deleted": 12,
      "success": true,
      "method": "TRUNCATE"
    },
    {
      "table": "gallery_levels",
      "deleted": 30,
      "success": true,
      "method": "TRUNCATE"
    },
    {
      "table": "user_campaigns",
      "deleted": 25,
      "success": true,
      "method": "TRUNCATE"
    },
    {
      "table": "levels",
      "deleted": 20,
      "success": true,
      "method": "TRUNCATE"
    },
    {
      "table": "users",
      "deleted": 18,
      "success": true,
      "method": "TRUNCATE"
    }
  ]
}
```

## Errores Comunes

### Error 401: Unauthorized

**Causa**: La clave de administración no coincide o no está configurada.

**Solución**: 
1. Verifica que la variable de entorno `ADMIN_SECRET` esté configurada en Netlify
2. Verifica que estés usando la misma clave en el header `X-Admin-Secret`
3. Si acabas de agregar la variable, espera unos minutos y vuelve a intentar (puede tardar en propagarse)

### Error 500: Error vaciando la base de datos

**Causa**: Error de conexión a la base de datos o problema con las tablas.

**Solución**:
1. Verifica que `NETLIFY_DATABASE_URL` esté configurada en Netlify
2. Revisa los logs de la función en Netlify Dashboard → Functions → admin-clear-db → Logs

## ⚠️ IMPORTANTE: Limpiar también localStorage

**Las campañas también se guardan en `localStorage` del navegador.** Después de vaciar la base de datos, también necesitas limpiar el `localStorage`:

### Opción 1: Desde la consola del navegador

1. Abre la consola del navegador (F12)
2. Copia y pega este código:

```javascript
// Limpiar localStorage
const keysToRemove = [
  'hero_campaigns',        // Campañas guardadas
  'userLevels',            // Niveles del usuario
  'isLoggedIn',            // Estado de login
  'username',              // Nombre de usuario
  'userEmail',             // Email del usuario
  'nickname',              // Nickname
  'avatar',                // Avatar
];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Eliminado: ${key}`);
  }
});

console.log('✅ localStorage limpiado. Recarga la página.');
```

3. Presiona Enter
4. Recarga la página (F5)

### Opción 2: Limpiar todo el localStorage

Si quieres limpiar TODO el localStorage (más agresivo):

```javascript
localStorage.clear();
console.log('✅ Todo el localStorage ha sido limpiado. Recarga la página.');
location.reload();
```

## Verificación

Después de vaciar la base de datos Y localStorage, puedes verificar:

1. **Base de datos**: Conecta a tu base de datos Neon directamente y ejecuta:
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM user_campaigns;
   SELECT COUNT(*) FROM levels;
   SELECT COUNT(*) FROM gallery_levels;
   SELECT COUNT(*) FROM level_likes;
   SELECT COUNT(*) FROM user_implemented_levels;
   ```
   Todos deberían devolver `0`.

2. **localStorage**: En la consola del navegador, ejecuta:
   ```javascript
   console.log('Campañas:', localStorage.getItem('hero_campaigns'));
   console.log('Usuario logueado:', localStorage.getItem('isLoggedIn'));
   ```
   Ambos deberían devolver `null`.

## Seguridad

- **NUNCA** compartas tu `ADMIN_SECRET` públicamente
- **NUNCA** la incluyas en el código fuente
- Usa una clave fuerte y única
- Considera rotar la clave periódicamente

## Notas

- Las tablas se mantienen intactas (estructura, índices, constraints)
- Solo se eliminan los datos (registros)
- El orden de eliminación respeta las foreign keys
- Si una tabla no existe, se omite sin error

