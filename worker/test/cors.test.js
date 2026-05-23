/**
 * Tests for CORS middleware
 */
import { describe, it, expect } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('CORS Middleware', () => {
  describe('Preflight (OPTIONS)', () => {
    it('returns 204 for OPTIONS request from allowed origin', async () => {
      const res = await appRequest(app, '/api/health', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://test.example.com',
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://test.example.com');
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('returns empty origin for disallowed origin', async () => {
      const res = await appRequest(app, '/api/health', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil.example.com',
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('');
    });
  });

  describe('Normal requests', () => {
    it('sets CORS headers for allowed origin on GET', async () => {
      const res = await appRequest(app, '/api/health', {
        headers: { Origin: 'https://test.example.com' },
      });

      expect(res.status).toBe(200);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://test.example.com');
    });

    it('does not set CORS origin for disallowed origin', async () => {
      const res = await appRequest(app, '/api/health', {
        headers: { Origin: 'https://evil.example.com' },
      });

      expect(res.status).toBe(200);
      // Origin header should not be set (or be empty)
      const corsHeader = res.headers.get('Access-Control-Allow-Origin');
      expect(!corsHeader || corsHeader === '').toBe(true);
    });

    it('handles multiple allowed origins', async () => {
      const env = createMockEnv({
        ALLOWED_ORIGINS: 'https://a.example.com,https://b.example.com',
      });

      // Origin A should be allowed
      const res1 = await appRequest(
        app,
        '/api/health',
        { headers: { Origin: 'https://a.example.com' } },
        env,
      );
      expect(res1.headers.get('Access-Control-Allow-Origin')).toBe('https://a.example.com');

      // Origin B should be allowed
      const res2 = await appRequest(
        app,
        '/api/health',
        { headers: { Origin: 'https://b.example.com' } },
        env,
      );
      expect(res2.headers.get('Access-Control-Allow-Origin')).toBe('https://b.example.com');
    });

    it('allows all origins when ALLOWED_ORIGINS is empty', async () => {
      const env = createMockEnv({ ALLOWED_ORIGINS: '' });

      const res = await appRequest(
        app,
        '/api/health',
        { headers: { Origin: 'https://anything.example.com' } },
        env,
      );
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://anything.example.com');
    });
  });
});
