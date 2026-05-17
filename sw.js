// Served from alex9532.github.io/sw.js — scope is /
// Controls both /wcptvs/claudenowtries/* and /webcontainer/connect/*

const APP_PATH = '/wcptvs/claudenowtries/';
const CONNECT_HTML = APP_PATH + 'connect.html';

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // /webcontainer/connect/* — serve connect.html with COEP: unsafe-none
  if (url.pathname.startsWith('/webcontainer/connect/')) {
    event.respondWith(
      fetch(CONNECT_HTML).then((res) => {
        const h = new Headers(res.headers);
        h.set('Cross-Origin-Opener-Policy', 'same-origin');
        h.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
        h.set('Content-Type', 'text/html');
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
      })
    );
    return;
  }

  // App pages — inject COOP + COEP for cross-origin isolation
  if (url.pathname.startsWith(APP_PATH)) {
    event.respondWith(
      fetch(event.request).then((res) => {
        const h = new Headers(res.headers);
        h.set('Cross-Origin-Opener-Policy', 'same-origin');
        h.set('Cross-Origin-Embedder-Policy', 'require-corp');
        return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
      })
    );
    return;
  }
});
