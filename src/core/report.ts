import { MIN_SAMPLE, enoughData, weekOf, type ActivityLog } from './activity';
import { BOOKS } from './books';
import { CHAPTERS, BOOK_WORD, chapterState, countedTopics, unitOfChapter, type BookKey } from './chapters';
import { chaptersDone, nextStage, orchardOf, pipPoints, stageFor, STAGES } from './pip';
import { cellKey, type KidProgress } from './progress';
import type { Level, SubjectId, UnitDef } from './question';
import type { RewardsDoc } from './rewards';
import { recentStamps } from './rewardHints';
import type { StampDef } from './stamps';

/**
 * The parent progress page and report, worked out from the activity log, the progress cells and the rewards ledger.
 * Plain numbers and plain rules, no AI. Only ever compared with the child's own past. Weeks are Monday to Sunday (UTC).
 */

export const AXIS_WEEKS = 8;
export const HABIT_WEEKS = 6;
export const STALE_DAYS = 21;
const LEVELS: Level[] = ['easy', 'medium', 'challenge'];
const pct = (c: number, a: number): number => Math.round((c / a) * 100);
const DAY = 86400000;

/** Topic ids start with the subject letter: M01-T01 is Maths, E01-T01 English, V01-T01 EVS (Maths ids carry no letter in old logs). */
const subjectOfType = (typeId: string): SubjectId => (typeId.startsWith('E') ? 'english' : typeId.startsWith('V') ? 'evs' : 'maths');
const SETS_MODES = new Set(['topic', 'mixed', 'worksheet']);

export interface Compare {
  /** percent right in the child's first answers, null when there were fewer than 10 */
  base: number | null;
  baseAnswers: number;
  /** percent right in the latest two weeks, null when fewer than 10 answers */
  now: number | null;
  nowAnswers: number;
}

export interface TopicTrend {
  typeId: string;
  title: string;
  series: (number | null)[];
  from: number | null;
  to: number | null;
  kind: 'growing' | 'plateau' | 'steady';
  weeksWithData: number;
}

export interface HeatCell {
  key: string;
  book: BookKey;
  label: string;
  answers: number;
  /** percent right; null when never tried */
  pct: number | null;
  /** at least 10 answers, so the percentage can be shown */
  enough: boolean;
}

export interface LevelRow {
  level: Level;
  passed: number;
  tried: number;
  of: number;
}

export interface NextItem {
  text: string;
  chapterKey?: string;
}

export interface ReportModel {
  name: string;
  /** when the log began: history starts here */
  historyStart: string;
  before: { answers: number; sets: number; pct: number | null } | null;
  answersLogged: number;
  baseline: { overall: Compare; maths: Compare; english: Compare; evs?: Compare; from?: string; to?: string };
  weeks: string[];
  subject: { maths: (number | null)[]; english: (number | null)[]; evs?: (number | null)[]; overall: (number | null)[] };
  topics: TopicTrend[];
  heat: HeatCell[];
  levels: LevelRow[];
  habit: { days: number[]; mins: number[]; sets: number[]; goal: number; thisWeek: { days: number; mins: number; sets: number } };
  typing: { weeks: string[]; wpm: (number | null)[]; acc: (number | null)[]; help: ('on' | 'off' | 'mixed' | null)[]; sessions: number; helpOff: number };
  exams: { at: string; label: string; got: number; of: number }[];
  next: NextItem[];
  pip: { stage: number; stageName: string; done: number; toNext: number; nextName?: string; orchard?: number };
  stamps: { count: number; recent: StampDef[] };
  marks: { total: number; accepted: number; changed: number } | null;
  /** true when no set has been finished since the history started */
  empty: boolean;
}

export interface ReportInput {
  name: string;
  log: ActivityLog;
  progress?: KidProgress;
  rewards: RewardsDoc;
  units: UnitDef[];
  goalMinutes: number;
  now: Date;
}

const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
/** The Monday of each of the last n weeks up to the week of `now`, oldest first. */
export function lastWeeks(now: Date, n: number): string[] {
  const cur = Date.parse(`${weekOf(now.toISOString())}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => iso(cur - (n - 1 - i) * 7 * DAY));
}

interface Tally {
  a: number;
  c: number;
}
const add = (m: Map<string, Tally>, k: string, a: number, c: number): void => {
  const t = m.get(k) ?? { a: 0, c: 0 };
  t.a += a;
  t.c += c;
  m.set(k, t);
};

export function buildReport(inp: ReportInput): ReportModel {
  const { log, progress, rewards, units, now } = inp;
  const weeks = lastWeeks(now, AXIS_WEEKS);
  const titleOf = new Map(units.flatMap((u) => u.types.map((t) => [t.id, `${u.subject === 'english' ? '' : ''}${t.title}`] as const)));

  // weekly answers by subject and by topic (sets: topic, mixed and worksheet; not exams or Word Quest)
  const subj = { maths: new Map<string, Tally>(), english: new Map<string, Tally>(), evs: new Map<string, Tally>() };
  const topic = new Map<string, Tally>();
  const topicTotal = new Map<string, number>();
  const feed = (week: string, typeId: string, a: number, c: number, subject?: SubjectId): void => {
    const s = subject ?? subjectOfType(typeId);
    add(subj[s], week, a, c);
    add(topic, `${typeId}|${week}`, a, c);
    topicTotal.set(typeId, (topicTotal.get(typeId) ?? 0) + a);
  };
  for (const w of log.weeks) for (const r of w.rows) feed(w.week, r.t, r.a, r.c);
  for (const e of log.entries) if (SETS_MODES.has(e.mode)) for (const r of e.rows) feed(weekOf(e.at), r.t, r.a, r.c, e.subject);
  const seriesOf = (m: Map<string, Tally>): (number | null)[] => weeks.map((w) => { const t = m.get(w); return t && enoughData(t.a) ? pct(t.c, t.a) : null; });
  const both = new Map<string, Tally>();
  for (const m of [subj.maths, subj.english, subj.evs]) for (const [w, t] of m) add(both, w, t.a, t.c);
  const answersLogged = [...both.values()].reduce((n, t) => n + t.a, 0);

  // before logging
  const cells = Object.values(log.baseline.cells);
  const bAnswers = cells.reduce((n, c) => n + c.a, 0);
  const before = bAnswers > 0 ? { answers: bAnswers, sets: cells.reduce((n, c) => n + c.sets, 0), pct: enoughData(bAnswers) ? pct(cells.reduce((n, c) => n + c.c, 0), bAnswers) : null } : null;

  // baseline: the first 20 attempts of every topic and level, against the latest two weeks
  const first = { maths: { a: 0, c: 0 }, english: { a: 0, c: 0 }, evs: { a: 0, c: 0 } };
  let firstDate: string | undefined;
  let lastFirstDate: string | undefined;
  for (const [k, list] of Object.entries(log.first)) {
    const s = subjectOfType(k);
    for (const item of list) {
      const [d, flags] = item.split('|');
      first[s].a += 1;
      first[s].c += flags?.[0] === '1' ? 1 : 0;
      if (d && (!firstDate || d < firstDate)) firstDate = d;
      if (d && (!lastFirstDate || d > lastFirstDate)) lastFirstDate = d;
    }
  }
  const nowOf = (m: Map<string, Tally>): Tally => weeks.slice(-2).reduce((t, w) => ({ a: t.a + (m.get(w)?.a ?? 0), c: t.c + (m.get(w)?.c ?? 0) }), { a: 0, c: 0 });
  const cmp = (b: Tally, n: Tally): Compare => ({ base: enoughData(b.a) ? pct(b.c, b.a) : null, baseAnswers: b.a, now: enoughData(n.a) ? pct(n.c, n.a) : null, nowAnswers: n.a });
  const baseline = {
    overall: cmp({ a: first.maths.a + first.english.a + first.evs.a, c: first.maths.c + first.english.c + first.evs.c }, nowOf(both)),
    maths: cmp(first.maths, nowOf(subj.maths)),
    english: cmp(first.english, nowOf(subj.english)),
    ...(first.evs.a > 0 || subj.evs.size > 0 ? { evs: cmp(first.evs, nowOf(subj.evs)) } : {}),
    ...(firstDate ? { from: firstDate, to: lastFirstDate } : {}),
  };

  // topic trends: the two topics with the most weeks of enough data
  const trends: TopicTrend[] = [];
  for (const typeId of topicTotal.keys()) {
    const series = weeks.map((w) => { const t = topic.get(`${typeId}|${w}`); return t && enoughData(t.a) ? pct(t.c, t.a) : null; });
    const pts = series.filter((v): v is number => v !== null);
    if (pts.length < 2) continue;
    const from = pts[0]!;
    const to = pts[pts.length - 1]!;
    const kind = to - from >= 10 ? 'growing' : Math.abs(to - from) < 6 && pts.length >= 3 ? 'plateau' : 'steady';
    trends.push({ typeId, title: titleOf.get(typeId) ?? typeId, series, from, to, kind, weeksWithData: pts.length });
  }
  trends.sort((a, b) => b.weeksWithData - a.weeksWithData || (topicTotal.get(b.typeId) ?? 0) - (topicTotal.get(a.typeId) ?? 0));

  // heat map and levels over every chapter
  const heat: HeatCell[] = [];
  const levels: LevelRow[] = LEVELS.map((level) => ({ level, passed: 0, tried: 0, of: CHAPTERS.length }));
  const stale: NextItem[] = [];
  const weak: { score: number; item: NextItem }[] = [];
  const reading: { left: number; item: NextItem }[] = [];
  const challenge: NextItem[] = [];
  for (const c of CHAPTERS) {
    const unit = unitOfChapter(c, units);
    if (!unit) continue;
    const label = `${BOOK_WORD[c.book]} ${c.n} ${unit.title}`;
    const topics = countedTopics(unit);
    let a = 0;
    let right = 0;
    for (const t of topics) {
      let ta = 0;
      let tc = 0;
      for (const l of LEVELS) {
        const cell = progress?.cells[cellKey(t.id, l)];
        if (cell) {
          ta += cell.attempts;
          tc += cell.correct;
        }
      }
      a += ta;
      right += tc;
      if (enoughData(ta) && pct(tc, ta) < 70) weak.push({ score: pct(tc, ta), item: { text: `${t.title} (${label}): ${pct(tc, ta)}% right. Two short Easy sets, then Medium.`, chapterKey: c.key } });
      const last = LEVELS.map((l) => progress?.cells[cellKey(t.id, l)]?.last ?? '').sort().pop();
      if (ta > 0 && last && now.getTime() - Date.parse(last) > STALE_DAYS * DAY) stale.push({ text: `${t.title} (${label}): not practised for ${Math.round((now.getTime() - Date.parse(last)) / (7 * DAY))} weeks. A short set keeps it fresh.`, chapterKey: c.key });
    }
    heat.push({ key: c.key, book: c.book, label: `${c.n} ${unit.title}`, answers: a, pct: a === 0 ? null : enoughData(a) ? pct(right, a) : null, enough: enoughData(a) });
    const st = chapterState(progress, log.firsts, unit);
    LEVELS.forEach((l, i) => {
      if (st[l]) levels[i]!.passed += 1;
      const tried = topics.some((t) => (progress?.cells[cellKey(t.id, l)]?.attempts ?? 0) > 0 || (l !== 'easy' && log.firsts[t.id]?.[l] !== undefined));
      if (tried) levels[i]!.tried += 1;
    });
    if (st.started && !st.done) {
      const left = (['easy', 'medium'] as const).filter((l) => !st[l]).length;
      reading.push({ left, item: { text: `${label}: ${left === 1 ? 'one more level' : 'two more levels'} to pass and the chapter is Done.`, chapterKey: c.key } });
    }
    if (st.done && !st.challenge && !topics.some((t) => (progress?.cells[cellKey(t.id, 'challenge')]?.attempts ?? 0) > 0)) challenge.push({ text: `${label}: Done. Try a Challenge set when you feel like it.`, chapterKey: c.key });
  }

  // habit: days, minutes and sets by week; Word Quest counts for days and minutes
  const habitWeeks = weeks.slice(-HABIT_WEEKS);
  const days = new Map<string, Set<string>>();
  const mins = new Map<string, number>();
  const setsBy = new Map<string, number>();
  const day = (w: string, d: string): void => void days.set(w, (days.get(w) ?? new Set()).add(d));
  for (const e of log.entries) {
    const w = weekOf(e.at);
    day(w, e.at.slice(0, 10));
    mins.set(w, (mins.get(w) ?? 0) + e.secs);
    if (SETS_MODES.has(e.mode)) setsBy.set(w, (setsBy.get(w) ?? 0) + 1);
  }
  for (const q of log.quest) {
    const w = weekOf(q.at);
    day(w, q.at.slice(0, 10));
    mins.set(w, (mins.get(w) ?? 0) + q.secs);
  }
  for (const w of log.weeks) {
    mins.set(w.week, (mins.get(w.week) ?? 0) + w.secs);
    setsBy.set(w.week, (setsBy.get(w.week) ?? 0) + w.sets);
  }
  const habit = {
    days: habitWeeks.map((w) => days.get(w)?.size ?? 0),
    mins: habitWeeks.map((w) => Math.round((mins.get(w) ?? 0) / 60)),
    sets: habitWeeks.map((w) => setsBy.get(w) ?? 0),
    goal: inp.goalMinutes,
    thisWeek: { days: 0, mins: 0, sets: 0 },
  };
  habit.thisWeek = { days: habit.days.at(-1) ?? 0, mins: habit.mins.at(-1) ?? 0, sets: habit.sets.at(-1) ?? 0 };

  // typing: words a minute and right letters by week, from the dated Word Quest rows
  const tw = new Map<string, { chars: number; secs: number; mistakes: number; on: number; off: number }>();
  for (const q of log.quest) {
    const w = weekOf(q.at);
    const t = tw.get(w) ?? { chars: 0, secs: 0, mistakes: 0, on: 0, off: 0 };
    t.chars += q.chars;
    t.secs += q.secs;
    t.mistakes += q.mistakes;
    if (q.help) t.on++;
    else t.off++;
    tw.set(w, t);
  }
  const typing = {
    weeks: habitWeeks,
    wpm: habitWeeks.map((w) => { const t = tw.get(w); return t && t.secs >= 60 && t.chars >= 50 ? Math.round((t.chars / 5 / (t.secs / 60)) * 10) / 10 : null; }),
    acc: habitWeeks.map((w) => { const t = tw.get(w); return t && t.chars >= 50 ? pct(t.chars, t.chars + t.mistakes) : null; }),
    help: habitWeeks.map((w) => { const t = tw.get(w); return !t ? null : t.off === 0 ? ('on' as const) : t.on === 0 ? ('off' as const) : ('mixed' as const); }),
    sessions: log.quest.length,
    helpOff: log.quest.filter((q) => !q.help).length,
  };

  // what to practise next: plain rules, in this order
  weak.sort((a, b) => a.score - b.score);
  reading.sort((a, b) => a.left - b.left);
  // one slot for each rule first, then the rest of the weak topics and reading chapters
  const picks = [...weak.slice(0, 2).map((x) => x.item), ...reading.slice(0, 1).map((x) => x.item), ...challenge.slice(0, 1), ...stale.slice(0, 1)];
  const rest = [...reading.slice(1).map((x) => x.item), ...weak.slice(2).map((x) => x.item), ...challenge.slice(1), ...stale.slice(1)];
  const next: NextItem[] = [...picks, ...rest].slice(0, 5);
  if (next.length === 0 && answersLogged === 0 && !progress) next.push({ text: 'Finish a set in any chapter to start the story.' });

  const done = chaptersDone(rewards);
  const points = pipPoints(rewards);
  const stage = stageFor(points);
  const trees = orchardOf(points);
  const nxt = nextStage(stage);
  const marksAi = log.marks.filter((m) => m.ai !== undefined && m.at >= iso(now.getTime() - 42 * DAY));
  return {
    name: inp.name,
    historyStart: log.startedAt,
    before,
    answersLogged,
    baseline,
    weeks,
    subject: { maths: seriesOf(subj.maths), english: seriesOf(subj.english), ...(subj.evs.size > 0 ? { evs: seriesOf(subj.evs) } : {}), overall: seriesOf(both) },
    topics: trends.slice(0, 2),
    heat,
    levels,
    habit,
    typing,
    exams: log.exams.slice(-5).reverse().map((x) => ({ at: x.at, label: x.label, got: x.got, of: x.of })),
    next,
    pip: { stage, stageName: STAGES[stage]!.name, done, toNext: nxt ? nxt.at - points : 0, nextName: nxt?.name, ...(trees > 0 ? { orchard: trees } : {}) },
    stamps: { count: Object.keys(rewards.stamps).length, recent: recentStamps(rewards, 5) },
    marks: marksAi.length > 0 ? { total: marksAi.length, accepted: marksAi.filter((m) => m.ai === m.fin).length, changed: marksAi.filter((m) => m.ai !== m.fin).length } : null,
    empty: log.entries.length === 0 && log.quest.length === 0 && log.exams.length === 0 && log.weeks.length === 0,
  };
}

export interface ExamPortion {
  key: string;
  title: string;
  chapters: string[];
}
/** The portions a parent can choose for exam readiness. */
export const PORTIONS: ExamPortion[] = (() => {
  const keys = (book: string, upTo = Infinity): string[] => CHAPTERS.filter((c) => c.book === book && c.n <= upTo).map((c) => c.key);
  const list: ExamPortion[] = [];
  const subjects = [...new Set(BOOKS.map((b) => b.subject))];
  for (const subject of subjects) {
    const books = BOOKS.filter((b) => b.subject === subject);
    for (const b of books) {
      list.push({ key: b.id, title: b.portionTitle.replace('{n}', String(b.chapters.length)), chapters: keys(b.id) });
      if (b.firstFew) list.push({ key: `${b.id}${b.firstFew.count}`, title: b.firstFew.title, chapters: keys(b.id, b.firstFew.count) });
    }
    // a subject with several books also offers all of them together: "English Reader and Practice Book"
    if (books.length > 1) list.push({ key: subject, title: `${subject === 'english' ? 'English' : 'Maths'} ${books.map((b) => b.shortTitle).join(' and ')}`, chapters: books.flatMap((b) => keys(b.id)) });
  }
  return list;
})();

export interface Readiness {
  title: string;
  marks: number;
  /** a word for where things stand */
  word: 'On track' | 'Nearly there' | 'Building' | 'Too early to say';
  /** a rough guide to the mark, null when fewer than 80% of the chapters have 10 or more answers */
  range: [number, number] | null;
  weakest?: string;
  say: string;
  chapters: { label: string; pct: number | null; enough: boolean }[];
  /** the latest practice exams, newest first */
  recent: { at: string; label: string; got: number; of: number }[];
}

/** Exam readiness for a chosen portion and paper size. The likely-mark range needs 10 or more answers in at least 80% of the portion's chapters, otherwise it says it is too early. */
export const READY_SHARE = 0.8;
export function examReadiness(model: ReportModel, portion: ExamPortion, marks: 25 | 50): Readiness {
  const cells = model.heat.filter((h) => portion.chapters.includes(h.key));
  const withData = cells.filter((c) => c.enough && c.pct !== null);
  const chapters = cells.map((c) => ({ label: c.label, pct: c.pct, enough: c.enough }));
  const base = { title: `${portion.title} · ${marks === 25 ? 'Periodic Test, 25 marks' : 'Term Exam, 50 marks'}`, marks, chapters, recent: model.exams };
  if (withData.length === 0 || withData.length < cells.length * READY_SHARE) {
    const missing = cells.length - withData.length;
    return { ...base, word: 'Too early to say', range: null, say: `${missing} of ${cells.length} chapters have fewer than ${MIN_SAMPLE} answers (or none), so a forecast would be a guess.` };
  }
  // chapters without data count as zero: the exam covers them too
  const avg = withData.reduce((n, c) => n + c.pct!, 0) / cells.length;
  const lo = Math.max(0, Math.round(((avg - 10) / 100) * marks));
  const hi = Math.min(marks, Math.round(((avg + 5) / 100) * marks));
  const weakest = [...withData].sort((a, b) => a.pct! - b.pct!)[0]!;
  const above = withData.filter((c) => c.pct! >= 70).length;
  const word = avg >= 80 ? 'On track' : avg >= 65 ? 'Nearly there' : 'Building';
  return {
    ...base,
    word,
    range: [lo, hi],
    weakest: `${weakest.label} (${weakest.pct}%)`,
    say: `${above} of ${cells.length} chapters are above 70%.${cells.length - withData.length > 0 ? ` ${cells.length - withData.length} have not been tried enough yet.` : ''} The range is wide on purpose.`,
  };
}
