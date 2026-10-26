import type { Question } from './question';

const COUNT_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };

/** How many ideas a "list / name / mention three..." question asks for, or null when the question does not count. */
export function listCount(prompt: string): number | null {
  const m = /^(?:list|name|mention|write|give|state)\b[^?.]*?\b(two|three|four|five|six|[2-6])\b/i.exec(prompt.trim());
  return m ? COUNT_WORDS[m[1]!.toLowerCase()] ?? null : null;
}

const stem = (w: string): string => w.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/(ing|ed|es|s)$/, '');

export interface IdeasFound {
  found: string[];
  /** how many ideas the question asks for */
  of: number;
  /** the mark to suggest: the share of ideas found, in halves, never above the question's marks */
  mark: number;
}

/**
 * For a written answer with a list of accepted ideas (`facts.keywords`): which of them the answer mentions. Code, no AI; it is only a
 * suggestion ("2 of 3 ideas found") and the grown-up decides the mark. Null when the question has no list of ideas or the answer is empty.
 */
export function ideasFound(q: Pick<Question, 'prompt' | 'facts' | 'marks'>, answer: string): IdeasFound | null {
  const kw = Array.isArray(q.facts?.keywords) ? (q.facts.keywords as string[]).filter((k) => typeof k === 'string' && k.trim() !== '') : [];
  if (kw.length === 0 || answer.trim() === '') return null;
  const text = ` ${answer.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')} `;
  const words = new Set(text.trim().split(' ').map(stem));
  const found = kw.filter((k) => {
    const parts = k.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').trim().split(/\s+/).map(stem);
    return parts.every((p) => words.has(p) || text.includes(` ${p}`));
  });
  const of = Math.min(listCount(q.prompt) ?? kw.length, kw.length);
  const share = Math.min(found.length, of) / of;
  return { found, of, mark: Math.round(share * q.marks * 2) / 2 };
}
