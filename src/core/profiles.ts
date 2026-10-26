import type { Storage } from '../storage';

export interface Kid {
  id: string;
  name: string;
  grade: 3 | 4;
}

const COLLECTION = 'kids';

export async function listKids(store: Storage): Promise<Kid[]> {
  return (await store.list<Kid>(COLLECTION)).sort((a, b) => a.name.localeCompare(b.name));
}

export async function addKid(store: Storage, name: string, grade: Kid['grade']): Promise<Kid> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Name is needed');
  const kid: Kid = { id: `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: trimmed, grade };
  await store.set(COLLECTION, kid.id, kid);
  return kid;
}

export function removeKid(store: Storage, id: string): Promise<void> {
  return store.remove(COLLECTION, id);
}
