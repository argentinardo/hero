// Tailwind CSS Embebido - Versión standalone sin CDN
// Este script carga Tailwind CSS desde archivo local
(function() {
  // Verificar si Tailwind ya está cargado
  if (window.tailwind) {
    console.log('[Tailwind] Ya está cargado');
    return;
  }

  // Intentar cargar desde archivo local primero
  const script = document.createElement('script');
  script.src = '/vendor/tailwindcss-full.js';
  script.onerror = function() {
    console.warn('[Tailwind] No se pudo cargar Tailwind local, creando objeto dummy');
    // Crear un objeto dummy para evitar errores
    window.tailwind = {
      config: function() { return {}; },
      init: function() {},
      theme: {},
      plugins: []
    };
  };
  script.onload = function() {
    console.log('[Tailwind] ✅ Cargado desde archivo local');
  };
  document.head.appendChild(script);
})();

