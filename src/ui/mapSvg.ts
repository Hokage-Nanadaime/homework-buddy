import { registerMaps } from '../core/mapQuestion';
import { REGIONS } from '../subjects/evs/maps/regions';
import blank from '../subjects/evs/maps/india-blank.svg?raw';
import key from '../subjects/evs/maps/india-key.svg?raw';

/** The empty outline map of India (always light: black outlines on white) and the numbered answer-key version for the grown-up. */
export const INDIA_BLANK: string = blank;
export const INDIA_KEY: string = key;
registerMaps(blank, key, Object.fromEntries(REGIONS.map((r) => [r.name, r.n])));
