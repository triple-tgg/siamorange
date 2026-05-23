/**
 * Tests for Order Status routes — POST /api/orders/my-purchases and /api/orders/aff-purchases
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('Order Status Routes', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── My Purchases ─────────────────────────────────
  describe('POST /api/orders/my-purchases', () => {
    it('proxies valid request to n8n webhook', async () => {
      const mockOrders = [
        { order_id: 'SMO-123456', order_date: '2026-01-01', order_total: 500 },
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockOrders), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const res = await appRequest(app, '/api/orders/my-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ mobile: '0812345678' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].order_id).toBe('SMO-123456');

      // Verify the webhook was called with the right data
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://n8n.example.com/webhook/my-purchases',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ mobile: '0812345678' }),
        }),
      );
    });

    it('rejects invalid phone number (too short)', async () => {
      const res = await appRequest(app, '/api/orders/my-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ mobile: '08123' }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('Invalid phone');
    });

    it('rejects missing phone number', async () => {
      const res = await appRequest(app, '/api/orders/my-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });

    it('rejects non-numeric phone', async () => {
      const res = await appRequest(app, '/api/orders/my-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ mobile: 'abcdefghij' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 500 when webhook is not configured', async () => {
      const env = createMockEnv({ N8N_MYPURCHASE_WEBHOOK: undefined });

      const res = await appRequest(
        app,
        '/api/orders/my-purchases',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://test.example.com',
          },
          body: JSON.stringify({ mobile: '0812345678' }),
        },
        env,
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('webhook not configured');
    });

    it('handles n8n fetch failure gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      const res = await appRequest(app, '/api/orders/my-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ mobile: '0812345678' }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('Failed to fetch');
    });
  });

  // ─── Affiliate Purchases ──────────────────────────
  describe('POST /api/orders/aff-purchases', () => {
    it('proxies valid request to n8n webhook', async () => {
      const mockOrders = [
        { order_id: 'SMO-654321', AFF_code: 'TESTREF', order_total: 1200 },
      ];

      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockOrders), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const res = await appRequest(app, '/api/orders/aff-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ mobile: '0898765432' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body[0].AFF_code).toBe('TESTREF');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://n8n.example.com/webhook/aff-purchases',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('rejects invalid phone number', async () => {
      const res = await appRequest(app, '/api/orders/aff-purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ mobile: '123' }),
      });

      expect(res.status).toBe(400);
    });

    it('returns 500 when webhook is not configured', async () => {
      const env = createMockEnv({ N8N_AFFPURCHASE_WEBHOOK: undefined });

      const res = await appRequest(
        app,
        '/api/orders/aff-purchases',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://test.example.com',
          },
          body: JSON.stringify({ mobile: '0812345678' }),
        },
        env,
      );

      expect(res.status).toBe(500);
    });
  });
});
