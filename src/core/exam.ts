import { answerLines } from './practice';
import type { Passage } from './question';
import { createRng } from './rng';
import { generateQuestion } from './sheet';
import { isAutoMarked, type Level, type Question, type QuestionType, type SubjectId, type UnitDef } from './question';
import { EXAM_FORMATS, GENERAL_INSTRUCTIONS, type ExamFormat, type ExamFormatId, type ExamSection } from './examFormats';
import { makeExamCode, normaliseExamSeed, parseExamCode, cleanUnits } from './examCode';
import { buildMcqOptions, canMakeMcq, OPTION_LABELS } from './mcq';
import { formsOf, FORM_TITLES, type PaperForm } from './paper';

export interface ExamHeader {
  examination: string;
  session: string;
  school?: string;
  className: string;
  subject: string;
  minutes: number;
  totalMarks: number;
  /** Lines the student fills in at the top. */
  studentFields: string[];
}

export interface ExamConfig {
  format: ExamFormatId;
  /** Unit numbers chosen by the parent. Units not in `available` are left out with a warning. */
  units: number[];
  /** Any text; it is turned into the 4 character seed printed in the code. */
  seed: string | number;
  header?: Partial<Pick<ExamHeader, 'examination' | 'session' | 'school' | 'className' | 'subject'>>;
  /** Weights for Easy / Medium / Challenge. Not stored in the code: a custom mix cannot be regenerated from the code alone. */
  mix?: Partial<Record<Level, number>>;
}

export const DEFAULT_MIX: Record<Level, number> = { easy: 0.25, medium: 0.65, challenge: 0.1 };

/** One question on the paper. `marks` is the section's marks, whatever the question was worth on a sheet. */
export interface PaperQuestion extends Question {
  /** "q3b": section number, then letter. Stable key for answers. */
  id: string;
  /** "a", "b", ... */
  label: string;
  form: PaperForm;
  unitNumber: number;
  /** MCQ only: the four options shown as (i) to (iv), and the index of the right one. */
  options?: string[];
  correctOption?: number;
  /** Writing tasks: how many ruled lines the answer space has. */
  lines?: number;
  /** A line printed above this question: a part ("(b) Match the following"), or "OR" between the two choices of an Either / Or. */
  lead?: string;
  /** Either / Or: which alternative this question belongs to. The better alternative counts. */
  alt?: 'either' | 'or';
}

export interface PaperSection {
  /** 1-based question number: "Q1". */
  number: number;
  title: string;
  form: PaperForm;
  instruction: string;
  count: number;
  marksEach: number;
  marks: number;
  /** "3x1=3", printed at the right of the section. */
  marksLabel: string;
  questions: PaperQuestion[];
  /** English: the unseen passage printed above the questions of this section. */
  passage?: Passage;
  /** English Term Exam: the part (A, B, C) this section starts, printed as a heading. */
  part?: { label: string; title: string; marks: number };
  /** "Answer any two of three": only the best N questions count. */
  chooseBest?: number;
  /** Either / Or: the child does one of two alternatives (the questions say which with `alt`); the better one counts. */
  eitherOr?: boolean;
}

export interface MarkingPoint {
  text: string;
  marks: number;
}

export interface KeyEntry {
  id: string;
  /** "Q3 b" */
  number: string;
  form: PaperForm;
  marks: number;
  unitNumber: number;
  prompt: string;
  /** Right answer(s), one line per blank. For MCQ: the option label and text. */
  answers: string[];
  steps: string[];
  /** Adds up to `marks`. */
  markingPoints: MarkingPoint[];
  /** MCQ only: "iii". */
  correctLabel?: string;
}

export interface MarksTableRow {
  question: string;
  title: string;
  count: number;
  marksEach: number;
  marks: number;
  label: string;
}

export interface Exam {
  code: string;
  format: ExamFormatId;
  formatTitle: string;
  header: ExamHeader;
  instructions: string[];
  minutes: number;
  totalMarks: number;
  sections: PaperSection[];
  key: KeyEntry[];
  marksTable: MarksTableRow[];
  /** Units that really have questions on the paper, ascending. */
  unitsUsed: number[];
  /** Units asked for but not on the paper (not built, or too many for the marks). */
  unitsLeftOut: number[];
  warnings: string[];
  /** 'english' papers are marked by the English marker (written answers and the child's own answers go to a grown-up). */
  subject?: SubjectId;
}

export type ExamResult = { ok: true; exam: Exam } | { ok: false; message: string };

const FORM_RANK: Record<PaperForm, number> = { word: 0, long: 1, short: 2, blank: 3, oneword: 4, mcq: 5 };
const FORM_LEVELS: Record<PaperForm, Level[]> = { mcq: ['easy', 'medium'], oneword: ['easy', 'medium'], blank: ['easy', 'medium'], short: ['easy', 'medium'], long: ['medium', 'challenge'], word: ['medium', 'challenge'] };

const keysOf = (q: Question): string[] => [`${q.prompt}|${JSON.stringify(q.diagram ?? null)}|${JSON.stringify(q.inputs.map((i) => i.choices ?? null))}`, `facts:${q.typeId}:${q.level}:${JSON.stringify(q.facts)}`];

interface Slot {
  index: number;
  section: number;
  position: number;
  spec: ExamSection;
}

interface Placed {
  slot: Slot;
  q: PaperQuestion;
  unit: number;
}

function pickLevel(allowed: Level[], weights: Partial<Record<Level, number>>, r: number): Level {
  const w = allowed.map((l) => Math.max(0, weights[l] ?? 0));
  const sum = w.reduce((a, b) => a + b, 0);
  if (sum <= 0) return allowed[Math.min(allowed.length - 1, Math.floor(r * allowed.length))]!;
  let x = r * sum;
  for (let i = 0; i < allowed.length; i++) {
    x -= w[i]!;
    if (x < 0) return allowed[i]!;
  }
  return allowed[allowed.length - 1]!;
}

/** Marks for each blank so they add up exactly to `marks` (in half marks). */
export function blankShares(marks: number, n: number): number[] {
  const units = marks * 2;
  const base = Math.floor(units / n);
  const rem = units % n;
  return Array.from({ length: n }, (_, i) => (base + (i < rem ? 1 : 0)) / 2);
}

function markingPoints(form: PaperForm, marks: number, inputs: number): MarkingPoint[] {
  if (inputs > 1) return blankShares(marks, inputs).map((m, i) => ({ text: `Blank ${i + 1} correct`, marks: m })).filter((p) => p.marks > 0);
  if (form === 'short') return [{ text: 'Correct method or working shown', marks: 1 }, { text: 'Correct answer', marks: marks - 1 }];
  if (form === 'long') return [{ text: 'Correct method', marks: 1 }, { text: 'Working shown neatly', marks: 1 }, { text: 'Correct answer', marks: marks - 2 }];
  if (form === 'word') return [{ text: 'Chooses the right operation', marks: 1 }, { text: 'Working shown', marks: 1 }, { text: 'Correct answer', marks: 1 }, { text: 'Answer written with its unit or in a sentence', marks: marks - 3 }];
  return [{ text: 'Correct answer', marks }];
}

function keyEntry(sec: PaperSection, q: PaperQuestion): KeyEntry {
  const lines = q.options ? [`(${OPTION_LABELS[q.correctOption!]}) ${q.options[q.correctOption!]}`] : answerLines(q);
  return {
    id: q.id,
    number: `Q${sec.number} ${q.label}`,
    form: q.form,
    marks: q.marks,
    unitNumber: q.unitNumber,
    prompt: q.prompt,
    answers: lines,
    steps: q.steps,
    markingPoints: markingPoints(q.form, q.marks, q.inputs.length),
    correctLabel: q.options ? OPTION_LABELS[q.correctOption!] : undefined,
  };
}

function mixForSection(spec: ExamSection, mix: Partial<Record<Level, number>>): { allowed: Level[]; weights: Partial<Record<Level, number>> } {
  if (spec.levels) return { allowed: (Object.keys(spec.levels) as Level[]).filter((l) => (spec.levels![l] ?? 0) > 0), weights: spec.levels };
  return { allowed: FORM_LEVELS[spec.form], weights: mix };
}

/** Builds the exam. Pure and repeatable: same config, same paper. */
export function buildExam(config: ExamConfig, available: UnitDef[]): ExamResult {
  const format: ExamFormat | undefined = EXAM_FORMATS[config.format];
  if (!format) return { ok: false, message: `Unknown exam format ${String(config.format)}.` };
  const warnings: string[] = [];
  const requested = cleanUnits(config.units);
  if (requested.length === 0) return { ok: false, message: 'Choose at least one chapter for the exam.' };
  const byNumber = new Map(available.map((u) => [u.number, u]));
  const chosen = requested.filter((n) => byNumber.has(n));
  const notBuilt = requested.filter((n) => !byNumber.has(n));
  if (notBuilt.length) warnings.push(`Chapter${notBuilt.length > 1 ? 's' : ''} ${notBuilt.join(', ')} ${notBuilt.length > 1 ? 'are' : 'is'} not open yet, so ${notBuilt.length > 1 ? 'they were' : 'it was'} left out.`);
  if (chosen.length === 0) return { ok: false, message: 'None of the chosen chapters is open yet.' };

  const seed = normaliseExamSeed(config.seed);
  const code = makeExamCode({ format: format.id, units: chosen, seed });
  const base = `exam:${format.id}:${chosen.join(',')}:${seed}`;
  const rng = createRng(base);
  const mix = { ...DEFAULT_MIX, ...(config.mix ?? {}) };

  const slots: Slot[] = format.sections.flatMap((spec, section) => Array.from({ length: spec.count }, (_, position) => ({ index: 0, section, position, spec })));
  slots.forEach((s, i) => (s.index = i));
  const total = slots.length;

  // Which chapters can appear: all of them when there are enough questions, else a seeded pick.
  const shuffled = rng.fork('units').shuffle(chosen);
  const covered = shuffled.slice(0, Math.min(total, shuffled.length));
  const leftOut = shuffled.slice(covered.length).sort((a, b) => a - b);
  if (leftOut.length) warnings.push(`Too many chapters for ${format.totalMarks} marks: the paper has only ${total} questions, so chapter${leftOut.length > 1 ? 's' : ''} ${leftOut.join(', ')} could not be included. Choose fewer chapters or use the longer exam.`);

  const typesOf = new Map<number, QuestionType[]>(covered.map((n) => [n, byNumber.get(n)!.types.filter(isAutoMarked)]));
  const used = new Set<string>();
  const typeUse = new Map<string, number>();
  const placed: Placed[] = [];

  const tryFill = (slot: Slot, unitNumber: number, skipKeys: Set<string>): Placed | undefined => {
    const types = typesOf.get(unitNumber)!;
    if (types.length === 0) return undefined;
    const order = createRng(`${base}:order:${slot.index}:${unitNumber}`).shuffle(types).sort((a, b) => (typeUse.get(a.id) ?? 0) - (typeUse.get(b.id) ?? 0));
    const { allowed, weights } = mixForSection(slot.spec, mix);
    const allowedForms: PaperForm[] = [slot.spec.form, ...(slot.spec.alsoForms ?? [])];
    const tries = types.length * 4;
    for (let attempt = 0; attempt < tries; attempt++) {
      const type = order[attempt % order.length]!;
      const r = createRng(`${base}:s${slot.index}:u${unitNumber}:a${attempt}`);
      // the first pass keeps to the mix; later passes accept any level the form can take
      const level = attempt < types.length * 2 ? pickLevel(allowed, weights, r.next()) : pickLevel(['easy', 'medium', 'challenge'], { easy: 1, medium: 1, challenge: 1 }, r.next());
      const q = generateQuestion(type, level, r.fork('q'));
      const keys = keysOf(q);
      if (keys.some((k) => used.has(k) || skipKeys.has(k))) continue;
      const found = formsOf(type, q, canMakeMcq(q));
      // late in the search a blanks slot also takes any single-answer question, written with its answer space
      const lateBlank = slot.spec.form === 'blank' && attempt >= types.length * 2 && found.includes('oneword');
      const forms = lateBlank ? (['blank'] as PaperForm[]) : found.filter((f) => allowedForms.includes(f));
      if (forms.length === 0) continue;
      const form = forms.length === 1 ? forms[0]! : r.pick(forms);
      let paperQ: PaperQuestion = { ...q, id: `q${slot.section + 1}${String.fromCharCode(97 + slot.position)}`, label: String.fromCharCode(97 + slot.position), form, unitNumber, marks: slot.spec.marksEach };
      if (form === 'mcq') {
        const m = buildMcqOptions(q, r.fork('mcq'));
        if (!m) continue;
        const input = q.inputs[0]!;
        paperQ = { ...paperQ, options: m.options, correctOption: m.correct, inputs: [{ ...input, mode: 'choice', accepted: [m.options[m.correct]!], choices: m.options, unit: undefined, hint: 'Tap the correct option' }] };
      }
      keys.forEach((k) => used.add(k));
      typeUse.set(type.id, (typeUse.get(type.id) ?? 0) + 1);
      return { slot, q: paperQ, unit: unitNumber };
    }
    return undefined;
  };

  // Hardest forms first, chapters dealt round and round so every chapter gets a share.
  const fillOrder = [...slots].sort((a, b) => FORM_RANK[a.spec.form] - FORM_RANK[b.spec.form] || a.index - b.index);
  let cursor = 0;
  const failed: Slot[] = [];
  for (const slot of fillOrder) {
    let got: Placed | undefined;
    for (let k = 0; k < covered.length && !got; k++) got = tryFill(slot, covered[(cursor + k) % covered.length]!, new Set());
    cursor++;
    if (got) placed.push(got);
    else failed.push(slot);
  }
  if (failed.length) return { ok: false, message: `Could not build ${failed.length} question(s) for the chosen chapters. Try another code or different chapters.` };

  // Make sure every covered chapter appears: swap a question from a chapter that has several.
  const countOf = (n: number): number => placed.filter((p) => p.unit === n).length;
  for (const n of covered) {
    if (countOf(n) > 0) continue;
    const candidates = [...placed].sort((a, b) => countOf(b.unit) - countOf(a.unit) || FORM_RANK[b.slot.spec.form] - FORM_RANK[a.slot.spec.form]).filter((p) => countOf(p.unit) > 1);
    let fixed = false;
    for (const victim of candidates) {
      const old = keysOf(victim.q);
      old.forEach((k) => used.delete(k));
      const again = tryFill(victim.slot, n, new Set());
      if (again) {
        placed[placed.indexOf(victim)] = again;
        fixed = true;
        break;
      }
      old.forEach((k) => used.add(k));
    }
    if (!fixed) warnings.push(`Chapter ${n} could not be fitted onto the paper.`);
  }

  const sections: PaperSection[] = format.sections.map((spec, i) => {
    const questions = placed.filter((p) => p.slot.section === i).sort((a, b) => a.slot.position - b.slot.position).map((p) => p.q);
    const marks = spec.count * spec.marksEach;
    return { number: i + 1, title: spec.title, form: spec.form, instruction: spec.instruction, count: spec.count, marksEach: spec.marksEach, marks, marksLabel: `${spec.count}x${spec.marksEach}=${marks}`, questions };
  });
  const totalMarks = sections.reduce((m, s) => m + s.questions.reduce((a, q) => a + q.marks, 0), 0);
  const header: ExamHeader = {
    examination: config.header?.examination ?? format.defaultExamination,
    session: config.header?.session ?? '2026-27',
    school: config.header?.school,
    className: config.header?.className ?? 'III',
    subject: config.header?.subject ?? 'Maths',
    minutes: format.minutes,
    totalMarks,
    studentFields: ['Name', 'Roll No.'],
  };
  const exam: Exam = {
    code,
    format: format.id,
    formatTitle: format.title,
    header,
    instructions: GENERAL_INSTRUCTIONS,
    minutes: format.minutes,
    totalMarks,
    sections,
    key: sections.flatMap((s) => s.questions.map((q) => keyEntry(s, q))),
    marksTable: sections.map((s) => ({ question: `Q${s.number}`, title: s.title, count: s.count, marksEach: s.marksEach, marks: s.marks, label: s.marksLabel })),
    unitsUsed: [...new Set(placed.map((p) => p.unit))].sort((a, b) => a - b),
    unitsLeftOut: [...new Set([...notBuilt, ...leftOut])].sort((a, b) => a - b),
    warnings,
  };
  return { ok: true, exam };
}

/** Rebuilds a paper from its code alone (header fields can be passed again; they are not in the code). */
export function resolveExamCode(raw: string, available: UnitDef[], header?: ExamConfig['header']): ExamResult {
  const spec = parseExamCode(raw);
  if (!spec) return { ok: false, message: 'That does not look like an exam code. It looks like EX-A-0105-4F7K and is printed on the answer key.' };
  return buildExam({ format: spec.format, units: spec.units, seed: spec.seed, header }, available);
}

export const flatPaperQuestions = (e: Exam): PaperQuestion[] => e.sections.flatMap((s) => s.questions);
export { FORM_TITLES };
