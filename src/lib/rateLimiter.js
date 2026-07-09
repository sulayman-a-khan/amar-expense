// Best-effort in-memory rate limiter for the PIN endpoint.
//
// Caveat: this resets whenever the server process restarts (e.g. a fresh
// serverless instance spins up), so it is NOT a hard guarantee against
// brute-forcing on platforms that scale to many instances. But it stops
// the common case — a script hammering the endpoint against one running
// process — and turns "10,000 instant guesses" into "5 guesses per 15
// minutes," which is enough friction for a personal/small-team app.
//
// For a stronger guarantee, this could be swapped to track attempts in
// MongoDB (already connected via src/lib/db.js) instead of memory.

const attempts = new Map(); // key -> { count, firstAttemptAt, lockedUntil }

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export function checkRateLimit(key) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (entry?.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - now };
  }

  // Window expired (or no entry yet) — start fresh.
  if (!entry || now - entry.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 0, firstAttemptAt: now, lockedUntil: 0 });
  }

  return { allowed: true };
}

export function recordFailure(key) {
  const now = Date.now();
  const entry = attempts.get(key) || { count: 0, firstAttemptAt: now, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_MS;
  }
  attempts.set(key, entry);
}

export function recordSuccess(key) {
  attempts.delete(key);
}
