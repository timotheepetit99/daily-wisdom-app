const CACHE_NAME = 'daily-wisdom-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/anecdotes.json',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Cache ouvert');
      return cache.addAll(urlsToCache);
    })
  );
});

// Activation du Service Worker
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
});

// Interception des requêtes (mode offline)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - retourne la réponse
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

// Gestion des notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Notification push reçue');

  const options = {
    body: event.data ? event.data.text() : 'Découvrez votre anecdote du jour !',
    icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=wisdom&backgroundColor=FF6B9D',
    badge:
      'https://api.dicebear.com/7.x/shapes/svg?seed=badge&backgroundColor=FF6B9D',
    vibrate: [200, 100, 200],
    tag: 'daily-wisdom',
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Lire maintenant',
        icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=open&backgroundColor=10B981',
      },
      {
        action: 'close',
        title: 'Plus tard',
        icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=close&backgroundColor=EF4444',
      },
    ],
    data: {
      url: '/',
    },
  };

  event.waitUntil(
    self.registration.showNotification('✨ Daily Wisdom', options)
  );
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification cliquée:', event.action);

  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(clients.openWindow('/'));
  }
});

// Planification quotidienne (experimental)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-wisdom-sync') {
    event.waitUntil(sendDailyNotification());
  }
});

async function sendDailyNotification() {
  const notificationTime = await getStoredNotificationTime();
  const currentTime = new Date();

  // Vérifie si c'est l'heure de la notification
  if (shouldSendNotification(currentTime, notificationTime)) {
    const wisdom = await getTodayWisdom();

    self.registration.showNotification('✨ Votre anecdote du jour', {
      body: wisdom.text.substring(0, 100) + '...',
      icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=wisdom&backgroundColor=FF6B9D',
      badge:
        'https://api.dicebear.com/7.x/shapes/svg?seed=badge&backgroundColor=FF6B9D',
      vibrate: [200, 100, 200],
      tag: 'daily-wisdom',
      data: { url: '/' },
    });
  }
}

function getStoredNotificationTime() {
  // Récupère l'heure depuis IndexedDB ou retourne 09:00 par défaut
  return Promise.resolve('09:00');
}

function shouldSendNotification(currentTime, targetTime) {
  const [targetHour, targetMinute] = targetTime.split(':').map(Number);
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  return currentHour === targetHour && currentMinute === targetMinute;
}

async function getTodayWisdom() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/anecdotes.json');
    const wisdoms = await response.json();

    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
    );
    const index = dayOfYear % wisdoms.length;

    return wisdoms[index];
  } catch (error) {
    return {
      text: "Découvrez une nouvelle anecdote fascinante aujourd'hui !",
      category: 'Daily Wisdom',
      emoji: '✨',
    };
  }
}
