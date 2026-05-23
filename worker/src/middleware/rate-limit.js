/**
 * Rate limiting middleware using Cloudflare's built-in features
 * Simple in-memory counter (per-isolate) for basic protection
 */

const rateLimitMap = new Map();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // 30 requests per minute per IP

export function rateLimitMiddleware() {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const now = Date.now();

    // Clean up old entries
    if (rateLimitMap.size > 10_000) {
      for (const [key, entry] of rateLimitMap) {
        if (now - entry.start > WINDOW_MS) {
          rateLimitMap.delete(key);
        }
      }
    }

    let entry = rateLimitMap.get(ip);
    if (!entry || now - entry.start > WINDOW_MS) {
      entry = { count: 0, start: now };
      rateLimitMap.set(ip, entry);
    }

    entry.count++;

    if (entry.count > MAX_REQUESTS) {
      return c.json(
        { error: 'Too many requests. Please try again later.' },
        429,
        { 'Retry-After': '60' }
      );
    }

    await next();
  };
}
