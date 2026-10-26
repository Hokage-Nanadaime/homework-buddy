import type { LessonData, TogetherEntry, BankEntry } from '../english/types';

export type { BankType, BookRef, Evidence, Marking, VocabItem } from '../english/types';

/**
 * EVS reuses every English entry kind (mcq, tf, blank, match, short, personal, together...). One-word answers are `blank` entries
 * (every accepted word in `answer`), "list three" answers are `short` entries (`keywords` = the accepted ideas), "write another
 * word for" is a `blank`. Only the map question is new.
 */
export type EntryBase = Omit<TogetherEntry, 'kind' | 'stem'>;

/**
 * Map skill: the child labels or colours places on the empty outline map of India on paper; the grown-up marks each place Right
 * or Not yet in the app (never auto-marked). `places` are region names exactly as in `maps/regions.ts`.
 */
export interface MapEntry extends EntryBase {
  kind: 'map';
  stem: string;
  task: 'label' | 'colour' | 'colour and label';
  places: string[];
}

export type EvsEntry = BankEntry | MapEntry;

/** One chapter of the EVS book: the same data as an English lesson, plus map questions. Did You Know boxes are stored as texts (stored 'full'). */
export interface EvsChapterData extends Omit<LessonData, 'entries'> {
  entries: EvsEntry[];
}
