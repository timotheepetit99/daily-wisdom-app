const CACHE_NAME = 'daily-wisdom-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/anecdotes.json'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('✅ Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes (offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/'))
  );
});

// Push notification reçue
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification reçue');
  
  let notificationData = {
    title: '✨ Votre anecdote du jour',
    body: 'Découvrez une nouvelle anecdote fascinante !',
    icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=wisdom&backgroundColor=FF6B9D&scale=80',
    badge: 'https://api.dicebear.com/7.x/shapes/svg?seed=badge&backgroundColor=FF6B9D&scale=40',
    vibrate: [200, 100, 200],
    tag: 'daily-wisdom',
    requireInteraction: false,
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification cliquée');
  
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si l'app est déjà ouverte, la focus
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, ouvre une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});