/**
 * Test helper — mock environment bindings & utilities
 */

/**
 * Create a mock env with configurable overrides
 */
export function createMockEnv(overrides = {}) {
  return {
    ENVIRONMENT: 'test',
    ALLOWED_ORIGINS: 'https://test.example.com',
    N8N_ORDER_WEBHOOK: 'https://n8n.example.com/webhook/orders',
    N8N_MEMBER_WEBHOOK: 'https://n8n.example.com/webhook/members',
    N8N_MEMBER_CHECK_WEBHOOK: 'https://n8n.example.com/webhook/members-check',
    N8N_MYPURCHASE_WEBHOOK: 'https://n8n.example.com/webhook/my-purchases',
    N8N_AFFPURCHASE_WEBHOOK: 'https://n8n.example.com/webhook/aff-purchases',
    PRODUCTS_KV: null,
    SLIPS_BUCKET: null,
    ...overrides,
  };
}

/**
 * Make a request to the Hono app with env bindings
 * @param {import('hono').Hono} app 
 * @param {string} path 
 * @param {object} options 
 * @param {object} env 
 */
export async function appRequest(app, path, options = {}, env = createMockEnv()) {
  const url = `http://localhost${path}`;
  const request = new Request(url, options);

  // Hono's fetch expects (request, env, ctx)
  return app.fetch(request, env, {});
}
