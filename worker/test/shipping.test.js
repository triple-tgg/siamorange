/**
 * Tests for Shipping Rules route — GET /api/shipping-rules
 */
import { describe, it, expect } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('Shipping Rules — GET /api/shipping-rules', () => {
  it('returns fallback shipping rules when KV is not configured', async () => {
    const res = await appRequest(app, '/api/shipping-rules', {
      headers: { Origin: 'https://test.example.com' },
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('zones');
    expect(body).toHaveProperty('defaultFee');
    expect(body).toHaveProperty('pcFreeShipping');
    expect(body).toHaveProperty('specialEndDate');
  });

  it('returns correct zone structure', async () => {
    const res = await appRequest(app, '/api/shipping-rules', {
      headers: { Origin: 'https://test.example.com' },
    });
    const body = await res.json();

    // Verify all expected zones exist
    const expectedZones = [
      'bkk_6km', 'bkk_12km', 'bkk_20km', 'bkk_40km',
      'nonthaburi_50', 'nonthaburi_100', 'nonthaburi_150',
      'samutprakan_100', 'samutprakan_150',
    ];

    for (const zone of expectedZones) {
      expect(body.zones).toHaveProperty(zone);
      expect(body.zones[zone]).toHaveProperty('label');
      expect(body.zones[zone]).toHaveProperty('fee');
      expect(body.zones[zone]).toHaveProperty('freeThreshold');
      expect(body.zones[zone]).toHaveProperty('districts');
      expect(Array.isArray(body.zones[zone].districts)).toBe(true);
    }
  });

  it('has correct fee structure for BKK zones', async () => {
    const res = await appRequest(app, '/api/shipping-rules', {
      headers: { Origin: 'https://test.example.com' },
    });
    const body = await res.json();

    expect(body.zones.bkk_6km.fee).toBe(0);
    expect(body.zones.bkk_6km.freeThreshold).toBe(150);

    expect(body.zones.bkk_12km.fee).toBe(50);
    expect(body.zones.bkk_12km.freeThreshold).toBe(300);

    expect(body.zones.bkk_20km.fee).toBe(100);
    expect(body.zones.bkk_20km.freeThreshold).toBe(500);

    expect(body.zones.bkk_40km.fee).toBe(150);
    expect(body.zones.bkk_40km.freeThreshold).toBe(1000);
  });

  it('has correct default fee', async () => {
    const res = await appRequest(app, '/api/shipping-rules', {
      headers: { Origin: 'https://test.example.com' },
    });
    const body = await res.json();
    expect(body.defaultFee).toBe(300);
  });

  it('enables pc free shipping', async () => {
    const res = await appRequest(app, '/api/shipping-rules', {
      headers: { Origin: 'https://test.example.com' },
    });
    const body = await res.json();
    expect(body.pcFreeShipping).toBe(true);
  });

  it('sets 10-minute Cache-Control header', async () => {
    const res = await appRequest(app, '/api/shipping-rules', {
      headers: { Origin: 'https://test.example.com' },
    });

    const cc = res.headers.get('Cache-Control');
    expect(cc).toContain('public');
    expect(cc).toContain('max-age=600');
  });

  it('uses KV data when available', async () => {
    const customRules = {
      specialEndDate: '2030-12-31T23:59:59',
      zones: {},
      defaultFee: 999,
      pcFreeShipping: false,
    };
    const mockKV = {
      get: async (key, opts) => {
        if (key === 'config:shipping_rules') return customRules;
        return null;
      },
    };

    const env = createMockEnv({ PRODUCTS_KV: mockKV });
    const res = await appRequest(
      app,
      '/api/shipping-rules',
      { headers: { Origin: 'https://test.example.com' } },
      env,
    );

    const body = await res.json();
    expect(body.defaultFee).toBe(999);
    expect(body.pcFreeShipping).toBe(false);
  });

  it('includes BKK 6km districts correctly', async () => {
    const res = await appRequest(app, '/api/shipping-rules', {
      headers: { Origin: 'https://test.example.com' },
    });
    const body = await res.json();

    const bkk6 = body.zones.bkk_6km.districts;
    expect(bkk6).toContain('เขตบางกอกน้อย');
    expect(bkk6).toContain('เขตพระนคร');
    expect(bkk6).toContain('เขตธนบุรี');
    expect(bkk6.length).toBe(9);
  });
});
