import { defaultHint } from '../core/checker';
import type { Input, Question } from '../core/question';
import type { Values } from '../core/practice';
import { Diagram } from './Diagram';
import { matchOf } from '../core/match';
import './mapSvg';
import { MatchBoard } from './Match';
import { MapBoard } from './MapBoard';
import { mapOf } from '../core/mapQuestion';
import { sentencePieces, tapAnswer, tapWordsOf } from '../core/kinds';

interface Props {
  q: Question;
  values: Values;
  onChange(id: string, value: string): void;
  disabled?: boolean;
  /** per blank, after checking */
  marks?: (boolean | null)[];
  messages?: (string | undefined)[];
  idPrefix: string;
  /** the answer has been shown: the right choice is marked as right, whatever was tapped */
  reveal?: boolean;
}

const isDigits = (i: Input): boolean => i.accepted.length > 0 && i.accepted.every((a) => /^\d+$/.test(a));

export function Badge({ ok }: { ok: boolean | null | undefined }) {
  if (ok === undefined || ok === null) return null;
  return <Feedback ok={ok} />;
}

/** The quiet answer sign: a tick or a "?" and the word, with a short fade. Never colour alone. */
export function Feedback({ ok }: { ok: boolean }) {
  return (
    <span class={`fb ${ok ? 'ok' : 'no'}`}>
      <span class="fb-mark" aria-hidden="true">{ok ? '✓' : '?'}</span>
      {ok ? 'Correct' : 'Not quite'}
    </span>
  );
}

/** The picture plus every blank of one question. The kid types, or taps a choice. */
export function QuestionBody({ q, values, onChange, disabled, marks, messages, idPrefix, reveal }: Props) {
  const tap = tapWordsOf(q);
  const match = tap ? null : matchOf(q);
  const map = tap || match ? null : mapOf(q);
  // When the abacus is drawn blank, show the beads the kid has typed so far.
  const abacusInput = q.inputs.find((i) => i.mode === 'abacus');
  let diagram = q.diagram;
  if (diagram?.kind === 'abacus' && diagram.blank && abacusInput) {
    const typed = (values[abacusInput.id] ?? '').split(',').map((p) => Math.min(9, Math.max(0, parseInt(p, 10) || 0)));
    if (typed.some((n) => n > 0)) diagram = { ...diagram, blank: false, rods: diagram.rods.map((_, i) => typed[i] ?? 0) };
  }
  const bk = q.book;
  const needsBook = Boolean(bk && (q.together || q.steps?.some((s) => /^Look at page \d+ of your book/.test(s))));
  return (
    <>
      {bk && (
        <div class="book-head">
          <p class="book-tag">
            Exactly as in the book · {bk.exercise} · page {bk.page}
            {bk.part ? ` · ${bk.part}` : ''}
          </p>
          {bk.instruction && <p class="book-instr">{bk.instruction}</p>}
          {needsBook && <p class="book-open">Open your book to page {bk.page}.</p>}
        </div>
      )}
      {tap ? (
        <>
          <p class="prompt">{tap.instruction}</p>
          <TapSentence tap={tap} value={values[q.inputs[0]!.id] ?? ''} onChange={(v) => onChange(q.inputs[0]!.id, v)} disabled={disabled} ok={marks?.[0]} idPrefix={idPrefix} />
        </>
      ) : (
        <p class="prompt">{q.prompt}</p>
      )}
      {q.notebook && <p class="notebook">Use your notebook, then type the answer</p>}
      {diagram && <Diagram spec={diagram} />}
      {map && <MapBoard spec={map} inputs={q.inputs} values={values} onChange={onChange} disabled={disabled} marks={marks} idPrefix={idPrefix} />}
      {match && <MatchBoard spec={match} values={values} onChange={onChange} disabled={disabled} marks={marks?.map((m) => m ?? null)} idPrefix={idPrefix} />}
      <div class="fields">
        {(tap || match || map ? [] : q.inputs).map((input, n) => (
          <Field key={input.id} q={q} input={input} id={`${idPrefix}-${input.id}`} value={values[input.id] ?? ''} onChange={(v) => onChange(input.id, v)} disabled={disabled} ok={marks?.[n]} message={messages?.[n]} reveal={reveal} />
        ))}
      </div>
    </>
  );
}

function FieldInner({ q, input, id, value, onChange, disabled, ok, message, reveal }: { reveal?: boolean; message?: string; q: Question; input: Input; id: string; value: string; onChange(v: string): void; disabled?: boolean; ok?: boolean | null }) {
  const many = q.inputs.length > 1;
  const label = input.label ? (input.label[0]!.toUpperCase() + input.label.slice(1)) : many ? 'Your answer' : 'Your answer';
  switch (input.mode) {
    case 'choice':
    case 'multi': {
      const chosen = value.split(', ').filter(Boolean);
      const toggle = (c: string) => {
        if (input.mode === 'choice') return onChange(c);
        onChange((chosen.includes(c) ? chosen.filter((x) => x !== c) : [...chosen, c]).join(', '));
      };
      return (
        <fieldset class="field">
          <legend>
            {input.label ? `${label}: ` : ''}
            {input.mode === 'choice' ? 'Tap one answer' : 'Tap every right answer'} {input.mode === 'multi' && <Badge ok={ok} />}
          </legend>
          <div class={`choices${many ? ' wrap' : ''}`}>
            {(input.choices ?? []).map((c) => {
              const on = input.mode === 'choice' ? value === c : chosen.includes(c);
              // after the answer is shown, the right choice is marked right and a tap on it is never "Not quite"
              const isAnswer = reveal === true && input.accepted.includes(c);
              return (
                <button key={c} type="button" class={`choice${isAnswer ? ' is-ok' : on && ok === true ? ' is-ok' : on && ok === false ? ' is-no' : ''}`} aria-pressed={on} disabled={disabled} onClick={() => toggle(c)}>
                  {input.mode === 'multi' && <span class="tick" aria-hidden="true">{on ? '✓' : ''}</span>}
                  {input.mode === 'choice' && (input.choices?.length ?? 0) >= 3 && !many && (q as { form?: string }).form !== 'mcq' && <span class="optlab letter" aria-hidden="true">{'ABCDEFGH'[input.choices!.indexOf(c)]}</span>}
                  {(q as { form?: string }).form === 'mcq' && input.choices ? <span class="optlab">({['i', 'ii', 'iii', 'iv', 'v', 'vi'][input.choices.indexOf(c)]})</span> : null}
                  <span class="choice-text">{c}</span>
                  {isAnswer ? <span class="fb ok"><span class="fb-mark" aria-hidden="true">✓</span>Right answer</span> : input.mode === 'choice' && on && ok !== undefined && ok !== null && <Feedback ok={ok} />}
                </button>
              );
            })}
          </div>
        </fieldset>
      );
    }
    case 'abacus': {
      const labels = q.diagram?.kind === 'abacus' && q.diagram.labels.length === input.accepted.length ? q.diagram.labels : input.accepted.map((_, i) => `Rod ${i + 1}`);
      const parts = value.split(',').map((p) => p.trim());
      return (
        <fieldset class="field">
          <legend>
            Beads on each rod, from the left <Badge ok={ok} />
          </legend>
          <div class="rods">
            {labels.map((l, i) => (
              <div class="rod" key={i}>
                <label for={`${id}-${i}`}>{l}</label>
                <input
                  id={`${id}-${i}`}
                  class="txt"
                  inputMode="numeric"
                  maxLength={1}
                  autocomplete="off"
                  disabled={disabled}
                  value={parts[i] ?? ''}
                  onInput={(e) => {
                    const next = labels.map((_, k) => parts[k] ?? '');
                    next[i] = (e.target as HTMLInputElement).value.replace(/\D/g, '');
                    onChange(next.join(', '));
                  }}
                />
              </div>
            ))}
          </div>
        </fieldset>
      );
    }
    case 'sentence':
      return (
        <div class="field">
          <label for={id}>{label}</label>
          <textarea id={id} class="txt" rows={3} disabled={disabled} value={value} aria-describedby={`${id}-hint`} onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)} />
        </div>
      );
    case 'open':
      return (
        <div class="field">
          <label for={id}>{label} (optional: a grown-up checks it)</label>
          <textarea id={id} class="txt" disabled={disabled} value={value} onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)} />
        </div>
      );
    default:
      return (
        <div class="field">
          <label for={id}>
            {label}
            {input.mode === 'ordered' ? ': type the list in order, with commas between' : ''} <Badge ok={ok} />
          </label>
          <input
            id={id}
            class="txt"
            type="text"
            inputMode={isDigits(input) && input.mode !== 'ordered' ? 'numeric' : 'text'}
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            disabled={disabled}
            placeholder={input.mode === 'ordered' ? 'e.g. 3, 1, 2' : ''}
            value={value}
            onInput={(e) => onChange((e.target as HTMLInputElement).value)}
          />
        </div>
      );
  }
}

function Field(props: { reveal?: boolean; message?: string; q: Question; input: Input; id: string; value: string; onChange(v: string): void; disabled?: boolean; ok?: boolean | null }) {
  const hint = defaultHint(props.input);
  return (
    <div class="fieldwrap">
      <FieldInner {...props} />
      {hint && props.input.mode !== 'open' && (
        <small class="hintline" id={`${props.id}-hint`}>
          {hint}
        </small>
      )}
      {props.message && (
        <small class="msgline" role="alert">
          {props.message}
        </small>
      )}
    </div>
  );
}

/** An "underline / circle the ..." question: the sentence itself, every word a button. The chosen words are underlined, circled or crossed out. */
function TapSentence({ tap, value, onChange, disabled, ok, idPrefix }: { tap: NonNullable<ReturnType<typeof tapWordsOf>>; value: string; onChange(v: string): void; disabled?: boolean; ok?: boolean | null; idPrefix: string }) {
  const chosen = value.split(', ').filter(Boolean).map((w) => w.toLowerCase());
  const toggle = (word: string) => {
    const on = chosen.includes(word.toLowerCase());
    const next = on ? chosen.filter((c) => c !== word.toLowerCase()) : [...chosen, word.toLowerCase()];
    // keep the sentence's own spelling for each chosen word
    onChange(tapAnswer(tap.choices.filter((c) => next.includes(c.toLowerCase()))));
  };
  // Repeated words share one answer. For "underline the subject" the subject is the first one, so only the first copy shows as marked.
  const firstOnly = /subject/i.test(tap.instruction);
  const seenWords = new Set<string>();
  const verb = tap.style === 'circle' ? 'circled' : tap.style === 'cross' ? 'crossed out' : 'underlined';
  return (
    <fieldset class="field">
      <legend class="sr">Tap the words to mark them. A tapped word is {verb}.</legend>
      <p class="tapsentence" id={`${idPrefix}-tap`}>
        {sentencePieces(tap.sentence).map((p, i) => {
          if (!p.word) return <span key={i}>{p.text}</span>;
          const k = p.word.toLowerCase();
          const repeat = seenWords.has(k);
          seenWords.add(k);
          const on = chosen.includes(k) && !(firstOnly && repeat);
          return (
            <button key={i} type="button" class={`tapword ${tap.style}${on ? ' on' : ''}`} aria-pressed={on} disabled={disabled} onClick={() => toggle(p.word!)}>
              {p.text}
            </button>
          );
        })}
      </p>
      <small class="hintline">Tap a word to have it {verb}. Tap it again to undo.</small>
      <Badge ok={ok} />
    </fieldset>
  );
}
