import type { Kid } from '../core/profiles';
import type { SubjectId } from '../core/question';
import { STAGES, METER_CAP, TOTAL_POINTS, pointWord } from '../core/pip';
import type { RewardLevel } from '../core/settings';
import { STAMP_DEFS, type StampDef } from '../core/stamps';
import type { BookId } from './BooksIndex';
import { OrchardArt, PipArt, StampArt } from './RewardArt';
import { GoalRing, meterText } from './SetSummary';

export interface ShelfBook {
  id: BookId;
  title: string;
  count: string;
  tone: SubjectId | 'exam';
  /** chapters finished and chapters in the book; none for the exam shelf */
  done?: number;
  total?: number;
}

export interface Resume {
  title: string;
  detail: string;
  subject: SubjectId;
  onContinue(): void;
}

interface Props {
  kidName?: string;
  kids: Kid[];
  activeId?: string;
  onPick(id: string): void;
  onAddKid(): void;
  resume?: Resume;
  shelf: ShelfBook[];
  onBook(id: BookId): void;
  minutesToday: number;
  goalMinutes: number;
  /** false at the Minimal reward level: the goal is shown in words only */
  showRing?: boolean;
  /** the kid's reward level: Minimal hides Pip and the stamps */
  reward?: RewardLevel;
  pip?: { stage: number; meter: number; leaves: number; done: number; toNext: number; nextName?: string; orchard?: number };
  recent?: StampDef[];
  stampCount?: number;
  newIds?: string[];
  nextLine?: string;
  onAlbum?(): void;
  onPip?(): void;
  onPaper(): void;
}

export function HomeView({ kidName, kids, activeId, onPick, onAddKid, resume, shelf, onBook, minutesToday, goalMinutes, showRing = true, reward = 'full', pip, recent = [], stampCount = 0, newIds = [], nextLine, onAlbum, onPip, onPaper }: Props) {
  const left = Math.max(0, goalMinutes - minutesToday);
  return (
    <>
      <header class="home-head">
        <div class="u-body" style={{ gap: '6px' }}>
          <h1 class="page" tabIndex={-1} id="page-h" style={{ fontSize: 'clamp(34px, 9vw, 48px)' }}>
            {kidName ? `Hello, ${kidName}!` : 'Hello!'}
          </h1>
          <p class="lede">{!kidName ? 'Add a kid at the top to keep stars and progress.' : left > 0 ? `${left} more ${left === 1 ? 'minute reaches' : 'minutes reach'} today's goal. Short sets are fine.` : "Today's goal is reached. Anything more is a bonus."}</p>
        </div>
        <div class="who" role="group" aria-label="Who is practising">
          <span class="label">Who is practising</span>
          {kids.map((k) => (
            <button key={k.id} type="button" class="chip" aria-pressed={k.id === activeId} onClick={() => onPick(k.id)}>
              {k.name}
            </button>
          ))}
          <button type="button" class="chip" onClick={onAddKid}>
            {kids.length === 0 ? 'Add a kid' : 'Add'}
          </button>
        </div>
      </header>
      <div class="home-grid">
        <div class="stack">
          <section class={`card resume tone-${resume?.subject ?? 'maths'}`} aria-labelledby="resume-h">
            <p class="label">{resume ? 'Where you left off' : 'Start here'}</p>
            <h2 id="resume-h">{resume ? resume.title : 'Pick a chapter from your books'}</h2>
            <p class="muted">{resume ? resume.detail : 'Every chapter has three levels. Easy is simpler than the book, Medium is the book, Challenge is harder.'}</p>
            <div class="actions">
              {resume ? (
                <button class="btn primary" onClick={resume.onContinue}>
                  Continue
                </button>
              ) : (
                <button class="btn primary" onClick={() => onBook('maths')}>
                  Open your books
                </button>
              )}
              <button class="btn" onClick={onPaper}>
                Did a worksheet on paper? Enter your answers
              </button>
            </div>
          </section>
          <section class="card" aria-labelledby="books-h">
            <div class="row between">
              <h2 id="books-h">Your books</h2>
              <button class="btn quiet" onClick={() => onBook('maths')}>
                Open the contents pages
              </button>
            </div>
            <ul class="homeshelf">
              {shelf.map((b) => (
                <li key={b.id}>
                  <button type="button" class={`spine tone-${b.tone}`} onClick={() => onBook(b.id)} aria-label={`${b.title}: open the book. ${b.count}${b.total ? `, ${b.done ?? 0} of ${b.total} done` : ''}`}>
                    <b>{b.title}</b>
                    <small>{b.count}</small>
                    {b.total ? (
                      <span class="minibar" aria-hidden="true">
                        <i style={{ width: `${Math.round(((b.done ?? 0) / b.total) * 100)}%` }} />
                      </span>
                    ) : null}
                    <small>{b.total ? `${b.done ?? 0} of ${b.total} done` : 'Make a school-style paper'}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {reward !== 'minimal' && onAlbum && (
            <section class="card" aria-labelledby="recent-h">
              <div class="row between">
                <h2 id="recent-h">Recent stamps</h2>
                <button class="btn quiet" onClick={onAlbum}>
                  Open the album ({stampCount} of {STAMP_DEFS.length})
                </button>
              </div>
              {recent.length > 0 ? (
                <div class="homestamps">
                  {recent.map((d) => (
                    <div class="tile2" key={d.id} style={{ cursor: 'default' }}>
                      <StampArt def={d} deco />
                      {newIds.includes(d.id) && <span class="newdot">New</span>}
                      <b>{d.name}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p class="lede">Finish a set to earn your first stamp.</p>
              )}
              {nextLine && <p style={{ marginTop: '12px', borderTop: '1px dotted var(--line-strong)', paddingTop: '10px', fontWeight: 700 }}>{nextLine}</p>}
            </section>
          )}
        </div>
        <div class="stack">
          {reward !== 'minimal' && pip && (
            <section class="card pipcard" aria-labelledby="pipc-h">
              <PipArt stage={pip.stage} title={`Pip, ${STAGES[pip.stage]!.name}`} leaves={pip.leaves} />
              <div style={{ flex: 1, minWidth: '170px' }}>
                <p class="label">Your companion</p>
                <h2 id="pipc-h" style={{ fontSize: '24px' }}>
                  {pip.done === 0 ? 'Pip is a seed.' : `Pip is a ${STAGES[pip.stage]!.name.toLowerCase()}.`}
                </h2>
                <p class="muted">{pip.done === 0 ? 'Finish your first chapter to meet the first friend.' : pip.nextName ? `${pip.toNext} more ${pointWord(pip.toNext)} Done and Pip becomes ${/^[aeiou]/i.test(pip.nextName) ? 'an' : 'a'} ${pip.nextName.toLowerCase()}.` : pip.done >= TOTAL_POINTS ? 'All chapters are done.' : `${pip.toNext} more ${pointWord(pip.toNext)} Done and Pip plants the next friend in the orchard.`}</p>
                {(pip.orchard ?? 0) > 0 && <OrchardArt count={pip.orchard!} title={`Pip's orchard: ${pip.orchard}`} />}
                {(pip.orchard ?? 0) > 0 && <p class="muted small"><b>Orchard {pip.orchard}</b></p>}
                <div class="pbar meter" role="img" aria-label={`Growth meter: ${pip.meter} of ${METER_CAP} sets`} style={{ margin: '8px 0' }}>
                  <i style={{ width: `${(pip.meter / METER_CAP) * 100}%` }} />
                </div>
                <p class="muted small">{meterText(pip.meter, true)} since the last stage.</p>
                {onPip && (
                  <button class="btn quiet" onClick={onPip}>
                    See all ten stages
                  </button>
                )}
              </div>
            </section>
          )}
        <section class="card goal" aria-labelledby="today-h">
          <h2 id="today-h">Today</h2>
          <div class="row">
            {showRing && <GoalRing done={minutesToday} goal={goalMinutes} size={132} />}
            <div>
              <p class="goalnum">
                {minutesToday} of {goalMinutes} minutes
              </p>
              <p class="muted">The goal belongs to your grown-up. A short day is fine.</p>
            </div>
          </div>
        </section>
        </div>
      </div>
    </>
  );
}
