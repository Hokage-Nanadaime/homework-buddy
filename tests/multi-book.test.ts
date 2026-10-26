import { describe, expect, it, vi } from 'vitest';
import { practiceUnits, readerUnits, unseenUnit } from '../src/app/englishBooks';
import { builtUnits } from '../src/subjects/maths';
import { buildHistory } from './fixtures/history';
import type { BookDef } from '../src/core/books';
import type { UnitDef } from '../src/core/question';

/**
 * Many books (docs/design/REWARDS_MULTI_BOOK.md, P1 and P2): the registry is the only list of books, so a book added or removed
 * must never lower Pip, clash stamp ids, or announce old history as new. These tests load the whole core against a changed registry.
 */
const units: UnitDef[] = [...builtUnits, ...readerUnits, ...practiceUnits, unseenUnit];
const NOW = new Date('2026-10-23T12:00:00Z');

/** A fourth book: Science, five chapters, the first worth 10 points and the others 1. Its units are copies of Maths units 1 to 5 with the numbers 51 to 55. */
const science = (base: BookDef): BookDef => ({
  ...base,
  id: 'science',
  title: 'Science',
  shortTitle: 'Science',
  word: 'Chapter',
  stampWord: 'Science chapter',
  plural: 'Science chapters',
  unitOffset: 50,
  friendPrefix: 'sf',
  portionTitle: 'All {n} Science chapters',
  firstFew: undefined,
  stampSet: { name: 'Science friends', border: 'squircle', fill: 'sk4', blurb: 'One friend for each Science chapter.' },
  finisher: { id: 'b_science', name: 'Science Master Otter', species: 'otter', glyph: 'book12' },
  chapters: [1, 2, 3, 4, 5].map((n) => ({ n, title: `Science ${n}`, weight: n === 1 ? 10 : 1, friend: { name: `Sci Friend ${n}`, species: 'otter', glyph: 'star' } })),
});
const scienceUnits = (): UnitDef[] => builtUnits.slice(0, 5).map((u, i) => ({ ...u, number: 51 + i, id: `sci-${i + 1}` }));

async function load(variant: 'today' | 'plusScience' | 'minusPractice') {
  vi.resetModules();
  // change the one registry array before anything else reads it: every table is built from it
  const reg = await import('../src/core/books');
  // these tests are about the first three books and a made-up fourth: EVS is taken out of the list first (it has its own tests)
  reg.BOOKS.splice(reg.BOOKS.findIndex((b) => b.id === 'evs'), 1);
  if (variant === 'plusScience') reg.BOOKS.push(science(reg.BOOKS[0]!));
  if (variant === 'minusPractice') reg.BOOKS.splice(2, 1);
  const [books, chapters, pip, stamps, rewards, ev, plan] = await Promise.all([
    import('../src/core/books'),
    import('../src/core/chapters'),
    import('../src/core/pip'),
    import('../src/core/stamps'),
    import('../src/core/rewards'),
    import('../src/core/rewardEval'),
    import('../src/core/popupPlan'),
  ]);
  return { books, chapters, pip, stamps, rewards, ev, plan };
}

describe('the registry', () => {
  it('has unique stamp ids, known sets and one rule for each stamp, with or without a new book', async () => {
    for (const v of ['today', 'plusScience'] as const) {
      const { stamps } = await load(v);
      const ids = stamps.STAMP_DEFS.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
      const sets = new Set(stamps.STAMP_SETS.map((s) => s.id));
      expect(sets.size).toBe(stamps.STAMP_SETS.length);
      for (const d of stamps.STAMP_DEFS) {
        expect(sets.has(d.set)).toBe(true);
        expect(stamps.STAMP_RULES[d.id], d.id).toBeTypeOf('function');
      }
    }
  });
  it('computes the album total: a friend per chapter, a finisher per book, and the sets that belong to nobody', async () => {
    const a = await load('today');
    const b = await load('plusScience');
    const others = a.stamps.STAMP_DEFS.length - a.chapters.CHAPTERS.length - a.books.BOOKS.length;
    expect(others).toBe(19 + 3);
    expect(b.stamps.STAMP_DEFS.length).toBe(b.chapters.CHAPTERS.length + b.books.BOOKS.length + others);
    expect(b.stamps.STAMP_DEFS.length).toBe(a.stamps.STAMP_DEFS.length + 5 + 1);
    expect(b.stamps.STAMP_DEFS.filter((d) => d.set === 'science')).toHaveLength(5);
  });
  it('keeps the old stamp ids, and namespaces the new ones by book', async () => {
    const a = await load('today');
    const b = await load('plusScience');
    const old = a.stamps.STAMP_DEFS.map((d) => d.id);
    expect(b.stamps.STAMP_DEFS.map((d) => d.id).slice(0, 12)).toEqual(old.slice(0, 12));
    expect(old.filter((id) => !b.stamps.STAMP_DEFS.some((d) => d.id === id))).toEqual([]);
    expect(b.stamps.STAMP_DEFS.filter((d) => d.set === 'science').every((d) => d.id.startsWith('sf'))).toBe(true);
  });
  it('maps units to chapters both ways for a new book, and leaves the others alone', async () => {
    const { chapters } = await load('plusScience');
    const all = [...units, ...scienceUnits()];
    for (const c of chapters.CHAPTERS) {
      const u = chapters.unitOfChapter(c, all);
      expect(u, c.key).toBeDefined();
      expect(chapters.chapterKeyOf(u!)).toBe(c.key);
    }
    expect(chapters.chapterKeyOf(unseenUnit)).toBeUndefined();
  });
  it('builds the exam portions from the books', async () => {
    const { chapters } = await load('plusScience');
    const rep = await import('../src/core/report');
    expect(rep.PORTIONS.find((p) => p.key === 'science')).toEqual({ key: 'science', title: 'All 5 Science chapters', chapters: chapters.CHAPTERS.filter((c) => c.book === 'science').map((c) => c.key) });
    expect(rep.PORTIONS.find((p) => p.key === 'maths')!.title).toBe('All 12 Maths units');
  });
});

describe('Pip with many books', () => {
  it('never goes down when chapters or books are added', async () => {
    const a = await load('today');
    const b = await load('plusScience');
    let seed = 7;
    const rnd = (): number => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let round = 0; round < 40; round++) {
      const keys = a.chapters.CHAPTERS.map((c) => c.key).filter(() => rnd() < 0.4);
      const sci = b.chapters.CHAPTERS.filter((c) => c.book === 'science').map((c) => c.key).filter(() => rnd() < 0.5);
      let last = -1;
      let lastStage = -1;
      const ledger: Record<string, { at: string }> = {};
      for (const k of [...keys, ...sci]) {
        ledger[k] = { at: '2026-01-01T00:00:00Z' };
        const pts = b.pip.pipPoints({ chapters: ledger });
        expect(pts).toBeGreaterThanOrEqual(last);
        expect(b.pip.stageFor(pts)).toBeGreaterThanOrEqual(lastStage);
        last = pts;
        lastStage = b.pip.stageFor(pts);
      }
      // the same ledger read under the registry without the new book: not lower than what the old registry said
      const oldKeys = Object.fromEntries(keys.map((k) => [k, { at: '2026-01-01T00:00:00Z' }]));
      expect(b.pip.pipPoints({ chapters: ledger })).toBeGreaterThanOrEqual(a.pip.pipPoints({ chapters: oldKeys }));
    }
  });
  it('keeps the stage when a book disappears, because the ledger remembers the highest points', async () => {
    const full = await load('today');
    const c = buildHistory(NOW);
    const done = Object.fromEntries(full.chapters.CHAPTERS.map((ch) => [ch.key, { at: '2026-05-01T00:00:00Z' }]));
    const e = full.ev.evaluateRewards({ rewards: { ...full.rewards.emptyRewards('k'), chapters: done }, progress: c.progress, log: c.log, units, now: NOW.toISOString(), silent: true });
    expect(e.rewards.pipHigh).toBe(27);
    expect(e.stage).toBe(9);
    const less = await load('minusPractice');
    expect(less.pip.rawPoints(e.rewards)).toBe(16);
    expect(less.pip.pipPoints(e.rewards)).toBe(27);
    expect(less.pip.stageFor(less.pip.pipPoints(e.rewards))).toBe(9);
  });
  it('grows an orchard after the Fruit Tree: one friend for every ten more points', async () => {
    const { pip } = await load('today');
    expect([0, 26, 27, 36].map(pip.orchardOf)).toEqual([0, 0, 0, 0]);
    expect([37, 46, 47, 57, 127].map(pip.orchardOf)).toEqual([1, 1, 2, 3, 10]);
    expect(pip.toNextOrchard(27)).toBe(10);
    expect(pip.toNextOrchard(37)).toBe(10);
    expect(pip.toNextOrchard(44)).toBe(3);
    expect(pip.orchardFriend(1)).not.toBe(pip.orchardFriend(2));
    expect(pip.orchardFriend(1 + pip.ORCHARD_FRIENDS.length)).toBe(pip.orchardFriend(1));
    // a stage is only ever 0 to 9; the orchard never changes it
    expect(pip.stageFor(500)).toBe(9);
  });
  it('plants the orchard friend with the chapter that earns the tenth point', async () => {
    const b = await load('plusScience');
    const c = buildHistory(NOW);
    const all = [...units, ...scienceUnits()];
    // 27 points already (the Fruit Tree). Science chapter 1 is worth 10, so it plants Orchard 1.
    const done = Object.fromEntries(b.chapters.CHAPTERS.filter((ch) => ch.book !== 'science').map((ch) => [ch.key, { at: '2026-05-01T00:00:00Z' }]));
    const base = { ...b.rewards.emptyRewards('k'), chapters: done, pipHigh: 27, init: 'x', milestonesInit: 'x' };
    // the history fixture has Maths unit 1 Done: pretend it is a Science chapter by running the copy of that unit
    const unit1 = scienceUnits()[0]!;
    const e = b.ev.evaluateRewards({ rewards: base, progress: c.progress, log: c.log, units: all, now: NOW.toISOString() });
    expect(e.rewards.chapters['science:1']).toBeDefined();
    expect(e.rewards.pipHigh).toBe(37);
    expect(e.chapter?.orchard).toEqual({ n: 1, friend: b.pip.orchardFriend(1) });
    expect(b.plan.chapterLine(e.chapter!)).toContain('Orchard 1');
    expect(unit1.number).toBe(51);
    // the quiet and Full popups say the same thing, and a set that plants nothing says how far the next friend is
    const again = b.ev.evaluateRewards({ rewards: e.rewards, progress: c.progress, log: c.log, units: all, now: NOW.toISOString() });
    expect(again.chapter).toBeUndefined();
  });
});

describe('a book added after a child already has history', () => {
  it('is found quietly, once, in one combined popup', async () => {
    const before = await load('today');
    const c = buildHistory(NOW);
    const first = before.ev.evaluateRewards({ rewards: before.rewards.emptyRewards('k'), progress: c.progress, log: c.log, units, now: '2026-10-01T00:00:00Z', silent: true }).rewards;
    // the old popup was shown and seen
    const settled = { ...first, foundShown: '2026-10-02T00:00:00Z', milestonesShown: '2026-10-02T00:00:00Z', seen: Object.keys(first.stamps) };
    expect(settled.books).toEqual(['maths', 'reader', 'practice']);
    // nothing changes while the book list is the same
    expect(before.ev.catchUpNewBooks({ rewards: settled, progress: c.progress, log: c.log, units, now: NOW.toISOString() })).toBe(settled);
    // a ledger from before the registry existed is only stamped with the books of today
    const { books: _b, ...legacy } = settled;
    expect(before.ev.catchUpNewBooks({ rewards: legacy, progress: c.progress, log: c.log, units, now: NOW.toISOString() }).books).toEqual(['maths', 'reader', 'practice']);
    // Science arrives: its earlier history (the copy of Maths unit 1) is written with pre, nothing is queued
    const after = await load('plusScience');
    const caught = after.ev.catchUpNewBooks({ rewards: settled, progress: c.progress, log: c.log, units: [...units, ...scienceUnits()], now: NOW.toISOString() });
    expect(caught.books).toEqual(['maths', 'reader', 'practice', 'science']);
    expect(caught.chapters['science:1']?.pre).toBe(true);
    expect(caught.stamps['sf1']?.pre).toBe(true);
    expect(caught.foundShown).toBeUndefined();
    // the old chapters and stamps are untouched
    for (const k of Object.keys(settled.chapters)) expect(caught.chapters[k]).toEqual(settled.chapters[k]);
    for (const k of Object.keys(settled.stamps)) expect(caught.stamps[k]).toEqual(settled.stamps[k]);
    // the found popup lists only what is new, as one popup
    const found = after.stamps.STAMP_DEFS.filter((d) => caught.stamps[d.id]?.pre && !caught.seen.includes(d.id));
    expect(found.map((d) => d.id)).toContain('sf1');
    const plan = after.plan.planFound(found, 'full', 0);
    expect(plan.queue).toHaveLength(1);
    expect(plan.queue[0]!.kind).toBe('found');
    // and once more with the same list: nothing happens
    expect(after.ev.catchUpNewBooks({ rewards: caught, progress: c.progress, log: c.log, units: [...units, ...scienceUnits()], now: NOW.toISOString() })).toBe(caught);
  });
});

describe('Explorer stamps', () => {
  it('reward starting a second and a third book, and finishing chapters in two subjects in one month', async () => {
    const { stamps, books } = await load('today');
    const base = { log: {} as never, doneKeys: new Set<string>(), challengeKeys: new Set<string>(), fixed: false };
    const r = stamps.STAMP_RULES;
    expect(r.x_two!({ ...base, startedBooks: new Set(['maths']) })).toBe(false);
    expect(r.x_two!({ ...base, startedBooks: new Set(['maths', 'reader']) })).toBe(true);
    expect(r.x_three!({ ...base, startedBooks: new Set(['maths', 'reader']) })).toBe(false);
    expect(r.x_three!({ ...base, startedBooks: new Set(['maths', 'reader', 'practice']) })).toBe(true);
    const month = (m: string, ...s: string[]) => new Map([[m, new Set(s)]]);
    expect(r.x_both!({ ...base, doneSubjectsByMonth: month('2026-10', 'maths') })).toBe(false);
    expect(r.x_both!({ ...base, doneSubjectsByMonth: month('2026-10', 'maths', 'english') })).toBe(true);
    expect(r.x_both!({ ...base, doneSubjectsByMonth: new Map([['2026-09', new Set(['maths'])], ['2026-10', new Set(['english'])]]) })).toBe(false);
    expect(books.BOOKS.map((b) => b.subject)).toContain('english');
  });
  it('are found by the history fixture (it started Maths and the Reader) but not two subjects in a month from a catch-up', async () => {
    const { ev, rewards } = await load('today');
    const c = buildHistory(NOW);
    const e = ev.evaluateRewards({ rewards: rewards.emptyRewards('k'), progress: c.progress, log: c.log, units, now: NOW.toISOString(), silent: true });
    expect(e.rewards.stamps.x_two).toBeDefined();
    expect(e.rewards.stamps.x_three).toBeUndefined();
    expect(e.rewards.stamps.x_both).toBeUndefined();
  });
});
