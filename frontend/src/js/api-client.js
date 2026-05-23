/**
 * Siam Orange V2 — API Client
 * Replaces all direct n8n webhook calls with Worker API proxy
 */

const API_BASE = '/api';

/**
 * Submit an order
 * @param {Object} orderData — order JSON
 * @param {File|null} slipFile — payment slip image
 * @returns {Promise<Object>} — order response from n8n
 */
export async function submitOrder(orderData, slipFile) {
  const fd = new FormData();
  fd.set('order_json', JSON.stringify(orderData));
  if (slipFile) {
    fd.set('slip_upload', slipFile, slipFile.name);
  }

  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    body: fd,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Order failed: ${res.status} — ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Register a new member
 * @param {Object} memberData — member info
 * @returns {Promise<Object>}
 */
export async function registerMember(memberData) {
  const fd = new FormData();
  fd.set('member_json', JSON.stringify(memberData));

  const res = await fetch(`${API_BASE}/members/register`, {
    method: 'POST',
    body: fd,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Register failed: ${res.status}`);
  
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

/**
 * Check if a member exists by LINE UUID
 * @param {string} uuid — LINE user ID
 * @returns {Promise<Object|null>}
 */
export async function checkMember(uuid) {
  const res = await fetch(`${API_BASE}/members/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid }),
  });

  if (!res.ok) return null;
  
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Get order status by phone number
 * @param {string} mobile — 10-digit phone number
 * @returns {Promise<{myOrders: Array, affOrders: Array}>}
 */
export async function getOrderStatus(mobile) {
  // Try affiliate orders first
  const affRes = await fetch(`${API_BASE}/orders/aff-purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
  });

  let affOrders = [];
  if (affRes.ok) {
    try {
      affOrders = await affRes.json();
    } catch { /* ignore */ }
  }

  // Check if aff orders are empty/meaningless
  const hasAffData = Array.isArray(affOrders) && affOrders.length > 0 &&
    Object.keys(affOrders[0] || {}).length > 1;

  if (hasAffData) {
    return { orders: affOrders, type: 'affiliate' };
  }

  // Fallback to personal orders
  const myRes = await fetch(`${API_BASE}/orders/my-purchases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile }),
  });

  let myOrders = [];
  if (myRes.ok) {
    try {
      myOrders = await myRes.json();
    } catch { /* ignore */ }
  }

  const hasMyData = Array.isArray(myOrders) && myOrders.length > 0 &&
    Object.keys(myOrders[0] || {}).length > 1;

  if (hasMyData) {
    return { orders: myOrders, type: 'personal' };
  }

  return { orders: [], type: 'none' };
}

/**
 * Fetch product catalog
 * @returns {Promise<Object>} — product catalog keyed by SKU code
 */
export async function getProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

/**
 * Fetch shipping rules
 * @returns {Promise<Object>}
 */
export async function getShippingRules() {
  const res = await fetch(`${API_BASE}/shipping-rules`);
  if (!res.ok) throw new Error('Failed to fetch shipping rules');
  return res.json();
}
