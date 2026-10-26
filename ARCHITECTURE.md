# Architecture

Homework Buddy is a Preact + TypeScript + Vite app that builds to one self-contained HTML page.

- `src/core/`: pure logic with no screen code: question types, seeded random numbers, answer checking, worksheets and their rebuildable codes, school-style exams, rewards, progress and the book registry. Most tests live here.
- `src/ui/`: screens and shared pieces (top bar, practice, print preview, parent progress, stamps). One worksheet model drives the preview, the printed sheet, on-screen answering and the answer key.
- `src/app/`: wiring: routing, profiles, saved sets, exam builders.
- `src/storage/`: one storage interface with a real adapter (the artifact runtime) and an in-memory one for tests and local work.
- `src/subjects/`: the book content and the builders that turn content into questions. **Content is the only thing that differs between a private copy and this tree.** Each subject's `index.ts` exposes its units; the public tree fills them from `sample/` files.
- `docs/design/`: the design decisions and mockups; `docs/BOOK_PIPELINE.md`: how a new book is added.

## Plugging in your own content
Keep your books in a private copy of this repo. Replace the sample files behind `src/subjects/*/index.ts` (and the two data lines in `src/app/englishBooks.ts` and `src/app/wordQuestData.ts`) with your own units, following `docs/BOOK_PIPELINE.md`. Never publish copyrighted books or exercises.

## Principles
Code, not AI, creates and checks answers. A grown-up reviews anything AI-written. Children's play costs no AI requests. Nothing is deleted without a confirm dialog that says what goes and what stays.
