import type { UnitDef } from '../../core/question';
import { bookById } from '../../core/books';
import { sampleUnit } from './sample/unit';

/**
 * Public sample build: the book content is private, so this tree ships one small original unit repeated for every chapter (see src/subjects/SAMPLE_CONTENT.md).
 * The real file lists every unit of the book.
 */
export const contents: { number: number; title: string; printedPage: number }[] = bookById('maths').chapters.map((c) => ({ number: c.n, title: c.title, printedPage: c.n }));

export const builtUnits: UnitDef[] = contents.map((c) => sampleUnit(c.number, c.title));
