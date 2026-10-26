import { chapterState, countedTopics } from './chapters';
import type { Firsts } from './activity';
import type { KidProgress } from './progress';
import type { Level, QuestionType, UnitDef } from './question';

export type Status = 'done' | 'reading' | 'new';

/** The topics that count for the marks (see chapters.ts). */
export const practiceTypes = (unit: UnitDef): QuestionType[] => countedTopics(unit);

/** Easy, Medium and Challenge ink marks: filled when every counted topic has that level passed. */
export function levelMarks(p: KidProgress | undefined, firsts: Record<string, Firsts> | undefined, unit: UnitDef): Record<Level, boolean> {
  const s = chapterState(p, firsts, unit);
  return { easy: s.easy, medium: s.medium, challenge: s.challenge };
}

/** Done: Easy and Medium marks filled. Reading: not Done but something answered, a mark filled or a set unfinished. New: nothing. */
export function unitStatus(p: KidProgress | undefined, firsts: Record<string, Firsts> | undefined, unit: UnitDef, unfinished = false): Status {
  const s = chapterState(p, firsts, unit);
  if (s.done) return 'done';
  return s.started || unfinished ? 'reading' : 'new';
}

/** Seconds practised on one local calendar day (activity entries and Word Quest rows). */
export function secondsOnDay(log: { entries: { at: string; secs: number }[]; quest: { at: string; secs: number }[] } | undefined, day: Date): number {
  if (!log) return 0;
  const key = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const want = key(day);
  return [...log.entries, ...log.quest].reduce((m, r) => (key(new Date(r.at)) === want ? m + (r.secs || 0) : m), 0);
}
