/**
 * Cloudflare Pages Function — Proxy /api/* to Worker API
 *
 * This catch-all function forwards all /api/* requests to the
 * siamorange-api Worker, keeping the frontend and API on the same domain.
 *
 * Setup:
 *   1. In Cloudflare Dashboard → Pages → siamorange-order → Settings → Functions
 *   2. Add a Service Binding:
 *      - Variable name: API
 *      - Service: siamorange-api (production) or siamorange-api-staging (staging)
 *
 * If Service Binding is not configured, falls back to direct fetch using WORKER_URL.
 */
export async function onRequest(context) {
  const { request, env, params } = context;

  // Build the API path from the catch-all params
  const apiPath = '/api/' + (params.path ? params.path.join('/') : '');
  const url = new URL(request.url);
  const queryString = url.search;

  // --- Option A: Service Binding (recommended, zero-latency) ---
  if (env.API) {
    const apiUrl = new URL(apiPath + queryString, 'https://api.internal');
    const apiRequest = new Request(apiUrl.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
    });

    return env.API.fetch(apiRequest);
  }

  // --- Option B: Direct fetch fallback (uses WORKER_URL env var) ---
  const workerBase = env.WORKER_URL || 'https://siamorange-api.sothon.workers.dev';
  const targetUrl = `${workerBase}${apiPath}${queryString}`;

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });

  const response = await fetch(proxyRequest);

  // Clone response and remove hop-by-hop headers
  const newHeaders = new Headers(response.headers);
  newHeaders.delete('connection');
  newHeaders.delete('keep-alive');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
