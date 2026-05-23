/**
 * Upload route — handles slip file upload to R2
 * POST /api/upload-slip
 */
import { Hono } from 'hono';

const upload = new Hono();

/**
 * Upload payment slip image
 * POST /api/upload-slip
 * Body: multipart/form-data with fields:
 *   - slip_upload: File (JPEG/PNG)
 *   - order_id: string
 */
upload.post('/', async (c) => {
  const env = c.env;

  if (!env.SLIPS_BUCKET) {
    return c.json({ error: 'R2 storage not configured' }, 500);
  }

  try {
    const formData = await c.req.formData();
    const file = formData.get('slip_upload');
    const orderId = formData.get('order_id') || `unknown-${Date.now()}`;

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file uploaded' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Only JPEG/PNG images are allowed' }, 400);
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ error: 'File size must be under 5MB' }, 400);
    }

    // Upload to R2
    const r2Key = `slips/${orderId}/${file.name}`;
    const arrayBuffer = await file.arrayBuffer();

    await env.SLIPS_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        orderId,
        uploadedAt: new Date().toISOString(),
      },
    });

    return c.json({
      success: true,
      key: r2Key,
      filename: file.name,
      size: file.size,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

export default upload;
