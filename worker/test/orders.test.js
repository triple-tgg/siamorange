/**
 * Tests for Orders route — POST /api/orders
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('Orders — POST /api/orders', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards JSON order to n8n webhook', async () => {
    const orderResponse = { order_id: 'SMO-999888', status: 'received' };

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(orderResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const orderData = {
      order_id: 'SMO-999888',
      name: 'ทดสอบ',
      phone: '0812345678',
      order_total: 500,
    };

    const res = await appRequest(app, '/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://test.example.com',
      },
      body: JSON.stringify(orderData),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.order_id).toBe('SMO-999888');
  });

  it('returns 500 when webhook is not configured', async () => {
    const env = createMockEnv({ N8N_ORDER_WEBHOOK: undefined });

    const res = await appRequest(
      app,
      '/api/orders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ test: true }),
      },
      env,
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('webhook not configured');
  });

  it('handles n8n failure gracefully', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await appRequest(app, '/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://test.example.com',
      },
      body: JSON.stringify({ test: true }),
    });

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Failed to process order');
  });

  it('returns GET as 404 (only POST is supported)', async () => {
    const res = await appRequest(app, '/api/orders', {
      method: 'GET',
      headers: { Origin: 'https://test.example.com' },
    });

    expect(res.status).toBe(404);
  });
});
