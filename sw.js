/* Raíces y Estrellas · copia guardada en el teléfono.
   La primera vez que se abre con cualquier internet, la página queda guardada. Si después la red del teléfono
   no llega a GitHub (pasa con algunas compañías), se abre desde lo guardado y los datos siguen llegando por Firebase.
   Siempre intenta primero la versión nueva; si en 4 segundos no responde, usa la guardada. */
const CACHE = 'rye-v4';
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const BASE = ['./reportar.html', './reportar.js', './reporte.html', './reporte.js', './app.html', './app.js', './app.css',
  './datos-lecturas.js', './datos-reporte.js', './logo-escuela.jpg', './cte.html', './cte.js', './cte-datos.js', './cte-hoja.html',
  FB + 'firebase-app.js', FB + 'firebase-auth.js', FB + 'firebase-firestore.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
const guardable = u => u.origin === location.origin || u.href.startsWith(FB) || u.host === 'fonts.googleapis.com' || u.host === 'fonts.gstatic.com' || u.host === 'cdn.jsdelivr.net';
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || !guardable(u)) return;            // Firebase (datos) va directo, nunca se guarda
  const deRed = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); } return res; });
  const guardado = () => caches.match(r).then(x => x || caches.match(r, { ignoreSearch: true }));
  e.respondWith(new Promise(resolve => {
    let listo = false;
    const usarGuardado = () => guardado().then(x => { if (x && !listo) { listo = true; resolve(x); } });
    const t = setTimeout(usarGuardado, 4000);
    deRed.then(res => { clearTimeout(t); if (!listo) { listo = true; resolve(res); } })
      .catch(() => { clearTimeout(t); guardado().then(x => { if (!listo) { listo = true; resolve(x || Response.error()); } }); });
  }));
  e.waitUntil(deRed.catch(() => {}));
});
