import { NextResponse } from 'next/server';
import { createAuthToken } from '@/lib/authToken';
import { checkRateLimit, recordFailure, recordSuccess } from '@/lib/rateLimiter';

// PIN and signing secret both come from the environment now — see .env.local.
// Set APP_PIN to whatever PIN you want, and PIN_COOKIE_SECRET to a long
// random string (used only to sign the cookie, never shown to the user).
const PIN = process.env.APP_PIN;
const SECRET = process.env.PIN_COOKIE_SECRET;
const COOKIE_NAME = 'amr_unlocked';
const MAX_AGE_MS = 60 * 60 * 24 * 30 * 1000; // stay unlocked on this device for 30 days

export async function POST(request) {
  if (!PIN || !SECRET) {
    console.error('APP_PIN or PIN_COOKIE_SECRET is not set — refusing to authenticate.');
    return NextResponse.json({ error: 'Server misconfigured. Contact the app owner.' }, { status: 500 });
  }

  // Rate limit by IP so the 4-digit PIN can't just be scripted through in
  // a tight loop — see src/lib/rateLimiter.js for exact limits/caveats.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const { allowed, retryAfterMs } = checkRateLimit(ip);
  if (!allowed) {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60000));
    return NextResponse.json({ error: `Too many attempts. Try again in ${minutes} minute(s).` }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { pin } = body || {};
  if (typeof pin !== 'string' || pin !== PIN) {
    recordFailure(ip);
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  recordSuccess(ip);
  const token = await createAuthToken(SECRET, MAX_AGE_MS);

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE_MS / 1000,
  });
  return res;
}

