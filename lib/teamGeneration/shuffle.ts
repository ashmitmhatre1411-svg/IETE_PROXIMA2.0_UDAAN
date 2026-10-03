import { randomInt } from 'node:crypto';

/**
 * Fisher–Yates shuffle (unbiased). Uses crypto.randomInt, which is uniform over [0, max),
 * so every permutation is equally likely. Returns a new array; the input is untouched.
 * `rand` is injectable so tests can be deterministic.
 */
export function shuffle<T>(items: readonly T[], rand: (maxExclusive: number) => number = (n) => randomInt(n)): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
