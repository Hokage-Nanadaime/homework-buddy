import { describe, expect, it } from 'vitest';
import { isCorrect } from '../src/core/checker';
import { addKid, listKids } from '../src/core/profiles';
import { createRng } from '../src/core/rng';
import { createMemoryStorage } from '../src/storage/memory';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng(7);
    const b = createRng(7);
    expect([a.int(1, 99), a.int(1, 99), a.int(1, 99)]).toEqual([b.int(1, 99), b.int(1, 99), b.int(1, 99)]);
  });
  it('stays in range', () => {
    const r = createRng('x');
    for (let i = 0; i < 1000; i++) {
      const n = r.int(3, 9);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(9);
    }
  });
});

describe('checker', () => {
  it('tolerates commas, spaces and rupee marks', () => {
    expect(isCorrect('1,234', ['1234'])).toBe(true);
    expect(isCorrect(' Rs. 50', ['₹50'])).toBe(true);
    expect(isCorrect('', [''])).toBe(false);
    expect(isCorrect('12', ['13'])).toBe(false);
  });
});

describe('profiles', () => {
  it('adds and lists kids', async () => {
    const s = createMemoryStorage();
    await addKid(s, ' Asha ', 3);
    expect((await listKids(s)).map((k) => k.name)).toEqual(['Asha']);
    await expect(addKid(s, ' ', 3)).rejects.toThrow();
  });
});
