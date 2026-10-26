import { lessonToUnit } from '../subjects/english/build';
import { withBook } from './bookExercises';
import type { LessonData } from '../subjects/english/types';
import { sampleLessonN } from '../subjects/english/sample/lesson';
import { bookById } from '../core/books';

/** The data behind every English book, kept whole so the exam builder and the topic groups can read tags and exam kinds. */
export const READER_DATA: LessonData[] = bookById('reader').chapters.map((c) => sampleLessonN(c.n, c.title));
export const PRACTICE_DATA: LessonData[] = bookById('practice').chapters.map((c) => sampleLessonN(c.n + bookById('practice').unitOffset, c.title));
export const UNSEEN_DATA: LessonData = sampleLessonN(31, 'Sample passages');
export const ALL_ENGLISH_DATA: LessonData[] = [...READER_DATA, ...PRACTICE_DATA, UNSEEN_DATA];

/** The Practice Book's sections and the unseen passages as units, so worksheets, exams, print and memory treat them like lessons. */
export const practiceUnits = PRACTICE_DATA.map((d) => withBook(lessonToUnit(d), d));
export const unseenUnit = withBook(lessonToUnit(UNSEEN_DATA), UNSEEN_DATA);
/** The Reader's lessons as units, with their book exercises. */
export const readerUnits = READER_DATA.map((d) => withBook(lessonToUnit(d), d));
export const practiceContents = PRACTICE_DATA.map((l) => ({ number: l.number, title: l.title, printedPage: l.pages[0] }));
export const PRACTICE_BOOK = 'English Practice Book, Class III';

/** Type tags (grammar:verb ...) by type id, for grouping topics. */
export const typeTags: Record<string, string[]> = Object.fromEntries(ALL_ENGLISH_DATA.flatMap((l) => l.types.map((t) => [t.id, t.tags ?? []])));
