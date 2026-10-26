import { describe, expect, it } from 'vitest';
import { numberToWords, wordsToNumber } from '../src/core/numbers';

describe('number words', () => {
  it('round-trips every number up to 99999', () => {
    for (let n = 0; n <= 99999; n++) expect(wordsToNumber(numberToWords(n))).toBe(n);
  });
  it('matches the book style', () => {
    expect(numberToWords(4089)).toBe('four thousand eighty nine');
    expect(numberToWords(9009)).toBe('nine thousand nine');
    expect(numberToWords(2020)).toBe('two thousand twenty');
  });
});
