/**
 * Order status route — proxies order status queries to n8n
 * POST /api/orders/my-purchases
 * POST /api/orders/aff-purchases
 */
import { Hono } from 'hono';

const orderStatus = new Hono();

// --- Best-Effort In-Memory Cache for Rate Limit Prevention ---
const memoryCache = new Map();

function getMemoryCache(key) {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return cached.data;
}

function setMemoryCache(key, data, ttlSeconds) {
  memoryCache.set(key, {
    data,
    expiry: Date.now() + (ttlSeconds * 1000)
  });
}

async function getCachedData(env, key) {
  if (env.PRODUCTS_KV) {
    try {
      const val = await env.PRODUCTS_KV.get(key);
      if (val) return val;
    } catch (e) {
      console.error('KV get error:', e);
    }
  }
  return getMemoryCache(key);
}

async function setCachedData(env, key, data, ttlSeconds) {
  if (env.PRODUCTS_KV) {
    try {
      await env.PRODUCTS_KV.put(key, data, { expirationTtl: ttlSeconds });
    } catch (e) {
      console.error('KV put error:', e);
    }
  }
  setMemoryCache(key, data, ttlSeconds);
}

function getRankingCacheTtl(year, month) {
  // Determine if it is the current month and year
  const now = new Date();
  const currentYearBE = now.getFullYear() + 543;
  const currentMonth = now.getMonth() + 1;

  const reqYear = parseInt(year, 10);
  const reqMonth = parseInt(month, 10);

  if (isNaN(reqYear) || isNaN(reqMonth)) {
    return 300; // Default 5 mins
  }

  // If current or future month, cache for 5 minutes (300s)
  if (reqYear > currentYearBE || (reqYear === currentYearBE && reqMonth >= currentMonth)) {
    return 300;
  }

  // If past month, cache for 24 hours (86400s) because past months rankings are static
  return 86400;
}

/**
 * Get personal purchase orders by phone
 * POST /api/orders/my-purchases
 */
orderStatus.post('/my-purchases', async (c) => {
  const env = c.env;
  const webhookUrl = env.N8N_MYPURCHASE_WEBHOOK;

  if (!webhookUrl) {
    return c.json({ error: 'My purchase webhook not configured' }, 500);
  }

  try {
    const body = await c.req.json();
    
    // Validate phone
    if (!body.mobile || !/^\d{10}$/.test(body.mobile)) {
      return c.json({ error: 'Invalid phone number' }, 400);
    }

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: body.mobile }),
    });

    const responseText = await n8nRes.text();
    return new Response(responseText, {
      status: n8nRes.status,
      headers: {
        'Content-Type': n8nRes.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('My purchases error:', err);
    return c.json({ error: 'Failed to fetch purchase orders' }, 500);
  }
});

/**
 * Get affiliate purchase orders by phone
 * POST /api/orders/aff-purchases
 */
orderStatus.post('/aff-purchases', async (c) => {
  const env = c.env;
  const webhookUrl = env.N8N_AFFPURCHASE_WEBHOOK;

  if (!webhookUrl) {
    return c.json({ error: 'Affiliate purchase webhook not configured' }, 500);
  }

  try {
    const body = await c.req.json();
    
    if (!body.mobile || !/^\d{10}$/.test(body.mobile)) {
      return c.json({ error: 'Invalid phone number' }, 400);
    }

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: body.mobile }),
    });

    const responseText = await n8nRes.text();
    return new Response(responseText, {
      status: n8nRes.status,
      headers: {
        'Content-Type': n8nRes.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('Aff purchases error:', err);
    return c.json({ error: 'Failed to fetch affiliate orders' }, 500);
  }
});

orderStatus.get('/affiliate-ranking', async (c) => {
  const env = c.env;
  const request = c.req.raw;
  const cache = caches.default;

  try {
    // 1. Try to retrieve from Cloudflare Global Cache Server (CDN)
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const newHeaders = new Headers(cachedResponse.headers);
      newHeaders.set('X-Cache-Server', 'HIT');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: newHeaders,
      });
    }

    const webhookUrl = env.N8N_AFFILIATE_RANKING_WEBHOOK || 'https://primary-production-f112.up.railway.app/webhook/fcb23825-3d25-4f98-b502-c51a0bc14ba2';
    let year = c.req.query('y');
    const month = c.req.query('m');

    if (!year || !month) {
      return c.json({ error: 'Missing year or month' }, 400);
    }

    // Auto-convert Gregorian year (e.g., 2026) to Thai Buddhist Era (พ.ศ., e.g., 2569)
    const yearNum = parseInt(year, 10);
    if (!isNaN(yearNum) && yearNum < 2500) {
      year = (yearNum + 543).toString();
    }

    const n8nRes = await fetch(`${webhookUrl}?y=${year}&m=${month}`);
    const responseText = await n8nRes.text();

    // Validate response body - fallback to empty array if empty or invalid JSON
    let responseBody = responseText;
    if (!responseText || responseText.trim() === '') {
      responseBody = '[]';
    } else {
      try {
        JSON.parse(responseText);
      } catch (_) {
        responseBody = '[]';
      }
    }

    const ttl = getRankingCacheTtl(year, month);
    const response = new Response(responseBody, {
      status: n8nRes.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${ttl}`, // Tell Cloudflare CDN how long to cache
        'X-Cache-Server': 'MISS',
      },
    });

    // Store in Cloudflare Cache Server (only successful responses)
    if (n8nRes.ok) {
      c.executionCtx.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  } catch (err) {
    console.error('Affiliate ranking error:', err);
    return c.json({ error: 'Failed to fetch affiliate ranking' }, 500);
  }
});

/**
 * Get purchase ranking by year and month
 * GET /api/orders/purchase-ranking
 */
orderStatus.get('/purchase-ranking', async (c) => {
  const env = c.env;
  const request = c.req.raw;
  const cache = caches.default;

  try {
    // 1. Try to retrieve from Cloudflare Global Cache Server (CDN)
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      const newHeaders = new Headers(cachedResponse.headers);
      newHeaders.set('X-Cache-Server', 'HIT');
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        headers: newHeaders,
      });
    }

    const webhookUrl = env.N8N_PURCHASE_RANKING_WEBHOOK || 'https://primary-production-f112.up.railway.app/webhook/7bc19f76-2b4e-4341-a9c2-782907633dd7';
    let year = c.req.query('y');
    const month = c.req.query('m');

    if (!year || !month) {
      return c.json({ error: 'Missing year or month' }, 400);
    }

    // Auto-convert Gregorian year (e.g., 2026) to Thai Buddhist Era (พ.ศ., e.g., 2569)
    const yearNum = parseInt(year, 10);
    if (!isNaN(yearNum) && yearNum < 2500) {
      year = (yearNum + 543).toString();
    }

    const n8nRes = await fetch(`${webhookUrl}?y=${year}&m=${month}`);
    const responseText = await n8nRes.text();

    // Validate response body - fallback to empty array if empty or invalid JSON
    let responseBody = responseText;
    if (!responseText || responseText.trim() === '') {
      responseBody = '[]';
    } else {
      try {
        JSON.parse(responseText);
      } catch (_) {
        responseBody = '[]';
      }
    }

    const ttl = getRankingCacheTtl(year, month);
    const response = new Response(responseBody, {
      status: n8nRes.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${ttl}`, // Tell Cloudflare CDN how long to cache
        'X-Cache-Server': 'MISS',
      },
    });

    // Store in Cloudflare Cache Server (only successful responses)
    if (n8nRes.ok) {
      c.executionCtx.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  } catch (err) {
    console.error('Purchase ranking error:', err);
    return c.json({ error: 'Failed to fetch purchase ranking' }, 500);
  }
});

export default orderStatus;
