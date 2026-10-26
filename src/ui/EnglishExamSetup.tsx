import { useMemo, useState } from 'preact/hooks';
import { buildEnglishExam, ENGLISH_FORMATS, REQUIRED_SECTIONS, type EnglishFormat } from '../app/englishExam';
import type { Exam, ExamHeader } from '../core/exam';
import type { SavedSession } from '../core/session';
import type { LessonData } from '../subjects/english/types';
import { Back } from './Back';

interface Item {
  number: number;
  title: string;
}

interface Props {
  data: LessonData[];
  reader: Item[];
  practice: Item[];
  unfinished: SavedSession[];
  betterSeed(format: EnglishFormat, units: number[], header?: Partial<ExamHeader>): string;
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
let draft: { format: EnglishFormat; units: number[]; seed: string; header: Partial<ExamHeader>; examination: string } | undefined;

/** The school portion: what the real papers drew on (Reader lesson 1 and Naming Words for the Periodic Test). */
const SCHOOL: Record<EnglishFormat, number[]> = { A: [1, 11], B: [1, 2, 3, 4, 11, 12, 13, 14, 15] };

export function EnglishExamSetup({ data, reader, practice, unfinished, betterSeed, onBack, onPreview, onTake, onPaper, onContinue, onDiscard }: Props) {
  const d = draft;
  const [format, setFormat] = useState<EnglishFormat>(d?.format ?? 'A');
  const [units, setUnits] = useState<number[]>(d?.units ?? SCHOOL.A);
  const [seed, setSeed] = useState(() => d?.seed ?? betterSeed('A', SCHOOL.A));
  const [header, setHeader] = useState<Partial<ExamHeader>>(d?.header ?? { session: '2026-27', className: 'III', subject: 'English', school: '' });
  const [examination, setExamination] = useState(d?.examination ?? '');
  const [sure, setSure] = useState<string>();
  draft = { format, units, seed, header, examination };
  const fmt = ENGLISH_FORMATS[format];

  const pick = (f: EnglishFormat, next: number[]) => {
    setFormat(f);
    setUnits(next);
    if (next.length > 0) setSeed(betterSeed(f, next));
  };
  const toggle = (n: number) => pick(format, units.includes(n) ? units.filter((x) => x !== n) : [...units, n].sort((a, b) => a - b));
  const result = useMemo(() => buildEnglishExam({ format, units, seed, header: { ...header, school: header.school || undefined, examination: examination || fmt.examination } }, data), [format, units, seed, header, examination, data, fmt.examination]);
  const exam = result.ok ? result.exam : undefined;
  const set = (k: keyof ExamHeader) => (e: Event) => setHeader((h) => ({ ...h, [k]: (e.target as HTMLInputElement).value }));
  const need = REQUIRED_SECTIONS[format];

  return (
    <>
      <Back onClick={onBack}>Back</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <h1 class="page" tabIndex={-1} id="page-h">
          English exam preparation
        </h1>
        <p class="lede">Make a practice paper like your school's English paper, from the lessons and sections you choose.</p>
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

      <section class="card" aria-labelledby="efmt-h">
        <h2 id="efmt-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
          1. Choose the paper
        </h2>
        <div class="choices" role="radiogroup" aria-label="Paper format">
          {(['A', 'B'] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={format === f} aria-pressed={format === f} class="choice fmt" onClick={() => pick(f, SCHOOL[f])}>
              <span>
                <b>{ENGLISH_FORMATS[f].title}</b>
                <br />
                <small>
                  {ENGLISH_FORMATS[f].marks} marks · {timeText(ENGLISH_FORMATS[f].minutes)} · {ENGLISH_FORMATS[f].sections.length} questions
                </small>
                <small class="okbadge">Matches your school's paper</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section class="card" aria-labelledby="eport-h">
        <h2 id="eport-h" style={{ fontSize: '22px', marginBottom: '4px' }}>
          2. Choose what the paper covers
        </h2>
        <p class="lede" style={{ marginBottom: '10px' }}>
          Questions come only from the lessons and sections you tick. The passage to read and the writing tasks always come from their own banks. The {fmt.title} needs Practice Book section{need.length > 1 ? 's' : ''} {need.map((n) => n - 10).join(', ')} and at least one Reader lesson.
        </p>
        <div class="actions" style={{ marginBottom: '10px' }}>
          <button class="btn" onClick={() => pick(format, SCHOOL[format])}>
            The school's portion
          </button>
          <button class="btn" onClick={() => pick(format, [...reader.map((r) => r.number), ...practice.map((p) => p.number)])}>
            Everything
          </button>
          <button class="btn" onClick={() => setUnits([])}>
            Clear
          </button>
        </div>
        <fieldset class="field">
          <legend>English Reader: lessons</legend>
          <ul class="chapters">
            {reader.map((c) => (
              <li key={c.number}>
                <label class="chap">
                  <input id={`er-${c.number}`} type="checkbox" checked={units.includes(c.number)} onChange={() => toggle(c.number)} />
                  <span>
                    <b>{c.number}.</b> {c.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
        <fieldset class="field" style={{ marginTop: '12px' }}>
          <legend>English Practice Book: sections</legend>
          <ul class="chapters">
            {practice.map((c) => (
              <li key={c.number}>
                <label class="chap">
                  <input id={`ep-${c.number}`} type="checkbox" checked={units.includes(c.number)} onChange={() => toggle(c.number)} />
                  <span>
                    <b>{c.number - 10}.</b> {c.title}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </section>

      <section class="card" aria-labelledby="ehd-h">
        <h2 id="ehd-h" style={{ fontSize: '22px', marginBottom: '10px' }}>
          3. Paper details
        </h2>
        <div class="kidform">
          <div class="field">
            <label for="ee-name">Name of examination</label>
            <input id="ee-name" class="txt" style={{ maxWidth: '280px' }} placeholder={fmt.examination} value={examination} onInput={(e) => setExamination((e.target as HTMLInputElement).value)} />
          </div>
          <div class="field">
            <label for="ee-session">Session</label>
            <input id="ee-session" class="txt" style={{ maxWidth: '160px' }} value={header.session ?? ''} onInput={set('session')} />
          </div>
          <div class="field">
            <label for="ee-school">School name (optional)</label>
            <input id="ee-school" class="txt" style={{ maxWidth: '280px' }} value={header.school ?? ''} onInput={set('school')} />
          </div>
          <div class="field">
            <label for="ee-class">Class</label>
            <input id="ee-class" class="txt" style={{ maxWidth: '120px' }} value={header.className ?? ''} onInput={set('className')} />
          </div>
        </div>
      </section>

      <section class="card qcard" aria-labelledby="ego-h">
        <h2 id="ego-h" style={{ fontSize: '22px' }}>
          {exam ? `${exam.header.examination} · English` : 'Your paper'}
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
            <p class="note">Written answers (paragraph, application, sentences) and the child's own answers are marked by a grown-up. Claude can suggest a mark; you decide.</p>
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
          <button class="btn" onClick={() => setSeed(betterSeed(format, units))}>
            New paper
          </button>
        </div>
      </section>
    </>
  );
}
