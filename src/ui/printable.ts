import type { Exam } from '../core/exam';
import { examKeyPageCount, examSheetsHtml, EXAM_PAGE_CSS, paginateExam } from '../core/examPrint';
import { keyPages, layoutDoc, PRINT_CSS, SHEET_CSS, sheetsHtml, standalonePage, type PrintDoc } from '../core/print';
import { buildExamPdf } from './examPdf';
import { buildPdf } from './pdf';

/** Anything the preview can show and save: a worksheet or a school-style exam paper. One preview screen serves both. */
export interface Printable {
  code?: string;
  /** Shown in "My printed papers". */
  title: string;
  slug: string;
  /** "10 questions" */
  summary: string;
  /** Heading and intro of the preview screen (defaults suit worksheets). */
  heading?: string;
  intro?: string;
  css: string;
  pages(withKey: boolean): { sheets: number; keySheets: number };
  html(withKey: boolean): string;
  pdf(withKey: boolean): Promise<Blob>;
  standalone(withKey: boolean, tokens: string): string;
}

export function docPrintable(doc: PrintDoc): Printable {
  return {
    code: doc.code,
    title: `${doc.title}${doc.subtitle ? `: ${doc.subtitle}` : ''}`,
    slug: doc.slug,
    summary: `${doc.items.length} question${doc.items.length === 1 ? '' : 's'}`,
    css: SHEET_CSS + PRINT_CSS,
    pages: (k) => ({ sheets: layoutDoc(doc).length, keySheets: k ? keyPages(doc).length : 0 }),
    html: (k) => sheetsHtml(doc, k),
    pdf: (k) => buildPdf(doc, k),
    standalone: (k, tokens) => standalonePage(doc.title, SHEET_CSS + PRINT_CSS, sheetsHtml(doc, k), tokens),
  };
}

export function examPrintable(exam: Exam): Printable {
  const n = exam.sections.reduce((m, s) => m + s.questions.length, 0);
  return {
    code: exam.code,
    title: `${exam.header.examination}, Class ${exam.header.className}, ${exam.totalMarks} marks`,
    slug: `${exam.subject ?? 'maths'}-${exam.code.toLowerCase()}`,
    summary: `${n} questions, ${exam.totalMarks} marks`,
    heading: 'Exam paper preview',
    intro: `To print, save as PDF and print the file. Every question is new and made from ${exam.subject === 'evs' ? `EVS chapters ${exam.unitsUsed.join(', ')}` : exam.subject === 'english' ? `the English ${[exam.unitsUsed.some((n) => n < 11) ? `Reader lessons ${exam.unitsUsed.filter((n) => n < 11).join(', ')}` : '', exam.unitsUsed.some((n) => n >= 11) ? `Practice Book sections ${exam.unitsUsed.filter((n) => n >= 11).map((n) => n - 10).join(', ')}` : ''].filter(Boolean).join(' and ')} you chose, with an unseen passage and writing tasks` : `${exam.unitsUsed.length === 1 ? 'unit' : 'units'} ${exam.unitsUsed.join(', ')} only`}. The same paper can be taken on screen with a timer, or on paper and entered afterwards.`,
    css: EXAM_PAGE_CSS,
    pages: (k) => ({ sheets: paginateExam(exam).length, keySheets: k ? examKeyPageCount(exam) : 0 }),
    html: (k) => examSheetsHtml(exam, k),
    pdf: (k) => buildExamPdf(exam, k),
    standalone: (k, tokens) => standalonePage(exam.header.examination, EXAM_PAGE_CSS, examSheetsHtml(exam, k), tokens),
  };
}
