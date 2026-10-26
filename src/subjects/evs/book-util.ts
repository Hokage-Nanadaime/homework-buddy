import type { EvsEntry } from './types';

/** An entry without its id: chapter files write these and `finish` numbers them. */
export type Raw = EvsEntry extends infer E ? (E extends EvsEntry ? Omit<E, 'id'> : never) : never;

/** Numbers entries V01-Q001... (bank) or V01-B001... (the book's own exercises) in file order. One counter per call; give each file its own `start` (0, 1000, 2000...) so ids never collide across files. */
export const numberer = (chapter: number, series: 'Q' | 'B', start = 0) => {
  let n = start;
  return (rows: Raw[]): EvsEntry[] => rows.map((r) => ({ ...r, id: `V${String(chapter).padStart(2, '0')}-${series}${String(++n).padStart(3, '0')}` }) as EvsEntry);
};

export const tx = (page: number, quote: string) => ({ source: 'text' as const, page, quote });
export const ex = (page: number, quote: string) => ({ source: 'exercise' as const, page, quote });
export const sm = (page: number, quote: string) => ({ source: 'summary' as const, page, quote });

/** One exercise of the book: call the result for each printed item in order; it numbers the items and adds the book reference (level medium). */
export const exercise = (id: string, page: number, instruction?: string, start = 0) => {
  let n = start;
  return (part: string | undefined, e: Record<string, unknown>): Raw =>
    ({ ...e, level: 'medium', book: { exercise: id, page, n: ++n, ...(part ? { part } : {}), ...(instruction ? { instruction } : { noInstruction: true }) } }) as unknown as Raw;
};
