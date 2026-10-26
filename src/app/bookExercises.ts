import type { BookExercise, Question, UnitDef } from '../core/question';
import { MARKS } from '../core/question';
import { createRng } from '../core/rng';
import { entryToQuestion } from '../subjects/english/build';
import type { LessonData } from '../subjects/english/types';

/** The book's exercises of a bank in book order (printed page, then first appearance), items in the book's own order. */
export function bookExercisesOf(data: LessonData): BookExercise[] {
  const byId = new Map<string, { page: number; first: number; instruction?: string; items: LessonData['entries'] }>();
  data.entries.forEach((e, i) => {
    if (!e.book) return;
    const x = byId.get(e.book.exercise) ?? { page: e.book.page, first: i, instruction: e.book.instruction, items: [] };
    x.items.push(e);
    x.page = Math.min(x.page, e.book.page);
    x.instruction ??= e.book.instruction;
    byId.set(e.book.exercise, x);
  });
  return [...byId.entries()]
    .sort((a, b) => a[1].page - b[1].page || a[1].first - b[1].first)
    .map(([id, x], i) => ({
      key: String(i + 1).padStart(2, '0'),
      id,
      page: x.page,
      instruction: x.instruction,
      count: x.items.length,
      questions: (): Question[] =>
        [...x.items]
          .sort((a, b) => a.book!.n - b.book!.n)
          .map((e) => ({ ...entryToQuestion(e, createRng(`book:${e.id}`)), typeId: e.type, level: 'medium' as const, marks: MARKS.medium })),
    }));
}

/** The unit with its book exercises, and its book types marked so mixed practice leaves them out. */
export function withBook(unit: UnitDef, data: LessonData): UnitDef {
  const bookTypes = new Set(data.types.filter((t) => t.book).map((t) => t.id));
  return { ...unit, bookExercises: bookExercisesOf(data), types: unit.types.map((t) => (bookTypes.has(t.id) ? { ...t, book: true } : t)) };
}
