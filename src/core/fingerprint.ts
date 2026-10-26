import type { Question } from './question';
import { hashKey } from './seen';
import type { Values } from './practice';

/**
 * A saved set, a typed-in paper or a saved exam only means something against the questions it was made from. Worksheet codes rebuild
 * the questions from the CURRENT question banks, so a bank that was corrected since can rebuild different questions under the same code.
 * The fingerprint is a short hash of the ordered questions: what is asked, the choices offered and the answers accepted.
 * Saved with the state, compared on resume: when it differs the old state is not mixed with the new questions.
 */
export function questionsFingerprint(qs: Pick<Question, 'prompt' | 'inputs' | 'typeId'>[]): string {
  return hashKey(qs.map((q) => `${q.typeId}|${q.prompt}|${q.inputs.map((i) => `${i.id}:${i.mode}:${i.label ?? ''}:${(i.choices ?? []).join('/')}:${i.accepted.join('/')}`).join(';')}`).join('\n'));
}

/**
 * For saves made before fingerprints existed: the saved answers must at least fit the question they sit on
 * (the same blank ids, and a chosen option that is one of the options). False when something does not fit.
 */
export function valuesFit(q: Pick<Question, 'inputs'> | undefined, values: Values): boolean {
  if (!q) return false;
  return Object.entries(values).every(([id, v]) => {
    const input = q.inputs.find((i) => i.id === id);
    if (!input) return false;
    if (input.mode === 'choice' && v !== '' && !(input.choices ?? []).includes(v)) return false;
    return true;
  });
}

export const STALE_MESSAGE = 'The questions were updated, so this set starts again. Your stars and finished sets stay.';
export const STALE_SHEET_MESSAGE = 'This sheet was made from an older set of questions, so the saved answers were not loaded. Print the sheet again to get a copy that matches.';

/** True when a saved practice state does not belong to the questions the code rebuilds today. */
export function practiceIsStale(state: { fp?: string; finished: boolean; idx: number; values: Values } | undefined, questions: Question[]): boolean {
  if (!state) return false;
  if (state.fp) return state.fp !== questionsFingerprint(questions);
  return !state.finished && (state.idx >= questions.length || !valuesFit(questions[state.idx], state.values));
}

/** The same for a saved exam: the paper's question ids must be the ones the answers were typed for. */
export function examIsStale(test: { fp?: string; answers: Record<string, unknown> } | undefined, questions: (Pick<Question, 'prompt' | 'inputs' | 'typeId'> & { id: string })[]): boolean {
  if (!test) return false;
  if (test.fp) return test.fp !== questionsFingerprint(questions);
  const ids = new Set(questions.map((q) => q.id));
  return Object.keys(test.answers).some((k) => !ids.has(k));
}
