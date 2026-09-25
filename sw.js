/* Service worker : met l'application en cache pour qu'elle démarre sans réseau.
   Après toute modification des fichiers, incrémenter VERSION pour forcer la mise à jour. */

var VERSION = 'devis-v5';

var FICHIERS = [
  './',
  'index.html',
  'config.js?v=5',
  'jspdf.umd.min.js?v=5',
  'police.js?v=5',
  'logo.js?v=5',
  'pdf.js?v=5',
  'app.js?v=5',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      .then(function (c) { return c.addAll(FICHIERS); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { return k === VERSION ? null : caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var url = e.request.url;

  // Les appels au Google Sheet ne passent jamais par le cache.
  if (url.indexOf('script.google.com') > -1 || url.indexOf('googleusercontent.com') > -1) return;
  if (e.request.method !== 'GET') return;

  // Fichiers de l'application : cache d'abord (démarrage instantané et hors ligne),
  // rafraîchis en arrière-plan quand le réseau est là.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then(function (rep) {
      var reseau = fetch(e.request).then(function (r) {
        if (r && r.status === 200 && r.type === 'basic') {
          var copie = r.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copie); });
        }
        return r;
      }).catch(function () { return rep; });
      return rep || reseau;
    })
  );
});
