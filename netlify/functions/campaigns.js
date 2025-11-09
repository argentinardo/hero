// Netlify Function: campaigns - gestiona campañas por usuario en Neon Postgres
const { neon } = require('@netlify/neon');

const allowedOrigins = [
  'https://newhero.netlify.app',
  'http://localhost',
  'http://localhost:8080',
  'http://localhost:5173',
  'capacitor://localhost',
  'ionic://localhost',
];

const ensureSchema = async (sql) => {
  await sql`CREATE TABLE IF NOT EXISTS user_campaigns (
    user_id text PRIMARY KEY,
    campaigns jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;
  await sql`CREATE INDEX IF NOT EXISTS idx_user_campaigns_updated_at ON user_campaigns(updated_at DESC)`;
};

const normalizeOrigin = (origin) =>
  origin ? origin.toLowerCase().replace(/\/$/, '') : null;

const isAllowedOrigin = (origin) => {
  if (!origin) return false;
  const normalizedOrigin = normalizeOrigin(origin);
  return allowedOrigins.some((allowed) => {
    const normalizedAllowed = normalizeOrigin(allowed);
    if (!normalizedAllowed) return false;
    const strippedAllowed = normalizedAllowed.replace(/^https?:\/\//, '');
    return (
      normalizedOrigin === normalizedAllowed ||
      normalizedOrigin.includes(strippedAllowed)
    );
  });
};

const getCorsHeaders = (origin) => {
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (origin) {
    if (isAllowedOrigin(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
    } else if (!origin.toLowerCase().includes('netlify.app')) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  }

  return headers;
};

const decodeUserFromToken = (authorizationHeader) => {
  if (!authorizationHeader) return null;
  try {
    const token = authorizationHeader.replace('Bearer ', '');
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
    const decoded = JSON.parse(payload);
    if (!decoded) return null;
    return {
      sub: decoded.sub,
      email: decoded.email,
      id: decoded.sub || decoded.email,
    };
  } catch (error) {
    console.error('Error decodificando token JWT:', error);
    return null;
  }
};

const getUserFromRequest = (event, context) => {
  if (context.clientContext && context.clientContext.user) {
    return context.clientContext.user;
  }
  if (event.headers) {
    const authHeader =
      event.headers.authorization ||
      event.headers.Authorization ||
      event.headers.AUTHORIZATION;
    return decodeUserFromToken(authHeader);
  }
  return null;
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

  const user = getUserFromRequest(event, context);

  if (!user) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: 'Unauthorized: usuario no autenticado' }),
    };
  }

  const userId = user.sub || user.id || user.email;
  if (!userId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: 'No se pudo determinar el ID de usuario' }),
    };
  }

  const sql = neon();

  try {
    await ensureSchema(sql);
  } catch (error) {
    console.error('Error asegurando tabla user_campaigns:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: `Schema error: ${error.message}` }),
    };
  }

  if (event.httpMethod === 'GET') {
    try {
      const [row] =
        await sql`SELECT campaigns FROM user_campaigns WHERE user_id = ${userId} LIMIT 1`;
      const campaigns = Array.isArray(row?.campaigns) ? row.campaigns : [];
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, campaigns }),
      };
    } catch (error) {
      console.error('Error obteniendo campañas:', error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: error.message }),
      };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const campaigns = Array.isArray(payload.campaigns) ? payload.campaigns : [];
      await sql`
        INSERT INTO user_campaigns (user_id, campaigns)
        VALUES (${userId}, ${JSON.stringify(campaigns)}::jsonb)
        ON CONFLICT (user_id) DO UPDATE
        SET campaigns = EXCLUDED.campaigns,
            updated_at = now()
      `;
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true }),
      };
    } catch (error) {
      console.error('Error guardando campañas:', error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ ok: false, error: error.message }),
      };
    }
  }

  if (event.httpMethod === 'DELETE') {
    try {
      const payload = JSON.parse(event.body || '{}');
      const campaignId = payload.campaignId;
      if (!campaignId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ ok: false, error: 'campaignId es requerido' }),
        };
      }

      const [row] =
        await sql`SELECT campaigns FROM user_campaigns WHERE user_id = ${userId} LIMIT 1`;
      const campaigns = Array.isArray(row?.campaigns) ? row.campaigns : [];
      const filtered = campaigns.filter((campaign) => campaign?.id !== campaignId);

      if (filtered.length === campaigns.length) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ ok: true, removed: 0 }),
        };
      }

      await sql`
        INSERT INTO user_campaigns (user_id, campaigns)
        VALUES (${userId}, ${JSON.stringify(filtered)}::jsonb)
        ON CONFLICT (user_id) DO UPDATE
        SET campaigns = EXCLUDED.campaigns,
            updated_at = now()
      `;

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ ok: true, removed: campaigns.length - filtered.length }),
      };
    } catch (error) {
      console.error('Error eliminando campaña:', error);
      return {
        statusCode: 400,
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

