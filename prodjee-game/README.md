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

## Interface

- Native-app layout: bottom tab bar on phones (Home · Play · Vault · Stats · Profile), sidebar on desktop; the game and results run full-screen.
- Home: GP count-up, rank progress, daily-goal ring, 7-day streak dots, one-tap **Play** button, subject accuracy rings, badge strip.
- Game: segmented progress bar, GP orb, combo counter, sticky Hint / Solution / Lock dock within thumb reach, result bottom sheet, confetti + haptics on correct answers (sound toggle also mutes vibration). The combo is visual only; GP rules are unchanged.
- Maths typeset with KaTeX (bundled in `vendor/katex`, works offline). Write maths as `$…$` (inline) or `$$…$$` (display).
- "Real PYQs only" filter in setup and Profile.

## Features

- **Figures:** a question image, image options (shown in a 2×2 grid) and a solution image, with tap-to-zoom on each. Figures are shown on a white card so black-on-white scans stay legible in the dark UI.
- **JEE / NEET** sections. JEE has single-correct MCQs and numerical-value questions (±0.01 tolerance).
- **Modes:** Mixed Arena (adaptive, full syllabus), Chapter Practice (pick subject and chapters), Mistake Vault.
- **Adaptive difficulty:** Elo-style rating for each student per chapter. Question rating = 800 + 200 × difficulty. Questions are picked slightly above the student's current level.
- **Mistake Vault:** wrong, skipped and solution-viewed questions come back after 1 → 3 → 7 days (spaced revision) until the student gets them right at every step.
- **Analysis:** at the end of every session (chapter-wise correct/attempted), a lifetime report card on every app open, and a Performance page (7-day GP, subject and chapter accuracy, weak/strong chapters).
- **Motivation:** daily GP goal ring, day streak, 7 ranks (Aspirant → AIR-1), 12 badges, and sound effects with a mute toggle.
- **Parent report:** one tap shares a session or lifetime summary via WhatsApp or the native share sheet.
- Progress is stored in `localStorage` on the device (v1).

## Question bank: sources and verification

| Set | Qs | Question text from | Answer verified by |
|---|---|---|---|
| JEE Main 2024 · 27 Jan · Shift 1 | 90 (complete) | Official NTA response sheet (page images) | NTA final key (12 Feb 2024) by option ID **and** an independent solution |
| JEE Main 2025 · 22 Jan · Shift 1 | 71 of 75 | 28 from the official response-sheet copy; 43 from the published paper with solutions (wording matches the official sheet) | 28: NTA key by option ID **and** own solution · 43: paper's key **and** own solution. 4 skipped (disputed or unanswerable as printed) |
| JEE Main 2025 · 22 Jan · Shift 2 | 67 of 75 | Published paper with solutions | Paper's key **and** own solution. 8 skipped (bonus/disputed, structure-drawing options, unreadable circuit) |
| NEET 2021 · Physics | 23 | Anu's annotated paper (Drive) | Paper's key **and** an independent solution |
| **Practice** (not PYQ) | 590 | Anu's coaching PDFs: Sri Chaitanya *Total Physics Important Questions* (233); ALLEN Kota Class 11 assignments — Circular Motion 20–21 (40), Vertical Circle 22 (16), Centre of Mass 24 (34), Work-Power-Energy 25 (40), Momentum TIPS-09 (38), Impulse-Momentum 26 (23), Rotation 28–31 & 34 (100), Variable Mass 32 (9), Elasticity 33 (24); ALLEN Assignment 26 Optical Instruments (17); Physics Sir JEE Ray Optics I (16) | Source key **and** own solution; any key that disagrees with the worked solution is skipped, not "fixed". Multi-correct, matrix-match and proof questions are skipped. Copyrighted by the institutes: confirm rights before a paid launch. Stored in `practice.js`, gold "Practice" tag |
| Samples | 86 | Written for testing | Labelled "Sample" in the app |

Items with a `review` field had one detail reconstructed (e.g. a structure drawn as a name). Coaching "memory-based" JEE papers are **not** used: they differ from the real paper.

## Question bank schema

Schema for each entry in `questions.js` (maths inside `$…$` is typeset):

```js
{
  id: "jee-2023-jan29-s1-p05",   // unique
  exam: "JEE",                    // "JEE" | "NEET"
  subject: "Physics",             // JEE: Physics/Chemistry/Mathematics · NEET: Physics/Chemistry/Biology
  chapter: "Rotational Motion",   // drives analysis + adaptive rating; keep names consistent
  type: "mcq",                    // "mcq" (4 options) | "num" (numerical value)
  difficulty: 3,                  // 1..5
  q: "Question text",
  img: "figures/jee23-jan29-s1-p05.png", // optional question figure (PNG/SVG/JPG in figures/)
  imgAlt: "Describe the figure",  // accessibility + zoom caption
  options: ["A", "B", "C", "D"],  // mcq only; an option can also be { img: "figures/…", alt: "…" } for graph options
  solutionImg: "figures/…",       // optional
  answer: 2,                      // mcq: index 0-3 · num: number
  hint: "Short nudge",
  solution: "Precise worked solution",
  source: "JEE Main 2023 · 29 Jan · Shift 1"
}
```

## Phase 2 (not built yet)

Google/Facebook sign-in, a cloud-synced global leaderboard, a parent companion app with push notifications, and an admin importer (PDF/Excel → `questions.js`).
