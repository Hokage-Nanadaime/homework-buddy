import type { BookKey } from '../core/books';
import type { Firsts } from '../core/activity';
import { levelMarks, unitStatus, type Status } from '../core/bookStatus';
import type { SubjectId, UnitDef } from '../core/question';
import type { KidProgress } from '../core/progress';
import { Back } from './Back';
import { Marks, StatusWord } from './Marks';

export type BookId = BookKey | 'unseen' | 'exams';

export interface BookEntry {
  /** "Unit 3", "Lesson 2", "Section 5" */
  label: string;
  title: string;
  /** the page printed in the school book */
  page?: number;
  /** built units open; entries without a unit are "coming soon" unless `onOpen` is given */
  unit?: UnitDef;
  onOpen?(): void;
  sub?: string;
}

export interface BookDef {
  id: BookId;
  title: string;
  /** "12 units" */
  count: string;
  tone: SubjectId | 'exam';
  /** the word in "Open unit 3" */
  word: string;
  entries: BookEntry[];
}

/** Done, Reading and New counts of a book, from the child's own progress. */
export function bookCounts(book: BookDef, progress?: KidProgress, firsts?: Record<string, Firsts>): Record<Status, number> {
  const out: Record<Status, number> = { done: 0, reading: 0, new: 0 };
  for (const e of book.entries) if (e.unit) out[unitStatus(progress, firsts, e.unit)]++;
  return out;
}

interface Props {
  books: BookDef[];
  open: BookId;
  onOpenBook(id: BookId): void;
  onOpen(unit: UnitDef): void;
  onHome(): void;
  onPaper(): void;
  progress?: KidProgress;
  firsts?: Record<string, Firsts>;
}

/** The shelf of five books and the open book's printed-style contents page: dotted leaders, school-book page numbers, ink marks. */
export function BooksIndex({ books, open, onOpenBook, onOpen, onHome, onPaper, progress, firsts }: Props) {
  const book = books.find((b) => b.id === open) ?? books[0]!;
  const counts = bookCounts(book, progress, firsts);
  const subjectLine = book.tone === 'exam' ? 'Exam preparation' : book.tone === 'maths' ? 'Maths' : book.tone === 'evs' ? 'EVS' : 'English';
  return (
    <>
      <Back onClick={onHome}>Home</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <h1 class="page" tabIndex={-1} id="page-h">
          Your books
        </h1>
        <p class="lede">Pick a book from the shelf, then a chapter from its contents page.</p>
        <p>
          <button class="btn" onClick={onPaper}>
            Did a worksheet on paper? Enter your answers
          </button>
        </p>
      </header>
      <section class="card keyline" aria-label="What the marks mean">
        <span class="label">Key</span>
        <span class="marks"><i class="mk easy on" /> Easy</span>
        <span class="marks"><i class="mk medium on" /> Medium</span>
        <span class="marks"><i class="mk challenge on" /> Challenge</span>
        <span class="muted">Filled = done, empty = not yet.</span>
        <StatusWord status="done" />
        <StatusWord status="reading" />
        <StatusWord status="new" />
      </section>
      <div class="shelf" role="group" aria-label="Your books">
        {books.map((b) => (
          <button key={b.id} type="button" class={`spine tone-${b.tone}`} aria-pressed={b.id === open} onClick={() => onOpenBook(b.id)} aria-label={`${b.title}, ${b.count}${b.id === open ? ', open' : ''}`}>
            <b>{b.title}</b>
            <small>{b.count}</small>
          </button>
        ))}
      </div>
      <section class="contents" aria-labelledby="ct-h">
        <div class="ct-top">
          <span class="label">Homework Buddy · {subjectLine}</span>
          {book.entries.some((e) => e.unit) && (
            <span class="label">
              {counts.done} done · {counts.reading} reading · {counts.new} new
            </span>
          )}
        </div>
        <h2 id="ct-h">{book.id === 'exams' ? 'Exam preparation' : 'Contents'}</h2>
        {book.id !== 'exams' && book.id !== 'unseen' && <p class="muted small">Page numbers are the numbers printed in your school book.</p>}
        <ul class="crows">
          {book.entries.map((e) => {
            const body = (
              <>
                <span class="cl">{e.label}</span>
                <span class="ct">
                  {e.title}
                  {e.sub && <small>{e.sub}</small>}
                </span>
                <span class="leader" aria-hidden="true" />
                {e.page !== undefined && <span class="cp">p. {e.page}</span>}
                {e.unit ? (
                  <>
                    <Marks marks={levelMarks(progress, firsts, e.unit)} />
                    <StatusWord status={unitStatus(progress, firsts, e.unit)} />
                  </>
                ) : e.onOpen ? (
                  <span class="cgo">Open</span>
                ) : (
                  <span class="stw new">Coming soon</span>
                )}
              </>
            );
            const aria = `Open ${book.word} ${e.label.replace(/^\D+/, '')}, ${e.title}`.replace(/ ,/, ',');
            return (
              <li key={e.label + e.title}>
                {e.unit || e.onOpen ? (
                  <button type="button" class="crow" onClick={() => (e.unit ? onOpen(e.unit) : e.onOpen!())} aria-label={e.unit ? (book.id === 'unseen' ? 'Open the unseen passages' : aria) : `${e.title}${e.sub ? `, ${e.sub}` : ''}`}>
                    {body}
                  </button>
                ) : (
                  <div class="crow soon" role="group" aria-label={`${e.label}, ${e.title}, coming soon`}>
                    {body}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p class="ct-foot muted small">
          {book.title} · {book.count}
        </p>
      </section>
    </>
  );
}
