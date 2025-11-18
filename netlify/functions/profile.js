// Netlify Function: Profile - gestionar nickname y avatar del usuario
const { neon } = require('@netlify/neon');

const ensureUsersTable = async (sql) => {
  await sql`CREATE TABLE IF NOT EXISTS users (
    user_id text PRIMARY KEY,
    nickname text,
    avatar_url text,
    email text,
    settings jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login timestamptz,
    UNIQUE(user_id)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  // Agregar columna settings si no existe (para usuarios existentes)
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS settings jsonb`;
};

const allowedOrigins = [
  'https://newhero.netlify.app',
  'http://localhost',
  'http://localhost:8080',
  'http://localhost:5173',
  'capacitor://localhost',
  'ionic://localhost',
];

const getCorsHeaders = (origin) => {
  const normalizedOrigin = origin ? origin.toLowerCase().replace(/\/$/, '') : null;
  const isAllowed =
    normalizedOrigin &&
    allowedOrigins.some((allowed) => {
      const normalizedAllowed = allowed.toLowerCase().replace(/\/$/, '');
      const strippedAllowed = normalizedAllowed.replace(/^https?:\/\//, '');
      return (
        normalizedOrigin === normalizedAllowed ||
        normalizedOrigin.includes(strippedAllowed)
      );
    });

  const corsHeaders = {
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (isAllowed && origin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else if (normalizedOrigin && !normalizedOrigin.includes('netlify.app')) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  }

  return corsHeaders;
};

const extractUserFromRequest = (event, context) => {
  let user = context.clientContext && context.clientContext.user;

  if (!user && event.headers && event.headers.authorization) {
    try {
      const authHeader = event.headers.authorization || event.headers.Authorization || event.headers.AUTHORIZATION;
      if (!authHeader) {
        console.warn('No se encontró header Authorization');
        return null;
      }
      
      const token = authHeader.replace(/^Bearer\s+/i, '');
      if (!token) {
        console.warn('Token vacío después de remover Bearer');
        return null;
      }
      
      console.log('Token recibido (primeros 20 caracteres):', token.substring(0, 20) + '...');
      console.log('Token completo length:', token.length);
      
      const parts = token.split('.');
      console.log('Token parts count:', parts.length);
      
      if (parts.length !== 3) {
        console.error('Token no tiene formato JWT válido (debe tener 3 partes separadas por puntos)');
        console.error('El token recibido parece ser un token opaco, no un JWT');
        console.error('Esto puede ocurrir si se está usando access_token en lugar de id_token');
        console.error('Solución: Usar id_token (siempre es JWT) en lugar de access_token');
        return null;
      }
      
      // Decodificar el payload (segunda parte)
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
      const decoded = JSON.parse(payload);
      
      if (!decoded) {
        console.error('No se pudo decodificar el payload del token');
        return null;
      }
      
      console.log('Token decodificado exitosamente. Sub:', decoded.sub, 'Email:', decoded.email);
      
      user = {
        sub: decoded.sub,
        email: decoded.email,
        id: decoded.sub || decoded.email,
      };
      
      if (!user.sub && !user.email) {
        console.error('Token decodificado pero no tiene sub ni email');
        return null;
      }
    } catch (error) {
      console.error('Error decodificando token JWT:', error.message);
      console.error('Stack:', error.stack);
    }
  } else if (!user) {
    console.warn('No hay usuario en context.clientContext.user ni header Authorization');
  }

  return user;
};

exports.handler = async (event, context) => {
  const origin = event.headers.origin || event.headers.Origin || event.headers.ORIGIN;
  const corsHeaders = getCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  const user = extractUserFromRequest(event, context);

  if (!user) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: 'Unauthorized: usuario no autenticado' }),
    };
  }

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
      }),
    };
  }

  console.log('Inicializando conexión a la base de datos...');
  let sql;
  try {
    sql = neon();
    console.log('Conexión a la base de datos inicializada exitosamente');
  } catch (error) {
    console.error('ERROR al inicializar neon():', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: false, 
        error: `Database connection error: ${error.message}` 
      }),
    };
  }

  try {
    console.log('Asegurando tabla users...');
    await ensureUsersTable(sql);
    console.log('Tabla users verificada/creada exitosamente');
  } catch (error) {
    console.error('Error asegurando tabla users:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: false, 
        error: `Schema error: ${error.message}`,
        details: error.stack 
      }),
    };
  }

  const userId = user.sub || user.id || user.email;
  const userEmail = user.email || null;

  if (!userId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: 'No se pudo determinar el ID de usuario' }),
    };
  }

  if (event.httpMethod === 'GET') {
    try {
      console.log('Ejecutando query GET para usuario:', userId);
      const [profile] = await sql`
        INSERT INTO users (user_id, email, last_login)
        VALUES (${userId}, ${userEmail}, now())
        ON CONFLICT (user_id) DO UPDATE
        SET last_login = now(),
            email = COALESCE(EXCLUDED.email, users.email)
        RETURNING user_id, email, nickname, avatar_url, settings, created_at, last_login
      `;
      console.log('Query GET exitosa, perfil obtenido:', profile ? 'Sí' : 'No');

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, data: profile }),
      };
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          ok: false, 
          error: error.message,
          details: error.code || 'UNKNOWN_ERROR'
        }),
      };
    }
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const rawNickname = payload.nickname;
      const rawAvatarUrl = payload.avatar_url;
      const rawSettings = payload.settings;

      const nickname =
        typeof rawNickname === 'string' && rawNickname.trim().length > 0
          ? rawNickname.trim().slice(0, 64)
          : null;
      const avatarUrl =
        typeof rawAvatarUrl === 'string' && rawAvatarUrl.trim().length > 0
          ? rawAvatarUrl.trim().slice(0, 256)
          : null;
      
      // Validar que settings sea un objeto válido si está presente
      let settings = null;
      if (rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)) {
        try {
          // Validar estructura básica de settings
          if (rawSettings.audio || rawSettings.graphics || rawSettings.controls || rawSettings.language) {
            settings = rawSettings;
          }
        } catch (e) {
          console.warn('Settings inválido, ignorando:', e);
        }
      }

      console.log('Ejecutando query PUT para actualizar perfil:', { userId, nickname, avatarUrl, hasSettings: !!settings });
      
      // Si solo se está actualizando settings, no actualizar otros campos
      if (payload.settingsOnly) {
        const [profile] = await sql`
          UPDATE users
          SET settings = ${settings}::jsonb,
              last_login = now()
          WHERE user_id = ${userId}
          RETURNING user_id, email, nickname, avatar_url, settings, created_at, last_login
        `;
        console.log('Query PUT (settings only) exitosa, perfil actualizado:', profile ? 'Sí' : 'No');
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ ok: true, data: profile }),
        };
      }
      
      const [profile] = await sql`
        INSERT INTO users (user_id, email, nickname, avatar_url, settings, last_login)
        VALUES (${userId}, ${userEmail}, ${nickname}, ${avatarUrl}, ${settings}::jsonb, now())
        ON CONFLICT (user_id) DO UPDATE
        SET nickname = COALESCE(${nickname}, users.nickname),
            avatar_url = COALESCE(${avatarUrl}, users.avatar_url),
            settings = COALESCE(${settings}::jsonb, users.settings),
            email = COALESCE(EXCLUDED.email, users.email),
            last_login = now()
        RETURNING user_id, email, nickname, avatar_url, settings, created_at, last_login
      `;
      console.log('Query PUT exitosa, perfil actualizado:', profile ? 'Sí' : 'No');

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, data: profile }),
      };
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code,
      });
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ 
          ok: false, 
          error: error.message,
          details: error.code || 'UNKNOWN_ERROR'
        }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: corsHeaders,
    body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
  };
};


