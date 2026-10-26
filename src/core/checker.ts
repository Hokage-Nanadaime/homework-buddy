import { wordsToNumber } from './numbers';
import type { Input } from './question';

/** Answer checking shared by every subject. Answers are compared as tidy text. */
export function normaliseAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^(rs\.?|₹)\s*/, '') // the rupee mark is optional, on both sides
    .replace(/(?<=\d)[,\s]+(?=\d{3}\b)/g, '') // 1,234 or 1 234 -> 1234
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '');
}

export function normaliseWords(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a list answer on commas; plain spaces also work when every piece is a number ("4 2 1 3"). */
const tokens = (s: string): string[] => {
  const byComma = s.split(/\s*[,;]\s*/).map((t) => t.trim().toLowerCase()).filter(Boolean);
  if (byComma.length === 1 && /^\d+(\s+\d+)+$/.test(byComma[0]!)) return byComma[0]!.split(/\s+/);
  return byComma;
};

/** True when the kid's answer matches any accepted answer. */
export function isCorrect(given: string, accepted: readonly string[]): boolean {
  const g = normaliseAnswer(given);
  return g !== '' && accepted.some((a) => normaliseAnswer(a) === g);
}

export interface CheckResult {
  /** true right, false wrong, null = a grown-up must check it. */
  ok: boolean | null;
  /** Specific feedback when the answer is right but in the wrong form, or other friendly detail. */
  message?: string;
}

/** The instruction shown under a box when the question does not set its own hint. */
export function defaultHint(input: Input): string | undefined {
  if (input.hint) return input.hint;
  switch (input.mode) {
    case 'number':
      return input.format === 'words' ? 'Write the answer in words' : 'Write the answer as a number';
    case 'words':
      return input.format === 'numeral' ? 'Write the answer as a number' : 'Write the answer in words';
    case 'multi':
      return 'Tap every answer that fits';
    case 'ordered':
      return 'Write them in order, separated by commas';
    case 'abacus':
      return 'Write the number of beads on each rod';
    case 'open':
      return 'Ask a grown-up to check this';
    case 'sentence':
      return 'Write your answer as a sentence';
    default:
      return undefined;
  }
}

const stripUnit = (given: string, unit?: string): string => {
  if (!unit) return given;
  const u = unit.toLowerCase();
  const g = given.trim();
  return g.toLowerCase().endsWith(u) ? g.slice(0, g.length - u.length).trim() : g;
};

/** Value of a typed number: digits (commas and spaces tolerated) or number words. NaN if neither. */
const numberValue = (raw: string): number => {
  const digits = normaliseAnswer(raw);
  if (/^\d+(\.\d+)?$/.test(digits)) return Number(digits);
  return wordsToNumber(raw);
};

/** Check one blank and say why when it is the right number in the wrong form. */
export function checkInputDetailed(input: Input, given: string): CheckResult {
  const text = stripUnit(given, input.unit);
  if (input.mode === 'number') {
    if (isCorrect(text, input.accepted)) return { ok: true };
    const answer = numberValue(input.accepted[0]!);
    const typedWords = !/\d/.test(text) && !Number.isNaN(wordsToNumber(text)) && wordsToNumber(text) === answer;
    if (typedWords) {
      return input.format === 'either' ? { ok: true } : { ok: false, message: 'That is the right number. Please write it as a number (digits).' };
    }
    return { ok: false };
  }
  if (input.mode === 'words') {
    if (normaliseWords(text) !== '' && input.accepted.some((a) => normaliseWords(a) === normaliseWords(text))) return { ok: true };
    const answer = wordsToNumber(input.accepted[0]!);
    const typedDigits = /^[\d,\s]+$/.test(text.trim()) && numberValue(text) === answer;
    if (typedDigits) {
      return input.format === 'either' ? { ok: true } : { ok: false, message: 'That is the right number. Please write it in words.' };
    }
    return { ok: false };
  }
  return { ok: checkInput(input, given) };
}

/** Check one blank by its answer mode. Returns null when a grown-up must check it. */
export function checkInput(input: Input, given: string): boolean | null {
  if (input.mode === 'number' || input.mode === 'words') return checkInputDetailed(input, given).ok;
  switch (input.mode) {
    case 'open':
    case 'sentence':
      return null;
    case 'multi': {
      const g = tokens(given).sort();
      const a = input.accepted.map((x) => x.toLowerCase()).sort();
      return g.length > 0 && g.length === a.length && g.every((t, i) => t === a[i]);
    }
    case 'ordered':
    case 'abacus': {
      const g = tokens(given);
      return g.length > 0 && g.length === input.accepted.length && g.every((t, i) => t === input.accepted[i]!.toLowerCase());
    }
    default:
      // a tapped option is one of the offered options: compare it exactly (options that differ only by a capital letter or a full stop are different)
      if (input.mode === 'choice' && input.choices?.length) return given !== '' && input.accepted.includes(given);
      if (input.caseSensitive) {
        const tidy = (t: string): string => t.trim().replace(/\s+/g, ' ').replace(/\.$/, '');
        return tidy(given) !== '' && input.accepted.some((a) => tidy(a) === tidy(given));
      }
      return isCorrect(given, input.accepted);
  }
}
