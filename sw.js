self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // For https://alex9532/wctvps/claudenowtries/index.html
  // Serve connect.html for any .../connect/* path under our scope.
  // CRITICAL: this page must NOT be cross-origin isolated, so we set
  // COEP: unsafe-none here — the opposite of every other route.
  if (url.pathname.includes('/connect/')) {
    const connectUrl = new URL('./connect.html', self.location.href);
    event.respondWith(
      fetch(connectUrl.href).then((response) => {
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
        headers.set('Content-Type', 'text/html');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
    );
    return;
  }

  if (url.origin === self.location.origin) {
    // Same-origin: inject COOP + COEP so the page stays cross-origin isolated
    event.respondWith(
      fetch(event.request).then((response) => {
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Opener-Policy', 'same-origin');
        headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      })
    );
  } else {
    // Cross-origin: add Cross-Origin-Resource-Policy so COEP doesn't block it.
    // Without this, any cross-origin fetch (GitHub Releases, npm registry, etc.)
    // is blocked by the browser because require-corp is active.
    event.respondWith(
      fetch(event.request, { credentials: 'omit' }).then((response) => {
        // Only reconstruct if we got a real response (not opaque status 0)
        if (!response.ok && response.type === 'opaque') return response;
        const headers = new Headers(response.headers);
        headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }).catch(() => fetch(event.request))
    );
  }
});
