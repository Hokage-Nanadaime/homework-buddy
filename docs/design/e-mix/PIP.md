# Pip's ladder (direction E)

Pip has 10 stages. The stage depends only on how many **chapters are Done**. Finished sets fill a small growth meter inside a stage and never change the stage. Screens: `10-pip-ladder.html` (the ladder), `05-set-summary.html` (growth popup and meter), `01-home.html`, `02-book-index.html`, `03-chapter.html`.

## Stages

| # | Stage | Chapters done needed | What it looks like |
|---|---|---|---|
| 1 | Seed | 0 | A round bean with a tiny pointed tip. No plant yet. |
| 2 | Sprout | 1 | A thin stem with two small round leaves. |
| 3 | Seedling | 3 | A taller stem with two pairs of leaves and a tip leaf. |
| 4 | Sapling | 5 | A slim trunk with leaves climbing up both sides. |
| 5 | Bud | 8 | The sapling with a closed pink bud on top. |
| 6 | Bloom | 11 | The bud opens into a six-petal flower. |
| 7 | Bush | 15 | A wide, leafy bush with little flowers. |
| 8 | Young Tree | 19 | A trunk with one round green crown. |
| 9 | Blossom Tree | 23 | A taller tree, three-part crown covered in blossom. |
| 10 | Fruit Tree | 27 | The full tree with red fruit. All 27 chapters are done. |

`stage = the last row whose "chapters done needed" <= chaptersDone`. Thresholds 0, 1, 3, 5, 8, 11, 15, 19, 23, 27. Every threshold is at least 1 above the one before, so one finished chapter can move Pip up at most one stage.

All ten drawings share one viewBox (0 0 120 140), the same bean body, face and ink outline, and differ in silhouette: bare bean, two-leaf stem, taller stem, trunk with leaf tufts, pink bud, flower, wide bush, round-crown tree, three-lobed blossom tree, fruit tree. Drawn by `pipSVG(stage, title, cls, {leaves, sil})` in the common script block of every page. `sil: true` gives the locked silhouette used on the ladder. Colours are tokens (`--pip-*`), and Calm mode swaps the bright ones for paper tones.

## Chapters: what counts

27 chapters: **Maths 12 units + English Reader 4 lessons + English Practice Book 11 sections.**
These do **not** count towards Pip: the 24 Unseen passages, Exam preparation, Word Quest, the printed Book exercises, and "Do together" topics. (Unseen passages and exams still earn stamps and still show Done in their own lists; they just do not move Pip.)

## Chapter done (the rule, identical to the Done mark in the index)

```
counted(chapter)  = unit.types.filter(isAutoMarked)           // Do-together topics and Book exercises are not counted
passed(topic, L)  = (cell.bestOf >= 3 && cell.best * 100 >= 70 * cell.bestOf)       // cell = progress.cells[topic + "|" + L]
                    || firsts[topic]?.passed?.[L] !== undefined
chapterDone(c)    = counted(c).length >= 1
                    && counted(c).every(t => passed(t, "easy") && passed(t, "medium"))
chapterChallenge(c) = counted(c).length >= 1 && counted(c).every(t => passed(t, "challenge"))
```

- `passed` means: a topic set (one topic, one level, not a mixed sheet) with at least 3 answers and at least 70% right (`PASS_PERCENT`). The progress cell is used as well as `firsts`, so children who practised before logging began are counted.
- The chapter's three index marks are the same quantities for the whole chapter: **Easy mark** filled when every counted topic has Easy passed, **Medium mark** the same for Medium, **Challenge mark** the same for Challenge. The word in the index is: **Done** = Easy and Medium marks filled; **Reading** = not Done but any attempt, any mark, or an unfinished set exists; **New** = no attempt at all. 02 and 03 use exactly this; the Challenge mark never decides Done.
- **Gold leaf:** each chapter with `chapterChallenge` true gives Pip one small gold leaf. Up to 5 are drawn; the rest are only a number. Gold leaves do not change the stage. The stamp Golden Leaf Pip is awarded for the first one.

## Growth meter (inside a stage)

- The meter is `RewardsDoc.pip.sets` (src/core/rewards.ts), 0 to 10. A finished set adds 1 (capped at 10) when its `ActivityEntry.mode` is `topic`, `mixed` or `worksheet`. Exams, paper exams and Word Quest do not fill it. `RewardsDoc.pip.stage` holds the stage (0 to 9).
- On a stage change `pip.sets` is set to 0. Nothing else changes `pip.sets`.
- At 10 the meter stays full and the summary says "Pip is ready to grow. Finish a chapter." It never changes the stage and never shrinks.
- The set summary shows "Pip grew a little" with the meter moving one step. Under Calm, Minimal and reduced motion the meter is a number ("8 of 10 sets").

## When a chapter becomes Done

Evaluated at the end of every topic set, after `record()` and `recordResults()`:

1. For the chapter of the topic just practised, if `chapterDone` is now true and no `chapter-done` row with that key exists, write `earn(doc, { at, kind: "chapter-done", ref: key })` (key is `maths:4`, `reader:2` or `practice:5`) and update `pip.stage` and `pip.sets`. A topic set touches one topic, so at most one chapter becomes Done per set, and Pip rises at most one stage.
2. If the stage went up: the **chapter popup** shows Pip before and after, a line "Unit 4 Multiplication is done", "Pip grew from Sapling to Bud".
3. If the stage did not change (for example the 6th chapter, stage Sapling stays until 8): the same popup shows the single Pip and "7 of 8 chapters to reach Bud", with the chapter's friend stamp as a normal new-stamp popup.
4. The Maths friend, Reader friend or Practice friend stamp of that chapter is awarded in the same step (see STAMPS.md), and Book finisher stamps are checked.

## Edge cases

- **A unit with only some topics practised:** not Done. Done needs every counted topic. Reading is shown. Nothing is "partly counted"; the ladder counts whole chapters only.
- **Done is never revoked.** Once the `chapter-done` row exists it stays, even if content later adds a topic to the unit (the index then shows the chapter as Done with a small note that a new topic is waiting; it is not required for Pip).
- **A child with no data (new profile):** 0 chapters, Seed, meter 0. Home shows "Finish your first chapter to meet the first friend".
- **Existing children (first run after the update):** chapters that are already Done from the progress cells are written to the ledger silently (`ref` is the key plus "pre", and the key goes into `chaptersShown`). No popups, no stamps queued. Pip simply starts at the right stage.
- **Several stages at once:** impossible with the thresholds, but if content changes and it happens, the popup shows the first and last stage only.
- **Kabir sample:** Maths 1 Done (Easy and Medium passed on every topic), nothing else: 1 chapter, Sprout, meter 3 of 10, next stage Seedling at 3 chapters.
- **Mira sample:** 7 chapters Done (Maths 1 to 3, Reader 1, Practice 1 to 3), 5 gold leaves, Sapling, meter 7 of 10, one chapter (Maths Unit 4, last level to pass: Tables of 6, 7, 8, 9 at Medium) from Bud.
- **Minimal / Calm / reduced motion:** no animation. The summary shows "Unit 4 is done. Pip is now a Bud." and the ladder shows the new stage with no growth.
- **Content size:** 27 is fixed. If the chapter list changes, the thresholds must be re-cut together with this table.

## Data needed

- Nothing beyond D0 in STAMPS.md: `chapter-done` ledger rows record the date and make Done permanent; `pip.stage` and `pip.sets` already exist. Until the rows exist, `chapterDone` can be computed live from `progress.cells` and `firsts`, but content changes could revoke it and it has no date.
- The explicit list of the 27 chapters and their unit ids (D5 in STAMPS.md).

## Orchard and many books (2026-10-25)

Pip's points are the sum of the weights of the chapters Done in every book of the registry (`src/core/books.ts`; weight 1 unless set). Stages 1 to 10 keep their thresholds (0, 1, 3, 5, 8, 11, 15, 19, 23, 27 points). After the Fruit Tree the **orchard** grows: every further 10 points plants one more small friend, shown as "Orchard N" (Orchard 1 at 37 points, 2 at 47, and so on). The friends come in a fixed order of six kinds, then the order repeats with the next number: apple tree, pear tree, cherry tree, sunflower, berry bush, plum tree (`ORCHARD_FRIENDS` in `src/core/pip.ts`).

- Art: `orchardSVG` in `src/ui/art.ts`, drawn with the same ink outline and tokens as Pip (`pip-leaf`, `pip-trunk`, `pip-fruit`, `pip-bloom`, `pip-soil`), so light, dark and Calm come from the tokens. Simple on purpose: a row of up to eight friends (the newest eight). It can be replaced by finer art later without changing any data.
- Where: Home Pip card, the ladder page ("Pip's orchard" card, always shown, with the next friend named), the chapter popup when the chapter plants a friend ("Orchard 2: Pip planted a pear tree."), and the parent report line. Same popup rules as chapter popups: only after a set, skippable, one quiet line at Calm and Minimal.
- High-water mark: the ledger keeps `pipHigh`, the most points ever recorded. Pip's points are never lower than it, so removing a book or renumbering chapters cannot lower the stage or take trees away (a floor: new chapters count once the live total passes it).
- `books` in the ledger lists the books known at the last catch-up. A book added later is caught up silently (everything already true is written with `pre`) and the "Pip found stamps you already earned" popup shows once, combined.
- Dev only: `?fixture=orchard` (every chapter Done, 57 points, Orchard 3) and `?fixture=orchard-popup&n=1` show the states for screenshots.
