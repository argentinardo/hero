# ⚡ Quick Fix - Error de Galería

## El Error
```
HTTP 500: Schema error: column "user_id" does not exist
```

## Solución Rápida (30 segundos)

### PASO 1️⃣ - Abre tu Base de Datos Neon

1. Accede a https://console.neon.tech
2. Selecciona tu proyecto **hero**
3. Abre la pestaña **SQL Editor**

### PASO 2️⃣ - Copia y Pega Esto

```sql
-- Verificar y agregar columna user_id si falta
ALTER TABLE gallery_levels 
ADD COLUMN IF NOT EXISTS user_id text DEFAULT 'unknown';

-- Crear tabla users si no existe
CREATE TABLE IF NOT EXISTS users (
  user_id text PRIMARY KEY,
  nickname text,
  avatar_url text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz
);

-- Agregar foreign key si no existe
ALTER TABLE gallery_levels 
ADD CONSTRAINT IF NOT EXISTS gallery_levels_user_id_fk 
FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery_levels(user_id);
```

### PASO 3️⃣ - Click en ▶️ Run

✅ Listo

### PASO 4️⃣ - Vuelve a Compartir el Nivel

Recarga tu app y prueba compartir de nuevo.

---

## ¿Si sigue fallando?

Usa esta opción "nuclear" (borra datos viejos):

```sql
-- ⚠️ BORRA TODO ⚠️
DROP TABLE IF EXISTS user_implemented_levels CASCADE;
DROP TABLE IF EXISTS level_likes CASCADE;  
DROP TABLE IF EXISTS gallery_levels CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Luego recarga la app
```

---

## ¿Aún no funciona?

Mira: `GALLERY_SCHEMA_FIX.md` para soluciones avanzadas.

---

**¡Listo!** 🚀

