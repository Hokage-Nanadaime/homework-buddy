import { useMemo, useState } from 'preact/hooks';
import { buildExam, type Exam, type ExamHeader } from '../core/exam';
import { EXAM_FORMAT_LIST, type ExamFormatId } from '../core/examFormats';
import type { UnitDef } from '../core/question';
import type { SavedSession } from '../core/session';
import { Back } from './Back';

export interface ExamPick {
  exam: Exam;
}

interface Props {
  contents: { number: number; title: string }[];
  built: UnitDef[];
  /** unit to start with (from the unit page) */
  startUnit?: number;
  unfinished: SavedSession[];
  onBack(): void;
  /** the seed that repeats the fewest questions this kid has seen */
  betterSeed(format: ExamFormatId, units: number[], header?: Partial<ExamHeader>): string;
  onPreview(exam: Exam): void;
  onTake(exam: Exam): void;
  onPaper(exam: Exam): void;
  onContinue(s: SavedSession): void;
  onDiscard(s: SavedSession): void;
}

/** Remembered between visits to this screen, so coming back from the preview keeps the same paper. */
let draft: { format: ExamFormatId; units: number[]; seed: string; header: Partial<ExamHeader>; examination: string } | undefined;

const timeText = (m: number): string => (m >= 120 ? `${Math.floor(m / 60)} hours${m % 60 ? ` ${m % 60} minutes` : ''}` : `${m} minutes`);
const marksWords = (s: string): string => s.replace(/x/g, ' × ').replace(/=/g, ' = ');

export function ExamSetup({ contents, built, startUnit, unfinished, betterSeed, onBack, onPreview, onTake, onPaper, onContinue, onDiscard }: Props) {
  const open = built.map((u) => u.number);
  const d = startUnit ? undefined : draft;
  const [format, setFormat] = useState<ExamFormatId>(d?.format ?? 'A');
  const [units, setUnits] = useState<number[]>(d?.units ?? (startUnit ? [startUnit] : open.slice(0, 2)));
  const [seed, setSeed] = useState(() => d?.seed ?? betterSeed(d?.format ?? 'A', d?.units ?? (startUnit ? [startUnit] : open.slice(0, 2))));
  const fmt = EXAM_FORMAT_LIST.find((f) => f.id === format)!;
  const [header, setHeader] = useState<Partial<ExamHeader>>(d?.header ?? { session: '2026-27', className: 'III', subject: 'Mathematics', school: '' });
  const [examination, setExamination] = useState(d?.examination ?? '');
  draft = { format, units, seed, header, examination };
  const [sure, setSure] = useState<string>();

  const pickFormat = (id: ExamFormatId) => {
    setFormat(id);
    const next = id === 'U' && units.length > 1 ? units.slice(0, 1) : units;
    if (next !== units) setUnits(next);
    setSeed(betterSeed(id, next));
    setExamination('');
  };
  const toggle = (n: number) => {
    const next = format === 'U' ? [n] : units.includes(n) ? units.filter((x) => x !== n) : [...units, n].sort((a, b) => a - b);
    setUnits(next);
    if (next.length > 0) setSeed(betterSeed(format, next));
  };

  const result = useMemo(
    () =>
      buildExam(
        { format, units, seed, header: { ...header, school: header.school || undefined, examination: examination || fmt.defaultExamination } },
        built,
      ),
    [format, units, seed, header, examination, built, fmt.defaultExamination],
  );
  const exam = result.ok ? result.exam : undefined;
  const set = (k: keyof ExamHeader) => (e: Event) => setHeader((h) => ({ ...h, [k]: (e.target as HTMLInputElement).value }));

  return (
    <>
      <Back onClick={onBack}>Back</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <h1 class="page" tabIndex={-1} id="page-h">
          Exam preparation
        </h1>
        <p class="lede">Make a practice paper like your school's, from the units you choose.</p>
      </header>

      {unfinished.length > 0 && (
        <section class="card" aria-labelledby="unf-h">
          <h2 id="unf-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
            Unfinished papers
          </h2>
          <ul class="kidlist">
            {unfinished.map((s) => (
              <li key={s.id}>
                <span class="grow">
                  <b>{s.title}</b>
                  <br />
                  <small class="lede">Code {s.code}</small>
                </span>
                <button class="btn primary" onClick={() => onContinue(s)}>
                  Continue
                </button>
                {sure === s.id ? (
                  <>
                    <span role="alert">Throw away the answers so far?</span>
                    <button class="btn danger" onClick={() => onDiscard(s)}>
                      Yes, throw away
                    </button>
                    <button class="btn" onClick={() => setSure(undefined)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button class="btn quiet" onClick={() => setSure(s.id)}>
                    Start over
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class="card" aria-labelledby="fmt-h">
        <h2 id="fmt-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
          1. Choose the paper
        </h2>
        <div class="choices" role="radiogroup" aria-label="Paper format">
          {EXAM_FORMAT_LIST.map((f) => (
            <button key={f.id} type="button" role="radio" aria-checked={format === f.id} aria-pressed={format === f.id} class="choice fmt" onClick={() => pickFormat(f.id)}>
              <span>
                <b>{f.id === 'U' ? 'Unit test (one chapter)' : f.title}</b>
                <br />
                <small>
                  {f.totalMarks} marks · {timeText(f.minutes)} · {f.sections.reduce((n, x) => n + x.count, 0)} questions
                </small>
                <span class="fmtsecs">
                  {f.sections.map((x) => (
                    <small key={x.title}>
                      {x.title.startsWith('Section') ? x.title.split(':')[0]!.replace('Section ', '') + ' ' : `${x.title.replace(' questions', '')} `}
                      {x.count} × {x.marksEach}
                    </small>
                  ))}
                </span>
                {f.id === 'A' && <small class="okbadge">Matches your school's paper</small>}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section class="card" aria-labelledby="ch-h">
        <h2 id="ch-h" style={{ fontSize: '22px', marginBottom: '4px' }}>
          2. Choose the units
        </h2>
        <p class="lede" style={{ marginBottom: '10px' }}>
          Questions come only from the units you tick, spread across them. A 25-mark paper works best with up to about 3 units; more units mean fewer questions from each.
        </p>
        {format !== 'U' && (
          <div class="actions" style={{ marginBottom: '10px' }}>
            <button class="btn" onClick={() => setUnits(open)}>
              Select all
            </button>
            <button class="btn" onClick={() => setUnits([])}>
              Clear
            </button>
          </div>
        )}
        <ul class="chapters">
          {contents.map((c) => {
            const isOpen = open.includes(c.number);
            const on = units.includes(c.number);
            return (
              <li key={c.number}>
                <label class={`chap ${isOpen ? '' : 'soon'}`}>
                  {format === 'U' ? (
                    <input id={`ch-${c.number}`} type="radio" name="chapter" checked={on} disabled={!isOpen} onChange={() => toggle(c.number)} />
                  ) : (
                    <input id={`ch-${c.number}`} type="checkbox" name="chapter" checked={on} disabled={!isOpen} onChange={() => toggle(c.number)} />
                  )}
                  <span>
                    <b>{c.number}.</b> {c.title}
                    {!isOpen && <small> · Coming soon</small>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section class="card" aria-labelledby="hd-h">
        <h2 id="hd-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
          3. Paper details
        </h2>
        <div class="kidform">
          <div class="field">
            <label for="ex-name">Name of examination</label>
            <input id="ex-name" class="txt" style={{ maxWidth: '280px' }} placeholder={fmt.defaultExamination} value={examination} onInput={(e) => setExamination((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label for="ex-session">Session</label>
            <input id="ex-session" class="txt" style={{ maxWidth: '160px' }} value={header.session ?? ''} onInput={set('session')} />
          </div>
          <div class="field">
            <label for="ex-school">School name (optional)</label>
            <input id="ex-school" class="txt" style={{ maxWidth: '280px' }} value={header.school ?? ''} onInput={set('school')} />
          </div>
          <div class="field">
            <label for="ex-class">Class</label>
            <input id="ex-class" class="txt" style={{ maxWidth: '120px' }} value={header.className ?? ''} onInput={set('className')} />
          </div>
          <div class="field">
            <label for="ex-subject">Subject</label>
            <input id="ex-subject" class="txt" style={{ maxWidth: '200px' }} value={header.subject ?? ''} onInput={set('subject')} />
          </div>
        </div>
      </section>

      <section class="card qcard" aria-labelledby="go-h">
        <h2 id="go-h" style={{ fontSize: '22px' }}>
          {exam ? `${exam.header.examination} · ${exam.unitsUsed.length === 1 ? 'Unit' : 'Units'} ${exam.unitsUsed.join(', ')}` : 'Your paper'}
        </h2>
        {!result.ok && (
          <p class="note" role="alert">
            {result.message}
          </p>
        )}
        {exam && (
          <>
            <p>
              <b>
                {exam.totalMarks} marks · {timeText(exam.minutes)} · {exam.sections.length} sections · answer key included
              </b>
            </p>
            <p>
              <span class="pill">Exam code {exam.code}</span>{' '}
            </p>
            <ul class="steps">
              {exam.marksTable.map((r) => (
                <li key={r.question}>
                  {r.question} · {r.title}: {marksWords(r.label)}
                </li>
              ))}
            </ul>
            {exam.warnings.length > 0 && (
              <div class="note" role="status">
                <b>Please check:</b>
                <ul style={{ margin: '6px 0 0', paddingLeft: '20px' }}>
                  {exam.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            <div class="actions">
              <button class="btn primary" onClick={() => onPreview(exam)}>
                Preview the paper
              </button>
              <button class="btn" onClick={() => onTake(exam)}>
                Take it on screen with a timer
              </button>
              <button class="btn" onClick={() => onPaper(exam)}>
                Enter answers from paper
              </button>
              <button class="btn" onClick={() => setSeed(betterSeed(format, units))}>
                New paper
              </button>
            </div>
          </>
        )}
        {!exam && (
          <div class="actions">
            <button class="btn" onClick={() => setSeed(betterSeed(format, units))}>
              New paper
            </button>
          </div>
        )}
      </section>
    </>
  );
}
