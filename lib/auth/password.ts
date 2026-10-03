import 'server-only';
import { createHash, timingSafeEqual } from 'node:crypto';

/** Constant-time comparison of the submitted password with CORE_PASSWORD (server env only). */
export function passwordMatches(input: string): boolean {
  const expected = process.env.CORE_PASSWORD;
  if (!expected) throw new Error('CORE_PASSWORD is not configured.');
  // Hash both sides so lengths are equal and timing does not leak the length.
  const a = createHash('sha256').update(input).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}
