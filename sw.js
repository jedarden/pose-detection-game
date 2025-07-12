/**
 * Service Worker for Pose Detection Game
 * Provides offline capability and caching strategies
 */

const CACHE_NAME = 'pose-game-v1.0.0';
const DATA_CACHE_NAME = 'pose-game-data-v1.0.0';

// Files to cache for offline functionality
const FILES_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './src/css/mobile-styles.css',
    './src/js/main.js',
    './src/js/mobile-optimizer.js',
    './src/js/pose-detector.js',
    './src/js/touch-handler.js',
    './src/js/pwa-manager.js',
    './src/js/game-engine.js',
    './icons/icon-192.png',
    './icons/icon-512.png',
    // TensorFlow.js and pose detection models will be cached dynamically
];

// URLs to cache dynamically (external resources)
const DYNAMIC_CACHE_URLS = [
    'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.min.js',
    'https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection@2.0.0/dist/pose-detection.min.js'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
    console.log('[SW] Install event');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching app shell');
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] App shell cached successfully');
                // Skip waiting to activate immediately
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Pre-caching failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                            console.log('[SW] Removing old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Old caches cleaned up');
                // Take control of all pages immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache with fallback strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle different types of requests with appropriate strategies
    if (request.destination === 'document') {
        // HTML pages - Network first, cache fallback
        event.respondWith(networkFirstStrategy(request));
    } else if (request.destination === 'script' || request.destination === 'style') {
        // JS/CSS - Cache first, network fallback
        event.respondWith(cacheFirstStrategy(request));
    } else if (request.destination === 'image') {
        // Images - Cache first with dynamic caching
        event.respondWith(cacheFirstWithDynamicCaching(request));
    } else if (url.hostname === 'cdn.jsdelivr.net') {
        // CDN resources - Cache first with long-term storage
        event.respondWith(cacheCDNResources(request));
    } else {
        // Other requests - Network first
        event.respondWith(networkFirstStrategy(request));
    }
});

// Network first strategy - for HTML and API calls
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for HTML requests
        if (request.destination === 'document') {
            return caches.match('./index.html');
        }
        
        throw error;
    }
}

// Cache first strategy - for static assets
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Failed to fetch resource:', request.url, error);
        throw error;
    }
}

// Cache first with dynamic caching - for images and assets
async function cacheFirstWithDynamicCaching(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(DATA_CACHE_NAME);
            
            // Limit cache size for images
            const keys = await cache.keys();
            if (keys.length > 50) {
                await cache.delete(keys[0]); // Remove oldest
            }
            
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Failed to fetch image:', request.url, error);
        
        // Return placeholder image for failed image requests
        return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#999">Image unavailable</text></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
        );
    }
}

// Special handling for CDN resources
async function cacheCDNResources(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Failed to fetch CDN resource:', request.url, error);
        throw error;
    }
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            console.log('[SW] Received SKIP_WAITING message');
            self.skipWaiting();
            break;
            
        case 'GET_VERSION':
            event.ports[0].postMessage({
                type: 'VERSION',
                version: CACHE_NAME
            });
            break;
            
        case 'CACHE_URLS':
            // Cache additional URLs dynamically
            cacheAdditionalUrls(data.urls);
            break;
            
        case 'CLEAR_CACHE':
            // Clear specific cache
            clearCache(data.cacheName);
            break;
            
        default:
            console.log('[SW] Unknown message type:', type);
    }
});

// Cache additional URLs dynamically
async function cacheAdditionalUrls(urls) {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        await cache.addAll(urls);
        console.log('[SW] Additional URLs cached:', urls.length);
    } catch (error) {
        console.error('[SW] Failed to cache additional URLs:', error);
    }
}

// Clear specific cache
async function clearCache(cacheName) {
    try {
        const deleted = await caches.delete(cacheName || CACHE_NAME);
        console.log('[SW] Cache cleared:', cacheName, deleted);
    } catch (error) {
        console.error('[SW] Failed to clear cache:', error);
    }
}

// Background sync for offline game data
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'game-data-sync') {
        event.waitUntil(syncGameData());
    }
});

// Sync game data when back online
async function syncGameData() {
    try {
        // Get stored game data
        const gameData = await getStoredGameData();
        
        if (gameData && gameData.length > 0) {
            // Send data to server (if you have a backend)
            // For now, just log the data
            console.log('[SW] Syncing game data:', gameData);
            
            // Clear synced data
            await clearStoredGameData();
        }
    } catch (error) {
        console.error('[SW] Failed to sync game data:', error);
    }
}

// Helper functions for game data storage
async function getStoredGameData() {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        const response = await cache.match('game-data');
        
        if (response) {
            return await response.json();
        }
    } catch (error) {
        console.error('[SW] Failed to get stored game data:', error);
    }
    return null;
}

async function clearStoredGameData() {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        await cache.delete('game-data');
    } catch (error) {
        console.error('[SW] Failed to clear stored game data:', error);
    }
}

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);
    
    const options = {
        body: 'Come back and beat your high score!',
        icon: './icons/icon-192.png',
        badge: './icons/icon-72.png',
        data: {
            url: './'
        },
        actions: [
            {
                action: 'play',
                title: 'Play Now'
            },
            {
                action: 'close',
                title: 'Later'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('Pose Detection Game', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event);
    
    event.notification.close();
    
    if (event.action === 'play') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
    }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('[SW] Periodic sync:', event.tag);
    
    if (event.tag === 'update-check') {
        event.waitUntil(checkForUpdates());
    }
});

// Check for app updates
async function checkForUpdates() {
    try {
        const response = await fetch('./manifest.json');
        
        if (response.ok) {
            console.log('[SW] App update check completed');
            // You could compare versions and trigger update notifications
        }
    } catch (error) {
        console.error('[SW] Update check failed:', error);
    }
}

// Error handling
self.addEventListener('error', (event) => {
    console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
    console.error('[SW] Unhandled promise rejection:', event.reason);
});

console.log('[SW] Service Worker loaded successfully');