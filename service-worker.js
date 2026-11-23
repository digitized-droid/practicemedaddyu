/* EUnify offline app shell for GitHub Pages. Keep this file beside index.html. */
const CACHE_NAME = "pesoplan-shell-v22-money-provenance-fix";
const APP_SHELL = [
  new URL("./", self.registration.scope).href,
  new URL("./index.html", self.registration.scope).href,
  new URL("./schedules.html", self.registration.scope).href,
  new URL("./manifest.webmanifest", self.registration.scope).href,
  new URL("./supabase-config.js", self.registration.scope).href,
  new URL("./eunify-push.js?v=20261121-push-connection-fix", self.registration.scope).href,
  new URL("./logos/1.png", self.registration.scope).href,
  new URL("./instruction-images/add-expense.png", self.registration.scope).href,
  new URL("./instruction-images/add-money-received.png", self.registration.scope).href,
  new URL("./instruction-images/available-capital.png", self.registration.scope).href,
  new URL("./instruction-images/categories.png", self.registration.scope).href,
  new URL("./instruction-images/categories2.png", self.registration.scope).href,
  new URL("./instruction-images/categories3.png", self.registration.scope).href,
  new URL("./instruction-images/paid-history.png", self.registration.scope).href,
  new URL("./instruction-images/recent-activities.png", self.registration.scope).href,
  new URL("./instruction-images/reminders.png", self.registration.scope).href,
  new URL("./instruction-images/reminders2.png", self.registration.scope).href,
  new URL("./instruction-images/reports-data.png", self.registration.scope).href,
  new URL("./instruction-images/reports-data2.png", self.registration.scope).href,
  new URL("./instruction-images/reports-data3.png", self.registration.scope).href,
  new URL("./instruction-images/reports-data4.png", self.registration.scope).href,
  new URL("./instruction-images/sign-in.png", self.registration.scope).href,
  new URL("./instruction-images/sign-in2.png", self.registration.scope).href,
  new URL("./instruction-images/wishlist.png", self.registration.scope).href
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache assets concurrently with a timeout. A slow optional image or
    // network request must not leave the service worker installing indefinitely.
    await Promise.allSettled(APP_SHELL.map(async url => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);
      try {
        const response = await fetch(url, { cache: "reload", signal: controller.signal });
        if (response.ok) await cache.put(url, response);
      } catch (error) {
        console.warn("EUnify: could not pre-cache", url, error);
      } finally {
        clearTimeout(timer);
      }
    }));
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
          await cache.put(new URL(request.url).href, response.clone());
        }
        return response;
      } catch (error) {
        return (await caches.match(request.url)) ||
          (await caches.match(new URL("./index.html", self.registration.scope).href)) ||
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

// Server-delivered Web Push works even when no EUnify page is open.
self.addEventListener("push", event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = { body: event.data?.text?.() || "You have an upcoming EUnify reminder." }; }
  const title = payload.title || "EUnify reminder";
  const options = {
    body: payload.body || "You have an upcoming task or payment deadline.",
    icon: new URL("./logos/1.png", self.registration.scope).href,
    badge: new URL("./logos/1.png", self.registration.scope).href,
    tag: payload.tag || "eunify-reminder",
    renotify: false,
    data: { url: payload.url || new URL("./index.html", self.registration.scope).href }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url || new URL("./index.html", self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) { await client.focus(); if ("navigate" in client) await client.navigate(target); return; }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
