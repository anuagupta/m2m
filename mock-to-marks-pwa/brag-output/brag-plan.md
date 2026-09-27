# Brag Plan: ProDJEE

## What is this app?
ProDJEE is two linked JEE/NEET exam-prep tools under one sign-in: Arena, which turns 2,891 verified real past-year questions into a scored, streak-based game, and Mock-to-Marks, which takes a student's mock-test score and tells them the exact root cause of every lost mark, then builds a 14-day recovery plan around it.

## The angle
Most exam-prep apps sell "practice." ProDJEE sells a diagnosis. The hook isn't "more questions" — it's "we can tell you exactly why you're stuck at the same score." Treat it like a high-stakes countdown: the exam clock is real, the marks lost are real, and this is the fix. Cinematic, trailer-scale confidence — not a cute SaaS ad.

## Hook (first 2-3 seconds)
Full-bleed dark navy. A single line lands, slow and heavy, like a trailer card:
"EVERY MARK COUNTS." Then, faster: the ink drains to reveal the app is already mid-session — a live GP counter ticking down behind the text.

## Key moments (the middle)
- Arena in motion: a real PYQ appears, the Gyan-Points counter ticks down from 200, the student answers, GP snaps up, a 🔥 streak pill and confetti fire — proof this is a live game running on 2,891 real, key-verified questions, not a quiz bank.
- Mock-to-Marks diagnosis: a mock score comes in, then the "six reasons you lose marks" panel resolves into a ranked stack (language, approach, formula recall, calculation slips, time), each tagged with marks lost — the product's actual insight, not a feature list.
- The 14-day plan snapping into a calendar-like sequence of focused daily blocks, ending on a "Day 14" state that visually answers the diagnosis.

## Outro / punchline
The ProDJEE wordmark slams full-screen — "Pro" in ink white, "DJEE" in gold — under the line "JEE/NEET prep that actually moves your marks." Hard cut to the URL, held.

## User flow worth showing
1. Arena: a question appears → student answers under the ticking GP counter → correct answer fires GP gain, streak, confetti (entry → key action → result).
2. Mock-to-Marks: a mock's score is logged → the six-root-cause diagnosis resolves, ranked by marks lost → a 14-day plan is generated (entry → key action → result).
Both are real in-product flows, not landing-page sections — they are the centerpiece scenes.

## Tone
- Preset: cinematic
- Creative direction: "exam-countdown trailer" — treat JEE/NEET prep with the same visual weight a movie trailer gives a disaster countdown, then resolve it with the product's real diagnosis instead of vague hype.
- Interpretation: dramatic reveals over quick cuts (3-5s per scene), short declarative lines that land and hold, full-bleed dark navy scenes with the product's own gold/coral/green light as the only color accents, restrained but confident motion (slow scale-in reveals, one hard hit on the wordmark) — never jokey, never corporate-soft.

## Format: landscape — 1920x1080
## Duration: 22.37s (beat-locked to the vol-12 cue grid; see Storyboard)

## Visual identity (from the project)
- Background: #0a0b14 (deep-space navy, `--pj-bg` / `--bg`)
- Accent: #ffc23d gold (`--pj-gold` / `--primary`), with #f04848 coral and #4ff0a0 green/mint as the only other accent hues — no other colors are introduced
- Text: #f2eff9 ink (`--pj-ink`), #b6b1cf soft ink for supporting lines
- Display font: Fraunces (serif, headline/wordmark weight 600-700)
- Body font: Manrope (sans, supporting text and data labels)
- Strongest visual element: the glassmorphic cards (blurred, translucent, `backdrop-filter: blur(22-28px) saturate(160-180%)`) floating over slow-drifting gold/green/coral gradient blobs on the navy field — this is the site's entire identity and should be the connective tissue between every scene, not just a background

## Share copy (draft)
Stuck at the same JEE/NEET mock score? ProDJEE tells you exactly which of 6 reasons is costing you marks — then builds your 14-day fix. prodjee.in

## Audio direction
- Role: cinematic support with a building swell
- Music: a cinematic/trailer-leaning bed from the bundled library — dark, low, rising rather than upbeat/bright; picked at composition time from `<skill-dir>/assets/music` for the closest match to "tense build → confident resolve"
- Music treatment: starts near-silent under the hook line, swells through the reveal, sustains under the two product highlights with a restrained beat-matched lift on the GP-gain and diagnosis-reveal moments, peaks into the wordmark hit, short tail under the outro hold
- Music cue guidance: to be detected at composition time (custom track selection) via `npx hyperframes beats`; target one strong cue at the wordmark slam (~17-18s) and one at the GP-counter payoff (~9-10s); sequential reveals (the six-reason stack) should snap to every other beat, not every beat, so each label holds long enough to read
- Audio-reactive treatment: subtle — the background blobs' glow/opacity may breathe with the music's low end; no waveform bars, no literal visualizer
- SFX posture: moderate, motion-matched, never comedic — a soft low tick under the GP countdown, a bright but brief chime + confetti pop on the correct answer, a card-arrival thud for each of the six diagnosis rows, one clean low impact under the wordmark slam
- Audio-coupled moments: GP counter ticking down (tick SFX matched to the visual count), the six-reason stack arriving one row at a time (thud per row, spaced to the beat-grid, not every beat), the wordmark hard-hit landing on a music accent
- Restraint rule: no comedic stingers, no bright pop/EDM energy — this stays low, dark, and confident throughout; the swell should never fully resolve into something upbeat, it resolves into calm confidence

## Storyboard

### Scene 1 — Hook — 3.00s (0.00s–3.00s global)
Full-bleed navy (#0a0b14), blobs barely visible/still. "EVERY MARK COUNTS." (Fraunces, heavy, full-bleed, ink white) slams in and holds. In the last half-second the line's ink starts to drain/dissolve at the edges, revealing motion starting behind it.
Sequential/interaction: none
Audio intent: tense, quiet, held breath
Audio-coupled idea: the line's entrance lands exactly on a low music hit
Music: cinematic bed, near-silent, low drone starting
Transition mood: dramatic → Scene 2

### Scene 2 — Reveal / Arena — 5.74s (3.00s–8.74s global)
The dissolve completes into a live Arena question card: real PYQ text, the Gyan-Points counter visibly ticking down (200→~160 across the scene), a 🔥 streak pill. Student "answers" (simulated tap) — counter freezes, GP snaps upward with a green flash, confetti bursts, streak pill increments, all landing together right on the beat. Small label beneath: "2,891 real PYQs · verified against the official key."
Sequential/interaction: yes — counter ticks down continuously, then the tap-answer-correct sequence fires as one beat (tap → GP jump → confetti → streak tick) at the very end of the scene, each sub-step distinct
Audio intent: rising tension into a rewarding payoff
Audio-coupled idea: soft tick per counter decrement, then a bright chime + confetti pop on the correct answer, landing on the strongest cue in the opening 10s — // beat-locked: 8.74s
Music: cinematic bed building, first beat-locked accent on the GP payoff
Transition mood: dramatic wipe → Scene 3

### Scene 3 — Mock-to-Marks diagnosis — 6.55s (8.74s–15.29s global)
Hard cut to a mock score card, then the "six reasons you lose marks" stack resolves top to bottom: Language, Approach, Formula recall, Calculation slips, Time — each row arriving with a marks-lost tag, ranked highest-loss first. Headline over/under the stack: "Six reasons. One diagnosis." Holds on the full resolved stack for 1.65s before transitioning.
Sequential/interaction: yes — 5 rows arrive one by one on beat-grid points 9.29s, 10.37s, 11.46s, 12.55s, 13.64s (every other beat of the 109.96 BPM grid, ~1.08s apart — fast enough to feel alive, slow enough to read each label), then the full stack holds to 15.29s
Audio intent: focused, revealing, matter-of-fact confidence
Audio-coupled idea: one soft card-thud per row arrival, on each beat-grid timestamp above — // beat-grid: row 1 at 9.29s, row 2 at 10.37s, row 3 at 11.46s, row 4 at 12.55s, row 5 at 13.64s
Music: sustained cinematic bed, steady
Transition mood: clean wipe → Scene 4

### Scene 4 — 14-day plan — 3.12s (15.29s–18.41s global)
The ranked stack compresses into a horizontal sequence of 14 day-blocks; the first few fill in with short labels (e.g. "Day 1 · Formula drill"), then fast-forward-fills to "Day 14" glowing gold, resolving right on the 17.47s strong cue. Line beneath: "A 14-day plan built on your actual gaps."
Sequential/interaction: yes — day blocks fill left to right in an accelerating sequence, ending on Day 14 holding
Audio intent: momentum, resolution approaching
Audio-coupled idea: quick tick-tick-tick as day blocks fill, resolving into a held tone right on the beat — // beat-locked: 17.47s
Music: swell rising toward peak
Transition mood: dramatic → Scene 5

### Scene 5 — Outro / wordmark — 3.96s (18.41s–22.37s global)
Hard cut to full-bleed navy. "Pro" (ink white) + "DJEE" (gold) wordmark slams to full scale on the music's peak hit, small logo mark beside it — the slam lands on the 18.56s strong cue, 0.15s into the scene. Tagline beneath: "JEE/NEET prep that actually moves your marks." Hold, then a clean cut reveals "prodjee.in" and holds to the end (22.37s, itself a strong cue).
Sequential/interaction: none (single hard slam-in, then a clean secondary reveal of the URL)
Audio intent: payoff, confident close
Audio-coupled idea: the wordmark's entrance lands on the music's peak/impact — // beat-locked: 18.56s
Music: peak impact, then a short tail fading under the URL hold
Transition mood: hard cut → end

**Total duration: 22.37s** (3.00 + 5.74 + 6.55 + 3.12 + 3.96)

**Music mood for this video:** cinematic
**Music cue source:** `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` bundled preset (109.96 BPM) — chosen over the more upbeat vol-1/9/10/11 tracks because the plan calls for "steady and clean," not bright/corporate energy.
**Audio summary:** A low cinematic bed opens near-silent under the hook, builds through the Arena payoff (beat-locked 8.74s) and the diagnosis reveal (beat-grid 9.29s–13.64s), lifts through the 14-day resolve (beat-locked 17.47s), peaks on the wordmark slam (beat-locked 18.56s), then holds to a confident close at the 22.37s cue — restrained motion-matched SFX throughout, no bright or comedic accents.
