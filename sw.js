const APP_PATH = '/wcptvs/claudenowtries/';
let patchedConnectJs = null;

async function getPatchedConnectJs() {
  if (patchedConnectJs) return patchedConnectJs;
  const urls = [
    'https://esm.sh/@webcontainer/api@1.6.1/connect',
    'https://esm.sh/@webcontainer/api/connect',
  ];
  let src = null;
  let finalUrl = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (res.ok) {
        src = await res.text();
        finalUrl = res.url; // the resolved URL after redirects
        break;
      }
    } catch(e) {}
  }
  if (!src) throw new Error('Could not fetch connect.js');

  // Rewrite relative imports to absolute esm.sh URLs so they don't
  // resolve against alex9532.github.io and 404.
  const base = new URL(finalUrl);
  src = src.replace(
    /from\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g,
    (match, rel) => match.replace(rel, new URL(rel, base).href)
  );
  src = src.replace(
    /import\s*["'`](\.{1,2}\/[^"'`]+)["'`]/g,
    (match, rel) => match.replace(rel, new URL(rel, base).href)
  );

  // Patch out the pathname check
  src = src
    .replace(/\w+\.pathname\.startsWith\(["'`]\/webcontainer\/connect["'`]\)/g, 'true')
    .replace(/\/\\\/webcontainer\\\/connect[^/]*\/[a-z]*\.test\(\w+\.pathname\)/g, 'true')
    .replace(/["'`]\/webcontainer\/connect["'`]\.test\(\w+\.pathname\)/g, 'true');

  patchedConnectJs = src;
  return src;
}

// Pre-fetch on SW install so it's ready before first use
self.addEventListener('install', (event) => {
  event.waitUntil(getPatchedConnectJs().catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const CONNECT_HTML = (serverUrl) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Connecting…</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;
justify-content:center;background:#0d0f12;font-family:monospace;color:#545b6b;font-size:13px}
</style>
</head>
<body><span>connecting…</span>
<script type="module">
import{setupConnect}from'/wc-connect.js';
await setupConnect();
const serverUrl=${JSON.stringify(serverUrl)};
if(serverUrl)window.location.replace(serverUrl);
<\/script>
</body>
</html>`;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // esm.sh rewrites module import URLs to the same origin — proxy them
  // back to esm.sh so they resolve correctly instead of 404ing on GitHub Pages
  if (url.pathname.startsWith('/@webcontainer/') || url.pathname.startsWith('/esm.sh/')) {
    event.respondWith(
      fetch('https://esm.sh' + url.pathname + url.search, { redirect: 'follow' })
        .then(res => new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        }))
    );
    return;
  }
    event.respondWith(
      getPatchedConnectJs().then(src => new Response(src, {
        status: 200,
        headers: { 'Content-Type': 'application/javascript' }
      })).catch(e => new Response(`throw new Error(${JSON.stringify(e.message)})`, {
        status: 500,
        headers: { 'Content-Type': 'application/javascript' }
      }))
    );
    return;
  }

  // Serve inlined connect page at /webcontainer/connect/*
  if (url.pathname.startsWith('/webcontainer/connect/')) {
    const serverUrl = url.searchParams.get('serverUrl') || '';
    event.respondWith(new Response(CONNECT_HTML(serverUrl), {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'unsafe-none',
      }
    }));
    return;
  }

  // App pages — inject COOP + COEP
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
