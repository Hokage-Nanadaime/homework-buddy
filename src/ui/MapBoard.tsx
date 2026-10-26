import type { MapSpec } from '../core/mapQuestion';
import { mapTaskWord, placeOnKey } from '../core/mapQuestion';
import type { Input } from '../core/question';
import { Feedback } from './Answer';
import { INDIA_BLANK, INDIA_KEY } from './mapSvg';

interface Props {
  spec: MapSpec;
  inputs: Input[];
  values: Record<string, string>;
  onChange(id: string, value: string): void;
  disabled?: boolean;
  marks?: (boolean | null | undefined)[];
  idPrefix: string;
}

/**
 * The map skill question. The child works on the printed empty map of India, so the picture here is the same empty map (always light,
 * like paper) and the list of places. The grown-up marks each place Right or Not yet: nothing is marked by the app. The answer map with
 * the numbered states is for the grown-up and stays closed until opened.
 */
export function MapBoard({ spec, inputs, values, onChange, disabled, marks, idPrefix }: Props) {
  return (
    <div class="mapq">
      <p class="mapq-task">
        <b>{mapTaskWord(spec.task)}</b> {spec.places.length === 1 ? 'this place' : 'these places'} on the empty map of India. The child does this on the printed map; a grown-up chooses Right or Not yet for each place.
      </p>
      <div class="mapq-body">
        <div class="mapq-fig" role="img" aria-label="Empty outline map of India" dangerouslySetInnerHTML={{ __html: INDIA_BLANK }} />
        <ul class="mapq-places">
          {spec.places.map((p, k) => {
            const input = inputs.find((i) => i.id === p.id)!;
            const v = values[p.id] ?? '';
            const ok = marks?.[k];
            return (
              <li key={p.id}>
                <fieldset class="mapq-row">
                  <legend>{p.name}</legend>
                  <div class="mapq-btns">
                    {(input.choices ?? []).map((c) => (
                      <button key={c} type="button" id={`${idPrefix}-${p.id}-${c}`} class={`choice${v === c ? ' picked' : ''}${v === c && ok === true ? ' is-ok' : ''}`} aria-pressed={v === c} disabled={disabled} onClick={() => onChange(p.id, v === c ? '' : c)}>
                        {c}
                      </button>
                    ))}
                    {ok !== undefined && ok !== null && <Feedback ok={ok} />}
                  </div>
                </fieldset>
              </li>
            );
          })}
        </ul>
      </div>
      <details class="mapq-key">
        <summary>Answer map for the grown-up</summary>
        <div class="mapq-fig" role="img" aria-label="Answer map of India with every state and union territory numbered" dangerouslySetInnerHTML={{ __html: INDIA_KEY }} />
        <p class="small muted">Look for: {spec.places.map((p) => placeOnKey(p.name)).join(', ')}.</p>
      </details>
    </div>
  );
}
