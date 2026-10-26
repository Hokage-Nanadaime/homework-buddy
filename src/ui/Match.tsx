import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { letterOf, tapLeft, tapRight, type MatchPick, type MatchSpec, type MatchStep } from '../core/match';
import { Feedback } from './Answer';

interface Props {
  spec: MatchSpec;
  /** blank id to the right item it is connected to ('' or missing: not connected) */
  values: Record<string, string>;
  onChange(id: string, value: string): void;
  disabled?: boolean;
  /** after checking: one result per pair, in the order of the left items */
  marks?: (boolean | null)[];
  idPrefix: string;
}

const COLOURS = 7;

/**
 * Match the following, as the school book prints it: items 1, 2, 3 on the left, items (a), (b), (c) opposite on the right.
 * Tap a left item, then a right item, to connect them (either order works). A line is drawn, the pair takes a colour and both ends
 * carry a badge naming the other end, so colour is never the only sign. Tap a connected item to undo. On a narrow screen the two
 * columns stack and the badges do the job of the lines. Nothing animates.
 */
export function MatchBoard({ spec, values, onChange, disabled, marks, idPrefix }: Props) {
  const [pick, setPick] = useState<MatchPick>(null);
  const [say, setSay] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const cols = useRef<HTMLDivElement>(null);
  const lrefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rrefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [lines, setLines] = useState<{ id: string; d: string }[]>([]);
  const [w, setW] = useState(0);

  const rightOf = (id: string): string => values[id] ?? '';
  const leftOfRight = (text: string): string | undefined => spec.lefts.find((l) => rightOf(l.id) === text)?.id;
  const colourOf = (id: string): number => spec.lefts.findIndex((l) => l.id === id) % COLOURS;

  const apply = (step: MatchStep): void => {
    for (const l of spec.lefts) if ((step.values[l.id] ?? '') !== rightOf(l.id)) onChange(l.id, step.values[l.id] ?? '');
    setPick(step.pick);
    if (step.say) setSay(step.say);
  };
  const tapL = (id: string): void => {
    if (!disabled) apply(tapLeft(spec, values, pick, id));
  };
  const tapR = (text: string): void => {
    if (!disabled) apply(tapRight(spec, values, pick, text));
  };

  // the lines: from the right edge of a left item to the left edge of its right item (two columns only)
  useLayoutEffect(() => {
    const el = box.current;
    const grid = cols.current;
    if (!el || !grid) return;
    const measure = (): void => {
      const b = grid.getBoundingClientRect();
      setW(el.getBoundingClientRect().width);
      if (b.width < 640) return setLines([]);
      const out: { id: string; d: string }[] = [];
      for (const l of spec.lefts) {
        const text = rightOf(l.id);
        const a = lrefs.current[l.id];
        const z = text ? rrefs.current[text] : null;
        if (!a || !z) continue;
        const ra = a.getBoundingClientRect();
        const rz = z.getBoundingClientRect();
        const x1 = ra.right - b.left;
        const y1 = ra.top + ra.height / 2 - b.top;
        const x2 = rz.left - b.left;
        const y2 = rz.top + rz.height / 2 - b.top;
        const mid = (x1 + x2) / 2;
        out.push({ id: l.id, d: `M${x1} ${y1}C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}` });
      }
      setLines(out);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(grid);
    return () => ro.disconnect();
  }, [values, spec, pick]);
  useEffect(() => setPick(null), [spec]);

  const rows = spec.lefts.length;
  return (
    <div class="match" ref={box} data-wide={w >= 640 ? '1' : '0'}>
      <p class="match-help">
        {disabled ? 'Your pairs' : pick ? (pick.side === 'l' ? 'Now tap the matching item on the right.' : 'Now tap the matching item on the left.') : 'Tap an item on the left, then its match on the right. Tap a joined item to undo.'}
      </p>
      <div class="match-cols" ref={cols}>
        <svg class="match-lines" width={w} height="100%" aria-hidden="true">
          {lines.map((ln) => (
            <g key={ln.id}>
              <path class="ml-ink" d={ln.d} />
              <path class={`ml-col mt-c${colourOf(ln.id)}`} d={ln.d} />
            </g>
          ))}
        </svg>
        <ol class="match-col" aria-label="Items to match" style={{ '--rows': rows } as never}>
          {spec.lefts.map((l, k) => {
            const text = rightOf(l.id);
            const on = pick?.side === 'l' && pick.id === l.id;
            const ok = marks?.[k];
            return (
              <li key={l.id}>
                <button
                  type="button"
                  ref={(e) => { lrefs.current[l.id] = e; }}
                  id={`${idPrefix}-${l.id}`}
                  class={`mt-item mt-left${text ? ` joined mt-c${colourOf(l.id)}` : ''}${on ? ' picked' : ''}${ok === true ? ' is-ok' : ok === false ? ' is-no' : ''}`}
                  aria-pressed={on}
                  disabled={disabled && !text}
                  aria-disabled={disabled ? 'true' : undefined}
                  aria-label={`${l.n}. ${l.text}. ${text ? `Joined to (${letterOf(spec, text)}) ${text}. Press to undo.` : on ? 'Chosen. Now choose its match.' : 'Not joined. Press to choose it.'}`}
                  onClick={() => tapL(l.id)}
                >
                  <span class="mt-n">{l.n}.</span>
                  <span class="mt-text">{l.text}</span>
                  {text && <span class="mt-badge" aria-hidden="true">({letterOf(spec, text)})</span>}
                </button>
                {ok !== undefined && ok !== null && (
                  <p class="mt-fb">
                    <Feedback ok={ok} />
                  </p>
                )}
              </li>
            );
          })}
        </ol>
        <ol class="match-col" aria-label="Matches" style={{ '--rows': rows } as never}>
          {spec.rights.map((r) => {
            const owner = leftOfRight(r.text);
            const num = owner ? spec.lefts.find((x) => x.id === owner)!.n : 0;
            const on = pick?.side === 'r' && pick.text === r.text;
            return (
              <li key={r.letter}>
                <button
                  type="button"
                  ref={(e) => { rrefs.current[r.text] = e; }}
                  class={`mt-item mt-right${owner ? ` joined mt-c${colourOf(owner)}` : ''}${on ? ' picked' : ''}`}
                  aria-pressed={on}
                  disabled={disabled && !owner}
                  aria-disabled={disabled ? 'true' : undefined}
                  aria-label={`(${r.letter}) ${r.text}. ${owner ? `Joined to ${num}. Press to undo.` : on ? 'Chosen. Now choose its match.' : 'Not joined. Press to choose it.'}`}
                  onClick={() => tapR(r.text)}
                >
                  <span class="mt-n">({r.letter})</span>
                  <span class="mt-text">{r.text}</span>
                  {owner && <span class="mt-badge" aria-hidden="true">{num}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <p class="sr" role="status" aria-live="polite">
        {say}
      </p>
    </div>
  );
}
