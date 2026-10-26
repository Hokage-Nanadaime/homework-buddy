import type { UnitDef } from '../../core/question';
import { bookById } from '../../core/books';
import { chapterToUnit } from './build';
import type { EvsChapterData } from './types';
import { sampleLessonN } from '../english/sample/lesson';

export const EVS_BOOK = 'EVS (sample)';

/** Public sample build: every EVS chapter is the same small original lesson (see src/subjects/SAMPLE_CONTENT.md). */
export const evsChapters: EvsChapterData[] = bookById('evs').chapters.map((c) => sampleLessonN(c.n, c.title));

export const evsContents: { number: number; title: string; printedPage: number }[] = evsChapters.map((c) => ({ number: c.number, title: c.title, printedPage: c.pages[0] }));

export const evsUnits: UnitDef[] = evsChapters.map(chapterToUnit);
