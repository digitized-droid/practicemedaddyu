/* EUnify offline app shell for GitHub Pages. Keep this file beside index.html. */
const CACHE_NAME = "pesoplan-shell-v11-instruction-image-slots";
const APP_SHELL = [
  new URL("./", self.registration.scope).href,
  new URL("./index.html", self.registration.scope).href,
  new URL("./manifest.webmanifest", self.registration.scope).href,
  new URL("./supabase-config.js", self.registration.scope).href,
  new URL("./logos/1.png", self.registration.scope).href,
  new URL("./instruction-images/sign-in.jpg", self.registration.scope).href,
  new URL("./instruction-images/settings.jpg", self.registration.scope).href,
  new URL("./instruction-images/available-capital.jpg", self.registration.scope).href,
  new URL("./instruction-images/reminders.jpg", self.registration.scope).href,
  new URL("./instruction-images/add-money-received.jpg", self.registration.scope).href,
  new URL("./instruction-images/add-expense.jpg", self.registration.scope).href,
  new URL("./instruction-images/categories.jpg", self.registration.scope).href,
  new URL("./instruction-images/wishlist.jpg", self.registration.scope).href,
  new URL("./instruction-images/reports-data.jpg", self.registration.scope).href,
  new URL("./instruction-images/recent-activities.jpg", self.registration.scope).href,
  new URL("./instruction-images/paid-history.jpg", self.registration.scope).href
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache core files individually so one optional/missing file cannot cancel installation.
    for (const url of APP_SHELL) {
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok) await cache.put(url, response);
      } catch (error) {
        console.warn("EUnify: could not pre-cache", url, error);
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("pesoplan-") && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // HTML navigation: prefer the newest hosted page, fall back to the saved app shell offline.
  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(new URL("./index.html", self.registration.scope).href, response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(new URL("./index.html", self.registration.scope).href)) ||
          (await caches.match(new URL("./", self.registration.scope).href)) ||
          new Response("EUnify is not available offline yet. Open it once while connected to the internet.", {
            status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
      }
    })());
    return;
  }

  // Guide visuals are network-first: replaced JPGs update while online, and the
  // latest successfully fetched version remains available for offline use.
  if (url.pathname.includes("/instruction-images/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: "no-cache" });
        if (response && response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        return (await cache.match(request)) || new Response("This EUnify guide image is not cached yet.", { status: 503 });
      }
    })());
    return;
  }

  // Other same-origin app assets: cached-first, then network and update the cache.
  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return new Response("This EUnify resource is not cached yet.", { status: 503 });
    }
  })());
});
