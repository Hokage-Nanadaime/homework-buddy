# Rewards, Pip and stamps with many books (plan)

Status: proposal for the owner's approval. Nothing here is built yet. Written 2026-10-25.

## 1. The question

Today a child has three books (Maths, English Reader, English Practice Book). Later there will be more: other subjects, other classes (Class IV next year), several books of one subject. Are rewards and Pip per subject, per book, or overall? What happens to a child who starts two or more books?

## 2. Short answer (recommended)

**One Pip per child, overall. Everything that belongs to a book is per book. Nothing is ever lost or shrinks when a book is added.** Concretely:

| Thing | Scope | Why |
|---|---|---|
| Pip (stage, growth meter) | Overall, all books together | One companion keeps the story simple and motivating; no choosing between subjects |
| Chapter "Done", ink marks, milestones | Per chapter of a book | Already so; they are what feeds everything else |
| Friend stamps (one per chapter) and the gold "Book finisher" | Per book (a set per book) | Collecting a set per book is the fun of the album |
| Try-hard, Habit, Typing, Exam hero stamps | Overall | Effort and habits are about the child, not a subject |
| New breadth stamps (see 5) | Overall | Rewards trying a second or third book, never pressures |
| Daily goal, rest-day tokens, reward level, Calm, sound | Overall, per child | Settings are about the child |
| Colour identity (blue Maths, orange English, a new colour per subject) | Per subject | Helps a child see where they are |
| Parent analytics | Overall first, then per subject, then per book | Parent can zoom in |
| Book plant on the shelf (small progress picture on each book) | Per book | Gives each book its own sense of progress without splitting Pip |

Rejected alternatives: one Pip per subject (splits attention, small subjects grow slowly, needs more art and more rules), one Pip per book (too many companions, not a story).

## 3. What exists today (facts from the code)

- Chapters are a fixed table of 27 keys: `maths:1..12`, `reader:1..4`, `practice:1..11`; the book type is a fixed union of three; the Practice Book is unit numbers 11 to 21 inside the app.
- Pip has 10 stages with fixed thresholds 0, 1, 3, 5, 8, 11, 15, 19, 23, 27 chapters and the text "All 27 chapters are done". Stage = last threshold reached; the meter counts finished sets since the stage was reached.
- The stamp catalogue is fixed: 49 stamps in 8 sets, three of them "friends" sets named after the three books.
- The reward ledger (per kid) already stores chapters, levels, milestones and stamps by key and never removes anything, so existing data survives any of the changes below.
- Exam portions, reports and several UI strings assume the three books ("All 12 Maths units", "27 chapters").

## 4. Principles

1. **Never lose, never shrink.** Earned items stay. Pip's stage never goes down when books are added, removed or renumbered (the ledger keeps a high-water mark).
2. **Adding a book is data, not code.** A book registry lists books, chapters and stamp sets; the index, shelf, Pip, stamps, exams and analytics read from it.
3. **No pressure.** Nothing is locked; doing only one subject is fine; breadth is rewarded with a few small stamps, never required for Pip.
4. **Same popup rules** as today (only after a set or chapter ends, skippable, quiet at Calm and Minimal).
5. **Fair and simple.** One chapter counts one point for Pip. A weight per chapter exists in the registry (default 1) so unevenly sized chapters can be tuned later without migrating data.

## 5. The model in detail

**Book registry** (one source of truth): book id (the existing `maths`, `reader`, `practice` stay as ids, so no data migration), subject, class, title, accent, the chapters (id, number, title, weight), whether it has levels, and its stamp set (name, border shape, species pool, accessory).

**Pip.** Points = sum of weights of chapters Done in any book. Stage thresholds stay as they are for stages 1 to 10 (the first 27 points). After Fruit Tree, growth continues as **Pip's orchard**: every further 10 points plants one more small tree or garden friend (named, drawn from a small set), shown as "Orchard 3". So a child with ten books keeps growing, slowly, and a child who has finished the first three books has a clear, finished milestone. A stored high-water mark means a later change to the book list can never lower the stage.

**Stamps.** The catalogue is generated from the registry: for each book, one friend per chapter plus one gold Book finisher. The global sets (Try-hard, Habit, Typing, Exam hero) scale on totals (sets finished, days practised, papers done) so they need no per-book copies. New small **Explorer** set, overall: started a second book, started three books, a chapter Done in two subjects in one month (breadth without pressure). Stamp ids are namespaced by book id. Art: the existing stamp generator takes species, accessory, border and palette as parameters, so a new book's set is a data entry plus a short art review, not new code.

**Per-child active books.** A parent chooses which books a child is working in (their class). The Home shelf and Books page show those; old books stay one tap away under "Earlier books". Earned chapters count for Pip whether or not a book is active.

**Exams and analytics.** Exam portions list chapters per book from the registry ("All 12 Maths units" becomes generated). Analytics show overall, then per subject, then per book; heat map per book.

## 6. Adding a book (the checklist, after this refactor)

1. Put the book PDF under `books/<subject>/` and run the content pipeline (read pages, inventory, question types, bank, independent audits, owner sign-off).
2. Add the registry entry (chapters, accent, stamp set art seed).
3. Review the new set's stamps in the album (light and dark).
4. Tests run automatically: registry totals, unique stamp ids, Pip never decreases, catch-up silent for earlier history in that book (one combined "found" popup if any).

## 7. Risks and edge cases

- Content changes to a signed-off chapter (topics added or removed) cannot take away a chapter already Done (ledger is write-once); only its displayed ink marks may change.
- A book without Easy/Medium/Challenge levels (for example pure reading) needs the registry flag `levels: false` and a simpler Done rule; decide when such a book exists.
- Uneven chapter sizes (a Maths unit of 27 topics versus a grammar section of 4) make one point per chapter generous for small chapters; the weight field is the tool; keep 1 for now.
- Album size: with many books the album groups by book (collapsed), with filters by subject.
- The artifact database stores the ledger as one document per child; it stays small (a few hundred keys even with ten books).

## 8. Phases and effort

| Phase | What | Visible? | Risk |
|---|---|---|---|
| P1 | Book registry and generated chapter table; remove the hard-coded 27/49/10 and the three-book union; prove with tests that today's behaviour is identical (27 chapters, 49 stamps, 10 stages, same stamp ids) | No | Low (guarded by snapshot tests) |
| P2 | Orchard beyond Fruit Tree, high-water mark in the ledger, data-driven stamp catalogue, Explorer stamps | Yes (small) | Low |
| P3 | Per-child active books, shelf and album scaling, per-book plant on the shelf card, analytics per subject and book | Yes | Medium |
| P4 | First new book: registry entry, stamp set, content | Yes | Content-bound |

Recommended: do P1 and P2 now (they make every later book cheap and keep Pip honest), P3 when the second new book is near.

## 9. Decisions for the owner

1. One Pip overall plus a per-book shelf plant (recommended) versus one Pip per subject.
2. Orchard growth after Fruit Tree (recommended) versus stopping at Fruit Tree.
3. One point per chapter for now, weights later (recommended).
