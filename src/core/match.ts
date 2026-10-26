import type { Input, Question } from './question';

/**
 * "Match the following" as the school book prints it: the left items numbered 1, 2, 3, the right items lettered (a), (b), (c).
 * The data shape is unchanged: a match is a question whose blanks are all `choice` blanks that share one list of choices,
 * each blank carries its left item as `label` and the right item it pairs with as `accepted[0]`, and the pairs are one to one
 * (the right column may hold one spare item that matches nothing, as in the Maths weights question).
 * The screen, the worksheet, the exam paper, the answer key and "Enter answers from paper" all draw it from this one description.
 */
export interface MatchSpec {
  /** the left column, in order: blank id, the number the book shows (1, 2, 3) and the item */
  lefts: { id: string; n: number; text: string }[];
  /** the right column, in the order shown: the letter (a, b, c) and the item */
  rights: { letter: string; text: string }[];
}

export const MATCH_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** The match behind a question, or null when it is anything else (one blank, mixed modes, different choices, not one to one). */
export function matchOf(q: Pick<Question, 'inputs'> & { together?: boolean }): MatchSpec | null {
  const inputs = q.inputs;
  if (q.together || inputs.length < 2 || inputs.length > MATCH_LETTERS.length) return null;
  const first = inputs[0]!.choices;
  if (!first || first.length < inputs.length || first.length > inputs.length + 1 || new Set(first).size !== first.length) return null;
  const same = (i: Input): boolean => i.mode === 'choice' && Boolean(i.label) && i.accepted.length === 1 && i.choices?.length === first.length && i.choices.every((c, k) => c === first[k]);
  if (!inputs.every(same)) return null;
  const answers = new Set(inputs.map((i) => i.accepted[0]!));
  if (answers.size !== inputs.length || ![...answers].every((a) => first.includes(a))) return null;
  return {
    lefts: inputs.map((i, k) => ({ id: i.id, n: k + 1, text: i.label! })),
    rights: first.map((text, k) => ({ letter: MATCH_LETTERS[k]!, text })),
  };
}

/** The letter of a right item, or '' when it is not one of them. */
export const letterOf = (spec: MatchSpec, text: string | undefined): string => spec.rights.find((r) => r.text === text)?.letter ?? '';

/** The pairs as the answer key prints them: "1. Tamil Nadu → (d) lungi". */
export function matchKeyLines(q: Pick<Question, 'inputs'>): string[] | null {
  const spec = matchOf(q);
  if (!spec) return null;
  return q.inputs.map((i, k) => `${k + 1}. ${spec.lefts[k]!.text} → (${letterOf(spec, i.accepted[0])}) ${i.accepted[0]}`);
}

/** True when the answers of a question are the pairs of a match, one per line. */
export const isPairLines = (answers: string[]): boolean => answers.length > 1 && answers.every((a) => PAIR_LINE.test(a));
const PAIR_LINE = /^\d+\. .+ → \([a-z]\) /;
/** The answers of one question for the key: pairs go one to a line, other answers side by side. */
export function keyHtml(answers: string[], esc: (s: string) => string): string {
  return isPairLines(answers) ? `<span class="hb-keypairs">${answers.map((a) => `<span>${esc(a)}</span>`).join('')}</span>` : answers.map(esc).join(' &nbsp;|&nbsp; ');
}

/** The printed match: two real columns, a blank beside each left item to write the letter in, the right items lettered (a), (b), (c). */
export function matchPrintHtml(spec: MatchSpec, esc: (s: string) => string): string {
  const rows = spec.rights
    .map((r, k) => {
      const l = spec.lefts[k];
      const left = l ? `<span class="hb-ml"><b>${l.n}.</b> ${esc(l.text)}</span><i class="hb-mbox" aria-label="Write the letter here"></i>` : '<span></span><span></span>';
      return `<div class="hb-mrow">${left}<span class="hb-mr"><b>(${r.letter})</b> ${esc(r.text)}</span></div>`;
    })
    .join('');
  return `<div class="hb-match" role="table" aria-label="Match the following"><p class="hb-hint">Write the letter of the match in the box.</p>${rows}</div>`;
}

/** Paper look of the printed match; part of the sheet CSS so worksheets and exam papers share it. */
export const MATCH_PRINT_CSS = `
.hb-match{margin:6px 0 0;display:flex;flex-direction:column;gap:7px;break-inside:avoid;page-break-inside:avoid}
.hb-mrow{display:grid;grid-template-columns:minmax(0,1fr) 13mm minmax(0,1fr);column-gap:8mm;align-items:center}
.hb-ml b,.hb-mr b{font-weight:800}
.hb-mbox{display:inline-block;width:11mm;height:8mm;border:1.5px solid var(--paper-ink);border-radius:2mm}
.hb-keypairs{display:flex;flex-direction:column;gap:2px}
`;

/** Paper geometry shared by the exam paper and the PDFs, in mm: the column width for a given text width. */
export const matchColMm = (textW: number): number => (textW - 13 - 8 * 2) / 2;
/** Height of each printed row: one line is 8.5 mm, longer items take 4.6 mm a line more (about 2.3 mm a character). */
export function matchRowMm(spec: MatchSpec, k: number, textW: number): number {
  const colW = matchColMm(textW);
  const lines = Math.max(1, Math.ceil((((spec.lefts[k]?.text.length ?? 0) + 4) * 2.3) / colW), Math.ceil((((spec.rights[k]?.text.length ?? 0) + 5) * 2.3) / colW));
  return Math.max(8.5, lines * 4.6 + 3.9);
}
export const matchHeightMm = (spec: MatchSpec, textW: number): number => 6 + spec.rights.reduce((h, _, k) => h + matchRowMm(spec, k, textW), 0);

/** What the kid is doing on the board: nothing chosen, or one item chosen and waiting for its match. */
export type MatchPick = { side: 'l'; id: string } | { side: 'r'; text: string } | null;
export interface MatchStep {
  /** the new connections (blank id to right item; missing or '' is not connected) */
  values: Record<string, string>;
  pick: MatchPick;
  /** what a screen reader is told */
  say: string;
}

const ownerOf = (spec: MatchSpec, values: Record<string, string>, text: string): string | undefined => spec.lefts.find((l) => (values[l.id] ?? '') === text)?.id;

function join(spec: MatchSpec, values: Record<string, string>, id: string, text: string): MatchStep {
  const next = { ...values };
  // a right item belongs to one left item only: a new connection takes it over
  const other = ownerOf(spec, next, text);
  if (other && other !== id) next[other] = '';
  next[id] = text;
  const l = spec.lefts.find((x) => x.id === id)!;
  return { values: next, pick: null, say: `Connected ${l.n} to (${letterOf(spec, text)}) ${text}.` };
}
function undo(spec: MatchSpec, values: Record<string, string>, id: string): MatchStep {
  const l = spec.lefts.find((x) => x.id === id)!;
  return { values: { ...values, [id]: '' }, pick: null, say: `Connection of ${l.n} removed.` };
}

/** A tap on a left item: undo if it is connected, join it to a chosen right item, or choose it. */
export function tapLeft(spec: MatchSpec, values: Record<string, string>, pick: MatchPick, id: string): MatchStep {
  if ((values[id] ?? '') !== '') return undo(spec, values, id);
  if (pick?.side === 'r') return join(spec, values, id, pick.text);
  return { values, pick: pick?.side === 'l' && pick.id === id ? null : { side: 'l', id }, say: '' };
}
/** A tap on a right item, the same from the other side. */
export function tapRight(spec: MatchSpec, values: Record<string, string>, pick: MatchPick, text: string): MatchStep {
  const owner = ownerOf(spec, values, text);
  if (owner) return undo(spec, values, owner);
  if (pick?.side === 'l') return join(spec, values, pick.id, text);
  return { values, pick: pick?.side === 'r' && pick.text === text ? null : { side: 'r', text }, say: '' };
}
