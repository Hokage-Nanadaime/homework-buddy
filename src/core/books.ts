import type { Level } from './question';

/**
 * The book registry: the single source of truth for which books exist, how many chapters each has and what they are called.
 * Everything that used to be a hard-coded "27 chapters", "49 stamps" or "units 11 to 21" is computed from this list
 * (docs/design/REWARDS_MULTI_BOOK.md, docs/BOOK_PIPELINE.md). To add a book, add one entry here and its units; nothing else is hard-coded.
 * Book ids stay as they are in saved data: "maths", "reader", "practice".
 */
export type BookKey = string;
export type SubjectKey = 'maths' | 'english' | 'evs';

export interface Friend {
  name: string;
  species: string;
  glyph: string;
}
export interface ChapterDef {
  /** the number the book shows */
  n: number;
  /** the title the book gives the chapter (the stamp words use it) */
  title: string;
  /** Pip points this chapter is worth (default 1) */
  weight?: number;
  /** the friend stamp of the chapter */
  friend: Friend;
}
export interface BookDef {
  id: BookKey;
  subject: SubjectKey;
  /** the school class the book is for */
  classLevel: number;
  /** the name in lists and the heat map: Maths, English Reader */
  title: string;
  /** a short name for lists: Maths, Reader, Practice Book */
  shortTitle: string;
  /** what the book calls a chapter: Unit, Lesson, Section */
  word: string;
  /** the same, as stamp words: "Reader lesson" */
  stampWord: string;
  /** all chapters together, as stamp words: "Reader lessons" */
  plural: string;
  /** theme colour: blue for Maths, orange for English, always with a text label */
  accent: SubjectKey;
  /** whether the book has Easy / Medium / Challenge */
  levels: Level[];
  /** unit number inside the app = chapter number + this (Practice Book sections are units 11 to 21) */
  unitOffset: number;
  /** stamp id prefix of the chapter friends: mf4, rf2, pf5 */
  friendPrefix: string;
  /** the exam portion that takes all of the book; {n} is the chapter count */
  portionTitle: string;
  /** an extra short portion with the first few chapters (Maths units 1 to 5) */
  firstFew?: { count: number; title: string };
  /** the friends stamp set in the album */
  stampSet: { name: string; border: string; fill: string; blurb: string };
  /** the golden stamp for finishing every chapter */
  finisher: Friend & { id: string };
  chapters: ChapterDef[];
}

const ALL_LEVELS: Level[] = ['easy', 'medium', 'challenge'];

export const BOOKS: BookDef[] = [
  {
    id: 'maths',
    subject: 'maths',
    classLevel: 3,
    title: 'Maths',
    shortTitle: 'Maths',
    word: 'Unit',
    stampWord: 'Unit',
    plural: 'Maths units',
    accent: 'maths',
    levels: ALL_LEVELS,
    unitOffset: 0,
    friendPrefix: 'mf',
    portionTitle: 'All {n} Maths units',
    firstFew: { count: 5, title: 'Maths units 1 to 5' },
    stampSet: { name: 'Maths friends', border: 'scallop', fill: 'sk1', blurb: 'One friend for each Maths unit. Finish the unit to meet them.' },
    finisher: { id: 'b_maths', name: 'Maths Master Bear', species: 'bear', glyph: 'book12' },
    chapters: [
      { n: 1, title: 'Maths unit 1', friend: { name: 'Big Number Bear', species: 'bear', glyph: 'num9' } },
      { n: 2, title: 'Maths unit 2', friend: { name: 'Plus Panda', species: 'panda', glyph: 'plus' } },
      { n: 3, title: 'Maths unit 3', friend: { name: 'Minus Mouse', species: 'mouse', glyph: 'minus' } },
      { n: 4, title: 'Maths unit 4', friend: { name: 'Times Turtle', species: 'turtle', glyph: 'times' } },
      { n: 5, title: 'Maths unit 5', friend: { name: 'Divide Duck', species: 'duck', glyph: 'divide' } },
      { n: 6, title: 'Maths unit 6', friend: { name: 'Tick-Tock Owl', species: 'owl', glyph: 'clock' } },
      { n: 7, title: 'Maths unit 7', friend: { name: 'Rupee Rabbit', species: 'rabbit', glyph: 'rupee' } },
      { n: 8, title: 'Maths unit 8', friend: { name: 'Long Giraffe', species: 'giraffe', glyph: 'ruler' } },
      { n: 9, title: 'Maths unit 9', friend: { name: 'Heavy Hippo', species: 'hippo', glyph: 'scale' } },
      { n: 10, title: 'Maths unit 10', friend: { name: 'Pour Penguin', species: 'penguin', glyph: 'jug' } },
      { n: 11, title: 'Maths unit 11', friend: { name: 'Slice Fox', species: 'fox', glyph: 'pie' } },
      { n: 12, title: 'Maths unit 12', friend: { name: 'Shape Tiger', species: 'tiger', glyph: 'triangle' } },
    ],
  },
  {
    id: 'reader',
    subject: 'english',
    classLevel: 3,
    title: 'English Reader',
    shortTitle: 'Reader',
    word: 'Lesson',
    stampWord: 'Reader lesson',
    plural: 'Reader lessons',
    accent: 'english',
    levels: ALL_LEVELS,
    unitOffset: 0,
    friendPrefix: 'rf',
    portionTitle: 'English Reader lessons 1 to {n}',
    stampSet: { name: 'Reader friends', border: 'squircle', fill: 'sk2', blurb: 'One friend for each English Reader lesson.' },
    finisher: { id: 'b_reader', name: 'Reader Master Elephant', species: 'elephant', glyph: 'bookR' },
    chapters: [
      { n: 1, title: 'English Reader lesson 1', friend: { name: 'Zoo Elephant', species: 'elephant', glyph: 'paw' } },
      { n: 2, title: 'English Reader lesson 2', friend: { name: 'Leafy Koala', species: 'koala', glyph: 'leaf' } },
      { n: 3, title: 'English Reader lesson 3', friend: { name: 'Kind Cat', species: 'cat', glyph: 'heart' } },
      { n: 4, title: 'English Reader lesson 4', friend: { name: 'Brave Dragon', species: 'dragon', glyph: 'star' } },
    ],
  },
  {
    id: 'practice',
    subject: 'english',
    classLevel: 3,
    title: 'English Practice Book',
    shortTitle: 'Practice Book',
    word: 'Section',
    stampWord: 'Practice Book section',
    plural: 'Practice Book sections',
    accent: 'english',
    levels: ALL_LEVELS,
    unitOffset: 10,
    friendPrefix: 'pf',
    portionTitle: 'English Practice Book sections 1 to {n}',
    stampSet: { name: 'Practice Book friends', border: 'hex', fill: 'sk3', blurb: 'One friend for each Practice Book section.' },
    finisher: { id: 'b_practice', name: 'Practice Master Frog', species: 'frog', glyph: 'bookP' },
    chapters: [
      { n: 1, title: 'English Practice Book section 1', friend: { name: 'Noun Frog', species: 'frog', glyph: 'tagN' } },
      { n: 2, title: 'English Practice Book section 2', friend: { name: 'Swap Monkey', species: 'monkey', glyph: 'swap' } },
      { n: 3, title: 'English Practice Book section 3', friend: { name: 'Tally Cow', species: 'cow', glyph: 'n123' } },
      { n: 4, title: 'English Practice Book section 4', friend: { name: 'Bright Lion', species: 'lion', glyph: 'sparkle' } },
      { n: 5, title: 'English Practice Book section 5', friend: { name: 'Busy Bee', species: 'bee', glyph: 'run' } },
      { n: 6, title: 'English Practice Book section 6', friend: { name: 'Over Pig', species: 'pig', glyph: 'over' } },
      { n: 7, title: 'English Practice Book section 7', friend: { name: 'Article Snail', species: 'snail', glyph: 'letterA' } },
      { n: 8, title: 'English Practice Book section 8', friend: { name: 'Full Stop Dog', species: 'dog', glyph: 'fullstop' } },
      { n: 9, title: 'English Practice Book section 9', friend: { name: 'Split Robot', species: 'robot', glyph: 'split' } },
      { n: 10, title: 'English Practice Book section 10', friend: { name: 'Story Sheep', species: 'sheep', glyph: 'openbook' } },
      { n: 11, title: 'English Practice Book section 11', friend: { name: 'Pen Seal', species: 'seal', glyph: 'pencil' } },
    ],
  },
  {
    id: 'evs',
    subject: 'evs',
    classLevel: 3,
    title: 'EVS: We and Our World',
    shortTitle: 'EVS',
    word: 'Chapter',
    stampWord: 'EVS chapter',
    plural: 'EVS chapters',
    accent: 'evs',
    levels: ALL_LEVELS,
    unitOffset: 0,
    friendPrefix: 'ef',
    portionTitle: 'EVS chapters 1 to {n}',
    stampSet: { name: 'EVS friends', border: 'pebble', fill: 'sk4', blurb: 'One friend for each EVS chapter.' },
    finisher: { id: 'b_evs', name: 'EVS Master Owl', species: 'owl', glyph: 'openbook' },
    chapters: [
      { n: 1, title: 'EVS: We and Our World chapter 1', friend: { name: 'Family Duck', species: 'duck', glyph: 'heart' } },
      { n: 2, title: 'EVS: We and Our World chapter 2', friend: { name: 'Twin Koala', species: 'koala', glyph: 'swap' } },
      { n: 3, title: 'EVS: We and Our World chapter 3', friend: { name: 'Dairy Cow', species: 'cow', glyph: 'pie' } },
      { n: 4, title: 'EVS: We and Our World chapter 4', friend: { name: 'Woolly Sheep', species: 'sheep', glyph: 'sheet' } },
      { n: 5, title: 'EVS: We and Our World chapter 5', friend: { name: 'Cave Bear', species: 'bear', glyph: 'paw' } },
      { n: 6, title: 'EVS: We and Our World chapter 6', friend: { name: 'Helper Dog', species: 'dog', glyph: 'run' } },
      { n: 7, title: 'EVS: We and Our World chapter 7', friend: { name: 'Believer Lion', species: 'lion', glyph: 'crown' } },
      { n: 8, title: 'EVS: We and Our World chapter 8', friend: { name: 'Play Monkey', species: 'monkey', glyph: 'star' } },
      { n: 9, title: 'EVS: We and Our World chapter 9', friend: { name: 'Home Snail', species: 'snail', glyph: 'house' } },
      { n: 10, title: 'EVS: We and Our World chapter 10', friend: { name: 'Tidy Rabbit', species: 'rabbit', glyph: 'leaf' } },
      { n: 11, title: 'EVS: We and Our World chapter 11', friend: { name: 'Compass Fox', species: 'fox', glyph: 'sun' } },
      { n: 12, title: 'EVS: We and Our World chapter 12', friend: { name: 'Zoom Tiger', species: 'tiger', glyph: 'speed' } },
      { n: 13, title: 'EVS: We and Our World chapter 13', friend: { name: 'Message Penguin', species: 'penguin', glyph: 'loop' } },
      { n: 14, title: 'EVS: We and Our World chapter 14', friend: { name: 'Flag Elephant', species: 'elephant', glyph: 'flag' } },
    ],
  },
];

export const bookById = (id: BookKey): BookDef => BOOKS.find((b) => b.id === id) ?? BOOKS[0]!;
/** The finisher id, friend ids and set ids all come from the book: mf4, rf2, pf5. */
export const friendId = (book: BookKey, n: number): string => `${bookById(book).friendPrefix}${n}`;
