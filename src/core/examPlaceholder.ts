import type { PrintDoc } from './print';

/** Exams print through their own school-style pages; this keeps the shared sheet type satisfied. */
export const examPrintPlaceholder: PrintDoc = { kicker: '', title: '', items: [], totalMarks: 0, slug: 'exam' };
