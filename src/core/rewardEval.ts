import type { ActivityLog } from './activity';
import { CHAPTERS, BOOK_WORD, chapterState, levelProgress, reachedMilestone, unitOfChapter, type Chapter } from './chapters';
import { BOOKS, bookById } from './books';
import { chaptersDone, nextStage, orchardFriend, orchardOf, pipMeter, pipPoints, rawPoints, stageFor, toNextOrchard, STAGES } from './pip';
import type { KidProgress } from './progress';
import type { UnitDef } from './question';
import { WRONG_CAP, type RewardsDoc } from './rewards';
import { STAMP_DEFS, STAMP_RULES, friendStampId } from './stamps';

export interface ChapterEvent {
  key: string;
  title: string;
  fromStage: number;
  toStage: number;
  /** chapters done after this set */
  done: number;
  /** stage did not change: chapters still needed to reach the next stage (name below) */
  same: boolean;
  more: number;
  nextName: string;
  /** what the points are heading for, as words after "to": "a bush" or "Orchard 2" */
  target?: string;
  /** a new small tree or garden friend was planted by this chapter (after the Fruit Tree) */
  orchard?: { n: number; friend: string };
  /** gold leaves (chapters with Challenge passed on every topic), at most 5 are drawn */
  leaves: number;
}

/** An ink mark of a chapter filled during this set: "Easy done for Unit 1!" */
export interface LevelEvent {
  key: string;
  /** "Unit 1" */
  short: string;
  level: 'easy' | 'medium' | 'challenge';
  /** what is next, e.g. "Medium next to meet Big Number Bear" */
  next: string;
}

/** A quarter, half or three quarters of the topics of a chapter passed at one level: "Halfway through Easy in Unit 1!" */
export interface MilestoneEvent {
  key: string;
  short: string;
  level: 'easy' | 'medium' | 'challenge';
  percent: 25 | 50 | 75;
  passed: number;
  of: number;
}

export interface RewardEvents {
  rewards: RewardsDoc;
  /** stamps that became true during this set, in catalogue order: these get popups */
  newStamps: string[];
  chapter?: ChapterEvent;
  /** ink marks that filled in this set (not given when the chapter itself became Done: its popup says it) */
  levels: LevelEvent[];
  /** milestones crossed in this set (celebrations only, no stamps) */
  milestones: MilestoneEvent[];
  meter: number;
  stage: number;
  /** chapters with Challenge passed on every counted topic: Pip's gold leaves */
  leaves: number;
}

export interface EvalArgs {
  rewards: RewardsDoc;
  progress?: KidProgress;
  /** the log after record() */
  log: ActivityLog;
  units: UnitDef[];
  now: string;
  /** the answers of the set that just ended (question id and right or wrong) */
  answers?: { q?: string; correct: boolean }[];
  /** the chapter of the set just practised, so its popup is the one shown if several became Done at once */
  chapterKey?: string;
  /** catch-up for earlier history: write everything that is already true with pre: true, queue nothing */
  silent?: boolean;
}

/** The chapter title in the design's words: "Unit 4 Multiplication". */
export const chapterTitle = (c: Chapter, unit: UnitDef | undefined): string => `${BOOK_WORD[c.book]} ${c.n}${unit ? ` ${unit.title}` : ''}`;

/**
 * Run at the end of every set (after record() and recordResults()): write the chapters that became Done, then every stamp whose rule is true.
 * Nothing is ever removed. A silent run (the first evaluation for a kid with history) queues no popups.
 */
export function evaluateRewards(a: EvalArgs): RewardEvents {
  const { progress, log, units, now } = a;
  let r: RewardsDoc = { ...a.rewards, stamps: { ...a.rewards.stamps }, chapters: { ...a.rewards.chapters }, levels: { ...a.rewards.levels }, milestones: { ...a.rewards.milestones }, seen: [...a.rewards.seen], wrong: [...a.rewards.wrong] };
  const before = pipPoints(r);
  const states = new Map(CHAPTERS.map((c) => [c.key, unitOfChapter(c, units)] as const).map(([k, u]) => [k, u ? chapterState(progress, log.firsts, u) : undefined] as const));
  // chapters that became Done
  const fresh = CHAPTERS.filter((c) => states.get(c.key)?.done && !r.chapters[c.key]);
  for (const c of fresh) r.chapters[c.key] = { at: now, ...(a.silent ? { pre: true as const } : {}) };
  // ink marks: each is written once, and tells the child when it fills during a set
  const levelEvents: LevelEvent[] = [];
  const freshKeys = new Set(fresh.map((c) => c.key));
  for (const c of CHAPTERS) {
    const st = states.get(c.key);
    if (!st) continue;
    for (const l of ['easy', 'medium', 'challenge'] as const) {
      if (!st[l] || r.levels[c.key]?.[l]) continue;
      r.levels = { ...r.levels, [c.key]: { ...(r.levels[c.key] ?? {}), [l]: { at: now, ...(a.silent ? { pre: true as const } : {}) } } };
      if (a.silent || (freshKeys.has(c.key) && l !== 'challenge')) continue;
      const friend = STAMP_DEFS.find((d) => d.id === friendStampId(c))?.name ?? 'your friend';
      const next = l === 'challenge' ? 'Pip gets a gold leaf.' : l === 'easy' ? `Medium next to meet ${friend}.` : `Easy next to meet ${friend}.`;
      levelEvents.push({ key: c.key, short: `${BOOK_WORD[c.book]} ${c.n}`, level: l, next });
    }
  }
  // milestones: 25, 50 and 75% of a level's topics passed. Each is written once; a set shows only the highest it crossed.
  const milestoneEvents: MilestoneEvent[] = [];
  for (const c of CHAPTERS) {
    const unit = unitOfChapter(c, units);
    if (!unit) continue;
    for (const l of ['easy', 'medium', 'challenge'] as const) {
      const { passed: p, of } = levelProgress(progress, log.firsts, unit, l);
      const mk = `${c.key}|${l}`;
      const crossed = ([25, 50, 75] as const).filter((m) => reachedMilestone(p, of, m) && !r.milestones[mk]?.[String(m) as '25']);
      if (crossed.length === 0) continue;
      r.milestones = { ...r.milestones, [mk]: { ...(r.milestones[mk] ?? {}), ...Object.fromEntries(crossed.map((m) => [String(m), { at: now, ...(a.silent ? { pre: true as const } : {}) }])) } };
      // the level's own card covers a finished level, and the chapter popup a finished chapter
      if (!a.silent && p < of && !freshKeys.has(c.key)) milestoneEvents.push({ key: c.key, short: `${BOOK_WORD[c.book]} ${c.n}`, level: l, percent: crossed[crossed.length - 1]!, passed: p, of });
    }
  }
  // wrong ids: fixed means right now and wrong before
  let fixed = false;
  for (const x of a.answers ?? []) {
    if (!x.q) continue;
    const i = r.wrong.indexOf(x.q);
    if (x.correct && i >= 0) {
      fixed = true;
      r.wrong.splice(i, 1);
    } else if (!x.correct && i < 0) r.wrong.push(x.q);
  }
  r.wrong = r.wrong.slice(-WRONG_CAP);
  const doneKeys = new Set(Object.keys(r.chapters));
  const challengeKeys = new Set(CHAPTERS.filter((c) => states.get(c.key)?.challenge).map((c) => c.key));
  const startedBooks = new Set(CHAPTERS.filter((c) => states.get(c.key)?.started).map((c) => c.book));
  // Explorer: chapters finished for real (not found by a catch-up), by month, with the subject of their book
  const doneSubjectsByMonth = new Map<string, Set<string>>();
  for (const [key, e] of Object.entries(r.chapters)) {
    if (e.pre) continue;
    const month = e.at.slice(0, 7);
    const set = doneSubjectsByMonth.get(month) ?? new Set<string>();
    set.add(bookById(key.split(':')[0]!).subject);
    doneSubjectsByMonth.set(month, set);
  }
  const ctx = { progress, log, doneKeys, challengeKeys, fixed, startedBooks, doneSubjectsByMonth };
  const newStamps: string[] = [];
  for (const d of STAMP_DEFS) {
    if (r.stamps[d.id]) continue;
    if (STAMP_RULES[d.id]?.(ctx)) {
      r.stamps[d.id] = { at: now, ...(a.silent ? { pre: true as const } : {}) };
      if (!a.silent) newStamps.push(d.id);
    }
  }
  if (a.silent) r = { ...r, init: r.init ?? now, milestonesInit: r.milestonesInit ?? now, books: BOOKS.map((b) => b.id) };
  // Pip's high-water mark: only ever goes up
  const raw = rawPoints(r);
  if (raw > (r.pipHigh ?? 0)) r = { ...r, pipHigh: raw };
  const after = pipPoints(r);
  const stage = stageFor(after);
  let chapter: ChapterEvent | undefined;
  if (!a.silent && fresh.length > 0) {
    const c = fresh.find((x) => x.key === a.chapterKey) ?? fresh[fresh.length - 1]!;
    const fromStage = stageFor(before);
    const next = nextStage(stage);
    const trees = orchardOf(after);
    const planted = trees > orchardOf(before);
    chapter = {
      key: c.key,
      title: chapterTitle(c, unitOfChapter(c, units)),
      fromStage,
      toStage: stage,
      done: chaptersDone(r),
      same: fromStage === stage,
      more: next ? next.at - after : toNextOrchard(after),
      nextName: next?.name ?? `Orchard ${trees + 1}`,
      target: next ? `a ${next.name.toLowerCase()}` : `Orchard ${trees + 1}`,
      ...(planted ? { orchard: { n: trees, friend: orchardFriend(trees) } } : {}),
      leaves: challengeKeys.size,
    };
  }
  return { rewards: r, newStamps, chapter, levels: levelEvents, milestones: milestoneEvents, meter: pipMeter(r, log), stage, leaves: challengeKeys.size };
}

/**
 * A book was added to the registry after this kid's last catch-up: what the kid already did in it is written quietly (pre),
 * and the "Pip found stamps you already earned" popup is allowed to show once more, so it is ONE combined popup for everything found.
 * A ledger saved before the registry existed knew exactly the books of that day, so it is only stamped with the current list.
 */
export function catchUpNewBooks(a: Omit<EvalArgs, 'silent'>): RewardsDoc {
  const ids = BOOKS.map((b) => b.id);
  const r = a.rewards;
  if (!r.init) return r;
  if (!r.books) return { ...r, books: ids };
  if (ids.every((id) => r.books!.includes(id))) return r;
  const { foundShown: _shown, ...rest } = evaluateRewards({ ...a, silent: true }).rewards;
  return { ...rest, books: ids };
}
