/**
 * Order status route — proxies order status queries to n8n
 * POST /api/orders/my-purchases
 * POST /api/orders/aff-purchases
 */
import { Hono } from 'hono';

const orderStatus = new Hono();

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

/**
 * Get affiliate ranking by year and month
 * GET /api/orders/affiliate-ranking
 */
orderStatus.get('/affiliate-ranking', async (c) => {
  const env = c.env;
  const webhookUrl = env.N8N_AFFILIATE_RANKING_WEBHOOK || 'https://primary-production-f112.up.railway.app/webhook/fcb23825-3d25-4f98-b502-c51a0bc14ba2';

  try {
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

    return new Response(responseBody, {
      status: n8nRes.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
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
  const webhookUrl = env.N8N_PURCHASE_RANKING_WEBHOOK || 'https://primary-production-f112.up.railway.app/webhook/7bc19f76-2b4e-4341-a9c2-782907633dd7';

  try {
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

    return new Response(responseBody, {
      status: n8nRes.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (err) {
    console.error('Purchase ranking error:', err);
    return c.json({ error: 'Failed to fetch purchase ranking' }, 500);
  }
});

export default orderStatus;
