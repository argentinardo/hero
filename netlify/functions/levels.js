// Netlify Function: per-user levels storage using Netlify Identity + Blobs
// Requires Identity enabled on site. Stores data at blobs namespace 'levels'.

const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const user = context.clientContext && context.clientContext.user;
  if (!user) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  const userId = user.sub || user.email || user.id;
  const store = getStore({ name: 'levels' });
  const key = `levels/${userId}.json`;

  if (event.httpMethod === 'GET') {
    try {
      const content = await store.get(key, { type: 'json' });
      return { statusCode: 200, body: JSON.stringify(content || { levels: [] }) };
    } catch (e) {
      return { statusCode: 200, body: JSON.stringify({ levels: [] }) };
    }
  }

  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      // Expect shape: { levels: string[][] } (20x18 chunks) o buildChunkedFile payload
      // Normalizar: si viene en formato buildChunkedFile, mantenerlo tal cual
      await store.set(key, JSON.stringify(body), { contentType: 'application/json' });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: e.message }) };
    }
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};


