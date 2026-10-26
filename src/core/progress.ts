import { starsFor } from './practice';
import type { Level } from './question';

export interface Cell {
  attempts: number;
  correct: number;
  sets: number;
  best: number;
  bestOf: number;
  stars: number;
  last: string;
}

export interface TestResult {
  date: string;
  unitId: string;
  /** Shown instead of the unit number, e.g. an exam name and code. */
  label?: string;
  got: number;
  of: number;
  seconds: number;
  sections: { title: string; got: number; of: number }[];
}

export interface KidProgress {
  kidId: string;
  cells: Record<string, Cell>;
  tests: TestResult[];
}

export const cellKey = (typeId: string, level: Level): string => `${typeId}|${level}`;
export const emptyProgress = (kidId: string): KidProgress => ({ kidId, cells: {}, tests: [] });

const blank = (): Cell => ({ attempts: 0, correct: 0, sets: 0, best: 0, bestOf: 0, stars: 0, last: '' });

export interface Result {
  typeId: string;
  correct: boolean;
}

/**
 * Add the results of one practice run. A topic set (one topic, one level) also updates best score and stars;
 * a mixed sheet only adds to the counts of each topic.
 */
export function recordResults(p: KidProgress, level: Level, results: Result[], now: string, topicSet: boolean): KidProgress {
  const cells = { ...p.cells };
  const byType = new Map<string, Result[]>();
  for (const r of results) byType.set(r.typeId, [...(byType.get(r.typeId) ?? []), r]);
  for (const [typeId, rs] of byType) {
    const key = cellKey(typeId, level);
    const c = { ...(cells[key] ?? blank()) };
    const right = rs.filter((r) => r.correct).length;
    c.attempts += rs.length;
    c.correct += right;
    c.last = now;
    if (topicSet) {
      c.sets += 1;
      const stars = starsFor(right, rs.length);
      if (right * c.bestOf >= c.best * rs.length || c.bestOf === 0) {
        c.best = right;
        c.bestOf = rs.length;
      }
      c.stars = Math.max(c.stars, stars);
    }
    cells[key] = c;
  }
  return { ...p, cells };
}

export function recordTest(p: KidProgress, t: TestResult): KidProgress {
  return { ...p, tests: [t, ...p.tests].slice(0, 50) };
}

export interface Summary {
  stars: number;
  answered: number;
  correct: number;
  practised: number;
  total: number;
}

/** Totals for one unit's topics (`typeIds`) at all three levels. */
export function summarise(p: KidProgress | undefined, typeIds: string[]): Summary {
  const s: Summary = { stars: 0, answered: 0, correct: 0, practised: 0, total: typeIds.length * 3 };
  if (!p) return s;
  for (const id of typeIds) {
    for (const level of ['easy', 'medium', 'challenge'] as const) {
      const c = p.cells[cellKey(id, level)];
      if (!c) continue;
      s.stars += c.stars;
      s.answered += c.attempts;
      s.correct += c.correct;
      if (c.attempts > 0) s.practised += 1;
    }
  }
  return s;
}

export const percent = (part: number, whole: number): number => (whole <= 0 ? 0 : Math.round((part / whole) * 100));
