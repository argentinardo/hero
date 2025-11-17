// Función de prueba para verificar la conexión a la base de datos
const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  console.log('=== TEST DB FUNCTION ===');
  console.log('Environment variables check:');
  console.log('NETLIFY_DATABASE_URL:', process.env.NETLIFY_DATABASE_URL ? 'PRESENTE' : 'AUSENTE');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'PRESENTE' : 'AUSENTE');
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    console.log('Intentando inicializar neon()...');
    const sql = neon();
    console.log('neon() inicializado exitosamente');

    console.log('Intentando hacer una consulta de prueba...');
    const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('Consulta exitosa:', result);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: true,
        message: 'Conexión a la base de datos exitosa',
        data: {
          currentTime: result[0]?.current_time,
          pgVersion: result[0]?.pg_version,
          hasDatabaseUrl: !!process.env.NETLIFY_DATABASE_URL,
        },
      }),
    };
  } catch (error) {
    console.error('ERROR en test-db:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: false,
        error: error.message,
        stack: error.stack,
        hasDatabaseUrl: !!process.env.NETLIFY_DATABASE_URL,
        details: {
          name: error.name,
          message: error.message,
        },
      }),
    };
  }
};

