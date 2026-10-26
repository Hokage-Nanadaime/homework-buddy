import type { ActivityLog } from './activity';
import { CHAPTERS } from './chapters';
import type { RewardsDoc } from './rewards';

/** Pip's ten stages. The stage depends only on how many chapters are Done (docs/design/e-mix/PIP.md). */
export interface Stage {
  name: string;
  /** chapters done needed */
  at: number;
  look: string;
}
export const STAGES: Stage[] = [
  { name: 'Seed', at: 0, look: 'A round bean with a tiny pointed tip. No plant yet.' },
  { name: 'Sprout', at: 1, look: 'A thin stem with two small round leaves.' },
  { name: 'Seedling', at: 3, look: 'A taller stem with two pairs of leaves and a tip leaf.' },
  { name: 'Sapling', at: 5, look: 'A slim trunk with leaves climbing up both sides.' },
  { name: 'Bud', at: 8, look: 'The sapling with a closed pink bud on top.' },
  { name: 'Bloom', at: 11, look: 'The bud opens into a six-petal flower.' },
  { name: 'Bush', at: 15, look: 'A wide, leafy bush with little flowers.' },
  { name: 'Young Tree', at: 19, look: 'A trunk with one round green crown.' },
  { name: 'Blossom Tree', at: 23, look: 'A taller tree, three-part crown covered in blossom.' },
  { name: 'Fruit Tree', at: 27, look: 'The full tree with red fruit.' },
];
export const METER_CAP = 10;
export const TOTAL_CHAPTERS = CHAPTERS.length;
/** The most points the books can give today. */
export const TOTAL_POINTS = CHAPTERS.reduce((n, c) => n + c.weight, 0);

/** Points are the sum of the weights of the chapters Done (1 each for now). Stages 1 to 10 use the first 27 points, then the orchard grows. */
export const FRUIT_AT = STAGES[STAGES.length - 1]!.at;
/** Every further this-many points plants one more small tree or garden friend. */
export const ORCHARD_STEP = 10;
const allOne = CHAPTERS.every((c) => c.weight === 1);
/** "chapter" while every chapter is worth one point, otherwise "point" (so the words stay true if a weight is ever tuned). */
export const pointWord = (n: number): string => (allOne ? (n === 1 ? 'chapter' : 'chapters') : n === 1 ? 'point' : 'points');

/** The last stage whose threshold is reached (0 to 9). */
export function stageFor(chaptersDone: number): number {
  let s = 0;
  STAGES.forEach((st, i) => {
    if (st.at <= chaptersDone) s = i;
  });
  return s;
}
export const nextStage = (stage: number): Stage | undefined => STAGES[stage + 1];

/** Done chapters among the chapters that count (a chapter key outside them, such as unseen passages, is ignored). */
export const chaptersDone = (r: Pick<RewardsDoc, 'chapters'>): number => CHAPTERS.filter((c) => r.chapters[c.key]).length;

/** Points from the chapters Done in the books that exist now. */
export const rawPoints = (r: Pick<RewardsDoc, 'chapters'>): number => CHAPTERS.reduce((n, c) => n + (r.chapters[c.key] ? c.weight : 0), 0);
/**
 * Pip's points: the chapters Done, but never fewer than the highest the ledger has recorded (pipHigh), so changing the book list
 * (a book removed, a chapter renumbered) can never lower Pip's stage or take trees out of the orchard.
 */
export const pipPoints = (r: Pick<RewardsDoc, 'chapters' | 'pipHigh'>): number => Math.max(r.pipHigh ?? 0, rawPoints(r));

/** The orchard: how many small trees or garden friends Pip has planted (0 until the Fruit Tree, then one per 10 points). */
export const orchardOf = (points: number): number => (points >= FRUIT_AT ? Math.floor((points - FRUIT_AT) / ORCHARD_STEP) : 0);
/** Points still needed for the next orchard friend. */
export const toNextOrchard = (points: number): number => FRUIT_AT + (orchardOf(points) + 1) * ORCHARD_STEP - points;

/** The garden friends, planted in this order and then round again with a new number (Orchard 7 repeats the first kind). */
export const ORCHARD_FRIENDS = ['apple tree', 'pear tree', 'cherry tree', 'sunflower', 'berry bush', 'plum tree'] as const;
export const orchardFriend = (n: number): string => ORCHARD_FRIENDS[(n - 1) % ORCHARD_FRIENDS.length]!;

/**
 * Finished sets since Pip reached the current stage, at most 10. A finished set is a topic, mixed or worksheet entry;
 * exams and Word Quest do not fill it. "Since" is the date the chapter that reached the stage was Done (Seed: since the log began).
 */
export function pipMeter(r: Pick<RewardsDoc, 'chapters'>, log: Pick<ActivityLog, 'entries' | 'startedAt'> | undefined): number {
  if (!log) return 0;
  const stage = stageFor(pipPoints(r));
  // the date the chapter that carried Pip over this stage's line was Done (weights add up in the order chapters were finished)
  const doneAt = CHAPTERS.filter((c) => r.chapters[c.key]).map((c) => ({ at: r.chapters[c.key]!.at, w: c.weight })).sort((a, b) => a.at.localeCompare(b.at));
  let acc = 0;
  let since = log.startedAt;
  if (stage > 0)
    for (const d of doneAt) {
      acc += d.w;
      if (acc >= STAGES[stage]!.at) {
        since = d.at;
        break;
      }
    }
  const n = log.entries.filter((e) => (e.mode === 'topic' || e.mode === 'mixed' || e.mode === 'worksheet') && e.at > since).length;
  return Math.min(METER_CAP, n);
}
