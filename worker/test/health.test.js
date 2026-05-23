/**
 * Tests for the Health Check endpoint and 404 fallback
 */
import { describe, it, expect } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('Health Check — GET /api/health', () => {
  it('returns status ok with service info', async () => {
    const res = await appRequest(app, '/api/health', {
      headers: { Origin: 'https://test.example.com' },
    });

    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('siamorange-api');
    expect(body.environment).toBe('test');
    expect(body.timestamp).toBeDefined();
  });

  it('includes a valid ISO timestamp', async () => {
    const res = await appRequest(app, '/api/health', {
      headers: { Origin: 'https://test.example.com' },
    });
    const body = await res.json();

    const date = new Date(body.timestamp);
    expect(date.toString()).not.toBe('Invalid Date');
  });
});

describe('404 Fallback', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await appRequest(app, '/api/nonexistent');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('returns 404 for root path', async () => {
    const res = await appRequest(app, '/');
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-api paths', async () => {
    const res = await appRequest(app, '/some/random/path');
    expect(res.status).toBe(404);
  });
});
