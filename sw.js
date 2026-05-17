// Served from alex9532.github.io/sw.js — scope is /

const APP_PATH = '/wcptvs/claudenowtries/';

// The full connect page HTML, inlined so we never need to fetch it from
// another URL. This avoids any navigation that would clear window.opener.
const CONNECT_HTML = `<!DOCTYPE html>
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
import{setupConnect}from'https://esm.sh/@webcontainer/api/connect';
const p=new URLSearchParams(window.location.search);
const serverUrl=p.get('serverUrl');
await setupConnect();
if(serverUrl)window.location.replace(serverUrl);
<\/script>
</body>
</html>`;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Serve the inlined connect page at /webcontainer/connect/* with COEP:unsafe-none.
  // Because it's inlined, no extra fetch is needed — opener is preserved.
  if (url.pathname.startsWith('/webcontainer/connect/')) {
    // Forward serverUrl query param into the response
    const serverUrl = url.searchParams.get('serverUrl') || '';
    const html = CONNECT_HTML.replace(
      "const serverUrl=p.get('serverUrl');",
      `const serverUrl=${JSON.stringify(serverUrl)};`
    );
    event.respondWith(new Response(html, {
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
