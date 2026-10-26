import { createRng, type Rng } from './rng';

/** Word Quest: pure rules (word picking, levels, scoring, clues, fingers). No screen code here. */

export const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'] as const;
export const HOME_LETTERS = new Set('asdfghjkl');

export interface QuestWord {
  word: string;
  meaning?: string;
}

/** Entries like "buzz; speak" are split; entries with spaces, dots or other marks (two words, "St. Bernard") are skipped; repeats removed. */
export function cleanWords(vocab: { word: string; meaning?: string }[]): QuestWord[] {
  const seen = new Set<string>();
  const out: QuestWord[] = [];
  for (const v of vocab) {
    for (const piece of v.word.split(/[;,]/)) {
      const w = piece.trim().toLowerCase();
      if (!/^[a-z]{2,}$/.test(w) || seen.has(w)) continue;
      // a meaning belongs to the entry; for a split entry only the first word keeps it
      seen.add(w);
      out.push({ word: w, meaning: v.word.split(/[;,]/).length === 1 ? v.meaning : undefined });
    }
  }
  return out;
}

/** Short real words that use only the home row (a s d f g h j k l). */
export const HOME_WORDS = ['ad', 'as', 'ask', 'add', 'all', 'dad', 'sad', 'gas', 'has', 'lad', 'lag', 'gag', 'hag', 'dash', 'lash', 'gash', 'fall', 'hall', 'half', 'glad', 'flag', 'flask', 'shall', 'salad', 'dad', 'fads', 'hash', 'sash', 'lass', 'jag'];
/** Short real words that need the top and bottom rows. */
export const ROW_WORDS = ['pot', 'top', 'tie', 'tree', 'wire', 'pure', 'quiz', 'zoom', 'box', 'vote', 'move', 'nice', 'mix', 'went', 'were', 'wipe', 'route', 'buy', 'one', 'new', 'over', 'into', 'under', 'power', 'water', 'quiet', 'type', 'write', 'every', 'woman'];

export type QuestLevel = 1 | 2 | 3 | 4;
export const LEVEL_TITLE: Record<QuestLevel, string> = { 1: 'Home row', 2: 'Top and bottom rows', 3: 'Lesson words', 4: 'Long lesson words' };
export const SESSION_WORDS = 10;
export const SHORT_MAX = 5;

const usesOnlyHome = (w: string): boolean => [...w].every((c) => HOME_LETTERS.has(c));
const awayFromHome = (w: string): number => [...w].filter((c) => !HOME_LETTERS.has(c)).length;

/** The words a level draws from. Levels 3 and 4 split the lesson words by length; a thin band is topped up from the other. */
export function poolFor(level: QuestLevel, lessonWords: QuestWord[]): QuestWord[] {
  if (level === 1) return HOME_WORDS.filter(usesOnlyHome).map((word) => ({ word }));
  if (level === 2) return ROW_WORDS.filter((w) => awayFromHome(w) >= 2).map((word) => ({ word }));
  const short = lessonWords.filter((w) => w.word.length <= SHORT_MAX);
  const long = lessonWords.filter((w) => w.word.length > SHORT_MAX);
  const band = level === 3 ? short : long;
  if (band.length >= SESSION_WORDS) return band;
  return [...band, ...(level === 3 ? long : short)].slice(0, Math.max(band.length, SESSION_WORDS));
}

/** Whether a level is worth offering: levels 3 and 4 need lesson words. */
export function maxLevel(lessonWords: QuestWord[]): QuestLevel {
  if (lessonWords.length === 0) return 2;
  return lessonWords.some((w) => w.word.length > SHORT_MAX) && lessonWords.filter((w) => w.word.length > SHORT_MAX).length >= 4 ? 4 : 3;
}

export interface WordStat {
  seen: number;
  /** words typed with no mistake */
  clean: number;
}

/**
 * Ten different words for a session. Never the same word twice in one session; words not met lately come first,
 * and words that went badly before come back sooner.
 */
export function pickWords(pool: QuestWord[], stats: Record<string, WordStat>, count: number, rng: Rng, avoid: Set<string> = new Set()): QuestWord[] {
  const unique = [...new Map(pool.map((w) => [w.word, w])).values()];
  const fresh = unique.filter((w) => !avoid.has(w.word));
  const base = fresh.length >= count ? fresh : unique;
  const weight = (w: QuestWord): number => {
    const s = stats[w.word];
    if (!s) return 0;
    return s.seen * 2 - (s.seen - s.clean) * 1.5;
  };
  const shuffled = rng.shuffle(base);
  return shuffled.sort((a, b) => weight(a) - weight(b)).slice(0, Math.min(count, base.length));
}

export interface WordResult {
  word: string;
  letters: number;
  mistakes: number;
  ms: number;
  hinted: boolean;
}

/** 3 stars for a clean, quick word; 2 for a clean slower one; 1 for a couple of slips or a hint; 0 for a rough one. It always completes. */
export function starsFor(r: Pick<WordResult, 'letters' | 'mistakes' | 'ms' | 'hinted'>): number {
  if (r.hinted) return r.mistakes === 0 ? 1 : 0;
  if (r.mistakes === 0) return r.ms <= r.letters * 1200 + 2500 ? 3 : 2;
  return r.mistakes <= 2 ? 1 : 0;
}

export interface SessionSummary {
  words: number;
  stars: number;
  accuracy: number;
  /** words per minute, in the usual five letters to a word */
  speed: number;
  bestStreak: number;
}

export function summarise(results: WordResult[]): SessionSummary {
  const letters = results.reduce((n, r) => n + r.letters, 0);
  const mistakes = results.reduce((n, r) => n + r.mistakes, 0);
  const ms = results.reduce((n, r) => n + r.ms, 0);
  let streak = 0;
  let best = 0;
  for (const r of results) {
    streak = r.mistakes === 0 && !r.hinted ? streak + 1 : 0;
    best = Math.max(best, streak);
  }
  return {
    words: results.length,
    stars: results.reduce((n, r) => n + starsFor(r), 0),
    accuracy: letters + mistakes === 0 ? 0 : Math.round((letters / (letters + mistakes)) * 100),
    speed: ms === 0 ? 0 : Math.round(((letters / 5) / (ms / 60000)) * 10) / 10,
    bestStreak: best,
  };
}

/** Up a level after a good session, down after a rough one, otherwise stay. */
export function nextLevel(level: QuestLevel, s: SessionSummary, top: QuestLevel): QuestLevel {
  if (s.words >= 8 && s.accuracy >= 90 && level < top) return (level + 1) as QuestLevel;
  if (s.accuracy < 60 && level > 1) return (level - 1) as QuestLevel;
  return level;
}

/** A short try-out (home-row words, then top and bottom row words) decides where a beginner starts. */
export function placement(home: SessionSummary, rows: SessionSummary, top: QuestLevel): QuestLevel {
  if (home.accuracy < 85) return 1;
  if (rows.accuracy < 85) return 2;
  return Math.min(3, top) as QuestLevel;
}

export interface Finger {
  hand: 'left' | 'right';
  finger: 'little' | 'ring' | 'middle' | 'index';
  text: string;
}

const FINGERS: Record<string, [Finger['hand'], Finger['finger']]> = {};
for (const [letters, hand, finger] of [
  ['qaz', 'left', 'little'],
  ['wsx', 'left', 'ring'],
  ['edc', 'left', 'middle'],
  ['rfvtgb', 'left', 'index'],
  ['yhnujm', 'right', 'index'],
  ['ik', 'right', 'middle'],
  ['ol', 'right', 'ring'],
  ['p', 'right', 'little'],
] as const) for (const c of letters) FINGERS[c] = [hand, finger];

export function fingerFor(letter: string): Finger | undefined {
  const f = FINGERS[letter.toLowerCase()];
  return f ? { hand: f[0], finger: f[1], text: `${f[0]} ${f[1]} finger` } : undefined;
}

/** Which hand types a key (for the keyboard colours). */
export const handOf = (letter: string): 'left' | 'right' | undefined => FINGERS[letter.toLowerCase()]?.[0];

const sentences = (text: string): string[] =>
  text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);

export interface Clue {
  /** a sentence from the lesson with the word blanked */
  sentence?: string;
  meaning?: string;
}

/** The clue is made by code: a lesson sentence with the word blanked, and the book's meaning where it has one. */
export function buildClue(w: QuestWord, texts: { paragraphs: string[] }[]): Clue {
  const re = new RegExp(`\\b${w.word}\\b`, 'i');
  const hits: string[] = [];
  for (const t of texts) for (const p of t.paragraphs) for (const s of sentences(p)) if (re.test(s)) hits.push(s);
  const good = hits.filter((s) => {
    const n = s.split(/\s+/).length;
    return n >= 4 && n <= 26;
  });
  const pick = (good.length ? good : hits).sort((a, b) => a.length - b.length)[0];
  return { sentence: pick ? pick.replace(new RegExp(`\\b${w.word}\\b`, 'ig'), '_____') : undefined, meaning: w.meaning };
}

/** The saved record for one kid and one lesson. */
export interface QuestRecord {
  id: string;
  kidId: string;
  lesson: number;
  level: QuestLevel;
  placed: boolean;
  stars: number;
  bestStreak: number;
  sessions: { date: string; level: QuestLevel; accuracy: number; speed: number; words: number; stars: number }[];
  words: Record<string, WordStat>;
}

export const questId = (kidId: string, lesson: number): string => `${kidId}_${lesson}`;
export const newRecord = (kidId: string, lesson: number): QuestRecord => ({ id: questId(kidId, lesson), kidId, lesson, level: 1, placed: false, stars: 0, bestStreak: 0, sessions: [], words: {} });

export function recordSession(rec: QuestRecord, level: QuestLevel, results: WordResult[], summary: SessionSummary, now: string, next: QuestLevel, placedNow = true): QuestRecord {
  const words = { ...rec.words };
  for (const r of results) {
    const s = words[r.word] ?? { seen: 0, clean: 0 };
    words[r.word] = { seen: s.seen + 1, clean: s.clean + (r.mistakes === 0 && !r.hinted ? 1 : 0) };
  }
  return {
    ...rec,
    level: next,
    placed: rec.placed || placedNow,
    stars: rec.stars + summary.stars,
    bestStreak: Math.max(rec.bestStreak, summary.bestStreak),
    sessions: [...rec.sessions, { date: now, level, accuracy: summary.accuracy, speed: summary.speed, words: summary.words, stars: summary.stars }].slice(-20),
    words,
  };
}

export const randomRng = (): Rng => createRng(`wq:${Date.now()}:${Math.random()}`);
