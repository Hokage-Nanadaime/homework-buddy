# Design decision (user, 2026-10-24)

Chosen: **direction E "Mix"** (docs/design/e-mix/), with these changes:

1. **More stamps**, and stamps that kids will like: cartoony, collectible, fun (original art; no copyrighted characters).
2. **A new-stamp popup with animation** (a stamping moment), shown only when a set ends, never mid-question.
3. **More levels for Pip.** When a chapter (unit, lesson or section) is completed, a popup shows Pip's animated growth to the next stage.
4. Everything else as in the Mix: book-style contents index, calm right/wrong feedback during questions, Calm switch and reward levels (Full / Light / Minimal) set by the parent, the parent progress page on the activity log, the same content (Maths, English Reader, Practice Book, Unseen passages, Book exercises, Exams, Word Quest).

Guardrails that still hold: nothing moves while a child is thinking; popups appear only after a set or chapter finishes, are skippable, last about 3 seconds, respect reduced motion, and are replaced by a quiet line at the Minimal level and in Calm mode; sound is off by default; no lives, no lost streaks, no ranking between kids.

Build order: (1) look and feel, Calm switch, practice screen, home, book index, chapter page; (2) summary, Pip stages, stamps and the popups, rewards settings; (3) parent progress page on real data, Word Quest restyle.
