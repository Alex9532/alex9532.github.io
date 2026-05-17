const APP_PATH = '/wcptvs/claudenowtries/';

const CONNECT_HTML = (serverUrl) => `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Connecting…</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;
justify-content:center;background:#0d0f12;font-family:monospace;color:#545b6b;font-size:13px}
</style>
</head>
<body>
<span>connecting…</span>
<script type="module">
// Proxy window.location so pathname appears as /webcontainer/connect/direct
// while the page stays on its actual URL (keeping window.opener intact).
const _realLocation = window.location;
const fakeLocation = new Proxy(_realLocation, {
  get(target, prop) {
    if (prop === 'pathname') return '/webcontainer/connect/direct';
    const val = target[prop];
    return typeof val === 'function' ? val.bind(target) : val;
  }
});
Object.defineProperty(window, 'location', {
  get: () => fakeLocation,
  configurable: true,
});

import{setupConnect}from'https://esm.sh/@webcontainer/api/connect';
await setupConnect();
const serverUrl = ${JSON.stringify(serverUrl)};
if(serverUrl) _realLocation.replace(serverUrl);
<\/script>
</body>
</html>`;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

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
