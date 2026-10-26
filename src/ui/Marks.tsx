import type { Level } from '../core/question';
import type { Status } from '../core/bookStatus';

const NAMES: Record<Level, string> = { easy: 'Easy', medium: 'Medium', challenge: 'Challenge' };

/** Three ink marks: Easy (small dot), Medium (big dot), Challenge (diamond). Filled means done. The words are always there for screen readers. */
export function Marks({ marks, fresh, big }: { marks: Record<Level, boolean>; fresh?: Level; big?: boolean }) {
  const said = (['easy', 'medium', 'challenge'] as Level[]).map((l) => `${NAMES[l]} ${marks[l] ? 'done' : 'not yet'}`).join(', ');
  return (
    <span class={`marks${big ? ' big' : ''}`} role="img" aria-label={said}>
      {(['easy', 'medium', 'challenge'] as Level[]).map((l) => (
        <i key={l} class={`mk ${l}${marks[l] ? ' on' : ''}${fresh === l ? ' fresh' : ''}`} />
      ))}
    </span>
  );
}

const WORD: Record<Status, string> = { done: 'Done', reading: 'Reading', new: 'New' };
/** Done, Reading or New: an ink shape and the word. */
export function StatusWord({ status }: { status: Status }) {
  return (
    <span class={`stw ${status}`}>
      <i aria-hidden="true" />
      {WORD[status]}
    </span>
  );
}
