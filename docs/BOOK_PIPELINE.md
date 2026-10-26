# Adding a new book: the pipeline (reusable brief)

Use this for every new book or subject. The owner puts the PDF under `books/<subject>/` and says which book is next. The coordinator starts one dedicated session per book with this file as the base of its brief, plus CLAUDE.md and the closest finished book as the model (Maths for computed content, English for text-based content).

## 0. Before reading pages (the coordinator asks the owner once, only what is missing)
- Subject, class, board; does the book have worksheets/exercises the school repeats word for word (then include the book's own exercises exactly, as for English) or can numbers change (then generators, as for Maths)?
- Do Easy/Medium/Challenge apply? How are answers marked: by code, by Claude-suggested mark with parent decision, or do-together?
- The school's real exam paper(s) for the subject, if any (photos), to fix the exam patterns.
- Printed page number versus PDF page; whether the scan has a contents page.

## 1. Read the pages
- Render pages (`pdftoppm`, images stay git-ignored). Read with the cheap model (Haiku) after a 6-page test against a stronger model, as done for the Reader; tell it to keep every blank, reproduce tables and grids as grids, describe pictures only where a question needs them. If a helper refuses to copy a long passage, never work around it: store an own-words summary tagged as such ("Read this in your book, page N").
- One transcript per chapter, page-tagged; every page covered exactly once; an independent checker compares transcript and page images (fix until clean).

## 2. Inventory and mapping
- `inventory.md` per chapter: every exercise, activity, box, word list, picture task with printed page, kind, skills, and how it is marked (code / suggested marks / do together). Key vocabulary captured (for Word Quest).
- Every inventory item maps to a question type; every type has Easy, Medium, Challenge (inside the syllabus only); a coverage test fails on any unmapped item.

## 3. Questions
- Computed subjects: seeded generators, answers computed and re-computed by a second method, property tests, at least about 150 distinct questions per type and level, per-kid no-repeat memory.
- Text subjects: a written bank with evidence spans checked against the transcript; at least about 40 per level per chapter; the book's own exercises word for word as a separate "Book exercises" group (kept out of mixed practice, used first by exams).
- Anything not doable on screen is do-together (never scored). Opinion questions are practice only, "ask a grown-up".

## 4. Gates (a chapter is done only when all pass), then the owner signs off
1. Inventory complete 2. Mapping complete 3. Correct (tests, second method or evidence) 4. Independent audit by a fresh agent seeing only the page images and a sample sheet: zero missing, wrong or out-of-scope items. Order (owner, 2026-10-25): build the whole book first, then ONE audit round per group of chapters; re-audit only if the round finds more than a handful of real errors (three rounds per chapter cost too much). 5. Owner sign-off per chapter (the owner's OK; nothing technical).

## 5. Product wiring
- Add the book to the registry (chapters, accent colour, stamp set art seed; see docs/design/REWARDS_MULTI_BOOK.md), so the shelf, contents page, Pip, stamps, exams and analytics pick it up.
- Exam patterns from the school's paper; portions chosen by the parent; unseen passages/writing banks if the paper has them.
- Worksheets with codes, print/PDF (always light), enter answers from paper, resume, activity log: all inherited, never re-implemented.

## 6. Working rules
- Lean usage (shared plan limit): cheap model for extraction and drafting, one stronger independent audit per group, at most three helpers at once, commit and push after every lesson/chapter, status file updated for restarts. After a usage limit resets, nudge idle sessions.
- Verify visually (screenshots in light and dark, looked at) before reporting UI work.
- Questions that affect only the book's own session go to the owner directly; the rest to the coordinator. Notes that are not decisions go to `docs/PENDING.md`.
