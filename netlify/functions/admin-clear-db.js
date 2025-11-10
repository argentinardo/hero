// Netlify Function: Admin - Vaciar todas las tablas de la base de datos
// ⚠️ ADVERTENCIA: Esta función elimina TODOS los datos de todas las tablas
// Solo debe ejecutarse con una clave de administración segura

const { neon } = require('@netlify/neon');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION';

const allowedOrigins = [
  'https://newhero.netlify.app',
  'http://localhost',
  'http://localhost:8080',
  'http://localhost:5173',
  'capacitor://localhost',
  'ionic://localhost',
];

const getCorsHeaders = (origin) => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (normalizedOrigin && allowedOrigins.includes(normalizedOrigin)) {
    return {
      'Access-Control-Allow-Origin': normalizedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Secret',
      'Content-Type': 'application/json',
    };
  }
  return {
    'Content-Type': 'application/json',
  };
};

const normalizeOrigin = (origin) => {
  if (!origin) return null;
  if (origin.startsWith('http://localhost') || origin.startsWith('https://localhost')) {
    return origin.split(':').slice(0, 2).join(':');
  }
  return origin;
};

/**
 * Vacía todas las tablas de la base de datos
 * Mantiene la estructura de las tablas pero elimina todos los datos
 */
const clearAllTables = async (sql) => {
  const tables = [
    'level_likes',              // Tabla de likes (debe ir primero por foreign keys)
    'user_implemented_levels',  // Tabla de implementaciones (debe ir antes de gallery_levels)
    'gallery_levels',           // Tabla de niveles en la galería
    'user_campaigns',           // Tabla de campañas por usuario
    'levels',                   // Tabla de niveles por usuario
    'users',                    // Tabla de usuarios (debe ir al final por foreign keys)
  ];

  const results = [];
  
  for (const table of tables) {
    try {
      // Verificar que la tabla existe antes de intentar vaciarla
      const tableExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${table}
        )
      `;
      
      if (tableExists[0]?.exists) {
        // Obtener el conteo antes de eliminar
        const countBefore = await sql.unsafe(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = parseInt(countBefore[0]?.count || '0', 10);
        
        // Usar TRUNCATE para mejor rendimiento, pero si hay foreign keys, usar DELETE
        // TRUNCATE es más rápido pero no funciona con foreign keys
        try {
          // Intentar TRUNCATE primero (más rápido)
          await sql.unsafe(`TRUNCATE TABLE "${table}" CASCADE`);
          results.push({ table, deleted: count, success: true, method: 'TRUNCATE' });
          console.log(`Tabla ${table} vaciada con TRUNCATE: ${count} registros eliminados`);
        } catch (truncateError) {
          // Si TRUNCATE falla (por foreign keys), usar DELETE
          await sql.unsafe(`DELETE FROM "${table}"`);
          results.push({ table, deleted: count, success: true, method: 'DELETE' });
          console.log(`Tabla ${table} vaciada con DELETE: ${count} registros eliminados`);
        }
      } else {
        results.push({ table, deleted: 0, success: true, message: 'Tabla no existe' });
        console.log(`Tabla ${table} no existe, omitiendo`);
      }
    } catch (error) {
      console.error(`Error vaciando tabla ${table}:`, error);
      results.push({ table, deleted: 0, success: false, error: error.message });
    }
  }

  return results;
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

  // Verificar que es una petición POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: 'Method Not Allowed. Use POST.' }),
    };
  }

  // Verificar la clave de administración
  const adminSecret = event.headers['x-admin-secret'] || 
                      event.headers['X-Admin-Secret'] ||
                      (event.body ? JSON.parse(event.body || '{}').adminSecret : null);

  if (!adminSecret || adminSecret !== ADMIN_SECRET) {
    console.error('Intento de acceso no autorizado a admin-clear-db');
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ 
        ok: false, 
        error: 'Unauthorized: Se requiere una clave de administración válida' 
      }),
    };
  }

  const sql = neon();

  try {
    console.log('Iniciando limpieza de la base de datos...');
    const results = await clearAllTables(sql);
    
    const totalDeleted = results.reduce((sum, r) => sum + (r.deleted || 0), 0);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Limpieza completada: ${totalDeleted} registros eliminados de ${successCount} tablas`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: true,
        message: 'Base de datos vaciada exitosamente',
        summary: {
          totalDeleted,
          tablesProcessed: results.length,
          successCount,
          failCount,
        },
        details: results,
      }),
    };
  } catch (error) {
    console.error('Error vaciando la base de datos:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: `Error vaciando la base de datos: ${error.message}`,
      }),
    };
  }
};

