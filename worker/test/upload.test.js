/**
 * Tests for Upload route — POST /api/upload-slip
 */
import { describe, it, expect } from 'vitest';
import app from '../src/index.js';
import { appRequest, createMockEnv } from './helpers.js';

describe('Upload Slip — POST /api/upload-slip', () => {
  function createMockR2Bucket() {
    const stored = {};
    return {
      put: async (key, data, opts) => {
        stored[key] = { data, opts };
      },
      get: async (key) => stored[key] || null,
      _stored: stored,
    };
  }

  it('returns 500 when R2 is not configured', async () => {
    const env = createMockEnv({ SLIPS_BUCKET: null });

    const formData = new FormData();
    formData.set('order_id', 'SMO-123');
    const file = new File(['fake-image-data'], 'slip.jpg', { type: 'image/jpeg' });
    formData.set('slip_upload', file);

    const res = await appRequest(
      app,
      '/api/upload-slip',
      {
        method: 'POST',
        headers: { Origin: 'https://test.example.com' },
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('R2 storage not configured');
  });

  it('returns 400 when no file is uploaded', async () => {
    const mockBucket = createMockR2Bucket();
    const env = createMockEnv({ SLIPS_BUCKET: mockBucket });

    const formData = new FormData();
    formData.set('order_id', 'SMO-123');
    // No file attached

    const res = await appRequest(
      app,
      '/api/upload-slip',
      {
        method: 'POST',
        headers: { Origin: 'https://test.example.com' },
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('No file');
  });

  it('uploads valid JPEG file successfully', async () => {
    const mockBucket = createMockR2Bucket();
    const env = createMockEnv({ SLIPS_BUCKET: mockBucket });

    const formData = new FormData();
    formData.set('order_id', 'SMO-TEST123');
    const file = new File(['fake-jpeg-data'], 'payment.jpg', { type: 'image/jpeg' });
    formData.set('slip_upload', file);

    const res = await appRequest(
      app,
      '/api/upload-slip',
      {
        method: 'POST',
        headers: { Origin: 'https://test.example.com' },
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.key).toBe('slips/SMO-TEST123/payment.jpg');
    expect(body.filename).toBe('payment.jpg');

    // Verify R2 was called
    expect(mockBucket._stored).toHaveProperty('slips/SMO-TEST123/payment.jpg');
  });

  it('uploads valid PNG file successfully', async () => {
    const mockBucket = createMockR2Bucket();
    const env = createMockEnv({ SLIPS_BUCKET: mockBucket });

    const formData = new FormData();
    formData.set('order_id', 'SMO-PNG123');
    const file = new File(['fake-png-data'], 'slip.png', { type: 'image/png' });
    formData.set('slip_upload', file);

    const res = await appRequest(
      app,
      '/api/upload-slip',
      {
        method: 'POST',
        headers: { Origin: 'https://test.example.com' },
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.key).toContain('slips/SMO-PNG123/slip.png');
  });

  it('rejects non-image file types', async () => {
    const mockBucket = createMockR2Bucket();
    const env = createMockEnv({ SLIPS_BUCKET: mockBucket });

    const formData = new FormData();
    formData.set('order_id', 'SMO-BAD');
    const file = new File(['not-an-image'], 'virus.exe', { type: 'application/x-executable' });
    formData.set('slip_upload', file);

    const res = await appRequest(
      app,
      '/api/upload-slip',
      {
        method: 'POST',
        headers: { Origin: 'https://test.example.com' },
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('JPEG/PNG');
  });

  it('uses fallback order_id when not provided', async () => {
    const mockBucket = createMockR2Bucket();
    const env = createMockEnv({ SLIPS_BUCKET: mockBucket });

    const formData = new FormData();
    // No order_id
    const file = new File(['img'], 'slip.jpg', { type: 'image/jpeg' });
    formData.set('slip_upload', file);

    const res = await appRequest(
      app,
      '/api/upload-slip',
      {
        method: 'POST',
        headers: { Origin: 'https://test.example.com' },
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.key).toMatch(/^slips\/unknown-\d+\/slip\.jpg$/);
  });
});
