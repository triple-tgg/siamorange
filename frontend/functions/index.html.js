/**
 * Cloudflare Pages Function — Redirect /index.html to /
 * Preserves all query parameters (e.g. ?aff=XYZ) and provides a clean canonical URL.
 */
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // We only redirect if it strictly matches /index.html (case-insensitive or exact)
  if (url.pathname.toLowerCase().endsWith('/index.html')) {
    // Strip '/index.html' from the end of the pathname
    const cleanPath = url.pathname.substring(0, url.pathname.length - 10);
    
    // Create target URL preserving all query string parameters and hashes
    const targetUrl = new URL(url);
    targetUrl.pathname = cleanPath;

    return new Response(null, {
      status: 301,
      headers: {
        'Location': targetUrl.toString(),
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  }

  // Fallback to continue request (should not normally be hit for /index.html)
  return context.next();
}
