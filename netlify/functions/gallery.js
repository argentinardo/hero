// Netlify Function: Gallery - niveles públicos con votos y capturas
// GET /api/gallery - obtener niveles más votados
// GET /api/gallery?user_id=xxx - niveles de un usuario específico
// POST /api/gallery - publicar un nivel en la galería
// PATCH /api/gallery/:level_id/like - dar/quitar me gusta

const { neon } = require('@netlify/neon');

const ensureSchema = async (sql) => {
  try {
    // Tabla de usuarios con perfiles
    await sql`CREATE TABLE IF NOT EXISTS users (
      user_id text PRIMARY KEY,
      nickname text,
      avatar_url text,
      email text,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_login timestamptz,
      UNIQUE(user_id)
    )`;

    // Tabla de niveles en la galería
    await sql`CREATE TABLE IF NOT EXISTS gallery_levels (
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

    // Tabla de likes (votos) por nivel
    await sql`CREATE TABLE IF NOT EXISTS level_likes (
      like_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      level_id text NOT NULL REFERENCES gallery_levels(level_id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(level_id, user_id)
    )`;

    // Tabla de implementaciones (cuando un usuario copia y modifica un nivel)
    await sql`CREATE TABLE IF NOT EXISTS user_implemented_levels (
      implementation_id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
      user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      original_level_id text REFERENCES gallery_levels(level_id) ON DELETE SET NULL,
      modified_data jsonb NOT NULL,
      name text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, original_level_id)
    )`;

    // Índices para mejor rendimiento
    await sql`CREATE INDEX IF NOT EXISTS idx_gallery_user ON gallery_levels(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gallery_created ON gallery_levels(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_gallery_likes ON gallery_levels(likes_count DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_level ON level_likes(level_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_user ON level_likes(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_implemented_user ON user_implemented_levels(user_id)`;

  } catch (schemaError) {
    // Si hay error de schema (ej: columna faltante), intentar migración básica
    console.log('Intentando migración básica...', schemaError.message);
    
    try {
      // Verificar si falta la columna user_id
      const hasUserIdColumn = await sql`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'gallery_levels' 
          AND column_name = 'user_id'
        )
      `;

      if (hasUserIdColumn && !hasUserIdColumn[0]?.exists) {
        console.log('Agregando columna user_id a gallery_levels');
        // Agregar columna con valor por defecto
        await sql`ALTER TABLE gallery_levels ADD COLUMN user_id text DEFAULT 'unknown'`;
        await sql`ALTER TABLE gallery_levels ALTER COLUMN user_id SET NOT NULL`;
      }
    } catch (migrationError) {
      console.error('Error en migración básica:', migrationError);
      // Si la migración falla, lanzar el error original
      throw schemaError;
    }
  }
};

/**
 * Configura las cabeceras CORS para permitir peticiones desde la app Android/Capacitor
 */
const getCorsHeaders = (origin) => {
  // Lista de orígenes permitidos
  const allowedOrigins = [
    'https://newhero.netlify.app',  // URL de producción
    'http://localhost',              // Origen de app Android/Capacitor
    'http://localhost:8080',          // Capacitor común
    'http://localhost:5173',         // Dev server común
    'capacitor://localhost',         // Capacitor protocol
    'ionic://localhost',             // Ionic protocol
  ];

  // Normalizar el origen para comparación (sin trailing slash, en minúsculas)
  const normalizedOrigin = origin ? origin.toLowerCase().replace(/\/$/, '') : null;
  
  // Verificar si el origen está permitido (comparación flexible)
  const isAllowed = normalizedOrigin && allowedOrigins.some(allowed => 
    normalizedOrigin.includes(allowed.replace(/^https?:\/\//, '')) || 
    normalizedOrigin === allowed
  );

  const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 horas
  };

  // Solo permitir origen específico si está en la lista, de lo contrario usar wildcard para desarrollo
  if (isAllowed && normalizedOrigin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else {
    // En desarrollo, permitir cualquier origen (solo si no es producción)
    if (normalizedOrigin && !normalizedOrigin.includes('netlify.app')) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }
  }

  return corsHeaders;
};

exports.handler = async (event, context) => {
  // Obtener el origen de la petición
  const origin = event.headers.origin || event.headers.Origin || event.headers.ORIGIN;
  const corsHeaders = getCorsHeaders(origin);

  // Manejar petición OPTIONS (preflight CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204, // No Content
      headers: corsHeaders,
      body: ''
    };
  }

  let user = context.clientContext && context.clientContext.user;
  
  // Si no hay usuario en el contexto, intentar obtenerlo del header Authorization
  // Esto es necesario para Auth0 ya que Netlify Identity no está disponible
  if (!user && event.headers) {
    try {
      const authHeader = event.headers.authorization || event.headers.Authorization || event.headers.AUTHORIZATION;
      if (!authHeader) {
        console.log('[Gallery] No se encontró header Authorization - usuario no autenticado');
      } else {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (!token) {
          console.warn('[Gallery] Token vacío después de remover Bearer');
        } else {
          console.log('[Gallery] Token recibido (primeros 20 caracteres):', token.substring(0, 20) + '...');
          const parts = token.split('.');
          console.log('[Gallery] Token parts count:', parts.length);
          
          if (parts.length !== 3) {
            console.error('[Gallery] Token no tiene formato JWT válido (debe tener 3 partes separadas por puntos)');
          } else {
            // Decodificar el payload (segunda parte)
            const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
            const decoded = JSON.parse(payload);
            
            if (decoded && (decoded.sub || decoded.email)) {
              user = {
                sub: decoded.sub,
                email: decoded.email,
                id: decoded.sub || decoded.email
              };
              console.log('[Gallery] Usuario extraído del token. Sub:', user.sub, 'Email:', user.email);
            } else {
              console.error('[Gallery] Token decodificado pero no tiene sub ni email');
            }
          }
        }
      }
    } catch (e) {
      console.error('[Gallery] Error decodificando token JWT:', e.message);
      console.error('[Gallery] Stack:', e.stack);
    }
  }
  
  if (!user) {
    console.log('[Gallery] No hay usuario autenticado - algunas funciones requerirán autenticación');
  }

  const sql = neon();

  try {
    await ensureSchema(sql);
  } catch (e) {
    console.error('Schema error:', e);
    return { 
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: `Schema error: ${e.message}` }) 
    };
  }

  // GET - Obtener niveles de la galería
  if (event.httpMethod === 'GET') {
    try {
      const queryString = event.queryStringParameters || {};
      const limit = parseInt(queryString.limit || '50');
      const offset = parseInt(queryString.offset || '0');
      const sortBy = queryString.sort || 'likes'; // 'likes', 'newest', 'downloads'
      
      let orderBy;
      switch (sortBy) {
        case 'newest':
          orderBy = 'created_at DESC';
          break;
        case 'downloads':
          orderBy = 'downloads_count DESC';
          break;
        case 'likes':
        default:
          orderBy = 'likes_count DESC';
          break;
      }

      let rows;
      if (queryString.user_id) {
        // Obtener niveles de un usuario específico
        rows = await sql`
          SELECT 
            gl.*,
            u.nickname,
            u.avatar_url,
            CASE WHEN ll.like_id IS NOT NULL THEN true ELSE false END as user_liked
          FROM gallery_levels gl
          JOIN users u ON gl.user_id = u.user_id
          LEFT JOIN level_likes ll ON gl.level_id = ll.level_id AND ll.user_id = ${user?.sub || null}
          WHERE gl.user_id = ${queryString.user_id} AND gl.is_public = true
          ORDER BY ${sql(orderBy)}
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        // Obtener niveles más votados/descargados
        rows = await sql`
          SELECT 
            gl.*,
            u.nickname,
            u.avatar_url,
            CASE WHEN ll.like_id IS NOT NULL THEN true ELSE false END as user_liked
          FROM gallery_levels gl
          JOIN users u ON gl.user_id = u.user_id
          LEFT JOIN level_likes ll ON gl.level_id = ll.level_id AND ll.user_id = ${user?.sub || null}
          WHERE gl.is_public = true
          ORDER BY ${sql(orderBy)}
          LIMIT ${limit} OFFSET ${offset}
        `;
      }

      return { 
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, data: rows }) 
      };
    } catch (e) {
      console.error('Error en GET gallery:', e);
      return { 
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: e.message }) 
      };
    }
  }

  // POST - Publicar un nivel en la galería
  if (event.httpMethod === 'POST') {
    if (!user) {
      return { 
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: 'Unauthorized: Usuario no autenticado' }) 
      };
    }

    try {
      const body = JSON.parse(event.body || '{}');
      const { name, description, data, screenshot } = body;
      
      if (!name || !data) {
        return { 
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ ok: false, error: 'Nombre y datos del nivel son requeridos' }) 
        };
      }

      const userId = user.sub || user.email || user.id;

      // Asegurar que el usuario exista en la tabla users
      await sql`
        INSERT INTO users (user_id, email, nickname, last_login)
        VALUES (${userId}, ${user.email || null}, ${user.email?.split('@')[0] || null}, now())
        ON CONFLICT (user_id) DO UPDATE SET last_login = now()
      `;

      // Insertar el nivel en la galería
      const [newLevel] = await sql`
        INSERT INTO gallery_levels (user_id, name, description, data, screenshot)
        VALUES (${userId}, ${name}, ${description || null}, ${data}::jsonb, ${screenshot || null})
        RETURNING *
      `;

      return { 
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, data: newLevel }) 
      };
    } catch (e) {
      console.error('Error en POST gallery:', e);
      return { 
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: e.message }) 
      };
    }
  }

  // PATCH - Me gusta / Quitar me gusta
  if (event.httpMethod === 'PATCH') {
    if (!user) {
      return { 
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: 'Unauthorized' }) 
      };
    }

    try {
      const pathMatch = event.path.match(/\/gallery\/([^\/]+)\/(like|implement)/);
      if (!pathMatch) {
        return { 
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ ok: false, error: 'Ruta inválida' }) 
        };
      }

      const levelId = pathMatch[1];
      const action = pathMatch[2];

      const userId = user.sub || user.email || user.id;

      if (action === 'like') {
        // Verificar si ya dio like
        const existing = await sql`
          SELECT like_id FROM level_likes 
          WHERE level_id = ${levelId} AND user_id = ${userId}
        `;

        if (existing.length > 0) {
          // Quitar like
          await sql`DELETE FROM level_likes WHERE level_id = ${levelId} AND user_id = ${userId}`;
          await sql`
            UPDATE gallery_levels 
            SET likes_count = likes_count - 1 
            WHERE level_id = ${levelId}
          `;
          return { 
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ ok: true, liked: false }) 
          };
        } else {
          // Agregar like
          await sql`
            INSERT INTO level_likes (level_id, user_id) 
            VALUES (${levelId}, ${userId})
          `;
          await sql`
            UPDATE gallery_levels 
            SET likes_count = likes_count + 1 
            WHERE level_id = ${levelId}
          `;
          return { 
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ ok: true, liked: true }) 
          };
        }
      } else if (action === 'implement') {
        // Implementar un nivel (copiar a la cuenta del usuario para modificar)
        const body = JSON.parse(event.body || '{}');
        const { modified_data, name } = body;
        
        if (!modified_data || !name) {
          return { 
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ ok: false, error: 'modified_data y name son requeridos' }) 
          };
        }

        // Verificar que el nivel original existe
        const originalLevel = await sql`
          SELECT * FROM gallery_levels WHERE level_id = ${levelId} AND is_public = true
        `;

        if (originalLevel.length === 0) {
          return { 
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ ok: false, error: 'Nivel no encontrado' }) 
          };
        }

        // Insertar o actualizar la implementación
        await sql`
          INSERT INTO user_implemented_levels (user_id, original_level_id, modified_data, name)
          VALUES (${userId}, ${levelId}, ${modified_data}::jsonb, ${name})
          ON CONFLICT (user_id, original_level_id) 
          DO UPDATE SET modified_data = EXCLUDED.modified_data, name = EXCLUDED.name
        `;

        // Incrementar contador de descargas
        await sql`
          UPDATE gallery_levels 
          SET downloads_count = downloads_count + 1 
          WHERE level_id = ${levelId}
        `;

        return { 
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ ok: true, message: 'Nivel implementado en tu cuenta' }) 
        };
      }
    } catch (e) {
      console.error('Error en PATCH gallery:', e);
      return { 
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: e.message }) 
      };
    }
  }

  return { 
    statusCode: 405,
    headers: corsHeaders,
    body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) 
  };
};

