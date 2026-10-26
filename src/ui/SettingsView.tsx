import { useState } from 'preact/hooks';
import type { Kid } from '../core/profiles';
import { GOAL_CHOICES, REWARD_LEVELS, REWARD_SHOWS, type KidSettings, type RewardLevel } from '../core/settings';
import { Back } from './Back';
import { playTone, soundAvailable } from './sound';

interface Props {
  kids: Kid[];
  kid?: Kid;
  settings?: KidSettings;
  onPickKid(id: string): void;
  onChange(patch: Partial<KidSettings>): void;
  onReset(): void;
  onBack(): void;
}

const LEVEL_TEXT: Record<RewardLevel, { name: string; line: string }> = {
  full: { name: 'Full', line: 'Pip grows at the end of a set, with a tiny nod at right answers. Stamp album, daily goal ring and a small celebration.' },
  light: { name: 'Light', line: 'Pip and three stamps, still. No nod, no extra stamps. A short, quiet set summary.' },
  minimal: { name: 'Minimal', line: 'No Pip, no stamps, no goal ring. Plain words: set finished, marks, minutes. Practice stays exactly as calm as before.' },
};

/** For a grown-up: how much reward each child sees. These are the child's own settings, so two children can differ. */
export function SettingsView({ kids, kid, settings, onPickKid, onChange, onReset, onBack }: Props) {
  const [toneMsg, setToneMsg] = useState('');
  return (
    <>
      <Back onClick={onBack}>Back</Back>
      <header class="u-body" style={{ gap: '6px' }}>
        <p class="label">For a grown-up</p>
        <h1 class="page" tabIndex={-1} id="page-h">
          Rewards and settings
        </h1>
        <p class="lede">Choose how much reward each child sees. These are the child's own settings, so they can differ.</p>
      </header>
      {kids.length === 0 || !kid || !settings ? (
        <p class="note">Add a kid first. Settings belong to each child.</p>
      ) : (
        <>
          <div class="who" role="group" aria-label="Settings for">
            <span class="label">Settings for</span>
            {kids.map((k) => (
              <button key={k.id} type="button" class="chip" aria-pressed={k.id === kid.id} onClick={() => onPickKid(k.id)}>
                {k.name}
              </button>
            ))}
          </div>
          <section class="card" aria-labelledby="rl-h">
            <h2 id="rl-h">Reward level</h2>
            <div class="optlist" role="radiogroup" aria-label="Reward level">
              {REWARD_LEVELS.map((l) => (
                <button key={l} type="button" role="radio" aria-checked={settings.reward === l} class="opt" onClick={() => onChange({ reward: l })}>
                  <b>{LEVEL_TEXT[l].name}</b>
                  <span>{LEVEL_TEXT[l].line}</span>
                </button>
              ))}
            </div>
          </section>
          <section class="card" aria-labelledby="calm-h">
            <h2 id="calm-h">Calm mode</h2>
            <p class="lede">No movement, no bright fills. Pip and stamps become plain paper tones and ticks. Your child also has a Calm switch at the top of every page.</p>
            <button type="button" class="btn" aria-pressed={settings.calm} onClick={() => onChange({ calm: !settings.calm })}>
              Calm: {settings.calm ? 'on' : 'off'}
            </button>
          </section>
          {soundAvailable() && (
          <section class="card" aria-labelledby="snd-h">
            <h2 id="snd-h">Sound</h2>
            <p class="lede">Off by default. When on, a right answer plays one very soft tone. Nothing plays while your child is thinking.</p>
            <div class="actions">
              <button type="button" class="btn" aria-pressed={settings.sound} onClick={() => onChange({ sound: !settings.sound })}>
                Sound: {settings.sound ? 'on' : 'off'}
              </button>
              <button type="button" class="btn quiet" onClick={() => setToneMsg(playTone() ? '' : 'This device cannot play a sound here.')}>
                Play a test tone
              </button>
            </div>
            {toneMsg && <p class="live" role="status">{toneMsg}</p>}
          </section>
          )}
          <section class="card" aria-labelledby="kb-h">
            <h2 id="kb-h">Word Quest keyboard help</h2>
            <p class="lede">The finger guide colours the on-screen keys by finger and shows the next letter. Turn it off when your child is ready to type from memory: that is when typing growth is real growth.</p>
            <button type="button" class="btn" aria-pressed={settings.keyboardHelp} onClick={() => onChange({ keyboardHelp: !settings.keyboardHelp })}>
              Finger guide: {settings.keyboardHelp ? 'on' : 'off'}
            </button>
          </section>
          <section class="card" aria-labelledby="goal-h">
            <h2 id="goal-h">Daily goal</h2>
            <p class="lede">Minutes of practice that fill the day. A short day is fine, a missed day never breaks the streak.</p>
            <div class="seg" role="radiogroup" aria-label="Daily goal in minutes">
              {GOAL_CHOICES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={settings.goalMinutes === m} aria-pressed={settings.goalMinutes === m} onClick={() => onChange({ goalMinutes: m })}>
                  {m} min
                </button>
              ))}
            </div>
          </section>
          <section class="card" aria-labelledby="shows-h">
            <h2 id="shows-h">What each level shows</h2>
            <div class="scroll-x">
              <table class="tbl">
                <thead>
                  <tr>
                    <th scope="col">Part of the app</th>
                    <th scope="col">Full</th>
                    <th scope="col">Light</th>
                    <th scope="col">Minimal</th>
                  </tr>
                </thead>
                <tbody>
                  {REWARD_SHOWS.map((r) => (
                    <tr key={r.part}>
                      <th scope="row">{r.part}</th>
                      <td>{r.full}</td>
                      <td>{r.light}</td>
                      <td>{r.minimal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p class="lede">Right and wrong in practice are the same for all levels: a tick or ? and a word, nothing moves. Calm mode is separate. It removes motion and bright fills at any level.</p>
          </section>
          <p>
            <button type="button" class="btn quiet" onClick={onReset}>
              Reset to this child's starting settings
            </button>
          </p>
        </>
      )}
    </>
  );
}
