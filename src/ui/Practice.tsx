import { ideasFound } from '../core/ideas';
import { questionsFingerprint } from '../core/fingerprint';
import { questionHash } from '../core/sheet';
import { Back } from './Back';
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { answerLines, decideSentence, gradeQuestion, hintLadder, isComplete, isOpen, isSentence, starsFor, type Grade, type Values } from '../core/practice';
import type { Question, UnitDef } from '../core/question';
import type { MarkSuggestion } from '../core/aiMark';
import { unitLabel, unitWord } from '../core/worksheet';
import { LEVEL_NAME, type PracticeSet } from '../core/docs';
import { freshPractice, type PracticeState } from '../core/session';
import { Badge, Feedback, QuestionBody } from './Answer';
import { Diagram } from './Diagram';
import { PassageView } from './Passage';

type Phase = PracticeState['phase'];

export interface Outcome {
  typeId: string;
  correct: boolean;
  /** for the activity log: counts and stable ids only */
  level?: string;
  q?: string;
  firstTry?: boolean;
  hints?: number;
  seconds?: number;
  /** a written answer: Claude's suggestion (1 right, 0 not yet) and the grown-up's final mark */
  mark?: { ai?: number; fin: number; by: 'ai' | 'parent' };
}

interface Props {
  unit: UnitDef;
  set: PracticeSet;
  kidName?: string;
  onBack(): void;
  onPrint(): void;
  onAnother(): void;
  onFinish(outcomes: Outcome[], topicSet: boolean, seconds?: number): void;
  /** what the set earned (Pip's meter, stamps, today's goal), shown under the result */
  extras?: ComponentChildren;
  /** what the set just earned, in one or two quiet lines inside the result card (so it is seen without scrolling) */
  headline?: ComponentChildren;
  initial?: PracticeState;
  onState?(s: PracticeState): void;
  /** "Explain it another way" (Claude). Undefined when off or unavailable: the button is not shown. */
  explain?: (q: Question, wrong: string) => Promise<string | undefined>;
  /** Claude's suggested mark for a written answer. Undefined when off or unavailable: the grown-up compares with the model answer. */
  suggest?: (q: Question, answer: string) => Promise<MarkSuggestion | undefined>;
}

const FOCUS_KEY = 'homework-buddy-focus';
const readFocus = (): boolean => {
  try {
    return localStorage.getItem(FOCUS_KEY) === '1';
  } catch {
    return false;
  }
};
/** Focus mode hides the top bar, the way back and the question dots while a question is on screen. */
function applyFocus(on: boolean): void {
  if (on) document.documentElement.setAttribute('data-focus', '1');
  else document.documentElement.removeAttribute('data-focus');
}
function saveFocus(on: boolean): void {
  try {
    localStorage.setItem(FOCUS_KEY, on ? '1' : '0');
  } catch {
    /* not remembered */
  }
}

/** One question at a time, instant checking, hint, stars. */
export function Practice({ unit, set, kidName, onBack, onPrint, onAnother, onFinish, initial, onState, explain, suggest, extras, headline }: Props) {
  const init = initial ?? freshPractice();
  const qs = set.questions;
  const [idx, setIdx] = useState(init.idx);
  const [values, setValues] = useState<Values>(init.values);
  const [phase, setPhase] = useState<Phase>(init.phase);
  const [tries, setTries] = useState(init.tries);
  const [hintStep, setHintStep] = useState(0);
  const [another, setAnother] = useState<string>();
  const [asking, setAsking] = useState(false);
  const [aiGone, setAiGone] = useState(false);
  const [hinted, setHinted] = useState(init.hinted);
  const [grade, setGrade] = useState<Grade | undefined>(() => (init.phase !== 'answering' && init.phase !== 'asked' && qs[init.idx] ? gradeQuestion(qs[init.idx]!, init.values) : undefined));
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState<boolean[]>(init.done); // right or not for each answered question
  const [firstTry, setFirstTry] = useState(init.firstTry);
  const [outcomes, setOutcomes] = useState<Outcome[]>(init.outcomes);
  const [finished, setFinished] = useState(init.finished);
  const verdictRef = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState(readFocus);
  useEffect(() => {
    applyFocus(focus);
    return () => applyFocus(false);
  }, [focus]);
  // active seconds: the time on each question, counting at most 90 seconds of any one
  const lastTick = useRef(Date.now());
  const spentMs = useRef(0);
  const tick = (): number => {
    const now = Date.now();
    const ms = Math.min(90000, now - lastTick.current);
    lastTick.current = now;
    spentMs.current += ms;
    return Math.round(ms / 1000);
  };
  const extra = (qq: Question, ok: boolean, firstTry: boolean): Partial<Outcome> => ({ level: qq.level, q: questionHash(qq), firstTry: ok && firstTry, hints: hinted ? 1 : 0, seconds: tick() });
  const q = qs[idx];
  const [suggestion, setSuggestion] = useState<MarkSuggestion | 'asking' | undefined>();
  const Word = unitWord(unit);

  // A written answer waiting for the grown-up: ask Claude for a suggestion (also after coming back to a saved set).
  useEffect(() => {
    if (phase !== 'judging' || !q || !suggest) return;
    let live = true;
    setSuggestion('asking');
    suggest(q, q.inputs.map((i) => values[i.id] ?? '').join(' ')).then((s) => live && setSuggestion(s));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx]);

  useEffect(() => {
    if (phase !== 'answering') verdictRef.current?.focus();
  }, [phase]);

  // Save where the kid has got to after every answer, so the set can be picked up again.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onState?.({ idx, values, phase, tries, hinted, done, firstTry, outcomes, finished, fp: questionsFingerprint(qs) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase, done.length, finished]);

  const scored = outcomes.length;
  const right = outcomes.filter((o) => o.correct).length;
  const stars = starsFor(right, Math.max(scored, 1));
  const ladder = useMemo(() => (q ? hintLadder(q) : (['', ''] as [string, string])), [q]);

  if (qs.length === 0) {
    return (
      <p class="note">
        No questions could be made for this topic. <button class="btn" onClick={onBack}>Back</button>
      </p>
    );
  }

  const setValue = (id: string, v: string) => {
    setValues((o) => ({ ...o, [id]: v }));
    // a changed answer has not been checked yet: the last result must not sit on it
    if (phase === 'wrong') {
      setMsg('');
      setGrade(undefined);
    }
  };

  const check = () => {
    if (!q) return;
    if (!isComplete(q, values)) {
      setMsg('Fill in every box first, then press Check.');
      return;
    }
    setMsg('');
    if (isSentence(q)) {
      setPhase('judging');
      return;
    }
    const g = gradeQuestion(q, values);
    setGrade(g);
    if (g.correct) {
      setPhase('right');
      if (tries === 0 && !hinted) setFirstTry((n) => n + 1);
      const ex = extra(q, true, tries === 0 && !hinted);
      setOutcomes((o) => [...o, { typeId: q.typeId, correct: true, ...ex }]);
      setDone((d) => [...d, true]);
    } else {
      setTries((t) => t + 1);
      setPhase('wrong');
    }
  };

  const reveal = () => {
    if (!q) return;
    setPhase('revealed');
    const ex = extra(q, false, false);
    setOutcomes((o) => [...o, { typeId: q.typeId, correct: false, ...ex }]);
    setDone((d) => [...d, false]);
  };

  /** The grown-up decides a written answer. */
  const decide = (ok: boolean) => {
    if (!q) return;
    const d = decideSentence(q, ok, hinted || tries > 0);
    if (d.star) setFirstTry((n) => n + 1);
    const ex = extra(q, ok, Boolean(d.star));
    setOutcomes((o) => [...o, { ...d.outcome, ...ex, mark: { ...(suggestion && suggestion !== 'asking' ? { ai: suggestion.verdict === 'right' ? 1 : 0 } : {}), fin: ok ? 1 : 0, by: suggestion && suggestion !== 'asking' && (suggestion.verdict === 'right') === ok ? 'ai' : 'parent' } }]);
    setDone((x) => [...x, ok]);
    setPhase(d.phase);
  };

  const ask = () => {
    setPhase('asked');
    setDone((d) => [...d, true]);
  };

  const next = () => {
    if (idx + 1 >= qs.length) {
      setFinished(true);
      onFinish(outcomes, Boolean(set.topicId || set.book), Math.round(spentMs.current / 1000));
      return;
    }
    setIdx(idx + 1);
    setValues({});
    setPhase('answering');
    setTries(0);
    setHintStep(0);
    setAnother(undefined);
    setHinted(false);
    setGrade(undefined);
    setSuggestion(undefined);
    setMsg('');
  };

  const printLabel = `Get the worksheet as PDF (${qs.length} questions)`;
  const head = (
    <>
      <Back onClick={onBack}>Back to {Word.toLowerCase()}</Back>
      <div class="q-head">
        <div>
          <p class="qmeta">{unitLabel(unit)} · {unit.title}{set.code ? ` · Worksheet code ${set.code}` : ''}</p>
          <h1>{set.book ? 'Book exercises' : `${LEVEL_NAME[set.level]} practice`} · {set.title}</h1>
        </div>
        <div class="row">
          <span class="pill" aria-live="polite">
            <span class="stars" aria-hidden="true">★</span> {firstTry} {firstTry === 1 ? 'star' : 'stars'}
          </span>
          <button class="btn" onClick={onPrint}>
            {printLabel}
          </button>
          <button class="btn quiet" aria-pressed={focus} onClick={() => {
              saveFocus(!focus);
              setFocus(!focus);
            }}>
            Focus mode: {focus ? 'on' : 'off'}
          </button>
        </div>
      </div>
    </>
  );

  if (finished) {
    const wrongOnes = qs.filter((_, i) => done[i] === false);
    return (
      <>
        {head}
        <section class="card qcard narrow" aria-labelledby="done-h">
          <h2 id="done-h">{kidName ? `Well done, ${kidName}!` : 'Well done!'}</h2>
          <p class="score">
            {right} / {scored}
          </p>
          <p>
            <span class="stars" aria-hidden="true">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span> <b>{stars} of 3 stars</b>. {firstTry} {firstTry === 1 ? 'answer was' : 'answers were'} right first time.
          </p>
          {headline}
          {!kidName && <p class="note">Pick a kid at the top to save stars and progress.</p>}
          {wrongOnes.length > 0 && <p class="lede">Have another look at question{wrongOnes.length > 1 ? 's' : ''} {qs.map((_, i) => (done[i] === false ? i + 1 : 0)).filter(Boolean).join(', ')}, or {set.book ? 'do it again' : 'try a new set'}.</p>}
          <div class="actions">
            <button class="btn primary" onClick={onAnother}>
              {set.book ? 'Do it again' : 'Try a new set'}
            </button>
            <button class="btn" onClick={onPrint}>
              {printLabel}
            </button>
            <button class="btn" onClick={onBack}>
              Back to {Word.toLowerCase()}
            </button>
          </div>
        </section>
        {extras}
      </>
    );
  }

  if (!q) return null;
  const open = isOpen(q);
  const finishedQ = phase === 'right' || phase === 'revealed' || phase === 'asked' || phase === 'notyet';
  const passage = q.passage ? unit.texts?.find((t) => t.id === q.passage) : undefined;
  const model = isSentence(q) ? answerLines(q).join('  |  ') : '';
  const ideas = phase === 'judging' && isSentence(q) ? ideasFound(q, q.inputs.map((i) => values[i.id] ?? '').join(' ')) : null;
  const column = (
      <div class="narrow">
      <div class="bar" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuenow={idx} aria-valuemax={qs.length}>
        <i style={{ width: `${(idx / qs.length) * 100}%` }} />
      </div>
      <section class="card qcard" aria-labelledby="q-h">
        <div class="qmeta">
          <h2 id="q-h" style={{ fontSize: '17px', fontFamily: 'var(--body)' }}>
            Question {idx + 1} of {qs.length}
          </h2>
 {q.together ? (
            <span class="pill together">Together</span>
          ) : (
            <span>
              {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
            </span>
          )}
        </div>
        <QuestionBody q={q} values={values} onChange={setValue} disabled={finishedQ || phase === 'judging'} marks={grade?.perInput} messages={grade?.messages} reveal={phase === 'revealed'} idPrefix={`q${idx}`} />

        <div class="slot">
        {hintStep > 0 && phase !== 'right' && (
          <div class="hint" role="note">
            <p>
              <b>Hint 1:</b> {ladder[0]}
            </p>
            {hintStep > 1 && (
              <p>
                <b>Hint 2:</b> {ladder[1]}
              </p>
            )}
          </div>
        )}
        {another && phase !== 'right' && (
          <p class="hint" role="note">
            <b>Another way:</b> {another}
          </p>
        )}
        {msg && (
          <p class="live" role="alert">
            {msg}
          </p>
        )}

        {phase === 'wrong' && grade && (
          <div class="verdict wrong" ref={verdictRef} tabIndex={-1} role="status">
            <h2><Feedback ok={false} /></h2>
            <p class="body">{grade.messages.find(Boolean) ?? 'Have another go. A hint can help.'}</p>
          </div>
        )}
        {phase === 'wrong' && !grade && (
          <p class="live" role="status">
            You changed your answer. Press Check my answer to see if it is right.
          </p>
        )}
        {phase === 'right' && (
          <div class="verdict right" ref={verdictRef} tabIndex={-1} role="status">
            <h2><Feedback ok /></h2>
            <p class="body">{tries === 0 && !hinted ? 'A star for you.' : 'Well done for sticking with it.'}</p>
            <details class="how">
              <summary>How it works</summary>
              <ol class="steps">
                {q.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </details>
          </div>
        )}
        {phase === 'revealed' && (
          <div class="verdict neutral" ref={verdictRef} tabIndex={-1} role="status">
            <h2>Here is the answer</h2>
            <p class="body">
              <b>{answerLines(q).join('  |  ')}</b>
            </p>
            <ol class="steps">
              {q.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
        {phase === 'asked' && (
          <div class="verdict neutral" ref={verdictRef} tabIndex={-1} role="status">
            <h2>{q.together ? 'Do it together' : 'Ask a grown-up'}</h2>
            <p class="body">{q.together ? 'Do this with a grown-up. It is not marked, so there are no stars to win or lose.' : 'This one has no single right answer, so a grown-up checks it with you.'}</p>
          </div>
        )}
        {phase === 'judging' && (
          <div class="verdict neutral judge" ref={verdictRef} tabIndex={-1} role="status">
            <h2>Compare with the model answer</h2>
            <p class="model">
              <b>Model answer:</b> {model}
            </p>
            {suggestion === 'asking' && <p class="ai">Claude is reading your answer…</p>}
            {suggestion && suggestion !== 'asking' && (
              <p class="ai">
                <small>Claude's suggestion (the grown-up decides)</small>
                <b>{suggestion.verdict === 'right' ? 'Looks right.' : 'Not quite there yet.'}</b> {suggestion.comment}
              </p>
            )}
            {ideas && (
              <p class="ai">
                <small>Found by the app (the grown-up decides)</small>
                <b>{ideas.found.length} of {ideas.of} ideas found</b>{ideas.found.length > 0 ? `: ${ideas.found.join(', ')}` : ''}.
              </p>
            )}
            <p class="body">Grown-up: does the answer have the right idea? Small spelling slips are fine.</p>
          </div>
        )}
        {phase === 'notyet' && (
          <div class="verdict neutral" ref={verdictRef} tabIndex={-1} role="status">
            <h2>Not yet. Have another look</h2>
            <p class="body">
              <b>Model answer:</b> {model}
            </p>
            <ol class="steps">
              {q.steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}

        </div>

        <div class="actions">
          {phase === 'judging' && (
            <>
              <button class="btn primary" onClick={() => decide(true)}>
                Count it as right
              </button>
              <button class="btn" onClick={() => decide(false)}>
                Not yet
              </button>
            </>
          )}
          {!finishedQ && phase !== 'judging' && !open && (
            <button class="btn primary" onClick={check}>
              Check my answer
            </button>
          )}
          {!finishedQ && open && (
            <button class="btn primary" onClick={ask}>
              {q.together ? 'Done together' : 'Done: ask a grown-up'}
            </button>
          )}
          {!finishedQ && phase !== 'judging' && !q.together && hintStep < 2 && (
            <button
              class="btn"
              onClick={() => {
                setHintStep(hintStep + 1);
                setHinted(true);
              }}
            >
              {hintStep === 0 ? 'Show a hint' : 'Show another hint'}
            </button>
          )}
          {phase === 'wrong' && explain && !aiGone && !another && (
            <button
              class="btn"
              disabled={asking}
              onClick={async () => {
                setAsking(true);
                const wrong = q.inputs.map((i) => values[i.id] ?? '').join(' ; ');
                const text = await explain(q, wrong);
                setAsking(false);
                if (text) {
                  setAnother(text);
                  setHinted(true);
                } else setAiGone(true);
              }}
            >
              {asking ? 'Thinking…' : 'Explain it another way'}
            </button>
          )}
          {phase === 'wrong' && (
            <button class="btn quiet" onClick={reveal}>
              Show me the answer
            </button>
          )}
          {finishedQ && (
            <button class="btn primary" onClick={next}>
              {idx + 1 >= qs.length ? 'See my stars' : 'Next question'}
            </button>
          )}
        </div>
      </section>
      <ul class="dots" aria-label="Questions">
        {qs.map((_, i) => (
          <li key={i} class={i === idx ? 'now' : done[i] === true ? 'done' : done[i] === false ? 'miss' : ''} aria-label={`Question ${i + 1}: ${i === idx ? 'now' : done[i] === true ? 'done' : done[i] === false ? 'missed' : 'to do'}`}>
            {i + 1}
          </li>
        ))}
      </ul>
      </div>
  );
  return (
    <>
      {head}
      {passage ? (
        <div class="with-passage">
          <PassageView passage={passage} level={3} compact idPrefix={`p${idx}`} />
          {column}
        </div>
      ) : (
        column
      )}
    </>
  );
}

export { Diagram, Badge };
