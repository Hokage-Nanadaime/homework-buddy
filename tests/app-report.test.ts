import { describe, expect, it } from 'vitest';
import { emptyLog } from '../src/core/activity';
import { PORTIONS, buildReport, examReadiness, lastWeeks } from '../src/core/report';
import { emptyProgress } from '../src/core/progress';
import { emptyRewards } from '../src/core/rewards';
import { readerUnits, practiceUnits, unseenUnit } from '../src/app/englishBooks';
import { builtUnits } from '../src/subjects/maths';
import { reportHtml } from '../src/ui/reportHtml';
import { buildHistory } from './fixtures/history';

const units = [...builtUnits, ...readerUnits, ...practiceUnits, unseenUnit];
const NOW = new Date('2026-10-23T12:00:00Z'); // a Friday
const model = () => {
  const c = buildHistory(NOW);
  return buildReport({ name: c.name, log: c.log, progress: c.progress, rewards: c.rewards, units, goalMinutes: 15, now: NOW });
};

describe('report aggregation', () => {
  it('lists the last eight Mondays', () => {
    const w = lastWeeks(NOW, 8);
    expect(w).toHaveLength(8);
    expect(w.at(-1)).toBe('2026-10-19');
    expect(w[0]).toBe('2026-08-31');
  });

  it('shows growth from the first answers to the latest weeks, per subject', () => {
    const m = model();
    expect(m.baseline.overall.base).not.toBeNull();
    expect(m.baseline.overall.now).not.toBeNull();
    expect(m.baseline.overall.now!).toBeGreaterThan(m.baseline.overall.base!);
    expect(m.baseline.maths.now!).toBeGreaterThan(m.baseline.maths.base!);
    expect(m.baseline.english.now!).toBeGreaterThan(m.baseline.english.base!);
    expect(m.subject.maths.filter((v) => v !== null).length).toBeGreaterThanOrEqual(6);
    const first = m.subject.overall.find((v) => v !== null)!;
    expect(m.subject.overall.at(-1)!).toBeGreaterThan(first);
  });

  it('leaves a gap for a week with fewer than 10 answers', () => {
    const c = buildHistory(NOW);
    const log = { ...c.log, entries: c.log.entries.filter((e) => e.at >= '2026-10-12') };
    const m = buildReport({ name: 'Mira', log, progress: c.progress, rewards: c.rewards, units, goalMinutes: 15, now: NOW });
    expect(m.subject.overall.slice(0, 5).every((v) => v === null)).toBe(true);
    expect(m.subject.overall.at(-1)).not.toBeNull();
  });

  it('finds a growing topic and a plateau', () => {
    const m = model();
    expect(m.topics.length).toBeGreaterThan(0);
    expect(m.topics.some((t) => t.kind === 'growing')).toBe(true);
    expect(m.topics.some((t) => t.kind === 'plateau')).toBe(true);
  });

  it('heat map: tried chapters carry a percentage, others say not tried', () => {
    const m = model();
    expect(m.heat).toHaveLength(27);
    const maths1 = m.heat.find((h) => h.key === 'maths:1')!;
    expect(maths1.pct).toBe(78); // 31 of 40 at each level
    expect(m.heat.find((h) => h.key === 'maths:12')).toMatchObject({ answers: 0, pct: null });
  });

  it('levels count chapters passed and tried', () => {
    const m = model();
    const easy = m.levels.find((l) => l.level === 'easy')!;
    expect(easy.passed).toBe(2); // Unit 1 and Reader lesson 1
    expect(easy.tried).toBeGreaterThanOrEqual(3);
    expect(m.levels.find((l) => l.level === 'challenge')!.tried).toBe(0);
  });

  it('habit: days, minutes and sets per week, with Word Quest', () => {
    const m = model();
    expect(m.habit.days).toHaveLength(6);
    expect(m.habit.thisWeek.days).toBeGreaterThanOrEqual(5);
    expect(m.habit.mins.at(-1)!).toBeGreaterThan(m.habit.mins[0]!);
    expect(m.habit.goal).toBe(15);
  });

  it('typing: words a minute and accuracy grow, and keyboard help is recorded', () => {
    const m = model();
    const wpm = m.typing.wpm.filter((v): v is number => v !== null);
    expect(wpm.length).toBeGreaterThanOrEqual(3);
    expect(wpm.at(-1)!).toBeGreaterThan(wpm[0]!);
    expect(m.typing.helpOff).toBeGreaterThan(0);
    expect(m.typing.help.includes('off')).toBe(true);
  });

  it('next steps use plain rules, weakest topics first', () => {
    const m = model();
    expect(m.next.length).toBeGreaterThan(0);
    expect(m.next[0]!.text).toMatch(/right/);
    expect(m.next.every((n) => n.text.length > 0)).toBe(true);
    expect(m.next.some((n) => /not practised for/.test(n.text))).toBe(true);
  });

  it('exam readiness is honest about thin data', () => {
    const m = model();
    expect(examReadiness(m, PORTIONS.find((p) => p.key === 'maths')!, 25).word).toBe('Too early to say');
    const e = examReadiness(m, PORTIONS.find((p) => p.key === 'maths5')!, 25);
    expect(e.title).toMatch(/Periodic Test/);
    expect(['Too early to say', 'Building', 'Nearly there', 'On track']).toContain(e.word);
    expect(examReadiness(m, PORTIONS.find((p) => p.key === 'maths')!, 50).range).toBeNull();
  });
});

describe('likely mark needs 80% of the chapters with data', () => {
  const portion = PORTIONS.find((p) => p.key === 'maths5')!; // five chapters
  const withData = (n: number) => {
    const m = model();
    m.heat = m.heat.map((h) => (portion.chapters.includes(h.key) ? { ...h, answers: 0, pct: null, enough: false } : h));
    portion.chapters.slice(0, n).forEach((k, i) => {
      const h = m.heat.find((x) => x.key === k)!;
      Object.assign(h, { answers: 40, pct: 70 + i * 4, enough: true });
    });
    return m;
  };
  it('shows no range with 3 of 5 chapters, shows one with 4 of 5', () => {
    expect(examReadiness(withData(3), portion, 25).range).toBeNull();
    expect(examReadiness(withData(3), portion, 25).word).toBe('Too early to say');
    const four = examReadiness(withData(4), portion, 25);
    expect(four.range).not.toBeNull();
    // average 70, 74, 78, 82 over five chapters (one counts as zero) = 60.8: minus 10 to plus 5 points of 25 marks
    expect(four.range).toEqual([13, 16]);
  });
  it('says the rule under the range in the report', () => {
    const html = reportHtml(withData(5), { interactive: false, portion: 'maths5', marks: 25 });
    expect(html).toContain('A rough guide, not a prediction; real papers differ.');
    expect(html).toContain('Average accuracy on the chosen chapters, minus 10 to plus 5 points; untried chapters count as zero.');
    expect(reportHtml(withData(3), { interactive: false, portion: 'maths5', marks: 25 })).not.toContain('A rough guide');
  });
});

describe('a new child and thin data', () => {
  const blank = () => buildReport({ name: 'Kabir', log: emptyLog('k2', '2026-10-20T00:00:00Z'), progress: emptyProgress('k2'), rewards: emptyRewards('k2'), units, goalMinutes: 10, now: NOW });
  it('has an empty state that reads well', () => {
    const m = blank();
    expect(m.empty).toBe(true);
    expect(m.baseline.overall.base).toBeNull();
    expect(m.subject.overall.every((v) => v === null)).toBe(true);
    const html = reportHtml(m, { interactive: true, portion: 'maths', marks: 25 });
    expect(html).toContain('No sets finished yet');
    expect(html).toContain('History starts on 20 Oct 2026');
    expect(html).toContain('Not enough data yet');
    expect(html).not.toMatch(/NaN|undefined|null/);
  });
  it('the full report has the sections, tables and no ranking words', () => {
    const html = reportHtml(model(), { interactive: false, portion: 'maths', marks: 25 });
    for (const t of ['Where Mira started', 'Weekly growth by subject', 'Chapter heat map', 'Level progress', 'Habit: days, minutes and sets', 'Typing growth', 'Exam readiness', 'What to practise next', 'Rewards at a glance']) expect(html).toContain(t);
    expect(html).toContain('<table');
    expect(html).toMatch(/Right answers went from <b>\d+%<\/b> in the first \d+ answers/);
    expect(html).not.toMatch(/leaderboard|better than|NaN|undefined/i);
    expect(html).not.toContain('Mistake themes');
  });
});
