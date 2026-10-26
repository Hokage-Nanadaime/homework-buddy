import { useState } from 'preact/hooks';
import type { Kid } from '../core/profiles';

interface Props {
  kids: Kid[];
  activeId?: string;
  where: 'artifact' | 'browser';
  onAdd(name: string, grade: 3 | 4): Promise<void>;
  onPick(id: string): void;
  onRemove(id: string): Promise<void>;
  onBackup(): void;
  backupMsg: string;
  aiHints: boolean;
  aiAvailable: boolean;
  onAiHints(on: boolean): void;
  onSettings(id: string): void;
}

export function KidsView({ kids, activeId, where, onAdd, onPick, onRemove, onBackup, backupMsg, aiHints, aiAvailable, onAiHints, onSettings }: Props) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<3 | 4>(3);
  const [asking, setAsking] = useState<string>();
  const [err, setErr] = useState('');
  return (
    <>
      <h1 class="page" tabIndex={-1} id="page-h">
        Kids
      </h1>
      <section class="card" aria-labelledby="add-h">
        <h2 id="add-h" style={{ fontSize: '22px', marginBottom: '12px' }}>
          Add a kid
        </h2>
        <form
          class="kidform"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return setErr('Type a name first.');
            setErr('');
            await onAdd(name, grade);
            setName('');
          }}
        >
          <div class="field">
            <label for="kid-name">Name</label>
            <input id="kid-name" class="txt" style={{ maxWidth: '280px' }} value={name} autocomplete="off" onInput={(e) => setName((e.target as HTMLInputElement).value)} />
          </div>
          <fieldset class="field">
            <legend>Class</legend>
            <div class="seg" role="radiogroup" aria-label="Class">
              {([3, 4] as const).map((g) => (
                <button key={g} type="button" role="radio" aria-checked={grade === g} aria-pressed={grade === g} onClick={() => setGrade(g)}>
                  Class {g}
                </button>
              ))}
            </div>
          </fieldset>
          <button class="btn primary" type="submit">
            Add kid
          </button>
        </form>
        {err && (
          <p class="live" role="alert">
            {err}
          </p>
        )}
      </section>
      <section aria-labelledby="who-h" class="u-body" style={{ gap: '12px' }}>
        <h2 id="who-h" style={{ fontSize: '22px' }}>
          Who is practising?
        </h2>
        {kids.length === 0 ? (
          <p class="lede">No kids yet. Add one above to save stars and progress.</p>
        ) : (
          <ul class="kidlist">
            {kids.map((k) => (
              <li key={k.id}>
                <span class="grow">
                  <b>{k.name}</b> · Class {k.grade}
                  {k.id === activeId ? ' · picked' : ''}
                </span>
                <button class="btn" onClick={() => onPick(k.id)} aria-pressed={k.id === activeId}>
                  {k.id === activeId ? 'Picked' : `Pick ${k.name}`}
                </button>
                <button class="btn" onClick={() => onSettings(k.id)} aria-label={`Rewards and settings for ${k.name}`}>
                  Rewards and settings
                </button>
                {asking === k.id ? (
                  <>
                    <span role="alert">Remove {k.name} and all their stars and scores? This cannot be undone. Use Back up first to keep a copy.</span>
                    <button
                      class="btn danger"
                      onClick={async () => {
                        await onRemove(k.id);
                        setAsking(undefined);
                      }}
                    >
                      Yes, remove {k.name}
                    </button>
                    <button class="btn" onClick={() => setAsking(undefined)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <button class="btn quiet" onClick={() => setAsking(k.id)} aria-label={`Remove ${k.name}`}>
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section class="card" aria-labelledby="ai-h">
        <h2 id="ai-h" style={{ fontSize: '22px', marginBottom: '8px' }}>
          Parent settings
        </h2>
        <label class="check">
          <input id="ai-hints" type="checkbox" checked={aiHints} onChange={(e) => onAiHints((e.target as HTMLInputElement).checked)} />
          AI hints
        </label>
        <p class="lede">
          After a wrong answer a child can ask for "Explain it another way". Claude explains in simple words and never marks the answer. Uses your Claude plan.
          {aiAvailable ? '' : ' Not available in this view, so the ordinary hints are used.'}
        </p>
      </section>
      <section class="card" aria-labelledby="bk-h">
        <h2 id="bk-h" style={{ fontSize: '22px', marginBottom: '8px' }}>
          Backup
        </h2>
        <p class="lede" style={{ marginBottom: '12px' }}>
          {where === 'artifact' ? 'Kids and progress are saved in this app.' : 'Kids and progress are saved in this browser only.'} Back up to download a copy of everything as a file.
        </p>
        <button class="btn" onClick={onBackup}>
          Back up all data
        </button>
        {backupMsg && (
          <p class="live" role="status">
            {backupMsg}
          </p>
        )}
      </section>
    </>
  );
}
