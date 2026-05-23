/**
 * Tests for Rate Limiting middleware
 */
import { describe, it, expect } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('Rate Limiting Middleware', () => {
  it('allows requests under the rate limit', async () => {
    // Make a few requests — should all pass
    for (let i = 0; i < 5; i++) {
      const res = await appRequest(app, '/api/health', {
        headers: {
          Origin: 'https://test.example.com',
          'CF-Connecting-IP': '10.0.0.99',
        },
      });
      expect(res.status).toBe(200);
    }
  });

  it('blocks requests after exceeding limit (30 per minute)', async () => {
    const testIp = '10.0.0.200';

    // Send 31 requests quickly from the same IP
    let lastStatus = 200;
    for (let i = 0; i < 35; i++) {
      const res = await appRequest(app, '/api/health', {
        headers: {
          Origin: 'https://test.example.com',
          'CF-Connecting-IP': testIp,
        },
      });
      lastStatus = res.status;
      if (lastStatus === 429) break;
    }

    expect(lastStatus).toBe(429);
  });

  it('returns Retry-After header when rate limited', async () => {
    const testIp = '10.0.0.201';

    let rateLimitedRes;
    for (let i = 0; i < 35; i++) {
      const res = await appRequest(app, '/api/health', {
        headers: {
          Origin: 'https://test.example.com',
          'CF-Connecting-IP': testIp,
        },
      });
      if (res.status === 429) {
        rateLimitedRes = res;
        break;
      }
    }

    expect(rateLimitedRes).toBeDefined();
    expect(rateLimitedRes.headers.get('Retry-After')).toBe('60');
  });
});
