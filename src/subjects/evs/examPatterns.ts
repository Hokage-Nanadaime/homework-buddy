/**
 * The school's two EVS papers as data (docs/evs/EXAM_PATTERNS.md, from the owner's photos). Marks are counted in HALVES (1 = half a
 * mark) so 4 x 1/2 never rounds. A slot is one numbered question of the paper; `kind` is an exam kind (docs/evs/EXAM_TAGS.md).
 * `choose`: all `count` items are printed, the child answers `pick`, and the BEST `pick` count (owner, 2026-10-25).
 * `or`: the child does one of two alternatives (the Term Exam's last question). `parts` are sub-questions of one numbered question.
 */
export interface Slot {
  /** the instruction line as the school prints it */
  title: string;
  kind: string;
  /** items printed */
  count: number;
  /** marks per item, in halves */
  eachHalves: number;
  choose?: { pick: number };
  /** a question printed in parts (a), (b): each part is its own slot */
  parts?: Slot[];
  /** the child does ONE of these alternatives; each is a list of slots */
  or?: [Slot[], Slot[]];
}

export interface PaperPattern {
  id: 'periodic' | 'term';
  title: string;
  minutes: number;
  /** total marks, in whole marks */
  marks: number;
  /** default chapters, an assumption until the owner confirms (docs/PENDING.md) */
  defaultChapters: number[];
  slots: Slot[];
}

/** Marks a slot is worth, in halves (what the child can earn). */
export const slotHalves = (s: Slot): number => (s.parts ? s.parts.reduce((n, p) => n + slotHalves(p), 0) : s.or ? Math.max(...s.or.map((alt) => alt.reduce((n, p) => n + slotHalves(p), 0))) : (s.choose?.pick ?? s.count) * s.eachHalves);

export const PERIODIC: PaperPattern = {
  id: 'periodic',
  title: 'Periodic Test 1',
  minutes: 60,
  marks: 25,
  defaultChapters: [1, 2],
  slots: [
    { title: 'Choose the right option', kind: 'mcq', count: 3, eachHalves: 2 },
    { title: 'Answer these in a line or two', kind: 'short', count: 3, eachHalves: 4 },
    { title: 'Answer these questions', kind: 'long', count: 3, eachHalves: 6 },
    { title: 'Fill in the blanks', kind: 'fill-blank', count: 2, eachHalves: 2 },
    { title: 'Answer these questions', kind: 'long', count: 1, eachHalves: 6, parts: [
      { title: '(a) Written answer', kind: 'long', count: 1, eachHalves: 6 },
      { title: '(b) Match them up', kind: 'match', count: 4, eachHalves: 1 },
    ] },
  ],
};

export const TERM: PaperPattern = {
  id: 'term',
  title: 'Term Exam',
  minutes: 150,
  marks: 50,
  defaultChapters: [1, 2, 3, 4, 5, 6, 7],
  slots: [
    { title: 'Say True or False', kind: 'true-false', count: 4, eachHalves: 1 },
    { title: 'Match each item', kind: 'match', count: 4, eachHalves: 1 },
    { title: 'Pick the right answer', kind: 'mcq', count: 2, eachHalves: 2 },
    { title: 'Answer in a word', kind: 'one-word', count: 4, eachHalves: 1 },
    { title: 'Fill in the blanks', kind: 'fill-blank', count: 4, eachHalves: 1 },
    { title: 'Short answers (answer any six)', kind: 'short', count: 8, eachHalves: 4, choose: { pick: 6 } },
    { title: 'Longer answers (answer any five)', kind: 'long', count: 7, eachHalves: 6, choose: { pick: 5 } },
    { title: 'Passage questions', kind: 'passage', count: 3, eachHalves: 2 },
    { title: 'Map work and words', kind: 'map', count: 1, eachHalves: 6, parts: [
      { title: '(1) Label the states on the map of India', kind: 'map', count: 3, eachHalves: 2 },
      { title: '(2) Give another word for', kind: 'another-word', count: 2, eachHalves: 2 },
    ] },
    { title: 'Choose one', kind: 'gk', count: 1, eachHalves: 10, or: [
      [{ title: '(1) General knowledge', kind: 'gk', count: 1, eachHalves: 4 }, { title: '(2) Short answer', kind: 'short', count: 1, eachHalves: 6 }],
      [{ title: '(1) Name two jobs done at home', kind: 'short', count: 1, eachHalves: 4 }, { title: '(2) Link each to its job', kind: 'match', count: 3, eachHalves: 2 }],
    ] },
  ],
};

export const PAPERS: PaperPattern[] = [PERIODIC, TERM];
