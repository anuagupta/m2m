# ProDJEE Arena

A gamified JEE Main / NEET practice web app. Everything lives in static files with no build step: open `index.html`, or serve the folder (`python3 -m http.server`).

## Game rules (implemented)

| Event | Gyan Points |
|---|---|
| Question appears | Counter runs 200 → 50 at 1 GP/sec |
| Correct answer | + GP shown on the counter |
| Wrong answer | −50, then the correct answer is revealed and the game moves on |
| Hint | −50; the hint shows for 10 s and the counter freezes; one per question |
| Solution | −150, no GP awarded |
| Counter reaches 50 | 15 s grace, then auto-skip (0 GP) |
| Every 5th question (bonus) | 25 s, +300 if right, −100 if wrong or time runs out; no hint or solution |

After a question is answered, the solution can be viewed free of charge.

## Features

- **JEE / NEET** sections. JEE has single-correct MCQs and numerical-value questions (±0.01 tolerance).
- **Modes:** Mixed Arena (adaptive, full syllabus), Chapter Practice (pick subject and chapters), Mistake Vault.
- **Adaptive difficulty:** Elo-style rating for each student per chapter. Question rating = 800 + 200 × difficulty. Questions are picked slightly above the student's current level.
- **Mistake Vault:** wrong, skipped and solution-viewed questions come back after 1 → 3 → 7 days (spaced revision) until the student gets them right at every step.
- **Analysis:** at the end of every session (chapter-wise correct/attempted), a lifetime report card on every app open, and a Performance page (7-day GP, subject and chapter accuracy, weak/strong chapters).
- **Motivation:** daily GP goal ring, day streak, 7 ranks (Aspirant → AIR-1), 12 badges, and sound effects with a mute toggle.
- **Parent report:** one tap shares a session or lifetime summary via WhatsApp or the native share sheet.
- Progress is stored in `localStorage` on the device (v1).

## Question bank — IMPORTANT

`questions.js` currently holds **84 original sample questions**. They are **not** previous-year questions. They exist to exercise the engine. Replace them with the verified JEE Main / NEET PYQ bank from an official or licensed source. Schema:

```js
{
  id: "jee-2023-jan29-s1-p05",   // unique
  exam: "JEE",                    // "JEE" | "NEET"
  subject: "Physics",             // JEE: Physics/Chemistry/Mathematics · NEET: Physics/Chemistry/Biology
  chapter: "Rotational Motion",   // drives analysis + adaptive rating; keep names consistent
  type: "mcq",                    // "mcq" (4 options) | "num" (numerical value)
  difficulty: 3,                  // 1..5
  q: "Question text",
  options: ["A", "B", "C", "D"],  // mcq only
  answer: 2,                      // mcq: index 0-3 · num: number
  hint: "Short nudge",
  solution: "Precise worked solution",
  source: "JEE Main 2023 · 29 Jan · Shift 1"
}
```

## Phase 2 (not built yet)

Google/Facebook sign-in, a cloud-synced global leaderboard, a parent companion app with push notifications, LaTeX/diagram support in questions, and an admin importer (PDF/Excel → `questions.js`).
