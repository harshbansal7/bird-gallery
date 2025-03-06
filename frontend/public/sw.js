// Service Worker for BirdGallery - Image caching and offline capabilities

const CACHE_NAME = 'bird-gallery-v1';
const RUNTIME_CACHE = 'bird-gallery-runtime';

// Resources to cache on install (App Shell)
const APP_SHELL = [
  '/',
  '/index.html',
  '/vite.svg',
  '/assets/index.css',
  '/assets/index.js',
];

// Image file extensions for runtime caching
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(cachesToDelete.map((cacheToDelete) => {
        return caches.delete(cacheToDelete);
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin && !url.hostname.includes('fivemerr.com')) {
    return;
  }

  // Use cache-first strategy for images
  const isImage = IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext));
  if (isImage) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // For API requests and other resources, use network-first strategy
  event.respondWith(networkFirst(event.request));
});

// Cache-first strategy - good for static assets like images
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // If not in cache, fetch from network and cache it for next time
    const response = await fetch(request);
    
    // Only cache valid responses
    if (!response || response.status !== 200 || response.type !== 'basic') {
      return response;
    }
    
    // Clone the response as it can only be consumed once
    const responseToCache = response.clone();
    
    // Store in runtime cache
    caches.open(RUNTIME_CACHE)
      .then((cache) => {
        cache.put(request, responseToCache);
      });
    
    return response;
  } catch (error) {
    // If network fails, return a fallback if we have one
    return caches.match('/vite.svg'); // Placeholder fallback image
  }
}

// Network-first strategy - good for API requests and dynamic content
async function networkFirst(request) {
  try {
    // Try network first
    const response = await fetch(request);
    
    // If successful, clone and cache
    if (response && response.status === 200) {
      const responseToCache = response.clone();
      caches.open(RUNTIME_CACHE)
        .then((cache) => {
          cache.put(request, responseToCache);
        });
    }
    
    return response;
  } catch (error) {
    // If network fails, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If nothing in cache for non-GET requests, return error
    if (request.method !== 'GET') {
      throw error;
    }
    
    // For GET requests, return a simple offline page or fallback
    // You could create a dedicated offline page
    return caches.match('/index.html');
  }
}

// Periodically clean up old image caches
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_IMAGES') {
    caches.open(RUNTIME_CACHE).then((cache) => {
      cache.keys().then((keys) => {
        keys.forEach((request) => {
          // Only delete image files that are older than a week
          const url = new URL(request.url);
          const isImage = IMAGE_EXTENSIONS.some(ext => url.pathname.toLowerCase().endsWith(ext));
          
          if (isImage) {
            // Delete the cached image
            cache.delete(request);
          }
        });
      });
    });
  }
});