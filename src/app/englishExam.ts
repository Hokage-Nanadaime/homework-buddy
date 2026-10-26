import { blankShares, type Exam, type ExamHeader, type ExamResult, type KeyEntry, type MarkingPoint, type MarksTableRow, type PaperQuestion, type PaperSection } from '../core/exam';
import { normaliseExamSeed, randomExamSeed } from '../core/examCode';
import type { ExamScore, QuestionMark } from '../core/examMark';
import { gradeQuestion, type Values } from '../core/practice';
import { needsGrownUp, openProperNames } from '../core/kinds';
import type { Input, Level, Passage, Question } from '../core/question';
import { createRng, type Rng } from '../core/rng';
import { entryToQuestion } from '../subjects/english/build';
import { examInfo } from '../subjects/english/examKinds';
import type { BankEntry, BankType, LessonData } from '../subjects/english/types';
import type { PaperForm } from '../core/paper';

/** English papers like the school's (docs/english/EXAM_PATTERNS.md): the Periodic Test (25 marks) and the Term Exam (50 marks). */
export type EnglishFormat = 'A' | 'B';

interface ItemSpec {
  kind: string;
  marks: number;
}
interface QSpec {
  title: string;
  instruction: string;
  items: ItemSpec[];
  /** items come from one unseen passage */
  unseen?: boolean;
  /** how many ruled lines a written answer gets */
  lines?: number;
  part?: { label: string; title: string };
  chooseBest?: number;
  /** printed instead of the standard marks label, e.g. when only two of three questions count */
  form?: PaperForm;
}

const rep = (kind: string, n: number, marks: number): ItemSpec[] => Array.from({ length: n }, () => ({ kind, marks }));

const PERIODIC: QSpec[] = [
  { title: 'Read the passage and answer the questions', instruction: '', unseen: true, items: [{ kind: 'unseen-tick', marks: 1 }, { kind: 'unseen-tick', marks: 1 }, { kind: 'unseen-complete', marks: 1 }, { kind: 'unseen-sentence', marks: 1 }, { kind: 'unseen-gender', marks: 1 }] },
  { title: 'Short answers', instruction: 'Answer these questions in sentences.', items: rep('brief-answer', 2, 2) },
  { title: 'Fill in the blanks', instruction: 'Choose a word from the box for each blank.', items: rep('homophone', 2, 1) },
  { title: 'Opposites', instruction: 'Give the opposite of each word.', items: rep('opposite', 2, 1) },
  { title: 'True or false', instruction: 'Say if each sentence is true (T) or false (F).', items: rep('true-false', 4, 0.5) },
  { title: 'Jumbled words', instruction: 'Put the letters in order to make a word.', items: rep('jumble', 2, 1) },
  { title: 'Naming words', instruction: 'Pick the noun that does not fit with the others.', items: rep('odd-noun', 2, 0.5) },
  { title: 'Proper nouns', instruction: 'Give a proper noun for each, with an example.', items: rep('proper-names', 2, 1) },
  { title: 'Capital letters', instruction: 'Fix the mistakes.', items: rep('capitals', 2, 1) },
  { title: 'One word', instruction: 'Reply with one word.', items: rep('one-word', 2, 1) },
  { title: 'Odd one out', instruction: 'Pick the one that does not belong.', items: rep('odd-noun', 2, 0.5) },
];

const TERM: QSpec[] = [
  { title: 'Read the passage and answer the questions', instruction: '', unseen: true, part: { label: 'A', title: 'Reading and Writing' }, items: [{ kind: 'unseen-wh', marks: 1 }, { kind: 'unseen-tick', marks: 1 }, { kind: 'unseen-complete', marks: 1 }, { kind: 'unseen-tf', marks: 1 }, { kind: 'unseen-sentence', marks: 1 }] },
  { title: 'Read the passage and answer the questions', instruction: '', unseen: true, items: [{ kind: 'unseen-tick', marks: 1 }, { kind: 'unseen-tick', marks: 1 }, { kind: 'unseen-tick', marks: 1 }, { kind: 'unseen-opposite', marks: 1 }, { kind: 'unseen-complete', marks: 1 }] },
  { title: 'Write a paragraph', instruction: 'Write a short paragraph about the topic.', lines: 12, items: [{ kind: 'writing-paragraph', marks: 5 }] },
  { title: 'Write an application', instruction: 'Write a short letter of request.', lines: 14, items: [{ kind: 'writing-application', marks: 5 }] },
  { title: 'Underline the pronouns', instruction: 'Draw a line under each pronoun.', part: { label: 'B', title: 'English Practice Book' }, items: rep('pronoun-underline', 2, 1) },
  { title: 'Plurals', instruction: 'Write the plural of each word.', items: rep('plural', 2, 1) },
  { title: 'Describing words', instruction: 'Ring each adjective in the sentences.', items: rep('adjective-circle', 2, 1) },
  { title: 'Two describing words', instruction: 'Give two adjectives for each.', items: rep('two-describing', 2, 1) },
  { title: 'Verbs', instruction: 'Draw a line under each verb.', items: rep('verb-underline', 2, 0.5) },
  { title: 'Actions', instruction: 'Name two things you can do with your:', items: rep('two-actions', 2, 1) },
  { title: 'Odd one out', instruction: 'Pick the one that does not fit.', items: rep('odd-describing', 2, 1) },
  { title: 'Answer the question', instruction: 'Give the answer.', items: rep('one-word', 1, 1) },
  { title: 'Pronoun blanks', instruction: 'Complete each blank with a pronoun.', items: rep('fill-pronoun', 1, 1) },
  { title: 'True or false', instruction: 'Mark each as True or False.', part: { label: 'C', title: 'English Reader Book' }, items: rep('true-false', 2, 1) },
  { title: 'Short answers', instruction: 'Choose two of the three questions and answer them.', chooseBest: 2, items: rep('brief-answer', 3, 2) },
  { title: 'Speakers', instruction: 'Say who spoke and to whom.', items: rep('who-said', 2, 1) },
  { title: 'Opposites', instruction: 'Give the opposite of each of these words.', items: rep('opposite', 2, 1) },
  { title: 'Synonym', instruction: 'Give a word with the same meaning.', items: rep('synonym', 1, 1) },
  { title: 'Fill in the blanks', instruction: 'Complete each blank using the story.', items: rep('fill-story', 2, 1) },
  { title: 'Choose the right answer', instruction: 'Pick the best answer.', items: rep('mcq-story', 2, 1) },
];

export const ENGLISH_FORMATS: Record<EnglishFormat, { title: string; minutes: number; marks: number; examination: string; instructions: string[]; sections: QSpec[] }> = {
  A: { title: 'Periodic Test', minutes: 60, marks: 25, examination: 'Periodic Test - I', instructions: ['Answer every question.'], sections: PERIODIC },
  B: { title: 'Term Exam', minutes: 150, marks: 50, examination: 'Term Exam', instructions: ['This paper has three sections: A, B and C.', 'Every question must be answered.', 'Read each question carefully before you answer.'], sections: TERM },
};

const specMarks = (q: QSpec): number => (q.chooseBest ? q.chooseBest * q.items[0]!.marks : q.items.reduce((m, i) => m + i.marks, 0));
export const formatMarks = (f: EnglishFormat): number => ENGLISH_FORMATS[f].sections.reduce((m, q) => m + specMarks(q), 0);

// ---- codes: EN-A-0111-4F7K (format, the lessons and sections chosen, seed) -------------------------------------------------------

export interface EnglishSpec {
  format: EnglishFormat;
  /** Reader lesson numbers (1 to 4) and Practice Book section numbers (11 to 21) */
  units: number[];
  seed: string;
}
const pad = (n: number): string => String(n).padStart(2, '0');
const clean = (u: number[]): number[] => [...new Set(u.filter((n) => Number.isInteger(n) && n >= 1 && n <= 30))].sort((a, b) => a - b);

export function makeEnglishCode(s: EnglishSpec): string {
  return `EN-${s.format}-${clean(s.units).map(pad).join('')}-${normaliseExamSeed(s.seed)}`;
}

/** Any case, spaces, dashes and dots. Undefined when it is not an English exam code. */
export function parseEnglishCode(raw: string): EnglishSpec | undefined {
  const t = raw.toUpperCase().replace(/[\s\-_.]+/g, '');
  const m = /^EN([AB])((?:\d\d)+)([A-HJKMNP-Z2-9]{4})$/.exec(t);
  if (!m) return undefined;
  const units = clean(m[2]!.match(/\d\d/g)!.map(Number));
  return units.length ? { format: m[1] as EnglishFormat, units, seed: m[3]! } : undefined;
}

// ---- the pools ---------------------------------------------------------------------------------------------------------------

export interface Cand {
  e: BankEntry;
  t: BankType;
  lesson: { number: number };
}
const UNSEEN = 31;
const WRITING = 21;
const isReader = (n: number): boolean => n <= 4;

/** Which kinds of bank entry may fill an exam kind (a "write the opposites" line is a blank, never a match grid). Kinds not listed take any. */
const ALLOWED: Record<string, BankEntry['kind'][]> = {
  homophone: ['blank', 'mcq'],
  opposite: ['blank', 'mcq'],
  synonym: ['blank', 'mcq'],
  'who-said': ['mcq', 'short'],
  'true-false': ['tf'],
  jumble: ['jumble'],
  'brief-answer': ['short'],
  'fill-story': ['blank'],
  'mcq-story': ['mcq'],
  'odd-noun': ['oddone'],
  'odd-describing': ['oddone'],
  'proper-names': ['words'],
  'two-describing': ['words'],
  'two-actions': ['words'],
  capitals: ['correct'],
  'one-word': ['personal'],
  'pronoun-underline': ['tapwords'],
  'adjective-circle': ['tapwords'],
  'verb-underline': ['tapwords'],
  plural: ['blank'],
  'fill-pronoun': ['blank'],
  'writing-paragraph': ['short'],
  'writing-application': ['short'],
};

export const stemOf = (e: BankEntry): string => ('stem' in e ? e.stem : 'statement' in e ? e.statement : 'clue' in e ? (e.clue ?? '') : '');
/** A question that points at something the paper does not show (a page, a picture, the text) cannot be answered on the paper. */
export const POINTS_AT_BOOK = /\b(the|this|that) (passage|text|paragraph|picture|page|exercise|box|table|story on)\b|\bpage \d+|\bin the (picture|table)\b/i;

const buildPools = (lessons: LessonData[], chosen: number[]): Map<string, Cand[]> => {
  const pools = new Map<string, Cand[]>();
  for (const l of lessons) {
    const inPortion = chosen.includes(l.number);
    const feeds = l.number === UNSEEN || l.number === WRITING; // these banks always feed their own kinds
    if (!inPortion && !feeds) continue;
    for (const e of l.entries) {
      const t = l.types.find((x) => x.id === e.type);
      if (!t) continue;
      for (const k of examInfo(e, t, l.number).kinds) {
        if (ALLOWED[k] && !ALLOWED[k]!.includes(e.kind)) continue;
        if (l.number !== UNSEEN && l.number !== WRITING && POINTS_AT_BOOK.test(stemOf(e))) continue;
        if (k.startsWith('unseen-') && l.number !== UNSEEN) continue;
        if (k.startsWith('writing-') && l.number !== WRITING) continue;
        if (!k.startsWith('unseen-') && !k.startsWith('writing-') && !inPortion) continue;
        (pools.get(k) ?? pools.set(k, []).get(k)!).push({ e, t, lesson: l });
      }
    }
  }
  return pools;
};

/** The Practice Book sections each paper draws on (the school's portion); Reader lessons are chosen freely. */
export const REQUIRED_SECTIONS: Record<EnglishFormat, number[]> = { A: [11], B: [11, 12, 13, 14, 15] };

const WEIGHTS: Record<Level, number> = { easy: 0.3, medium: 0.6, challenge: 0.1 };
export const pickLevel = (r: Rng, have: Level[]): Level => {
  const opts = have.length ? have : (['medium'] as Level[]);
  let x = r.next() * opts.reduce((m, l) => m + WEIGHTS[l], 0);
  for (const l of opts) {
    x -= WEIGHTS[l];
    if (x <= 0) return l;
  }
  return opts[0]!;
};

/** True when the options could be an answer to the question: the school paper once listed days for a "where" question. */
export function optionsFitStem(stem: string, options: string[]): boolean {
  const days = /^(mon|tues|wednes|thurs|fri|satur|sun)day$/i;
  const months = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*$/i;
  if (/^\s*(where|in which place)\b/i.test(stem) && options.length > 0 && options.every((o) => days.test(o.trim()) || months.test(o.trim()))) return false;
  if (/^\s*(who)\b/i.test(stem) && options.length > 0 && options.every((o) => /^\d+$/.test(o.trim()))) return false;
  if (/^\s*(how many)\b/i.test(stem) && options.length > 0 && options.some((o) => !/\d|one|two|three|four|five|six|seven|eight|nine|ten|no|none|all|many|few|some/i.test(o))) return false;
  return new Set(options.map((o) => o.trim().toLowerCase())).size === options.length;
}

const FORM_OF: Record<BankEntry['kind'], PaperForm> = { mcq: 'mcq', tf: 'blank', blank: 'blank', jumble: 'oneword', match: 'short', order: 'short', multi: 'short', short: 'short', tapwords: 'short', oddone: 'mcq', correct: 'short', words: 'short', personal: 'oneword', together: 'oneword' };

export const LABELS = 'abcdefgh';

/** One bank entry as a paper question. True/false becomes "write T or F"; multiple choice keeps its options. */
export function toPaperQuestion(c: Cand, kind: string, marks: number, id: string, label: string, r: Rng, lines?: number): PaperQuestion | undefined {
  const q: Question = { ...entryToQuestion(c.e, r.fork(`${id}:${c.e.id}`)), typeId: c.t.id, level: c.e.level, marks };
  let form = FORM_OF[c.e.kind];
  let inputs: Input[] = q.inputs;
  let prompt = q.prompt;
  let options: string[] | undefined;
  let correctOption: number | undefined;
  if (c.e.kind === 'tf') {
    inputs = [{ id: 'a', mode: 'text', accepted: c.e.answer ? ['T', 'True'] : ['F', 'False'], hint: 'Write T for true or F for false' }];
    prompt = c.e.statement;
  }
  if (form === 'mcq') {
    const inp = q.inputs[0]!;
    options = inp.choices ?? [];
    correctOption = options.indexOf(inp.accepted[0]!);
    if (correctOption < 0 || options.length < 3 || !optionsFitStem(c.e.kind === 'mcq' ? c.e.stem : q.prompt, options)) return undefined;
  }
  if (kind.startsWith('writing-')) form = 'long';
  return { ...q, prompt, inputs, id, label, form, unitNumber: c.lesson.number, marks, options, correctOption, ...(lines ? { lines } : {}) };
}

export const answerText = (q: PaperQuestion): string[] => {
  if (q.form === 'mcq' && q.options && q.correctOption !== undefined) return [`(${['i', 'ii', 'iii', 'iv', 'v'][q.correctOption]}) ${q.options[q.correctOption]}`];
  return q.inputs.flatMap((i) => {
    if (i.mode === 'open') return [`Own answer. ${(Array.isArray(q.facts.examples) && (q.facts.examples as string[]).length ? `For example: ${(q.facts.examples as string[]).slice(0, 4).join(', ')}.` : 'A grown-up checks it.')}`];
    if (i.label?.startsWith('Word ') && i.accepted.length > 2) return [`${i.label}: any fitting word, for example ${i.accepted.slice(0, 4).join(', ')}`];
    if (i.mode === 'multi' || i.mode === 'ordered') return [i.accepted.join(', ')];
    return [`${i.label ? `${i.label}: ` : ''}${i.accepted[0] ?? ''}`];
  });
};

export const pointsFor = (q: PaperQuestion): MarkingPoint[] => {
  const rubric = Array.isArray(q.facts.rubric) ? (q.facts.rubric as string[]) : [];
  if (rubric.length) {
    const shares = blankShares(q.marks, rubric.length);
    return rubric.map((t, i) => ({ text: `${t[0]!.toUpperCase()}${t.slice(1)}`, marks: shares[i]! })).filter((p) => p.marks > 0);
  }
  if (q.inputs.length > 1) return blankShares(q.marks, q.inputs.length).map((m, i) => ({ text: `${q.inputs[i]!.label ?? `Part ${i + 1}`} correct`, marks: m })).filter((p) => p.marks > 0);
  if (q.inputs[0]?.mode === 'sentence') {
    const kw = Array.isArray(q.facts.keywords) ? (q.facts.keywords as string[]) : [];
    return kw.length && q.marks >= 2 ? [{ text: `Key ideas: ${kw.join(', ')}`, marks: q.marks - 0.5 }, { text: 'Written in a clear sentence', marks: 0.5 }] : [{ text: 'Right idea, written as a sentence', marks: q.marks }];
  }
  if (q.inputs[0]?.mode === 'open') return [{ text: 'A sensible answer of the child’s own (grown-up decides)', marks: q.marks }];
  return [{ text: 'Correct answer', marks: q.marks }];
};

const marksLabel = (n: number, each: number, total: number): string => {
  const f = (x: number): string => (Number.isInteger(x) ? String(x) : x === 0.5 ? '1/2' : String(x));
  return `${n}x${f(each)}=${total}`;
};

export interface EnglishConfig {
  format: EnglishFormat;
  units: number[];
  seed: string | number;
  header?: Partial<Pick<ExamHeader, 'examination' | 'session' | 'school' | 'className' | 'subject'>>;
}

/** The names of the paper's kinds in words a parent understands, for the message when the chosen portion is too small. */
const SECTION_OF: Record<string, string> = {
  'odd-noun': 'Practice Book section 1 (Naming Words)',
  'proper-names': 'Practice Book section 1 (Naming Words)',
  'one-word': 'Practice Book section 1 (Naming Words)',
  capitals: 'Practice Book section 1 (Naming Words) or 8 (Sentences)',
  'pronoun-underline': 'Practice Book section 2 (Replacing Words)',
  'fill-pronoun': 'Practice Book section 2 (Replacing Words)',
  plural: 'Practice Book section 3 (How Many)',
  'adjective-circle': 'Practice Book section 4 (Describing Words)',
  'two-describing': 'Practice Book section 4 (Describing Words)',
  'odd-describing': 'Practice Book section 4 (Describing Words)',
  'verb-underline': 'Practice Book section 5 (Verbs)',
  'two-actions': 'Practice Book section 5 (Verbs)',
};
const KIND_WORDS: Record<string, string> = {
  homophone: 'fill-in homophones (Reader lesson 1)',
  'who-said': 'who said to whom (Reader lessons 1, 2 or 4)',
  opposite: 'opposites (Reader lessons 1, 2 or 4)',
  synonym: 'synonyms (Reader lessons 1 to 3)',
};

/** The bar shows the title, then the instruction: never the same words twice. */
function sayOnce(spec: QSpec): string {
  const words = (t: string): string[] => t.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).filter(Boolean).map((w) => w.replace(/s$/, ''));
  const t = words(spec.title);
  const i = words(spec.instruction);
  if (!i.length || spec.chooseBest) return spec.instruction;
  const overlap = t[0] === i[0] || t.some((w) => w.length > 3 && i.includes(w));
  return overlap && i.length <= t.length + 3 ? '' : spec.instruction;
}

export function buildEnglishExam(config: EnglishConfig, lessons: LessonData[]): ExamResult {
  const fmt = ENGLISH_FORMATS[config.format];
  if (!fmt) return { ok: false, message: 'Choose Periodic Test or Term Exam.' };
  const chosen = clean(config.units).filter((n) => lessons.some((l) => l.number === n));
  if (chosen.length === 0) return { ok: false, message: 'Choose at least one Reader lesson and the Practice Book sections for this paper.' };
  const seed = normaliseExamSeed(config.seed);
  const code = makeEnglishCode({ format: config.format, units: chosen, seed });
  const r = createRng(`english-exam:${config.format}:${chosen.join(',')}:${seed}`);
  const pools = buildPools(lessons, chosen);
  const used = new Set<string>();
  const usedPassages = new Set<string>();
  const warnings: string[] = [];
  const missing: string[] = [];
  const sections: PaperSection[] = [];
  const unseenLesson = lessons.find((l) => l.number === UNSEEN);

  const take = (kind: string, only?: (c: Cand) => boolean): Cand | undefined => {
    const free = (pools.get(kind) ?? []).filter((c) => !used.has(c.e.id) && (!only || only(c)));
    if (free.length === 0) return undefined;
    // the school copies the book's own exercises: those first, then the bank
    const fromBook = free.filter((c) => examInfo(c.e, c.t, c.lesson.number).book);
    const all = fromBook.length > 0 ? fromBook : free;
    const level = pickLevel(r, [...new Set(all.map((c) => c.e.level))]);
    const atLevel = all.filter((c) => c.e.level === level);
    const pick = r.pick(atLevel.length ? atLevel : all);
    used.add(pick.e.id);
    return pick;
  };

  let qNo = 0;
  for (const spec of fmt.sections) {
    qNo++;
    let passage: Passage | undefined;
    let only: ((c: Cand) => boolean) | undefined;
    if (spec.unseen && unseenLesson) {
      // a passage with every kind of item this question needs, not used before in this paper
      const kinds = spec.items.map((i) => i.kind);
      const ok = unseenLesson.texts.filter((t) => !usedPassages.has(t.id) && kinds.every((k) => (pools.get(k) ?? []).some((c) => c.e.text === t.id && !used.has(c.e.id))));
      const level = pickLevel(r, [...new Set((pools.get(kinds[0]!) ?? []).filter((c) => ok.some((t) => t.id === c.e.text)).map((c) => c.e.level))]);
      const atLevel = ok.filter((t) => (pools.get(kinds[0]!) ?? []).some((c) => c.e.text === t.id && c.e.level === level));
      passage = r.pick(atLevel.length ? atLevel : ok.length ? ok : [undefined as unknown as Passage]);
      if (!passage) {
        missing.push('an unseen passage');
        continue;
      }
      usedPassages.add(passage.id);
      const pid = passage.id;
      only = (c) => c.e.text === pid;
    }
    const questions: PaperQuestion[] = [];
    for (const item of spec.items) {
      const cand = take(item.kind, only);
      if (!cand) {
        missing.push(item.kind);
        continue;
      }
      let pq: PaperQuestion | undefined;
      for (let tries = 0; tries < 6 && !pq; tries++) {
        pq = toPaperQuestion(cand, item.kind, item.marks, `q${qNo}${LABELS[questions.length]}`, LABELS[questions.length]!, r, spec.lines);
        if (!pq) {
          const again = take(item.kind, only);
          if (!again) break;
          Object.assign(cand, again);
        }
      }
      if (pq) questions.push(pq);
      else missing.push(item.kind);
    }
    const each = spec.items[0]!.marks;
    const total = specMarks(spec);
    sections.push({
      number: qNo,
      title: spec.title,
      form: questions[0]?.form ?? 'short',
      instruction: sayOnce(spec),
      count: questions.length,
      marksEach: each,
      marks: total,
      marksLabel: spec.chooseBest ? `any ${spec.chooseBest} x ${each} = ${total}` : marksLabel(questions.length, each, total),
      questions,
      ...(passage ? { passage } : {}),
      ...(spec.part ? { part: { ...spec.part, marks: 0 } } : {}),
      ...(spec.chooseBest ? { chooseBest: spec.chooseBest } : {}),
    });
  }
  if (missing.length) {
    const kinds = [...new Set(missing)];
    const words = kinds.map((k) => KIND_WORDS[k] ?? (k === 'an unseen passage' ? k : k.replace(/-/g, ' ')));
    const add = [...new Set(kinds.map((k) => SECTION_OF[k]).filter(Boolean))];
    const reader = kinds.some((k) => !SECTION_OF[k] && !k.startsWith('unseen') && !k.startsWith('writing') && k !== 'an unseen passage');
    const hints = [add.length ? `Add ${add.join(' and ')}.` : '', reader && !chosen.some(isReader) ? 'Choose at least one Reader lesson.' : reader ? 'Add another Reader lesson that has them.' : ''].filter(Boolean).join(' ');
    return { ok: false, message: `This portion is too small for the ${fmt.title}: it has no ${words.join(', ')}. ${hints || 'Add more lessons or sections.'}` };
  }
  // the parts' marks
  for (const s of sections) if (s.part) s.part.marks = 0;
  let cur: PaperSection | undefined;
  for (const s of sections) {
    if (s.part) cur = s;
    if (cur?.part) cur.part.marks += s.marks;
  }
  const total = sections.reduce((m, s) => m + s.marks, 0);
  if (total !== fmt.marks) return { ok: false, message: `The paper adds up to ${total} marks, not ${fmt.marks}. Please try New paper.` };

  const marksTable: MarksTableRow[] = sections.map((s) => ({ question: `Q${s.number}`, title: s.title, count: s.count, marksEach: s.marksEach, marks: s.marks, label: s.marksLabel }));
  const key: KeyEntry[] = sections.flatMap((s) =>
    s.questions.map((q) => ({
      id: q.id,
      number: `Q${s.number} ${q.label}`,
      form: q.form,
      marks: q.marks,
      unitNumber: q.unitNumber,
      prompt: q.prompt.replace(/\n/g, ' '),
      answers: answerText(q),
      steps: q.steps.slice(0, 3),
      markingPoints: pointsFor(q),
      ...(q.form === 'mcq' && q.correctOption !== undefined ? { correctLabel: ['i', 'ii', 'iii', 'iv', 'v'][q.correctOption] } : {}),
    })),
  );
  const header: ExamHeader = {
    examination: config.header?.examination || fmt.examination,
    session: config.header?.session || '2026-27',
    school: config.header?.school,
    className: config.header?.className || 'III',
    subject: config.header?.subject || 'English',
    minutes: fmt.minutes,
    totalMarks: fmt.marks,
    studentFields: ['Name', 'Roll no.'],
  };
  return {
    ok: true,
    exam: {
      code,
      format: config.format === 'A' ? 'A' : 'B',
      formatTitle: fmt.title,
      header,
      instructions: fmt.instructions,
      minutes: fmt.minutes,
      totalMarks: fmt.marks,
      sections,
      key,
      marksTable,
      unitsUsed: chosen,
      unitsLeftOut: [],
      warnings,
      proposed: false,
      subject: 'english',
    } as Exam,
  };
}

export function resolveEnglishExamCode(raw: string, lessons: LessonData[], header?: EnglishConfig['header']): ExamResult | undefined {
  const spec = parseEnglishCode(raw);
  if (!spec) return undefined;
  return buildEnglishExam({ format: spec.format, units: spec.units, seed: spec.seed, header }, lessons);
}

// ---- marking -----------------------------------------------------------------------------------------------------------------

export { needsGrownUp };

export function markEnglishExam(exam: Exam, answers: Record<string, Values>, manual: Record<string, number> = {}): ExamScore {
  const perQuestion: QuestionMark[] = [];
  const pending: string[] = [];
  const perSection: ExamScore['perSection'] = [];
  for (const sec of exam.sections) {
    const rows: QuestionMark[] = [];
    for (const q of sec.questions) {
      const values = answers[q.id] ?? {};
      const blank = q.inputs.every((i) => (values[i.id] ?? '').trim() === '');
      let awarded = 0;
      let perInput: boolean[] = [];
      let messages: string[] = [];
      if (needsGrownUp(q)) {
        perInput = q.inputs.map(() => false);
        if (manual[q.id] !== undefined) awarded = manual[q.id]!;
        else if (!blank) pending.push(q.id);
      } else {
        const g = gradeQuestion(q, values);
        perInput = g.perInput.map((x) => x === true);
        messages = g.messages.map((m) => m ?? '');
        awarded = q.inputs.length === 1 ? (perInput[0] ? q.marks : 0) : blankShares(q.marks, q.inputs.length).reduce((m, share, i) => m + (perInput[i] ? share : 0), 0);
        if (manual[q.id] !== undefined) awarded = manual[q.id]!;
        else if (openProperNames(q) && !blank) pending.push(q.id); // a friend's name: counted by the capital-letter rule, the grown-up confirms
      }
      awarded = Math.min(q.marks, Math.max(0, awarded));
      const status = blank && awarded === 0 ? 'blank' : awarded >= q.marks ? 'right' : awarded > 0 ? 'partial' : 'wrong';
      rows.push({ id: q.id, section: sec.number, marks: q.marks, awarded, status, perInput, messages });
    }
    if (sec.chooseBest) {
      // answer any N: the best N count
      const best = [...rows].sort((a, b) => b.awarded - a.awarded).slice(0, sec.chooseBest);
      const counted = new Set(best.map((b) => b.id));
      const awardedSum = best.reduce((m, b) => m + b.awarded, 0);
      perSection.push({ number: sec.number, title: sec.title, marks: sec.marks, awarded: awardedSum });
      rows.forEach((x) => (x.counted = counted.has(x.id)));
    } else if (sec.eitherOr) {
      // Either / Or: the better alternative counts
      const sum = (alt: 'either' | 'or'): number => rows.filter((x) => sec.questions.find((q) => q.id === x.id)?.alt === alt).reduce((m, x) => m + x.awarded, 0);
      const pick = sum('or') > sum('either') ? 'or' : 'either';
      rows.forEach((x) => (x.counted = sec.questions.find((q) => q.id === x.id)?.alt === pick));
      perSection.push({ number: sec.number, title: sec.title, marks: sec.marks, awarded: sum(pick) });
    } else perSection.push({ number: sec.number, title: sec.title, marks: sec.marks, awarded: rows.reduce((m, x) => m + x.awarded, 0) });
    perQuestion.push(...rows);
  }
  const total = perSection.reduce((m, s) => m + s.awarded, 0);
  return { perQuestion, perSection, total, outOf: exam.totalMarks, percent: exam.totalMarks === 0 ? 0 : Math.round((total / exam.totalMarks) * 100), pending };
}

export const randomEnglishSeed = randomExamSeed;
