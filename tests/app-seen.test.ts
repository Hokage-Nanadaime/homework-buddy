import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../src/storage/memory';
import { avoidMap, loadSeen, overlapScore, pickSeed, remember, saveSeen, SEEN_MAX, type QuestionRef } from '../src/core/seen';
import { questionHash } from '../src/core/sheet';
import { resolveSpec, randomSeed, topicNumber } from '../src/core/worksheet';
import { builtUnits } from '../src/subjects/maths';

const unit = builtUnits[0]!;
const type = unit.types[0]!;

const refsOfSet = (seed: string): QuestionRef[] | undefined => {
  const r = resolveSpec({ unitNumber: unit.number, kind: 'topic', topic: topicNumber(type.id), level: 'medium', seed }, builtUnits);
  return r.ok && r.sheet.set ? r.sheet.set.questions.map((q) => ({ typeId: q.typeId, level: q.level, hash: questionHash(q) })) : undefined;
};

describe('no repeats for a kid', () => {
  it('two sets in a row share no questions when the pool allows, and the memory survives in storage', async () => {
    const store = createMemoryStorage();
    let docs = await loadSeen(store);
    const first = refsOfSet(pickSeed(() => undefined, avoidMap(docs, 'kid1'), randomSeed) )!;
    const s1 = pickSeed(refsOfSet, avoidMap(docs, 'kid1'), randomSeed);
    const set1 = refsOfSet(s1)!;
    expect(first.length).toBeGreaterThan(0);
    const next = remember(docs, 'kid1', set1);
    await saveSeen(store, docs, next);
    docs = await loadSeen(store);
    const s2 = pickSeed(refsOfSet, avoidMap(docs, 'kid1'), randomSeed);
    const set2 = refsOfSet(s2)!;
    const seen = new Set(set1.map((r) => r.hash));
    expect(set2.filter((r) => seen.has(r.hash))).toEqual([]);
    // another kid is not affected
    expect(avoidMap(docs, 'kid2').size).toBe(0);
  });

  it('keeps only the newest 300 keys per topic and level', () => {
    const refs = Array.from({ length: 320 }, (_, i) => ({ typeId: 'T', level: 'easy' as const, hash: `h${i}` }));
    const docs = remember({}, 'k', refs);
    const list = docs['k_T']!.cells.easy!;
    expect(list.length).toBe(SEEN_MAX);
    expect(list[0]).toBe('h20');
    expect(list.at(-1)).toBe('h319');
  });

  it('when a topic is used up, the questions seen longest ago come back first', () => {
    const pool = Array.from({ length: 12 }, (_, i) => `k${i}`);
    const docs = remember({}, 'k', pool.map((hash) => ({ typeId: 'T', level: 'easy' as const, hash })));
    const avoid = avoidMap(docs, 'k');
    // seed "s<i>" holds five questions starting at pool[i]
    const make = (seed: string): QuestionRef[] => {
      const i = Number(seed.slice(1));
      return Array.from({ length: 5 }, (_, j) => ({ typeId: 'T', level: 'easy' as const, hash: pool[(i + j) % 12]! }));
    };
    let n = 0;
    const picked = pickSeed(make, avoid, () => `s${n++ % 12}`, 12);
    expect(picked).toBe('s0');
    expect(overlapScore(make('s0'), avoid)).toBeLessThan(overlapScore(make('s7'), avoid));
  });
});
