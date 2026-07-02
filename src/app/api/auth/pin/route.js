import { NextResponse } from 'next/server';

const PIN = '2233';
const COOKIE_NAME = 'amr_unlocked';
const COOKIE_VALUE = 'granted-2233';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { pin } = body || {};
  if (pin !== PIN) {
    return NextResponse.json({ error: 'Incorrect PIN.' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(COOKIE_NAME, COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // stay unlocked on this device for 30 days
  });
  return res;
}
