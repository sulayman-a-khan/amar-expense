// Signs and verifies the PIN-unlock cookie using HMAC-SHA256 via the Web
// Crypto API. This works unmodified in both places it's needed:
//   - src/app/api/auth/pin/route.js (Node.js route runtime) — issues tokens
//   - src/middleware.js (Edge runtime) — verifies tokens on every request
//
// The token is `${expiryTimestamp}.${signature}`. Unlike a fixed string,
// it can't be recreated by anyone who doesn't know PIN_COOKIE_SECRET, and it
// carries its own expiry so a stolen cookie can't be replayed forever.

const encoder = new TextEncoder();

async function getKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padLen = (4 - (str.length % 4)) % 4;
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Creates a signed token that's valid for `maxAgeMs` from now.
export async function createAuthToken(secret, maxAgeMs) {
  const expiry = Date.now() + maxAgeMs;
  const key = await getKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(String(expiry)));
  return `${expiry}.${toBase64Url(signature)}`;
}

// Verifies a token's signature and that it hasn't expired.
export async function verifyAuthToken(secret, token) {
  if (!secret || !token || typeof token !== 'string' || !token.includes('.')) return false;

  const [expiryStr, signatureB64] = token.split('.');
  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  try {
    const key = await getKey(secret);
    const signature = fromBase64Url(signatureB64);
    return await crypto.subtle.verify('HMAC', key, signature, encoder.encode(expiryStr));
  } catch {
    return false;
  }
}
