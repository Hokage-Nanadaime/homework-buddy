import { numberToWords, wordsToNumber } from './numbers';
import type { Question } from './question';
import type { Rng } from './rng';

export const OPTION_LABELS = ['i', 'ii', 'iii', 'iv'] as const;

export interface McqOptions {
  /** Four unique options, in the order shown as (i) to (iv). */
  options: string[];
  /** Index (0 to 3) of the right option. */
  correct: number;
}

const numeric = (s: string): boolean => /^\d+$/.test(s.trim());

/** Numbers found in a question's facts (top level numbers and flat arrays of numbers). */
function factNumbers(facts: Record<string, unknown>): number[] {
  const out: number[] = [];
  for (const v of Object.values(facts)) {
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
    else if (Array.isArray(v)) for (const x of v) if (typeof x === 'number' && Number.isFinite(x)) out.push(x);
  }
  return [...new Set(out)].slice(0, 6);
}

/** Plausible wrong numbers for a whole-number answer, best first within each kind. */
export function numberDistractors(answer: number, facts: Record<string, unknown>, rng: Rng, max = 99999): number[] {
  const groups: number[][] = [];
  const s = String(answer);
  // off by one / ten / hundred (the usual slips in counting and carrying)
  groups.push(rng.shuffle([answer + 1, answer - 1, answer + 10, answer - 10, answer + 100, answer - 100]));
  // digits swapped or a place-value slip
  const slips: number[] = [];
  for (let i = 0; i + 1 < s.length; i++) {
    if (s[i] !== s[i + 1]) {
      const t = s.split('');
      [t[i], t[i + 1]] = [t[i + 1]!, t[i]!];
      if (t[0] !== '0') slips.push(Number(t.join('')));
    }
  }
  if (s.length >= 2) slips.push(answer * 10);
  if (answer >= 10 && answer % 10 === 0) slips.push(answer / 10);
  if (s.length >= 3) slips.push(Number(s.replace(/0/, '')) || answer + 1); // a zero dropped
  if (s.length >= 2 && !s.includes('0')) slips.push(Number(`${s[0]}0${s.slice(1)}`)); // a zero put in
  groups.push(rng.shuffle(slips));
  // wrong operation on the numbers in the question
  const f = factNumbers(facts);
  const ops: number[] = [];
  for (let i = 0; i < f.length; i++) {
    for (let j = 0; j < f.length; j++) {
      if (i === j) continue;
      ops.push(f[i]! + f[j]!, Math.abs(f[i]! - f[j]!), f[i]! * f[j]!);
      if (f[j]! > 0 && f[i]! % f[j]! === 0) ops.push(f[i]! / f[j]!);
    }
  }
  groups.push(rng.shuffle(ops).filter((n) => Math.abs(n - answer) <= Math.max(answer, 20)));
  // small steps as a last resort
  groups.push([answer + 2, answer + 3, answer - 2, answer + 5, answer - 5, answer + 4, answer + 6, answer + 20, answer + 7]);

  const picked: number[] = [];
  const ok = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= max && n !== answer && !picked.includes(n);
  // take one from each group first so the options differ in kind, then fill
  for (const g of groups) {
    const n = g.find(ok);
    if (n !== undefined) picked.push(n);
  }
  for (const g of groups) for (const n of g) if (picked.length < 3 && ok(n)) picked.push(n);
  return picked.slice(0, 3);
}

const withUnit = (n: number, unit?: string): string => (!unit ? String(n) : unit === 'Rs' || unit === '₹' ? `Rs ${n}` : `${n} ${unit}`);

/** The kind of conversion available, or null when four proper options cannot be made. */
export function canMakeMcq(q: Question): boolean {
  if (q.inputs.length !== 1) return false;
  const i = q.inputs[0]!;
  const a = i.accepted[0] ?? '';
  if (i.mode === 'number') return numeric(a);
  if (i.mode === 'words') return !Number.isNaN(wordsToNumber(a)) && wordsToNumber(a) <= 99999;
  if (i.mode === 'choice') {
    const ch = i.choices ?? [];
    return ch.length >= 4 || (ch.length >= 2 && ch.every(numeric));
  }
  return false;
}

/** Four options (i) to (iv) with one right answer; null when not possible. Same rng, same options. */
export function buildMcqOptions(q: Question, rng: Rng): McqOptions | null {
  if (!canMakeMcq(q)) return null;
  const i = q.inputs[0]!;
  const right = i.accepted[0]!;
  let wrong: string[];
  if (i.mode === 'number') {
    wrong = numberDistractors(Number(right), q.facts, rng).map((n) => withUnit(n, i.unit));
  } else if (i.mode === 'words') {
    wrong = numberDistractors(wordsToNumber(right), q.facts, rng).map(numberToWords);
  } else {
    const ch = (i.choices ?? []).filter((c) => c !== right);
    wrong = rng.shuffle(ch).slice(0, 3);
    if (wrong.length < 3) {
      const extra = numberDistractors(Number(right), q.facts, rng, 99999).map(String).filter((c) => !ch.includes(c));
      wrong = [...wrong, ...extra].slice(0, 3);
    }
  }
  const shownRight = i.mode === 'number' ? withUnit(Number(right), i.unit) : right;
  const norm = (s: string): string => s.trim().toLowerCase().replace(/^rs\s*/, '');
  const all = [shownRight, ...wrong];
  if (wrong.length < 3 || new Set(all.map(norm)).size !== 4) return null;
  const order = rng.shuffle([0, 1, 2, 3]);
  const options = order.map((k) => all[k]!);
  return { options, correct: options.indexOf(shownRight) };
}
