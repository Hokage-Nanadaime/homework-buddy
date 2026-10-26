import type { Storage } from './types';

/** The part of the artifact `db` capability this app uses (see the runtime's db typings). */
interface Snap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface ArtifactDb {
  doc(path: string): { get(): Promise<Snap>; set(data: Record<string, unknown>): Promise<void>; delete(): Promise<void> };
  collection(path: string): { get(): Promise<{ docs: Snap[] }> };
}

/** Adapter for the artifact's shared database. Writes go one at a time, as the runtime asks. */
export function createArtifactStorage(db: ArtifactDb): Storage {
  let queue: Promise<unknown> = Promise.resolve();
  const inOrder = <T,>(job: () => Promise<T>): Promise<T> => {
    const run = queue.then(job, job);
    queue = run.catch(() => undefined);
    return run;
  };
  return {
    async get<T>(c: string, id: string) {
      const snap = await db.doc(`${c}/${id}`).get();
      return snap.exists ? (snap.data() as T) : undefined;
    },
    async list<T>(c: string) {
      const snap = await db.collection(c).get();
      return snap.docs.filter((d) => d.exists).map((d) => d.data() as T);
    },
    set: (c, id, value) => inOrder(() => db.doc(`${c}/${id}`).set(JSON.parse(JSON.stringify(value)) as Record<string, unknown>)),
    remove: (c, id) => inOrder(() => db.doc(`${c}/${id}`).delete()),
  };
}

/** Asks the viewer for the database. Resolves undefined when the page runs outside the artifact viewer. */
export async function artifactDbAvailable(): Promise<ArtifactDb | undefined> {
  try {
    const claude = (globalThis as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
    if (!claude?.use) return undefined;
    const db = await Promise.race([claude.use('db'), new Promise((r) => setTimeout(() => r(null), 4000))]);
    return (db as ArtifactDb | null) ?? undefined;
  } catch {
    return undefined;
  }
}
