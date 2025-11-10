// Script para ejecutar desde la consola del navegador
// Copia y pega esto en la consola del navegador (F12) en https://newhero.netlify.app

(async () => {
  // ⚠️ CAMBIA ESTA CLAVE por la que configuraste en Netlify
  const ADMIN_SECRET = 'mi-clave-secreta-2024';
  
  console.log('🔄 Iniciando limpieza de la base de datos...');
  
  try {
    const response = await fetch('https://newhero.netlify.app/.netlify/functions/admin-clear-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Secret': ADMIN_SECRET
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    
    if (result.ok) {
      console.log('✅ Éxito:', result.message);
      console.log('📊 Resumen:', result.summary);
      console.log('📋 Detalles:', result.details);
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error);
  }
})();

