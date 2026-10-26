import type { Passage } from '../core/question';
import { bookPages } from '../core/print';

interface Props {
  passage: Passage;
  /** heading level: h2 on the lesson page, h3 beside a question */
  level?: 2 | 3;
  /** beside a question: the text scrolls inside its own box */
  compact?: boolean;
  idPrefix: string;
  /** on the lesson page: folded, the title opens it */
  fold?: boolean;
}

/**
 * A reading text of a lesson. Full texts are shown as in the book (poems keep their lines). A text stored only as a summary
 * sends the kid to the book, with the app's short reminder folded away (it is not the book's words).
 */
/** A "Did you know?" box of the book: a small fact card, never a question and never scored. */
export const isDidYouKnow = (p: Pick<Passage, 'title'>): boolean => /^did you know\??$/i.test(p.title.trim());

export function PassageView({ passage, level = 2, compact, idPrefix, fold }: Props) {
  const H = level === 2 ? 'h2' : 'h3';
  const hid = `${idPrefix}-${passage.id}-h`;
  if (isDidYouKnow(passage)) {
    return (
      <aside class="dyk" aria-labelledby={hid}>
        <p class="dyk-head">
          <span class="dyk-mark" aria-hidden="true">?</span>
          <H id={hid}>Did you know?</H>
          <small>Book {bookPages(passage)}</small>
        </p>
        {passage.paragraphs.map((p, i) => (
          <p key={i} class="dyk-text">
            {p}
          </p>
        ))}
        <p class="dyk-note">Just for interest. It is not marked.</p>
      </aside>
    );
  }
  const head = (
    <div class="passage-head">
      <H id={hid}>{passage.title}</H>
      <small>
        Book {bookPages(passage)}
        {passage.stored === 'summary' ? ' · read it in your book' : ''}
      </small>
    </div>
  );
  if (fold) {
    return (
      <details class="card passage fold">
        <summary>{head}</summary>
        {body(passage, false)}
      </details>
    );
  }
  return (
    <section class={`card passage${compact ? ' compact' : ''}`} aria-labelledby={hid}>
      {head}
      {body(passage, Boolean(compact))}
    </section>
  );
}

function body(passage: Passage, compact: boolean) {
  return (
    <>
      {passage.stored === 'summary' ? (
        <>
          <p class="book-note">Read this in your book, page {passage.pages[0]}.</p>
          <details class="reminder">
            <summary>Short reminder (not the book's words)</summary>
            {passage.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </details>
        </>
      ) : (
        <div class="passage-text" tabIndex={compact ? 0 : undefined} role={compact ? 'region' : undefined} aria-label={compact ? `${passage.title}, the text` : undefined}>
          {passage.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}
    </>
  );
}
