import { STAGES, pointWord } from './pip';
import type { ChapterEvent, LevelEvent, MilestoneEvent, RewardEvents } from './rewardEval';
import type { RewardLevel } from './settings';
import { STAMP_DEFS, type StampDef } from './stamps';

export type PopupMode = 'full' | 'light' | 'quiet';
export type PopupItem = { kind: 'stamp'; def: StampDef } | { kind: 'milestone'; milestone: MilestoneEvent } | { kind: 'level'; level: LevelEvent } | { kind: 'chapter'; chapter: ChapterEvent } | { kind: 'found'; defs: StampDef[]; milestones?: number };

export interface PopupPlan {
  mode: PopupMode;
  /** shown one after another, only after the set ends */
  queue: PopupItem[];
  /** one quiet line each, always shown in the set summary */
  lines: string[];
  /** Light: the ink-mark and chapter results are cards in the summary instead of popups */
  card?: ChapterEvent;
  levels?: LevelEvent[];
}

const MAX_STAMP_POPUPS = 3;
const LEVEL_NAME = { easy: 'Easy', medium: 'Medium', challenge: 'Challenge' } as const;

/**
 * Minimal and Calm get a quiet line instead of a popup; Light gets shorter ones; Full gets the animated ones.
 * Reduced motion keeps the popup but without movement (the styles switch the animation off), so a child is never left with nothing.
 */
export function popupMode(reward: RewardLevel, calm: boolean, reducedMotion: boolean): PopupMode {
  if (reward === 'minimal' || calm) return 'quiet';
  return reward === 'light' || reducedMotion ? 'light' : 'full';
}

const lower = (s: string): string => s.toLowerCase();
const withArticle = (w: string): string => `${/^[aeiou]/i.test(w) ? 'an' : 'a'} ${w}`;
/** "Orchard 2: Pip planted a pear tree." (after the Fruit Tree, one more small friend every 10 points) */
export const orchardLine = (o: NonNullable<ChapterEvent['orchard']>): string => `Orchard ${o.n}: Pip planted ${withArticle(o.friend)}.`;
/** "3 more chapters to a bush" or "4 more chapters to Orchard 2" */
export const moreToText = (ch: ChapterEvent): string => `${ch.more} more ${pointWord(ch.more)} to ${ch.target ?? `a ${lower(ch.nextName)}`}`;
export function chapterLine(ch: ChapterEvent): string {
  const to = STAGES[ch.toStage]!.name;
  if (ch.orchard) return `${ch.title} is done. ${orchardLine(ch.orchard)}`;
  return `${ch.title} is done. ${ch.same ? `Pip is still a ${lower(to)}. ${moreToText(ch)}.` : `Pip is now a ${lower(to)}.`}`;
}
export const levelTitle = (l: LevelEvent): string => `${LEVEL_NAME[l.level]} done for ${l.short}!`;
export const levelLine = (l: LevelEvent): string => `${levelTitle(l)} ${l.next}`;
export const foundLine = (n: number): string => `Pip found ${n} ${n === 1 ? 'stamp' : 'stamps'} you already earned.`;
const PHRASE: Record<25 | 50 | 75, string> = { 25: 'A quarter of the way through', 50: 'Halfway through', 75: 'Three quarters of the way through' };
export const milestoneTitle = (m: MilestoneEvent): string => `${PHRASE[m.percent]} ${LEVEL_NAME[m.level]} in ${m.short}!`;
export const milestoneLine = (m: MilestoneEvent): string => `${milestoneTitle(m)} ${m.passed} of ${m.of} topics passed.`;

export function quietLines(stamps: StampDef[], chapter?: ChapterEvent, levels: LevelEvent[] = [], milestones: MilestoneEvent[] = []): string[] {
  const out = stamps.slice(0, MAX_STAMP_POPUPS).map((d) => `New stamp: ${d.name}. See album.`);
  if (stamps.length > MAX_STAMP_POPUPS) out.push(`and ${stamps.length - MAX_STAMP_POPUPS} more in your album.`);
  for (const m of milestones) out.push(milestoneLine(m));
  for (const l of levels) out.push(levelLine(l));
  if (chapter) out.push(chapterLine(chapter));
  return out;
}

/** What to show when a set ends: the popup queue (stamps, then ink marks, then the chapter), the quiet lines, and the Light cards. */
export function planPopups(events: Pick<RewardEvents, 'newStamps' | 'chapter' | 'levels'> & { milestones?: MilestoneEvent[] }, mode: PopupMode): PopupPlan {
  const stamps = events.newStamps.map((id) => STAMP_DEFS.find((d) => d.id === id)).filter((d): d is StampDef => Boolean(d));
  const levels = events.levels ?? [];
  const milestones = events.milestones ?? [];
  const lines = quietLines(stamps, events.chapter, levels, milestones);
  // stamps first, then milestones: three small celebrations at most, the rest wait in the summary ("and N more")
  const small: PopupItem[] = [...stamps.map((def) => ({ kind: 'stamp' as const, def })), ...milestones.map((milestone) => ({ kind: 'milestone' as const, milestone }))].slice(0, MAX_STAMP_POPUPS);
  const extra = stamps.length + milestones.length - small.length;
  if (extra > 0 && !lines.some((l) => l.startsWith('and '))) lines.push(`and ${extra} more in your summary.`);
  const popStamps: PopupItem[] = stamps.slice(0, MAX_STAMP_POPUPS).map((def) => ({ kind: 'stamp', def }));
  if (mode === 'quiet') return { mode, queue: [], lines };
  // Light: stamp popups only; milestones are lines in the summary
  if (mode === 'light') return { mode, queue: popStamps, lines, ...(events.chapter ? { card: events.chapter } : {}), ...(levels.length ? { levels } : {}) };
  return { mode, queue: [...small, ...levels.map((level) => ({ kind: 'level' as const, level })), ...(events.chapter ? [{ kind: 'chapter' as const, chapter: events.chapter }] : [])], lines };
}

/** The one friendly popup for stamps found from earlier history ("Pip found 2 stamps you already earned"). */
export function planFound(defs: StampDef[], mode: PopupMode, milestones = 0): PopupPlan {
  const lines = [...(defs.length > 0 ? [`${foundLine(defs.length)} See album.`] : []), ...(milestones > 0 ? [`${milestones} ${milestones === 1 ? 'milestone' : 'milestones'} from your earlier practice ${milestones === 1 ? 'is' : 'are'} counted.`] : [])];
  return { mode, queue: mode !== 'quiet' && defs.length > 0 ? [{ kind: 'found', defs, milestones }] : [], lines };
}
