// Netlify Function: per-user levels using Netlify Neon (Postgres)
// Requires: NETLIFY_DATABASE_URL set (Netlify → Site config → Environment variables)
// Auth via Netlify Identity (JWT) to obtain user id

const { neon } = require('@netlify/neon');

const ensureSchema = async (sql) => {
  await sql`CREATE TABLE IF NOT EXISTS levels (
    user_id text PRIMARY KEY,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
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
  const isAllowed = normalizedOrigin && allowedOrigins.some(allowed => {
    const normalizedAllowed = allowed.toLowerCase().replace(/\/$/, '');
    const strippedAllowed = normalizedAllowed.replace(/^https?:\/\//, '');
    return normalizedOrigin === normalizedAllowed || 
           normalizedOrigin.includes(strippedAllowed) ||
           normalizedOrigin.startsWith('http://localhost') ||
           normalizedOrigin.startsWith('capacitor://') ||
           normalizedOrigin.startsWith('ionic://');
  });

  const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 horas
  };

  // Establecer el header Access-Control-Allow-Origin
  // CRÍTICO: Siempre establecer el header para evitar errores de CORS
  if (origin) {
    // Permitir cualquier origen de localhost o capacitor
    if (normalizedOrigin && (
      normalizedOrigin.startsWith('http://localhost') ||
      normalizedOrigin.startsWith('capacitor://') ||
      normalizedOrigin.startsWith('ionic://') ||
      isAllowed
    )) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    } else {
      // Para otros orígenes, usar el origen original (más permisivo)
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }
  } else {
    // Si no hay origen (petición directa o desde app nativa), permitir cualquier origen
    corsHeaders['Access-Control-Allow-Origin'] = '*';
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

  // Obtener usuario del contexto (Netlify Identity) o del header Authorization (Auth0)
  let user = context.clientContext && context.clientContext.user;
  
  // Si no hay usuario en el contexto, intentar obtenerlo del header Authorization
  // Esto es necesario para Auth0 ya que Netlify Identity no está disponible
  if (!user && event.headers) {
    try {
      const authHeader = event.headers.authorization || event.headers.Authorization || event.headers.AUTHORIZATION;
      if (!authHeader) {
        console.log('[Levels] No se encontró header Authorization - usuario no autenticado');
      } else {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (!token) {
          console.warn('[Levels] Token vacío después de remover Bearer');
        } else {
          console.log('[Levels] Token recibido (primeros 20 caracteres):', token.substring(0, 20) + '...');
          const parts = token.split('.');
          console.log('[Levels] Token parts count:', parts.length);
          
          if (parts.length !== 3) {
            console.error('[Levels] Token no tiene formato JWT válido (debe tener 3 partes separadas por puntos)');
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
              console.log('[Levels] Usuario extraído del token. Sub:', user.sub, 'Email:', user.email);
            } else {
              console.error('[Levels] Token decodificado pero no tiene sub ni email');
            }
          }
        }
      }
    } catch (e) {
      console.error('[Levels] Error decodificando token JWT:', e.message);
      console.error('[Levels] Stack:', e.stack);
    }
  }
  
  if (!user) {
    console.error('[Levels] No user found in context or headers');
    return { 
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: 'Unauthorized: Usuario no autenticado' }) 
    };
  }

  const userId = user.sub || user.email || user.id;
  console.log('User ID:', userId);
  
  // Verificar que la variable de entorno esté presente
  const hasDatabaseUrl = !!process.env.NETLIFY_DATABASE_URL;
  console.log('NETLIFY_DATABASE_URL presente:', hasDatabaseUrl);
  
  if (!hasDatabaseUrl) {
    console.error('ERROR CRÍTICO: NETLIFY_DATABASE_URL no está configurada');
    return { 
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: false, 
        error: 'Database not configured: NETLIFY_DATABASE_URL environment variable is missing' 
      }) 
    };
  }

  // Verificar que la variable de entorno esté presente
  const hasDatabaseUrl = !!process.env.NETLIFY_DATABASE_URL;
  console.log('[Levels] NETLIFY_DATABASE_URL presente:', hasDatabaseUrl);
  
  if (!hasDatabaseUrl) {
    console.error('[Levels] ERROR CRÍTICO: NETLIFY_DATABASE_URL no está configurada');
    return { 
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: false, 
        error: 'Database not configured: NETLIFY_DATABASE_URL environment variable is missing' 
      }) 
    };
  }

  console.log('[Levels] Inicializando conexión a la base de datos...');
  let sql;
  try {
    sql = neon(); // usa NETLIFY_DATABASE_URL
    console.log('[Levels] Conexión a la base de datos inicializada exitosamente');
  } catch (error) {
    console.error('[Levels] ERROR al inicializar neon():', error);
    console.error('[Levels] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return { 
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: false, 
        error: `Database connection error: ${error.message}` 
      }) 
    };
  }

  try {
    console.log('[Levels] Asegurando schema de levels...');
    await ensureSchema(sql);
    console.log('[Levels] Schema de levels verificado/creado exitosamente');
  } catch (e) {
    console.error('[Levels] Schema error:', e);
    console.error('[Levels] Error details:', {
      name: e.name,
      message: e.message,
      stack: e.stack,
      code: e.code,
    });
    return { 
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: false, 
        error: `Schema error: ${e.message}`,
        details: e.code || 'UNKNOWN_ERROR'
      }) 
    };
  }

  if (event.httpMethod === 'GET') {
    try {
      console.log('[Levels] Ejecutando query GET para obtener niveles del usuario:', userId);
      const rows = await sql`SELECT data FROM levels WHERE user_id = ${userId} LIMIT 1`;
      console.log('[Levels] Query GET levels exitosa, filas encontradas:', rows.length);
      let data = rows?.[0]?.data || { levels: [] };
      
      // También cargar niveles implementados desde user_implemented_levels
      // Nota: Esta tabla puede no existir, así que manejamos el error
      let implementedRows = [];
      try {
        console.log('[Levels] Ejecutando query para obtener niveles implementados...');
        implementedRows = await sql`
          SELECT modified_data, name 
          FROM user_implemented_levels 
          WHERE user_id = ${userId}
          ORDER BY created_at ASC
        `;
        console.log('[Levels] Query niveles implementados exitosa, filas encontradas:', implementedRows.length);
      } catch (implError) {
        console.warn('[Levels] Tabla user_implemented_levels no existe o error al consultar:', implError.message);
        // Continuar sin niveles implementados
      }
      
      if (implementedRows.length > 0) {
        // Si no hay formato chunked, inicializar
        if (!data.format || data.format !== 'chunks20x18') {
          data = {
            format: 'chunks20x18',
            chunkWidth: 20,
            chunkHeight: 18,
            levels: []
          };
        }
        
        // Agregar niveles implementados a los niveles existentes
        implementedRows.forEach((impl: any) => {
          if (impl.modified_data && impl.modified_data.levels && Array.isArray(impl.modified_data.levels)) {
            // Agregar los chunks del nivel implementado
            data.levels.push(...impl.modified_data.levels);
          }
        });
        
        console.log('Niveles implementados agregados:', implementedRows.length);
      }
      
      console.log('[Levels] Datos recuperados para usuario:', userId, 'Formato:', data.format || 'legacy', 'Niveles:', Array.isArray(data.levels) ? data.levels.length : 'N/A');
      return { 
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(data) 
      };
    } catch (e) {
      console.error('[Levels] Error en GET:', e);
      console.error('[Levels] Error details:', {
        name: e.name,
        message: e.message,
        stack: e.stack,
        code: e.code,
      });
      return { 
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          ok: false, 
          error: e.message,
          details: e.code || 'UNKNOWN_ERROR'
        }) 
      };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      console.log('[Levels] Guardando niveles para usuario:', userId, 'Formato:', body.format || 'legacy', 'Niveles:', Array.isArray(body.levels) ? body.levels.length : 'N/A');
      console.log('[Levels] Ejecutando query POST para guardar niveles...');
      
      // Validar que el body tenga el formato correcto
      if (!body || typeof body !== 'object') {
        console.error('[Levels] Body inválido:', body);
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            ok: false, 
            error: 'Invalid request body' 
          })
        };
      }
      
      await sql`INSERT INTO levels (user_id, data) VALUES (${userId}, ${JSON.stringify(body)}::jsonb)
                ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      console.log('[Levels] Query POST exitosa, niveles guardados para usuario:', userId);
      return { 
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true }) 
      };
    } catch (e) {
      console.error('[Levels] Error en POST:', e);
      console.error('[Levels] Error details:', {
        name: e.name,
        message: e.message,
        stack: e.stack,
        code: e.code,
      });
      return { 
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ 
          ok: false, 
          error: e.message,
          details: e.code || 'UNKNOWN_ERROR'
        }) 
      };
    }
  }

  return { 
    statusCode: 405,
    headers: corsHeaders,
    body: 'Method Not Allowed' 
  };
};


