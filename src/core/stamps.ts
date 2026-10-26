import { weekOf, type ActivityLog } from './activity';
import { BOOKS, friendId } from './books';
import { CHAPTERS } from './chapters';
import type { KidProgress } from './progress';
import { STAMP_DEFS } from './stampDefs';

export { STAMP_DEFS, STAMP_SETS, type StampDef, type StampSet } from './stampDefs';

/** What the stamp rules look at (docs/design/e-mix/STAMPS.md). Dates are UTC. */
export interface StampCtx {
  progress?: KidProgress;
  log: ActivityLog;
  /** chapters Done now or earlier (never revoked) */
  doneKeys: Set<string>;
  /** chapters with Challenge passed on every counted topic */
  challengeKeys: Set<string>;
  /** a question answered right that was wrong before, in the set that just ended */
  fixed: boolean;
  /** books with any chapter started (anything answered or any mark filled) */
  startedBooks?: Set<string>;
  /** subjects with a chapter finished for real (not found by the catch-up), by month: "2026-10" */
  doneSubjectsByMonth?: Map<string, Set<string>>;
}

const DAY = 86400000;
const dayOf = (iso: string): string => iso.slice(0, 10);
const dayNo = (d: string): number => Math.round(Date.parse(`${d}T00:00:00Z`) / DAY);

export const totalSets = (log: ActivityLog): number =>
  Object.values(log.baseline.cells).reduce((m, c) => m + c.sets, 0) + log.entries.length + log.weeks.reduce((m, w) => m + w.sets, 0);

const entryDays = (log: ActivityLog): string[] => [...new Set(log.entries.map((e) => dayOf(e.at)))].sort();

/** Longest run of entry days where each gap to the next is at most 2 days (one missed day is forgiven). */
export function longestRun(log: ActivityLog): number {
  const days = entryDays(log).map(dayNo);
  let best = 0;
  let run = 0;
  days.forEach((d, i) => {
    run = i > 0 && d - days[i - 1]! <= 2 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

/** The most distinct entry days in one Monday-to-Sunday week. */
export function bestWeekDays(log: ActivityLog): number {
  const weeks = new Map<string, Set<string>>();
  for (const e of log.entries) {
    const w = weekOf(e.at);
    weeks.set(w, (weeks.get(w) ?? new Set()).add(dayOf(e.at)));
  }
  return Math.max(0, ...[...weeks.values()].map((s) => s.size));
}

/** The exact rule of every stamp. */
export const STAMP_RULES: Record<string, (c: StampCtx) => boolean> = {
  t_set: (c) => totalSets(c.log) >= 1,
  t_challenge: (c) =>
    c.log.entries.some((e) => e.rows.some((r) => r.l === 'challenge' && r.a >= 1)) ||
    c.log.weeks.some((w) => w.rows.some((r) => r.l === 'challenge' && r.a >= 1)) ||
    Object.values(c.log.firsts).some((f) => f.challenge !== undefined) ||
    Object.entries(c.progress?.cells ?? {}).some(([k, v]) => k.endsWith('|challenge') && v.attempts >= 1),
  t_fixed: (c) => c.fixed || c.log.entries.some((e) => e.qs?.some((q) => q.split('|')[3]?.[0] === '1' && q.split('|')[3]?.[3] === '1')),
  t_hint: (c) =>
    c.log.entries.some((e) => {
      if (e.mode !== 'topic' && e.mode !== 'mixed') return false;
      const a = e.rows.reduce((m, r) => m + r.a, 0);
      const h = e.rows.reduce((m, r) => m + r.h, 0);
      const r = e.rows.reduce((m, x) => m + x.c, 0);
      return a >= 5 && h >= 1 && r * 100 >= 70 * a;
    }),
  t_back: (c) => c.log.entries.some((e, i) => i > 0 && dayNo(dayOf(e.at)) - dayNo(dayOf(c.log.entries[i - 1]!.at)) >= 3),
  t_gold: (c) => c.challengeKeys.size >= 1,
  h_3: (c) => bestWeekDays(c.log) >= 3,
  h_5: (c) => bestWeekDays(c.log) >= 5,
  h_run7: (c) => longestRun(c.log) >= 7,
  h_15: (c) => {
    const by = new Map<string, number>();
    c.log.entries.forEach((e) => by.set(dayOf(e.at), (by.get(dayOf(e.at)) ?? 0) + e.secs));
    return [...by.values()].some((s) => s >= 900);
  },
  h_run30: (c) => longestRun(c.log) >= 30,
  q_first: (c) => c.log.quest.length >= 1 || c.log.weeks.some((w) => (w.quest?.sessions ?? 0) >= 1),
  q_10: (c) => c.log.quest.some((q) => q.words >= 10),
  q_wpm: (c) => c.log.quest.some((q) => q.secs >= 60 && q.chars / 5 / (q.secs / 60) >= 10),
  q_acc: (c) => c.log.quest.some((q) => q.chars >= 50 && q.chars / (q.chars + q.mistakes) >= 0.95),
  e_first: (c) => c.log.exams.length >= 1,
  e_80: (c) => c.log.exams.some((x) => x.got * 100 >= 80 * x.of),
  e_sec: (c) => c.log.exams.some((x) => x.sections.some((s) => s.of > 0 && s.got === s.of)),
  e_90: (c) => c.log.exams.some((x) => x.of >= 25 && x.got * 100 >= 90 * x.of),
};
STAMP_RULES.x_two = (c) => (c.startedBooks?.size ?? 0) >= 2;
STAMP_RULES.x_three = (c) => (c.startedBooks?.size ?? 0) >= 3;
STAMP_RULES.x_both = (c) => [...(c.doneSubjectsByMonth?.values() ?? [])].some((s) => s.size >= 2);
// the chapter friends (mf1..mf12, rf1..rf4, pf1..pf11 today) and the golden Book finishers come from the book registry
for (const ch of CHAPTERS) STAMP_RULES[friendId(ch.book, ch.n)] = (c) => c.doneKeys.has(ch.key);
for (const b of BOOKS) STAMP_RULES[b.finisher.id] = (c) => b.chapters.every((ch) => c.doneKeys.has(`${b.id}:${ch.n}`));

/** The friend stamp of a chapter: mf4, rf2, pf5. */
export const friendStampId = (c: { book: string; n: number }): string => friendId(c.book, c.n);

/** Every stamp in the catalogue has a rule (checked by a test). */
export const stampIds = (): string[] => STAMP_DEFS.map((d) => d.id);
