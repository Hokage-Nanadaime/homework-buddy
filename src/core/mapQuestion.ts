import type { Question } from './question';

/**
 * Map skill (EVS): the child labels or colours places on the empty outline map of India on paper; the grown-up marks each place
 * Right or Not yet in the app. One blank per place, never auto-marked (docs/evs/DESIGN.md).
 */
export interface MapSpec {
  task: 'label' | 'colour' | 'colour and label';
  places: { id: string; name: string }[];
}

/** The map behind a question, or null. The EVS builder puts `facts.map = { task, places }` on map questions. */
export function mapOf(q: Pick<Question, 'facts' | 'inputs'>): MapSpec | null {
  const m = q.facts?.map as { task?: MapSpec['task']; places?: string[] } | undefined;
  if (!m || !Array.isArray(m.places) || m.places.length === 0) return null;
  return { task: m.task ?? 'label', places: m.places.map((name, i) => ({ id: q.inputs[i]?.id ?? `p${i}`, name })) };
}

/** What to do with each place, in the child's words: "Label", "Colour" or "Colour and label". */
export const mapTaskWord = (t: MapSpec['task']): string => (t === 'colour and label' ? 'Colour and label' : t === 'colour' ? 'Colour' : 'Label');

// The pictures are registered by the app at start (they are files of the EVS book), so the print code in core stays free of file imports.
let blankSvg = '';
let keySvg = '';
let numbers: Record<string, number> = {};
export const registerMaps = (blank: string, key: string, regionNumbers: Record<string, number> = {}): void => {
  blankSvg = blank;
  keySvg = key;
  numbers = regionNumbers;
};
/** The number a place has on the answer map: "Kerala (17)". */
export const placeOnKey = (name: string): string => (numbers[name] ? `${name} (${numbers[name]})` : name);
export const mapSvgs = (): { blank: string; key: string } => ({ blank: blankSvg, key: keySvg });

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The printed map question: the real empty map (light paper) with the list of places beside it, a box to tick or number for the grown-up. */
export function mapPrintHtml(spec: MapSpec): string {
  const places = spec.places.map((p) => `<li>${esc(p.name)}</li>`).join('');
  return `<div class="hb-mapq"><div class="hb-mapfig" role="img" aria-label="Empty outline map of India">${blankSvg}</div><div class="hb-mapside"><p class="hb-hint">${esc(mapTaskWord(spec.task))} ${spec.places.length === 1 ? 'this place' : 'these places'} on the map.</p><ol class="hb-mapplaces">${places}</ol></div></div>`;
}

/** The answer-key page for a map question: the numbered map and the places to look for. */
export function mapKeyHtml(spec: MapSpec): string {
  return `<div class="hb-mapq key"><div class="hb-mapfig" role="img" aria-label="Answer map of India, every state and union territory numbered">${keySvg}</div><div class="hb-mapside"><p class="hb-hint">Look for:</p><ol class="hb-mapplaces">${spec.places.map((p) => `<li>${esc(placeOnKey(p.name))}</li>`).join('')}</ol></div></div>`;
}

/** Width of the map on paper, in mm, for a text width; the map picture is 800 x 900, so it is 9/8 as tall as wide. */
export const mapWidthMm = (textW: number): number => Math.min(105, textW * 0.62);
/** Height a printed map question takes, in mm: the map or the list of places, whichever is taller. The pages are split with this sum, and the PDF draws with it. */
export const mapHeightMm = (spec: MapSpec, textW: number): number => Math.max((mapWidthMm(textW) * 9) / 8, 14 + spec.places.length * 6.5) + 4;

export const MAP_PRINT_CSS = `
.hb-mapq{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:8mm;align-items:start;break-inside:avoid;page-break-inside:avoid;margin-top:4px}
.hb-mapfig{border:1.5px solid var(--paper-grey);border-radius:2mm;padding:2mm;background:var(--paper-white)}
.hb-mapfig svg{display:block;width:100%;height:auto;max-height:165mm}
.hb-mapplaces{margin:0;padding-left:1.4em;display:flex;flex-direction:column;gap:6px;font-size:16px}
.hb-mapplaces li{padding-left:2px}
`;
