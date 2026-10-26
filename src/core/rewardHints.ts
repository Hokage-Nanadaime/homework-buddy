import type { Firsts } from './activity';
import { friendId } from './books';
import { CHAPTERS, BOOK_WORD, chapterState, countedTopics, passed, unitOfChapter } from './chapters';
import type { KidProgress } from './progress';
import type { UnitDef } from './question';
import type { RewardsDoc } from './rewards';
import { STAMP_DEFS, type StampDef } from './stamps';

export interface NextStamp {
  def: StampDef;
  /** topics still to pass at Easy and at Medium before the chapter is Done */
  left: { easy: number; medium: number };
  of: number;
  label: string;
}

/** The friend stamp closest to being earned: a chapter that is started, not Done, with the fewest topics left to pass. */
export function nextStamp(progress: KidProgress | undefined, firsts: Record<string, Firsts> | undefined, units: UnitDef[], rewards: RewardsDoc): NextStamp | undefined {
  let best: (NextStamp & { total: number }) | undefined;
  for (const c of CHAPTERS) {
    const def = STAMP_DEFS.find((d) => d.id === friendId(c.book, c.n));
    const unit = unitOfChapter(c, units);
    if (!def || !unit || rewards.stamps[def.id]) continue;
    const s = chapterState(progress, firsts, unit);
    if (s.done || !s.started) continue;
    const topics = countedTopics(unit);
    const left = { easy: topics.filter((t) => !passed(progress, firsts, t.id, 'easy')).length, medium: topics.filter((t) => !passed(progress, firsts, t.id, 'medium')).length };
    const total = left.easy + left.medium;
    if (!best || total < best.total) best = { def, left, of: topics.length, label: `${BOOK_WORD[c.book]} ${c.n}`, total };
  }
  return best && { def: best.def, left: best.left, of: best.of, label: best.label };
}

const topicsText = (n: number): string => `${n} more ${n === 1 ? 'topic' : 'topics'}`;
/** Exact wording: which level is done, which is not, and how many topics are left. */
export function nextStampLine(n: NextStamp): string {
  const { easy, medium } = n.left;
  const need = easy === 0 ? `Easy is done. Pass Medium on ${topicsText(medium)}` : medium === 0 ? `Medium is done. Pass Easy on ${topicsText(easy)}` : `Pass Easy on ${topicsText(easy)} and Medium on ${topicsText(medium)}`;
  return `Next stamp: ${n.def.name}. ${need}, and ${n.label} is Done.`;
}

/** The stamps earned newest first. */
export function recentStamps(rewards: RewardsDoc, count: number): StampDef[] {
  return Object.entries(rewards.stamps)
    .sort((a, b) => b[1].at.localeCompare(a[1].at) || a[0].localeCompare(b[0]))
    .map(([id]) => STAMP_DEFS.find((d) => d.id === id))
    .filter((d): d is StampDef => Boolean(d))
    .slice(0, count);
}
