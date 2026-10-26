import type { Exam } from './exam';
import { resolveExamCode } from './exam';
import { parseExamCode } from './examCode';
import type { UnitDef } from './question';
import { resolveCode, subjectOf, type Resolved, type Worksheet } from './worksheet';
import { examPrintPlaceholder } from './examPlaceholder';

/** An exam as the same kind of sheet the paper-entry screen already knows. */
export function examWorksheet(exam: Exam, units: UnitDef[]): Worksheet {
  const unit = units.find((u) => subjectOf(u) === (exam.subject ?? 'maths') && u.number === exam.unitsUsed[0]) ?? units[0]!;
  return {
    code: exam.code,
    unit,
    title: `${exam.header.examination}, Class ${exam.header.className}`,
    kind: 'exam',
    sections: exam.sections.map((s) => ({ title: `Q${s.number}. ${s.title} (${s.marksLabel})`, questions: s.questions })),
    exam,
    doc: examPrintPlaceholder,
  };
}

type ExamResolver = (raw: string, header?: Parameters<typeof resolveExamCode>[2]) => ReturnType<typeof resolveExamCode> | undefined;
const extraResolvers: ExamResolver[] = [];
/** Other subjects' exam codes (English: EN-A-0111-4F7K) are added here by the app at start. */
export const registerExamResolver = (f: ExamResolver): void => {
  extraResolvers.push(f);
};

/** An exam from its code, whatever the subject. */
export function resolveExamAny(raw: string, units: UnitDef[], header?: Parameters<typeof resolveExamCode>[2]): ReturnType<typeof resolveExamCode> | undefined {
  if (parseExamCode(raw)) return resolveExamCode(raw, units.filter((u) => (u.subject ?? 'maths') === 'maths'), header);
  for (const f of extraResolvers) {
    const r = f(raw, header);
    if (r) return r;
  }
  return undefined;
}

/** Worksheet codes (M01-MED-4F7K) and exam codes (EX-A-0105-4F7K) both work. */
export function resolveAnyCode(raw: string, units: UnitDef[], header?: Parameters<typeof resolveExamCode>[2]): Resolved {
  const exam = resolveExamAny(raw, units, header);
  if (exam) return exam.ok ? { ok: true, sheet: examWorksheet(exam.exam, units) } : exam;
  return resolveCode(raw, units);
}
