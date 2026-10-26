import type { Storage } from '../storage';
import { normaliseAnswer } from './checker';
import type { Question } from './question';
import { hashKey } from './seen';
import { questionHash } from './sheet';

/** The one function the artifact's `sample` capability gives a page. Only the text is used. */
export type SampleFn = (input: string, options?: { modelTier?: 'quick' | 'default'; cache?: boolean }) => Promise<{ text: string }>;

export const HINT_WORD_LIMIT = 40;

/**
 * What Claude is asked. It sees the question, the worked steps worked out by code, and the wrong answer.
 * It never marks anything and must not give the final answer.
 */
export function buildHintPrompt(q: Question, wrong: string): string {
  return [
    'You help a child in India, Class 3 (age 8 to 9), who got a maths question wrong. Write in British English with short, simple words.',
    `Question: ${q.prompt}`,
    q.diagram ? `Picture: ${q.diagram.alt}` : '',
    `The correct method, worked out by the app (for you only, never copy the final answer): ${q.steps.join(' ')}`,
    `The child answered: "${wrong}".`,
    `Explain another way to think about it in under ${HINT_WORD_LIMIT} words. Do not say the final answer. Do not give the result of the last step. Do not say whether the child is right or wrong and do not mark anything. Reply with only the explanation, no greeting.`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const flat = (s: string): string => normaliseAnswer(s).replace(/(?<=\d),(?=\d{3})/g, '');

/** True when the reply gives the answer away. A number or word that the question itself already shows is allowed. */
export function leaksAnswer(reply: string, q: Question): boolean {
  const text = ` ${flat(reply)} `;
  const prompt = ` ${flat(q.prompt)} `;
  const has = (hay: string, needle: string): boolean => new RegExp(`(^|[^\\p{L}\\p{N}])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(hay);
  for (const input of q.inputs) {
    if (input.mode === 'open' || input.mode === 'sentence') continue;
    const answers = [...input.accepted, ...(input.mode === 'ordered' || input.mode === 'multi' || input.mode === 'abacus' ? [input.accepted.join(', ')] : [])];
    for (const a of answers) {
      const n = flat(a);
      if (!n) continue;
      if (has(prompt, n)) continue;
      if (has(text, n)) return true;
    }
  }
  return false;
}

export interface ExplainArgs {
  /** null or undefined: not available here */
  sample?: SampleFn | null;
  /** the parent's "AI hints" setting */
  enabled: boolean;
  q: Question;
  wrong: string;
  store?: Storage;
}

const cacheId = (q: Question, wrong: string): string => hashKey(`${questionHash(q)}|${normaliseAnswer(wrong)}`);

/**
 * "Explain it another way". Gives back a short explanation, or undefined for any reason it cannot
 * (off, unavailable, failed, too long, or it would give the answer away): the app then keeps the ordinary hints.
 */
export async function explainAnotherWay({ sample, enabled, q, wrong, store }: ExplainArgs): Promise<string | undefined> {
  if (!enabled || !sample) return undefined;
  const id = cacheId(q, wrong);
  try {
    const hit = await store?.get<{ text: string }>('aihints', id);
    if (hit?.text && !leaksAnswer(hit.text, q)) return hit.text;
  } catch {
    /* no cache: ask */
  }
  try {
    const { text } = await sample(buildHintPrompt(q, wrong), { modelTier: 'quick' });
    const reply = text.trim().replace(/^["“]|["”]$/g, '');
    if (!reply || words(reply) > HINT_WORD_LIMIT + 25 || leaksAnswer(reply, q)) return undefined;
    await store?.set('aihints', id, { text: reply }).catch(() => undefined);
    return reply;
  } catch {
    return undefined;
  }
}
