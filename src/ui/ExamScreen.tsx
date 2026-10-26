import { ideasFound } from '../core/ideas';
import { fmtMark, markText } from '../core/markText';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Passage } from '../core/question';
import type { Exam } from '../core/exam';
import { scoreExam } from '../core/examMark';
import { formatClock, type Values } from '../core/practice';
import type { TestResult } from '../core/progress';
import type { TestState } from '../core/session';
import { Back } from './Back';
import { QuestionBody } from './Answer';
import { PassageView } from './Passage';
import { isPersonal, needsGrownUp } from '../core/kinds';
import type { ExamMarkSuggestion } from '../core/aiMark';
import type { PaperQuestion } from '../core/exam';

export interface ExamState extends TestState {
  manual?: Record<string, number>;
}

interface Props {
  exam: Exam;
  onBack(): void;
  onPrint(): void;
  onAgain(): void;
  onResult(r: TestResult): void;
  initial?: ExamState;
  /** null = the exam is over, forget the saved copy */
  onState?(s: ExamState | null): void;
  /** Claude's suggested mark for a written answer (English). Undefined when off or unavailable. */
  suggest?: Suggest;
  /** the grown-up gave a mark to a written answer (for the activity log) */
  onMark?(q: PaperQuestion, mark: number): void;
}

export type Suggest = (q: PaperQuestion, answer: string, max: number, passage?: Passage) => Promise<ExamMarkSuggestion | undefined>;

const marksWords = (s: string): string => s.replace(/x/g, ' × ').replace(/=/g, ' = ');

export function ExamScreen({ exam, onBack, onPrint, onAgain, onResult, initial, onState, suggest, onMark }: Props) {
  const total = exam.minutes * 60;
  const [phase, setPhase] = useState<'intro' | 'running' | 'done'>(initial?.running ? 'running' : 'intro');
  const [answers, setAnswers] = useState<Record<string, Values>>(initial?.answers ?? {});
  const [manual, setManual] = useState<Record<string, number>>(initial?.manual ?? {});
  const [left, setLeft] = useState(initial?.running ? initial.left : total);
  const [confirm, setConfirm] = useState(false);
  const started = useRef(initial?.running ? Date.now() - (total - initial.left) * 1000 : 0);
  const leftRef = useRef(left);
  const answersRef = useRef(answers);
  const doneRef = useRef(false);
  const spent = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  answersRef.current = answers;
  leftRef.current = left;

  const questions = useMemo(() => exam.sections.flatMap((s) => s.questions), [exam]);
  const unanswered = questions.filter((q) => q.inputs.some((i) => !(answers[q.id]?.[i.id] ?? '').trim())).length;

  const handIn = (seconds: number) => {
    const m = scoreExam(exam, answersRef.current);
    spent.current = seconds;
    doneRef.current = true;
    onState?.(null);
    setPhase('done');
    setConfirm(false);
    onResult({
      date: new Date().toISOString(),
      unitId: exam.unitsUsed.length === 1 ? String(exam.unitsUsed[0]).padStart(2, '0') : 'exam',
      label: `${exam.header.examination} (${exam.code})`,
      got: m.total,
      of: m.outOf,
      seconds,
      sections: m.perSection.map((s) => ({ title: `Q${s.number} ${s.title}`, got: s.awarded, of: s.marks })),
    });
  };

  useEffect(() => {
    if (phase !== 'running') return;
    const t = setInterval(() => {
      const remaining = total - (Date.now() - started.current) / 1000;
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(t);
        handIn(total);
      }
    }, 500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running' || !onState) return;
    const t = setTimeout(() => onState({ answers: answersRef.current, left: leftRef.current, running: true }), 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, phase]);
  useEffect(() => {
    if (phase !== 'running' || !onState) return;
    const save = () => !doneRef.current && onState({ answers: answersRef.current, left: leftRef.current, running: true });
    const t = setInterval(save, 10000);
    return () => {
      clearInterval(t);
      if (leftRef.current > 0) save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo(0, 0);
  }, [phase]);

  const setValue = (id: string) => (inputId: string, v: string) => setAnswers((a) => ({ ...a, [id]: { ...(a[id] ?? {}), [inputId]: v } }));

  if (phase === 'intro') {
    return (
      <>
        <Back onClick={onBack}>Back</Back>
        <section class="card paper" aria-labelledby="t-h">
          <h1 id="t-h" class="page" tabIndex={-1} ref={heading} style={{ fontSize: '32px' }}>
            {exam.header.examination}
          </h1>
          <p>
            {exam.totalMarks} marks, {exam.minutes} minutes, {questions.length} questions. Answer on screen. You see your marks and the model answers at the end.
          </p>
          <ul>
            {exam.marksTable.map((r) => (
              <li key={r.question}>
                {r.question} · {r.title}: {marksWords(r.label)}
              </li>
            ))}
          </ul>
          <p>
            <span class="pill">Exam code {exam.code}</span>
          </p>
          <p class="note">The clock starts when you press Start. When it reaches zero the paper is handed in for you. If you leave, the clock waits.</p>
          <div class="actions">
            <button
              class="btn primary"
              onClick={() => {
                started.current = Date.now();
                setPhase('running');
              }}
            >
              Start the paper
            </button>
            <button class="btn" onClick={onPrint}>
              Get this paper as PDF instead
            </button>
          </div>
        </section>
      </>
    );
  }

  if (phase === 'running') {
    return (
      <>
        <div class="timer">
          <div>
            <span class="qmeta">Time left</span>{' '}
            <span class={`clock ${left < 300 ? 'low' : ''}`} role="timer" aria-live="off">
              {formatClock(left)}
            </span>
          </div>
          <span class="live" role="status" aria-live="polite">
            {left <= 60 ? 'One minute left.' : left <= 300 && left > 295 ? 'Five minutes left.' : ''}
          </span>
          <span class="qmeta">
            {questions.length - unanswered} of {questions.length} answered
          </span>
        </div>
        <h1 class="page" tabIndex={-1} ref={heading} style={{ fontSize: '28px' }}>
          {exam.header.examination}
        </h1>
        <form class="paper" onSubmit={(e) => e.preventDefault()}>
          {exam.sections.map((s) => (
            <section key={s.number} class="paper" aria-labelledby={`sec${s.number}`}>
              {s.part && (
                <h2 class="partbar">
                  Section {s.part.label}: {s.part.title} <span class="qmeta">{fmtMark(s.part.marks)} marks</span>
                </h2>
              )}
              <h2 id={`sec${s.number}`}>
                Q{s.number}. {s.title} <span class="qmeta">{marksWords(s.marksLabel)} marks</span>
              </h2>
              {s.instruction && <p class="lede">{s.instruction}</p>}
              {s.passage && <PassageView passage={s.passage} level={3} idPrefix={`pass${s.number}`} />}
              {s.questions.map((q, i) => (
                <div class="card qcard" key={q.id}>
                  {q.lead && <p class={q.alt ? 'exam-or' : 'exam-lead'}>{q.lead}</p>}
                  <p class="qmeta">
                    {s.questions.length > 1 ? `Q${s.number} (${q.label})` : `Q${s.number}`} · {markText(q.marks)}
                  </p>
                  <QuestionBody q={q} values={answers[q.id] ?? {}} onChange={setValue(q.id)} idPrefix={`x${s.number}-${i}`} />
                </div>
              ))}
            </section>
          ))}
        </form>
        <div class="card qcard">
          {!confirm ? (
            <button class="btn primary" onClick={() => (unanswered > 0 ? setConfirm(true) : handIn(Math.round((Date.now() - started.current) / 1000)))}>
              Hand in my paper
            </button>
          ) : (
            <>
              <p role="alert">
                <b>{unanswered}</b> {unanswered === 1 ? 'question has' : 'questions have'} a blank box. Hand in anyway?
              </p>
              <div class="actions">
                <button class="btn primary" onClick={() => handIn(Math.round((Date.now() - started.current) / 1000))}>
                  Yes, hand in
                </button>
                <button class="btn" onClick={() => setConfirm(false)}>
                  No, keep going
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  return <ExamResults suggest={suggest} onMark={onMark} exam={exam} answers={answers} manual={manual} setManual={setManual} seconds={spent.current} heading={heading} onBack={onBack} onPrint={onPrint} onAgain={onAgain} />;
}

interface ResultsProps {
  suggest?: Suggest;
  onMark?(q: PaperQuestion, mark: number): void;
  exam: Exam;
  answers: Record<string, Values>;
  manual: Record<string, number>;
  setManual(m: Record<string, number>): void;
  seconds: number;
  heading: { current: HTMLHeadingElement | null };
  onBack(): void;
  onPrint?(): void;
  onAgain(): void;
}

/** Marks per question and per section, model answers, marking points and grown-up marks. Also used for papers typed in from paper. */
export function ExamResults({ suggest, onMark, exam, answers, manual, setManual, seconds, heading, onBack, onPrint, onAgain }: ResultsProps) {
  const score = scoreExam(exam, answers, manual);
  const keyOf = new Map(exam.key.map((k) => [k.id, k]));
  const markOf = new Map(score.perQuestion.map((p) => [p.id, p]));
  return (
    <>
      <Back onClick={onBack}>Back</Back>
      <section class="card paper" aria-labelledby="r-h">
        <h1 id="r-h" tabIndex={-1} ref={heading} style={{ fontSize: '28px' }}>
          Your marks
        </h1>
        <p class="score">
          {score.total} / {score.outOf}
        </p>
        <p class="lede">
          {score.percent}%{seconds > 0 ? ` · Time used: ${formatClock(seconds)} of ${exam.minutes}:00` : ''}
        </p>
        <div class="scroll-x">
          <table class="tbl">
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Section</th>
                <th scope="col">Marks</th>
              </tr>
            </thead>
            <tbody>
              {score.perSection.map((s) => (
                <tr key={s.number}>
                  <th scope="row" style={{ textTransform: 'none', fontSize: '17px', color: 'var(--ink)' }}>
                    Q{s.number}
                  </th>
                  <td>{s.title}</td>
                  <td>
                    {fmtMark(s.awarded)} / {fmtMark(s.marks)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="actions">
          <button class="btn primary" onClick={onAgain}>
            Try a new paper
          </button>
          {onPrint && (
            <button class="btn" onClick={onPrint}>
              Get this paper as PDF
            </button>
          )}
          <button class="btn" onClick={onBack}>
            Back
          </button>
        </div>
      </section>
      {score.pending && score.pending.length > 0 && (
        <p class="note" role="status">
          {score.pending.length} written {score.pending.length === 1 ? 'answer waits' : 'answers wait'} for a grown-up's mark. Give each a mark below (Claude can suggest one, you decide). The total counts them once marked.
        </p>
      )}
      <section class="paper" aria-label="Model answers">
        {exam.sections.map((s) => (
          <section key={s.number} class="paper">
            <h2>
              Q{s.number}. {s.title}
              {s.chooseBest && <span class="qmeta"> · the best {s.chooseBest} answers count</span>}
              {s.eitherOr && <span class="qmeta"> · the better of the two choices counts</span>}
            </h2>
            {s.passage && <PassageView passage={s.passage} level={3} idPrefix={`respass${s.number}`} fold />}
            {s.questions.map((q) => {
              const m = markOf.get(q.id)!;
              const k = keyOf.get(q.id)!;
              return (
                <div class="card qcard" key={q.id}>
                  {q.lead && <p class={q.alt ? 'exam-or' : 'exam-lead'}>{q.lead}</p>}
                  <p class="qmeta">
                    {s.questions.length > 1 ? `Q${s.number} (${q.label})` : `Q${s.number}`} · {fmtMark(m.awarded)} of {markText(q.marks)}
                    <span class={`badge ${m.status === 'right' ? 'right' : 'wrong'}`}>{needsGrownUp(q) && manual[q.id] === undefined && m.status !== 'blank' ? 'Waiting for a grown-up’s mark' : m.status === 'right' ? 'Right' : m.status === 'partial' ? 'Part right' : m.status === 'blank' ? 'Not answered' : 'Not quite'}</span>
                    {(s.chooseBest || s.eitherOr) && m.counted === false && <span class="badge">Not counted</span>}
                  </p>
                  <QuestionBody q={q} values={answers[q.id] ?? {}} onChange={() => {}} disabled marks={m.perInput} messages={m.messages.map((x) => x || undefined)} idPrefix={`res-${q.id}`} />
                  <div class={`verdict ${m.status === 'right' ? 'right' : 'neutral'}`}>
                    <h2>Model answer</h2>
                    <p class="body">
                      <b>{k.answers.join('  |  ')}</b>
                    </p>
                    <ol class="steps">
                      {k.steps.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ol>
                    <details>
                      <summary style={{ minHeight: '44px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 800 }}>Marking points</summary>
                      <ul class="steps">
                        {k.markingPoints.map((p, i) => (
                          <li key={i}>
                            {p.text} ({fmtMark(p.marks)})
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                  {needsGrownUp(q) && <IdeasLine q={q} answer={Object.values(answers[q.id] ?? {}).join(' ')} />}
                  {exam.subject === 'evs' && isPersonal(q) && <p class="suggest"><b>Value-based answer.</b> Only a grown-up gives the mark: there is no right answer and no suggested mark.</p>}
                  {suggest && needsGrownUp(q) && !(exam.subject === 'evs' && isPersonal(q)) && <SuggestRow q={q} answer={Object.values(answers[q.id] ?? {}).join(' ')} passage={s.passage} suggest={suggest} onUse={(mark) => {
                    setManual({ ...manual, [q.id]: mark });
                    onMark?.(q, mark);
                  }} />}
                  <div class="field">
                    <label for={`gm-${q.id}`}>Grown-up marks (0 to {fmtMark(q.marks)}), for working that earns marks</label>
                    <input
                      id={`gm-${q.id}`}
                      class="txt"
                      style={{ maxWidth: '120px' }}
                      type="number"
                      inputMode="decimal"
                      step={0.5}
                      min={0}
                      max={q.marks}
                      value={manual[q.id] ?? ''}
                      onInput={(e) => {
                        const v = (e.target as HTMLInputElement).value;
                        const next = { ...manual };
                        if (v === '') delete next[q.id];
                        else {
                          next[q.id] = Math.min(q.marks, Math.max(0, Number(v)));
                          onMark?.(q, next[q.id]!);
                        }
                        setManual(next);
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </section>
    </>
  );
}

/** "2 of 3 ideas found": counted by the app from the accepted ideas, only a suggestion for the grown-up. */
function IdeasLine({ q, answer }: { q: PaperQuestion; answer: string }) {
  const ideas = ideasFound(q, answer);
  if (!ideas) return null;
  return (
    <p class="suggest">
      <b>{ideas.found.length} of {ideas.of} ideas found</b>{ideas.found.length > 0 ? `: ${ideas.found.join(', ')}` : ''}. Suggested mark {fmtMark(ideas.mark)} of {fmtMark(q.marks)}. You decide.
    </p>
  );
}

/** Claude's suggested mark for one written answer: a suggestion the grown-up can use or change, never the final mark. */
function SuggestRow({ q, answer, passage, suggest, onUse }: { q: PaperQuestion; answer: string; passage?: Passage; suggest: Suggest; onUse(mark: number): void }) {
  const [state, setState] = useState<ExamMarkSuggestion | 'asking' | 'none'>();
  if (!answer.trim()) return null;
  return (
    <div class="suggest">
      {state === undefined && (
        <button
          class="btn"
          onClick={async () => {
            setState('asking');
            const r = await suggest(q, answer, q.marks, passage);
            setState(r ?? 'none');
          }}
        >
          Ask Claude to suggest a mark
        </button>
      )}
      {state === 'asking' && <p class="live" role="status">Claude is reading the answer…</p>}
      {state === 'none' && <p class="lede">No suggestion this time. Compare the answer with the model answer and give the mark yourself.</p>}
      {state && typeof state === 'object' && (
        <>
          <p>
            <b>
              Claude suggests {fmtMark(state.mark)} of {fmtMark(q.marks)}.
            </b>{' '}
            {state.comment}
          </p>
          <div class="actions">
            <button class="btn" onClick={() => onUse(state.mark)}>
              Use {state.mark} as the mark
            </button>
            <span class="lede">You decide: change the number below if you disagree.</span>
          </div>
        </>
      )}
    </div>
  );
}
