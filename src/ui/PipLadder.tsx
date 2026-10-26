import type { Firsts } from '../core/activity';
import { levelMarks, unitStatus } from '../core/bookStatus';
import { BOOKS, bookById } from '../core/books';
import { BOOK_WORD, CHAPTERS, unitOfChapter } from '../core/chapters';
import { FRUIT_AT, METER_CAP, ORCHARD_STEP, STAGES, TOTAL_CHAPTERS, TOTAL_POINTS, chaptersDone, nextStage, orchardFriend, orchardOf, pipPoints, pointWord, stageFor, toNextOrchard } from '../core/pip';
import type { KidProgress } from '../core/progress';
import type { UnitDef } from '../core/question';
import type { RewardsDoc } from '../core/rewards';
import { Back } from './Back';
import { Marks, StatusWord } from './Marks';
import { OrchardArt, PipArt } from './RewardArt';
import { meterText } from './SetSummary';

interface Props {
  kidName?: string;
  rewards: RewardsDoc;
  progress?: KidProgress;
  firsts?: Record<string, Firsts>;
  units: UnitDef[];
  meter: number;
  leaves: number;
  onBack(): void;
}


/** Pip's ten stages. The stage depends only on chapters Done; finished sets only fill the small growth meter. */
export function PipLadder({ kidName, rewards, progress, firsts, units, meter, leaves, onBack }: Props) {
  const done = chaptersDone(rewards);
  const points = pipPoints(rewards);
  const stage = stageFor(points);
  const trees = orchardOf(points);
  const nxt = nextStage(stage);
  return (
    <>
      <Back onClick={onBack}>Back</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <p class="label">Your companion</p>
        <h1 class="page" tabIndex={-1} id="page-h">
          Pip's ladder
        </h1>
        <p class="lede">
          {kidName ? `${kidName} has` : 'You have'} finished {done} of {TOTAL_CHAPTERS} chapters. Unseen passages and exams do not count towards Pip.
        </p>
      </header>
      <section class="card pipcard" aria-labelledby="now-h">
        <PipArt stage={stage} title={`Pip, ${STAGES[stage]!.name}`} leaves={leaves} />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <p class="label">Pip is now</p>
          <h2 id="now-h">{STAGES[stage]!.name}</h2>
          <p>{STAGES[stage]!.look}</p>
          <p>
            {nxt ? (
              <>
                <b>Next: {nxt.name}.</b> {nxt.at - points} more {pointWord(nxt.at - points)} to finish. Done means Easy and Medium passed on every topic.
              </>
            ) : (
              <b>{points >= TOTAL_POINTS ? `All ${TOTAL_CHAPTERS} chapters are done.` : `${toNextOrchard(points)} more ${pointWord(toNextOrchard(points))} to plant the next friend in the orchard.`}</b>
            )}
          </p>
        </div>
      </section>
      <section class="card" aria-labelledby="ten-h">
        <h2 id="ten-h">All ten stages</h2>
        <p class="lede">Pip grows when a whole chapter is Done. Stages ahead are shown as shadows.</p>
        <div class="stagegrid" style={{ marginTop: '12px' }}>
          {STAGES.map((s, i) => (
            <div key={s.name} class={`stagecell${i === stage ? ' here' : i === stage + 1 ? ' next' : i > stage ? ' locked' : ''}`}>
              <small>{i + 1}</small>
              <PipArt stage={i} title={i <= stage ? `Pip, ${s.name}` : `Stage ${i + 1}, not yet`} sil={i > stage + 1} />
              <b>{i > stage + 1 ? `Stage ${i + 1}` : s.name}</b>
              <small>{s.at === 0 ? 'Start' : `${s.at} ${s.at === 1 ? 'chapter' : 'chapters'}`}</small>
              <span class="tag">{i < stage ? 'Reached' : i === stage ? 'You are here' : i === stage + 1 ? 'Next' : 'Locked'}</span>
            </div>
          ))}
        </div>
      </section>
      <section class="card" aria-labelledby="orch-h">
        <h2 id="orch-h">{trees > 0 ? `Pip's orchard: Orchard ${trees}` : "Pip's orchard"}</h2>
        <p class="lede">
          After the Fruit Tree ({FRUIT_AT} {pointWord(FRUIT_AT)}), every further {ORCHARD_STEP} {pointWord(ORCHARD_STEP)} Done plants one more small friend. Pip never loses a tree.
        </p>
        {trees > 0 ? (
          <>
            <OrchardArt count={trees} title={`Pip's orchard, ${trees} ${trees === 1 ? 'friend' : 'friends'}`} />
            <p>
              <b>Orchard {trees}.</b> The newest friend is {/^[aeiou]/i.test(orchardFriend(trees)) ? 'an' : 'a'} {orchardFriend(trees)}.
            </p>
          </>
        ) : (
          <p class="muted">Nothing planted yet. The first friend is {/^[aeiou]/i.test(orchardFriend(1)) ? 'an' : 'a'} {orchardFriend(1)}.</p>
        )}
        {points >= FRUIT_AT && points < TOTAL_POINTS && (
          <p class="muted">
            {toNextOrchard(points)} more {pointWord(toNextOrchard(points))} Done and Pip plants {/^[aeiou]/i.test(orchardFriend(trees + 1)) ? 'an' : 'a'} {orchardFriend(trees + 1)} (Orchard {trees + 1}).
          </p>
        )}
      </section>
      <div class="album-grid">
        <section class="card" aria-labelledby="chd-h">
          <h2 id="chd-h">Chapters done</h2>
          <p class="lede">A chapter is Done when every topic has Easy and Medium passed. Challenge is optional and adds a gold leaf.</p>
          <ul class="chlist">
            {BOOKS.map((b) => b.id).map((book) => (
              <>
                <li key={book}>
                  <h3>{bookById(book).title}</h3>
                </li>
                {CHAPTERS.filter((c) => c.book === book).map((c) => {
                  const u = unitOfChapter(c, units);
                  return (
                    <li key={c.key}>
                      <span class="grow">
                        {BOOK_WORD[c.book]} {c.n} · {u?.title}
                      </span>
                      {u && <Marks marks={levelMarks(progress, firsts, u)} />}
                      {u && <StatusWord status={rewards.chapters[c.key] ? 'done' : unitStatus(progress, firsts, u)} />}
                    </li>
                  );
                })}
              </>
            ))}
          </ul>
        </section>
        <aside class="stack sticky">
          <section class="card">
            <h2 style={{ fontSize: '22px' }}>Growth meter</h2>
            <div class="pbar meter" style={{ margin: '10px 0' }} role="img" aria-label={`${meter} of ${METER_CAP} sets`}>
              <i style={{ width: `${(meter / METER_CAP) * 100}%` }} />
            </div>
            <p class="muted small">{meterText(meter, true)} since Pip last grew a stage. Every finished set fills the meter a little. The meter never changes the stage; only a Done chapter does.</p>
          </section>
          <section class="card">
            <h2 style={{ fontSize: '22px' }}>Gold leaves</h2>
            <p class="muted">
              {leaves} {leaves === 1 ? 'chapter has' : 'chapters have'} Challenge passed on every topic. Each one gives Pip a gold leaf. Up to five show.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
