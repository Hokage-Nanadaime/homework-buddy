import { render } from 'preact';
import { App } from './app/App';
import './ui/tokens.css';
import './ui/app.css';

/**
 * Development only: "?fixture=history" seeds this browser with a made-up child who has eight weeks of history, so the
 * progress page can be looked at. It is stripped from the shipped build and never touches real data in the viewer.
 */
async function seedFixture(): Promise<void> {
  const fixture = new URLSearchParams(location.search).get('fixture');
  if (!import.meta.env.DEV || (fixture !== 'history' && fixture !== 'orchard')) return;
  const { buildHistory } = await import('../tests/fixtures/history');
  const { CHAPTERS } = await import('./core/chapters');
  const c = buildHistory(new Date());
  const db = {
    kids: { [c.kidId]: { id: c.kidId, name: c.name, grade: 3 }, kkabir: { id: 'kkabir', name: 'Kabir', grade: 3 } },
    progress: { [c.kidId]: c.progress },
    activity: { [c.kidId]: c.log },
    // "orchard": every chapter Done, and the ledger remembers 57 points (as if more books had been finished): Orchard 3
    rewards: { [c.kidId]: fixture === 'orchard' ? { ...c.rewards, chapters: Object.fromEntries(CHAPTERS.map((ch) => [ch.key, { at: '2026-09-01T00:00:00Z' }])), pipHigh: 57, init: '2026-09-01T00:00:00Z', milestonesInit: '2026-09-01T00:00:00Z', foundShown: '2026-09-01T00:00:00Z', milestonesShown: '2026-09-01T00:00:00Z' } : c.rewards },
    settings: { [c.kidId]: { kidId: c.kidId, reward: 'full', calm: false, sound: false, goalMinutes: 15 } },
    prefs: { app: { activeKid: c.kidId } },
  };
  try {
    localStorage.setItem('homework-buddy', JSON.stringify(db));
  } catch {
    /* no storage: the app starts empty */
  }
}

/** Development only: "?fixture=orchard-popup" shows the chapter popup that plants an orchard friend, for looking at the art. */
async function showOrchardPopup(): Promise<boolean> {
  if (!import.meta.env.DEV || new URLSearchParams(location.search).get('fixture') !== 'orchard-popup') return false;
  const { RewardPopups } = await import('./ui/RewardPopups');
  const chapter = { key: 'maths:12', title: 'Unit 12 Geometry', fromStage: 9, toStage: 9, done: 27, same: true, more: 10, nextName: 'Orchard 2', target: 'Orchard 2', orchard: { n: Number(new URLSearchParams(location.search).get('n') ?? 1), friend: (await import('./core/pip')).orchardFriend(Number(new URLSearchParams(location.search).get('n') ?? 1)) }, leaves: 2 };
  render(<RewardPopups plan={{ mode: 'full', queue: [{ kind: 'chapter', chapter }], lines: [] }} sound={false} onDone={() => undefined} />, document.getElementById('app')!);
  return true;
}

showOrchardPopup().then((shown) => (shown ? undefined : seedFixture().finally(() => render(<App />, document.getElementById('app')!))));
