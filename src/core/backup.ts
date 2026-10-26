import type { Storage } from '../storage';
import { normaliseLog, type ActivityLog } from './activity';
import type { Kid } from './profiles';
import type { KidProgress } from './progress';
import { normaliseRewards, type RewardsDoc } from './rewards';
import { normaliseSettings, type KidSettings } from './settings';

export interface BackupData {
  app: 'Homework Buddy';
  exportedAt: string;
  kids: Kid[];
  progress: Record<string, KidProgress | null>;
  activity: Record<string, ActivityLog | null>;
  settings?: Record<string, KidSettings | null>;
  rewards?: Record<string, RewardsDoc | null>;
  prefs: unknown;
}

export async function exportBackup(store: Storage, kids: Kid[], prefs: unknown, now: string): Promise<BackupData> {
  const pick = async <T,>(c: string): Promise<Record<string, T | null>> => Object.fromEntries(await Promise.all(kids.map(async (k) => [k.id, (await store.get<T>(c, k.id)) ?? null])));
  return { app: 'Homework Buddy', exportedAt: now, kids, progress: await pick<KidProgress>('progress'), activity: await pick<ActivityLog>('activity'), settings: await pick<KidSettings>('settings'), rewards: await pick<RewardsDoc>('rewards'), prefs };
}

/** Puts a backup back. Older backups (no activity) restore too: their activity starts with a baseline of the restored totals. */
export async function restoreBackup(store: Storage, raw: unknown, now: string): Promise<{ kids: number }> {
  const d = raw as Partial<BackupData> | undefined;
  if (!d || d.app !== 'Homework Buddy' || !Array.isArray(d.kids)) throw new Error('This is not a Homework Buddy backup.');
  for (const k of d.kids) {
    await store.set('kids', k.id, k);
    const p = d.progress?.[k.id];
    if (p) await store.set('progress', k.id, p);
    await store.set('activity', k.id, normaliseLog(d.activity?.[k.id] ?? undefined, k.id, now, p ?? undefined));
  }
  for (const k of d.kids) {
    // older backups have neither: the starting settings and an empty ledger
    await store.set('settings', k.id, normaliseSettings(d.settings?.[k.id] ?? undefined, k.id));
    await store.set('rewards', k.id, normaliseRewards(d.rewards?.[k.id] ?? undefined, k.id));
  }
  if (d.prefs) await store.set('prefs', 'app', d.prefs);
  return { kids: d.kids.length };
}
