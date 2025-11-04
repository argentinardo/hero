/**
 * Service Worker para NEW H.E.R.O.
 * 
 * Este Service Worker permite:
 * - Cacheo de recursos para funcionamiento offline
 * - Instalación como PWA
 * - Mejor rendimiento mediante cacheo inteligente
 */

const CACHE_NAME = 'new-hero-v1';
const RUNTIME_CACHE = 'new-hero-runtime-v1';

// Recursos críticos que se cachean inmediatamente
const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cacheando recursos críticos');
        // Cachear recursos críticos, pero no fallar si algunos no existen
        return cache.addAll(PRECACHE_RESOURCES).catch((err) => {
          console.warn('[Service Worker] Error cacheando algunos recursos:', err);
        });
      })
      .then(() => {
        // Forzar activación inmediata
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Eliminar caches antiguos
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Eliminando cache antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => {
      // Tomar control de todas las páginas inmediatamente
      return self.clients.claim();
    })
  );
});

// Estrategia de cache: Network First, Fallback to Cache
// Esto permite que la app funcione offline pero siempre intenta actualizar
self.addEventListener('fetch', (event) => {
  // Solo manejar requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requests a APIs externas y servicios
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    // Para recursos externos, usar cache si está disponible
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Estrategia Network First para recursos propios
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, cachearla
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Si falla la red, intentar desde cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Si no hay cache, devolver respuesta básica para HTML
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

