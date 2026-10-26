import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { UnitDef } from '../core/question';
import type { Storage } from '../storage';
import {
  buildClue,
  fingerFor,
  handOf,
  LEVEL_TITLE,
  maxLevel,
  nextLevel,
  newRecord,
  pickWords,
  placement,
  poolFor,
  questId,
  randomRng,
  recordSession,
  ROWS,
  SESSION_WORDS,
  starsFor,
  summarise,
  type QuestLevel,
  type QuestRecord,
  type QuestWord,
  type SessionSummary,
  type WordResult,
} from '../core/wordquest';
import type { QuestLesson } from '../app/wordQuestData';
import { Back } from './Back';

interface Props {
  lesson: UnitDef;
  data: QuestLesson;
  kidId?: string;
  kidName?: string;
  store: Storage;
  onBack(): void;
  /** the finger guide on the on-screen keyboard (the kid's setting) */
  help?: boolean;
  onHelp?(on: boolean): void;
  /** one dated row for the activity log, when a session ends */
  onActivity?(row: { lesson: number; level: number; words: number; chars: number; secs: number; mistakes: number; help: boolean }): void;
}

/** True when this browser can speak a word. Checked, not assumed: the voices can arrive late and a viewer may block speech. */
export async function speechAvailable(): Promise<boolean> {
  try {
    const s = window.speechSynthesis;
    if (!s || typeof SpeechSynthesisUtterance === 'undefined') return false;
    if (s.getVoices().length > 0) return true;
    return await new Promise<boolean>((resolve) => {
      const t = setTimeout(() => resolve(false), 1200);
      s.addEventListener(
        'voiceschanged',
        () => {
          clearTimeout(t);
          resolve(s.getVoices().length > 0);
        },
        { once: true },
      );
    });
  } catch {
    return false;
  }
}

type Phase = 'start' | 'play' | 'summary';
interface Session {
  words: QuestWord[];
  level: QuestLevel;
  placement: boolean;
}

const star = '★';

export function WordQuest({ lesson, data, kidId, kidName, store, onBack, onActivity, help = true, onHelp }: Props) {
  const top = maxLevel(data.words);
  const [rec, setRec] = useState<QuestRecord>(() => newRecord(kidId ?? 'guest', data.number));
  const [phase, setPhase] = useState<Phase>('start');
  const [session, setSession] = useState<Session>();
  const [idx, setIdx] = useState(0);
  const [typed, setTyped] = useState('');
  const [paused, setPaused] = useState(false);
  const [results, setResults] = useState<WordResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [wrong, setWrong] = useState<string>();
  const [hinted, setHinted] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<{ s: SessionSummary; from: QuestLevel; to: QuestLevel; placement: boolean }>();
  const [speech, setSpeech] = useState(false);
  const [live, setLive] = useState('');
  const mistakes = useRef(0);
  const startedAt = useRef(0);
  const pausedAt = useRef(0);
  const lostMs = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let alive = true;
    void speechAvailable().then((ok) => alive && setSpeech(ok));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    store
      .get<QuestRecord>('wordquest', questId(kidId ?? 'guest', data.number))
      .then((r) => alive && r && setRec(r))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [store, kidId, data.number]);
  useEffect(() => {
    heading.current?.focus();
  }, [phase]);

  const level = Math.min(rec.level, top) as QuestLevel;
  const word = session?.words[idx];
  const clue = useMemo(() => (word && session && session.level >= 3 ? buildClue(word, data.texts) : undefined), [word, session, data.texts]);

  const begin = (forPlacement: boolean) => {
    const rng = randomRng();
    const words = forPlacement
      ? [...pickWords(poolFor(1, data.words), rec.words, 3, rng), ...pickWords(poolFor(2, data.words), rec.words, 3, rng)]
      : pickWords(poolFor(level, data.words), rec.words, SESSION_WORDS, rng);
    setSession({ words, level: forPlacement ? 1 : level, placement: forPlacement });
    setIdx(0);
    setTyped('');
    setResults([]);
    setStreak(0);
    setHinted(false);
    setDone(false);
    setPaused(false);
    mistakes.current = 0;
    lostMs.current = 0;
    startedAt.current = performance.now();
    setPhase('play');
  };

  const finish = useCallback(
    (all: WordResult[], s: Session) => {
      const sum = summarise(all);
      let to = rec.level;
      let placed = false;
      if (s.placement) {
        to = placement(summarise(all.slice(0, 3)), summarise(all.slice(3)), top);
        placed = true;
      } else to = nextLevel(s.level, sum, top);
      const next = recordSession(rec, s.level, all, sum, new Date().toISOString(), to, true);
      setRec(next);
      setSummary({ s: sum, from: s.level, to, placement: placed });
      setPhase('summary');
      if (kidId) void store.set('wordquest', next.id, next).catch(() => undefined);
      onActivity?.({ lesson: lesson.number, level: s.level, words: all.length, chars: all.reduce((m, r) => m + r.letters, 0), secs: Math.round(all.reduce((m, r) => m + r.ms, 0) / 1000), mistakes: all.reduce((m, r) => m + r.mistakes, 0), help });
    },
    [rec, top, kidId, store, onActivity, lesson.number, help],
  );

  const press = useCallback(
    (ch: string) => {
      if (phase !== 'play' || paused || done || !word || !session) return;
      const target = word.word[typed.length];
      if (ch !== target) {
        mistakes.current += 1;
        setStreak(0);
        setWrong(ch);
        setTimeout(() => setWrong(undefined), 350);
        return;
      }
      const now = typed + ch;
      setTyped(now);
      if (now.length < word.word.length) return;
      const ms = performance.now() - startedAt.current - lostMs.current;
      const r: WordResult = { word: word.word, letters: word.word.length, mistakes: mistakes.current, ms, hinted };
      const all = [...results, r];
      setResults(all);
      setStreak((s0) => (r.mistakes === 0 && !r.hinted ? s0 + 1 : 0));
      setDone(true);
      setLive(`${word.word}. ${starsFor(r)} ${starsFor(r) === 1 ? 'star' : 'stars'}.`);
      setTimeout(() => {
        if (idx + 1 >= session.words.length) return finish(all, session);
        setIdx(idx + 1);
        setTyped('');
        setHinted(false);
        setDone(false);
        mistakes.current = 0;
        lostMs.current = 0;
        startedAt.current = performance.now();
      }, 800);
    },
    [phase, paused, done, word, session, typed, hinted, results, idx, finish],
  );

  useEffect(() => {
    if (phase !== 'play') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[a-zA-Z]$/.test(e.key)) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
        press(e.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, press]);

  const togglePause = () => {
    if (paused) {
      lostMs.current += performance.now() - pausedAt.current;
      setPaused(false);
    } else {
      pausedAt.current = performance.now();
      setPaused(true);
    }
  };

  const hear = () => {
    if (!word) return;
    try {
      const u = new SpeechSynthesisUtterance(word.word);
      u.lang = 'en-GB';
      u.rate = 0.8;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {
      setSpeech(false);
    }
  };

  const head = (
    <>
      <Back onClick={onBack}>Back to the lesson</Back>
    </>
  );

  if (phase === 'start') {
    const last = rec.sessions.at(-1);
    return (
      <>
        {head}
        <header class="u-body" style={{ gap: '6px' }}>
          <h1 class="page" tabIndex={-1} ref={heading} id="page-h">
            Word Quest
          </h1>
          <p class="lede">
            Lesson {lesson.number} · {lesson.title}. Read the clue, then type the word. {data.words.length} words from this lesson.
          </p>
        </header>
        <section class="card qcard narrow" aria-labelledby="wq-start">
          <h2 id="wq-start" style={{ fontSize: '24px' }}>
            {rec.placed ? `Level ${level} · ${LEVEL_TITLE[level]}` : 'A quick try-out first'}
          </h2>
          {rec.placed ? (
            <p>
              {kidName ? `${kidName}, you` : 'You'} are on level {level}. Ten words, one at a time. Clean, quick typing earns stars.
            </p>
          ) : (
            <p>Six easy words show where to start, so you are not given long words too soon. Use the home-row keys A S D F G H J K L first.</p>
          )}
          {last && (
            <p class="lede">
              Last time: {last.accuracy}% right, {last.speed} words a minute, {last.stars} stars. Best streak {rec.bestStreak}. All-time {rec.stars} stars.
            </p>
          )}
          {!kidId && <p class="note">Pick a kid at the top to save stars, accuracy and speed.</p>}
          <div class="actions">
            <button class="btn primary" onClick={() => begin(!rec.placed)}>
              {rec.placed ? 'Start' : 'Start the try-out'}
            </button>
            {rec.placed && (
              <button class="btn" onClick={() => begin(true)}>
                Try-out again
              </button>
            )}
          </div>
        </section>
        <section class="narrow" aria-labelledby="wq-bank">
          <h2 id="wq-bank" style={{ fontSize: '20px', marginBottom: '8px' }}>
            Words from Lesson {lesson.number}
          </h2>
          <ul class="chips">
            {data.words.slice(0, 24).map((w) => (
              <li key={w.word}>{w.word}</li>
            ))}
            {data.words.length > 24 && <li class="more">+ {data.words.length - 24} more</li>}
          </ul>
        </section>
      </>
    );
  }

  if (phase === 'summary' && summary) {
    const s = summary.s;
    return (
      <>
        {head}
        <section class="card qcard narrow" aria-labelledby="wq-done">
          <h1 id="wq-done" class="page" tabIndex={-1} ref={heading} style={{ fontSize: '32px' }}>
            {summary.placement ? 'Now we know where to start' : kidName ? `Well done, ${kidName}!` : 'Well done!'}
          </h1>
          <p class="score">
            <span class="stars" aria-hidden="true">
              {star}
            </span>{' '}
            {s.stars}
          </p>
          <ul class="tiles" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li class="tile">
              <b>{s.accuracy}%</b>
              <span>letters right</span>
            </li>
            <li class="tile">
              <b>{s.speed}</b>
              <span>words a minute</span>
            </li>
            <li class="tile">
              <b>{s.bestStreak}</b>
              <span>best streak</span>
            </li>
          </ul>
          <p>
            {summary.to > summary.from ? `Level up! Next time: level ${summary.to}, ${LEVEL_TITLE[summary.to]}.` : summary.to < summary.from ? `Let us practise a bit more on level ${summary.to}, ${LEVEL_TITLE[summary.to]}.` : `Stay on level ${summary.to}, ${LEVEL_TITLE[summary.to]}.`}
          </p>
          <div class="actions">
            <button class="btn primary" onClick={() => begin(false)}>
              Play again
            </button>
            <button class="btn" onClick={onBack}>
              Back to the lesson
            </button>
          </div>
        </section>
      </>
    );
  }

  if (!session || !word) return null;
  const nextLetter = word.word[typed.length];
  const fin = nextLetter ? fingerFor(nextLetter) : undefined;
  const earned = results.reduce((n, r) => n + starsFor(r), 0);
  const copyMode = session.level <= 2;
  return (
    <>
      {head}
      <div class="q-head">
        <div>
          <p class="qmeta">
            {session.placement ? 'Try-out' : `Level ${session.level} · ${LEVEL_TITLE[session.level]}`} · Lesson {lesson.number} words
          </p>
          <h1 class="page" tabIndex={-1} ref={heading} id="page-h" style={{ fontSize: 'clamp(26px, 6vw, 34px)' }}>
            Word {idx + 1} of {session.words.length}
          </h1>
        </div>
        <div class="row">
          <span class="pill">
            <span class="stars" aria-hidden="true">
              {star}
            </span>{' '}
            {earned} {earned === 1 ? 'star' : 'stars'}
          </span>
          <span class="pill">Streak {streak}</span>
          {onHelp && (
            <button class="btn" onClick={() => onHelp(!help)} aria-pressed={help}>
              Finger guide: {help ? 'on' : 'off'}
            </button>
          )}
          <button class="btn" onClick={togglePause} aria-pressed={paused}>
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>
      <section class="card qcard narrow" aria-labelledby="wq-clue" style={{ position: 'relative' }}>
        <h2 id="wq-clue" style={{ fontSize: '17px', fontFamily: 'var(--body)', color: 'var(--muted)' }}>
          {copyMode ? 'Copy this word' : 'Clue'}
        </h2>
        {copyMode ? (
          <p class="prompt wq-copy" aria-label={`Type the word ${word.word.split('').join(' ')}`}>
            {word.word.toUpperCase()}
          </p>
        ) : (
          <>
            <p class="prompt">{clue?.sentence ?? `A word from this lesson. It starts with "${word.word[0]!.toUpperCase()}" and has ${word.word.length} letters.`}</p>
            {clue?.meaning && (
              <p class="lede">
                <b>Meaning:</b> {clue.meaning}
              </p>
            )}
          </>
        )}
        <div class="actions">
          {speech && (
            <button class="btn" onClick={hear}>
              Hear the word
            </button>
          )}
          <button class="btn" onClick={() => setHinted(true)} disabled={done}>
            Show the next letter
          </button>
        </div>
        <div class="wq-boxes" role="group" aria-label={`${word.word.length} letters`}>
          {[...word.word].map((c, i) => {
            const typedHere = i < typed.length;
            const isNext = i === typed.length && !done;
            return (
              <span key={i} class={`wq-box${typedHere ? ' on' : ''}${isNext ? ' next' : ''}`} aria-hidden="true">
                {typedHere ? c.toUpperCase() : isNext && hinted ? <i>{c.toUpperCase()}</i> : ''}
              </span>
            );
          })}
        </div>
        <p class="live" role="status" aria-live="polite">
          {done ? live : nextLetter && help ? `Next letter: ${nextLetter.toUpperCase()}.${fin ? ` Press it with your ${fin.text}.` : ''}` : ''}
        </p>
        <div class="wq-keys" aria-label="On-screen keyboard">
          {ROWS.map((row, ri) => (
            <div class={`wq-row r${ri}`} key={row}>
              {[...row].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  class={`wq-key ${help ? `fg-${fingerFor(ch)?.finger ?? 'none'}` : ''}${help && ch === nextLetter && !done ? ' next' : ''}${wrong === ch ? ' bad' : ''}`}
                  aria-label={`${ch.toUpperCase()}${help && ch === nextLetter && !done ? ', the next letter' : ''}`}
                  onClick={() => press(ch)}
                >
                  {ch.toUpperCase()}
                </button>
              ))}
            </div>
          ))}
          <div class="wq-space" aria-hidden="true">
            space
          </div>
        </div>
        {help ? (
          <ul class="wq-legend" aria-label="Finger colours">
            <li><i class="wq-sw fg-little" /> Little finger</li>
            <li><i class="wq-sw fg-ring" /> Ring finger</li>
            <li><i class="wq-sw fg-middle" /> Middle finger</li>
            <li><i class="wq-sw fg-index" /> Index finger</li>
            <li><i class="wq-sw next" /> Press this one</li>
          </ul>
        ) : (
          <p class="muted small">The finger guide is off: type from memory. Turn it on any time.</p>
        )}
        {paused && (
          <div class="wq-paused" role="dialog" aria-label="Paused">
            <p class="prompt">Paused</p>
            <button class="btn primary" onClick={togglePause}>
              Resume
            </button>
          </div>
        )}
      </section>
      <section class="narrow" aria-labelledby="wq-bank2">
        <h2 id="wq-bank2" style={{ fontSize: '18px', marginBottom: '8px' }}>
          Words from Lesson {lesson.number}
        </h2>
        <ul class="chips">
          {session.words.map((w, i) => (
            <li key={w.word} class={i === idx ? 'now' : i < idx ? 'was' : ''}>
              {w.word}
              {i === idx ? ' · playing now' : ''}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
