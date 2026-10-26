import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from '../src/storage/memory';
import { buildHintPrompt, explainAnotherWay, leaksAnswer, type SampleFn } from '../src/core/aiHint';
import type { Question } from '../src/core/question';

const q: Question = {
  typeId: 'T',
  level: 'easy',
  prompt: 'What is 7 + 5 + 8?',
  inputs: [{ id: 'a', mode: 'number', accepted: ['20'] }],
  steps: ['7 + 5 = 12.', '12 + 8 = 20.'],
  marks: 1,
  tags: [],
  facts: { a: 7, b: 5, c: 8 },
};

const says = (text: string): { fn: SampleFn; calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    fn: async (input) => {
      calls.push(input);
      return { text };
    },
  };
};

describe('Explain it another way', () => {
  it('gives the reply when on, and sends the question, the code-made steps and the wrong answer', async () => {
    const s = says('Add the first two numbers, then add the last one to that.');
    const out = await explainAnotherWay({ sample: s.fn, enabled: true, q, wrong: '19' });
    expect(out).toBe('Add the first two numbers, then add the last one to that.');
    expect(s.calls[0]).toContain('What is 7 + 5 + 8?');
    expect(s.calls[0]).toContain('12 + 8 = 20.');
    expect(s.calls[0]).toContain('"19"');
    expect(s.calls[0]).toMatch(/under 40 words/);
    expect(buildHintPrompt(q, '19')).toMatch(/Do not say the final answer/);
  });
  it('does nothing when the setting is off or the capability is missing', async () => {
    const s = says('Try adding in pairs.');
    expect(await explainAnotherWay({ sample: s.fn, enabled: false, q, wrong: '19' })).toBeUndefined();
    expect(s.calls).toEqual([]);
    expect(await explainAnotherWay({ sample: null, enabled: true, q, wrong: '19' })).toBeUndefined();
  });
  it('falls back silently when the call fails', async () => {
    const boom: SampleFn = async () => {
      throw { code: 'not_granted', message: 'no' };
    };
    expect(await explainAnotherWay({ sample: boom, enabled: true, q, wrong: '19' })).toBeUndefined();
  });
  it('caches by question and wrong answer', async () => {
    const store = createMemoryStorage();
    const s = says('Add 7 and 5 first, then the last number.');
    const a = await explainAnotherWay({ sample: s.fn, enabled: true, q, wrong: '19', store });
    const b = await explainAnotherWay({ sample: s.fn, enabled: true, q, wrong: ' 19 ', store });
    expect(b).toBe(a);
    expect(s.calls.length).toBe(1);
    await explainAnotherWay({ sample: s.fn, enabled: true, q, wrong: '21', store });
    expect(s.calls.length).toBe(2);
  });
  it('never lets the final answer through', async () => {
    const s = says('Add 12 and 8 to get 20.');
    expect(await explainAnotherWay({ sample: s.fn, enabled: true, q, wrong: '19' })).toBeUndefined();
    expect(leaksAnswer('The total is 20', q)).toBe(true);
    expect(leaksAnswer('Start with 7 and 5.', q)).toBe(false);
    expect(leaksAnswer('Twenty is the number', { ...q, inputs: [{ id: 'a', mode: 'words', accepted: ['twenty'] }] })).toBe(true);
  });
});
