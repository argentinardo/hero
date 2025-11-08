// Netlify Function: Profile - gestionar nickname y avatar del usuario
const { neon } = require('@netlify/neon');

const ensureUsersTable = async (sql) => {
  await sql`CREATE TABLE IF NOT EXISTS users (
    user_id text PRIMARY KEY,
    nickname text,
    avatar_url text,
    email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_login timestamptz,
    UNIQUE(user_id)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
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
      const token = event.headers.authorization.replace('Bearer ', '');
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
        const decoded = JSON.parse(payload);
        if (decoded) {
          user = {
            sub: decoded.sub,
            email: decoded.email,
            id: decoded.sub || decoded.email,
          };
        }
      }
    } catch (error) {
      console.error('Error decodificando token JWT:', error);
    }
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

  const sql = neon();

  try {
    await ensureUsersTable(sql);
  } catch (error) {
    console.error('Error asegurando tabla users:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: `Schema error: ${error.message}` }),
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
      const [profile] = await sql`
        INSERT INTO users (user_id, email, last_login)
        VALUES (${userId}, ${userEmail}, now())
        ON CONFLICT (user_id) DO UPDATE
        SET last_login = now(),
            email = COALESCE(EXCLUDED.email, users.email)
        RETURNING user_id, email, nickname, avatar_url, created_at, last_login
      `;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, data: profile }),
      };
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: error.message }),
      };
    }
  }

  if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const rawNickname = payload.nickname;
      const rawAvatarUrl = payload.avatar_url;

      const nickname =
        typeof rawNickname === 'string' && rawNickname.trim().length > 0
          ? rawNickname.trim().slice(0, 64)
          : null;
      const avatarUrl =
        typeof rawAvatarUrl === 'string' && rawAvatarUrl.trim().length > 0
          ? rawAvatarUrl.trim().slice(0, 256)
          : null;

      const [profile] = await sql`
        INSERT INTO users (user_id, email, nickname, avatar_url, last_login)
        VALUES (${userId}, ${userEmail}, ${nickname}, ${avatarUrl}, now())
        ON CONFLICT (user_id) DO UPDATE
        SET nickname = ${nickname},
            avatar_url = ${avatarUrl},
            email = COALESCE(EXCLUDED.email, users.email),
            last_login = now()
        RETURNING user_id, email, nickname, avatar_url, created_at, last_login
      `;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, data: profile }),
      };
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: error.message }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: corsHeaders,
    body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }),
  };
};


