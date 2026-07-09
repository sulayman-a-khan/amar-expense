import { NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/authToken';

// Simple PIN lock so the live link can't be opened/modified by anyone who
// just has the URL. Not meant to replace real auth — there's only one PIN,
// shared with whoever the owner wants to have access — but it stops casual
// or accidental visitors and search-engine crawlers from seeing or editing data.
const COOKIE_NAME = 'amr_unlocked';
// Signs/verifies the same way /api/auth/pin issues it — see src/lib/authToken.js.
// Must be set in the environment; without it, no cookie can ever verify,
// so the app fails closed (locked) rather than falling back to a guessable default.
const SECRET = process.env.PIN_COOKIE_SECRET;

const PUBLIC_PATHS = ['/pin', '/api/auth/pin'];

function isPublic(pathname) {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  // Static assets / Next internals (also excluded via the matcher below,
  // this is just a second safety net).
  if (pathname.startsWith('/_next')) return true;
  if (/\.(svg|png|jpg|jpeg|ico|webmanifest|css|js)$/.test(pathname)) return true;
  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const isValid = await verifyAuthToken(SECRET, cookie);
  if (isValid) return NextResponse.next();

  // API routes get a plain 401 instead of an HTML redirect, so fetch()
  // calls from any already-loaded page fail cleanly instead of getting a
  // login page's HTML back as if it were JSON.
  if (pathname.startsWith('/api')) {
    return NextResponse.json({ error: 'Locked. Enter the PIN first.' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/pin';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

