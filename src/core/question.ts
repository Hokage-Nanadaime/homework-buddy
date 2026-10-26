import type { Rng } from './rng';

export type Level = 'easy' | 'medium' | 'challenge';
export const LEVELS: readonly Level[] = ['easy', 'medium', 'challenge'];

/** Marks a question is worth in a unit test. */
export const MARKS: Record<Level, number> = { easy: 1, medium: 2, challenge: 3 };

/**
 * How a kid answers one blank.
 * number/words/text: typed. choice: tap one. multi: tap several. ordered: a list in order.
 * abacus: set bead counts per rod. open: free text, a grown-up checks it.
 * sentence: a written answer (English). `accepted[0]` is the model answer; the app may ask Claude to suggest marks, and the grown-up decides.
 */
export type InputMode = 'number' | 'words' | 'text' | 'choice' | 'multi' | 'ordered' | 'abacus' | 'open' | 'sentence';

export interface Input {
  id: string;
  /** Small label shown next to the blank, e.g. "thousands". */
  label?: string;
  mode: InputMode;
  /** Accepted answers. For multi/ordered/abacus: the items (in order for ordered/abacus). */
  accepted: string[];
  choices?: string[];
  /** Plain instruction shown under the box, e.g. "Write the answer as a number". Defaults come from the mode. */
  hint?: string;
  /**
   * What the book asks the kid to write. 'numeral' (digits) or 'words'; 'either' only where the book accepts both.
   * Default: 'numeral' for number inputs, 'words' for words inputs.
   */
  format?: 'numeral' | 'words' | 'either';
  /** English: marking compares capital letters too (for "correct the capitals" items). Text mode only. */
  caseSensitive?: boolean;
  /** Unit that may follow the number ("cm", "kg", "Rs"); the answer is right with or without it. */
  unit?: string;
}

/** Pictures are drawn by shared helpers from these small specs. */
export type DiagramSpec =
  | { kind: 'abacus'; rods: number[]; labels: string[]; blank?: boolean; alt: string }
  | { kind: 'circledNumber'; digits: string; indexes: number[]; alt: string }
  | { kind: 'columnSum'; op: '+' | '-' | '×' | '÷'; top: number[]; bottom: number[]; headers: string[]; carryRow?: boolean; alt: string }
  | { kind: 'html'; html: string; alt: string }
  | { kind: 'numberGrid'; numbers: string[]; columns: number; alt: string }
  | { kind: 'table'; head: string[]; rows: string[][]; alt: string };

export interface Question {
  typeId: string;
  level: Level;
  prompt: string;
  inputs: Input[];
  /** Worked solution, shown after answering. */
  steps: string[];
  marks: number;
  tags: string[];
  diagram?: DiagramSpec;
  /** English: id of the reading text (in `UnitDef.texts`) this question is about; shown beside the question. */
  passage?: string;
  /** English: this question is the book's own exercise item, word for word (exercise id as in the lesson inventory, printed page, item order). */
  book?: { exercise: string; page: number; n: number; part?: string; instruction?: string; noInstruction?: true };
  /** English: speaking, pair work, discussion or acting. Done with a grown-up and never scored. */
  together?: boolean;
  /**
   * True when the kid has to work in a notebook (columns, drawing, expanded form, steps) and types only the final answer.
   * The app shows one small consistent note for these; never write "use rough work" in the prompt itself.
   */
  notebook?: boolean;
  /** The raw numbers the question was built from; `solve` recomputes the answer from these. */
  facts: Record<string, unknown>;
}

export type Draft = Omit<Question, 'typeId' | 'level' | 'marks'>;
export type Generator = (rng: Rng) => Draft;

export interface QuestionType {
  id: string;
  title: string;
  /** Inventory ids (e.g. "U01-E09") this type covers. */
  inventory: string[];
  generate: Record<Level, Generator>;
  /**
   * Independent second method: re-derive the answer from `facts` by a different route than the
   * generator (inverse operation, brute force, etc). Returns a problem description, or null if it agrees.
   */
  verify: (q: Question) => string | null;
  /** Open-ended or spoken types are shown on practice sheets but never marked or put in tests. */
  autoMarked?: boolean;
  /** How many different questions each level can make (default 8). Lower only for tiny domains. */
  minDistinct?: number;
  /** The book's own exercise items: shown only in the lesson's "Book exercises" group, never in mixed practice. */
  book?: boolean;
}

/** A reading text of a lesson. `stored: 'summary'` texts are own-words summaries; the app says "Read this in your book, page N". */
export interface Passage {
  id: string;
  title: string;
  pages: [number, number];
  stored: 'full' | 'summary';
  /** Paragraphs (or poem stanzas, with line breaks as \n). */
  paragraphs: string[];
}

export type SubjectId = 'maths' | 'english' | 'evs';

/** One exercise of the book, as printed: its items in book order. */
export interface BookExercise {
  /** two-digit number in book order, used in worksheet codes (BX03) */
  key: string;
  /** the book's exercise id, e.g. "A.6" */
  id: string;
  page: number;
  instruction?: string;
  count: number;
  questions: () => Question[];
}

export interface UnitDef {
  /** The book's exercises in book order (English lessons and sections). */
  bookExercises?: BookExercise[];
  /** Defaults to maths. English lessons use 'english': worksheet codes start with E instead of M. */
  subject?: SubjectId;
  /** English: the lesson's reading texts. */
  texts?: Passage[];
  id: string; // "01"
  number: number;
  title: string;
  slug: string;
  printedPages: [number, number];
  types: QuestionType[];
}

export function isAutoMarked(t: QuestionType): boolean {
  return t.autoMarked !== false;
}
