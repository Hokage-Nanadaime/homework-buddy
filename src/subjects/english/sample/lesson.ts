import type { Level } from '../../../core/question';
import type { BankEntry, LessonData } from '../types';

/**
 * A small made-up lesson (not from any book): the public sample content for English and EVS.
 * Two texts: a poem stored in full and a passage stored as a summary. Twelve entries of every kind, spread over the three levels.
 */
const LEVEL_OF = (i: number): Level => (['easy', 'medium', 'challenge'] as const)[i % 3]!;

const poem = 'The Little Kite';
const garden = 'Grandma’s Garden';

const facts: [string, string, string[]][] = [
  ['What colour is the kite?', 'red', ['blue', 'green', 'yellow']],
  ['Who holds the string?', 'Ravi', ['Grandma', 'the teacher', 'a bird']],
  ['Where does the kite fly?', 'over the hill', ['under the bridge', 'into the house', 'down the well']],
  ['What helps the kite go up?', 'the wind', ['the rain', 'the sun', 'a ladder']],
  ['How does the kite move?', 'it dances', ['it sleeps', 'it runs', 'it swims']],
  ['What does the kite have at the end?', 'a long tail', ['a red hat', 'two wheels', 'a bell']],
  ['When does Ravi fly the kite?', 'in the evening', ['at midnight', 'before school', 'in the rain']],
  ['What does the kite look like in the sky?', 'a bird', ['a fish', 'a car', 'a tree']],
  ['Which word rhymes with "high"?', 'sky', ['hill', 'string', 'tail']],
  ['Which word rhymes with "string"?', 'sing', ['kite', 'wind', 'sky']],
  ['How does Ravi feel?', 'happy', ['angry', 'sleepy', 'scared']],
  ['What happens when the wind stops?', 'the kite comes down', ['the kite flies away', 'Ravi goes to sleep', 'it starts to rain']],
];

const words = ['kite', 'string', 'wind', 'hill', 'tail', 'dance', 'cloud', 'evening', 'garden', 'flower', 'seed', 'water'];

const entries: BankEntry[] = [];
let n = 0;
const id = () => `E09-Q${String(++n).padStart(3, '0')}`;
const ev = (quote: string) => ({ source: 'text' as const, page: 2, quote });

facts.forEach(([stem, answer, wrong], i) => {
  entries.push({ id: id(), type: 'E09-T01', level: LEVEL_OF(i), kind: 'mcq', text: 'kite', stem, options: [answer, ...wrong], answer, evidence: ev(answer) });
  entries.push({ id: id(), type: 'E09-T01', level: LEVEL_OF(i), kind: 'tf', text: 'kite', statement: `The poem says: ${answer} (${i + 1}).`, answer: i % 2 === 0, evidence: ev(answer) });
});
words.forEach((w, i) => {
  entries.push({ id: id(), type: 'E09-T02', level: LEVEL_OF(i), kind: 'blank', text: i < 8 ? 'kite' : 'garden', stem: `Fill in the blank (${i + 1}): the ____ is in the poem.`, answer: [w], box: i % 2 ? [w, 'apple', 'chair'] : undefined, evidence: ev(w) });
  entries.push({ id: id(), type: 'E09-T02', level: LEVEL_OF(i), kind: 'jumble', word: w, clue: i % 3 === 0 ? `a word from the lesson, ${i + 1}` : undefined, evidence: ev(w) });
});
for (let i = 0; i < 12; i++) {
  const pairs: [string, string][] = [
    ['kite', `flies ${i + 1}`],
    ['wind', 'blows'],
    ['bird', 'sings'],
  ];
  entries.push({ id: id(), type: 'E09-T03', level: LEVEL_OF(i), kind: 'match', text: 'kite', stem: `Match each word with what it does (set ${i + 1}).`, pairs, evidence: ev('kite') });
  entries.push({ id: id(), type: 'E09-T03', level: LEVEL_OF(i), kind: 'order', text: 'kite', stem: `Put these in the order they happen in the poem (set ${i + 1}).`, items: ['Ravi runs up the hill', 'The wind lifts the kite', 'The kite dances in the sky', 'The kite comes down'], evidence: ev('kite') });
  entries.push({ id: id(), type: 'E09-T03', level: LEVEL_OF(i), kind: 'multi', text: 'kite', stem: `Tap every word that is in the poem (set ${i + 1}).`, options: ['kite', 'wind', 'train', 'pencil'], answers: ['kite', 'wind'], evidence: ev('kite') });
}
const shorts: [string, string, string[], string][] = [
  ['Why does the kite come down?', 'The kite comes down because the wind stops blowing.', ['wind', 'stops'], 'kite'],
  ['How does Ravi feel when the kite flies high? Why?', 'Ravi feels happy because his kite is flying high like a bird.', ['happy', 'high'], 'kite'],
  ['What does Grandma grow in her garden?', 'Grandma grows flowers and vegetables in her garden.', ['flowers', 'vegetables'], 'garden'],
  ['Why does Grandma water the plants every morning?', 'She waters them every morning so that they do not dry up in the sun.', ['water', 'dry'], 'garden'],
];
for (let i = 0; i < 12; i++) {
  const [stem, model, keywords, text] = shorts[i % shorts.length]!;
  entries.push({ id: id(), type: 'E09-T04', level: LEVEL_OF(i), kind: 'short', text, stem: i < 4 ? stem : `${stem} (${i + 1})`, model, keywords, evidence: text === 'garden' ? { source: 'summary', page: 5, quote: 'garden' } : ev('wind') });
  entries.push({ id: id(), type: 'E09-T05', level: LEVEL_OF(i), kind: 'together', text: 'kite', stem: `Work in pairs. Say the poem aloud with actions (turn ${i + 1}).`, evidence: ev('kite') });
}

export const lesson: LessonData = {
  number: 9,
  slug: 'fixture',
  title: 'Kites and Gardens',
  pages: [1, 6],
  texts: [
    {
      id: 'kite',
      title: poem,
      pages: [2, 2],
      stored: 'full',
      paragraphs: [
        'My little kite is red and bright,\nIt dances in the evening light.\nRavi holds the long white string,\nThe wind comes by and makes it sing.',
        'Up it goes, so very high,\nLike a bird across the sky,\nOver the hill and past the tree,\nWaving its long tail at me.',
        'When the wind stops, down it comes,\nRavi laughs and off he runs.',
      ],
    },
    {
      id: 'garden',
      title: garden,
      pages: [4, 5],
      stored: 'summary',
      paragraphs: ['Grandma has a small garden. She grows flowers and vegetables, and waters them every morning. Ravi helps her plant seeds.'],
    },
  ],
  vocabulary: words.map((word) => ({ word })),
  types: [
    { id: 'E09-T01', title: 'Choose the right answer about the poem', inventory: ['A1'], marking: 'code' },
    { id: 'E09-T02', title: 'Words from the lesson', inventory: ['A2'], marking: 'code' },
    { id: 'E09-T03', title: 'Match, order and pick', inventory: ['A3'], marking: 'code' },
    { id: 'E09-T04', title: 'Answer in a sentence', inventory: ['A4'], marking: 'suggested' },
    { id: 'E09-T05', title: 'Say it together', inventory: ['A5'], marking: 'together' },
  ],
  entries,
};

/** Sample lesson number n (reader 1-4, practice 11-21, unseen 31, EVS 1-14): the same content with ids that belong to that number. */
export const sampleLessonN = (n: number, title: string): LessonData => {
  const tag = (s: string): string => s.replace('E09-', `E${String(n).padStart(2, '0')}-`);
  return { ...lesson, number: n, slug: `sample-${n}`, title, types: lesson.types.map((t) => ({ ...t, id: tag(t.id) })), entries: lesson.entries.map((e) => ({ ...e, id: tag(e.id), type: tag(e.type) })) };
};
