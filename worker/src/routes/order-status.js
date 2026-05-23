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

export default orderStatus;
