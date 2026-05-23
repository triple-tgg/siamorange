/**
 * Siam Orange V2 — Utility Functions
 */

/**
 * Get query string parameter
 * @param {string} key
 * @returns {string}
 */
export function getQueryParam(key) {
  const usp = new URLSearchParams(window.location.search);
  return usp.get(key) || '';
}

/**
 * Parse number from text or element
 * @param {string|Element} src
 * @param {number} fallback
 * @returns {number}
 */
export function textNum(src, fallback = 0) {
  const raw = typeof src === 'string' ? src : (src?.textContent ?? '');
  const n = Number(String(raw).replace(/[^\\d.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Generate a new order ID
 * @returns {string} — e.g. "SMO-6512341234"
 */
export function newOrderId() {
  return `SMO-${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 9000 + 1000)}`;
}

/**
 * Format price for display (Thai locale)
 * @param {number} amount
 * @returns {string}
 */
export function formatPrice(amount) {
  return `฿${Number(amount || 0).toLocaleString('th-TH')}`;
}

/**
 * Show popup/modal with message
 * @param {string} header
 * @param {string} msg
 * @param {Function} [onClose] — callback when popup is closed
 */
export function showOrderPopup(header, msg, onClose) {
  // Remove existing popup if any
  const old = document.getElementById('order-error-popup');
  if (old) old.remove();

  const popup = document.createElement('div');
  popup.id = 'order-error-popup';
  popup.innerHTML = `
    <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.45);z-index:99999;display:flex;align-items:center;justify-content:center;">
      <div style="background:#fffdfa;border-radius:18px;max-width:340px;width:90vw;padding:32px 18px 24px 18px;text-align:center;box-shadow:0 4px 24px rgba(255,165,0,0.13);border:2.5px solid #ffa500;">
        <div style="font-size:2.5rem;">🍊</div>
        <h2 style="color:#e67e22;margin:0 0 10px 0;font-size:1.3rem;">${header}</h2>
        <div style="color:#d35400;font-size:1.05rem;margin-bottom:18px;">${msg}</div>
        <button id="order-error-popup-close-btn" style="background:#ffa500;color:#fff;font-size:1.1rem;font-weight:600;border:none;border-radius:8px;padding:10px 28px;box-shadow:0 2px 8px #ffe5b4;cursor:pointer;">ปิด</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  const closeBtn = document.getElementById('order-error-popup-close-btn');
  if (closeBtn) {
    closeBtn.onclick = function () {
      document.getElementById('order-error-popup')?.remove();
      if (typeof onClose === 'function') onClose(header);
    };
  }
}

/**
 * Show a toast message
 * @param {string} message
 * @param {number} duration — ms
 */
export function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    zIndex: '9999',
    opacity: '0',
    transition: 'opacity 0.3s ease',
  });

  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '1'; }, 50);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
