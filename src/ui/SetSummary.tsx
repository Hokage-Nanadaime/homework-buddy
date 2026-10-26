import { METER_CAP, STAGES } from '../core/pip';
import type { PopupPlan } from '../core/popupPlan';
import { chapterLine, levelLine, levelTitle } from '../core/popupPlan';
import type { ChapterEvent, LevelEvent } from '../core/rewardEval';
import { Marks } from './Marks';
import type { RewardLevel } from '../core/settings';
import { PipArt } from './RewardArt';

export interface SummaryData {
  reward: RewardLevel;
  plan: PopupPlan;
  meter: number;
  stage: number;
  leaves: number;
  minutesToday: number;
  goalMinutes: number;
  chapter?: ChapterEvent;
  /** where this unit stands at the level just practised: "Unit 1 · Easy: 4 of 27 topics passed." */
  unitLine?: string;
}

/** The ring of minutes today against the goal. */
export function GoalRing({ done, goal, size = 96 }: { done: number; goal: number; size?: number }) {
  const r = size * 0.4;
  const c = 2 * Math.PI * r;
  const frac = Math.min(1, goal > 0 ? done / goal : 0);
  const mid = size / 2;
  return (
    <svg class="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${done} of ${goal} minutes today`}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--track)" stroke-width={size * 0.09} />
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--accent)" stroke-width={size * 0.09} stroke-linecap="round" stroke-dasharray={`${c * frac} ${c}`} transform={`rotate(-90 ${mid} ${mid})`} />
      <text x={mid} y={mid + 2} text-anchor="middle" font-family="var(--display)" font-size={size * 0.27} fill="var(--ink)">{done}</text>
      <text x={mid} y={mid + size * 0.17} text-anchor="middle" font-size={size * 0.11} fill="var(--muted)">of {goal} min</text>
    </svg>
  );
}

export function meterText(meter: number, quiet: boolean): string {
  if (meter >= METER_CAP) return 'Pip is ready to grow. Finish a chapter.';
  return quiet ? `${meter} of ${METER_CAP} sets` : `Growth meter: ${meter} of ${METER_CAP}. Finish a chapter to grow a stage.`;
}

/** What a finished set earned: Pip's growth meter, new stamps (quiet lines), the Light chapter card, and today's goal. */
export function SetExtras({ data, onAlbum }: { data: SummaryData; onAlbum(): void }) {
  const { plan } = data;
  const quiet = plan.mode === 'quiet';
  const left = Math.max(0, data.goalMinutes - data.minutesToday);
  // Light shows the chapter result as a card, so its line is not repeated
  const lines = plan.mode === 'light' ? plan.lines.filter((l) => !l.includes(' is done.') && !l.includes(' done for ')) : plan.lines;
  if (data.reward === 'minimal') {
    return (
      <p class="lede" role="status">
        {data.unitLine ? `${data.unitLine} ` : ''}
        {data.minutesToday} of {data.goalMinutes} minutes today.
      </p>
    );
  }
  return (
    <div class="stack">
      <div class="sumgrid">
        <section class="card" aria-labelledby="earn-h">
          <div class="row between">
            <h2 id="earn-h" style={{ fontSize: '24px' }}>
              This set earned
            </h2>
            <button class="btn quiet" onClick={onAlbum}>
              Open the stamp album
            </button>
          </div>
          {data.unitLine && <p style={{ marginTop: '10px' }}><b>{data.unitLine}</b></p>}
          <div class="stack" style={{ gap: '10px', marginTop: '10px' }} role="status" aria-live="polite">
            {lines.length > 0 ? (
              lines.map((l) => (
                <p class="earned-note" key={l}>
                  {l}
                </p>
              ))
            ) : (
              <p class="earned-note">No new stamps this time. Every set still helps Pip grow a little.</p>
            )}
          </div>
          {plan.levels && plan.mode === 'light' && plan.levels.map((l) => <LightLevel key={l.key + l.level} l={l} />)}
          {plan.card && plan.mode === 'light' && <LightChapter ch={plan.card} />}
        </section>
        <section class="card pipcard" aria-labelledby="pip-h">
          <PipArt stage={data.stage} title={`Pip, ${STAGES[data.stage]!.name}`} leaves={data.leaves} />
          <div style={{ flex: 1, minWidth: '160px' }}>
            <p class="label" id="pip-h">Pip</p>
            <h3 style={{ fontSize: '22px' }}>{quiet ? `Pip is a ${STAGES[data.stage]!.name.toLowerCase()}` : data.meter > 0 ? 'Pip grew a little.' : 'Pip is waiting for sets.'}</h3>
            {quiet ? (
              <p class="muted">{meterText(data.meter, true)}</p>
            ) : (
              <>
                <div class="pbar meter" role="img" aria-label={`Growth meter: ${data.meter} of ${METER_CAP} sets`}>
                  <i style={{ width: `${(data.meter / METER_CAP) * 100}%` }} />
                </div>
                <p class="muted small">{meterText(data.meter, false)}</p>
              </>
            )}
          </div>
        </section>
      </div>
      <section class="card" aria-labelledby="today2-h">
        <h2 id="today2-h" style={{ fontSize: '24px', marginBottom: '8px' }}>
          Today
        </h2>
        <div class="row">
          <GoalRing done={data.minutesToday} goal={data.goalMinutes} />
          <p>
            <b>{left === 0 ? `Goal reached: ${data.minutesToday} of ${data.goalMinutes} min` : `${data.minutesToday} of ${data.goalMinutes} minutes`}</b>
            <br />
            <span class="muted">A short day is fine. Missing a day never loses a stamp.</span>
          </p>
        </div>
      </section>
    </div>
  );
}

function LightChapter({ ch }: { ch: ChapterEvent }) {
  return (
    <div class="pip-row earned-note" style={{ marginTop: '10px' }}>
      <PipArt stage={ch.fromStage} title="Pip before" cls="mini2" />
      <span aria-hidden="true">→</span>
      <PipArt stage={ch.toStage} title="Pip now" cls="mini2" />
      <div>
        <h3 style={{ fontSize: '19px' }}>{ch.title} is done</h3>
        <p>{chapterLine(ch).replace(`${ch.title} is done. `, '')}</p>
      </div>
    </div>
  );
}

function LightLevel({ l }: { l: LevelEvent }) {
  return (
    <div class="pip-row earned-note" style={{ marginTop: '10px' }}>
      <Marks marks={{ easy: l.level === 'easy', medium: l.level === 'medium', challenge: l.level === 'challenge' }} />
      <div>
        <h3 style={{ fontSize: '19px' }}>{levelTitle(l)}</h3>
        <p>{levelLine(l).replace(`${levelTitle(l)} `, '')}</p>
      </div>
    </div>
  );
}
