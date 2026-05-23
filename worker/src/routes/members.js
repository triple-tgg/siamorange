/**
 * Members route — proxies member registration/check to n8n
 * POST /api/members/register
 * POST /api/members/check
 */
import { Hono } from 'hono';

const members = new Hono();

/**
 * Register new member
 * POST /api/members/register
 */
members.post('/register', async (c) => {
  const env = c.env;
  const webhookUrl = env.N8N_MEMBER_WEBHOOK;

  if (!webhookUrl) {
    return c.json({ error: 'Member webhook not configured' }, 500);
  }

  try {
    const formData = await c.req.formData();
    
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      body: formData,
    });

    const responseText = await n8nRes.text();
    return new Response(responseText, {
      status: n8nRes.status,
      headers: {
        'Content-Type': n8nRes.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('Member register error:', err);
    return c.json({ error: 'Failed to register member' }, 500);
  }
});

/**
 * Check existing member by LINE UUID
 * POST /api/members/check
 */
members.post('/check', async (c) => {
  const env = c.env;
  const webhookUrl = env.N8N_MEMBER_CHECK_WEBHOOK;

  if (!webhookUrl) {
    return c.json({ error: 'Member check webhook not configured' }, 500);
  }

  try {
    const body = await c.req.json();
    
    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const responseText = await n8nRes.text();
    return new Response(responseText, {
      status: n8nRes.status,
      headers: {
        'Content-Type': n8nRes.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (err) {
    console.error('Member check error:', err);
    return c.json({ error: 'Failed to check member' }, 500);
  }
});

export default members;
