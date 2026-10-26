import type { PaperQuestion } from '../core/exam';
import { questionHash } from '../core/sheet';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { answerLines, gradePaper, hintFor, isComplete, isOpen, isSentence, markPaper, starsFor, tickedByGrownUp, type Grade, type Values } from '../core/practice';
import type { SubjectId, UnitDef } from '../core/question';
import type { TestResult } from '../core/progress';
import { questionsFingerprint, STALE_SHEET_MESSAGE } from '../core/fingerprint';
import { flatQuestions, newSaved, statusFor, unitLabel, type SavedSheet, type Worksheet } from '../core/worksheet';
import { resolveAnyCode as resolveCode } from '../core/examSheet';
import { scoreExam } from '../core/examMark';
import { ExamResults, type Suggest } from './ExamScreen';
import { QuestionBody } from './Answer';
import { Diagram } from './Diagram';
import { Back } from './Back';

interface Props {
  units: UnitDef[];
  kidName?: string;
  kidId?: string;
  saved: SavedSheet[];
  startCode?: string;
  onBack(): void;
  onSave(s: SavedSheet): Promise<void> | void;
  onChecked(w: Worksheet, outcomes: { typeId: string; correct: boolean; level?: string; q?: string }[], test?: TestResult): void;
  onPickKid(): void;
  onPrintAgain(w: Worksheet): void;
  /** tells the app which book the loaded sheet is from, so the accent matches */
  onSubject?(s: SubjectId): void;
  /** Claude's suggested mark for a written answer in an English paper. */
  suggest?: Suggest;
  onMark?(q: PaperQuestion, mark: number): void;
}

const when = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const STATUS_TEXT = { 'not started': 'Not started', 'half done': 'Half done', checked: 'Checked' } as const;

/** Paper first: the kid did the sheet on paper, then types the answers here. Marking is the same as on-screen practice. */
export function EnterAnswers({ units, kidName, kidId, saved, startCode, onBack, onSave, onChecked, onPickKid, onPrintAgain, onSubject, suggest, onMark }: Props) {
  const first = startCode ? resolveCode(startCode, units) : undefined;
  const [typed, setTyped] = useState(startCode ?? '');
  const [error, setError] = useState(first && !first.ok ? first.message : '');
  const [sheet, setSheet] = useState<Worksheet | undefined>(first?.ok ? first.sheet : undefined);
  // saved answers belong to the questions they were typed against: made from an older bank, they are not loaded
  const matching = (s: SavedSheet | undefined, w: Worksheet): SavedSheet | undefined => (s && (!s.fp || s.fp === questionsFingerprint(flatQuestions(w))) ? s : undefined);
  const stale = (s: SavedSheet | undefined, w: Worksheet): boolean => Boolean(s && !matching(s, w));
  const [answers, setAnswers] = useState<Record<string, Values>>(() => (first?.ok ? matching(saved.find((s) => s.code === first.sheet.code), first.sheet)?.answers ?? {} : {}));
  const [grownUp, setGrownUp] = useState<Record<string, boolean>>({});
  const [grades, setGrades] = useState<Grade[]>();
  const [msg, setMsg] = useState(() => (first?.ok && stale(saved.find((s) => s.code === first.sheet.code), first.sheet) ? STALE_SHEET_MESSAGE : ''));
  const [examDone, setExamDone] = useState(false);
  const [manual, setManual] = useState<Record<string, number>>({});
  const top = useRef<HTMLHeadingElement>(null);

  const open = (code: string, savedSheet?: SavedSheet) => {
    const r = resolveCode(code, units);
    if (!r.ok) return setError(r.message);
    setError('');
    const found = savedSheet ?? saved.find((x) => x.code === r.sheet.code);
    const old = stale(found, r.sheet);
    const s = matching(found, r.sheet);
    setSheet(r.sheet);
    setAnswers(s?.answers ?? {});
    setGrownUp(s?.grownUp ?? {});
    setGrades(undefined);
    setExamDone(false);
    setManual({});
    setMsg(old ? STALE_SHEET_MESSAGE : s?.status === 'checked' ? 'You checked this sheet before. You can change answers and check again.' : '');
    setTimeout(() => top.current?.focus(), 0);
  };

  const qs = useMemo(() => (sheet ? flatQuestions(sheet) : []), [sheet]);
  useEffect(() => {
    onSubject?.(sheet && sheet.unit.subject === 'english' ? 'english' : 'maths');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  if (!sheet) {
    return (
      <>
        <Back onClick={onBack}>Back</Back>
        <header class="u-body" style={{ gap: '6px' }}>
          <h1 class="page" tabIndex={-1} id="page-h">
            Enter answers from paper
          </h1>
          <p class="lede">Do the sheet on paper first. Then type your answers here and the app marks them.</p>
        </header>
        {!kidId && (
          <p class="note">
            Pick a kid so the sheet and the stars are saved. <button class="btn" onClick={onPickKid}>Add or pick a kid</button>
          </p>
        )}
        <section class="card" aria-labelledby="which-h">
          <h2 id="which-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
            Which printed worksheet?
          </h2>
          {saved.length === 0 ? (
            <p class="lede">{kidName ? `${kidName} has` : 'There are'} no printed worksheets yet. Print one, or type its code below.</p>
          ) : (
            <ul class="kidlist">
              {saved.map((s) => (
                <li key={s.id}>
                  <span class="grow">
                    <b>{s.title}</b>
                    <br />
                    <small class="lede">
                      Code {s.code} · printed {when(s.printedAt)} · {STATUS_TEXT[s.status]}
                      {s.best !== undefined ? ` · best ${s.best}/${s.bestOf}` : ''}
                    </small>
                  </span>
                  <button class="btn primary" onClick={() => open(s.code, s)}>
                    {s.status === 'checked' ? 'Open again' : 'Enter answers'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section class="card" aria-labelledby="code-h">
          <h2 id="code-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
            Or type the code on the sheet
          </h2>
          <form
            class="kidform"
            onSubmit={(e) => {
              e.preventDefault();
              open(typed);
            }}
          >
            <div class="field">
              <label for="ws-code">Worksheet code, for example M01-MED-4F7K or E01-MED-4F7K</label>
              <input id="ws-code" class="txt" style={{ maxWidth: '300px', textTransform: 'uppercase' }} value={typed} autocomplete="off" autocapitalize="characters" spellcheck={false} onInput={(e) => setTyped((e.target as HTMLInputElement).value)} />
            </div>
            <button class="btn primary" type="submit">
              Open the sheet
            </button>
          </form>
          {error && (
            <p class="live" role="alert" style={{ color: 'var(--bad)' }}>
              {error}
            </p>
          )}
        </section>
      </>
    );
  }

  const answeredCount = qs.filter((q, i) => (tickedByGrownUp(q) ? grownUp[i] : q.inputs.some((inp) => (answers[i]?.[inp.id] ?? '').trim() !== ''))).length;
  const setValue = (i: number) => (id: string, v: string) => {
    setAnswers((a) => ({ ...a, [i]: { ...(a[i] ?? {}), [id]: v } }));
    if (grades) setGrades(undefined);
  };
  const blank = (): SavedSheet => saved.find((s) => s.code === sheet.code) ?? newSaved(kidId ?? 'guest', sheet.code, sheet.title, new Date().toISOString());

  const persist = async (patch: Partial<SavedSheet>) => {
    if (!kidId) return;
    const base = matching(blank(), sheet) ?? newSaved(kidId, sheet.code, sheet.title, new Date().toISOString());
    const next = { ...base, answers, grownUp, fp: questionsFingerprint(qs), ...patch };
    next.status = patch.status ?? statusFor(next);
    await onSave(next);
  };

  const printAgain = async () => {
    await persist({});
    onPrintAgain(sheet);
  };

  const saveLater = async () => {
    await persist({});
    setSheet(undefined);
    setGrades(undefined);
  };

  const check = async () => {
    const missing = qs.findIndex((q, i) => !tickedByGrownUp(q) && !isComplete(q, answers[i] ?? {}));
    if (missing >= 0) {
      setMsg(`Question ${missing + 1} still has an empty box. Fill every box, or press Save and finish later.`);
      document.getElementById(`ans-${missing}`)?.scrollIntoView({ block: 'center' });
      return;
    }
    setMsg('');
    if (sheet.exam) {
      const ex = sheet.exam;
      const byId = Object.fromEntries(qs.map((q, i) => [(q as { id?: string }).id ?? String(i), answers[i] ?? {}]));
      const sc = scoreExam(ex, byId, manual);
      const previous0 = blank();
      const better0 = previous0.best === undefined || sc.total * (previous0.bestOf ?? 1) > (previous0.best ?? 0) * sc.outOf;
      await persist({ status: 'checked', got: sc.total, of: sc.outOf, ...(better0 ? { best: sc.total, bestOf: sc.outOf } : {}) });
      if (previous0.status !== 'checked') {
        const test: TestResult = {
          date: new Date().toISOString(),
          unitId: ex.unitsUsed.length === 1 ? String(ex.unitsUsed[0]).padStart(2, '0') : 'exam',
          label: `${ex.header.examination} (${ex.code})`,
          got: sc.total,
          of: sc.outOf,
          seconds: 0,
          sections: sc.perSection.map((x) => ({ title: `Q${x.number} ${x.title}`, got: x.awarded, of: x.marks })),
        };
        onChecked(sheet, [], test);
      }
      setExamDone(true);
      return;
    }
    const gs = qs.map((q, i) => gradePaper(q, answers[i] ?? {}, Boolean(grownUp[i])));
    setGrades(gs);
    const scoredIdx = qs.map((q, i) => (isOpen(q) ? -1 : i)).filter((i) => i >= 0);
    const right = scoredIdx.filter((i) => gs[i]!.correct).length;
    const previous = blank();
    const first = previous.status !== 'checked';
    const better = previous.best === undefined || right * (previous.bestOf ?? 1) > (previous.best ?? 0) * scoredIdx.length;
    await persist({ status: 'checked', got: right, of: scoredIdx.length, ...(better ? { best: right, bestOf: scoredIdx.length } : {}) });
    if (first) {
      let test: TestResult | undefined;
      if (sheet.paper) {
        const m = markPaper(sheet.paper.sections, Object.fromEntries(sheet.paper.sections.flatMap((s, si) => s.questions.map((_, qi) => [`${si}.${qi}`, answers[qs.indexOf(s.questions[qi]!)] ?? {}]))), (si, qi) => `${si}.${qi}`);
        test = { date: new Date().toISOString(), unitId: sheet.unit.id, got: m.got, of: m.of, seconds: 0, sections: m.sections };
      }
      onChecked(sheet, scoredIdx.map((i) => ({ typeId: qs[i]!.typeId, correct: gs[i]!.correct === true, level: qs[i]!.level, q: questionHash(qs[i]!) })), test);
    }
    setTimeout(() => document.getElementById('results')?.focus(), 50);
  };

  if (sheet.exam && examDone) {
    const byId = Object.fromEntries(qs.map((q, i) => [(q as { id?: string }).id ?? String(i), answers[i] ?? {}]));
    return <ExamResults suggest={suggest} onMark={onMark} exam={sheet.exam} answers={byId} manual={manual} setManual={setManual} seconds={0} heading={top} onBack={() => setExamDone(false)} onAgain={() => setSheet(undefined)} />;
  }
  const scored = qs.filter((q) => !isOpen(q)).length;
  const right = grades ? qs.filter((q, i) => !isOpen(q) && grades[i]?.correct).length : 0;
  const stars = starsFor(right, Math.max(1, scored));
  let n = 0;
  return (
    <>
      <Back onClick={() => setSheet(undefined)}>All worksheets</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <p class="qmeta">{sheet.exam ? 'Exam' : `${sheet.unit.subject === 'english' ? 'English · ' : sheet.unit.subject === 'evs' ? 'EVS · ' : ''}${unitLabel(sheet.unit)}`}</p>
        <h1 class="page" tabIndex={-1} ref={top} id="page-h" style={{ fontSize: 'clamp(28px, 7vw, 40px)' }}>
          Enter answers from paper
        </h1>
        <p class="lede">
          {sheet.title} · {qs.length} questions
        </p>
        <p class="row">
          <span class="pill">{sheet.exam ? 'Exam code' : 'Worksheet code'} {sheet.code}</span>
          <button class="btn" onClick={printAgain}>
            Print again
          </button>
        </p>
      </header>
      <p class="note">Type each answer here. The question is shown so you can find it on your sheet.</p>

      {grades && (
        <section class="card qcard" id="results" tabIndex={-1} aria-labelledby="res-h">
          <h2 id="res-h">{kidName ? `Well done, ${kidName}!` : 'Well done!'}</h2>
          <p class="score">
            {right} / {scored}
          </p>
          <p>
            <span class="stars" aria-hidden="true">
              {'★'.repeat(stars)}
              {'☆'.repeat(3 - stars)}
            </span>{' '}
            <b>{stars} of 3 stars</b>
          </p>
          {!kidId && <p class="note">Pick a kid at the top to save the sheet and the stars.</p>}
          <p class="lede">Look at the questions marked Not quite. Each has a hint and the worked answer.</p>
        </section>
      )}

      <form
        class="paper"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Answer sheet"
      >
        {sheet.sections.map((sec, si) => (
          <section key={si} class="paper">
            {sec.title && <h2>{sec.title}</h2>}
            {sec.questions.map((q) => {
              const i = n++;
              const g = grades?.[i];
              const ok = g?.correct;
              return (
                <div class="card arow" id={`ans-${i}`} key={i}>
                  <div class="anum" aria-hidden="true">
                    {i + 1}
                  </div>
                  <div class="qcard grow">
                    <p class="qmeta">
                      Question {i + 1} · {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                      {g && !isOpen(q) && <span class={`badge ${ok ? 'right' : 'wrong'}`}>{ok ? 'Right' : 'Not quite'}</span>}
                    </p>
                    {tickedByGrownUp(q) ? (
                      <>
                        <p class="prompt">{q.prompt}</p>
                        {q.together && <span class="pill together">Together · not marked</span>}
                        {q.diagram && <Diagram spec={q.diagram} />}
                        {isSentence(q) && (
                          <details>
                            <summary style={{ minHeight: '44px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 800 }}>Model answer (for the grown-up)</summary>
                            <p class="body">{answerLines(q).join('  |  ')}</p>
                          </details>
                        )}
                        <label class="check">
                          <input
                            id={`gu-${i}`}
                            type="checkbox"
                            checked={Boolean(grownUp[i])}
                            onChange={(e) => {
                              setGrownUp((o) => ({ ...o, [i]: (e.target as HTMLInputElement).checked }));
                              if (grades) setGrades(undefined);
                            }}
                          />
                          {isSentence(q) ? 'A grown-up read it: the idea is right' : q.together ? 'Done together with a grown-up' : 'Checked by a grown-up'}
                        </label>
                      </>
                    ) : (
                      <QuestionBody q={q} values={answers[i] ?? {}} onChange={setValue(i)} marks={g?.perInput} messages={g?.messages} idPrefix={`e${i}`} />
                    )}
                    {g && ok === false && (
                      <div class="verdict wrong">
                        <p class="body">
                          <b>Hint:</b> {hintFor(q)}
                        </p>
                        <details>
                          <summary style={{ minHeight: '44px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 800 }}>Show the answer and the steps</summary>
                          <p class="body">
                            <b>{answerLines(q).join('  |  ')}</b>
                          </p>
                          <ol class="steps">
                            {q.steps.map((s, k) => (
                              <li key={k}>{s}</li>
                            ))}
                          </ol>
                        </details>
                      </div>
                    )}
                    {g && ok === true && (
                      <details>
                        <summary style={{ minHeight: '44px', display: 'flex', alignItems: 'center', cursor: 'pointer', fontWeight: 800, color: 'var(--ok)' }}>Right! See the steps</summary>
                        <ol class="steps">
                          {q.steps.map((s, k) => (
                            <li key={k}>{s}</li>
                          ))}
                        </ol>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </form>

      <div class="card actionbar">
        <span class="qmeta" role="status">
          {answeredCount} of {qs.length} answered
        </span>
        {msg && (
          <span class="live" role="alert">
            {msg}
          </span>
        )}
        <div class="actions">
          <button class="btn" onClick={saveLater} disabled={!kidId} title={kidId ? undefined : 'Pick a kid first'}>
            Save and finish later
          </button>
          <button class="btn primary" onClick={check}>
            Check my answers
          </button>
        </div>
      </div>
    </>
  );
}
