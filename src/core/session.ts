import type { Level, SubjectId } from './question';
import type { Values } from './practice';
import type { Spec } from './worksheet';

/** Where a practice set got to. The questions themselves are rebuilt from the worksheet code. */
export interface PracticeState {
  idx: number;
  values: Values;
  /** judging: a written (sentence) answer waits for the grown-up's decision. notyet: the grown-up said not yet. */
  phase: 'answering' | 'wrong' | 'right' | 'revealed' | 'asked' | 'judging' | 'notyet';
  tries: number;
  hinted: boolean;
  done: boolean[];
  firstTry: number;
  outcomes: { typeId: string; correct: boolean }[];
  finished: boolean;
  /** fingerprint of the questions this state belongs to (core/fingerprint.ts); saves without one are checked more loosely */
  fp?: string;
}

export interface TestState {
  answers: Record<string, Values>;
  /** seconds left when it was last saved (the clock waits while the kid is away) */
  left: number;
  running: boolean;
  /** fingerprint of the paper's questions this state belongs to */
  fp?: string;
}

export interface SavedSession {
  id: string;
  kidId: string;
  kind: 'practice' | 'test' | 'exam';
  /** exam header text (school name etc.) so a resumed paper looks the same */
  header?: Record<string, string>;
  code: string;
  /** Left out for Maths (older saves have none). */
  subject?: SubjectId;
  unitNumber: number;
  title: string;
  updatedAt: string;
  practice?: PracticeState;
  test?: TestState;
}

export const freshPractice = (): PracticeState => ({ idx: 0, values: {}, phase: 'answering', tries: 0, hinted: false, done: [], firstTry: 0, outcomes: [], finished: false });

/** One unfinished practice set per kid, subject, unit, topic (or mixed) and level. Maths keys keep their old shape. */
export function practiceKey(kidId: string, unitNumber: number, topic: string | undefined, level: Level, subject: SubjectId = 'maths'): string {
  return `${kidId}_p_${subject === 'maths' ? '' : subject === 'evs' ? 'V' : 'E'}${unitNumber}_${topic ?? 'MIX'}_${level}`;
}

/** True when a saved session belongs to this subject and unit (Maths sessions saved before English existed have no subject). */
export const sessionIsFor = (x: Pick<SavedSession, 'subject' | 'unitNumber'>, subject: SubjectId, unitNumber: number): boolean => (x.subject ?? 'maths') === subject && x.unitNumber === unitNumber;
export const examKey = (kidId: string, code: string): string => `${kidId}_x_${code}`;
export const testKey = (kidId: string, unitNumber: number): string => `${kidId}_t_${unitNumber}`;

/** True when a saved practice session still has questions to answer. */
export function isUnfinished(s: SavedSession | undefined): s is SavedSession {
  if (!s) return false;
  if (s.kind === 'practice') return Boolean(s.practice && !s.practice.finished);
  if (s.kind === 'exam') return Boolean(s.test?.running);
  return false; // the old on-screen unit test is now an exam
}

export type { Spec };

/** Older saves keyed a mixed sheet by its size (…_MIX20_…): one unfinished set per kind now, whatever its size. */
export const stripMixSize = (id: string): string => id.replace(/_MIX\d+_/, '_MIX_');

/**
 * Collapse duplicate unfinished practice sets to the most recent one per kid, subject, unit, topic (or mixed) and level.
 * The newest is kept (under the new key), the others are listed to remove. Finished sets and exams are left alone.
 */
export function collapseSessions(list: SavedSession[]): { keep: SavedSession[]; remove: string[] } {
  const groups = new Map<string, SavedSession[]>();
  const rest: SavedSession[] = [];
  for (const s of list) {
    if (s.kind === 'practice' && isUnfinished(s)) groups.set(stripMixSize(s.id), [...(groups.get(stripMixSize(s.id)) ?? []), s]);
    else rest.push(s);
  }
  // a finished set saved under the same key is replaced by the unfinished one that now owns it
  const keep = rest.filter((s) => !groups.has(s.id));
  const remove: string[] = [];
  for (const [key, g] of groups) {
    const newest = [...g].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]!;
    keep.push(newest.id === key ? newest : { ...newest, id: key });
    for (const s of g) if (s.id !== key) remove.push(s.id);
  }
  return { keep, remove };
}
