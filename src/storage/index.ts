import { artifactDbAvailable, createArtifactStorage } from './artifact';
import { createMemoryStorage } from './memory';
import type { Storage } from './types';

export type { Storage } from './types';

export interface Opened {
  store: Storage;
  /** 'artifact' = the shared database; 'browser' = this browser only (development or no database). */
  kind: 'artifact' | 'browser';
}

/** Real artifact database when published; local fake otherwise. */
export async function openStorage(): Promise<Opened> {
  const db = await artifactDbAvailable();
  return db ? { store: createArtifactStorage(db), kind: 'artifact' } : { store: createMemoryStorage('homework-buddy'), kind: 'browser' };
}

export function createStorage(): Storage {
  return createMemoryStorage('homework-buddy');
}
