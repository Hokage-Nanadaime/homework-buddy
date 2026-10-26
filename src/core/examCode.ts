import type { ExamFormatId } from './examFormats';
import { createRng } from './rng';
import { randomSeed } from './worksheet';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export interface ExamSpec {
  format: ExamFormatId;
  /** Unit numbers, ascending, no repeats. */
  units: number[];
  /** Four characters from the look-alike-free alphabet. */
  seed: string;
}

/** Any text becomes a valid 4 character seed (a valid seed stays as it is). */
export function normaliseExamSeed(seed: string | number): string {
  const s = String(seed).toUpperCase();
  if (new RegExp(`^[${ALPHABET}]{4}$`).test(s)) return s;
  const rng = createRng(`exam-seed:${s}`);
  return Array.from({ length: 4 }, () => ALPHABET[rng.int(0, ALPHABET.length - 1)]!).join('');
}

export const randomExamSeed = randomSeed;

const pad = (n: number): string => String(n).padStart(2, '0');
export const cleanUnits = (units: number[]): number[] => [...new Set(units.filter((u) => Number.isInteger(u) && u >= 1 && u <= 99))].sort((a, b) => a - b);

/** EX-A-0105-4F7K: format A, units 1 and 5. The whole book (1 to 12) is written ALL. */
export function makeExamCode(spec: ExamSpec): string {
  const units = cleanUnits(spec.units);
  const all = units.length === 12 && units[0] === 1 && units[11] === 12;
  return `EX-${spec.format}-${all ? 'ALL' : units.map(pad).join('')}-${normaliseExamSeed(spec.seed)}`;
}

/** Accepts any case, spaces, dashes, dots, and O/I/L typed for 0/1. Undefined when it is not an exam code. */
export function parseExamCode(raw: string): ExamSpec | undefined {
  const t = raw.toUpperCase().replace(/[\s\-_.]+/g, '');
  const m = /^EX([ABU])([A-Z0-9]{5,})$/.exec(t);
  if (!m) return undefined;
  const rest = m[2]!;
  const seed = rest.slice(-4);
  const mid = rest.slice(0, -4);
  if (!new RegExp(`^[${ALPHABET}]{4}$`).test(seed)) return undefined;
  const format = m[1] as ExamFormatId;
  if (mid === 'ALL') return { format, units: Array.from({ length: 12 }, (_, i) => i + 1), seed };
  const digits = mid.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (!/^(\d\d)+$/.test(digits)) return undefined;
  const units = cleanUnits(digits.match(/\d\d/g)!.map(Number));
  if (units.length === 0 || units.some((u) => u < 1 || u > 12)) return undefined;
  return { format, units, seed };
}
