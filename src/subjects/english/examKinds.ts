import type { BankEntry, BankType } from './types';

const WH = /^(why|what|how|who|where|when|which)\b/i;
const WHO_SAID = /who said|said to whom|who spoke|said by whom/i;
const READER_MAX = 4;

/**
 * Which exam kinds (docs/english/EXAM_TAGS.md) a question can fill. The type's own `exam` tags apply to every entry
 * of the type; for Reader lessons the entry's kind and tags add more, so a mixed type can still feed several exam kinds.
 */
export function examKindsOf(e: BankEntry, t: BankType, lessonNumber: number): string[] {
  const out = new Set<string>([...(t.exam ?? []), ...(e.exam ?? [])]);
  if (lessonNumber <= READER_MAX) {
    const tags = e.tags ?? [];
    const fromText = e.text !== undefined && (e.evidence.source === 'text' || e.evidence.source === 'summary');
    if (e.kind === 'tf' && e.text !== undefined) out.add('true-false');
    if (e.kind === 'jumble') out.add('jumble');
    if (e.kind === 'blank' || e.kind === 'mcq' || e.kind === 'match') {
      if (tags.some((g) => g === 'grammar:antonym' || g === 'grammar:opposites')) out.add('opposite');
      if (tags.includes('grammar:synonym')) out.add('synonym');
      if (tags.includes('grammar:homophone')) out.add('homophone');
    }
    if (e.kind === 'blank' && fromText && !tags.some((g) => g.startsWith('grammar:'))) out.add('fill-story');
    if (e.kind === 'mcq' && fromText && !tags.some((g) => g.startsWith('grammar:'))) out.add('mcq-story');
    if (e.kind === 'short' && t.marking === 'suggested' && WH.test(e.stem) && !(t.exam ?? []).some((k) => k.startsWith('writing'))) out.add('brief-answer');
    if ((e.kind === 'match' || e.kind === 'mcq' || e.kind === 'short') && WHO_SAID.test(e.stem)) out.add('who-said');
  }
  return [...out];
}

/** The exam kinds of a question plus whether it is the book's own exercise item (the exam builder prefers those first). */
export function examInfo(e: BankEntry, t: BankType, lessonNumber: number): { kinds: string[]; book: boolean } {
  return { kinds: examKindsOf(e, t, lessonNumber), book: Boolean(e.book) };
}
