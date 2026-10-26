import { createRng } from './rng';
import { generateSet } from './sheet';
import { isAutoMarked, MARKS, type Level, type Question, type QuestionType, type SubjectId, type UnitDef } from './question';
import type { PrintDoc } from './print';
import { fileSlug } from './print';
import type { TestPaper } from './sheet';

export const LEVEL_NAME: Record<Level, string> = { easy: 'Easy', medium: 'Medium', challenge: 'Challenge' };
export const SET_SIZE = 10;

export interface PracticeSet {
  title: string;
  level: Level;
  topicId?: string;
  /** The book's own exercises, exactly as printed: same questions every time, no level picker. */
  book?: boolean;
  code?: string;
  questions: Question[];
}

/** Ten different questions from one topic and level. A new seed gives a new set. */
export function topicSet(type: QuestionType, level: Level, seed: string, size = SET_SIZE): PracticeSet {
  return { title: type.title, level, topicId: type.id, questions: generateSet(type, level, size, seed) };
}

/** A mixed set: one question from each topic in turn, topics dealt in a shuffled order. */
export function mixedSet(unit: UnitDef, level: Level, seed: string, size = SET_SIZE): PracticeSet {
  const rng = createRng(`${seed}:mixed:${unit.id}:${level}`);
  const pool = unit.types.filter((t) => isAutoMarked(t) && !t.book);
  let queue: QuestionType[] = [];
  const seen = new Set<string>();
  const questions: Question[] = [];
  for (let guard = 0; questions.length < size && guard < size * 20; guard++) {
    if (queue.length === 0) queue = rng.shuffle(pool);
    const t = queue.pop()!;
    const q = generateSet(t, level, 1, `${seed}:${guard}`, seen)[0];
    if (!q) continue;
    seen.add(`${q.prompt}|${JSON.stringify(q.diagram ?? null)}`);
    questions.push(q);
  }
  return { title: 'Mixed practice', level, questions };
}

/** Do-together items are never scored, so they add no marks. */
const total = (qs: Question[]): number => qs.reduce((m, q) => m + (q.together ? 0 : q.marks), 0);

export const SUBJECT_NAME: Record<SubjectId, string> = { maths: 'Maths', english: 'English', evs: 'EVS' };
const subjectName = (unit: UnitDef): string => SUBJECT_NAME[unit.subject ?? 'maths'];
/** File names: maths-unit-01-… or english-lesson-01-… */
const slugBase = (unit: UnitDef): string => (unit.subject === 'english' ? `english-lesson-${unit.id}` : unit.subject === 'evs' ? `evs-chapter-${unit.id}` : `maths-unit-${unit.id}`);

export function setDoc(unit: UnitDef, set: PracticeSet): PrintDoc {
  return {
    kicker: `${subjectName(unit)} · Class 3 · ${set.book ? 'Exactly as in the book' : LEVEL_NAME[set.level]}`,
    title: unit.title,
    subtitle: set.title,
    items: set.questions.map((question, i) => ({ question, ...(set.book && question.book && set.questions[i - 1]?.book?.exercise !== question.book.exercise ? { section: `${question.book.exercise} · page ${question.book.page}${question.book.instruction ? ` · ${question.book.instruction}` : ''}` } : {}) })),
    totalMarks: total(set.questions),
    slug: fileSlug(`${slugBase(unit)}-${set.title}-${set.book ? 'book' : set.level}`),
    code: set.code,
    texts: unit.texts,
  };
}

export function testDoc(unit: UnitDef, paper: TestPaper): PrintDoc {
  return {
    kicker: `${subjectName(unit)} · Class 3 · ${unit.subject === 'english' ? 'Lesson' : 'Unit'} test`,
    title: paper.title,
    note: `Time allowed: ${paper.minutes} minutes. Total: ${paper.totalMarks} marks.`,
    items: paper.sections.flatMap((s) => s.questions.map((question, i) => ({ question, section: i === 0 ? s.title : undefined }))),
    totalMarks: paper.totalMarks,
    slug: fileSlug(`${slugBase(unit)}-${unit.subject === 'english' ? 'lesson' : 'unit'}-test`),
    texts: unit.texts,
  };
}

export { MARKS };
