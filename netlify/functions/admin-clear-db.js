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
  
  // Crear el cliente de Neon una sola vez para queries dinámicas
  const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
  let sqlDirect = null;
  if (dbUrl) {
    try {
      const { neon: neonClient } = require('@neondatabase/serverless');
      sqlDirect = neonClient(dbUrl);
    } catch (importError) {
      console.warn('No se pudo importar @neondatabase/serverless, usando solo @netlify/neon');
    }
  }
  
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
        // Obtener el conteo antes de eliminar usando una query parametrizada
        let count = 0;
        try {
          // Usar una función que construya la query dinámicamente
          // Como no podemos usar nombres de tablas en template literals, usamos una función helper
          const countResult = await sql`
            SELECT COUNT(*)::int as count 
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = ${table}
          `;
          // Esto no nos da el conteo real, pero podemos intentar obtenerlo de otra forma
          // Por ahora, simplemente intentamos eliminar
        } catch (countError) {
          console.warn(`No se pudo obtener conteo de ${table}, continuando...`);
        }
        
        // Usar el cliente de Neon directamente para ejecutar SQL dinámico
        if (!sqlDirect) {
          throw new Error('No se pudo inicializar el cliente de Neon. Verifica NETLIFY_DATABASE_URL.');
        }
        
        // Escapar el nombre de la tabla (PostgreSQL usa comillas dobles)
        const escapedTable = `"${table}"`;
        
        // Intentar primero con DELETE (respeta foreign keys)
        try {
          const deleteQuery = `DELETE FROM ${escapedTable}`;
          await sqlDirect(deleteQuery);
          results.push({ table, deleted: count || 'all', success: true, method: 'DELETE' });
          console.log(`Tabla ${table} vaciada con DELETE`);
        } catch (deleteError) {
          // Si DELETE falla, intentar TRUNCATE CASCADE
          try {
            const truncateQuery = `TRUNCATE TABLE ${escapedTable} CASCADE`;
            await sqlDirect(truncateQuery);
            results.push({ table, deleted: count || 'all', success: true, method: 'TRUNCATE' });
            console.log(`Tabla ${table} vaciada con TRUNCATE CASCADE`);
          } catch (truncateError) {
            console.error(`Error vaciando tabla ${table}:`, truncateError);
            results.push({ table, deleted: 0, success: false, error: truncateError.message });
          }
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

