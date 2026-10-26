import { useEffect, useRef, useState } from 'preact/hooks';
import { STAGES } from '../core/pip';
import type { PopupItem, PopupPlan } from '../core/popupPlan';
import { levelLine, levelTitle, foundLine, milestoneLine, milestoneTitle, moreToText, orchardLine } from '../core/popupPlan';
import { Marks } from './Marks';
import { OrchardArt, PipArt, StampArt } from './RewardArt';
import { playTone } from './sound';

interface Props {
  plan: PopupPlan;
  /** a tiny soft tick when a stamp lands (the kid's sound setting) */
  sound: boolean;
  /** stamps that were shown in a popup, so their New tag can go */
  onSeen?(ids: string[]): void;
  onDone(): void;
}

const lower = (s: string): string => s.toLowerCase();

function announce(it: PopupItem): string {
  if (it.kind === 'stamp') return `New stamp: ${it.def.name}. ${it.def.why}`;
  if (it.kind === 'level') return levelLine(it.level);
  if (it.kind === 'milestone') return milestoneLine(it.milestone);
  if (it.kind === 'found') return `${foundLine(it.defs.length)} They are in your album now.`;
  const c = it.chapter;
  if (c.orchard) return `${c.title} is done. ${orchardLine(c.orchard)}`;
  return `${c.title} is done. ${c.same ? `Pip is still a ${lower(STAGES[c.toStage]!.name)}.` : `Pip grew to ${lower(STAGES[c.toStage]!.name)}.`}`;
}

function Body({ it, mode }: { it: PopupItem; mode: PopupPlan['mode'] }) {
  const sparks = mode === 'full' ? ['s1', 's2', 's3', 's4', 's5', 's6'].map((s) => <span key={s} class={`spk ${s}`} />) : null;
  if (it.kind === 'stamp') {
    return (
      <div class={`pop-card stamping${it.def.rarity === 'gold' ? ' isgold' : ''}`}>
        <div class="pop-art">
          <span class="ink-ring" />
          <StampArt def={it.def} deco />
          {sparks}
        </div>
        <p class="label">New stamp</p>
        <h2 id="pop-t">{it.def.name}</h2>
        <p id="pop-d">{it.def.why}</p>
        <p class="small muted">
          {it.def.rarity === 'gold' ? 'A rare golden stamp. ' : ''}It is in your album now.
        </p>
      </div>
    );
  }
  if (it.kind === 'milestone') {
    const m = it.milestone;
    return (
      <div class="pop-card inking">
        <div class="pop-art">
          <span class="ticks big" role="img" aria-label={`${m.percent} per cent of the ${m.of} topics`}>
            {[25, 50, 75, 100].map((t) => (
              <i key={t} class={`tk${t <= m.percent ? ' on' : ''}${t === m.percent ? ' fresh' : ''}`} />
            ))}
          </span>
        </div>
        <p class="label">Milestone</p>
        <h2 id="pop-t">{milestoneTitle(m)}</h2>
        <p id="pop-d">{m.passed} of {m.of} topics passed. Keep going at your own pace.</p>
      </div>
    );
  }
  if (it.kind === 'level') {
    const l = it.level;
    return (
      <div class="pop-card inking">
        <div class="pop-art">
          <Marks big fresh={l.level} marks={{ easy: l.level === 'easy', medium: l.level === 'medium', challenge: l.level === 'challenge' }} />
        </div>
        <p class="label">Ink mark</p>
        <h2 id="pop-t">{levelTitle(l)}</h2>
        <p id="pop-d">{l.next}</p>
      </div>
    );
  }
  if (it.kind === 'found') {
    return (
      <div class="pop-card stamping">
        <div class="found-row">
          {it.defs.slice(0, 3).map((d) => (
            <span class="found-art" key={d.id}>
              <StampArt def={d} deco />
            </span>
          ))}
        </div>
        <p class="label">From your earlier practice</p>
        <h2 id="pop-t">{foundLine(it.defs.length)}</h2>
        <p id="pop-d">
          {it.defs.map((d) => d.name).join(', ')}. They are in your album now.
          {it.milestones ? ` ${it.milestones} ${it.milestones === 1 ? 'milestone' : 'milestones'} from your earlier practice ${it.milestones === 1 ? 'is' : 'are'} counted too.` : ''}
        </p>
      </div>
    );
  }
  const c = it.chapter;
  const to = STAGES[c.toStage]!.name;
  return (
    <div class="pop-card growing">
      <div class="pop-art wide">
        {c.same ? (
          <span class="pa">
            <PipArt stage={c.toStage} title={`Pip, a ${to}`} leaves={c.leaves} />
            {sparks}
          </span>
        ) : (
          <>
            <span class="pb">
              <PipArt stage={c.fromStage} title={`Pip before: ${STAGES[c.fromStage]!.name}`} leaves={c.leaves} />
            </span>
            <span class="pa">
              <PipArt stage={c.toStage} title={`Pip now: ${to}`} leaves={c.leaves} />
              {sparks}
            </span>
          </>
        )}
        {c.orchard && <OrchardArt count={c.orchard.n} title={`Orchard ${c.orchard.n}`} />}
      </div>
      <p class="label">Chapter done</p>
      <h2 id="pop-t">{c.title} is done</h2>
      <p id="pop-d">
        {c.orchard
          ? orchardLine(c.orchard)
          : c.same
            ? `Pip is still a ${lower(to)}. ${moreToText(c)}.`
            : `Pip grew from ${lower(STAGES[c.fromStage]!.name)} to ${lower(to)}.`}
      </p>
    </div>
  );
}

/**
 * The popups, one after another, only after a set (or chapter) has finished. A dialog with the focus on Skip, Escape to skip,
 * a line read aloud for screen readers, and a timer of about three seconds that waits while the pointer is over it or a key is pressed.
 */
export function RewardPopups({ plan, sound, onSeen, onDone }: Props) {
  const [i, setI] = useState(0);
  const [gap, setGap] = useState(false);
  const skip = useRef<HTMLButtonElement>(null);
  const ret = useRef<Element | null>(null);
  const ms = plan.mode === 'light' ? 2200 : 3200;
  const left = useRef(ms);
  const t0 = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const paused = useRef(false);
  const [bar, setBar] = useState<'running' | 'paused'>('running');
  const it = plan.queue[i];

  const next = () => {
    clearTimeout(timer.current);
    if (i + 1 < plan.queue.length) {
      setGap(true);
      setTimeout(() => {
        setI(i + 1);
        setGap(false);
      }, 160);
    } else onDone();
  };
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    ret.current = document.activeElement;
    return () => {
      if (ret.current instanceof HTMLElement) ret.current.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (!it || gap) return;
    left.current = ms;
    t0.current = Date.now();
    paused.current = false;
    setBar('running');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => nextRef.current(), ms);
    skip.current?.focus({ preventScroll: true });
    if (sound && (it.kind === 'stamp' || it.kind === 'level' || it.kind === 'milestone')) playTone(true);
    if (it.kind === 'stamp') onSeen?.([it.def.id]);
    return () => clearTimeout(timer.current);
  }, [i, gap]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDone();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const pause = () => {
    if (paused.current) return;
    paused.current = true;
    clearTimeout(timer.current);
    left.current -= Date.now() - t0.current;
    setBar('paused');
  };
  const resume = () => {
    if (!paused.current) return;
    paused.current = false;
    t0.current = Date.now();
    timer.current = setTimeout(() => nextRef.current(), Math.max(300, left.current));
    setBar('running');
  };

  if (!it) return null;
  return (
    <div class="pop-layer" data-mode={plan.mode} hidden={gap} onClick={(e) => e.target === e.currentTarget && onDone()}>
      <div
        class="pop"
        role="dialog"
        aria-modal="false"
        aria-labelledby="pop-t"
        aria-describedby="pop-d"
        onPointerEnter={pause}
        onPointerLeave={resume}
        onKeyDown={(e) => {
          if (e.key !== 'Escape' && e.key !== 'Enter' && e.key !== ' ') pause();
        }}
        onFocusOut={() => setTimeout(() => !document.querySelector('.pop')?.contains(document.activeElement) && resume(), 0)}
      >
        <p class="sr" role="status" aria-live="polite">
          {announce(it)}
        </p>
        <Body it={it} mode={plan.mode} key={i} />
        <div class="pop-foot">
          <span class="pop-time" aria-hidden="true">
            <i key={i} style={{ animationDuration: `${ms}ms`, animationPlayState: bar }} />
          </span>
          <button class="btn" type="button" ref={skip} onClick={onDone}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
