// Netlify Function: Migración para actualizar esquema de gallery
// Este script corrige la estructura de la BD si es necesario

const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
    };
  }

  // Solo permitir desde contexto autenticado (Netlify admin)
  const authHeader = event.headers.authorization || '';
  const correctToken = process.env.MIGRATION_TOKEN;
  
  if (!correctToken || authHeader !== `Bearer ${correctToken}`) {
    return {
      statusCode: 403,
      body: JSON.stringify({ ok: false, error: 'Forbidden' })
    };
  }

  const sql = neon();

  try {
    console.log('Iniciando migración de BD...');

    // 1. Crear tabla users si no existe
    await sql`CREATE TABLE IF NOT EXISTS users (
      user_id text PRIMARY KEY,
      nickname text,
      avatar_url text,
      email text,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_login timestamptz,
      UNIQUE(user_id)
    )`;
    console.log('✅ Tabla users verificada');

    // 2. Verificar si gallery_levels existe
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'gallery_levels'
      )
    `;

    if (tableExists[0].exists) {
      console.log('✓ Tabla gallery_levels existe');

      // 3. Verificar si la columna user_id existe
      const columnExists = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'gallery_levels' 
          AND column_name = 'user_id'
        )
      `;

      if (!columnExists[0].exists) {
        console.log('⚠️ Columna user_id no existe, migrando...');

        // Crear tabla temporal con los datos
        await sql`CREATE TABLE gallery_levels_new AS SELECT * FROM gallery_levels`;
        console.log('✓ Tabla temporal creada');

        // Eliminar tabla vieja
        await sql`DROP TABLE gallery_levels CASCADE`;
        console.log('✓ Tabla vieja eliminada');

        // Crear tabla con esquema correcto
        await sql`CREATE TABLE gallery_levels (
          level_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id text NOT NULL DEFAULT 'unknown',
          name text NOT NULL,
          description text,
          data jsonb NOT NULL,
          screenshot text,
          likes_count integer NOT NULL DEFAULT 0,
          downloads_count integer NOT NULL DEFAULT 0,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          is_public boolean NOT NULL DEFAULT true
        )`;
        console.log('✓ Nueva tabla gallery_levels creada');

        // Copiar datos de la tabla temporal (sin user_id, que ya tiene default)
        await sql`INSERT INTO gallery_levels 
          (level_id, name, description, data, screenshot, likes_count, downloads_count, created_at, updated_at, is_public)
          SELECT level_id, name, description, data, screenshot, likes_count, downloads_count, created_at, updated_at, is_public
          FROM gallery_levels_new`;
        console.log('✓ Datos migrados');

        // Eliminar tabla temporal
        await sql`DROP TABLE gallery_levels_new`;
        console.log('✓ Tabla temporal eliminada');

        // Agregar índices
        await sql`CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery_levels(user_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery_levels(created_at DESC)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_gallery_likes ON gallery_levels(likes_count DESC)`;
        console.log('✓ Índices creados');
      } else {
        console.log('✓ Columna user_id ya existe, verificando constraints...');

        // Verificar constraint de FK
        const hasForeignKey = await sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_schema = 'public' 
            AND table_name = 'gallery_levels' 
            AND constraint_type = 'FOREIGN KEY'
          )
        `;

        if (!hasForeignKey[0].exists) {
          console.log('⚠️ Foreign key no existe, agregando...');
          await sql`ALTER TABLE gallery_levels 
            ADD CONSTRAINT gallery_levels_user_id_fk 
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE`;
          console.log('✓ Foreign key agregado');
        }
      }
    } else {
      console.log('✓ Creando tabla gallery_levels desde cero');
      
      await sql`CREATE TABLE gallery_levels (
        level_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        data jsonb NOT NULL,
        screenshot text,
        likes_count integer NOT NULL DEFAULT 0,
        downloads_count integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        is_public boolean NOT NULL DEFAULT true
      )`;
      
      await sql`CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery_levels(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery_levels(created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_gallery_likes ON gallery_levels(likes_count DESC)`;
      console.log('✓ Tabla gallery_levels creada');
    }

    // 4. Crear tabla level_likes si no existe
    await sql`CREATE TABLE IF NOT EXISTS level_likes (
      like_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      level_id text NOT NULL REFERENCES gallery_levels(level_id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(level_id, user_id)
    )`;
    console.log('✓ Tabla level_likes verificada');

    // 5. Crear tabla user_implemented_levels si no existe
    await sql`CREATE TABLE IF NOT EXISTS user_implemented_levels (
      implementation_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      original_level_id text REFERENCES gallery_levels(level_id) ON DELETE SET NULL,
      modified_data jsonb NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, original_level_id)
    )`;
    console.log('✓ Tabla user_implemented_levels verificada');

    // 6. Crear índices
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_level ON level_likes(level_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_user ON level_likes(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_implemented_user ON user_implemented_levels(user_id)`;
    console.log('✓ Índices verificados');

    console.log('✅ Migración completada exitosamente');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        ok: true, 
        message: 'Migración completada exitosamente'
      })
    };

  } catch (error) {
    console.error('❌ Error en migración:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        ok: false, 
        error: error.message,
        details: error.stack
      })
    };
  }
};

