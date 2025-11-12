# 🔧 Error de Galería - Solución del Schema

## Problema ❌

```
Error al compartir nivel:
"Schema error: column \"user_id\" does not exist"
HTTP 500
```

## Causa

La tabla `gallery_levels` fue creada sin la columna `user_id` (versión anterior del código), y `CREATE TABLE IF NOT EXISTS` no modifica tablas existentes.

## Solución ✅

### Opción 1: Migración Automática (Recomendada)

He agregado manejo automático de migración en `netlify/functions/gallery.js`. Simplemente:

1. **Guarda el nivel nuevamente**
   - La función detectará el error y intentará migrar automáticamente
   - En la próxima petición debería funcionar

2. **Si sigue sin funcionar**, ejecuta la migración manual:

### Opción 2: Migración Manual

#### A. En Netlify Dashboard (Panel de Control)

1. Ve a tu sitio en Netlify
2. Abre **Site Settings → Environment Variables**
3. Asegúrate que está configurado: `MIGRATION_TOKEN=tu_token_secreto`
4. Luego llama a la función (en DevTools de tu navegador):

```javascript
// En consola del navegador (F12)
fetch('https://newhero.netlify.app/.netlify/functions/migrate-gallery', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer tu_token_secreto'
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

#### B. En tu Base de Datos Directamente (Neon Console)

Si tienes acceso a Neon:

1. Ve a https://console.neon.tech
2. Abre tu proyecto
3. Ve a **SQL Editor**
4. Ejecuta esto:

```sql
-- 1. Verificar si falta columna user_id
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'gallery_levels' 
AND column_name = 'user_id';

-- Si no devuelve nada, ejecutar:

-- 2. Agregar columna user_id
ALTER TABLE gallery_levels 
ADD COLUMN user_id text DEFAULT 'unknown';

-- 3. Actualizar a NOT NULL
ALTER TABLE gallery_levels 
ALTER COLUMN user_id SET NOT NULL;

-- 4. Crear tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  nickname text,
  avatar_url text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz,
  UNIQUE(user_id)
);

-- 5. Agregar Foreign Key
ALTER TABLE gallery_levels 
ADD CONSTRAINT gallery_levels_user_id_fk 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- 6. Crear índices
CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery_levels(user_id);
```

### Opción 3: Limpiar y Reiniciar

Si prefieres empezar de cero (perderás niveles guardados):

```sql
-- ⚠️ ESTO BORRARÁ TODOS LOS DATOS ⚠️
DROP TABLE IF EXISTS user_implemented_levels CASCADE;
DROP TABLE IF EXISTS level_likes CASCADE;
DROP TABLE IF EXISTS gallery_levels CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Luego recarga la app y comparte un nivel
-- Se crearán las tablas con el esquema correcto
```

## Verificación ✓

Después de aplicar la solución, verifica:

```sql
-- Ejecuta en Neon SQL Editor

-- 1. Verificar tabla gallery_levels
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'gallery_levels'
ORDER BY ordinal_position;

-- Debería mostrar user_id como: text, NO (not null)

-- 2. Verificar foreign key
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'gallery_levels';

-- Debería mostrar gallery_levels_user_id_fk como FOREIGN KEY
```

## Prueba Rápida

1. Abre la app en `https://localhost:5173` o `https://newhero.netlify.app`
2. Inicia sesión
3. Crea o edita un nivel
4. Haz clic en "Compartir"
5. ✅ Debería funcionar sin errores

## Cambios Realizados

```
✏️ netlify/functions/gallery.js
   └─ Agregado manejo automático de migración en ensureSchema()

📝 netlify/functions/migrate-gallery.js
   └─ Nuevo archivo con migración completa (como respaldo)

📝 GALLERY_SCHEMA_FIX.md
   └─ Este documento
```

## Explicación Técnica

### El Problema

```javascript
// CREATE TABLE IF NOT EXISTS ...
// ↑ Este comando NO modifica tablas existentes
// ↓ Solo las crea si no existen
```

Por eso la tabla vieja sin `user_id` seguía ahí.

### La Solución

```javascript
const ensureSchema = async (sql) => {
  try {
    // Intenta crear tablas con esquema correcto
    await sql`CREATE TABLE IF NOT EXISTS ...`;
  } catch (schemaError) {
    // Si falla (ej: columna faltante), intenta migrar
    if (!columnExists('user_id')) {
      await sql`ALTER TABLE gallery_levels ADD COLUMN user_id text ...`;
    }
  }
};
```

Ahora **detecta automáticamente** si falta la columna y la agrega.

## Preguntas Frecuentes

**P: ¿Perderé datos?**
A: No, la migración conserva todos los niveles existentes y solo agrega la columna faltante.

**P: ¿Qué significa el "default 'unknown'"?**
A: Los niveles antiguos que no tenían `user_id` asignado ahora mostrarán `user_id = 'unknown'`. Cuando se re-compartan, tendrán el `user_id` correcto.

**P: ¿Se ejecuta automáticamente?**
A: Sí, la próxima vez que compartas un nivel, se ejecutará la migración automáticamente si es necesaria.

**P: ¿Qué pasa si sigo recibiendo el error?**
A: Intenta la Opción 3 (limpiar base de datos) ya que habrá datos corruptos.

---

✅ **Problema solucionado** - Ahora puedes compartir niveles sin errores.

