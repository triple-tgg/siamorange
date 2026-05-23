/**
 * CORS middleware for Siam Orange API Worker
 * Handles preflight (OPTIONS) and response CORS headers
 */

/**
 * @param {Object} env - Worker environment bindings
 * @returns {Function} Hono middleware
 */
export function corsMiddleware(env) {
  const allowedOrigins = (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  return async (c, next) => {
    const origin = c.req.header('Origin') || '';

    // Check if origin is allowed
    const isAllowed = allowedOrigins.length === 0 || allowedOrigins.includes(origin);
    const responseOrigin = isAllowed ? origin : '';

    // Handle preflight
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': responseOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    await next();

    // Add CORS headers to response
    if (responseOrigin) {
      c.res.headers.set('Access-Control-Allow-Origin', responseOrigin);
      c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  };
}
