import { MARKS, type Input, type Level, type Question, type QuestionType, type UnitDef, LEVELS } from '../../core/question';
import type { Rng } from '../../core/rng';
import type { BankEntry, BankType, Evidence, LessonData } from './types';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const defaultSteps = (e: Evidence): string[] =>
  e.source === 'book'
    ? [`Look at page ${e.page} of your book.`, e.note]
    : [`Look back at the text on page ${e.page} of your book.`, `The text says: “${e.quote}”`];

/** The words of a sentence as tappable choices: punctuation stripped, repeats shown once. */
export const tapChoices = (sentence: string): string[] => {
  const seen = new Set<string>();
  return sentence
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => {
      const k = w.toLowerCase();
      if (!w || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
};

const scramble = (word: string, rng: Rng): string => {
  const letters = word.split('');
  if (new Set(letters).size < 2) return word;
  for (let i = 0; i < 20; i++) {
    const s = rng.shuffle(letters).join('');
    if (s.toLowerCase() !== word.toLowerCase()) return s;
  }
  return [...letters].reverse().join('');
};

/** Turns one bank entry into a question. All shuffling uses the seeded rng, so a worksheet code always gives the same sheet. */
export function entryToQuestion(e: BankEntry, rng: Rng): Omit<Question, 'typeId' | 'level' | 'marks'> {
  const keep = Boolean(e.book);
  const base = { steps: e.steps ?? defaultSteps(e.evidence), tags: e.tags ?? [], diagram: e.diagram, passage: e.text, ...(e.book ? { book: e.book } : {}), facts: { entry: e.id } as Record<string, unknown> };
  const one = (input: Omit<Input, 'id'>, prompt: string, facts: Record<string, unknown> = {}) => ({ ...base, prompt, inputs: [{ id: 'a', ...input }], facts: { ...base.facts, ...facts } });
  switch (e.kind) {
    case 'mcq': {
      const options = keep ? e.options : rng.shuffle(e.options);
      return one({ mode: 'choice', accepted: [e.answer], choices: options }, e.stem);
    }
    case 'tf':
      return one({ mode: 'choice', accepted: [e.answer ? 'True' : 'False'], choices: ['True', 'False'] }, keep ? e.statement : `True or false? ${e.statement}`);
    case 'blank':
      return one({ mode: 'text', accepted: e.answer, hint: 'Write the missing word' }, e.box ? `${e.stem}\nWord box: ${(keep ? e.box : rng.shuffle(e.box)).join(', ')}` : e.stem);
    case 'jumble': {
      const s = e.printed ?? scramble(e.word, rng);
      return one({ mode: 'text', accepted: [e.word], hint: 'Write the word with the letters in the right order' }, `Rearrange the letters to make a word${e.clue ? ` (${e.clue})` : ''}: ${s.toUpperCase()}`);
    }
    case 'match': {
      const rights = keep && e.shown ? e.shown : rng.shuffle(e.pairs.map((p) => p[1]));
      const inputs: Input[] = e.pairs.map(([l, r], i) => ({ id: `m${i}`, label: l, mode: 'choice', accepted: [r], choices: rights }));
      return { ...base, prompt: e.stem, inputs, facts: base.facts };
    }
    case 'order': {
      let shown = e.shown ?? rng.shuffle(e.items);
      for (let i = 0; !e.shown && i < 20 && shown.every((it, k) => it === e.items[k]); i++) shown = rng.shuffle(e.items);
      const answer = e.items.map((it) => String(shown.indexOf(it) + 1));
      return one({ mode: 'ordered', accepted: answer, hint: 'Write the numbers in the right order, with commas between' }, `${e.stem}\n${shown.map((it, i) => `(${i + 1}) ${it}`).join('\n')}`);
    }
    case 'multi':
      return one({ mode: 'multi', accepted: e.answers, choices: keep ? e.options : rng.shuffle(e.options) }, e.stem);
    case 'short':
      return one({ mode: 'sentence', accepted: [e.model] }, e.stem, { keywords: e.keywords ?? [], ...(e.rubric ? { rubric: e.rubric } : {}) });
    case 'tapwords': {
      const choices = tapChoices(e.sentence);
      return one({ mode: 'multi', accepted: e.targets, choices, hint: 'Tap every word that fits' }, `${e.stem}\n${e.sentence}`);
    }
    case 'oddone':
      return one({ mode: 'choice', accepted: [e.answer], choices: keep ? e.options : rng.shuffle(e.options), hint: 'Tap the odd one out' }, e.stem);
    case 'correct':
      return one({ mode: 'text', accepted: e.answer, caseSensitive: true, hint: 'Write it again correctly' }, `${e.stem}\n${e.wrong}`);
    case 'words': {
      const inputs: Input[] = Array.from({ length: e.count }, (_, i) => ({ id: `w${i}`, label: `Word ${i + 1}`, mode: 'text', accepted: e.pool }));
      return { ...base, prompt: e.stem, inputs, facts: base.facts };
    }
    case 'personal':
      return { ...base, prompt: e.stem, inputs: [{ id: 'a', mode: 'open', accepted: [] }], steps: e.steps ?? [e.examples?.length ? `Some answers: ${e.examples.join(', ')}.` : 'A grown-up checks your answer.'], facts: { ...base.facts, examples: e.examples ?? [] } };
    case 'together':
      return { ...one({ mode: 'open', accepted: [] }, e.stem), together: true };
  }
}

/** The independent second check for a built question: re-reads the entry and the question and compares. */
function verifyQuestion(entries: Map<string, BankEntry>, q: Question): string | null {
  const e = entries.get(String(q.facts.entry));
  if (!e) return 'question has no bank entry';
  if (q.passage !== e.text) return 'passage does not match the entry';
  const inp = q.inputs[0]!;
  switch (e.kind) {
    case 'mcq':
      return inp.choices?.length === e.options.length && [...(inp.choices ?? [])].sort().join('|') === [...e.options].sort().join('|') && inp.accepted[0] === e.answer ? null : 'mcq choices or answer changed';
    case 'tf':
      return inp.accepted[0] === (e.answer ? 'True' : 'False') ? null : 'true/false answer changed';
    case 'blank':
      return q.prompt.includes('____') && inp.accepted.length > 0 ? null : 'blank missing';
    case 'jumble': {
      const s = q.prompt.slice(q.prompt.lastIndexOf(': ') + 2);
      return s.toLowerCase().split('').sort().join('') === e.word.toLowerCase().split('').sort().join('') && s.toLowerCase() !== e.word.toLowerCase() ? null : 'letters do not match the word';
    }
    case 'match':
      return q.inputs.length === e.pairs.length && q.inputs.every((i, k) => i.accepted[0] === e.pairs[k]![1] && i.label === e.pairs[k]![0]) ? null : 'match pairs changed';
    case 'order': {
      const shown = q.prompt.split('\n').slice(1).map((l) => l.replace(/^\(\d+\) /, ''));
      const back = inp.accepted.map((n) => shown[Number(n) - 1]);
      return back.join('|') === e.items.join('|') ? null : 'order answer does not rebuild the order';
    }
    case 'multi':
      return [...inp.accepted].sort().join('|') === [...e.answers].sort().join('|') ? null : 'multi answers changed';
    case 'short':
      return inp.mode === 'sentence' && inp.accepted[0] === e.model ? null : 'model answer changed';
    case 'tapwords':
      return [...inp.accepted].sort().join('|') === [...e.targets].sort().join('|') && inp.accepted.every((a) => inp.choices?.includes(a)) ? null : 'tap words changed';
    case 'oddone':
      return inp.accepted[0] === e.answer && inp.choices?.includes(e.answer) && inp.choices.length === e.options.length ? null : 'odd-one-out changed';
    case 'correct':
      return inp.caseSensitive && inp.accepted.join('|') === e.answer.join('|') && !inp.accepted.includes(e.wrong) ? null : 'correction changed';
    case 'words':
      return q.inputs.length === e.count && q.inputs.every((i) => i.accepted.join('|') === e.pool.join('|')) ? null : 'word boxes changed';
    case 'personal':
    case 'together':
      return inp.mode === 'open' ? null : 'together item must be open';
  }
}

/** A lesson becomes a UnitDef, so the Maths engine (worksheets, exams, print, memory) works on it unchanged. */
export function lessonToUnit(lesson: LessonData): UnitDef {
  const entries = new Map(lesson.entries.map((e) => [e.id, e]));
  const types: QuestionType[] = lesson.types.map((t: BankType) => {
    const pools = Object.fromEntries(LEVELS.map((l) => [l, lesson.entries.filter((e) => e.type === t.id && e.level === l)])) as Record<Level, BankEntry[]>;
    if (t.book) {
      pools.easy = pools.medium;
      pools.challenge = pools.medium;
    }
    const generate = Object.fromEntries(
      LEVELS.map((l) => [
        l,
        (rng: Rng) => {
          const pool = pools[l];
          if (pool.length === 0) throw new Error(`${t.id} has no ${l} entries`);
          return entryToQuestion(rng.pick(pool), rng);
        },
      ]),
    ) as QuestionType['generate'];
    return {
      id: t.id,
      title: t.title,
      inventory: t.inventory,
      generate,
      verify: (q: Question) => verifyQuestion(entries, q),
      autoMarked: t.marking !== 'together',
      minDistinct: Math.max(1, Math.min(8, ...LEVELS.map((l) => pools[l].length))),
    };
  });
  return {
    subject: 'english',
    id: String(lesson.number).padStart(2, '0'),
    number: lesson.number,
    title: lesson.title,
    slug: lesson.slug,
    printedPages: lesson.pages,
    texts: lesson.texts,
    types,
  };
}

export { MARKS };
