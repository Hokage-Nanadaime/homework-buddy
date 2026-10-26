import { blankShares, type Exam, type ExamHeader, type ExamResult, type KeyEntry, type MarksTableRow, type PaperQuestion, type PaperSection } from '../core/exam';
import { normaliseExamSeed } from '../core/examCode';
import { fmtMark } from '../core/markText';
import type { PaperForm } from '../core/paper';
import type { Input, Level, Passage, Question } from '../core/question';
import { createRng, type Rng } from '../core/rng';
import { mapQuestion } from '../subjects/evs/build';
import type { BankEntry, BankType } from '../subjects/english/types';
import { examKindsOf } from '../subjects/evs/examKinds';
import { PERIODIC, TERM, slotHalves, type PaperPattern, type Slot } from '../subjects/evs/examPatterns';
import type { EvsChapterData, EvsEntry, MapEntry } from '../subjects/evs/types';
import { answerText, LABELS, pickLevel, pointsFor, POINTS_AT_BOOK, stemOf, toPaperQuestion, type Cand } from './englishExam';

/**
 * EVS papers like the school's (docs/evs/EXAM_PATTERNS.md): the Periodic Test (25 marks) and the Term Exam (50 marks). The patterns are data
 * in src/subjects/evs/examPatterns.ts, in halves of a mark. The book's own exercise items are used first, then the written bank.
 */
export type EvsFormat = 'A' | 'B';

export const EVS_FORMATS: Record<EvsFormat, { pattern: PaperPattern; title: string; minutes: number; marks: number; examination: string; instructions: string[] }> = {
  A: { pattern: PERIODIC, title: 'Periodic Test', minutes: PERIODIC.minutes, marks: PERIODIC.marks, examination: 'Periodic Test - I', instructions: ['Answer every question.'] },
  B: { pattern: TERM, title: 'Term Exam', minutes: TERM.minutes, marks: TERM.marks, examination: 'Term Exam', instructions: ['Read the whole paper carefully.', 'Answer every question, in order.', 'Keep your writing neat and clear.'] },
};

// ---- codes: EV-A-0102-4F7K (format, the chapters chosen, seed) -----------------------------------------------------------------
export interface EvsSpec {
  format: EvsFormat;
  chapters: number[];
  seed: string;
}
const pad = (n: number): string => String(n).padStart(2, '0');
const clean = (u: number[]): number[] => [...new Set(u.filter((n) => Number.isInteger(n) && n >= 1 && n <= 99))].sort((a, b) => a - b);
export const makeEvsCode = (s: EvsSpec): string => `EV-${s.format}-${clean(s.chapters).map(pad).join('')}-${normaliseExamSeed(s.seed)}`;
export function parseEvsCode(raw: string): EvsSpec | undefined {
  const t = raw.toUpperCase().replace(/[\s\-_.]+/g, '');
  const m = /^EV([AB])((?:\d\d)+)([A-HJKMNP-Z2-9]{4})$/.exec(t);
  if (!m) return undefined;
  const chapters = clean(m[2]!.match(/\d\d/g)!.map(Number));
  return chapters.length ? { format: m[1] as EvsFormat, chapters, seed: m[3]! } : undefined;
}

// ---- pools --------------------------------------------------------------------------------------------------------------------
type EvsCand = { e: EvsEntry; t: BankType; lesson: EvsChapterData };

/** Which kinds of entry may fill an exam kind. */
const ALLOWED: Record<string, EvsEntry['kind'][]> = {
  mcq: ['mcq'],
  'true-false': ['tf'],
  match: ['match'],
  'one-word': ['blank'],
  'fill-blank': ['blank'],
  'another-word': ['blank'],
  short: ['short'],
  'list-n': ['short'],
  long: ['short'],
  opinion: ['personal'],
  passage: ['mcq', 'tf', 'blank', 'short'],
  map: ['map'],
  gk: ['mcq', 'blank', 'short'],
};
const hasBlank = (e: EvsEntry): boolean => e.kind === 'blank' && e.stem.includes('__');

function buildPools(chapters: EvsChapterData[], chosen: number[]): Map<string, EvsCand[]> {
  const pools = new Map<string, EvsCand[]>();
  for (const ch of chapters) {
    if (!chosen.includes(ch.number)) continue;
    for (const e of ch.entries) {
      const t = ch.types.find((x) => x.id === e.type);
      if (!t) continue;
      for (const k of examKindsOf(e, t)) {
        if (ALLOWED[k] && !ALLOWED[k]!.includes(e.kind)) continue;
        if (k === 'fill-blank' && !hasBlank(e)) continue;
        if (k !== 'passage' && !e.text && e.kind !== 'map' && POINTS_AT_BOOK.test(e.kind === 'tf' ? e.statement : stemOf(e as BankEntry))) continue;
        (pools.get(k) ?? pools.set(k, []).get(k)!).push({ e, t, lesson: ch });
      }
    }
  }
  return pools;
}

const KIND_WORDS: Record<string, string> = {
  mcq: 'tick-the-answer questions',
  'true-false': 'true or false statements',
  match: 'match the following items',
  'one-word': 'one-word questions',
  'fill-blank': 'fill-in-the-blank items',
  'another-word': 'write-another-word items',
  short: 'short questions',
  'list-n': 'list-three questions',
  long: 'long questions',
  opinion: 'value-based questions',
  passage: 'passage questions',
  map: 'map items',
  gk: 'general knowledge questions',
};

// ---- building ----------------------------------------------------------------------------------------------------------------
const pc = (n: number): string => fmtMark(n);

interface Built {
  questions: PaperQuestion[];
  passage?: Passage;
  missing?: string;
}

export interface EvsConfig {
  format: EvsFormat;
  chapters: number[];
  seed: string | number;
  header?: Partial<Pick<ExamHeader, 'examination' | 'session' | 'school' | 'className' | 'subject'>>;
}

export function buildEvsExam(config: EvsConfig, all: EvsChapterData[]): ExamResult {
  const fmt = EVS_FORMATS[config.format];
  if (!fmt) return { ok: false, message: 'Choose Periodic Test or Term Exam.' };
  const chosen = clean(config.chapters).filter((n) => all.some((c) => c.number === n));
  if (chosen.length === 0) return { ok: false, message: 'Choose at least one chapter for this paper.' };
  const seed = normaliseExamSeed(config.seed);
  const code = makeEvsCode({ format: config.format, chapters: chosen, seed });
  const r = createRng(`evs-exam:${config.format}:${chosen.join(',')}:${seed}`);
  const pools = buildPools(all, chosen);
  const used = new Set<string>();
  const missing: string[] = [];

  /** One entry of this kind: the book's own exercise items first, then the bank. */
  const take = (kind: string, only?: (c: EvsCand) => boolean): EvsCand | undefined => {
    const free = (pools.get(kind) ?? []).filter((c) => !used.has(c.e.id) && (!only || only(c)));
    if (free.length === 0) return undefined;
    const fromBook = free.filter((c) => c.t.book);
    let set = fromBook.length > 0 ? fromBook : free;
    // a true one-word question ("Name one ...") before a sentence with a blank
    if (kind === 'one-word') {
      const plain = set.filter((c) => !hasBlank(c.e));
      if (plain.length > 0) set = plain;
    }
    const level = pickLevel(r, [...new Set(set.map((c) => c.e.level))]);
    const atLevel = set.filter((c) => c.e.level === level);
    const pick = r.pick(atLevel.length ? atLevel : set);
    used.add(pick.e.id);
    return pick;
  };

  const FORM_MAP: PaperForm = 'short';
  const toQuestion = (c: EvsCand, kind: string, marks: number, id: string, label: string, lead?: string): PaperQuestion | undefined => {
    if (c.e.kind === 'map') {
      const base = mapQuestion(c.e as MapEntry);
      return { ...base, typeId: c.t.id, level: c.e.level, marks, id, label, form: FORM_MAP, unitNumber: c.lesson.number, ...(lead ? { lead } : {}) };
    }
    const pq = toPaperQuestion(c as unknown as Cand, kind, marks, id, label, r);
    return pq && lead ? { ...pq, lead } : pq;
  };

  /** A map question for `places` places: one entry of exactly that size, or several small ones joined into one question. */
  const takeMap = (places: number, marks: number, id: string, label: string, lead?: string): PaperQuestion | undefined => {
    const exact = take('map', (c) => (c.e as MapEntry).places.length === places);
    if (exact) return toQuestion(exact, 'map', marks, id, label, lead);
    const parts: EvsCand[] = [];
    let n = 0;
    while (n < places) {
      const c = take('map', (x) => (x.e as MapEntry).places.length <= places - n);
      if (!c) return undefined;
      parts.push(c);
      n += (c.e as MapEntry).places.length;
    }
    const qs = parts.map((c) => toQuestion(c, 'map', marks, id, label, lead)!);
    const inputs: Input[] = qs.flatMap((q, qi) => q.inputs.map((i) => ({ ...i, id: `p${qi}_${i.id}` })));
    const placesAll = qs.flatMap((q) => (q.facts.map as { places: string[] }).places);
    const tasks = new Set(qs.map((q) => (q.facts.map as { task: string }).task));
    return { ...qs[0]!, inputs, prompt: `On the political map of India, ${tasks.size === 1 && [...tasks][0] === 'label' ? 'label' : 'colour and label'} these places.`, steps: qs.flatMap((q) => q.steps), facts: { ...qs[0]!.facts, map: { task: tasks.size === 1 ? [...tasks][0] : 'colour and label', places: placesAll } } };
  };

  /** The questions of one slot (no parts, no alternatives). `ids` names them q3a, q3b ... */
  const fillSimple = (slot: Slot, base: string, startLabel: number, lead?: string, only?: (c: EvsCand) => boolean): Built => {
    const each = slot.eachHalves / 2;
    const out: PaperQuestion[] = [];
    if (slot.kind === 'match') {
      // the book's own items keep their pairs; a bank item with more pairs than the paper needs gives a seeded few of them
      const c = take('match', (x) => ((x.e as { pairs: unknown[] }).pairs.length === slot.count || (!x.t.book && (x.e as { pairs: unknown[] }).pairs.length > slot.count)) && (!only || only(x)));
      if (!c) return { questions: [], missing: 'match' };
      const me = c.e as { pairs: [string, string][] };
      if (me.pairs.length > slot.count) c.e = { ...(c.e as object), pairs: r.fork(`pairs:${c.e.id}`).shuffle(me.pairs).slice(0, slot.count) } as EvsEntry;
      const q = toQuestion(c, 'match', each * slot.count, `${base}${LABELS[startLabel]}`, LABELS[startLabel]!, lead);
      return q ? { questions: [q] } : { questions: [], missing: 'match' };
    }
    if (slot.kind === 'map') {
      const q = takeMap(slot.count, each * slot.count, `${base}${LABELS[startLabel]}`, LABELS[startLabel]!, lead);
      return q ? { questions: [q] } : { questions: [], missing: 'map' };
    }
    for (let i = 0; i < slot.count; i++) {
      const label = LABELS[startLabel + i]!;
      let q: PaperQuestion | undefined;
      for (let tries = 0; tries < 8 && !q; tries++) {
        const c = take(slot.kind, only);
        if (!c) break;
        q = toQuestion(c, slot.kind, each, `${base}${label}`, label, i === 0 ? lead : undefined);
      }
      if (!q) return { questions: out, missing: slot.kind };
      out.push(q);
    }
    return { questions: out };
  };

  const sections: PaperSection[] = [];
  let qNo = 0;
  for (const slot of fmt.pattern.slots) {
    qNo++;
    const base = `q${qNo}`;
    let built: Built = { questions: [] };
    let label = '';
    let eitherOr = false;
    let chooseBest: number | undefined;
    let passage: Passage | undefined;
    if (slot.or) {
      eitherOr = true;
      const alts = slot.or.map((alt, ai) => {
        const qs: PaperQuestion[] = [];
        let miss: string | undefined;
        alt.forEach((s, si) => {
          if (miss) return;
          const b = fillSimple(s, `${base}${ai === 0 ? 'e' : 'o'}${si}`, 0);
          if (b.missing) miss = b.missing;
          qs.push(...b.questions.map((q, k) => ({ ...q, alt: ai === 0 ? ('either' as const) : ('or' as const), lead: k === 0 && si === 0 && ai === 1 ? 'OR' : undefined, label: `${si + 1}` })));
        });
        return { qs, miss };
      });
      const miss = alts.find((a) => a.miss)?.miss;
      built = { questions: alts.flatMap((a) => a.qs), ...(miss ? { missing: miss } : {}) };
      label = `${alts[0]!.qs.map((q) => pc(q.marks)).join(' + ')}=${pc(slotHalves(slot) / 2)}`;
    } else if (slot.parts) {
      const qs: PaperQuestion[] = [];
      let miss: string | undefined;
      slot.parts.forEach((p, pi) => {
        if (miss) return;
        const b = fillSimple(p, `${base}p${pi}`, 0, p.title);
        if (b.missing) miss = b.missing;
        qs.push(...b.questions.map((q, k) => ({ ...q, label: `${LABELS[qs.length + k]}` })));
      });
      built = { questions: qs, ...(miss ? { missing: miss } : {}) };
      label = slot.parts.map((p) => pc(slotHalves(p) / 2)).join(' + ') + `=${pc(slotHalves(slot) / 2)}`;
    } else if (slot.kind === 'passage') {
      // three questions about one full text of the chosen chapters
      const ids = [...new Set((pools.get('passage') ?? []).filter((c) => !used.has(c.e.id) && c.e.text).map((c) => c.e.text!))];
      const ok = ids.filter((tid) => (pools.get('passage') ?? []).filter((c) => c.e.text === tid && !used.has(c.e.id)).length >= slot.count && all.some((ch) => ch.texts.some((t) => t.id === tid && t.stored === 'full' && !/^did you know/i.test(t.title))));
      if (ok.length === 0) built = { questions: [], missing: 'passage' };
      else {
        const tid = r.pick(ok);
        passage = all.flatMap((ch) => ch.texts).find((t) => t.id === tid);
        built = fillSimple(slot, base, 0, undefined, (c) => c.e.text === tid);
      }
      label = `${slot.count}x${pc(slot.eachHalves / 2)}=${pc(slotHalves(slot) / 2)}`;
    } else {
      built = fillSimple(slot, base, 0);
      if (slot.choose) {
        chooseBest = slot.choose.pick;
        label = `any ${slot.choose.pick}x${pc(slot.eachHalves / 2)}=${pc(slotHalves(slot) / 2)}`;
      } else if (slot.kind === 'match' || slot.kind === 'map') label = `${slot.count}x${pc(slot.eachHalves / 2)}=${pc(slotHalves(slot) / 2)}`;
      else label = `${slot.count}x${pc(slot.eachHalves / 2)}=${pc(slotHalves(slot) / 2)}`;
    }
    if (built.missing) {
      missing.push(built.missing);
      continue;
    }
    const total = slotHalves(slot) / 2;
    sections.push({
      number: qNo,
      title: slot.title,
      form: built.questions[0]?.form ?? 'short',
      instruction: eitherOr ? '' : slot.choose ? `Do any ${NUMBER_WORD[slot.choose.pick] ?? slot.choose.pick}.` : '',
      count: built.questions.length,
      marksEach: slot.eachHalves / 2,
      marks: total,
      marksLabel: label,
      questions: built.questions,
      ...(passage ? { passage } : {}),
      ...(chooseBest ? { chooseBest } : {}),
      ...(eitherOr ? { eitherOr: true } : {}),
    });
  }

  if (missing.length) {
    const kinds = [...new Set(missing)];
    const words = kinds.map((k) => KIND_WORDS[k] ?? k.replace(/-/g, ' '));
    // which chapters that are not chosen have what the paper lacks
    const offer = kinds.flatMap((k) => {
      const have = buildPools(all, all.map((c) => c.number).filter((n) => !chosen.includes(n))).get(k) ?? [];
      const byChapter = new Map<number, number>();
      for (const c of have) byChapter.set(c.lesson.number, (byChapter.get(c.lesson.number) ?? 0) + 1);
      return [...byChapter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([n]) => n);
    });
    const names = [...new Set(offer)].sort((a, b) => a - b).map((n) => `chapter ${n} (${all.find((c) => c.number === n)!.title})`);
    return { ok: false, message: `The chosen chapters do not have enough ${words.join(', ')} for the ${fmt.title}. ${names.length ? `Add ${names.join(' or ')}.` : 'Add more chapters.'}` };
  }
  const total = sections.reduce((m, s) => m + s.marks, 0);
  if (total !== fmt.marks) return { ok: false, message: `The paper adds up to ${fmtMark(total)} marks, not ${fmt.marks}. Please try New paper.` };

  const marksTable: MarksTableRow[] = sections.map((s) => ({ question: `Q${s.number}`, title: s.title, count: s.count, marksEach: s.marksEach, marks: s.marks, label: s.marksLabel }));
  const key: KeyEntry[] = sections.flatMap((s) =>
    s.questions.map((q) => ({
      id: q.id,
      number: `Q${s.number} ${q.label}`,
      form: q.form,
      marks: q.marks,
      unitNumber: q.unitNumber,
      prompt: q.prompt.replace(/\n/g, ' '),
      answers: answerText(q),
      steps: q.steps.slice(0, 3),
      markingPoints: pointsFor(q),
      ...(q.form === 'mcq' && q.correctOption !== undefined ? { correctLabel: ['i', 'ii', 'iii', 'iv', 'v'][q.correctOption] } : {}),
    })),
  );
  const header: ExamHeader = {
    examination: config.header?.examination || fmt.examination,
    session: config.header?.session || '2026-27',
    school: config.header?.school,
    className: config.header?.className || 'III',
    subject: config.header?.subject || 'EVS',
    minutes: fmt.minutes,
    totalMarks: fmt.marks,
    studentFields: ['Name', 'Roll no.'],
  };
  return {
    ok: true,
    exam: {
      code,
      format: config.format,
      formatTitle: fmt.title,
      header,
      instructions: fmt.instructions,
      minutes: fmt.minutes,
      totalMarks: fmt.marks,
      sections,
      key,
      marksTable,
      unitsUsed: chosen,
      unitsLeftOut: [],
      warnings: [],
      proposed: false,
      subject: 'evs',
    } as Exam,
  };
}

const NUMBER_WORD: Record<number, string> = { 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven' };

export function resolveEvsExamCode(raw: string, all: EvsChapterData[], header?: EvsConfig['header']): ExamResult | undefined {
  const spec = parseEvsCode(raw);
  if (!spec) return undefined;
  return buildEvsExam({ format: spec.format, chapters: spec.chapters, seed: spec.seed, header }, all);
}

export { blankShares };
export type { BankEntry, Level, Question, Rng };
