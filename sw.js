const APP_PATH = '/wcptvs/claudenowtries/';
let patchedConnectJs = null;

// Fetch and patch connect.js once, removing the pathname check entirely
async function getPatchedConnectJs() {
  if (patchedConnectJs) return patchedConnectJs;

  const res = await fetch('https://esm.sh/@webcontainer/api/connect');
  let src = await res.text();

  // The pathname check looks like: pathname.startsWith("/webcontainer/connect")
  // or location.pathname — patch it to always return true
  src = src
    .replace(/[a-z_$]+\.pathname\.startsWith\(["'`]\/webcontainer\/connect["'`]\)/g, 'true')
    .replace(/["'`]\/webcontainer\/connect["'`]\.test\([^)]+\)/g, 'true')
    // Also handle any regex test on the pathname
    .replace(/\/\\\/webcontainer\\\/connect\/[a-z]*\.test\([^)]+\)/g, 'true');

  patchedConnectJs = src;
  return src;
}

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
// Import the patched connect.js served by our own SW at /wc-connect.js
// This version has the pathname check removed so it works from any path.
import { setupConnect } from '/wc-connect.js';
await setupConnect();
const serverUrl = ${JSON.stringify(serverUrl)};
if (serverUrl) window.location.replace(serverUrl);
<\/script>
</body>
</html>`;

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Serve the patched connect.js
  if (url.pathname === '/wc-connect.js') {
    event.respondWith(
      getPatchedConnectJs().then(src => new Response(src, {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cross-Origin-Resource-Policy': 'same-origin',
        }
      }))
    );
    return;
  }

  // Serve the connect page at /webcontainer/connect/*
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
