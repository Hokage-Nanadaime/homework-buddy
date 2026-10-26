# Shared brief for the four design directions

Product: Homework Buddy. Private web app, laptop first, for kids aged 8 to 9 (Class III, India) to practise from their
school books, and for parents to prepare them for exams. Books: Maths (12 units), English Reader (4 lessons),
English Practice Book (11 sections), 24 unseen passages, Exam preparation (25-mark Periodic Test, 50-mark Term Exam).
Every topic has Easy / Medium / Challenge. Also: worksheets with codes, enter answers from paper, Word Quest typing game,
several kid profiles, parent area, AI hints.

Today: blue = Maths, orange = English, Fredoka + Nunito, light/dark. Content and sample data: docs/design/shared/sample-data.js (window.HB).

## Non-negotiables
- Nothing moves while a child is thinking. Right answer: quick (<0.6 s), quiet, skippable, at the answer, never full-screen mid-set.
  Bigger celebration only at end of set. prefers-reduced-motion respected. Sound off by default.
- No lives, no losing streaks, no shaming, no sibling leaderboards. Compare a child only with their own past.
- Reward effort (finishing a set, trying Challenge, fixing an old mistake), not only being right. Streaks forgiving.
- Parent can set rewards to minimal. Each direction shows how it avoids overwhelm.
- Light and dark; colour never the only signal; text contrast 4.5:1; targets 44px; ALL colours via tokens (:root, dark via
  prefers-color-scheme + [data-theme]); British spelling; rupees if money.
- 1280 wide primary, must not break at 390. Self-contained HTML (inline CSS/JS, Google Fonts allowed, no other external loads).
- Sample data only, no real names. Interactive where cheap: theme toggle, practice state switcher.

## Screens (file names)
01-home, 02-book-index, 03-chapter, 04-practice (asking / right / wrong+hint switcher; MCQ, typed, English with passage),
05-set-summary, 06-word-quest, 07-parent-progress, 08-exam-setup (optional).
Navigation between screens by relative links in the same folder. Each file has a small shared top bar: direction name, theme toggle, link back to ../index.html.

## Parent progress page must answer
Started (baseline) / now / growth per subject and chapter with honest "not enough data yet" / strengths and weak topics
(heat map by chapter) / level progress / habit (days, minutes, sets) / typing growth / mistake themes / exam readiness for a portion /
what to practise next / printable report look. Child switcher, no ranking. Charts follow the dataviz skill: validated palette,
legend + direct labels, table view, no colour-only encoding, dark mode chosen separately. Show real growth (Multiplication) and a plateau (Division).

## Update after the activity log went live (read docs/design/ACTIVITY_LOG.md)
- Build 7 screens only (01 to 07). Skip 08-exam-setup.
- Parent page: show "History starts on <date>" and a "before logging" baseline line (totals counted before the log began), then dated weeks.
  Minimum sample is 10 attempts in a window, below that say "not enough data yet". First 20 attempts per topic are kept forever (baseline).
  Mistake themes are NOT captured yet: show that panel as a clearly marked "coming later" placeholder with sample content, not as live data.
  Reward ledger and reward/calm/sound/goal settings are not stored yet: mark rewards-at-a-glance as design intent.
  Typing rows have date, words, chars, seconds, mistakes (so words per minute and accuracy are derivable); keyboard help is always on today.
  Written-answer marks carry AI-suggested and final mark, and whether the grown-up accepted it.
- Commit and push your folder as soon as it is complete, and once halfway (after screens 01 to 04).
