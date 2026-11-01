// Tiene l'app sul telefono: apre subito con la versione salvata e scarica quella nuova in rete.
// Quando carichi un index.html nuovo su GitHub, basta chiudere e riaprire l'app (al massimo due volte).
const CACHE = 'dieta-v1';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname.endsWith('google.com') || url.hostname.endsWith('googleusercontent.com')) return; // i dati vanno sempre in rete
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return;
  // pagina: prova la rete per 1,5 secondi, altrimenti usa la copia salvata
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      const cached = await caches.match('index.html');
      const net = fetch(e.request).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put('index.html', r.clone())); return r; });
      if (!cached) return net;
      const timeout = new Promise(res => setTimeout(() => res(cached), 1500));
      return Promise.race([net.catch(() => cached), timeout]);
    })());
    return;
  }
  // resto (icone, caratteri): copia salvata subito, aggiornata in background
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok || r.type === 'opaque') caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; }).catch(() => hit);
    return hit || net;
  }));
});
