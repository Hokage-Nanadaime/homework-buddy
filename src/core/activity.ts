import { BOOKS } from './books';
import type { SubjectId } from './question';
import type { KidProgress } from './progress';

/**
 * The activity log: an append-only, time-stamped record per kid, written whenever a set ends.
 * Counts and stable ids only. Never question text, answers or free text. Shape: docs/design/ACTIVITY_LOG.md.
 */

export type Mode = 'topic' | 'mixed' | 'worksheet' | 'paper' | 'exam' | 'wordquest';
export const ENTRY_CAP = 3000;
export const EXAM_CAP = 200;
export const QUEST_CAP = 1000;
export const MARK_CAP = 1000;
export const FIRST_ATTEMPTS = 20;
/** A topic set counts as passed at this share of right answers (and at least 3 answers). */
export const PASS_PERCENT = 70;
/** Fewer attempts than this in a window is "not enough data yet". */
export const MIN_SAMPLE = 10;
export const enoughData = (attempts: number, min = MIN_SAMPLE): boolean => attempts >= min;

/** One topic at one level in one set: type, level, attempts, correct, first-try correct, hints used, active seconds. */
export interface Row {
  t: string;
  l: string;
  a: number;
  c: number;
  f: number;
  h: number;
  s?: number;
}

/** What Practice (or paper entry) knows about one answered question. */
export interface AnswerRecord {
  typeId: string;
  level: string;
  correct: boolean;
  /** stable question id (the no-repeat memory's key hash), never the text */
  q?: string;
  firstTry?: boolean;
  hints?: number;
  /** true when the question was in the kid's no-repeat memory before this set was made */
  seen?: boolean;
  /** true when this question id was answered wrong on an earlier attempt (from the stored wrong ids, at write time) */
  wasWrong?: boolean;
  seconds?: number;
}

export interface ActivityEntry {
  at: string;
  kid: string;
  mode: Mode;
  subject: SubjectId;
  book: string;
  unit: string;
  size: number;
  secs: number;
  rows: Row[];
  /** per answer: "type|level|questionId|flags" where flags are four digits: right, first try, seen before, wrong on an earlier attempt */
  qs?: string[];
}

export interface WeekTotal {
  /** Monday of the week (UTC), YYYY-MM-DD */
  week: string;
  sets: number;
  secs: number;
  modes: Partial<Record<Mode, number>>;
  rows: Row[];
  quest?: { sessions: number; words: number; chars: number; secs: number; mistakes: number };
  exams?: number;
}

export interface Baseline {
  at: string;
  /** cumulative totals at the moment logging began: "type|level" -> attempts, correct, sets, stars */
  cells: Record<string, { a: number; c: number; sets: number; stars: number }>;
  tests: number;
}

export interface ExamRow {
  at: string;
  mode: 'exam' | 'paper';
  label: string;
  /** the portion chosen: Maths units, Reader lessons, Practice Book sections (book numbering) as "id" strings */
  portion: string[];
  subject: SubjectId;
  got: number;
  of: number;
  secs: number;
  sections: { n: number; got: number; of: number }[];
}

export interface QuestRow {
  at: string;
  lesson: number;
  /** word-list level */
  level: number;
  words: number;
  chars: number;
  secs: number;
  mistakes: number;
  /** the on-screen keyboard help was on */
  help: boolean;
}

export interface MarkRow {
  at: string;
  kind: 'practice' | 'exam';
  q: string;
  max: number;
  /** Claude's suggestion, when there was one */
  ai?: number;
  /** the mark that counts */
  fin: number;
  /** 'parent' typed or confirmed the mark; 'ai' the grown-up accepted the suggestion unchanged */
  by: 'ai' | 'parent';
}

export interface Firsts {
  medium?: string;
  challenge?: string;
  passed?: Partial<Record<'easy' | 'medium' | 'challenge', string>>;
}

export interface ActivityLog {
  v: 1;
  kidId: string;
  /** the kid's start date: when logging began */
  startedAt: string;
  baseline: Baseline;
  entries: ActivityEntry[];
  weeks: WeekTotal[];
  /** kept forever: the first 20 attempts of each "type|level", each "date|right+firstTry|questionId" */
  first: Record<string, string[]>;
  /** by topic id */
  firsts: Record<string, Firsts>;
  exams: ExamRow[];
  quest: QuestRow[];
  marks: MarkRow[];
}

export const baselineFrom = (p: KidProgress | undefined, now: string): Baseline => {
  const cells: Baseline['cells'] = {};
  for (const [k, c] of Object.entries(p?.cells ?? {})) if (c.attempts > 0 || c.sets > 0) cells[k] = { a: c.attempts, c: c.correct, sets: c.sets, stars: c.stars };
  return { at: now, cells, tests: p?.tests.length ?? 0 };
};

export const emptyLog = (kidId: string, now: string, progress?: KidProgress): ActivityLog => ({
  v: 1,
  kidId,
  startedAt: now,
  baseline: baselineFrom(progress, now),
  entries: [],
  weeks: [],
  first: {},
  firsts: {},
  exams: [],
  quest: [],
  marks: [],
});

/** Old or partial saved data loads: every list defaults to empty. */
export function normaliseLog(raw: Partial<ActivityLog> | undefined, kidId: string, now: string, progress?: KidProgress): ActivityLog {
  if (!raw || typeof raw !== 'object') return emptyLog(kidId, now, progress);
  const base = emptyLog(kidId, raw.startedAt ?? now, progress);
  return { ...base, ...raw, v: 1, kidId, baseline: raw.baseline ?? base.baseline, entries: raw.entries ?? [], weeks: raw.weeks ?? [], first: raw.first ?? {}, firsts: raw.firsts ?? {}, exams: raw.exams ?? [], quest: raw.quest ?? [], marks: raw.marks ?? [] };
}

const DAY = 86400000;
export function weekOf(iso: string): string {
  const d = new Date(iso);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const mon = t - ((new Date(t).getUTCDay() + 6) % 7) * DAY;
  return new Date(mon).toISOString().slice(0, 10);
}

const addRow = (rows: Row[], r: Row): void => {
  const x = rows.find((y) => y.t === r.t && y.l === r.l);
  if (!x) return void rows.push({ ...r });
  x.a += r.a;
  x.c += r.c;
  x.f += r.f;
  x.h += r.h;
  if (r.s !== undefined) x.s = (x.s ?? 0) + r.s;
};

const weekFor = (log: ActivityLog, iso: string): WeekTotal => {
  const w = weekOf(iso);
  let t = log.weeks.find((x) => x.week === w);
  if (!t) {
    t = { week: w, sets: 0, secs: 0, modes: {}, rows: [] };
    log.weeks.push(t);
    log.weeks.sort((a, b) => a.week.localeCompare(b.week));
  }
  return t;
};

/** Fold an entry into its week's totals (nothing is lost, only the per-answer detail). */
function rollUp(log: ActivityLog, e: ActivityEntry): void {
  const w = weekFor(log, e.at);
  w.sets += 1;
  w.secs += e.secs;
  w.modes[e.mode] = (w.modes[e.mode] ?? 0) + 1;
  for (const r of e.rows) addRow(w.rows, r);
}

export function buildEntry(a: { at: string; kid: string; mode: Mode; subject: SubjectId; book: string; unit: string; size: number; seconds: number; answers: AnswerRecord[] }): ActivityEntry {
  const rows: Row[] = [];
  const qs: string[] = [];
  for (const x of a.answers) {
    addRow(rows, { t: x.typeId, l: x.level, a: 1, c: x.correct ? 1 : 0, f: x.correct && x.firstTry ? 1 : 0, h: x.hints ?? 0, ...(x.seconds !== undefined ? { s: Math.round(x.seconds) } : {}) });
    if (x.q) qs.push(`${x.typeId}|${x.level}|${x.q}|${x.correct ? 1 : 0}${x.firstTry ? 1 : 0}${x.seen ? 1 : 0}${x.wasWrong ? 1 : 0}`);
  }
  return { at: a.at, kid: a.kid, mode: a.mode, subject: a.subject, book: a.book, unit: a.unit, size: a.size, secs: Math.round(a.seconds), rows, ...(qs.length ? { qs } : {}) };
}

/** Add one finished set: the entry, the permanent first attempts, the level firsts; roll the oldest into weeks beyond the cap. */
export function record(log: ActivityLog, entry: ActivityEntry, answers: AnswerRecord[] = []): ActivityLog {
  const next: ActivityLog = { ...log, entries: [...log.entries, entry], weeks: log.weeks.map((w) => ({ ...w, rows: w.rows.map((r) => ({ ...r })), modes: { ...w.modes } })), first: { ...log.first }, firsts: { ...log.firsts } };
  const date = entry.at.slice(0, 10);
  for (const a of answers) {
    const k = `${a.typeId}|${a.level}`;
    const list = next.first[k] ?? [];
    if (list.length < FIRST_ATTEMPTS) next.first[k] = [...list, `${date}|${a.correct ? 1 : 0}${a.firstTry ? 1 : 0}|${a.q ?? ''}`];
  }
  for (const r of entry.rows) {
    const f: Firsts = { ...(next.firsts[r.t] ?? {}), ...(next.firsts[r.t]?.passed ? { passed: { ...next.firsts[r.t]!.passed } } : {}) };
    if ((r.l === 'medium' || r.l === 'challenge') && !f[r.l]) f[r.l] = entry.at;
    if (entry.mode === 'topic' && (r.l === 'easy' || r.l === 'medium' || r.l === 'challenge') && r.a >= 3 && r.c * 100 >= PASS_PERCENT * r.a && !f.passed?.[r.l]) f.passed = { ...f.passed, [r.l]: entry.at };
    next.firsts[r.t] = f;
  }
  while (next.entries.length > ENTRY_CAP) rollUp(next, next.entries.shift()!);
  return next;
}

export function recordExam(log: ActivityLog, row: ExamRow): ActivityLog {
  const next = { ...log, exams: [...log.exams, row], weeks: log.weeks.map((w) => ({ ...w })) };
  const w = weekFor(next, row.at);
  w.exams = (w.exams ?? 0) + 1;
  while (next.exams.length > EXAM_CAP) next.exams.shift();
  return next;
}

export function recordQuest(log: ActivityLog, row: QuestRow): ActivityLog {
  const next = { ...log, quest: [...log.quest, row] };
  while (next.quest.length > QUEST_CAP) {
    const old = next.quest.shift()!;
    next.weeks = next.weeks.map((w) => ({ ...w }));
    const w = weekFor(next, old.at);
    const q = w.quest ?? { sessions: 0, words: 0, chars: 0, secs: 0, mistakes: 0 };
    w.quest = { sessions: q.sessions + 1, words: q.words + old.words, chars: q.chars + old.chars, secs: q.secs + old.secs, mistakes: q.mistakes + old.mistakes };
  }
  return next;
}

export function recordMark(log: ActivityLog, row: MarkRow): ActivityLog {
  const marks = [...log.marks.filter((m) => !(m.q === row.q && m.kind === row.kind && m.at.slice(0, 10) === row.at.slice(0, 10))), row];
  return { ...log, marks: marks.slice(-MARK_CAP) };
}

/** The book a Maths unit or English entry belongs to. */
export function bookOf(subject: SubjectId, n: number): string {
  const b = BOOKS.find((x) => x.subject === subject && x.chapters.some((c) => c.n === n - x.unitOffset));
  if (b) return b.id;
  return subject === 'maths' ? 'maths' : subject === 'evs' ? 'evs' : n >= 31 ? 'unseen' : n >= 11 ? 'practice' : 'reader';
}

/** The number the book shows for an entry: Practice Book sections 11 to 30 inside the app are 1 to 20 in the book. */
export const baseOfBook = (subject: SubjectId, n: number): number => {
  const b = BOOKS.find((x) => x.subject === subject && x.unitOffset > 0 && n > x.unitOffset && n < 31);
  return b ? n - b.unitOffset : n;
};
