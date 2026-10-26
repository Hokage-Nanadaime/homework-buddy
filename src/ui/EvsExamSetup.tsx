import { useMemo, useState } from 'preact/hooks';
import { buildEvsExam, EVS_FORMATS, type EvsFormat } from '../app/evsExam';
import type { Exam, ExamHeader } from '../core/exam';
import type { SavedSession } from '../core/session';
import type { EvsChapterData } from '../subjects/evs/types';
import { Back } from './Back';

interface Props {
  data: EvsChapterData[];
  unfinished: SavedSession[];
  betterSeed(format: EvsFormat, chapters: number[], header?: Partial<ExamHeader>): string;
  onBack(): void;
  onPreview(exam: Exam): void;
  onTake(exam: Exam): void;
  onPaper(exam: Exam): void;
  onContinue(s: SavedSession): void;
  onDiscard(s: SavedSession): void;
}

const timeText = (m: number): string => (m >= 120 ? `${Math.floor(m / 60)} hours${m % 60 ? ` ${m % 60} minutes` : ''}` : `${m} minutes`);
const marksWords = (s: string): string => s.replace(/x/g, ' × ').replace(/=/g, ' = ');

/** Remembered between visits, so coming back from the preview keeps the same paper. */
let draft: { format: EvsFormat; chapters: number[]; seed: string; header: Partial<ExamHeader>; examination: string } | undefined;

export function EvsExamSetup({ data, unfinished, betterSeed, onBack, onPreview, onTake, onPaper, onContinue, onDiscard }: Props) {
  const d = draft;
  const [format, setFormat] = useState<EvsFormat>(d?.format ?? 'A');
  const [chapters, setChapters] = useState<number[]>(d?.chapters ?? EVS_FORMATS.A.pattern.defaultChapters);
  const [seed, setSeed] = useState(() => d?.seed ?? betterSeed('A', EVS_FORMATS.A.pattern.defaultChapters));
  const [header, setHeader] = useState<Partial<ExamHeader>>(d?.header ?? { session: '2026-27', className: 'III', subject: 'EVS', school: '' });
  const [examination, setExamination] = useState(d?.examination ?? '');
  const [sure, setSure] = useState<string>();
  draft = { format, chapters, seed, header, examination };
  const fmt = EVS_FORMATS[format];

  const pick = (f: EvsFormat, next: number[]) => {
    setFormat(f);
    setChapters(next);
    if (next.length > 0) setSeed(betterSeed(f, next));
  };
  const toggle = (n: number) => pick(format, chapters.includes(n) ? chapters.filter((x) => x !== n) : [...chapters, n].sort((a, b) => a - b));
  const result = useMemo(() => buildEvsExam({ format, chapters, seed, header: { ...header, school: header.school || undefined, examination: examination || fmt.examination } }, data), [format, chapters, seed, header, examination, data, fmt.examination]);
  const exam = result.ok ? result.exam : undefined;
  const set = (k: keyof ExamHeader) => (e: Event) => setHeader((h) => ({ ...h, [k]: (e.target as HTMLInputElement).value }));

  return (
    <>
      <Back onClick={onBack}>Back</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <h1 class="page" tabIndex={-1} id="page-h">
          EVS exam preparation
        </h1>
        <p class="lede">Make a practice paper like your school's EVS paper, from the chapters you choose. The book's own exercises come first.</p>
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

      <section class="card" aria-labelledby="vfmt-h">
        <h2 id="vfmt-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
          1. Choose the paper
        </h2>
        <div class="choices" role="radiogroup" aria-label="Paper format">
          {(['A', 'B'] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={format === f} aria-pressed={format === f} class="choice fmt" onClick={() => pick(f, EVS_FORMATS[f].pattern.defaultChapters)}>
              <span>
                <b>{EVS_FORMATS[f].title}</b>
                <br />
                <small>
                  {EVS_FORMATS[f].marks} marks · {timeText(EVS_FORMATS[f].minutes)} · {EVS_FORMATS[f].pattern.slots.length} questions
                </small>
                <small class="okbadge">Matches your school's paper</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section class="card" aria-labelledby="vport-h">
        <h2 id="vport-h" style={{ fontSize: '22px', marginBottom: '4px' }}>
          2. Choose what the paper covers
        </h2>
        <p class="lede" style={{ marginBottom: '10px' }}>
          Questions come only from the chapters you tick. If a chapter is missing something the paper needs, this page says which chapter to add.
        </p>
        <div class="actions" style={{ marginBottom: '10px' }}>
          <button class="btn" onClick={() => pick(format, fmt.pattern.defaultChapters)}>
            The chapters taught so far
          </button>
          <button class="btn" onClick={() => pick(format, data.map((c) => c.number))}>
            Every chapter
          </button>
          <button class="btn" onClick={() => setChapters([])}>
            Clear
          </button>
        </div>
        <fieldset class="field">
          <legend>EVS: We and Our World, chapters</legend>
          <ul class="chapters">
            {data.map((c) => (
              <li key={c.number}>
                <label class="chap">
                  <input id={`ev-${c.number}`} type="checkbox" checked={chapters.includes(c.number)} onChange={() => toggle(c.number)} />
                  <span>
                    <b>{c.number}.</b> {c.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <p class="lede" style={{ marginTop: '8px' }}>The chapters taught so far are an assumption (chapters 1 to 2 for the Periodic Test, 1 to 7 for the Term Exam) until you confirm them with the school.</p>
      </section>

      <section class="card" aria-labelledby="vhd-h">
        <h2 id="vhd-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
          3. Paper details
        </h2>
        <div class="kidform">
          <div class="field">
            <label for="ev-name">Name of examination</label>
            <input id="ev-name" class="txt" style={{ maxWidth: '280px' }} placeholder={fmt.examination} value={examination} onInput={(e) => setExamination((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label for="ev-session">Session</label>
            <input id="ev-session" class="txt" style={{ maxWidth: '160px' }} value={header.session ?? ''} onInput={set('session')} />
          </div>
          <div class="field">
            <label for="ev-school">School name (optional)</label>
            <input id="ev-school" class="txt" style={{ maxWidth: '280px' }} value={header.school ?? ''} onInput={set('school')} />
          </div>
          <div class="field">
            <label for="ev-class">Class</label>
            <input id="ev-class" class="txt" style={{ maxWidth: '120px' }} value={header.className ?? ''} onInput={set('className')} />
          </div>
        </div>
      </section>

      <section class="card qcard" aria-labelledby="vgo-h">
        <h2 id="vgo-h" style={{ fontSize: '22px' }}>
          {exam ? `${exam.header.examination} · EVS` : 'Your paper'}
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
                {exam.totalMarks} marks · {timeText(exam.minutes)} · {exam.sections.length} questions · answer key included
              </b>
            </p>
            <p>
              <span class="pill">Exam code {exam.code}</span>
            </p>
            <ul class="steps">
              {exam.marksTable.map((r) => (
                <li key={r.question}>
                  {r.question} · {r.title}: {marksWords(r.label)}
                </li>
              ))}
            </ul>
            <p class="note">Written answers are marked by a grown-up; the app counts the ideas it finds and Claude can suggest a mark. Value-based answers and the map are marked by the grown-up alone. Where the paper says "do any six", the best six count.</p>
          </>
        )}
        <div class="actions">
          <button class="btn primary" disabled={!exam} onClick={() => exam && onPreview(exam)}>
            Preview the paper
          </button>
          <button class="btn" disabled={!exam} onClick={() => exam && onTake(exam)}>
            Take it on screen with a timer
          </button>
          <button class="btn" disabled={!exam} onClick={() => exam && onPaper(exam)}>
            Enter answers from paper
          </button>
          <button class="btn" onClick={() => setSeed(betterSeed(format, chapters))}>
            New paper
          </button>
        </div>
      </section>
    </>
  );
}
