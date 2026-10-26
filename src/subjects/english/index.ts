import type { UnitDef } from '../../core/question';
import { bookById } from '../../core/books';
import { lessonToUnit } from './build';
import { sampleLessonN } from './sample/lesson';

/** Public sample build: every Reader lesson is the same small original lesson (see src/subjects/SAMPLE_CONTENT.md). */
export const englishContents: { number: number; title: string; printedPage: number }[] = bookById('reader').chapters.map((c) => ({ number: c.n, title: c.title, printedPage: c.n }));

export const ENGLISH_BOOK = 'English Reader (sample)';

export const builtLessons: UnitDef[] = englishContents.map((c) => lessonToUnit(sampleLessonN(c.number, c.title)));
export { lessonToUnit };
