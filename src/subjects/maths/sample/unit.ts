import type { Draft, Question, QuestionType, UnitDef } from '../../../core/question';
import type { Rng } from '../../../core/rng';

/** Sample Maths units written for this repository (not from any book): add and subtract small numbers, compare two numbers. */
const num = (n: number): string => String(n);

const sum = (lo: number, hi: number, carry: boolean) => (rng: Rng): Draft => {
  let a = rng.int(lo, hi);
  let b = rng.int(lo, hi);
  if (!carry) while ((a % 10) + (b % 10) > 9) b = rng.int(lo, hi);
  return { prompt: `Add: ${a} + ${b} = ?`, inputs: [{ id: 'a', mode: 'number', accepted: [num(a + b)] }], steps: [`${a} + ${b} = ${a + b}`], tags: ['add'], notebook: true, facts: { a, b } };
};

const compare = (lo: number, hi: number) => (rng: Rng): Draft => {
  const a = rng.int(lo, hi);
  let b = rng.int(lo, hi);
  if (b === a) b = a + 1;
  const bigger = Math.max(a, b);
  return { prompt: `Which number is bigger, ${a} or ${b}?`, inputs: [{ id: 'a', mode: 'choice', accepted: [num(bigger)], choices: [num(a), num(b)] }], steps: [`${bigger} is bigger.`], tags: ['compare'], facts: { a, b } };
};

const factsOf = (q: Question): { a: number; b: number } => q.facts as { a: number; b: number };

const typesOf = (n: number): QuestionType[] => {
  const k = String(n).padStart(2, '0');
  return [
    {
      id: `S${k}-T01`,
      title: 'Add two numbers',
      inventory: [`S${k}1`],
      generate: { easy: sum(10, 49, false), medium: sum(100, 499, true), challenge: sum(1000, 4999, true) },
      // second method: add b one digit at a time, from the units place up
      verify: (q) => {
        const { a, b } = factsOf(q);
        let total = a;
        for (let rest = b, place = 1; rest > 0; rest = Math.floor(rest / 10), place *= 10) total += (rest % 10) * place;
        return q.inputs[0]!.accepted[0] === num(total) ? null : `${a} + ${b} should be ${total}`;
      },
      minDistinct: 8,
    },
    {
      id: `S${k}-T02`,
      title: 'Compare two numbers',
      inventory: [`S${k}2`],
      generate: { easy: compare(10, 99), medium: compare(100, 999), challenge: compare(1000, 9999) },
      verify: (q) => {
        const { a, b } = factsOf(q);
        return q.inputs[0]!.accepted[0] === num(a > b ? a : b) ? null : 'the bigger number is wrong';
      },
      minDistinct: 8,
    },
  ];
};

/** Sample unit number n: the public tree repeats the same two question types in every unit. */
export const sampleUnit = (n: number, title: string): UnitDef => ({ id: String(n).padStart(2, '0'), number: n, title, slug: `sample-${n}`, printedPages: [n, n], types: typesOf(n) });
