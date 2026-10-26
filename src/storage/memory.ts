import type { Storage as AppStorage } from './types';

/** Local fake used for development and tests. Optionally mirrors to the browser's local storage. */
export function createMemoryStorage(persistKey?: string): AppStorage {
  const data = new Map<string, Map<string, unknown>>();
  const ls = (): globalThis.Storage | undefined => {
    try {
      return typeof localStorage === 'undefined' ? undefined : localStorage;
    } catch {
      return undefined;
    }
  };
  if (persistKey && ls()) {
    try {
      const saved = JSON.parse(ls()!.getItem(persistKey) ?? '{}') as Record<string, Record<string, unknown>>;
      for (const [c, docs] of Object.entries(saved)) data.set(c, new Map(Object.entries(docs)));
    } catch {
      /* start empty */
    }
  }
  const save = (): void => {
    if (!persistKey || !ls()) return;
    const out: Record<string, Record<string, unknown>> = {};
    for (const [c, docs] of data) out[c] = Object.fromEntries(docs);
    try {
      ls()!.setItem(persistKey, JSON.stringify(out));
    } catch {
      /* ignore */
    }
  };
  const col = (c: string): Map<string, unknown> => {
    let m = data.get(c);
    if (!m) data.set(c, (m = new Map()));
    return m;
  };
  return {
    async get<T>(c: string, id: string) {
      return col(c).get(id) as T | undefined;
    },
    async list<T>(c: string) {
      return [...col(c).values()] as T[];
    },
    async set(c, id, value) {
      col(c).set(id, structuredClone(value));
      save();
    },
    async remove(c, id) {
      col(c).delete(id);
      save();
    },
  };
}
