import { expect } from 'vitest';
import { checkInput } from '../src/core/checker';
import { LEVELS, MARKS, type Question, type QuestionType, type UnitDef } from '../src/core/question';
import { createRng } from '../src/core/rng';
import { generateQuestion, generateSet } from '../src/core/sheet';

const BAD_TEXT = /undefined|NaN|null|\[object|(^|\s)-\d/;

/** Generic problems any question could have, whatever its type. */
export function genericProblems(q: Question): string[] {
  const out: string[] = [];
  if (!q.prompt.trim()) out.push('empty prompt');
  if (BAD_TEXT.test(q.prompt)) out.push(`bad text in prompt: ${q.prompt}`);
  if (q.inputs.length === 0) out.push('no inputs');
  if (q.steps.length === 0) out.push('no worked steps');
  if (q.marks !== MARKS[q.level]) out.push('wrong marks');
  for (const i of q.inputs) {
    if (i.mode !== 'open' && i.accepted.length === 0) out.push(`input ${i.id} has no answer`);
    if (i.accepted.some((a) => BAD_TEXT.test(a))) out.push(`bad answer ${i.accepted.join()}`);
    if (i.mode === 'number' && !/^\d+$/.test(i.accepted[0]!)) out.push(`number answer not a whole number: ${i.accepted[0]}`);
    if (i.mode === 'choice') {
      if (!i.choices || !i.choices.includes(i.accepted[0]!)) out.push('choice answer not among choices');
      if (i.choices && new Set(i.choices).size !== i.choices.length) out.push('duplicate choices');
    }
    if (i.mode === 'multi' && !i.accepted.every((a) => i.choices?.includes(a))) out.push('multi answers not among choices');
    if (i.mode === 'ordered' && new Set(i.accepted).size !== i.accepted.length) out.push('duplicate items to order');
    if (i.mode !== 'open' && i.mode !== 'sentence') {
      const right = i.mode === 'multi' || i.mode === 'ordered' || i.mode === 'abacus' ? i.accepted.join(', ') : i.accepted[0]!;
      if (checkInput(i, right) !== true) out.push(`own answer rejected: ${right}`);
      if (i.mode === 'number' && checkInput(i, String(Number(right) + 1)) !== false) out.push('wrong answer accepted');
    }
  }
  return out;
}

export function checkType(type: QuestionType, seeds = 200): void {
  for (const level of LEVELS) {
    for (let seed = 0; seed < seeds; seed++) {
      const q = generateQuestion(type, level, createRng(`${type.id}:${level}:${seed}`));
      const problems = [...genericProblems(q), type.verify(q)].filter(Boolean);
      expect(problems, `${type.id} ${level} seed ${seed}: ${q.prompt}`).toEqual([]);
      const again = generateQuestion(type, level, createRng(`${type.id}:${level}:${seed}`));
      expect(again).toEqual(q);
    }
    const set = generateSet(type, level, 10, 'variety');
    expect(set.length, `${type.id} ${level} can only make ${set.length} different questions`).toBeGreaterThanOrEqual(Math.min(10, type.minDistinct ?? 8));
  }
}

export function checkUnit(unit: UnitDef, seeds?: number): void {
  for (const t of unit.types) checkType(t, seeds);
}
