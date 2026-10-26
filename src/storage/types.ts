/** Everything the app keeps goes through this one small interface. */
export interface Storage {
  get<T>(collection: string, id: string): Promise<T | undefined>;
  list<T>(collection: string): Promise<T[]>;
  set<T>(collection: string, id: string, value: T): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
}
