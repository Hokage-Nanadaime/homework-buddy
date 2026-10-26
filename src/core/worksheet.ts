import type { Level, Question, QuestionType, SubjectId, UnitDef } from './question';
import { topicSet, mixedSet, setDoc, testDoc, type PracticeSet } from './docs';
import type { PrintDoc } from './print';
import { buildUnitTest, type TestPaper } from './sheet';
import type { Values } from './practice';

/** Letters and digits that cannot be mixed up on paper (no 0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const LEVEL_CODE: Record<Level, string> = { easy: 'EAS', medium: 'MED', challenge: 'CHA' };
const CODE_LEVEL: Record<string, Level> = { EAS: 'easy', MED: 'medium', CHA: 'challenge' };

export type Kind = 'topic' | 'mixed' | 'test' | 'book';
export type SheetKind = Kind | 'exam';

export interface Spec {
  /** Left out for Maths (codes start with M); 'english' codes start with E. */
  subject?: SubjectId;
  unitNumber: number;
  kind: Kind;
  /** two-digit topic number, topic sheets only */
  topic?: string;
  level?: Level;
  seed: string;
  /** Mixed sheets only: how many questions (10 when the code does not say). */
  size?: number;
}

export function randomSeed(pick: () => number = Math.random): string {
  return Array.from({ length: 4 }, () => ALPHABET[Math.floor(pick() * ALPHABET.length)]).join('');
}

const pad = (n: number): string => String(n).padStart(2, '0');

const SUBJECT_LETTER: Record<SubjectId, string> = { maths: 'M', english: 'E', evs: 'V' };
const LETTER_SUBJECT: Record<string, SubjectId> = { M: 'maths', E: 'english', V: 'evs' };

export const subjectOf = (u: Pick<UnitDef, 'subject'>): SubjectId => u.subject ?? 'maths';
/** "Unit" for Maths, "Lesson" for English. */
/** What an entry of a book is called: a Maths unit, an English Reader lesson, a Practice Book section, a set of unseen passages. */
/** The number the book shows: Practice Book sections 11 to 21 inside the app are sections 1 to 11 in the book. */
export const bookNumber = (n: number, subject?: SubjectId): number => (subject !== 'evs' && n >= 11 && n < 31 ? n - 10 : n);
/** "Section 3", "Lesson 2", "Unit 5", or just "Unseen passages". */
export const unitLabel = (u: Pick<UnitDef, 'subject'> & { number?: number }): string => ((u.number ?? 0) >= 31 && subjectOf(u) === 'english' ? 'Unseen passages' : `${unitWord(u)} ${subjectOf(u) === 'evs' ? u.number : bookNumber(u.number ?? 0)}`);
export const unitWord = (u: Pick<UnitDef, 'subject'> & { number?: number }): string => (subjectOf(u) === 'evs' ? 'Chapter' : subjectOf(u) === 'english' ? ((u.number ?? 0) >= 31 ? 'Set' : (u.number ?? 0) >= 11 ? 'Section' : 'Lesson') : 'Unit');

/** M01-T05-MED-4F7K, M01-MED-4F7K (mixed) or M01-TEST-4F7K (unit test). English: E01-T05-MED-4F7K and so on. */
export function makeCode(s: Spec): string {
  const u = `${SUBJECT_LETTER[s.subject ?? 'maths']}${pad(s.unitNumber)}`;
  if (s.kind === 'test') return `${u}-TEST-${s.seed}`;
  if (s.kind === 'book') return s.topic === 'ALL' ? `${u}-BOOK` : `${u}-BX${s.topic}`;
  if (s.kind === 'mixed') return `${u}-${LEVEL_CODE[s.level!]}-${s.size && s.size !== 10 ? `${s.size}-` : ''}${s.seed}`;
  return `${u}-T${s.topic}-${LEVEL_CODE[s.level!]}-${s.seed}`;
}

/** Accepts any case, spaces, dashes and underscores. Returns undefined when it is not a worksheet code. */
export function parseCode(raw: string): Spec | undefined {
  const t = raw.toUpperCase().replace(/[\s\-_.]+/g, '');
  const m = /^([MEV])(\d{2})(.*)$/.exec(t);
  if (!m) return undefined;
  const subject = LETTER_SUBJECT[m[1]!]!;
  const base: Pick<Spec, 'subject' | 'unitNumber'> = { ...(subject === 'maths' ? {} : { subject }), unitNumber: Number(m[2]) };
  const rest = m[3]!;
  if (rest === 'BOOK') return { ...base, kind: 'book', topic: 'ALL', level: 'medium', seed: '' };
  const bx = /^BX(\d{2})$/.exec(rest);
  if (bx) return { ...base, kind: 'book', topic: bx[1], level: 'medium', seed: '' };
  const test = /^TEST([A-Z0-9]{4})$/.exec(rest);
  if (test) return { ...base, kind: 'test', seed: test[1]! };
  const topic = /^T(\d{2})(EAS|MED|CHA)([A-Z0-9]{4})$/.exec(rest);
  if (topic) return { ...base, kind: 'topic', topic: topic[1], level: CODE_LEVEL[topic[2]!], seed: topic[3]! };
  const mixed = /^(EAS|MED|CHA)([A-Z0-9]{4})$/.exec(rest);
  if (mixed) return { ...base, kind: 'mixed', level: CODE_LEVEL[mixed[1]!], seed: mixed[2]! };
  const sized = /^(EAS|MED|CHA)(\d{2})([A-Z0-9]{4})$/.exec(rest);
  if (sized && Number(sized[2]) >= 5 && Number(sized[2]) <= 50) return { ...base, kind: 'mixed', level: CODE_LEVEL[sized[1]!], size: Number(sized[2]), seed: sized[3]! };
  return undefined;
}

export const topicNumber = (typeId: string): string => typeId.split('-T')[1] ?? '00';

export interface Worksheet {
  code: string;
  spec?: Spec;
  unit: UnitDef;
  title: string;
  kind: SheetKind;
  sections: { title?: string; questions: Question[] }[];
  /** For a test: the paper (marks per section). */
  paper?: TestPaper;
  set?: PracticeSet;
  doc: PrintDoc;
  level?: Level;
  /** Set when the sheet is a school-style exam paper. */
  exam?: import('./exam').Exam;
}

export type Resolved = { ok: true; sheet: Worksheet } | { ok: false; message: string };

/** The same code always gives the same questions. `units` may hold both subjects: the code's letter picks the subject. */
export function resolveSpec(spec: Spec, units: UnitDef[]): Resolved {
  const subject = spec.subject ?? 'maths';
  const unit = units.find((u) => subjectOf(u) === subject && u.number === spec.unitNumber);
  if (!unit) return { ok: false, message: `${subject === 'english' ? 'English lesson' : subject === 'evs' ? 'EVS chapter' : 'Unit'} ${spec.unitNumber} is not open yet, so this code cannot be used here.` };
  const code = makeCode(spec);
  if (spec.kind === 'test') {
    const paper = buildUnitTest(unit, spec.seed);
    return { ok: true, sheet: { code, spec, unit, title: paper.title, kind: 'test', paper, sections: paper.sections.map((s) => ({ title: s.title, questions: s.questions })), doc: { ...testDoc(unit, paper), code } } };
  }
  if (spec.kind === 'book') {
    const all = unit.bookExercises ?? [];
    const one = spec.topic === 'ALL' ? undefined : all.find((x) => x.key === spec.topic);
    if (spec.topic !== 'ALL' && !one) return { ok: false, message: `Exercise ${spec.topic} is not in ${unitWord(unit)} ${bookNumber(unit.number, subjectOf(unit))}. Check the code on the sheet.` };
    const questions = (one ? [one] : all).flatMap((x) => x.questions());
    if (questions.length === 0) return { ok: false, message: 'This lesson has no book exercises yet.' };
    const bset: PracticeSet = { title: one ? `Exercise ${one.id}, page ${one.page}` : 'Book exercises, in book order', level: 'medium', book: true, code, questions };
    return { ok: true, sheet: { code, spec, unit, title: `${unit.title}: ${bset.title}`, kind: 'book', level: 'medium', set: bset, sections: [{ questions }], doc: { ...setDoc(unit, bset), code } } };
  }
  let set: PracticeSet;
  if (spec.kind === 'topic') {
    const type = unit.types.find((t: QuestionType) => topicNumber(t.id) === spec.topic);
    if (!type) return { ok: false, message: `Topic ${spec.topic} is not in ${unitWord(unit)} ${unit.number}. Check the code on the sheet.` };
    set = topicSet(type, spec.level!, spec.seed);
  } else {
    set = mixedSet(unit, spec.level!, spec.seed, spec.size ?? 10);
  }
  set = { ...set, code };
  return { ok: true, sheet: { code, spec, unit, title: `${unit.title}: ${set.title}`, kind: spec.kind, level: spec.level, set, sections: [{ questions: set.questions }], doc: { ...setDoc(unit, set), code } } };
}

export function resolveCode(raw: string, units: UnitDef[]): Resolved {
  const spec = parseCode(raw);
  if (!spec) return { ok: false, message: 'That does not look like a worksheet code. It looks like M01-MED-4F7K (or E01-MED-4F7K for English) and is printed at the bottom of every page.' };
  return resolveSpec(spec, units);
}

export type SheetStatus = 'not started' | 'half done' | 'checked';

/** A printed worksheet kept for one kid. */
export interface SavedSheet {
  id: string;
  kidId: string;
  code: string;
  title: string;
  printedAt: string;
  status: SheetStatus;
  /** key = index of the question in the flat list */
  answers: Record<string, Values>;
  grownUp: Record<string, boolean>;
  got?: number;
  of?: number;
  best?: number;
  bestOf?: number;
  /** fingerprint of the questions when the answers were typed in or the sheet was printed */
  fp?: string;
}

export const sheetId = (kidId: string, code: string): string => `${kidId}_${code}`;

export function newSaved(kidId: string, code: string, title: string, now: string): SavedSheet {
  return { id: sheetId(kidId, code), kidId, code, title, printedAt: now, status: 'not started', answers: {}, grownUp: {} };
}

export function statusFor(s: Pick<SavedSheet, 'answers' | 'grownUp' | 'status'>): SheetStatus {
  if (s.status === 'checked') return 'checked';
  const any = Object.values(s.answers).some((v) => Object.values(v).some((x) => x.trim() !== '')) || Object.values(s.grownUp).some(Boolean);
  return any ? 'half done' : 'not started';
}

export const flatQuestions = (w: Worksheet): Question[] => w.sections.flatMap((s) => s.questions);
