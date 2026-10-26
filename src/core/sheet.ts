import { createRng, type Rng } from './rng';
import { hashKey } from './seen';
import { LEVELS, MARKS, isAutoMarked, type Level, type Question, type QuestionType, type UnitDef } from './question';

export function generateQuestion(type: QuestionType, level: Level, rng: Rng): Question {
  const draft = type.generate[level](rng);
  return { ...draft, typeId: type.id, level, marks: MARKS[level] };
}

/** Two keys per question: how it looks, and what it is made of. A repeat of either counts as a duplicate. */
const keysOf = (q: Question): string[] => [`${q.prompt}|${JSON.stringify(q.diagram ?? null)}|${JSON.stringify(q.inputs.map((i) => i.choices ?? null))}`, `facts:${q.typeId}:${q.level}:${JSON.stringify(q.facts)}`];

/** The fingerprint used to remember that a kid has seen a question. */
export const questionHash = (q: Question): string => hashKey(keysOf(q)[0]!);

/** `count` different questions of one type and level. May return fewer if the type cannot make that many. */
export function generateSet(type: QuestionType, level: Level, count: number, seed: number | string, avoid = new Set<string>()): Question[] {
  const rng = createRng(`${seed}:${type.id}:${level}`);
  const out: Question[] = [];
  const seen = new Set(avoid);
  for (let attempt = 0; attempt < count * 40 && out.length < count; attempt++) {
    const q = generateQuestion(type, level, rng.fork(String(attempt)));
    const keys = keysOf(q);
    if (!keys.some((k) => seen.has(k))) {
      keys.forEach((k) => seen.add(k));
      out.push(q);
    }
  }
  return out;
}

export interface Section {
  title: string;
  level: Level;
  count: number;
}

export interface Blueprint {
  title: string;
  minutes: number;
  sections: Section[];
}

/** Default paper: 20 marks, about 30 minutes. The parent can change it to match the school paper. */
export const DEFAULT_BLUEPRINT: Blueprint = {
  title: 'Unit test',
  minutes: 30,
  sections: [
    { title: 'Section A: quick answers (1 mark each)', level: 'easy', count: 6 },
    { title: 'Section B: show your working (2 marks each)', level: 'medium', count: 4 },
    { title: 'Section C: think harder (3 marks each)', level: 'challenge', count: 2 },
  ],
};

export const blueprintMarks = (b: Blueprint): number => b.sections.reduce((m, s) => m + s.count * MARKS[s.level], 0);

export interface TestPaper {
  title: string;
  minutes: number;
  totalMarks: number;
  sections: { title: string; questions: Question[] }[];
}

/** Exam-style paper: types are dealt out in a shuffled round-robin so every type is used before any repeats. */
export function buildUnitTest(unit: UnitDef, seed: number | string, blueprint: Blueprint = DEFAULT_BLUEPRINT): TestPaper {
  const rng = createRng(`${seed}:test:${unit.id}`);
  const pool = unit.types.filter(isAutoMarked);
  let queue: QuestionType[] = [];
  const nextType = (): QuestionType => {
    if (queue.length === 0) queue = rng.shuffle(pool);
    return queue.pop()!;
  };
  const used = new Set<string>();
  const sections = blueprint.sections.map((s) => {
    const questions: Question[] = [];
    while (questions.length < s.count) {
      const q = generateSet(nextType(), s.level, 1, `${seed}:${questions.length}:${used.size}`, used)[0];
      if (!q) continue;
      keysOf(q).forEach((k) => used.add(k));
      questions.push(q);
    }
    return { title: s.title, questions };
  });
  return { title: `${unit.title}: ${blueprint.title}`, minutes: blueprint.minutes, totalMarks: blueprintMarks(blueprint), sections };
}

export { LEVELS };
