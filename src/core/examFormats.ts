import type { Level } from './question';
import type { PaperForm } from './paper';
import { FORM_TITLES } from './paper';

export type ExamFormatId = 'A' | 'B' | 'U';

export interface ExamSection {
  title: string;
  /** The main paper form of the section. */
  form: PaperForm;
  /** Other forms a question may take here (mixed sections such as "quick answers"). */
  alsoForms?: PaperForm[];
  count: number;
  marksEach: number;
  /** The line printed under the section title. */
  instruction: string;
  /** Overrides the difficulty mix for this section (weights). */
  levels?: Partial<Record<Level, number>>;
}

export interface ExamFormat {
  id: ExamFormatId;
  title: string;
  minutes: number;
  totalMarks: number;
  defaultExamination: string;
  sections: ExamSection[];
}

export const GENERAL_INSTRUCTIONS = ['Attempt all the questions.', 'Read all the questions carefully.', 'Write your answers neatly and clearly.'];

const sec = (form: PaperForm, count: number, marksEach: number, instruction: string, extra: Partial<ExamSection> = {}): ExamSection => ({ title: FORM_TITLES[form], form, count, marksEach, instruction, ...extra });

const total = (s: ExamSection[]): number => s.reduce((m, x) => m + x.count * x.marksEach, 0);

const A_SECTIONS: ExamSection[] = [
  sec('mcq', 3, 1, 'Tick the correct option.'),
  sec('oneword', 2, 1, 'Answer in one word or number.'),
  sec('short', 3, 2, 'Answer the following.'),
  sec('long', 3, 3, 'Answer the following. Show your working.'),
  sec('blank', 5, 1, 'Fill in the blanks.'),
];

/** The school Periodic Test pattern (Class III): 25 marks, 60 minutes. */
export const FORMAT_A: ExamFormat = { id: 'A', title: 'Periodic Test', minutes: 60, totalMarks: total(A_SECTIONS), defaultExamination: 'Periodic Test-I', sections: A_SECTIONS };

const B_SECTIONS: ExamSection[] = [
  sec('mcq', 6, 1, 'Tick the correct option.'),
  sec('blank', 8, 1, 'Fill in the blanks.'),
  sec('oneword', 6, 1, 'Answer in one word or number.'),
  sec('short', 5, 2, 'Answer the following.'),
  sec('long', 4, 3, 'Answer the following. Show your working.'),
  sec('word', 2, 4, 'Solve the word problems. Show your working.'),
];

/** The Term Exam pattern (confirmed): 50 marks, 150 minutes. */
export const FORMAT_B: ExamFormat = { id: 'B', title: 'Term Exam', minutes: 150, totalMarks: total(B_SECTIONS), defaultExamination: 'Term Exam', sections: B_SECTIONS };

const U_SECTIONS: ExamSection[] = [
  { title: 'Section A: quick answers (1 mark each)', form: 'oneword', alsoForms: ['mcq', 'blank'], count: 6, marksEach: 1, instruction: 'Write only the answer.', levels: { easy: 1 } },
  { title: 'Section B: show your working (2 marks each)', form: 'short', count: 4, marksEach: 2, instruction: 'Show your working.', levels: { medium: 1 } },
  { title: 'Section C: think harder (3 marks each)', form: 'long', count: 2, marksEach: 3, instruction: 'Show all your working.', levels: { challenge: 1 } },
];

/** The per-unit test (one chapter chosen): 20 marks, 30 minutes, same shape as the original unit test. */
export const FORMAT_U: ExamFormat = { id: 'U', title: 'Unit test', minutes: 30, totalMarks: total(U_SECTIONS), defaultExamination: 'Unit test', sections: U_SECTIONS };

export const EXAM_FORMATS: Record<ExamFormatId, ExamFormat> = { A: FORMAT_A, B: FORMAT_B, U: FORMAT_U };
export const EXAM_FORMAT_LIST: ExamFormat[] = [FORMAT_A, FORMAT_B, FORMAT_U];
