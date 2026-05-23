/**
 * Tests for Members routes — POST /api/members/register and /api/members/check
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('Members Routes', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Register ─────────────────────────────────────
  describe('POST /api/members/register', () => {
    it('forwards member registration to n8n', async () => {
      const mockResponse = { success: true, member_id: 'M001' };
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const formData = new FormData();
      formData.set('member_json', JSON.stringify({ name: 'ทดสอบ', phone: '0812345678' }));

      const res = await appRequest(app, '/api/members/register', {
        method: 'POST',
        headers: { Origin: 'https://test.example.com' },
        body: formData,
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it('returns 500 when webhook is not configured', async () => {
      const env = createMockEnv({ N8N_MEMBER_WEBHOOK: undefined });
      const formData = new FormData();
      formData.set('member_json', JSON.stringify({ name: 'test' }));

      const res = await appRequest(
        app,
        '/api/members/register',
        {
          method: 'POST',
          headers: { Origin: 'https://test.example.com' },
          body: formData,
        },
        env,
      );

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('webhook not configured');
    });

    it('handles n8n failure gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network timeout'));

      const formData = new FormData();
      formData.set('member_json', JSON.stringify({ name: 'test' }));

      const res = await appRequest(app, '/api/members/register', {
        method: 'POST',
        headers: { Origin: 'https://test.example.com' },
        body: formData,
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('Failed to register');
    });
  });

  // ─── Check Member ─────────────────────────────────
  describe('POST /api/members/check', () => {
    it('checks member by LINE UUID', async () => {
      const memberData = { exists: true, name: 'สมชาย', phone: '0891234567' };
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify(memberData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const res = await appRequest(app, '/api/members/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ uuid: 'U1234567890abcdef' }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.exists).toBe(true);
      expect(body.name).toBe('สมชาย');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://n8n.example.com/webhook/members-check',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ uuid: 'U1234567890abcdef' }),
        }),
      );
    });

    it('returns 500 when webhook is not configured', async () => {
      const env = createMockEnv({ N8N_MEMBER_CHECK_WEBHOOK: undefined });

      const res = await appRequest(
        app,
        '/api/members/check',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Origin: 'https://test.example.com',
          },
          body: JSON.stringify({ uuid: 'test' }),
        },
        env,
      );

      expect(res.status).toBe(500);
    });

    it('handles n8n failure gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Timeout'));

      const res = await appRequest(app, '/api/members/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://test.example.com',
        },
        body: JSON.stringify({ uuid: 'test' }),
      });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toContain('Failed to check');
    });
  });
});
