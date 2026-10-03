import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from './lib/constants';
import { verifySession } from './lib/auth/session';

/**
 * First line of defence for everything under /core and /api/core.
 * (Each API route ALSO verifies the session itself — middleware is not the only guard.)
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith('/api/');
  const isLogin = pathname === '/core/login' || pathname === '/api/core/login';

  let session = null;
  try {
    session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  } catch {
    // Missing SESSION_SECRET etc. → treat as logged out; the login route explains the problem.
  }

  if (isLogin) {
    if (session && pathname === '/core/login') return NextResponse.redirect(new URL('/core', request.url));
    return NextResponse.next();
  }

  if (!session) {
    if (isApi) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please log in as a core member to do that.' } },
        { status: 401 },
      );
    }
    const url = new URL('/core/login', request.url);
    if (pathname !== '/core') url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/core/:path*', '/api/core/:path*'] };
