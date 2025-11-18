// Tailwind CSS Loader - Carga Tailwind desde archivo local embebido
// Versión completamente embebida sin dependencia de CDN
(function() {
  // Verificar si Tailwind ya está cargado
  if (window.tailwind) {
    console.log('[Tailwind] Ya está cargado');
    return;
  }

  // Intentar cargar desde archivo local embebido
  const script = document.createElement('script');
  script.src = '/vendor/tailwindcss-full.js';
  script.async = true;
  script.onerror = function() {
    console.warn('[Tailwind] No se pudo cargar Tailwind local, continuando sin Tailwind');
    // Crear un objeto dummy para evitar errores
    window.tailwind = window.tailwind || {
      config: function() { return {}; },
      init: function() {},
      theme: {},
      plugins: []
    };
  };
  script.onload = function() {
    console.log('[Tailwind] ✅ Cargado desde archivo local embebido');
  };
  document.head.appendChild(script);
})();

