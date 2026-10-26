import { matchKeyLines } from './match';
import { checkInputDetailed, defaultHint } from './checker';
import { openProperNames } from './kinds';
import type { Input, Question } from './question';

/** What the kid typed or tapped, one string per blank (multi: choices joined by ", "; abacus: bead counts joined by ", "). */
export type Values = Record<string, string>;

export interface Grade {
  /** true/false for each blank; null where a grown-up must check. */
  perInput: (boolean | null)[];
  /** Specific feedback from the checker for each blank (e.g. right number, wrong form). */
  messages: (string | undefined)[];
  /** null when every blank needs a grown-up. */
  correct: boolean | null;
}

export const isOpen = (q: Question): boolean => q.inputs.length > 0 && q.inputs.every((i) => i.mode === 'open');

/** A written answer that a grown-up (with Claude's suggestion) marks. */
export const isSentence = (q: Question): boolean => q.inputs.some((i) => i.mode === 'sentence');

/**
 * A written (sentence) answer: after "Check my answer" the app shows the model answer (and maybe Claude's suggestion), and the
 * grown-up's decision is the outcome. A star only when it is right first time without a hint.
 */
export function decideSentence(q: Question, right: boolean, hinted: boolean): { phase: 'right' | 'notyet'; outcome: { typeId: string; correct: boolean }; star: boolean } {
  return { phase: right ? 'right' : 'notyet', outcome: { typeId: q.typeId, correct: right }, star: right && !hinted };
}

/** On the paper-entry screen a grown-up ticks these instead of typing: ask-a-grown-up, do-together and written answers. */
export const tickedByGrownUp = (q: Question): boolean => isOpen(q) || isSentence(q);

/** Paper entry: a written answer counts as right when the grown-up ticks it. Others are marked by code as usual. */
export function gradePaper(q: Question, values: Values, ticked: boolean): Grade {
  if (isSentence(q)) return { perInput: q.inputs.map(() => ticked), messages: q.inputs.map(() => undefined), correct: ticked };
  return gradeQuestion(q, values);
}

/** Every blank that can be marked has something in it. */
export function isComplete(q: Question, values: Values): boolean {
  return q.inputs.every((i) => {
    if (i.mode === 'open') return true;
    const v = (values[i.id] ?? '').trim();
    if (i.mode === 'abacus') return v.split(',').length === i.accepted.length && v.split(',').every((p) => p.trim() !== '');
    return v !== '';
  });
}

/** Marks every blank with the shared checker. */
export function gradeQuestion(q: Question, values: Values): Grade {
  const openNames = openProperNames(q);
  const results = q.inputs.map((i, n) => {
    if (!openNames) return checkInputDetailed(i, values[i.id] ?? '');
    // the child's own special names: any one word that starts with a capital letter counts, and two boxes cannot hold the same word
    const v = (values[i.id] ?? '').trim();
    const others = q.inputs.filter((_, k) => k !== n).map((o) => (values[o.id] ?? '').trim().toLowerCase());
    if (v === '') return { ok: false };
    if (!/^\p{Lu}[\p{L}'’-]*( \p{Lu}[\p{L}'’-]*)*$/u.test(v)) return { ok: false, message: /^\p{Lu}/u.test(v) ? 'Write the name with a capital letter on every word.' : 'A special name starts with a capital letter.' };
    if (others.includes(v.toLowerCase())) return { ok: false, message: 'Write a different name in each box.' };
    return { ok: true };
  });
  const perInput = results.map((r) => r.ok);
  const messages = results.map((r) => r.message);
  const marked = perInput.filter((r): r is boolean => r !== null);
  return { perInput, messages, correct: marked.length === 0 ? null : marked.every(Boolean) };
}

const MODE_WORDS: Partial<Record<Input['mode'], string>> = {
  abacus: 'beads on each rod, from the left',
  ordered: 'list',
  multi: 'answers',
};

/** The model answer for one blank, in words a kid can read. */
export function answerText(input: Input, diagramLabels?: string[]): string {
  if (input.mode === 'open') return 'Your own answer (a grown-up checks it)';
  if (input.mode === 'sentence') return input.accepted[0] ?? '';
  if (input.mode === 'abacus') {
    const labels = diagramLabels && diagramLabels.length === input.accepted.length ? diagramLabels : undefined;
    return input.accepted.map((a, i) => (labels ? `${labels[i]} ${a}` : a)).join(', ');
  }
  if (input.mode === 'ordered' || input.mode === 'multi') return input.accepted.join(', ');
  return input.accepted[0] ?? '';
}

export function answerLines(q: Question): string[] {
  if (q.together) return ['Do together with a grown-up (not marked)'];
  const pairs = matchKeyLines(q);
  if (pairs) return pairs;
  const labels = q.diagram?.kind === 'abacus' ? q.diagram.labels : undefined;
  return q.inputs.map((i) => {
    const text = answerText(i, labels);
    return i.label ? `${i.label}: ${text}` : text;
  });
}

const GENERIC: Record<Input['mode'], string> = {
  number: 'Read the question slowly and find the numbers in it. Try it step by step, then type it.',
  words: 'Read the question slowly. Say the answer out loud first, then type it.',
  text: 'Read the question slowly and look at the picture again.',
  choice: 'Read every choice, then cross out the ones that cannot be right.',
  multi: 'Check each choice on its own. More than one can be right.',
  ordered: 'Look at all the numbers first. Find the smallest or the biggest, then carry on one by one.',
  abacus: 'Each rod is one place. Think about how many beads each place needs, and use 0 for an empty rod.',
  open: 'Take your time and think about it. Then tell a grown-up.',
  sentence: 'Look back at the text. Find the part that tells you, then say it in your own words.',
};

/** First worked step if it does not give the answer away, else a general hint for the kind of question. */
export function hintFor(q: Question): string {
  const first = q.steps[0];
  const answers = q.inputs.flatMap((i) => i.accepted).map((a) => a.toLowerCase().replace(/[, ]/g, ''));
  const flat = (first ?? '').toLowerCase().replace(/[, ]/g, '');
  const leaks = answers.some((a) => a.length > 0 && flat.includes(a));
  if (first && !leaks) return first;
  return GENERIC[q.inputs[0]?.mode ?? 'number'];
}

/** Stars for a finished set. */
export function starsFor(correct: number, total: number): number {
  if (total <= 0) return 0;
  const r = correct / total;
  return r >= 0.9 ? 3 : r >= 0.7 ? 2 : r >= 0.5 ? 1 : 0;
}

/** The fixed hint ladder: a nudge, then a step. The worked answer is the third rung (Show me the answer). */
export function hintLadder(q: Question): [string, string] {
  const nudge = GENERIC[q.inputs[0]?.mode ?? 'number'];
  const answers = q.inputs.flatMap((i) => i.accepted).map((a) => a.toLowerCase().replace(/[, ]/g, ''));
  const safe = q.steps.find((st) => {
    const f = st.toLowerCase().replace(/[, ]/g, '');
    return !answers.some((a) => a.length > 0 && f.includes(a));
  });
  return [nudge, safe ?? 'Look at the numbers and the picture again, and take the question one small piece at a time.'];
}

export { defaultHint };
export const modeHelp = (mode: Input['mode']): string | undefined => MODE_WORDS[mode];

/** mm:ss */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export interface TestMarks {
  sections: { title: string; got: number; of: number }[];
  got: number;
  of: number;
  perQuestion: boolean[][];
}

/** Mark a whole paper. A question earns its marks only when every blank is right. */
export function markPaper(
  sections: { title: string; questions: Question[] }[],
  answers: Record<string, Values>,
  keyOf: (si: number, qi: number) => string,
): TestMarks {
  const perQuestion: boolean[][] = [];
  const out = sections.map((s, si) => {
    let got = 0;
    let of = 0;
    const row: boolean[] = [];
    s.questions.forEach((q, qi) => {
      of += q.marks;
      const ok = gradeQuestion(q, answers[keyOf(si, qi)] ?? {}).correct === true;
      row.push(ok);
      if (ok) got += q.marks;
    });
    perQuestion.push(row);
    return { title: s.title, got, of };
  });
  return { sections: out, got: out.reduce((a, s) => a + s.got, 0), of: out.reduce((a, s) => a + s.of, 0), perQuestion };
}
