import { describe, expect, it } from 'vitest';
import { collapseSessions, freshPractice, isUnfinished, practiceKey, stripMixSize, type SavedSession } from '../src/core/session';

const sess = (id: string, at: string, over: Partial<SavedSession> = {}): SavedSession => ({ id, kidId: 'k1', kind: 'practice', code: 'E01-MED-AAAA', subject: 'english', unitNumber: 1, title: 'Animal World: Mixed practice, Medium', updatedAt: at, practice: { ...freshPractice(), idx: 3 }, ...over });

describe('one unfinished set per kind', () => {
  it('a mixed set is keyed without its size', () => {
    expect(practiceKey('k1', 1, 'MIX', 'medium', 'english')).toBe('k1_p_E1_MIX_medium');
    expect(stripMixSize('k1_p_E1_MIX20_medium')).toBe('k1_p_E1_MIX_medium');
    expect(stripMixSize('k1_p_E1_MIX25_medium')).toBe('k1_p_E1_MIX_medium');
    expect(stripMixSize('k1_p_E1_04_medium')).toBe('k1_p_E1_04_medium');
  });

  it('migration keeps the newest set of each kind, under the new key, and removes the rest', () => {
    const list = [
      sess('k1_p_E1_MIX20_medium', '2026-10-20T10:00:00Z'),
      sess('k1_p_E1_MIX25_medium', '2026-10-22T10:00:00Z', { code: 'E01-MED-25-BBBB' }),
      sess('k1_p_E1_04_easy', '2026-10-21T10:00:00Z'),
      sess('k1_p_E1_MIX15_easy', '2026-10-19T10:00:00Z'),
    ];
    const { keep, remove } = collapseSessions(list);
    expect(keep.map((s) => s.id).sort()).toEqual(['k1_p_E1_04_easy', 'k1_p_E1_MIX_easy', 'k1_p_E1_MIX_medium']);
    // the newest mixed Medium set (size 25) survived, with its code and place
    const mix = keep.find((s) => s.id === 'k1_p_E1_MIX_medium')!;
    expect(mix.code).toBe('E01-MED-25-BBBB');
    expect(mix.practice!.idx).toBe(3);
    expect(remove.sort()).toEqual(['k1_p_E1_MIX15_easy', 'k1_p_E1_MIX20_medium', 'k1_p_E1_MIX25_medium']);
  });

  it('is quiet when there is nothing to collapse, and leaves finished sets and exams alone', () => {
    const finished = sess('k1_p_E1_MIX_medium', '2026-10-01T00:00:00Z', { practice: { ...freshPractice(), finished: true } });
    const exam: SavedSession = { id: 'k1_x_EX-A', kidId: 'k1', kind: 'exam', code: 'EX-A', unitNumber: 0, title: 'Exam', updatedAt: '2026-10-02T00:00:00Z', test: { answers: {}, left: 100, running: true } };
    const live = sess('k1_p_E1_MIX20_medium', '2026-10-03T00:00:00Z');
    const { keep, remove } = collapseSessions([finished, exam, live]);
    expect(keep).toHaveLength(2); // the stale finished copy under the same key gives way to the unfinished set
    expect(keep.some((s) => s.id === exam.id)).toBe(true);
    expect(remove).toEqual(['k1_p_E1_MIX20_medium']);
    expect(keep.filter((s) => s.id === 'k1_p_E1_MIX_medium')).toHaveLength(1);
    expect(collapseSessions([live])).toEqual({ keep: [{ ...live, id: 'k1_p_E1_MIX_medium' }], remove: ['k1_p_E1_MIX20_medium'] });
    expect(collapseSessions([sess('k1_p_E1_04_easy', '2026-10-01T00:00:00Z')]).remove).toEqual([]);
    expect(isUnfinished(keep.find((s) => s.id === 'k1_p_E1_MIX_medium'))).toBe(true);
  });
});
