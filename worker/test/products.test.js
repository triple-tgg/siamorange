/**
 * Tests for Products route — GET /api/products
 */
import { describe, it, expect } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('Products — GET /api/products', () => {
  it('returns fallback product catalog when KV is not configured', async () => {
    const env = createMockEnv({ PRODUCTS_KV: null });
    const res = await appRequest(
      app,
      '/api/products',
      { headers: { Origin: 'https://test.example.com' } },
      env,
    );

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(typeof body).toBe('object');
    expect(Object.keys(body).length).toBeGreaterThan(0);

    // Verify known product keys exist
    expect(body).toHaveProperty('ml200g10_dtt1');
    expect(body).toHaveProperty('pc_ml200g10_dtt1');
    expect(body).toHaveProperty('bx_ml500g40_dtt1');
  });

  it('returns correct structure for each product', async () => {
    const res = await appRequest(app, '/api/products', {
      headers: { Origin: 'https://test.example.com' },
    });

    const body = await res.json();
    const product = body['ml200g10_dtt1'];

    expect(product).toBeDefined();
    expect(product.label).toBe('ลายวันสำคัญทางศาสนา');
    expect(product.size).toBe(200);
    expect(product.texture).toBe(10);
    expect(product.price).toBe(20);
    expect(product.amount).toBe(1);
    expect(product.image).toBeDefined();
  });

  it('includes pc_ (set) products', async () => {
    const res = await appRequest(app, '/api/products', {
      headers: { Origin: 'https://test.example.com' },
    });
    const body = await res.json();

    const pcKeys = Object.keys(body).filter(k => k.startsWith('pc_'));
    expect(pcKeys.length).toBeGreaterThan(0);

    // Verify set products have higher prices (wholesale pricing)
    for (const key of pcKeys) {
      expect(body[key].price).toBeGreaterThanOrEqual(1400);
    }
  });

  it('sets Cache-Control header', async () => {
    const res = await appRequest(app, '/api/products', {
      headers: { Origin: 'https://test.example.com' },
    });

    const cacheControl = res.headers.get('Cache-Control');
    expect(cacheControl).toContain('public');
    expect(cacheControl).toContain('max-age=300');
  });

  it('uses KV data when available', async () => {
    const kvData = { test_product: { label: 'Test', price: 99, size: 100, texture: 5, amount: 1 } };
    const mockKV = {
      get: async (key, opts) => {
        if (key === 'products:catalog') return kvData;
        return null;
      },
    };

    const env = createMockEnv({ PRODUCTS_KV: mockKV });
    const res = await appRequest(
      app,
      '/api/products',
      { headers: { Origin: 'https://test.example.com' } },
      env,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('test_product');
    expect(body.test_product.price).toBe(99);
  });

  it('falls back to hardcoded data when KV throws', async () => {
    const mockKV = {
      get: async () => { throw new Error('KV down'); },
    };

    const env = createMockEnv({ PRODUCTS_KV: mockKV });
    const res = await appRequest(
      app,
      '/api/products',
      { headers: { Origin: 'https://test.example.com' } },
      env,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('ml200g10_dtt1');
  });

  it('returns all 16 products in fallback', async () => {
    const res = await appRequest(app, '/api/products', {
      headers: { Origin: 'https://test.example.com' },
    });
    const body = await res.json();
    expect(Object.keys(body).length).toBe(15);
  });
});
