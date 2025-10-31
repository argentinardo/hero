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

exports.handler = async (event, context) => {
  // Obtener usuario del contexto de Netlify Identity
  let user = context.clientContext && context.clientContext.user;
  
  // Si no hay usuario en el contexto, intentar obtenerlo del header Authorization
  if (!user && event.headers && event.headers.authorization) {
    try {
      const jwt = require('jsonwebtoken');
      const token = event.headers.authorization.replace('Bearer ', '');
      // Nota: En producción, deberías verificar el token contra Netlify Identity
      // Por ahora, intentamos decodificarlo (sin verificación para desarrollo)
      const decoded = jwt.decode(token);
      if (decoded) {
        user = {
          sub: decoded.sub,
          email: decoded.email,
          id: decoded.sub || decoded.email
        };
      }
    } catch (e) {
      console.error('Error decodificando token:', e);
    }
  }
  
  if (!user) {
    console.error('No user found in context or headers');
    return { 
      statusCode: 401, 
      body: JSON.stringify({ ok: false, error: 'Unauthorized: Usuario no autenticado' }) 
    };
  }

  const userId = user.sub || user.email || user.id;
  console.log('User ID:', userId);
  
  const sql = neon(); // usa NETLIFY_DATABASE_URL

  try {
    await ensureSchema(sql);
  } catch (e) {
    console.error('Schema error:', e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: `Schema error: ${e.message}` }) };
  }

  if (event.httpMethod === 'GET') {
    try {
      const rows = await sql`SELECT data FROM levels WHERE user_id = ${userId} LIMIT 1`;
      const data = rows?.[0]?.data || { levels: [] };
      return { statusCode: 200, body: JSON.stringify(data) };
    } catch (e) {
      return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      await sql`INSERT INTO levels (user_id, data) VALUES (${userId}, ${body}::jsonb)
                ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`;
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};


