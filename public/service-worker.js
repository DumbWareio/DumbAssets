// Default to 1.0.0, but will be replaced by the server with the actual version from package.json
let APP_VERSION = "1.0.0";
let CACHE_NAME = `DUMBASSETS_CACHE_V${APP_VERSION}`;
const ASSETS_TO_CACHE = [];
const BASE_PATH = self.registration.scope;

// Try to get version from the service worker script URL if available
function getVersionFromURL() {
    try {
        if (self && self.location && self.location.search) {
            const urlParams = new URLSearchParams(self.location.search);
            const urlVersion = urlParams.get('v');
            if (urlVersion) {
                console.log(`Found version in URL: ${urlVersion}`);
                return urlVersion;
            }
        }
    } catch (err) {
        console.error('Error parsing version from URL:', err);
    }
    return null;
}

// Log the version we're using on initialization
console.log(`Service worker initializing with version: ${APP_VERSION}`);

// Function to update the cache name when app version changes
function updateCacheName(version) {
    if (version && version !== APP_VERSION) {
        APP_VERSION = version;
        CACHE_NAME = `DUMBASSETS_CACHE_V${APP_VERSION}`;
        console.log(`Service worker updated to use cache version: ${APP_VERSION}`);
    }
}

// Helper to prepend base path to URLs that need it
function getAssetPath(url) {
    // If the URL is external (starts with http:// or https://), don't modify it
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    // Remove any leading slashes and join with base path
    return `${BASE_PATH}${url.replace(/^\/+/, '')}`;
}

// Check if cache exists and what version it is
async function checkCacheVersion() {
    const keys = await caches.keys();
    
    // Find any existing DUMBASSETS cache
    const existingCache = keys.find(key => key.startsWith('DUMBASSETS_') && key.includes('CACHE'));
    const existingVersion = existingCache ? existingCache.split('V')[1] : null;
    
    // Check if current version cache exists
    const currentCacheExists = keys.includes(CACHE_NAME);
    
    // Check for old versions - use dynamic CACHE_NAME based on APP_VERSION
    const oldCaches = keys.filter(key => key !== CACHE_NAME && key.startsWith('DUMBASSETS_') && key.includes('CACHE'));
    const hasOldVersions = oldCaches.length > 0;
    
    return {
        currentCacheExists,
        hasOldVersions,
        oldCaches,
        existingVersion
    };
}

// Function to clean up old caches
async function cleanOldCaches() {
    const { oldCaches } = await checkCacheVersion();
    if (oldCaches.length > 0) {
        console.log("Cleaning up old caches");
        await Promise.all(
            oldCaches.map(key => {
                console.log(`Deleting old cache: ${key}`);
                return caches.delete(key);
            })
        );
    }
    return oldCaches.length > 0;
}

// Function to notify clients about version status
async function notifyClients() {
    const { existingVersion } = await checkCacheVersion();
    if (existingVersion !== APP_VERSION) {
        // Clean up old caches before notifying about updates
        await cleanOldCaches();
        
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'UPDATE_AVAILABLE',
                    currentVersion: existingVersion,
                    newVersion: APP_VERSION
                });
            });
        });
    }
}

const preload = async () => {
    console.log("Preparing to install web app cache");
    
    // Check cache status
    const { currentCacheExists, existingVersion } = await checkCacheVersion();
    
    // If current version cache already exists, no need to reinstall
    if (currentCacheExists) {
        console.log(`Cache ${CACHE_NAME} already exists, using existing cache`);
        await notifyClients(); // Still check if we need to notify about updates
        return;
    }
    
    // If we have an older version, clean old caches and notify clients
    if (existingVersion && existingVersion !== APP_VERSION) {
        console.log(`New version ${APP_VERSION} available (current: ${existingVersion})`);
        
        // Clean up any old caches to prevent reload loops
        await cleanOldCaches();
        
        await notifyClients();
        return;
    }
    
    // If no cache exists at all, do initial installation
    if (!existingVersion) {
        await installCache();
    }
};

// Function to install or update the cache
async function installCache() {
    console.log(`Installing/updating cache to version ${APP_VERSION}`);
    const cache = await caches.open(CACHE_NAME);
    
    try {
        // Clear old caches
        await cleanOldCaches();

        console.log("Fetching asset manifest...");
        const response = await fetch(getAssetPath("assets/asset-manifest.json"));
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const assets = await response.json();
        
        // Add base path to relative URLs
        const processedAssets = assets.map(asset => getAssetPath(asset));
        ASSETS_TO_CACHE.push(...processedAssets);
        
        // Log what we're caching
        console.log("Assets to cache from manifest:", ASSETS_TO_CACHE);
        await cache.addAll(ASSETS_TO_CACHE);
        console.log("Assets cached successfully");
        

        // Notify clients of successful update
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'UPDATE_COMPLETE',
                    version: APP_VERSION,
                    success: true
                });
            });
        });
    } catch (error) {
        console.error("Failed to cache assets:", error);
        // Notify clients of failed update
        self.clients.matchAll().then(clients => {
            clients.forEach(client => {
                client.postMessage({
                    type: 'UPDATE_COMPLETE',
                    version: APP_VERSION,
                    success: false,
                    error: error.message
                });
            });
        });
    }
}

self.addEventListener("install", (event) => {
    console.log(`Service Worker installing with version ${APP_VERSION}...`);
    
    event.waitUntil(
        Promise.all([
            preload(), // Preload assets and install cache
            self.skipWaiting() // Skip waiting to allow new service worker to activate immediately
        ])
    );
});

self.addEventListener("activate", (event) => {
    console.log(`Service Worker activating with version ${APP_VERSION}...`);
    
    // Force cache cleanup on activation to ensure we're using the correct version
    event.waitUntil(
        Promise.all([
            self.clients.claim(), // Take control of all clients immediately
            cleanOldCaches().then(() => {
                // After cleaning old caches, check if we need to notify clients
                return notifyClients();
            })
        ])
    );
});

self.addEventListener("fetch", (event) => {
    // Only attempt to cache GET requests
    if (event.request.method !== 'GET') {
        // For non-GET requests, just fetch from network without caching
        return event.respondWith(fetch(event.request));
    }
    
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // Return cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Clone the request because it can only be used once
                return fetch(event.request.clone())
                    .then((response) => {
                        // Don't cache if not a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Only cache files that are in our ASSETS_TO_CACHE list
                        const shouldCache = ASSETS_TO_CACHE.some(assetUrl => {
                            return event.request.url === assetUrl || 
                                   event.request.url.endsWith(assetUrl.replace(BASE_PATH, ''));
                        });

                        if (shouldCache) {
                            console.log('Caching asset from manifest:', event.request.url);
                            // Clone the response because it can only be used once
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        } 
                        // else {
                        //     console.log('Skipping cache for non-manifest file:', event.request.url);
                        // }

                        return response;
                    });
            })
            .catch(() => {
                // Return a fallback response for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match(getAssetPath('index.html'));
                }
                return new Response('Network error happened', {
                    status: 408,
                    headers: { 'Content-Type': 'text/plain' },
                });
            })
    );
});

// Listen for message events from the main script
self.addEventListener('message', async (event) => {
    // Handle SET_APP_VERSION message type
    if (event.data && event.data.type === 'SET_APP_VERSION') {
        // Update the cache name with the provided version
        updateCacheName(event.data.version);
    }
    // Handle GET_VERSION message type
    else if (event.data && event.data.type === 'GET_VERSION') {
        const { existingVersion } = await checkCacheVersion();
        
        // If app version was provided in the message, update cache name
        if (event.data.appVersion) {
            updateCacheName(event.data.appVersion);
        }
        
        // Send the current version to the client
        if (event.ports && event.ports[0]) {
            event.ports[0].postMessage({
                currentVersion: existingVersion,
                newVersion: APP_VERSION
            });
        }
    }
    // Handle PERFORM_UPDATE message type
    else if (event.data && event.data.type === 'PERFORM_UPDATE') {
        // DEPRECATED: This is no longer needed as we clear old caches and install new cache on installCache() call
        // If version was provided with the update message, use it
        // if (event.data.version)
        //     updateCacheName(event.data.version);
        
        // User has confirmed they want to update
        await installCache(); // Notify clients of the update completion is done inside installCache
    } 
    // Handle LIST_CACHED_URLS message type
    else if (event.data && event.data.type === 'LIST_CACHED_URLS') {
        // Return a list of all cached URLs for debugging
        try {
            const cache = await caches.open(CACHE_NAME);
            const requests = await cache.keys();
            const urls = requests.map(request => request.url);
            
            // Send the list of cached URLs back to the client
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                    type: 'CACHED_URLS',
                    urls: urls
                });
            }
        } catch (error) {
            console.error('Error listing cached URLs:', error);
            if (event.ports && event.ports[0]) {
                event.ports[0].postMessage({
                    type: 'ERROR',
                    error: error.message
                });
            }
        }
    }
});