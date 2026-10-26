import type { DiagramSpec, Level, Passage } from '../../core/question';

/** How an answer is marked: CODE by the app, SUGGESTED (Claude suggests, a grown-up decides), TOGETHER (never scored). */
export type Marking = 'code' | 'suggested' | 'together';

/**
 * Where an answer comes from. `quote` must appear in the lesson transcript (text, exercise or summary), which a test checks.
 * `book` is for answers the stored text cannot give: the question tells the kid to check the book page.
 */
export type Evidence = { source: 'text' | 'exercise' | 'summary'; page: number; quote: string } | { source: 'book'; page: number; note: string };

/** Marks an entry as the book's own exercise item, copied exactly as printed (wording, options, order). */
export interface BookRef {
  /** The exercise Id as in the lesson/section inventory (first table, Id column). */
  exercise: string;
  /** Printed page of the item. */
  page: number;
  /** Order of the item inside the exercise (1, 2, 3 ...), the way the book prints them. */
  n: number;
  /** The item label as printed, e.g. "(i)" or "(b)". */
  part?: string;
  /** The exercise instruction exactly as printed, shown above the items. */
  instruction?: string;
  /** True only where the book prints no instruction at all (not even on the parent exercise). */
  noInstruction?: true;
}

interface Base {
  /** Unique, e.g. "E01-Q014". */
  id: string;
  /** The bank type (see `BankType`), e.g. "E01-T04". */
  type: string;
  level: Level;
  /** Id of the reading text this question is about (shown beside it). */
  text?: string;
  evidence: Evidence;
  /** The book's own item (see BookRef). Such entries use level 'medium' and keep the book's wording and option order. */
  book?: BookRef;
  /** Exam kinds this one question can fill, besides its type's `exam` tags. */
  exam?: string[];
  /** Short explanation shown after answering. Defaults to the evidence. */
  steps?: string[];
  tags?: string[];
  diagram?: DiagramSpec;
}

/** Choose one: the app shuffles `options`. 3 or 4 options. */
export interface McqEntry extends Base { kind: 'mcq'; stem: string; options: string[]; answer: string }
/** True or false about the text. */
export interface TfEntry extends Base { kind: 'tf'; statement: string; answer: boolean }
/** Fill the blank (stem has `____`). `answer` lists every accepted spelling. `box` is a word box shown with the question. */
export interface BlankEntry extends Base { kind: 'blank'; stem: string; answer: string[]; box?: string[] }
/** Rearrange jumbled letters; the app scrambles `word` (seeded). `clue` is optional. */
export interface JumbleEntry extends Base { kind: 'jumble'; word: string; clue?: string; /** Book items: the scrambled letters exactly as printed. */ printed?: string }
/** Match each left item with its right item; one choice per left item. 3 to 8 pairs. */
export interface MatchEntry extends Base { kind: 'match'; stem: string; pairs: [string, string][]; /** Book items: the right-hand column in the printed order. */ shown?: string[] }
/** Put items in order; `items` is the correct order, the app shuffles and numbers them. */
export interface OrderEntry extends Base { kind: 'order'; stem: string; items: string[]; /** Book items: the items in the printed (jumbled) order. */ shown?: string[] }
/** Tap every right choice. */
export interface MultiEntry extends Base { kind: 'multi'; stem: string; options: string[]; answers: string[] }
/** A written answer: `model` is the model answer; `keywords` are ideas a good answer has (used for the suggested mark). */
export interface ShortEntry extends Base {
  kind: 'short';
  stem: string;
  model: string;
  keywords?: string[];
  /** Writing tasks: what earns marks, e.g. ['content', 'sentences', 'spelling', 'format']; shown to the marker (Claude and the grown-up). */
  rubric?: string[];
}
/** Tap the words that fit (the exam's "underline" or "circle the ..." items). `targets` are words of `sentence`. */
export interface TapWordsEntry extends Base { kind: 'tapwords'; stem: string; sentence: string; targets: string[] }
/** Cross the odd one out: 4 or 5 `options`, one `answer`. */
export interface OddOneEntry extends Base { kind: 'oddone'; stem: string; options: string[]; answer: string }
/** Correct the mistake (for example missing capital letters). `wrong` is shown; every spelling in `answer` is accepted, capital letters count. */
export interface CorrectEntry extends Base { kind: 'correct'; stem: string; wrong: string; answer: string[] }
/** Write `count` words; any word from `pool` is accepted in each box (for example "two describing words for bag"). */
export interface WordsEntry extends Base { kind: 'words'; stem: string; count: number; pool: string[] }
/** The child's own answer (favourite festival, where I live): never auto-marked; a grown-up ticks it. `examples` help the grown-up. */
export interface PersonalEntry extends Base { kind: 'personal'; stem: string; examples?: string[] }
/** Speaking, pair work, discussion, acting, making: shown as "do together", never scored. */
export interface TogetherEntry extends Base { kind: 'together'; stem: string }

export type BankEntry = McqEntry | TfEntry | BlankEntry | JumbleEntry | MatchEntry | OrderEntry | MultiEntry | ShortEntry | TapWordsEntry | OddOneEntry | CorrectEntry | WordsEntry | PersonalEntry | TogetherEntry;
export type EntryKind = BankEntry['kind'];

/** One question type of a lesson: "a thing a kid must be able to do". Every type needs Easy, Medium and Challenge entries. */
export interface BankType {
  /** "E01-T04": lesson number then type number (the app reads the topic number after "-T"). */
  id: string;
  title: string;
  /** Inventory ids (the Id column of inventory.md) this type covers. */
  inventory: string[];
  marking: Marking;
  /** Only for generic, grammar-style items that serve several lessons later. */
  tags?: string[];
  /** Exam question kind this type feeds (see docs/english/EXAM_TAGS.md), e.g. 'true-false', 'opposites'. */
  exam?: string[];
  /** True for the types that hold the book's own exercise items (always level 'medium'; Easy and Challenge show the same items). */
  book?: boolean;
}

export interface VocabItem { word: string; meaning?: string }

export interface LessonData {
  number: number;
  slug: string;
  title: string;
  pages: [number, number];
  /** Reading texts: full text, or an own-words summary where the book's text could not be copied. */
  texts: Passage[];
  vocabulary: VocabItem[];
  types: BankType[];
  entries: BankEntry[];
  /** Smallest number of questions per level (default 20). Small Practice Book sections may use fewer. */
  minPerLevel?: number;
  /** Inventory exercise Id -> why it has no book-exercise entry (reading only, rule box, picture, draw, pair work...). Every inventory Id needs a book entry or a note. */
  bookNotes?: Record<string, string>;
}
