import { describe, expect, it } from 'vitest';
import { exportBackup, restoreBackup } from '../src/core/backup';
import { emptyRewards, normaliseRewards } from '../src/core/rewards';
import { defaultSettings, normaliseSettings, showsRing } from '../src/core/settings';
import { createMemoryStorage } from '../src/storage/memory';

const NOW = '2026-10-24T10:00:00.000Z';

describe('kid settings', () => {
  it('starts calm-free, sound off, 15 minutes, full rewards', () => {
    expect(defaultSettings('k1')).toEqual({ kidId: 'k1', reward: 'full', calm: false, sound: false, goalMinutes: 15, keyboardHelp: true });
  });
  it('loads old or odd data with the starting values', () => {
    expect(normaliseSettings(undefined, 'k1')).toEqual(defaultSettings('k1'));
    expect(normaliseSettings({ reward: 'weird', goalMinutes: 9999, calm: 'yes' } as never, 'k1')).toEqual(defaultSettings('k1'));
    expect(normaliseSettings({ reward: 'minimal', calm: true, sound: true, goalMinutes: 20 }, 'k1')).toEqual({ kidId: 'k1', reward: 'minimal', calm: true, sound: true, goalMinutes: 20, keyboardHelp: true });
  });
  it('the ring is words only at the Minimal level', () => {
    expect(showsRing({ reward: 'full' })).toBe(true);
    expect(showsRing({ reward: 'light' })).toBe(true);
    expect(showsRing({ reward: 'minimal' })).toBe(false);
  });
});

describe('rewards doc', () => {
  it('starts empty', () => {
    expect(emptyRewards('k1')).toEqual({ v: 1, kidId: 'k1', stamps: {}, chapters: {}, levels: {}, milestones: {}, seen: [], wrong: [] });
  });
  it('loads partial or old data', () => {
    expect(normaliseRewards(undefined, 'k1')).toEqual(emptyRewards('k1'));
    const d = normaliseRewards({ kidId: 'k1', stamps: { t_set: { at: NOW } }, ledger: [{ at: NOW }] } as never, 'k1');
    expect(d.stamps.t_set).toEqual({ at: NOW });
    expect(d.chapters).toEqual({});
    expect(d.wrong).toEqual([]);
  });
});

describe('backup with settings and rewards', () => {
  it('round trips, and an old backup restores with starting settings', async () => {
    const a = createMemoryStorage();
    const kid = { id: 'k1', name: 'Asha', grade: 3 as const };
    await a.set('kids', 'k1', kid);
    const s = { ...defaultSettings('k1'), reward: 'light' as const, calm: true, goalMinutes: 30 };
    await a.set('settings', 'k1', s);
    const r = { ...emptyRewards('k1'), init: NOW, stamps: { t_set: { at: NOW } }, chapters: { 'maths:1': { at: NOW, pre: true as const } }, wrong: ['abc'] };
    await a.set('rewards', 'k1', r);
    const data = JSON.parse(JSON.stringify(await exportBackup(a, [kid], {}, NOW)));
    const b = createMemoryStorage();
    await restoreBackup(b, data, NOW);
    expect(await b.get('settings', 'k1')).toEqual(s);
    expect(await b.get('rewards', 'k1')).toEqual(r);
    delete data.settings;
    delete data.rewards;
    const c = createMemoryStorage();
    await restoreBackup(c, data, NOW);
    expect(await c.get('settings', 'k1')).toEqual(defaultSettings('k1'));
    expect(await c.get('rewards', 'k1')).toEqual(emptyRewards('k1'));
  });
});

describe('keyboard help setting', () => {
  it('is on by default, can be turned off, and old settings load with it on', () => {
    expect(normaliseSettings(undefined, 'k1').keyboardHelp).toBe(true);
    expect(normaliseSettings({ keyboardHelp: false } as never, 'k1').keyboardHelp).toBe(false);
    expect(normaliseSettings({ reward: 'full', calm: false, sound: false, goalMinutes: 15 } as never, 'k1').keyboardHelp).toBe(true);
  });
});
