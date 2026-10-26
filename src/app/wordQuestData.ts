import type { VocabItem } from '../subjects/english/types';
import { sampleLessonN } from '../subjects/english/sample/lesson';
import { bookById } from '../core/books';
import type { Passage } from '../core/question';
import { cleanWords, type QuestWord } from '../core/wordquest';

export interface QuestLesson {
  number: number;
  words: QuestWord[];
  texts: Passage[];
}

const RAW: { number: number; vocabulary: VocabItem[]; texts: Passage[] }[] = bookById('reader').chapters.map((c) => sampleLessonN(c.n, c.title));

/** Each lesson's typing words (cleaned from its vocabulary) and its reading texts, for the clues. */
export function questLesson(number: number): QuestLesson {
  const r = RAW.find((x) => x.number === number);
  return { number, words: r ? cleanWords(r.vocabulary) : [], texts: r?.texts ?? [] };
}
