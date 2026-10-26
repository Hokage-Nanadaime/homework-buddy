import type { Question, QuestionType } from './question';
import { isAutoMarked } from './question';

/** How a question can appear on a school-style paper. */
export type PaperForm = 'mcq' | 'oneword' | 'blank' | 'short' | 'long' | 'word';

export const PAPER_FORMS: readonly PaperForm[] = ['mcq', 'oneword', 'blank', 'short', 'long', 'word'];

export const FORM_TITLES: Record<PaperForm, string> = {
  mcq: 'MCQ',
  oneword: 'One word',
  blank: 'Fill in the blanks',
  short: 'Short answer questions',
  long: 'Long answer questions',
  word: 'Word problems',
};

/** Optional per-type override. A type that sets `paper` is used in exactly those forms (MCQ is still dropped if four options cannot be made). */
declare module './question' {
  interface QuestionType {
    paper?: PaperForm[];
  }
}

/** True for a sentence-style problem: long, with numbers, written as a story. */
export function isWordProblem(q: Question): boolean {
  return q.prompt.length >= 60 && /\d/.test(q.prompt) && /[?.]$/.test(q.prompt.trim());
}

/**
 * Which paper forms one generated question can take. Open or spoken questions give [].
 * `canMcq` tells whether four proper options can be built (see mcq.ts).
 */
export function formsOf(type: QuestionType, q: Question, canMcq: boolean): PaperForm[] {
  if (!isAutoMarked(type) || q.inputs.length === 0 || q.inputs.some((i) => i.mode === 'open')) return [];
  let forms: PaperForm[];
  if (type.paper) {
    forms = [...type.paper];
  } else {
    const word = isWordProblem(q);
    const shortPrompt = q.prompt.length <= 70 && !q.notebook;
    forms = [];
    if (q.inputs.length === 1) {
      const mode = q.inputs[0]!.mode;
      if (mode === 'number' || mode === 'words') {
        if (!word || q.prompt.length <= 100) forms.push('mcq');
        if (!word) forms.push('oneword');
        if (shortPrompt && !word && !q.diagram && (/\[ ?\]|□|_/.test(q.prompt) || !q.prompt.trim().endsWith('?'))) forms.push('blank');
        if (!word && q.level !== 'challenge') forms.push('short');
        if (q.notebook || q.diagram || q.level === 'challenge' || word) forms.push('long');
      } else if (mode === 'choice') {
        forms.push('mcq', 'oneword');
        if (q.level !== 'easy') forms.push('short');
      } else if (mode === 'text') {
        forms.push('oneword', 'short');
      } else {
        // ordered, multi, abacus
        forms.push('short', 'long');
      }
    } else {
      forms.push('long');
      if (q.inputs.length === 2) forms.push('short');
    }
    if (word) forms.push('word');
    else if (q.level === 'challenge' && q.inputs.length > 1) forms.push('word');
  }
  return [...new Set(forms)].filter((f) => f !== 'mcq' || canMcq);
}
