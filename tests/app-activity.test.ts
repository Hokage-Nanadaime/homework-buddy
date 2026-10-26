import { describe, expect, it } from 'vitest';
import { ENTRY_CAP, EXAM_CAP, FIRST_ATTEMPTS, MIN_SAMPLE, baselineFrom, buildEntry, emptyLog, enoughData, normaliseLog, record, recordExam, recordMark, recordQuest, weekOf, type AnswerRecord } from '../src/core/activity';
import { exportBackup, restoreBackup } from '../src/core/backup';
import { emptyProgress, recordResults } from '../src/core/progress';
import { createMemoryStorage } from '../src/storage/memory';

const NOW = '2026-10-23T10:00:00.000Z';
const ans = (n: number, level = 'easy', ok = true): AnswerRecord[] => Array.from({ length: n }, (_, i) => ({ typeId: 'T1', level, correct: ok, q: `h${i}`, firstTry: ok, hints: 0, seen: i % 2 === 0, seconds: 5 }));
const entry = (at: string, answers = ans(4), mode: 'topic' | 'mixed' = 'topic') => buildEntry({ at, kid: 'k1', mode, subject: 'maths', book: 'maths', unit: '1', size: answers.length, seconds: 30, answers });

describe('activity log', () => {
  it('builds compact rows and ids, never text', () => {
    const e = entry(NOW, [...ans(3), { typeId: 'T2', level: 'medium', correct: false, q: 'zz', hints: 1 }]);
    expect(e.rows).toHaveLength(2);
    expect(e.rows[0]).toMatchObject({ t: 'T1', l: 'easy', a: 3, c: 3, f: 3, h: 0, s: 15 });
    expect(e.qs![0]).toBe('T1|easy|h0|1110');
    expect(e.qs![1]).toBe('T1|easy|h1|1100');
    expect(JSON.stringify(e)).not.toMatch(/prompt|answer/i);
  });

  it('appends, and keeps the first 20 attempts per topic and level forever', () => {
    let log = emptyLog('k1', NOW);
    for (let i = 0; i < 10; i++) log = record(log, entry(`2026-10-${10 + i}T10:00:00Z`), ans(4));
    expect(log.entries).toHaveLength(10);
    expect(log.first['T1|easy']).toHaveLength(FIRST_ATTEMPTS);
    expect(log.first['T1|easy']![0]).toBe('2026-10-10|11|h0');
  });

  it('records the level firsts: tried and passed', () => {
    let log = emptyLog('k1', NOW);
    log = record(log, entry('2026-10-10T10:00:00Z', ans(4, 'easy')), ans(4, 'easy'));
    expect(log.firsts.T1).toEqual({ passed: { easy: '2026-10-10T10:00:00Z' } });
    log = record(log, entry('2026-10-11T10:00:00Z', ans(4, 'medium', false)), ans(4, 'medium', false));
    expect(log.firsts.T1!.medium).toBe('2026-10-11T10:00:00Z');
    expect(log.firsts.T1!.passed!.medium).toBeUndefined();
    log = record(log, entry('2026-10-12T10:00:00Z', ans(4, 'medium')), ans(4, 'medium'));
    log = record(log, entry('2026-10-13T10:00:00Z', ans(4, 'medium')), ans(4, 'medium'));
    expect(log.firsts.T1!.passed!.medium).toBe('2026-10-12T10:00:00Z');
    expect(log.firsts.T1!.medium).toBe('2026-10-11T10:00:00Z');
  });

  it('caps the entries and rolls the oldest into weekly totals without losing counts', () => {
    let log = emptyLog('k1', NOW);
    for (let i = 0; i < ENTRY_CAP + 25; i++) log = record(log, entry('2026-09-01T10:00:00Z', ans(2)), ans(2));
    expect(log.entries).toHaveLength(ENTRY_CAP);
    const w = log.weeks.find((x) => x.week === weekOf('2026-09-01T10:00:00Z'))!;
    expect(w.sets).toBe(25);
    expect(w.rows[0]).toMatchObject({ t: 'T1', a: 50, c: 50 });
    expect(w.secs).toBe(25 * 30);
    expect(w.week).toBe('2026-08-31');
  });

  it('keeps more than 50 exams (cap 200), dated word quest rows and marks', () => {
    let log = emptyLog('k1', NOW);
    for (let i = 0; i < EXAM_CAP + 5; i++) log = recordExam(log, { at: NOW, mode: 'exam', label: 'x', portion: ['r1', 'p1'], subject: 'english', got: 10, of: 25, secs: 600, sections: [{ n: 1, got: 5, of: 5 }] });
    expect(log.exams).toHaveLength(EXAM_CAP);
    log = recordQuest(log, { at: NOW, lesson: 1, level: 2, words: 8, chars: 40, secs: 90, mistakes: 3, help: true });
    expect(log.quest[0]).toMatchObject({ words: 8, chars: 40, help: true });
    log = recordMark(log, { at: NOW, kind: 'exam', q: 'abc', max: 5, ai: 3, fin: 4, by: 'parent' });
    log = recordMark(log, { at: NOW, kind: 'exam', q: 'abc', max: 5, ai: 3, fin: 3, by: 'ai' });
    expect(log.marks).toEqual([{ at: NOW, kind: 'exam', q: 'abc', max: 5, ai: 3, fin: 3, by: 'ai' }]);
  });

  it('migrates old data: baseline holds the old totals and the date; nothing else changes', () => {
    let p = emptyProgress('k1');
    p = recordResults(p, 'easy', [{ typeId: 'T1', correct: true }, { typeId: 'T1', correct: false }], NOW, true);
    const log = normaliseLog(undefined, 'k1', NOW, p);
    expect(log.baseline).toEqual({ at: NOW, cells: { 'T1|easy': { a: 2, c: 1, sets: 1, stars: p.cells['T1|easy']!.stars } }, tests: 0 });
    expect(log.startedAt).toBe(NOW);
    expect(log.entries).toEqual([]);
    expect(baselineFrom(undefined, NOW).cells).toEqual({});
    // a log saved without the newer lists still loads
    const partial = normaliseLog({ kidId: 'k1', startedAt: NOW, entries: [entry(NOW)] } as never, 'k1', NOW);
    expect(partial.exams).toEqual([]);
    expect(partial.entries).toHaveLength(1);
  });

  it('minimum sample helper', () => {
    expect(MIN_SAMPLE).toBe(10);
    expect(enoughData(9)).toBe(false);
    expect(enoughData(10)).toBe(true);
  });
});

describe('backup round trip', () => {
  it('exports and restores progress and activity in the memory adapter, and restores an old backup', async () => {
    const a = createMemoryStorage();
    await a.set('kids', 'k1', { id: 'k1', name: 'Asha', grade: 3 });
    await a.set('progress', 'k1', recordResults(emptyProgress('k1'), 'easy', [{ typeId: 'T1', correct: true }], NOW, true));
    const log = record(emptyLog('k1', NOW), entry(NOW), ans(4));
    await a.set('activity', 'k1', log);
    const data = JSON.parse(JSON.stringify(await exportBackup(a, [{ id: 'k1', name: 'Asha', grade: 3 }], { view: 'grid' }, NOW)));
    const b = createMemoryStorage();
    expect((await restoreBackup(b, data, NOW)).kids).toBe(1);
    expect(await b.get('activity', 'k1')).toEqual(log);
    expect((await b.get<{ cells: object }>('progress', 'k1'))!.cells).toHaveProperty('T1|easy');
    delete data.activity;
    const c = createMemoryStorage();
    await restoreBackup(c, data, '2026-11-01T00:00:00.000Z');
    const old = (await c.get<ReturnType<typeof emptyLog>>('activity', 'k1'))!;
    expect(old.baseline.at).toBe('2026-11-01T00:00:00.000Z');
    expect(old.baseline.cells['T1|easy']!.a).toBe(1);
    await expect(restoreBackup(c, { app: 'other' }, NOW)).rejects.toThrow();
  });
});
