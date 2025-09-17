// Ting Tong Service Worker v1.0 - CORRECTED
const CACHE_NAME = 'ting-tong-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js', 
  './manifest.json',
  './tingtong.jpg',                      // FIXED: tingtong.jpg is in root
  './icon files/icon-96x96.png',        // FIXED: Icons are in subfolder
  './icon files/icon-192x192.png',      // FIXED: Icons are in subfolder
  './icon files/icon-512x512.png',      // FIXED: Icons are in subfolder
  './apple-touch-icon.png',             // If you have this file
  './favicon.ico',                      // If you have this file
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('🚀 Ting Tong SW: Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Ting Tong SW: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('❌ Ting Tong SW: Cache addAll failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('✅ Ting Tong SW: Service worker activated');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Ting Tong SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          console.log('📋 Ting Tong SW: Serving from cache:', event.request.url);
          return response;
        }
        console.log('🌐 Ting Tong SW: Fetching from network:', event.request.url);
        return fetch(event.request);
      }
    )
  );
});

// Background sync for offline task creation
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Ting Tong SW: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle offline task creation here
  console.log('📝 Ting Tong SW: Processing offline tasks...');
}

// Push notification handling - FIXED PATHS
self.addEventListener('push', event => {
  console.log('🔔 Ting Tong SW: Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'You have a task reminder!',
    icon: './icon files/icon-192x192.png',      // FIXED: Correct path
    badge: './icon files/icon-192x192.png',     // FIXED: Use existing file
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: './icon files/icon-192x192.png'   // FIXED: Correct path
      },
      {
        action: 'close',
        title: 'Close',
        icon: './icon files/icon-192x192.png'   // FIXED: Correct path
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Ting Tong Task Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('👆 Ting Tong SW: Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')  // FIXED: Use relative path
    );
  }
});