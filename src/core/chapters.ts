import { PASS_PERCENT, type Firsts } from './activity';
import { BOOKS, bookById, type BookKey } from './books';
import { cellKey, type KidProgress } from './progress';
import { isAutoMarked, type Level, type QuestionType, type UnitDef } from './question';

/**
 * The chapters that count towards Pip: every chapter of every book in the registry (src/core/books.ts). Today that is
 * Maths units 1 to 12, English Reader lessons 1 to 4 and Practice Book sections 1 to 11 (docs/design/e-mix/PIP.md).
 * Unseen passages, exams, Word Quest, Book exercises and do-together topics do not count.
 */
export type { BookKey };
export interface Chapter {
  key: string;
  book: BookKey;
  /** the number the book shows */
  n: number;
  /** Pip points the chapter is worth */
  weight: number;
}
export const CHAPTERS: Chapter[] = BOOKS.flatMap((b) => b.chapters.map((c) => ({ key: `${b.id}:${c.n}`, book: b.id, n: c.n, weight: c.weight ?? 1 })));
export const BOOK_WORD: Record<BookKey, string> = Object.fromEntries(BOOKS.map((b) => [b.id, b.word]));

/** The unit behind a chapter. Practice Book sections are units 11 to 21 inside the app. */
export function unitOfChapter(c: Chapter, units: UnitDef[]): UnitDef | undefined {
  const b = bookById(c.book);
  return units.find((u) => (u.subject ?? 'maths') === b.subject && u.number === c.n + b.unitOffset);
}

/** The chapter key of a unit, or undefined for the unseen passages. */
export function chapterKeyOf(u: Pick<UnitDef, 'subject' | 'number'>): string | undefined {
  const subject = u.subject ?? 'maths';
  for (const b of BOOKS) if (b.subject === subject && b.chapters.some((c) => c.n === u.number - b.unitOffset)) return `${b.id}:${u.number - b.unitOffset}`;
  return undefined;
}

/** The topics that count: marked ones, not do-together and not the book's own exercises. */
export const countedTopics = (unit: UnitDef): QuestionType[] => unit.types.filter((t) => isAutoMarked(t) && !t.book);

/** A topic set at this level with at least 3 answers and 70% right, now or before logging began. */
export function passed(p: KidProgress | undefined, firsts: Record<string, Firsts> | undefined, topicId: string, level: Level): boolean {
  const cell = p?.cells[cellKey(topicId, level)];
  if (cell && cell.bestOf >= 3 && cell.best * 100 >= PASS_PERCENT * cell.bestOf) return true;
  return firsts?.[topicId]?.passed?.[level] !== undefined;
}

export interface ChapterState {
  easy: boolean;
  medium: boolean;
  challenge: boolean;
  /** Easy and Medium passed on every counted topic (Challenge is optional) */
  done: boolean;
  /** anything answered or any mark filled */
  started: boolean;
}

export function chapterState(p: KidProgress | undefined, firsts: Record<string, Firsts> | undefined, unit: UnitDef): ChapterState {
  const topics = countedTopics(unit);
  const every = (l: Level): boolean => topics.length > 0 && topics.every((t) => passed(p, firsts, t.id, l));
  const easy = every('easy');
  const medium = every('medium');
  const challenge = every('challenge');
  const attempted = unit.types.some((t) => (['easy', 'medium', 'challenge'] as Level[]).some((l) => (p?.cells[cellKey(t.id, l)]?.attempts ?? 0) > 0));
  return { easy, medium, challenge, done: easy && medium, started: attempted || easy || medium || challenge };
}

/** How many counted topics of a chapter have this level passed, out of all counted topics. */
export function levelProgress(p: KidProgress | undefined, firsts: Record<string, Firsts> | undefined, unit: UnitDef, level: Level): { passed: number; of: number } {
  const topics = countedTopics(unit);
  return { passed: topics.filter((t) => passed(p, firsts, t.id, level)).length, of: topics.length };
}

/** Milestones on the way through a level: a quarter, half, three quarters, and all (the last is the level-done moment). */
export const MILESTONES = [25, 50, 75, 100] as const;
export type Milestone = (typeof MILESTONES)[number];
/** Topics that must be passed to reach a milestone: rounded up, never fewer than one. 27 topics: 7, 14, 21, 27. 4 topics: 1, 2, 3, 4. */
export const topicsFor = (of: number, m: Milestone): number => Math.max(1, Math.ceil((of * m) / 100));
export const reachedMilestone = (passed: number, of: number, m: Milestone): boolean => of > 0 && passed >= topicsFor(of, m);
/** How many of the four milestones are reached (0 to 4). */
export const milestoneTicks = (passed: number, of: number): number => MILESTONES.filter((m) => reachedMilestone(passed, of, m)).length;
