import { useState } from 'preact/hooks';
import type { NextStamp } from '../core/rewardHints';
import { nextStampLine } from '../core/rewardHints';
import type { RewardsDoc } from '../core/rewards';
import { STAMP_DEFS, STAMP_SETS, type StampDef } from '../core/stamps';
import { Back } from './Back';
import { StampArt } from './RewardArt';

interface Props {
  kidName?: string;
  rewards: RewardsDoc;
  next?: NextStamp;
  /** stamps earned since the last visit get a New dot */
  newIds?: string[];
  /** the child opened a stamp: its New tag goes */
  onSeen?(id: string): void;
  onBack(): void;
}

type Filter = 'all' | 'earned' | 'locked';
const dateText = (iso: string): string => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** The stamp album: every stamp in the catalogue, in its sets. Stamps are for finishing, trying, fixing and coming back, not only for being right. */
export function StampAlbum({ kidName, rewards, next, newIds = [], onSeen, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<string>(next?.def.id ?? STAMP_DEFS[0]!.id);
  const earned = (d: StampDef): boolean => Boolean(rewards.stamps[d.id]);
  const count = STAMP_DEFS.filter(earned).length;
  const picked = STAMP_DEFS.find((d) => d.id === sel)!;
  return (
    <>
      <Back onClick={onBack}>Back</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <p class="label">Your collection</p>
        <h1 class="page" tabIndex={-1} id="page-h">
          Stamp album
        </h1>
        <p class="lede">
          {kidName ? `${kidName} has` : 'You have'} {count} of {STAMP_DEFS.length} stamps. Stamps are for finishing, trying, fixing and coming back, not only for being right.
        </p>
        <div class="seg" role="group" aria-label="Show stamps">
          {(['all', 'earned', 'locked'] as Filter[]).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'earned' ? 'Earned' : 'Locked'}
            </button>
          ))}
        </div>
      </header>
      <div class="album-grid">
        <section class="card" aria-label="Stamps">
          {STAMP_SETS.map((set) => {
            const defs = STAMP_DEFS.filter((d) => d.set === set.id);
            const got = defs.filter(earned).length;
            const shown = defs.filter((d) => (filter === 'all' ? true : filter === 'earned' ? earned(d) : !earned(d)));
            if (shown.length === 0) return null;
            return (
              <div class="setblock" key={set.id}>
                <header>
                  <h3>{set.name}</h3>
                  <b>
                    {got} of {defs.length}
                  </b>
                </header>
                <div class="pbar" role="img" aria-label={`${got} of ${defs.length}`}>
                  <i style={{ width: `${(got / defs.length) * 100}%` }} />
                </div>
                <p class="muted small">{set.blurb}</p>
                <div class="tiles2">
                  {shown.map((d) => (
                    <button key={d.id} type="button" class="tile2" aria-pressed={sel === d.id} onClick={() => {
                      setSel(d.id);
                      if (earned(d)) onSeen?.(d.id);
                    }} aria-label={`${earned(d) ? d.name : `Locked: ${d.name}`}${d.rarity === 'gold' ? ', rare' : ''}`}>
                      <StampArt def={d} locked={!earned(d)} deco />
                      {d.rarity === 'gold' && <span class="rare">Rare</span>}
                      {newIds.includes(d.id) && <span class="newdot">New</span>}
                      <b>{earned(d) ? d.name : 'Locked'}</b>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
        <aside class="stack sticky">
          <section class="card detail" aria-live="polite">
            <p class="label">{earned(picked) ? 'Your stamp' : 'To earn'}</p>
            <StampArt def={picked} locked={!earned(picked)} deco />
            <h2 style={{ fontSize: '24px', textAlign: 'center' }}>
              {picked.name}
              {!earned(picked) && <small class="muted"> (locked)</small>}
            </h2>
            <p class="muted" style={{ textAlign: 'center' }}>
              {STAMP_SETS.find((s) => s.id === picked.set)!.name}
              {picked.rarity === 'gold' ? ' · rare' : ''}
            </p>
            {earned(picked) ? (
              <p style={{ textAlign: 'center' }}>
                <b>Earned {dateText(rewards.stamps[picked.id]!.at)}.</b> {picked.why}
              </p>
            ) : (
              <p class="earned-note">
                <b>How to earn it</b>
                <br />
                {picked.plain}
              </p>
            )}
          </section>
          {next && <p class="card">{nextStampLine(next)}</p>}
        </aside>
      </div>
    </>
  );
}
