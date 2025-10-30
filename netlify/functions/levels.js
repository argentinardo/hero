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
  const user = context.clientContext && context.clientContext.user;
  if (!user) return { statusCode: 401, body: 'Unauthorized' };

  const userId = user.sub || user.email || user.id;
  const sql = neon(); // usa NETLIFY_DATABASE_URL

  try {
    await ensureSchema(sql);
  } catch (e) {
    return { statusCode: 500, body: `Schema error: ${e.message}` };
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


