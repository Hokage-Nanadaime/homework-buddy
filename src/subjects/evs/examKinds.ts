import type { BankType, EvsEntry } from './types';

const LIST_N = /^(list|name|mention|write)\b.*\b(two|three|four|five|2|3|4|5)\b/i;
const ANOTHER_WORD = /another word|also known as|also called|same as/i;
const ONE_WORD = /^(name|write|give)\b.*\b(one|the)\b|one word/i;

/**
 * Which exam kinds (docs/evs/EXAM_TAGS.md) a question can fill: the tags on its type and on the entry, plus the kinds its own shape
 * gives it, so the book's own exercise items (which carry no hand-written tags) are found by the exam builder, which takes them first.
 * A written answer can fill a 2-mark "short" slot or a 3-mark "long" slot; "list three" items also fill "list-n".
 */
export function examKindsOf(e: EvsEntry, t: BankType): string[] {
  const out = new Set<string>([...(t.exam ?? []), ...(e.exam ?? [])]);
  switch (e.kind) {
    case 'mcq':
      out.add('mcq');
      break;
    case 'tf':
      out.add('true-false');
      break;
    case 'match':
      out.add('match');
      break;
    case 'blank':
      out.add('fill-blank');
      if (ANOTHER_WORD.test(e.stem)) out.add('another-word');
      else if (ONE_WORD.test(e.stem) && e.answer.length > 0) out.add('one-word');
      break;
    case 'short':
      out.add('short');
      out.add('long');
      if (LIST_N.test(e.stem)) out.add('list-n');
      break;
    case 'personal':
      out.add('opinion');
      break;
    case 'map':
      out.add('map');
      break;
  }
  if (e.text && (e.kind === 'mcq' || e.kind === 'tf' || e.kind === 'blank' || e.kind === 'short')) out.add('passage');
  return [...out];
}
