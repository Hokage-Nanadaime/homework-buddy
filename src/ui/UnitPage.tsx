import { useState } from 'preact/hooks';
import { isAutoMarked, LEVELS, type Level, type QuestionType, type UnitDef } from '../core/question';
import { DEFAULT_BLUEPRINT, blueprintMarks } from '../core/sheet';
import { cellKey, type KidProgress } from '../core/progress';
import { LEVEL_NAME } from '../core/docs';
import { subjectOf as subjectOfUnit, topicNumber, unitLabel, unitWord } from '../core/worksheet';
import { MILESTONES, reachedMilestone } from '../core/chapters';
import { Back } from './Back';
import { isDidYouKnow, PassageView } from './Passage';
import { groupTopics } from './topicGroups';
import { ConfirmNote } from './ConfirmNote';

interface Props {
  unit: UnitDef;
  progress?: KidProgress;
  onBack(): void;
  onPractice(type: QuestionType, level: Level): void;
  onMixed(level: Level, size: number): void;
  /** Left out where the subject has no test yet (English): the test card is not shown. */
  onTest?(): void;
  onPaper(): void;
  /** is there an unfinished set for this topic (undefined = mixed) and level? */
  hasSession(topic: string | undefined, level: Level, size: number): boolean;
  testSession: boolean;
  banners: ResumeBanner[];
  onClearAll(): void;
  /** topics passed at each level in this chapter, for the milestone ticks on the level buttons */
  levelCounts?: Record<Level, { passed: number; of: number }>;
  /** English: open the Word Quest typing game for this lesson. */
  onWordQuest?(): void;
  /** English: do the book's own exercise exactly as printed ('ALL' = the whole lesson in book order). */
  onBook?(key: string): void;
  onBookPrint?(key: string): void;
  /** English: which group a topic belongs to (its tags are known to the app). */
  groupOf?: (t: QuestionType) => import('./topicGroups').TopicGroupId;
}

export interface ResumeBanner {
  id: string;
  title: string;
  detail: string;
  onContinue(): void;
  /** asks first, in a dialog, and says what stays */
  onClear(): void;
}

function Banner({ b, compact }: { b: ResumeBanner; compact?: boolean }) {
  return (
    <section class="banner" aria-label="Continue where you left off">
      <div class="grow">
        {!compact && <b>Continue where you left off</b>}
        <span>{b.title} · {b.detail}</span>
      </div>
      <div class="actions">
        <button class="btn primary" onClick={b.onContinue}>Continue</button>
        <button class="btn" onClick={b.onClear} aria-label={`Clear this unfinished set: ${b.title}`}>Clear</button>
      </div>
    </section>
  );
}

/** The newest unfinished set is shown; the others wait behind one line. */
function Banners({ list, onClearAll }: { list: ResumeBanner[]; onClearAll(): void }) {
  if (list.length === 0) return null;
  const [first, ...more] = list;
  return (
    <div class="banner-stack">
      <Banner b={first!} />
      {more.length > 0 && (
        <details class="banner-more">
          <summary>{more.length} more unfinished {more.length === 1 ? 'set' : 'sets'}</summary>
          <div class="banner-stack">
            {more.map((b) => (
              <Banner key={b.id} b={b} compact />
            ))}
          </div>
        </details>
      )}
      {list.length > 1 && (
        <p>
          <button class="btn quiet" onClick={onClearAll}>
            Clear all unfinished sets
          </button>
        </p>
      )}
    </div>
  );
}

const LEVEL_HELP: Record<Level, string> = { easy: 'Simpler than the book', medium: 'Book level', challenge: 'Harder than the book' };

/** A unit (Maths) or lesson (English) page: practise everything mixed, one topic, the test, and for English the lesson's texts. */
export function UnitPage({ unit, progress, onBack, onPractice, onMixed, onTest, onPaper, hasSession, testSession, banners, onClearAll, levelCounts, onWordQuest, groupOf, onBook, onBookPrint }: Props) {
  const marks = blueprintMarks(DEFAULT_BLUEPRINT);
  const [size, setSize] = useState(20);
  const Word = unitWord(unit);
  const word = Word.toLowerCase();
  const texts = unit.texts ?? [];
  const topicRow = (t: QuestionType) => (
              <li class="topic" key={t.id}>
                <h3>
                  {t.title}
                  {!isAutoMarked(t) && <span class="small">{unit.subject !== undefined && unit.subject !== 'maths' ? 'Do it together with a grown-up. Not marked.' : 'A grown-up checks the answers'}</span>}
                </h3>
                <div class="levels" role="group" aria-label={`${t.title}: choose a level`}>
                  {LEVELS.map((l) => {
                    const c = progress?.cells[cellKey(t.id, l)];
                    const going = hasSession(topicNumber(t.id), l, 10);
                    return (
                      <button key={l} type="button" class={`lvl ${l}`} onClick={() => onPractice(t, l)} aria-label={`${LEVEL_NAME[l]}${going ? ', continue where you left off' : ''}${c ? `, best ${c.stars} of 3 stars` : ''}: ${t.title}`}>
                        <span class="lvl-top">
                          <i class={`mk ${l}${c && c.stars > 0 ? ' on' : ''}`} aria-hidden="true" />
                          {LEVEL_NAME[l]}
                        </span>
                        <span class="small">{going ? 'Continue' : c && c.bestOf > 0 ? `Best ${c.best}/${c.bestOf}` : 'New'}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
  );
  const practiceTypes = unit.types.filter((t) => !t.book);
  const grouped = subjectOfUnit(unit) !== 'maths' ? groupTopics(practiceTypes, groupOf) : undefined;
  const bookEx = unit.bookExercises ?? [];
  const bookStars = unit.types.filter((t) => t.book).reduce((m, t) => m + (progress?.cells[cellKey(t.id, 'medium')]?.stars ?? 0), 0);
  const bookDone = unit.types.filter((t) => t.book).reduce((m, t) => m + (progress?.cells[cellKey(t.id, 'medium')]?.attempts ?? 0), 0);
  return (
    <>
      <Back onClick={onBack}>All {word}s</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <h1 class="page" tabIndex={-1} id="page-h">
          {unitLabel(unit)} · {unit.title}
        </h1>
        <p class="row">
          <span class="subjectpill">{subjectOfUnit(unit) === 'english' ? 'English' : subjectOfUnit(unit) === 'evs' ? 'EVS' : 'Maths'}</span>
          <span class="muted">Book pages {unit.printedPages[0]} to {unit.printedPages[1]}</span>
        </p>
        <p class="lede">{onTest ? `Pick a level to practise every topic of the ${word}, one topic only, or take the ${word} test.` : `Read the ${word}, then pick a level to practise every topic of the ${word}, or one topic only.`}</p>
      </header>
      <Banners list={banners} onClearAll={onClearAll} />
      {bookEx.length > 0 && onBook && (
        <section class="card" aria-labelledby="bk-h">
          <h2 id="bk-h" style={{ fontSize: '24px', marginBottom: '4px' }}>
            Book exercises
          </h2>
          <p class="lede" style={{ marginBottom: '12px' }}>
            The exercises of your book, exactly as printed and in book order. The same questions every time, so there is no level to pick. {bookDone > 0 ? `${bookDone} answered so far, ${bookStars} stars.` : ''}
          </p>
          <div class="actions" style={{ marginBottom: '12px' }}>
            <button class="btn primary" onClick={() => onBook('ALL')}>
              {hasSession('BOOK', 'medium', 0) ? 'Continue the whole ' : 'Do the whole '}
              {word} in book order
            </button>
            {onBookPrint && (
              <button class="btn" onClick={() => onBookPrint('ALL')}>
                Print the whole {word}
              </button>
            )}
          </div>
          <details class="bk-all" open={bookEx.length <= 8}>
            <summary style={{ minHeight: '44px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 800 }}>{bookEx.length} exercises in book order</summary>
          <ul class="bk-list">
            {bookEx.map((x) => (
              <li class="bk-row" key={x.key}>
                <div class="grow">
                  <span class="bk-id">
                    Exercise {x.id} · page {x.page} · {x.count} {x.count === 1 ? 'item' : 'items'}
                  </span>
                  {x.instruction && <p class="bk-ins">{x.instruction}</p>}
                </div>
                <div class="actions">
                  <button class="btn primary" onClick={() => onBook(x.key)} aria-label={`${hasSession(`BX${x.key}`, 'medium', 0) ? 'Continue' : 'Do'} exercise ${x.id}, page ${x.page}, exactly as in the book`}>
                    {hasSession(`BX${x.key}`, 'medium', 0) ? 'Continue' : 'Do it'}
                  </button>
                  {onBookPrint && (
                    <button class="btn" onClick={() => onBookPrint(x.key)} aria-label={`Print exercise ${x.id}, page ${x.page}`}>
                      Print
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          </details>
          <ConfirmNote />
        </section>
      )}
      <section class="card" aria-labelledby="lv-h">
        <h2 id="lv-h" style={{ fontSize: '24px', marginBottom: '4px' }}>
          Practise the whole {word}
        </h2>
        <p class="lede" style={{ marginBottom: '12px' }}>
          Each sheet mixes all {practiceTypes.filter(isAutoMarked).length} topics{practiceTypes.some((t) => !isAutoMarked(t)) ? ' that can be marked' : ''}. Easy is simpler than the book, Medium is the book's level, Challenge is harder.
        </p>
        <fieldset class="field" style={{ marginBottom: '12px' }}>
          <legend>How many questions?</legend>
          <div class="seg" role="radiogroup" aria-label="Number of questions">
            {[10, 15, 20, 25].map((n) => (
              <button key={n} type="button" role="radio" aria-checked={size === n} aria-pressed={size === n} onClick={() => setSize(n)} style={{ minHeight: '44px' }}>
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <div class="levels big" role="group" aria-label={`Practise the whole ${word}: choose a level`}>
          {LEVELS.map((l) => (
            <button key={l} type="button" class={`lvl ${l}`} onClick={() => onMixed(l, size)}>
              <b>{LEVEL_NAME[l]}</b>
              <small>{hasSession(undefined, l, size) ? 'Continue where you left off' : LEVEL_HELP[l]}</small>
              {levelCounts && levelCounts[l].of > 0 && (
                <small class="tickrow">
                  <span class="ticks" role="img" aria-label={`${levelCounts[l].passed} of ${levelCounts[l].of} topics passed at ${LEVEL_NAME[l]}`}>
                    {MILESTONES.map((m) => (
                      <i key={m} class={`tk${reachedMilestone(levelCounts[l].passed, levelCounts[l].of, m) ? ' on' : ''}`} />
                    ))}
                  </span>
                  {levelCounts[l].passed} of {levelCounts[l].of} passed
                </small>
              )}
            </button>
          ))}
        </div>
      </section>
      {texts.length > 0 && (
        <section class="texts" aria-labelledby="read-h">
          <h2 id="read-h" style={{ fontSize: '24px' }} tabIndex={-1}>
            Read the {word}
          </h2>
          <p class="lede">Tap a title to open the text. Texts marked "read it in your book" are not copied here.</p>
          {texts.filter((t) => !isDidYouKnow(t)).map((t) => (
            <PassageView key={t.id} passage={t} idPrefix="read" fold />
          ))}
        </section>
      )}
      {texts.some(isDidYouKnow) && (
        <section class="dyk-grid" aria-labelledby="dyk-h">
          <h2 id="dyk-h" style={{ fontSize: '24px' }} tabIndex={-1}>
            Did you know?
          </h2>
          <div class="dyk-cards">
            {texts.filter(isDidYouKnow).map((t) => (
              <PassageView key={t.id} passage={t} idPrefix="dyk" level={3} />
            ))}
          </div>
        </section>
      )}
      <div class="two-col">
        <section aria-labelledby="topics-h" class="u-body" style={{ gap: '12px' }}>
          <h2 id="topics-h" style={{ fontSize: '24px' }}>
            Or practise one topic
          </h2>
          {grouped ? (
            <div class="tgroups">
              {grouped.map((g, i) => (
                <details class="tgroup" key={g.id} open={i === 0}>
                  <summary>
                    {g.title}
                    <span class="count">{g.topics.length} {g.topics.length === 1 ? 'topic' : 'topics'}</span>
                  </summary>
                  <ul class="topics">{g.topics.map((t) => topicRow(t))}</ul>
                </details>
              ))}
            </div>
          ) : (
            <ul class="topics">{practiceTypes.map((t) => topicRow(t))}</ul>
          )}
        </section>
        <aside class="u-body" style={{ gap: '16px' }}>
          {onTest && (
            <section class="card test-card" aria-labelledby="test-h">
              <h2 id="test-h">Unit test</h2>
              <p>Like the real exam: {marks} marks, {DEFAULT_BLUEPRINT.minutes} minutes, 3 sections.</p>
              <ul>
                <li>A · Quick answers</li>
                <li>B · Show your working</li>
                <li>C · Think harder</li>
              </ul>
              <button class="btn primary" onClick={onTest}>
                {testSession ? 'Continue the unit test' : 'Start the unit test'}
              </button>
            </section>
          )}
          {onWordQuest && (
            <section class="card" aria-labelledby="wq-h">
              <h2 id="wq-h" style={{ fontSize: '22px' }}>
                Word Quest
              </h2>
              <p class="lede" style={{ margin: '6px 0 12px' }}>
                Type the words of this {word}. Read the clue, then spell the word on the keyboard.
              </p>
              <button class="btn primary" onClick={onWordQuest}>
                Play Word Quest
              </button>
            </section>
          )}
          <section class="card" aria-labelledby="paper-h">
            <h2 id="paper-h" style={{ fontSize: '22px' }}>
              Did it on paper?
            </h2>
            <p class="lede" style={{ margin: '6px 0 12px' }}>
              Type your answers into the app and get them marked.
            </p>
            <button class="btn" onClick={onPaper}>
              Enter your answers
            </button>
          </section>
          <section class="card" aria-labelledby="cov-h">
            <h2 id="cov-h" style={{ fontSize: '20px' }}>
              Nothing missed
            </h2>
            <p class="lede">
              All {practiceTypes.length} topics here are covered at all three levels. This is checked against the book pages before a {word} opens.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
