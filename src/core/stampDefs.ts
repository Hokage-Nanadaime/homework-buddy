import { BOOKS } from './books';

/** The stamp catalogue (docs/design/e-mix/STAMPS.md). Names, plain-words rules and "why earned" lines. The rules themselves are in stamps.ts.
 * The friends sets and the golden Book finishers are generated from the book registry (books.ts); the other sets are written here. */
export interface StampSet {
  id: string;
  name: string;
  /** border shape, so sets differ without colour */
  border: string;
  fill: string;
  blurb: string;
}
export interface StampDef {
  id: string;
  name: string;
  set: string;
  rarity: 'common' | 'gold';
  species: string;
  glyph: string;
  /** how you earn it, in plain words */
  plain: string;
  /** shown in the new-stamp popup */
  why: string;
}

/** The sets that do not depend on any book: turning up, typing, exams. */
const OTHER_SETS: StampSet[] = [
  {
    "id": "try",
    "name": "Try-hard",
    "border": "circle",
    "fill": "sk4",
    "blurb": "For trying, fixing and coming back. Not only for being right."
  },
  {
    "id": "habit",
    "name": "Habit",
    "border": "pebble",
    "fill": "sk5",
    "blurb": "For turning up. A day off never undoes a stamp."
  },
  {
    "id": "typing",
    "name": "Typing",
    "border": "keycap",
    "fill": "sk6",
    "blurb": "For Word Quest."
  },
  {
    "id": "exam",
    "name": "Exam hero",
    "border": "shield",
    "fill": "sk7",
    "blurb": "For practice exams. You only race your own best."
  }
];
const OTHER_DEFS: StampDef[] = [
  {
    "id": "t_set",
    "name": "First Set Pip",
    "set": "try",
    "rarity": "common",
    "species": "pip",
    "glyph": "flag",
    "plain": "Finish your first practice set.",
    "why": "You finished your first set."
  },
  {
    "id": "t_challenge",
    "name": "Brave Pip",
    "set": "try",
    "rarity": "common",
    "species": "pip",
    "glyph": "diamond",
    "plain": "Try a Challenge set. You do not have to get it right.",
    "why": "You tried a Challenge set. That takes courage."
  },
  {
    "id": "t_fixed",
    "name": "Fix-It Pip",
    "set": "try",
    "rarity": "common",
    "species": "pip",
    "glyph": "loop",
    "plain": "Get a question right that you got wrong before.",
    "why": "You got a question right that you missed before."
  },
  {
    "id": "t_hint",
    "name": "Clever Pip",
    "set": "try",
    "rarity": "common",
    "species": "pip",
    "glyph": "bulb",
    "plain": "Ask for a hint and then finish the set well.",
    "why": "You asked for a hint, then finished the set well."
  },
  {
    "id": "t_back",
    "name": "Welcome Back Pip",
    "set": "try",
    "rarity": "common",
    "species": "pip",
    "glyph": "house",
    "plain": "Come back after three or more days away.",
    "why": "You came back after a break. Welcome back."
  },
  {
    "id": "t_gold",
    "name": "Golden Leaf Pip",
    "set": "try",
    "rarity": "gold",
    "species": "pip",
    "glyph": "goldleaf",
    "plain": "Pass Challenge on every topic of one chapter.",
    "why": "You passed Challenge on every topic of a chapter."
  },
  {
    "id": "h_3",
    "name": "Three-Day Hedgehog",
    "set": "habit",
    "rarity": "common",
    "species": "hedgehog",
    "glyph": "cal3",
    "plain": "Practise on 3 different days in one week.",
    "why": "You practised on 3 days this week."
  },
  {
    "id": "h_5",
    "name": "Five-Day Otter",
    "set": "habit",
    "rarity": "common",
    "species": "otter",
    "glyph": "cal5",
    "plain": "Practise on 5 different days in one week.",
    "why": "You practised on 5 days this week."
  },
  {
    "id": "h_run7",
    "name": "Seven-Day Squirrel",
    "set": "habit",
    "rarity": "common",
    "species": "squirrel",
    "glyph": "sun",
    "plain": "Practise on 7 days in a row. One day off in between is allowed.",
    "why": "You practised 7 days in a run."
  },
  {
    "id": "h_15",
    "name": "Quarter-Hour Tortoise",
    "set": "habit",
    "rarity": "common",
    "species": "turtle",
    "glyph": "clock15",
    "plain": "Practise for 15 minutes in one day.",
    "why": "You practised for 15 minutes in one day."
  },
  {
    "id": "h_run30",
    "name": "Thirty-Day Squirrel",
    "set": "habit",
    "rarity": "gold",
    "species": "squirrel",
    "glyph": "crown",
    "plain": "Practise on 30 days in a row. One day off in between is allowed.",
    "why": "You practised 30 days in a run."
  },
  {
    "id": "q_first",
    "name": "Keys Parrot",
    "set": "typing",
    "rarity": "common",
    "species": "parrot",
    "glyph": "keys",
    "plain": "Play Word Quest for the first time.",
    "why": "You played Word Quest for the first time."
  },
  {
    "id": "q_10",
    "name": "Ten-Word Cat",
    "set": "typing",
    "rarity": "common",
    "species": "cat",
    "glyph": "ten",
    "plain": "Type 10 words in one Word Quest.",
    "why": "You typed 10 words in one Word Quest."
  },
  {
    "id": "q_wpm",
    "name": "Speedy Rabbit",
    "set": "typing",
    "rarity": "common",
    "species": "rabbit",
    "glyph": "speed",
    "plain": "Type at 10 words a minute or faster in one Word Quest.",
    "why": "You typed 10 words a minute or faster."
  },
  {
    "id": "q_acc",
    "name": "Careful Owl",
    "set": "typing",
    "rarity": "common",
    "species": "owl",
    "glyph": "target",
    "plain": "Type with 95 right letters in every 100.",
    "why": "You typed with 95 right letters in every 100."
  },
  {
    "id": "e_first",
    "name": "First Exam Penguin",
    "set": "exam",
    "rarity": "common",
    "species": "penguin",
    "glyph": "sheet",
    "plain": "Finish a practice exam, on screen or typed in from paper.",
    "why": "You finished a practice exam."
  },
  {
    "id": "e_80",
    "name": "Steady Bear",
    "set": "exam",
    "rarity": "common",
    "species": "bear",
    "glyph": "n80",
    "plain": "Get 80 marks in every 100 in a practice exam.",
    "why": "You got 80 marks in every 100."
  },
  {
    "id": "e_sec",
    "name": "Full Section Tiger",
    "set": "exam",
    "rarity": "common",
    "species": "tiger",
    "glyph": "star",
    "plain": "Get every mark in one section of a practice exam.",
    "why": "You got every mark in one section."
  },
  {
    "id": "e_90",
    "name": "Exam Hero Owl",
    "set": "exam",
    "rarity": "gold",
    "species": "owl",
    "glyph": "trophy",
    "plain": "Get 90 marks in every 100 in a practice exam of 25 marks or more.",
    "why": "You got 90 marks in every 100."
  }
];
/** Explorer: trying more than one book. Overall, never required, never pressure. */
const EXPLORER_SET: StampSet = { id: 'explorer', name: 'Explorer', border: 'hex', fill: 'sk6', blurb: 'For trying more than one book. Nothing is locked: one book is fine too.' };
const EXPLORER_DEFS: StampDef[] = [
  { id: 'x_two', name: 'Two-Book Parrot', set: 'explorer', rarity: 'common', species: 'parrot', glyph: 'openbook', plain: 'Start a second book.', why: 'You started a second book.' },
  { id: 'x_three', name: 'Three-Book Otter', set: 'explorer', rarity: 'common', species: 'otter', glyph: 'star', plain: 'Start three books.', why: 'You started three books.' },
  { id: 'x_both', name: 'Both-Subjects Squirrel', set: 'explorer', rarity: 'common', species: 'squirrel', glyph: 'leaf', plain: 'Finish a chapter in two subjects in the same month.', why: 'You finished chapters in two subjects in one month.' },
];
const FINISHER_SET: StampSet = {
  "id": "book",
  "name": "Book finisher",
  "border": "burst",
  "fill": "gold",
  "blurb": "For finishing a whole book. Rare and golden."
};

export const STAMP_SETS: StampSet[] = [...BOOKS.map((b) => ({ id: b.id, ...b.stampSet })), ...OTHER_SETS, EXPLORER_SET, FINISHER_SET];
export const STAMP_DEFS: StampDef[] = [
  ...BOOKS.flatMap((b) =>
    b.chapters.map((c): StampDef => ({
      id: `${b.friendPrefix}${c.n}`,
      name: c.friend.name,
      set: b.id,
      rarity: 'common',
      species: c.friend.species,
      glyph: c.friend.glyph,
      plain: `Finish ${b.stampWord} ${c.n}, ${c.title}: pass Easy and Medium on every topic.`,
      why: `You finished ${b.stampWord} ${c.n}, ${c.title}.`,
    })),
  ),
  ...OTHER_DEFS,
  ...EXPLORER_DEFS,
  ...BOOKS.map((b): StampDef => ({
    id: b.finisher.id,
    name: b.finisher.name,
    set: FINISHER_SET.id,
    rarity: 'gold',
    species: b.finisher.species,
    glyph: b.finisher.glyph,
    plain: `Finish all ${b.chapters.length} ${b.plural}.`,
    why: `You finished all ${b.chapters.length} ${b.plural}.`,
  })),
];
