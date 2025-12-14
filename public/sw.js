// Process Optimization Tool - Service Worker
// Provides offline support and caching

const CACHE_NAME = "processopt-v1";
const OFFLINE_URL = "/offline";

// Assets to cache on install
const STATIC_ASSETS = [
  "/",
  "/offline",
  "/manifest.json",
  "/favicon.ico",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip API requests (except for specific caching)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Skip Supabase requests
  if (url.hostname.includes("supabase")) {
    return;
  }

  // Skip Next.js internal requests
  if (url.pathname.startsWith("/_next/")) {
    // Cache static assets from _next/static
    if (url.pathname.includes("/static/")) {
      event.respondWith(cacheFirst(request));
      return;
    }
    return;
  }

  // For navigation requests, use network-first strategy
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // For other requests, use cache-first strategy
  event.respondWith(cacheFirst(request));
});

// Cache-first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log("[SW] Cache-first fetch failed:", error);
    return new Response("Offline", { status: 503 });
  }
}

// Network-first with offline fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache the response for offline use
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network request failed, checking cache");
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) {
      return offlinePage;
    }
    
    return new Response("You are offline", {
      status: 503,
      headers: { "Content-Type": "text/html" },
    });
  }
}

// Background sync for offline observations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-observations") {
    event.waitUntil(syncOfflineObservations());
  }
});

async function syncOfflineObservations() {
  console.log("[SW] Syncing offline observations");
  
  // Get queued observations from IndexedDB
  const db = await openDatabase();
  const tx = db.transaction("offline-observations", "readonly");
  const store = tx.objectStore("offline-observations");
  const observations = await getAllFromStore(store);
  
  if (observations.length === 0) {
    return;
  }
  
  // Attempt to sync each observation
  for (const obs of observations) {
    try {
      const response = await fetch("/api/observations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obs.data),
      });
      
      if (response.ok) {
        // Remove from offline queue
        const deleteTx = db.transaction("offline-observations", "readwrite");
        const deleteStore = deleteTx.objectStore("offline-observations");
        await deleteFromStore(deleteStore, obs.id);
        console.log("[SW] Synced observation:", obs.id);
      }
    } catch (error) {
      console.log("[SW] Failed to sync observation:", obs.id, error);
    }
  }
}

// IndexedDB helpers
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("processopt-offline", 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("offline-observations")) {
        db.createObjectStore("offline-observations", { keyPath: "id" });
      }
    };
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromStore(store, key) {
  return new Promise((resolve, reject) => {
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Push notification handling
self.addEventListener("push", (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    tag: data.tag || "default",
    data: data.data || {},
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || "Process Optimization", options)
  );
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let url = "/dashboard";
  
  if (data.session_id) {
    url = `/sessions/${data.session_id}`;
  } else if (data.url) {
    url = data.url;
  }
  
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

