import { LEVELS, type Input, type Level, type Question, type QuestionType, type UnitDef } from '../../core/question';
import type { Rng } from '../../core/rng';
import { lessonToUnit as englishUnit } from '../english/build';
import type { BankType } from '../english/types';
import type { EvsChapterData, EvsEntry, MapEntry } from './types';

/** EVS chapters are units of their own subject (worksheet and exam codes start with V). */
export const EVS_SUBJECT: UnitDef['subject'] = 'evs';

const isMap = (e: EvsEntry): e is MapEntry => e.kind === 'map';

const RIGHT = 'Right';
const NOT_YET = 'Not yet';

/** One input per place, marked Right or Not yet by the grown-up: the child works on paper, on the empty map. */
export function mapQuestion(e: MapEntry): Omit<Question, 'typeId' | 'level' | 'marks'> {
  const inputs: Input[] = e.places.map((p, i) => ({ id: `p${i}`, label: p, mode: 'choice', accepted: [RIGHT], choices: [RIGHT, NOT_YET], hint: 'Grown-up: choose Right if the place is marked correctly on the map' }));
  const steps = [`Check ${e.places.join(', ')} on the answer-key map.`, ...(e.steps ?? [])];
  return { prompt: e.stem, inputs, steps, tags: [...(e.tags ?? []), 'map'], ...(e.book ? { book: e.book } : {}), facts: { entry: e.id, map: { task: e.task, places: e.places } } };
}

const verifyMap = (entries: Map<string, MapEntry>, q: Question): string | null => {
  const e = entries.get(String(q.facts.entry));
  if (!e) return 'map question has no bank entry';
  return q.inputs.length === e.places.length && q.inputs.every((i, k) => i.label === e.places[k] && i.accepted[0] === RIGHT) ? null : 'map places changed';
};

/** A chapter becomes a UnitDef: every kind English has is built by the English builder, map types are built here. */
export function chapterToUnit(chapter: EvsChapterData): UnitDef {
  const maps = new Map(chapter.entries.filter(isMap).map((e) => [e.id, e]));
  const mapTypeIds = new Set([...maps.values()].map((e) => e.type));
  const base = englishUnit({ ...chapter, types: chapter.types.filter((t) => !mapTypeIds.has(t.id)), entries: chapter.entries.filter((e): e is Exclude<EvsEntry, MapEntry> => !isMap(e)) });
  const built = new Map(base.types.map((t) => [t.id, t]));
  const mapType = (t: BankType): QuestionType => {
    const pools = Object.fromEntries(LEVELS.map((l) => [l, [...maps.values()].filter((e) => e.type === t.id && e.level === (t.book ? 'medium' : l))])) as Record<Level, MapEntry[]>;
    return {
      id: t.id,
      title: t.title,
      inventory: t.inventory,
      generate: Object.fromEntries(
        LEVELS.map((l) => [
          l,
          (rng: Rng) => {
            const pool = pools[l];
            if (pool.length === 0) throw new Error(`${t.id} has no ${l} entries`);
            return mapQuestion(rng.pick(pool));
          },
        ]),
      ) as QuestionType['generate'],
      verify: (q) => verifyMap(maps, q),
      autoMarked: false,
      minDistinct: Math.max(1, Math.min(8, ...LEVELS.map((l) => pools[l].length))),
    };
  };
  return { ...base, subject: EVS_SUBJECT, types: chapter.types.map((t) => (mapTypeIds.has(t.id) ? mapType(t) : built.get(t.id)!)) };
}
