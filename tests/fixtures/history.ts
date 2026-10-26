import { emptyLog, record, recordExam, recordQuest, buildEntry, type ActivityLog, type AnswerRecord } from '../../src/core/activity';
import { cellKey, emptyProgress, type KidProgress } from '../../src/core/progress';
import { countedTopics } from '../../src/core/chapters';
import { emptyRewards, type RewardsDoc } from '../../src/core/rewards';
import { readerUnits } from '../../src/app/englishBooks';
import { builtUnits } from '../../src/subjects/maths';

/**
 * A made-up child with eight weeks of history, for the tests and for the dev-only "?fixture=history" screenshots.
 * Never shipped: only tests and the dev server import it.
 */
export interface SampleChild {
  kidId: string;
  name: string;
  log: ActivityLog;
  progress: KidProgress;
  rewards: RewardsDoc;
}

const DAY = 86400000;
const monday = (now: Date): number => {
  const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return d - ((new Date(d).getUTCDay() + 6) % 7) * DAY;
};

export function buildHistory(now: Date, kidId = 'kmira'): SampleChild {
  const start = monday(now) - 7 * 7 * DAY;
  let log = emptyLog(kidId, new Date(start).toISOString());
  const progress = emptyProgress(kidId);
  const maths = builtUnits[0]!;
  const maths5 = builtUnits[4]!;
  const reader = readerUnits[0]!;
  const mt = countedTopics(maths);
  const dt = countedTopics(maths5);
  const et = countedTopics(reader);
  let n = 0;
  const answers = (typeId: string, level: string, count: number, right: number, hints = 0): AnswerRecord[] =>
    Array.from({ length: count }, (_, i) => ({ typeId, level, correct: i < right, q: `${typeId}-${n++}`, firstTry: i < right, hints: i < hints ? 1 : 0, seconds: 20 }));
  for (let w = 0; w < 8; w++) {
    const wk = start + w * 7 * DAY;
    const days = Math.min(6, 2 + Math.floor(w / 1.5));
    for (let d = 0; d < days; d++) {
      const at = new Date(wk + d * DAY + 15 * 3600000).toISOString();
      const mathsRight = Math.round(10 * (0.45 + w * 0.05));
      const divRight = 6;
      const engRight = Math.round(10 * (0.4 + w * 0.045));
      const sets: [string, AnswerRecord[], 'maths' | 'english', string][] = [
        [mt[d % mt.length]!.id, answers(mt[d % mt.length]!.id, 'easy', 10, mathsRight, w === 3 ? 2 : 0), 'maths', '1'],
        [dt[0]!.id, answers(dt[0]!.id, 'easy', 10, divRight), 'maths', '5'],
        [et[d % et.length]!.id, answers(et[d % et.length]!.id, 'easy', 10, engRight), 'english', '1'],
      ];
      for (const [, a, subject, unit] of sets) {
        log = record(log, buildEntry({ at, kid: kidId, mode: 'topic', subject, book: subject === 'maths' ? 'maths' : 'reader', unit, size: 10, seconds: 240, answers: a }), a);
      }
    }
    log = recordQuest(log, { at: new Date(wk + 2 * DAY).toISOString(), lesson: 1, level: 1, words: 8, chars: 60 + w * 12, secs: 90, mistakes: Math.max(1, 8 - w), help: w < 5 });
  }
  log = recordExam(log, { at: new Date(start + 40 * DAY).toISOString(), mode: 'exam', label: 'Periodic Test - I', portion: ['1', '2'], subject: 'maths', got: 18, of: 25, secs: 1900, sections: [{ n: 1, got: 5, of: 5 }, { n: 2, got: 13, of: 20 }] });
  // progress: Unit 1 passed at Easy and Medium (so Done), Unit 5 Division flat, Reader 1 climbing
  for (const t of mt) for (const l of ['easy', 'medium'] as const) progress.cells[cellKey(t.id, l)] = { attempts: 40, correct: 31, sets: 4, best: 9, bestOf: 10, stars: 3, last: new Date(now.getTime() - 3 * DAY).toISOString() };
  for (const t of dt) progress.cells[cellKey(t.id, 'easy')] = { attempts: 80, correct: 44, sets: 8, best: 6, bestOf: 10, stars: 1, last: new Date(now.getTime() - 2 * DAY).toISOString() };
  for (const t of et) progress.cells[cellKey(t.id, 'easy')] = { attempts: 30, correct: 20, sets: 3, best: 7, bestOf: 10, stars: 2, last: new Date(now.getTime() - 40 * DAY).toISOString() };
  const rewards = { ...emptyRewards(kidId), init: new Date(start).toISOString(), chapters: { 'maths:1': { at: new Date(start + 30 * DAY).toISOString() } }, stamps: { t_set: { at: new Date(start).toISOString() }, mf1: { at: new Date(start + 30 * DAY).toISOString() }, q_first: { at: new Date(start + 2 * DAY).toISOString() } } };
  return { kidId, name: 'Mira', log, progress, rewards };
}
