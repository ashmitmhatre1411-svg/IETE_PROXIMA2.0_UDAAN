import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { assertSameOrigin } from '@/lib/auth/guard';
import { SESSION_COOKIE } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 0 });
  return res;
});
