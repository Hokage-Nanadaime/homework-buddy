import type { Question } from './question';

/** The "tap the words" hint the English builder puts on those inputs (src/subjects/english/build.ts). */
export const TAP_HINT = 'Tap every word that fits';

export interface TapWords {
  /** the instruction line, e.g. "Underline the pronouns." */
  instruction: string;
  sentence: string;
  /** how the words are marked on screen and on paper */
  style: 'underline' | 'circle' | 'cross';
  choices: string[];
}

/**
 * An English "underline / circle the ..." question: one multi input whose choices are the words of the sentence.
 * The prompt is the instruction, then the sentence on the following line(s).
 */
export function tapWordsOf(q: Pick<Question, 'prompt' | 'inputs'>): TapWords | undefined {
  const input = q.inputs[0];
  if (!input || q.inputs.length !== 1 || input.mode !== 'multi' || input.hint !== TAP_HINT) return undefined;
  const lines = q.prompt.split('\n');
  if (lines.length < 2) return undefined;
  const instruction = lines[0]!;
  return { instruction, sentence: lines.slice(1).join(' '), style: /circle/i.test(instruction) ? 'circle' : /cross|strike/i.test(instruction) ? 'cross' : 'underline', choices: input.choices ?? [] };
}

/** The sentence cut into pieces: words (tappable) and the spaces and marks between them. Repeated words share one answer. */
export function sentencePieces(sentence: string): { text: string; word?: string }[] {
  const out: { text: string; word?: string }[] = [];
  for (const m of sentence.matchAll(/([\p{L}\p{N}'’-]+)|([^\p{L}\p{N}'’-]+)/gu)) {
    if (m[1]) out.push({ text: m[1], word: m[1].replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') });
    else out.push({ text: m[2]! });
  }
  return out;
}

/** The answer a tapped sentence gives: the chosen words joined the way the checker expects. */
export const tapAnswer = (chosen: string[]): string => chosen.join(', ');

/** "Write the correct form": a question whose answer must keep its capital letters. */
export const needsCapitals = (q: Pick<Question, 'inputs'>): boolean => q.inputs.some((i) => i.caseSensitive);

/** Several written words, or the child's own answer: not marked by code word for word. */
export const isPersonal = (q: Pick<Question, 'inputs'>): boolean => q.inputs.length > 0 && q.inputs.every((i) => i.mode === 'open');

/** Open-ended proper names (the pool holds only examples): any word that starts with a capital letter is accepted. */
export function openProperNames(q: Pick<Question, 'inputs'>): boolean {
  return q.inputs.length > 0 && q.inputs.every((i) => i.mode === 'text' && i.label?.startsWith('Word ') && i.accepted.length > 0 && i.accepted.every((a) => /^\p{Lu}/u.test(a)));
}

/** Written answers, sentences and the child's own answers are marked by a grown-up (Claude may suggest). */
export const needsGrownUp = (q: Pick<Question, 'inputs'>): boolean => isPersonal(q) || q.inputs.some((i) => i.mode === 'sentence' || i.mode === 'open');

/**
 * How the child answers on paper: written on ruled lines (a sentence, a corrected sentence), in answer boxes (one per blank),
 * or on the printed sentence itself (underline / circle). One rule for the preview, the PDF and the page heights.
 */
export function paperAnswer(q: Pick<Question, 'prompt' | 'inputs'>): 'lines' | 'boxes' | 'sentence' {
  if (tapWordsOf(q)) return 'sentence';
  if (q.inputs.some((i) => i.mode === 'sentence' || i.caseSensitive)) return 'lines';
  return 'boxes';
}

/** On paper nothing is tapped: "Tap the describing word" becomes "Circle the describing word". */
export const paperWords = (text: string): string => text.replace(/\bTap\b/g, 'Circle').replace(/\btap\b/g, 'circle');
