# Stamps for direction E (Mix)

49 stamps in 8 sets, plus the EVS set below (15 more: 64 in the design page) and the Explorer set added in the code (3 more). 6 of the first 49 are rare gold ones; the EVS finisher is a seventh. Screens: `09-stamp-album.html` (the album), `05-set-summary.html` (new-stamp popup), `01-home.html` (recent stamps and a hint for the next one).
Art: one generator, `SA.stamp(def, {locked, deco})`, in the common script block of every page (search for `var SA = `). A stamp is a border (shape depends on the set), a character (species: ears, face, marks, fur) and a round accessory badge with a glyph. Colours are tokens (`--sk1` to `--sk7`, `--gold`, `--st-*`), light and dark. A locked stamp is the same drawing as a flat silhouette with no face or badge.

## Sets

- Maths friends: 12
- Reader friends: 4
- Practice Book friends: 11
- Try-hard: 6 (1 rare gold)
- Habit: 5 (1 rare gold)
- Typing: 4
- Exam hero: 4 (1 rare gold)
- Book finisher: 3 (3 rare gold)
- EVS friends: 14 (added 2026-10-25, see the EVS section below; the EVS finisher joins Book finisher: 4 gold in that set)

Set borders (so sets differ without colour): scallop (Maths), rounded square (Reader), hexagon (Practice Book), circle (Try-hard), pebble (Habit), key cap (Typing), shield (Exam hero), star burst (gold, Book finisher and all rare stamps).

## Rules for the whole system

- **Earned once, kept for ever.** At the end of every set (after `record()` and `recordResults()`) the app evaluates every stamp not yet in the kid's ledger. A stamp whose rule is true is written once with the date (D0). Nothing is ever removed, even if a later change to the content or the rules would make the rule false.
- **Catch-up is silent.** The first time stamps are evaluated for a kid with earlier history, stamps that are already true are written with `ref: "pre"` and no popup is queued. Only stamps that become true during a set are queued for popups.
- **Effort counts.** Try-hard, Habit and Typing stamps do not need right answers. Only the friends, Exam hero and Book finisher sets need results.
- **No ranking, no loss.** Rules compare a kid with their own past only. A missed day never removes a stamp or resets a run (see Seven-Day Squirrel).
- Dates are UTC dates, as in the activity log.

## Terms used in the exact rules

- `topic`: a question type id (`QuestionType.id`). `level`: easy, medium or challenge.
- `passed(topic, level)`: `(cell.bestOf >= 3 && cell.best * 100 >= PASS_PERCENT * cell.bestOf) || firsts[topic]?.passed?.[level] !== undefined`, where `cell = progress.cells[topic + "|" + level]` (src/core/progress.ts) and `PASS_PERCENT = 70` (src/core/activity.ts). The cell covers history from before logging began; `firsts` carries the date. Only topic sets count (mixed sheets do not change `best`, and `record()` only sets `passed` for mode "topic").
- `counted topics` of a chapter: `unit.types.filter(isAutoMarked)`. "Do together" topics and the printed Book exercises are not counted (Book exercises have no levels).
- `chapterDone(book, n)`: the chapter has at least one counted topic and every counted topic has `passed(topic, "easy")` and `passed(topic, "medium")`. Challenge is optional. This is exactly the Done mark in the index (see PIP.md).
- `totalSets` = sum of `baseline.cells[*].sets` + `entries.length` + sum of `weeks[*].sets` (weeks hold only the overflow of old entries).
- `entry day`: `entry.at.slice(0, 10)`. `weekOf`: `weekOf()` in src/core/activity.ts (Monday, UTC).

## Stamp table

| id | name | set | how you earn it (plain words) | exact rule | rarity | data needed |
|---|---|---|---|---|---|---|
| mf1 | Big Number Bear | Maths friends | Finish Unit 1, Chapter title: pass Easy and Medium on every topic. | chapterDone(maths, 1). | Common | No |
| mf2 | Plus Panda | Maths friends | Finish Unit 2, Addition: pass Easy and Medium on every topic. | chapterDone(maths, 2). | Common | No |
| mf3 | Minus Mouse | Maths friends | Finish Unit 3, Subtraction: pass Easy and Medium on every topic. | chapterDone(maths, 3). | Common | No |
| mf4 | Times Turtle | Maths friends | Finish Unit 4, Multiplication: pass Easy and Medium on every topic. | chapterDone(maths, 4). | Common | No |
| mf5 | Divide Duck | Maths friends | Finish Unit 5, Division: pass Easy and Medium on every topic. | chapterDone(maths, 5). | Common | No |
| mf6 | Tick-Tock Owl | Maths friends | Finish Unit 6, Chapter title: pass Easy and Medium on every topic. | chapterDone(maths, 6). | Common | No |
| mf7 | Rupee Rabbit | Maths friends | Finish Unit 7, Money: pass Easy and Medium on every topic. | chapterDone(maths, 7). | Common | No |
| mf8 | Long Giraffe | Maths friends | Finish Unit 8, Length: pass Easy and Medium on every topic. | chapterDone(maths, 8). | Common | No |
| mf9 | Heavy Hippo | Maths friends | Finish Unit 9, Weight: pass Easy and Medium on every topic. | chapterDone(maths, 9). | Common | No |
| mf10 | Pour Penguin | Maths friends | Finish Unit 10, Capacity: pass Easy and Medium on every topic. | chapterDone(maths, 10). | Common | No |
| mf11 | Slice Fox | Maths friends | Finish Unit 11, Fraction: pass Easy and Medium on every topic. | chapterDone(maths, 11). | Common | No |
| mf12 | Shape Tiger | Maths friends | Finish Unit 12, Geometry: pass Easy and Medium on every topic. | chapterDone(maths, 12). | Common | No |
| rf1 | Zoo Elephant | Reader friends | Finish Reader lesson 1, Animal World: pass Easy and Medium on every topic. | chapterDone(reader, 1). | Common | No |
| rf2 | Leafy Koala | Reader friends | Finish Reader lesson 2, Nature Cares: pass Easy and Medium on every topic. | chapterDone(reader, 2). | Common | No |
| rf3 | Kind Cat | Reader friends | Finish Reader lesson 3, Chapter title: pass Easy and Medium on every topic. | chapterDone(reader, 3). | Common | No |
| rf4 | Brave Dragon | Reader friends | Finish Reader lesson 4, Adventure: pass Easy and Medium on every topic. | chapterDone(reader, 4). | Common | No |
| pf1 | Noun Frog | Practice Book friends | Finish Practice Book section 1, Naming Words: pass Easy and Medium on every topic. | chapterDone(practice, 1). | Common | No |
| pf2 | Swap Monkey | Practice Book friends | Finish Practice Book section 2, Replacing Words: pass Easy and Medium on every topic. | chapterDone(practice, 2). | Common | No |
| pf3 | Tally Cow | Practice Book friends | Finish Practice Book section 3, Chapter title: pass Easy and Medium on every topic. | chapterDone(practice, 3). | Common | No |
| pf4 | Bright Lion | Practice Book friends | Finish Practice Book section 4, Describing Words: pass Easy and Medium on every topic. | chapterDone(practice, 4). | Common | No |
| pf5 | Busy Bee | Practice Book friends | Finish Practice Book section 5, Verbs: pass Easy and Medium on every topic. | chapterDone(practice, 5). | Common | No |
| pf6 | Over Pig | Practice Book friends | Finish Practice Book section 6, Prepositions: pass Easy and Medium on every topic. | chapterDone(practice, 6). | Common | No |
| pf7 | Article Snail | Practice Book friends | Finish Practice Book section 7, Articles: pass Easy and Medium on every topic. | chapterDone(practice, 7). | Common | No |
| pf8 | Full Stop Dog | Practice Book friends | Finish Practice Book section 8, Sentences: pass Easy and Medium on every topic. | chapterDone(practice, 8). | Common | No |
| pf9 | Split Robot | Practice Book friends | Finish Practice Book section 9, Chapter title: pass Easy and Medium on every topic. | chapterDone(practice, 9). | Common | No |
| pf10 | Story Sheep | Practice Book friends | Finish Practice Book section 10, Chapter title: pass Easy and Medium on every topic. | chapterDone(practice, 10). | Common | No |
| pf11 | Pen Seal | Practice Book friends | Finish Practice Book section 11, Writing Skills: pass Easy and Medium on every topic. | chapterDone(practice, 11). | Common | No |
| ef1 | Family Duck | EVS friends | Finish EVS chapter 1, The Family: pass Easy and Medium on every topic. | chapterDone(evs, 1). | Common | No |
| ef2 | Twin Koala | EVS friends | Finish EVS chapter 2, Family Similarities: pass Easy and Medium on every topic. | chapterDone(evs, 2). | Common | No |
| ef3 | Dairy Cow | EVS friends | Finish EVS chapter 3, Our Food: pass Easy and Medium on every topic. | chapterDone(evs, 3). | Common | No |
| ef4 | Woolly Sheep | EVS friends | Finish EVS chapter 4, Our Dresses: pass Easy and Medium on every topic. | chapterDone(evs, 4). | Common | No |
| ef5 | Cave Bear | EVS friends | Finish EVS chapter 5, Chapter title: pass Easy and Medium on every topic. | chapterDone(evs, 5). | Common | No |
| ef6 | Helper Dog | EVS friends | Finish EVS chapter 6, Chapter title: pass Easy and Medium on every topic. | chapterDone(evs, 6). | Common | No |
| ef7 | Believer Lion | EVS friends | Finish EVS chapter 7, Chapter title: pass Easy and Medium on every topic. | chapterDone(evs, 7). | Common | No |
| ef8 | Play Monkey | EVS friends | Finish EVS chapter 8, Chapter title: pass Easy and Medium on every topic. | chapterDone(evs, 8). | Common | No |
| ef9 | Home Snail | EVS friends | Finish EVS chapter 9, Our Homes: pass Easy and Medium on every topic. | chapterDone(evs, 9). | Common | No |
| ef10 | Tidy Rabbit | EVS friends | Finish EVS chapter 10, Beautiful Homes: pass Easy and Medium on every topic. | chapterDone(evs, 10). | Common | No |
| ef11 | Compass Fox | EVS friends | Finish EVS chapter 11, Directions: pass Easy and Medium on every topic. | chapterDone(evs, 11). | Common | No |
| ef12 | Zoom Tiger | EVS friends | Finish EVS chapter 12, Conquering Distances: pass Easy and Medium on every topic. | chapterDone(evs, 12). | Common | No |
| ef13 | Message Penguin | EVS friends | Finish EVS chapter 13, Closing Distances: pass Easy and Medium on every topic. | chapterDone(evs, 13). | Common | No |
| ef14 | Flag Elephant | EVS friends | Finish EVS chapter 14, Chapter title: pass Easy and Medium on every topic. | chapterDone(evs, 14). | Common | No |
| t_set | First Set Pip | Try-hard | Finish your first practice set. | totalSets >= 1, where totalSets = sum(baseline.cells[*].sets) + entries.length + sum(weeks[*].sets). | Common | No |
| t_challenge | Brave Pip | Try-hard | Try a Challenge set. You do not have to get it right. | any entry row with l = "challenge" and a >= 1, or any firsts[*].challenge exists, or any progress.cells["*\|challenge"].attempts >= 1. | Common | No |
| t_fixed | Fix-It Pip | Try-hard | Get a question right that you got wrong before. | any entry.qs item whose flags are R=1 and W=1 (W: the last attempt at this question was wrong). | Common | Yes, see D1 |
| t_hint | Clever Pip | Try-hard | Ask for a hint and then finish the set well. | an entry with mode topic or mixed, sum(rows.a) >= 5, sum(rows.h) >= 1 and sum(rows.c) * 100 >= 70 * sum(rows.a). | Common | Yes, see D2 |
| t_back | Welcome Back Pip | Try-hard | Come back after three or more days away. | entry day minus the previous entry day >= 3 (days are UTC dates of entry.at; previous = the entry before it in entries; not given for the first entry). | Common | No |
| t_gold | Golden Leaf Pip | Try-hard | Pass Challenge on every topic of one chapter. | any chapter where every counted topic has passed(topic, challenge). Also gives that chapter a gold leaf on Pip. | Rare (gold) | No |
| h_3 | Three-Day Hedgehog | Habit | Practise on 3 different days in one week. | in one Monday to Sunday week (weekOf of entry.at) there are >= 3 distinct entry days. | Common | No |
| h_5 | Five-Day Otter | Habit | Practise on 5 different days in one week. | same as Three-Day Hedgehog with >= 5 distinct entry days. | Common | No |
| h_run7 | Seven-Day Squirrel | Habit | Practise on 7 days in a row. One day off in between is allowed. | a run of >= 7 distinct entry days where each gap to the next entry day is <= 2 days (one missed day is forgiven). Runs are never reset by the app. | Common | No |
| h_15 | Quarter-Hour Tortoise | Habit | Practise for 15 minutes in one day. | sum(entry.secs) over entries with the same UTC entry day >= 900. | Common | No |
| h_run30 | Thirty-Day Squirrel | Habit | Practise on 30 days in a row. One day off in between is allowed. | same as Seven-Day Squirrel with >= 30 distinct entry days in the run. | Rare (gold) | No |
| q_first | Keys Parrot | Typing | Play Word Quest for the first time. | quest.length >= 1 or sum(weeks[*].quest.sessions) >= 1. | Common | No |
| q_10 | Ten-Word Cat | Typing | Type 10 words in one Word Quest. | any QuestRow with words >= 10. | Common | No |
| q_wpm | Speedy Rabbit | Typing | Type at 10 words a minute or faster in one Word Quest. | any QuestRow with secs >= 60 and (chars / 5) / (secs / 60) >= 10. | Common | Yes, see D3 |
| q_acc | Careful Owl | Typing | Type with 95 right letters in every 100. | any QuestRow with chars >= 50 and chars / (chars + mistakes) >= 0.95. | Common | Yes, see D4 |
| e_first | First Exam Penguin | Exam hero | Finish a practice exam, on screen or typed in from paper. | exams.length >= 1. | Common | No |
| e_80 | Steady Bear | Exam hero | Get 80 marks in every 100 in a practice exam. | any ExamRow with got * 100 >= 80 * of. | Common | No |
| e_sec | Full Section Tiger | Exam hero | Get every mark in one section of a practice exam. | any ExamRow where sections.some(s => s.of > 0 && s.got === s.of). | Common | No |
| e_90 | Exam Hero Owl | Exam hero | Get 90 marks in every 100 in a practice exam of 25 marks or more. | any ExamRow with of >= 25 and got * 100 >= 90 * of. | Rare (gold) | No |
| b_maths | Maths Master Bear | Book finisher | Finish all 12 Maths units. | chapterDone(maths, n) for n = 1..12. | Rare (gold) | No |
| b_reader | Reader Master Elephant | Book finisher | Finish all 4 Reader lessons. | chapterDone(reader, n) for n = 1..4. | Rare (gold) | No |
| b_practice | Practice Master Frog | Book finisher | Finish all 11 Practice Book sections. | chapterDone(practice, n) for n = 1..11. | Rare (gold) | No |
| b_evs | EVS Master Owl | Book finisher | Finish all 14 EVS chapters. | chapterDone(evs, n) for n = 1..14. | Rare (gold) | No |

## EVS set (2026-10-25)

The book registry entry is `docs/evs/REGISTRY_ENTRY.md` (reviewed there). Chapter titles come from `docs/evs/manifest.md`. `chapterDone(evs, n)` is the same Done rule as every other book. The stamp ids follow the registry: `ef1` to `ef14` for the friends and `b_evs` for the finisher.

- Set: **EVS friends**, border pebble, fill `sk4` (green). Pebble is the soft organic shape also used by Habit, but Habit is pink and EVS is green, and the album shows each set under its own heading, so they are not mixed up. A new border or a second green fill would need new art code; the registry takes either as data later.
- Animals: 14 different ones, none shared inside EVS. They avoid the species that only Habit and Explorer use (parrot, otter, squirrel, hedgehog), so those stay unique. The others are reused from the book sets, always with a different accessory, so no (species, accessory) pair repeats anywhere in the album (checked against `stampDefs.ts` and `books.ts`).
- Colour: the stamp art uses the existing stamp tokens. For the EVS subject colour the interface accent is already teal green, so the EVS accent is olive-lime green, always with the text label "EVS". Token values and contrast are in the registry entry file (light `--evs` #4a7410, dark #a8d664; every text pair at least 4.5:1).
- Album page: `09-stamp-album.html` now has the EVS friends section (0 of 14 for Mira, who has not started EVS) and the EVS Master Owl in Book finisher. Looked at in light and dark, at 1280 and 390, with the set locked and with all earned. No overflow.

| id | Name | Species | Accessory | Chapter |
|---|---|---|---|---|
| ef1 | Family Duck | duck | heart | 1 The Family |
| ef2 | Twin Koala | koala | swap | 2 Family Similarities |
| ef3 | Dairy Cow | cow | pie | 3 Our Food |
| ef4 | Woolly Sheep | sheep | sheet | 4 Our Dresses |
| ef5 | Cave Bear | bear | paw | 5 Chapter title |
| ef6 | Helper Dog | dog | run | 6 Chapter title |
| ef7 | Believer Lion | lion | crown | 7 Chapter title |
| ef8 | Play Monkey | monkey | star | 8 Chapter title |
| ef9 | Home Snail | snail | house | 9 Our Homes |
| ef10 | Tidy Rabbit | rabbit | leaf | 10 Beautiful Homes |
| ef11 | Compass Fox | fox | sun | 11 Directions |
| ef12 | Zoom Tiger | tiger | speed | 12 Conquering Distances |
| ef13 | Message Penguin | penguin | loop | 13 Closing Distances |
| ef14 | Flag Elephant | elephant | flag | 14 Chapter title |
| b_evs | EVS Master Owl (gold) | owl | openbook | all 14 |

Optional later: a `bookE` glyph like `bookP` (one small function in the art file) so the EVS finisher has its own letter; until then it uses `openbook`.

## Review of Explorer (2026-10-25)

`x_two` Two-Book Parrot, `x_three` Three-Book Otter and `x_both` Both-Subjects Squirrel (set border hexagon, fill `sk6`, purple). Good as they are: they use three animals no book set uses, so they read as a different family, and the rules are overall, never required, never pressure. Two small notes, neither blocks anything:
- The border is the same hexagon as the Practice Book friends. The purple fill separates them. If it ever looks confusing in the album, switch Explorer to a free border (data only: `border` in `EXPLORER_SET`).
- `x_both` says "two subjects in the same month". With EVS there are three subjects (Maths, English, EVS), so the plain words still work, and the rule counts any two. Fine as written.

## Review of Pip's orchard (2026-10-25)

Read from the code and `PIP.md`; I did not get a rendered look at it in this pass (the dev fixture opens the book index, not the orchard), so a screenshot at 1280 and 390, light and dark, is still open for the UI session. From the code: it is drawn only from the Pip tokens, so light, dark and Calm come for free; six simple tree and bush shapes repeat in a fixed order and show the newest eight, which is enough variety for a long time. Two small suggestions for later, not needed now: give each kind a different silhouette height so the row reads as a row of different plants at small sizes, and add the same text line next to the picture (already planned: "Orchard 2") so colour or shape is never the only signal.

## Data needed (what we do not store yet)

**D0. Use the rewards document that already exists** (`src/core/rewards.ts`, `RewardsDoc`, collection `rewards`, id = kid id). It is empty today and this catalogue fills it:
- Stamp earned: `earn(doc, { at, kind: <stampId>, ref })`, only when `doc.stamps[stampId]` does not exist yet. These stamps are collected once, so `count` stays 1 and `first` is the date shown in the album. `ref` is ids only, for example the chapter key `maths:4`.
- Chapter Done (permanent): `earn(doc, { at, kind: "chapter-done", ref: "maths:4" })` once per chapter key (`maths:n`, `reader:n`, `practice:n`). A chapter is Done if such a row exists, whatever the content says later. Do not write a ledger row for every finished set: the ledger keeps only the newest `LEDGER_CAP` = 2000 rows and these 49 stamp rows and 27 chapter rows must survive.
- `doc.chaptersShown` keeps its meaning: chapters whose completion popup has been shown. The silent catch-up (see rules above) adds keys to it without showing anything.
- `doc.pip.stage` is the stage 0 to 9 and `doc.pip.sets` is the growth meter (0 to 10); see PIP.md.
- Optional and new: `restDays?: ISO[]` if rest-day tokens are ever stored. No rule here needs it.

**D1. Fix-It Pip (t_fixed).** Needs a fourth flag W on every qs item. qs flags today are three digits (right, first try, seen before) and "seen before" does not say whether the earlier try was wrong. Minimal change: keep a per-kid set of wrong question ids (cap 500, same hashing as the no-repeat memory), add it as the 4th digit, remove the id when answered right.

**D2. Clever Pip (t_hint).** Rows hold hints per topic and level, not per answer. This set-level rule is the closest exact rule today. For "right after the hint" per answer, add a hint flag to qs (optional).

**D3. Speedy Rabbit (q_wpm).** Assumes QuestRow.chars counts correctly typed characters and mistakes counts extra wrong key presses. Please confirm in src/core/wordquest.ts.

**D4. Careful Owl (q_acc).** Same assumption about chars and mistakes as Speedy Rabbit.

**D5. The chapter list.** The 27 chapters must be listed in code: Maths units 1 to 12, Reader lessons 1 to 4, Practice Book sections 1 to 11, each mapped to its `UnitDef` ids. The app's English numbering (Practice Book units 11 to 30, `baseOfBook()`) does not say which 11 sections the book list shows, so an explicit table is needed.

**Not captured, so no stamp uses it:** mistake themes, per-answer seconds for paper entries, the 24 Unseen passages (a future "Passage Pal" set could use `chapterDone` on them; they do not count towards Pip), written-answer marks.
