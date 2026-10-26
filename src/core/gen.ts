import type { Rng } from './rng';

/** Small generator helpers shared by every unit. */

/** Random number with exactly `digits` digits. `noZero` keeps every digit 1-9. */
export function randomNumber(r: Rng, digits: number, noZero = false): number {
  let s = String(r.int(1, 9));
  for (let i = 1; i < digits; i++) s += String(r.int(noZero ? 1 : 0, 9));
  return Number(s);
}

/** Random number with `digits` digits where the given places (0 = leading) are zero. Leading place cannot be zero. */
export function numberWithZeros(r: Rng, digits: number, zeroAt: number[]): number {
  const ds = Array.from({ length: digits }, () => r.int(1, 9));
  for (const i of zeroAt) if (i > 0 && i < digits) ds[i] = 0;
  return Number(ds.join(''));
}

/** `count` different random numbers. */
export function distinctNumbers(r: Rng, count: number, make: () => number): number[] {
  const out = new Set<number>();
  for (let guard = 0; out.size < count && guard < 500; guard++) out.add(make());
  if (out.size < count) throw new Error('distinctNumbers: domain too small');
  return [...out];
}

/** `count` different digits, shuffled. */
export function distinctDigits(r: Rng, count: number, from = 1): number[] {
  return r.shuffle(Array.from({ length: 10 - from }, (_, i) => i + from)).slice(0, count);
}

export const NAMES = ['Rohit', 'Nitya', 'Deepak', 'Neha', 'Vicky', 'Sonal', 'Asha', 'Kabir', 'Meera', 'Arjun', 'Isha', 'Rahul', 'Tara', 'Dev', 'Anaya', 'Ishaan', 'Diya', 'Aarav'] as const;

export const joinList = (xs: readonly (string | number)[]): string => xs.join(', ');
