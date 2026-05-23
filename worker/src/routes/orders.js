/**
 * Orders route — proxies order submissions to n8n webhook
 * POST /api/orders
 */
import { Hono } from 'hono';

const orders = new Hono();

orders.post('/', async (c) => {
  const env = c.env;
  const webhookUrl = env.N8N_ORDER_WEBHOOK;

  if (!webhookUrl) {
    return c.json({ error: 'Order webhook not configured' }, 500);
  }

  try {
    // Read the incoming form data (includes order_json + slip_upload)
    const contentType = c.req.header('Content-Type') || '';

    let body;
    let headers = {};

    if (contentType.includes('multipart/form-data')) {
      // Forward as FormData (preserve slip file)
      const formData = await c.req.formData();

      // If R2 is bound, upload slip to R2
      const slip = formData.get('slip_upload');
      if (slip && slip instanceof File && env.SLIPS_BUCKET) {
        const orderJson = formData.get('order_json');
        let orderId = 'unknown';
        try {
          const parsed = JSON.parse(orderJson);
          orderId = parsed.order_id || orderId;
        } catch (_) { /* ignore */ }

        const r2Key = `slips/${orderId}/${slip.name}`;
        const arrayBuffer = await slip.arrayBuffer();
        await env.SLIPS_BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: { contentType: slip.type },
        });

        // Replace slip file with R2 URL reference in form data
        formData.set('slip_r2_key', r2Key);
      }

      body = formData;
      // Don't set Content-Type — fetch will auto-set boundary for FormData
    } else {
      // Forward as JSON
      body = await c.req.text();
      headers['Content-Type'] = 'application/json';
    }

    // Forward to n8n
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      body,
      headers,
    });

    const responseText = await n8nRes.text();

    // Return n8n response to frontend
    return new Response(responseText, {
      status: n8nRes.status,
      headers: {
        'Content-Type': n8nRes.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('Order proxy error:', err);
    return c.json({ error: 'Failed to process order', detail: err.message }, 500);
  }
});

export default orders;
