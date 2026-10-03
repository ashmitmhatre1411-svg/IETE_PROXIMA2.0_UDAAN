// Edge-safe (used by middleware): only Web Crypto + jose, no Node-only APIs.
import { SignJWT, jwtVerify } from 'jose';
import { SESSION_TTL_SECONDS } from '../constants';

export interface CoreSession {
  name: string;
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or shorter than 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

/** Changes whenever CORE_PASSWORD changes, so rotating the password logs everyone out. */
async function passwordFingerprint(): Promise<string> {
  const pw = process.env.CORE_PASSWORD ?? '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`pv:${pw}`));
  return Array.from(new Uint8Array(digest))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function signSession(name: string): Promise<string> {
  return new SignJWT({ name, pv: await passwordFingerprint() })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('core')
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined | null): Promise<CoreSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    if (payload.sub !== 'core' || typeof payload.name !== 'string') return null;
    if (payload.pv !== (await passwordFingerprint())) return null;
    return { name: payload.name };
  } catch {
    return null;
  }
}
