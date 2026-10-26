import type { Storage } from '../storage';
import type { Level } from './question';

/** How many question keys are remembered for each kid, topic and level. */
export const SEEN_MAX = 300;

/** A short, stable fingerprint of a question's key (what it looks like), small enough to keep hundreds of them. */
export function hashKey(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).padStart(7, '0');
}

export interface SeenDoc {
  id: string;
  kidId: string;
  typeId: string;
  /** keys seen at each level, oldest first */
  cells: Partial<Record<Level, string[]>>;
}

export const seenId = (kidId: string, typeId: string): string => `${kidId}_${typeId}`;

export interface QuestionRef {
  typeId: string;
  level: Level;
  hash: string;
}

/** Add the questions just made to a kid's memory. A question seen again moves to the newest end; the oldest drop off. */
export function remember(docs: Record<string, SeenDoc>, kidId: string, refs: QuestionRef[], max = SEEN_MAX): Record<string, SeenDoc> {
  const out = { ...docs };
  for (const r of refs) {
    const id = seenId(kidId, r.typeId);
    const doc = out[id] ?? { id, kidId, typeId: r.typeId, cells: {} };
    const list = (doc.cells[r.level] ?? []).filter((h) => h !== r.hash);
    list.push(r.hash);
    out[id] = { ...doc, cells: { ...doc.cells, [r.level]: list.slice(-max) } };
  }
  return out;
}

/** What the kid has seen, by "typeId|level", oldest first. */
export function avoidMap(docs: Record<string, SeenDoc>, kidId: string | undefined): Map<string, string[]> {
  const m = new Map<string, string[]>();
  if (!kidId) return m;
  for (const d of Object.values(docs)) {
    if (d.kidId !== kidId) continue;
    for (const [level, list] of Object.entries(d.cells)) m.set(`${d.typeId}|${level}`, list ?? []);
  }
  return m;
}

/**
 * How bad a set of questions is: 0 when the kid has seen none of them. A repeat costs more the more recently it was seen,
 * so when a topic is used up, the questions seen longest ago are the ones that come back first.
 */
export function overlapScore(refs: QuestionRef[], avoid: Map<string, string[]>): number {
  let score = 0;
  for (const r of refs) {
    const list = avoid.get(`${r.typeId}|${r.level}`);
    const at = list ? list.lastIndexOf(r.hash) : -1;
    if (at >= 0) score += 1000 + at + 1;
  }
  return score;
}

/**
 * Pick the seed whose questions the kid has seen least. A worksheet code only holds the seed, so the choice has to be made
 * when the sheet is created: the code still rebuilds exactly the same questions later.
 */
export function pickSeed(make: (seed: string) => QuestionRef[] | undefined, avoid: Map<string, string[]>, newSeed: () => string, tries = 8): string {
  let best = newSeed();
  if (avoid.size === 0) return best;
  let bestScore = Infinity;
  for (let i = 0; i < tries; i++) {
    const seed = i === 0 ? best : newSeed();
    const refs = make(seed);
    if (!refs) continue;
    const score = overlapScore(refs, avoid);
    if (score < bestScore) {
      best = seed;
      bestScore = score;
    }
    if (score === 0) break;
  }
  return best;
}

export async function loadSeen(store: Storage): Promise<Record<string, SeenDoc>> {
  const docs = await store.list<SeenDoc>('seen');
  return Object.fromEntries(docs.filter((d) => d && d.id).map((d) => [d.id, d]));
}

export async function saveSeen(store: Storage, before: Record<string, SeenDoc>, after: Record<string, SeenDoc>): Promise<void> {
  for (const [id, doc] of Object.entries(after)) if (before[id] !== doc) await store.set('seen', id, doc);
}
