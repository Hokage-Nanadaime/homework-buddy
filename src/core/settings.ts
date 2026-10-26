/** Per-kid reward settings (a grown-up chooses them), stored in collection `settings`, document id = kid id. */
export type RewardLevel = 'full' | 'light' | 'minimal';
export const REWARD_LEVELS: RewardLevel[] = ['full', 'light', 'minimal'];
export const GOAL_CHOICES = [10, 15, 20, 30, 45];

export interface KidSettings {
  kidId: string;
  reward: RewardLevel;
  /** no movement, no bright fills */
  calm: boolean;
  /** off by default: one very soft tone at a right answer (never while thinking) */
  sound: boolean;
  /** minutes of practice that fill the day */
  goalMinutes: number;
  /** Word Quest: the finger guide on the on-screen keyboard (turned off for real typing growth) */
  keyboardHelp: boolean;
}

export const defaultSettings = (kidId: string): KidSettings => ({ kidId, reward: 'full', calm: false, sound: false, goalMinutes: 15, keyboardHelp: true });

/** Old or partial data loads: anything missing or odd gets the starting value. */
export function normaliseSettings(raw: Partial<KidSettings> | undefined, kidId: string): KidSettings {
  const d = defaultSettings(kidId);
  if (!raw || typeof raw !== 'object') return d;
  const goal = Number(raw.goalMinutes);
  return {
    kidId,
    reward: REWARD_LEVELS.includes(raw.reward as RewardLevel) ? (raw.reward as RewardLevel) : d.reward,
    calm: raw.calm === true,
    sound: raw.sound === true,
    goalMinutes: Number.isFinite(goal) && goal >= 5 && goal <= 180 ? Math.round(goal) : d.goalMinutes,
    keyboardHelp: raw.keyboardHelp !== false,
  };
}

/** What each reward level shows (the table on the settings page and the rule the screens follow). */
export const REWARD_SHOWS: { part: string; full: string; light: string; minimal: string }[] = [
  { part: 'Pip on home', full: 'Yes', light: 'Yes, still', minimal: 'No' },
  { part: 'Pip grows at the end of a set', full: 'Yes, small motion', light: 'Yes, no motion', minimal: 'No' },
  { part: 'Pip nod at a right answer', full: 'Yes, under half a second', light: 'No', minimal: 'No' },
  { part: 'Stamp album', full: 'All stamps', light: 'Three stamps', minimal: 'No' },
  { part: 'Daily goal', full: 'Ring and words', light: 'Ring and words', minimal: 'Words only' },
];
export const showsRing = (s: Pick<KidSettings, 'reward'>): boolean => s.reward !== 'minimal';
