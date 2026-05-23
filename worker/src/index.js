/**
 * Siam Orange API Worker — Main Entry Point
 * 
 * Routes:
 *   POST /api/orders           → Submit order (proxy to n8n)
 *   POST /api/members/register → Register member
 *   POST /api/members/check    → Check member by LINE UUID
 *   POST /api/orders/my-purchases  → Get personal orders
 *   POST /api/orders/aff-purchases → Get affiliate orders
 *   GET  /api/products         → Get product catalog
 *   GET  /api/shipping-rules   → Get shipping zone rules
 *   POST /api/upload-slip      → Upload payment slip to R2
 *   GET  /api/health           → Health check
 */
import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimitMiddleware } from './middleware/rate-limit.js';
import orders from './routes/orders.js';
import members from './routes/members.js';
import orderStatus from './routes/order-status.js';
import products from './routes/products.js';
import shipping from './routes/shipping.js';
import upload from './routes/upload.js';

const app = new Hono();

// --- Global Middleware ---
app.use('/api/*', async (c, next) => {
  // Inject env-aware CORS
  const cors = corsMiddleware(c.env);
  return cors(c, next);
});

app.use('/api/*', rateLimitMiddleware());

// --- Health Check ---
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'siamorange-api',
    environment: c.env.ENVIRONMENT || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

// --- Routes ---
app.route('/api/orders', orders);
app.route('/api/orders', orderStatus);
app.route('/api/members', members);
app.route('/api/products', products);
app.route('/api/shipping-rules', shipping);
app.route('/api/upload-slip', upload);

// --- 404 Fallback ---
app.all('*', (c) => {
  return c.json({ error: 'Not found' }, 404);
});

export default app;
