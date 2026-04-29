// Service Worker - קשת חברים
const CACHE_NAME = "keshet-v2.0";
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Varela+Round&display=swap",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
  "https://unpkg.com/@babel/standalone/babel.min.js"
];

// התקנה — אחסון ראשוני של קבצים
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn("Precache failed:", err);
      });
    })
  );
  self.skipWaiting();
});

// הפעלה — ניקוי cache ישנות
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// בקשות — Network First עם fallback ל-cache
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // לא לטפל בבקשות לא-GET
  if (request.method !== "GET") return;
  
  // לא לטפל בבקשות ל-API של Anthropic — תמיד network
  if (request.url.includes("api.anthropic.com")) return;
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // שמור ב-cache לקבצים סטטיים
        if (response.ok && (request.url.includes("unpkg.com") || request.url.includes("googleapis.com") || request.url.startsWith(self.location.origin))) {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, respClone));
        }
        return response;
      })
      .catch(() => {
        // אם אין רשת — חזור ל-cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // עבור index.html — חזור ל-/
          if (request.mode === "navigate") return caches.match("./index.html");
          throw new Error("No cache match");
        });
      })
  );
});
