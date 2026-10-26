import { checkInputDetailed } from './checker';
import { blankShares, flatPaperQuestions, type Exam, type PaperQuestion } from './exam';
import { OPTION_LABELS } from './mcq';
import type { Values } from './practice';

export type QuestionStatus = 'right' | 'partial' | 'wrong' | 'blank';

export interface QuestionMark {
  id: string;
  section: number;
  marks: number;
  awarded: number;
  status: QuestionStatus;
  /** One entry per blank: true right, false wrong. */
  perInput: boolean[];
  /** Friendly checker messages (right number, wrong form). */
  messages: string[];
  /** "Answer any two": false when this answer is not one of the best ones that count. */
  counted?: boolean;
}

export interface ExamScore {
  perQuestion: QuestionMark[];
  perSection: { number: number; title: string; awarded: number; marks: number }[];
  total: number;
  outOf: number;
  percent: number;
  /** English: questions waiting for a grown-up's mark (written answers, personal answers). */
  pending?: string[];
}

/** An MCQ answer may be tapped option text or the label: "iii", "(iii)", "c" is not accepted. */
function mcqValue(q: PaperQuestion, given: string): string {
  const m = /^\(?\s*(iv|iii|ii|i)\s*\)?\.?$/i.exec(given.trim());
  if (!m || !q.options) return given;
  const idx = OPTION_LABELS.indexOf(m[1]!.toLowerCase() as (typeof OPTION_LABELS)[number]);
  return q.options[idx] ?? given;
}

/**
 * Marks the paper with the shared checker.
 * One blank (MCQ, one word, blank, or a single-answer short/long/word question): full marks if right, else none.
 * Several blanks: the question's marks are split over the blanks (see `blankShares`), so each right blank earns its part.
 * `manualMarks` lets a grown-up set the marks for a question (for example method marks on a wrong answer); it is clamped to 0..marks.
 */
export function markExam(exam: Exam, answers: Record<string, Values>, manualMarks: Record<string, number> = {}): ExamScore {
  const perQuestion: QuestionMark[] = [];
  for (const sec of exam.sections) {
    for (const q of sec.questions) {
      const values = answers[q.id] ?? {};
      const results = q.inputs.map((i) => checkInputDetailed(i, q.form === 'mcq' ? mcqValue(q, values[i.id] ?? '') : (values[i.id] ?? '')));
      const perInput = results.map((r) => r.ok === true);
      const blank = q.inputs.every((i) => (values[i.id] ?? '').trim() === '');
      let awarded: number;
      if (q.inputs.length === 1) awarded = perInput[0] ? q.marks : 0;
      else awarded = blankShares(q.marks, q.inputs.length).reduce((m, share, i) => m + (perInput[i] ? share : 0), 0);
      if (manualMarks[q.id] !== undefined) awarded = Math.min(q.marks, Math.max(0, manualMarks[q.id]!));
      const status: QuestionStatus = blank && awarded === 0 ? 'blank' : awarded >= q.marks ? 'right' : awarded > 0 ? 'partial' : 'wrong';
      perQuestion.push({ id: q.id, section: sec.number, marks: q.marks, awarded, status, perInput, messages: results.map((r) => r.message ?? '') });
    }
  }
  const perSection = exam.sections.map((s) => ({ number: s.number, title: s.title, marks: s.marks, awarded: perQuestion.filter((p) => p.section === s.number).reduce((m, p) => m + p.awarded, 0) }));
  const total = perQuestion.reduce((m, p) => m + p.awarded, 0);
  const outOf = exam.totalMarks;
  return { perQuestion, perSection, total, outOf, percent: outOf === 0 ? 0 : Math.round((total / outOf) * 100) };
}

export { flatPaperQuestions };


type Marker = (exam: Exam, answers: Record<string, Values>, manual?: Record<string, number>) => ExamScore;
let englishMarker: Marker | undefined;
/** The English marker lives with the English paper builder; the app hands it over once at start. */
export const registerEnglishMarker = (m: Marker): void => {
  englishMarker = m;
};

/** Marks a paper with the marker that belongs to its subject. */
export function scoreExam(exam: Exam, answers: Record<string, Values>, manual: Record<string, number> = {}): ExamScore {
  return (exam.subject === 'english' || exam.subject === 'evs') && englishMarker ? englishMarker(exam, answers, manual) : markExam(exam, answers, manual);
}
