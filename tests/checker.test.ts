import { describe, expect, it } from 'vitest';
import { checkInput, checkInputDetailed, defaultHint } from '../src/core/checker';
import type { Input } from '../src/core/question';

const num = (answer: string, extra: Partial<Input> = {}): Input => ({ id: 'a', mode: 'number', accepted: [answer], ...extra });
const words = (answer: string, extra: Partial<Input> = {}): Input => ({ id: 'a', mode: 'words', accepted: [answer], ...extra });

describe('number answers', () => {
  it('accepts commas, spaces and rupee marks', () => {
    expect(checkInput(num('7000'), '7,000')).toBe(true);
    expect(checkInput(num('7000'), ' 7 000 ')).toBe(true);
    expect(checkInput(num('50'), 'Rs. 50')).toBe(true);
    expect(checkInput(num('7000'), '7001')).toBe(false);
  });
  it('accepts a unit after the number only when the question has one', () => {
    expect(checkInput(num('5', { unit: 'cm' }), '5 cm')).toBe(true);
    expect(checkInput(num('5', { unit: 'cm' }), '5CM')).toBe(true);
    expect(checkInput(num('5', { unit: 'cm' }), '5')).toBe(true);
    expect(checkInput(num('5'), '5 cm')).toBe(false);
  });
  it('says so when the number is right but written in words', () => {
    const r = checkInputDetailed(num('7000'), 'seven thousand');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/right number/);
    expect(checkInputDetailed(num('7000', { format: 'either' }), 'Seven Thousand').ok).toBe(true);
  });
});

describe('word answers', () => {
  it('ignores case, hyphens and "and"', () => {
    expect(checkInput(words('thirty one'), 'Thirty-One')).toBe(true);
    expect(checkInput(words('one hundred fifty one'), 'one hundred and fifty one')).toBe(true);
  });
  it('says so when the number is right but written in digits', () => {
    const r = checkInputDetailed(words('seven thousand'), '7000');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/in words/);
    expect(checkInputDetailed(words('seven thousand', { format: 'either' }), '7,000').ok).toBe(true);
  });
});

describe('hints', () => {
  it('tells the kid what to write', () => {
    expect(defaultHint(num('1'))).toBe('Write the answer as a number');
    expect(defaultHint(words('one'))).toBe('Write the answer in words');
    expect(defaultHint(num('1', { hint: 'Write it in rupees' }))).toBe('Write it in rupees');
  });
});
