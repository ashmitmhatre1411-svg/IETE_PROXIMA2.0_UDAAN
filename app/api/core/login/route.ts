import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, readJson, route } from '@/lib/api';
import { assertSameOrigin } from '@/lib/auth/guard';
import { passwordMatches } from '@/lib/auth/password';
import { clearLoginFailures, loginBlockedFor, recordLoginFailure } from '@/lib/auth/rateLimit';
import { signSession } from '@/lib/auth/session';
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const Body = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(60),
  password: z.string().min(1, 'Enter the core password.').max(200),
});

export const POST = route(async (request: Request) => {
  assertSameOrigin(request);

  if (!process.env.CORE_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('[login] CORE_PASSWORD / SESSION_SECRET are not configured correctly');
    throw new ApiError('NOT_CONFIGURED', 500, 'Core login is not configured on this server.');
  }

  const parsed = Body.safeParse(await readJson(request));
  if (!parsed.success) {
    throw new ApiError('BAD_REQUEST', 400, parsed.error.issues[0]?.message ?? 'Enter your name and the core password.');
  }

  const ip = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0]!.trim();
  const wait = loginBlockedFor(ip);
  if (wait > 0) {
    throw new ApiError('RATE_LIMITED', 429, `Too many wrong attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`);
  }

  if (!passwordMatches(parsed.data.password)) {
    recordLoginFailure(ip);
    await new Promise((r) => setTimeout(r, 500));
    throw new ApiError('INVALID_PASSWORD', 401, 'Incorrect password. Access denied.');
  }

  clearLoginFailures(ip);
  const token = await signSession(parsed.data.name);
  const res = NextResponse.json({ name: parsed.data.name });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
});
