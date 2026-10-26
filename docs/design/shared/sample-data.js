/* Shared invented sample data for all four design directions. No real names. Include with <script src="../shared/sample-data.js"></script>
   (each page may also paste this inline: published artifacts must be self-contained). Exposes window.HB. */
window.HB = (function () {
  const kids = [
    { id: 'mira', name: 'Mira', age: 8, avatar: 'M', stars: 143, level: 7, streakDays: 4, todayMin: 12, goalMin: 15 },
    { id: 'kabir', name: 'Kabir', age: 9, avatar: 'K', stars: 61, level: 4, streakDays: 1, todayMin: 0, goalMin: 15 },
  ];
  const maths = [
    [1, 'Chapter title', 1, 'done', 3], [2, 'Addition', 17, 'done', 3], [3, 'Subtraction', 26, 'done', 2],
    [4, 'Multiplication', 36, 'going', 2], [5, 'Division', 48, 'going', 1], [6, 'Chapter title', 64, 'new', 0],
    [7, 'Money', 80, 'new', 0], [8, 'Length', 95, 'new', 0], [9, 'Weight', 103, 'new', 0],
    [10, 'Capacity', 108, 'new', 0], [11, 'Fraction', 115, 'new', 0], [12, 'Geometry', 129, 'new', 0],
  ].map(([n, title, page, state, levelsDone]) => ({ n, title, page, state, levelsDone })); // levelsDone: 0-3 of Easy/Medium/Challenge
  const reader = [
    [1, 'Animal World', 'done', 3], [2, 'Nature Cares', 'going', 1], [3, 'Chapter title', 'new', 0], [4, 'Adventure', 'new', 0],
  ].map(([n, title, state, levelsDone]) => ({ n, title, state, levelsDone }));
  const practice = [
    'Naming Words', 'Replacing Words', 'Chapter title', 'Describing Words', 'Verbs', 'Prepositions',
    'Articles', 'Sentences', 'Chapter title', 'Chapter title', 'Writing Skills',
  ].map((title, i) => ({ n: i + 1, title, state: i < 2 ? 'done' : i < 4 ? 'going' : 'new', levelsDone: i < 2 ? 3 : i < 4 ? 1 : 0 }));
  const unseen = { count: 24, done: 3 };
  /* Multiplication unit topics (real shape: topics grouped, each with Easy/Medium/Challenge) */
  const multTopics = [
    ['Multiplication as repeated addition', [3, 3, 1]], ['Tables of 2, 3, 4, 5', [3, 2, 0]], ['Tables of 6, 7, 8, 9', [2, 1, 0]],
    ['Multiply a 2-digit number by 1 digit', [2, 0, 0]], ['Multiply a 3-digit number by 1 digit', [0, 0, 0]], ['Word problems', [1, 0, 0]],
  ].map(([title, stars]) => ({ title, stars })); // stars per level 0-3
  /* Question samples */
  const questions = {
    mcq: { subject: 'maths', unit: 'Multiplication', level: 'Medium', n: 4, of: 8, text: 'There are 6 boxes. Each box has 8 mangoes. How many mangoes are there in all?',
      options: ['42', '48', '54', '56'], answer: 1, hint: 'Think 6 groups of 8. Try 8 + 8 + 8 first, then keep adding.' },
    typed: { subject: 'maths', unit: 'Multiplication', level: 'Medium', n: 5, of: 8, text: '36 × 4 = ?', answer: '144', wrongTry: '124',
      hint: 'Do the ones first: 6 × 4 = 24. Write 4, carry 2. Then 3 tens × 4 = 12 tens, plus the 2 carried.' },
    english: { subject: 'english', unit: 'Animal World · Unseen passage', level: 'Easy', n: 2, of: 6,
      passageTitle: 'The Clever Crow', passage: ['A thirsty crow found a jug with a little water at the bottom. Its beak could not reach.', 'The crow dropped small stones into the jug, one by one. The water rose slowly. At last the crow drank and flew away happily.'],
      text: 'Why did the crow drop stones into the jug?', options: ['To break the jug', 'To make the water rise', 'To play a game', 'To hide the water'], answer: 1,
      hint: 'Read the second paragraph again. What happened to the water after each stone?' },
  };
  const setSummary = { topic: 'Tables of 6, 7, 8, 9', level: 'Medium', got: 7, of: 8, stars: 3, minutes: 6, hintsUsed: 1, fixedOldMistake: true, triedChallenge: false, firstTry: 6 };
  const wordQuest = { clue: 'A big grey animal with a trunk', answer: 'elephant', typedSoFar: 'eleph', wpm: 14, accuracy: 94, wordsToday: 9 };
  /* Six weeks of history for Mira. Weekly accuracy % (null = not enough data: fewer than 10 attempts). */
  const weeks = ['26 Aug', '2 Sep', '9 Sep', '16 Sep', '23 Sep', '30 Sep'];
  const history = {
    weeks,
    overall: [48, 54, 61, 66, 71, 76],
    maths: [50, 55, 63, 70, 75, 80],
    english: [45, 52, 58, 61, 66, 71],
    topics: { /* weekly accuracy for two topics: real growth vs plateau */
      'Multiplication · Tables of 6, 7, 8, 9': [30, 38, 52, 64, 74, 81],
      'Division · Sharing equally': [52, 55, 54, 56, 55, 57],
      'English · Verbs': [null, 40, 48, 55, 62, 68],
    },
    minutes: [38, 55, 62, 70, 84, 91], days: [3, 4, 4, 5, 5, 6], sets: [5, 7, 9, 10, 12, 13],
    baseline: { firstAttempts: 20, accuracy: 44, note: 'First 20 answers, 26 to 28 Aug' },
    levels: { Easy: 'done in 8 of 12 maths units', Medium: 'started in 4', Challenge: 'tried in 2' },
    typing: { wpm: [6, 8, 9, 11, 13, 14], accuracy: [81, 85, 88, 90, 93, 94], fingerGuideOff: [false, false, false, true, true, true] },
    mistakeThemes: [['Carrying in multiplication', 9], ['Misread the question', 7], ['Spelling of plurals', 5], ['Remainders in division', 5], ['Tell time to the minute', 3]],
    heat: { /* accuracy % per chapter, null = not tried */
      'Maths 1 Numbers': 92, 'Maths 2 Addition': 88, 'Maths 3 Subtraction': 79, 'Maths 4 Multiplication': 74, 'Maths 5 Division': 57, 'Maths 6 Time': 49, 'Maths 7 Money': null,
      'Reader 1 Animal World': 84, 'Reader 2 Nature Cares': 66, 'Practice Nouns': 90, 'Practice Pronouns': 82, 'Practice Describing': 71, 'Practice Verbs': 68, 'Practice Prepositions': null,
    },
    nextUp: ['Division · Sharing equally: 2 short Easy sets, then Medium', 'Time to the minute: re-read book page 66 together', 'Verbs: one Challenge set to stretch'],
    exam: { portion: 'Maths units 1 to 5 (Periodic Test, 25 marks)', ready: 'Nearly there', predicted: '18 to 21 of 25', weakest: 'Division' },
  };
  return { kids, maths, reader, practice, unseen, multTopics, questions, setSummary, wordQuest, history };
})();
