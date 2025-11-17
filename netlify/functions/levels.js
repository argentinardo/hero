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
    // Si hay origen, usarlo si está permitido o es localhost/capacitor
    if (isAllowed) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    } else if (normalizedOrigin && (
      normalizedOrigin.startsWith('http://localhost') ||
      normalizedOrigin.startsWith('capacitor://') ||
      normalizedOrigin.startsWith('ionic://') ||
      !normalizedOrigin.includes('netlify.app')
    )) {
      // Permitir localhost y otros orígenes de desarrollo
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

  // Obtener usuario del contexto de Netlify Identity
  let user = context.clientContext && context.clientContext.user;
  
  // Si no hay usuario en el contexto, intentar obtenerlo del header Authorization
  // Netlify Identity automáticamente inyecta el usuario en context.clientContext.user
  // cuando la función se llama desde el cliente autenticado, pero si no está disponible,
  // intentamos extraer información básica del token sin dependencias externas
  if (!user && event.headers && event.headers.authorization) {
    try {
      const token = event.headers.authorization.replace('Bearer ', '');
      // Decodificar el payload del JWT (sin verificación) usando Base64 nativo de Node.js
      // Un JWT tiene 3 partes: header.payload.signature
      const parts = token.split('.');
      if (parts.length === 3) {
        // Decodificar el payload (segunda parte)
        const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
        const decoded = JSON.parse(payload);
        if (decoded) {
          user = {
            sub: decoded.sub,
            email: decoded.email,
            id: decoded.sub || decoded.email
          };
        }
      }
    } catch (e) {
      console.error('Error decodificando token:', e);
    }
  }
  
  if (!user) {
    console.error('No user found in context or headers');
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

  console.log('Inicializando conexión a la base de datos...');
  let sql;
  try {
    sql = neon(); // usa NETLIFY_DATABASE_URL
    console.log('Conexión a la base de datos inicializada exitosamente');
  } catch (error) {
    console.error('ERROR al inicializar neon():', error);
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
    console.log('Asegurando schema de levels...');
    await ensureSchema(sql);
    console.log('Schema de levels verificado/creado exitosamente');
  } catch (e) {
    console.error('Schema error:', e);
    console.error('Error details:', {
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
      console.log('Ejecutando query GET para obtener niveles del usuario:', userId);
      const rows = await sql`SELECT data FROM levels WHERE user_id = ${userId} LIMIT 1`;
      console.log('Query GET levels exitosa, filas encontradas:', rows.length);
      let data = rows?.[0]?.data || { levels: [] };
      
      // También cargar niveles implementados desde user_implemented_levels
      console.log('Ejecutando query para obtener niveles implementados...');
      const implementedRows = await sql`
        SELECT modified_data, name 
        FROM user_implemented_levels 
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;
      console.log('Query niveles implementados exitosa, filas encontradas:', implementedRows.length);
      
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
      
      console.log('Datos recuperados para usuario:', userId, 'Formato:', data.format || 'legacy', 'Niveles:', Array.isArray(data.levels) ? data.levels.length : 'N/A');
      return { 
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(data) 
      };
    } catch (e) {
      console.error('Error en GET:', e);
      console.error('Error details:', {
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
      console.log('Guardando niveles para usuario:', userId, 'Formato:', body.format || 'legacy', 'Niveles:', Array.isArray(body.levels) ? body.levels.length : 'N/A');
      console.log('Ejecutando query POST para guardar niveles...');
      await sql`INSERT INTO levels (user_id, data) VALUES (${userId}, ${body}::jsonb)
                ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      console.log('Query POST exitosa, niveles guardados para usuario:', userId);
      return { 
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true }) 
      };
    } catch (e) {
      console.error('Error en POST:', e);
      console.error('Error details:', {
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


