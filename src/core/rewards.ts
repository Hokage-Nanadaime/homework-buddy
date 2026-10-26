/**
 * Each kid's rewards ledger (docs/design/e-mix/STAMPS.md, D0): stamps and Done chapters, written once and never removed.
 * Collection `rewards`, document id = kid id. Dates are UTC. `pre: true` marks catch-up: already true before the update, no popup.
 */
export const WRONG_CAP = 500;

export interface Earned {
  at: string;
  pre?: true;
}

export interface RewardsDoc {
  v: 1;
  kidId: string;
  /** set once the catch-up for earlier history has run */
  init?: string;
  stamps: Record<string, Earned>;
  /** chapter Done, by "maths:4", "reader:2", "practice:5" */
  chapters: Record<string, Earned>;
  /** each ink mark of a chapter, once filled (Easy, Medium, Challenge): never taken back */
  levels: Record<string, Partial<Record<'easy' | 'medium' | 'challenge', Earned>>>;
  /** milestones reached on the way through a level, by "maths:1|easy" then 25, 50, 75 (celebrations only: no stamps) */
  milestones: Record<string, Partial<Record<'25' | '50' | '75', Earned>>>;
  /** stamps the child has seen: in a popup, or opened in the album. Others carry a New tag. */
  seen: string[];
  /** when Pip told the child about stamps found from earlier history (once) */
  foundShown?: string;
  /** the catch-up for milestones has run / the child was told about earlier milestones (once) */
  milestonesInit?: string;
  milestonesShown?: string;
  /** the most Pip points ever recorded: a later change to the book list can never lower Pip */
  pipHigh?: number;
  /** the books that existed at the last catch-up, so a newly added book's earlier history is found once, quietly */
  books?: string[];
  /** ids of questions answered wrong and not yet right (same hashing as the no-repeat memory), newest last */
  wrong: string[];
  /** rest-day tokens, if stored */
  restDays?: string[];
}

export const emptyRewards = (kidId: string): RewardsDoc => ({ v: 1, kidId, stamps: {}, chapters: {}, levels: {}, milestones: {}, seen: [], wrong: [] });

/** Old or partial data loads: anything missing is empty. */
export function normaliseRewards(raw: Partial<RewardsDoc> | undefined, kidId: string): RewardsDoc {
  const e = emptyRewards(kidId);
  if (!raw || typeof raw !== 'object') return e;
  return { ...e, ...(raw.init ? { init: raw.init } : {}), v: 1, kidId, stamps: raw.stamps ?? {}, chapters: raw.chapters ?? {}, levels: raw.levels ?? {}, milestones: raw.milestones ?? {}, seen: Array.isArray(raw.seen) ? raw.seen : [], ...(raw.foundShown ? { foundShown: raw.foundShown } : {}), ...(raw.milestonesInit ? { milestonesInit: raw.milestonesInit } : {}), ...(raw.milestonesShown ? { milestonesShown: raw.milestonesShown } : {}), wrong: Array.isArray(raw.wrong) ? raw.wrong : [], ...(raw.restDays ? { restDays: raw.restDays } : {}), ...(typeof raw.pipHigh === 'number' ? { pipHigh: raw.pipHigh } : {}), ...(Array.isArray(raw.books) ? { books: raw.books } : {}) };
}
