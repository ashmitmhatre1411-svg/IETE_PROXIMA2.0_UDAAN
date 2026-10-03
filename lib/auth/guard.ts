import 'server-only';
import { cookies } from 'next/headers';
import { ApiError } from '../api';
import { SESSION_COOKIE } from '../constants';
import { verifySession, type CoreSession } from './session';

/** For pages / server components: returns the session or null. */
export async function getCoreSession(): Promise<CoreSession | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/** For API routes: every state-changing or admin route calls this first. */
export async function requireCore(request: Request, opts: { mutating?: boolean } = {}): Promise<CoreSession> {
  const session = await getCoreSession();
  if (!session) throw new ApiError('UNAUTHORIZED', 401, 'Please log in as a core member to do that.');
  if (opts.mutating) assertSameOrigin(request);
  return session;
}

/** CSRF defence in depth (the cookie is also SameSite=Strict): reject cross-site POSTs. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    /* fall through */
  }
  if (!host || originHost !== host) {
    throw new ApiError('FORBIDDEN', 403, 'Cross-site requests are not allowed.');
  }
}
