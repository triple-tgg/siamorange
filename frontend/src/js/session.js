/**
 * Siam Orange V2 — Session & Cookie Management
 * (Migrated from persistent.js with ES module exports)
 */

const TOKEN_NAME = 'userToken';

/**
 * Generate UUID v4
 */
function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

/**
 * Set a cookie
 */
function setCookie(name, value, days = 7, options = {}) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));

  let cookie = `${name}=${encodeURIComponent(value)}`;
  cookie += `; expires=${d.toUTCString()}`;
  cookie += `; path=${options.path || '/'}`;

  if (options.secure) cookie += '; Secure';
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  if (options.domain) cookie += `; Domain=${options.domain}`;

  document.cookie = cookie;
}

function setSessionToken(name, value) {
  let cookie = `${name}=${encodeURIComponent(value)}`;
  cookie += `; path=/`;
  cookie += `; SameSite=Strict`;
  document.cookie = cookie;
}

/**
 * Get a cookie value
 */
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop().split(';').shift());
  }
  return null;
}

/**
 * Check if a cookie exists
 */
function hasCookie(name) {
  return getCookie(name) !== null;
}

/**
 * User Session Manager
 */
export const UserSession = {
  create() {
    console.log('Creating new user session...');
    const token = generateUUID();
    const days = 3650; // 10 years
    setCookie(TOKEN_NAME, token, days, {
      sameSite: 'Strict'
    });
    return token;
  },

  get() {
    const token = getCookie(TOKEN_NAME);
    if (!token) {
      return this.create();
    }
    return token;
  },

  setAffCode(affCode) {
    setCookie('aff_code', affCode, 365, { sameSite: 'Strict' });
  },

  getAffCode() {
    return getCookie('aff_code') || null;
  },

  setLineID(lineID) {
    setSessionToken('line_uuid', lineID);
  },

  getLineID() {
    return getCookie('line_uuid') || null;
  }
};

// Auto-initialize session on load
console.log('Current session:', UserSession.get());

// Export for use in other modules
export { setCookie, getCookie, hasCookie };
