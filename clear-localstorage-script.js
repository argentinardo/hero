// Script para limpiar localStorage del navegador
// Copia y pega esto en la consola del navegador (F12) en https://newhero.netlify.app

console.log('🧹 Limpiando localStorage...');

// Lista de claves relacionadas con campañas y usuarios
const keysToRemove = [
  'hero_campaigns',        // Campañas guardadas
  'userLevels',            // Niveles del usuario
  'isLoggedIn',            // Estado de login
  'username',              // Nombre de usuario
  'userEmail',             // Email del usuario
  'nickname',              // Nickname
  'avatar',                // Avatar
  'netlify-identity-url',  // URL de Netlify Identity
];

let removedCount = 0;
keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    removedCount++;
    console.log(`✅ Eliminado: ${key}`);
  } else {
    console.log(`ℹ️ No existe: ${key}`);
  }
});

console.log(`\n✅ Limpieza completada: ${removedCount} elementos eliminados de localStorage`);
console.log('🔄 Recarga la página para ver los cambios');

