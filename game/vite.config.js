import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';

// Writes sw.js with the list of every built file, so the app works offline after one visit.
function offlineCache() {
  return {
    name: 'offline-cache',
    apply: 'build',
    generateBundle(_options, bundle) {
      const pages = ['./index.html', './brawler.html', './fps.html'];
      const files = ['./', ...pages, ...Object.keys(bundle).filter((f) => !f.endsWith('.html')).map((f) => `./${f}`),
        './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
      const version = createHash('sha1').update(files.join()).digest('hex').slice(0, 10);
      const source = `// Generated at build time by vite.config.js. Keeps the app playable offline.
const CACHE = 'roof-rumble-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Cached first (instant and offline); refreshed in the background when online.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then((res) => { if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  }));
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineCache()],
  build: {
    target: 'es2022', chunkSizeWarningLimit: 1000,
    rollupOptions: { input: { menu: 'index.html', brawler: 'brawler.html', fps: 'fps.html' } },
  },
  esbuild: { target: 'es2022' },
});
