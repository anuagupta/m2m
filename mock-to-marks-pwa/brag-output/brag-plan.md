# Brag Plan: ProDJEE

## Revision v2 (per user feedback)
The first cut (22.4s, all-recreated UI, invented "Pro"/"DJEE" text wordmark, restrained vol-12 track) was reworked on request to be:
- **Longer and more dynamic**: 22.4s → 42.0s, 5 scenes → 9 scenes.
- **Real app footage**: added 4 real Playwright screenshots of the live app (Home hub, Arena dashboard, Mock-to-Marks diagnosis — the actual radar-chart readiness index, and the actual 14-day plan screen) with Ken Burns motion, replacing an invented "six reasons" list that undersold what the diagnosis screen actually looks like.
- **More enthusiastic music**: swapped `happy-beats-...-vol-12` (restrained, 110 BPM) for `happy-beats-...-vol-1` (the catalog's most energetic track, 120 BPM), re-analyzed for real beat/strong-cue data, and raised the volume envelope (was capped ~0.4, now peaks at 0.5).
- **Real logo**: the outro now shows the project's actual `assets/logo.png` (the "Pro/D+stethoscope/JEE+hardhat" mark — medicine + engineering pun) instead of a hand-drawn text wordmark with guessed colors.
- **New stat-montage scene**: three quick number hits (2,891 / 6 / 14) added for extra dynamism between the recreated plan visualization and the outro.

The recreated GP-counter-payoff and 14-day-block scenes were kept — they show the product *in motion* (a thing no static screenshot can do), now placed alongside the real screenshots rather than instead of them. Updated storyboard below reflects v2; scene numbers and timings are new cue-locked values from the vol-1 track's actual beat analysis (not estimates).

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
## Duration: 42.02s (v2 — beat-locked to the vol-1 cue grid; see Storyboard)

## Visual identity (from the project)
- Background: #0a0b14 (deep-space navy, `--pj-bg` / `--bg`)
- Accent: #ffc23d gold (`--pj-gold` / `--primary`), with #f04848 coral and #4ff0a0 green/mint as the only other accent hues — no other colors are introduced
- Text: #f2eff9 ink (`--pj-ink`), #b6b1cf soft ink for supporting lines
- Display font: Fraunces (serif, headline/wordmark weight 600-700)
- Body font: Manrope (sans, supporting text and data labels)
- Strongest visual element: the glassmorphic cards (blurred, translucent, `backdrop-filter: blur(22-28px) saturate(160-180%)`) floating over slow-drifting gold/green/coral gradient blobs on the navy field — this is the site's entire identity and should be the connective tissue between every scene, not just a background

## Share copy (draft)
Stuck at the same JEE/NEET mock score? ProDJEE tells you exactly which of 6 reasons is costing you marks — then builds your 14-day fix. prodjee.in

## Audio direction (v2)
- Role: energetic, enthusiastic support — a real upgrade from v1's restrained cinematic bed, per explicit feedback
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` — the catalog's most energetic bundled track (120.19 BPM), re-analyzed directly (not just its 25s planning-window summary) to get real beat/strong-cue data out to 45s
- Music treatment: quiet under the pre-beat hook (0-3s, matching the track's own quiet intro before the beat grid starts at 3.02s), then present and driving from the first screenshot onward; volume envelope now peaks at 0.5 (v1 capped at 0.4) with lifts at every major reveal
- Music cue guidance: real `strongCues`/`beats` arrays pulled from the track's own analysis JSON (not estimated) — see per-scene beat-locks below; the track's detected strong-cue energy is concentrated in a 16-29s span, so the biggest visual beats (GP payoff, diagnosis reveal, plan reveal) were placed there deliberately
- Audio-reactive treatment: subtle — background blobs breathe with the bass band, unchanged approach from v1, still no waveform/visualizer
- SFX posture: still motion-matched and not comedic, but denser than v1 (9 scenes now have their own accent) — one reserved big bell hit stays on the final logo slam only
- Restraint rule: unchanged — no comedic stingers; "more enthusiastic" means fuller and louder, not silly

## Storyboard (v2 — 9 scenes, 42.02s)

### Scene 1 — Hook — 3.00s (0.00s–3.00s global)
Unchanged from v1. Full-bleed navy, "EVERY MARK COUNTS." slams in on the headline-slam primitive, plays through the track's own quiet pre-beat intro.
Transition mood: dramatic → Scene 2 (lands right as the music's beat grid starts, 3.02s)

### Scene 2 — Real screenshot: Home — 4.00s (3.00s–7.00s global)
An actual Playwright screenshot of prodjee.in's signed-out home hub (hero line, Arena/Mock-to-Marks cards) — not a recreation. Slow Ken Burns zoom-in (scale 1.0→1.12). Label pill fades in: "prodjee.in".
Audio-coupled idea: a soft reveal drop as the scene cuts in, right on the beat grid (3.0s)
Transition mood: clean cut → Scene 3

### Scene 3 — Real screenshot: Arena dashboard — 4.00s (7.00s–11.00s global)
Real screenshot of the actual Arena dashboard (GP total, daily-goal ring, streak dots, subject cards, badge strip). Ken Burns zoom+pan toward the "Play JEE Arena" CTA (scale 1.0→1.18, slight xPercent/yPercent drift). Label: "Arena — 2,891 real PYQs".
Transition mood: hard cut → Scene 4 (into the live recreation of this exact product, in motion)

### Scene 4 — Arena live: GP counter + payoff — 6.02s (11.00s–17.02s global)
Recreated (not a screenshot) because this is the one thing a screenshot can't show: the product *working*. Real PYQ-style question, Gyan-Points counter ticking 200→158, then the correct-answer payoff — GP snaps to 193, green flash, 16-particle confetti burst.
Audio-coupled idea: sparse counter tick mid-scene (14.0s); payoff tween lands at 16.97s, chime fires there — 0.05s ahead of the strongest cue in the track's whole build. // beat-locked: 17.02s
Transition mood: hard cut, exactly on the beat → Scene 5

### Scene 5 — Real screenshot: Mock-to-Marks diagnosis — 6.00s (17.02s–23.02s global)
Real screenshot of the actual diagnosis screen — the readiness-index radar chart and ranked priority list (Approach/Time management/etc. with score, questions-affected, marks-recoverable). This replaced v1's invented "six reasons" list, which undersold what the real screen actually looks like. Ken Burns zoom-in (scale 1.0→1.15) over the full 6s. Label: "Mock-to-Marks — see exactly where marks leak".
Transition mood: clean cut, on the 23.02s strong cue → Scene 6

### Scene 6 — Real screenshot: 14-day plan — 5.00s (23.02s–28.02s global)
Real screenshot of the actual day-by-day plan screen (drill cards, durations, "assigned because X was a recurring pattern"). Slow simulated-scroll Ken Burns (yPercent drift, constant scale 1.08). Label: "Your 14-day recovery plan".
Transition mood: clean cut → Scene 7

### Scene 7 — 14-day plan blocks (recreated) — 4.00s (28.02s–32.02s global)
A stylized bridge from the literal screenshot to an abstract "progress" visualization: 14 day-blocks cascade in, accelerating, Day 14 resolving with a gold glow.
Audio-coupled idea: cascade lands on the 30.52s beat-grid point (not a strong cue, but on-beat). // beat-grid: day-14 resolve at 30.52s
Transition mood: clean cut → Scene 8

### Scene 8 — Stat montage (new in v2) — 4.00s (32.02s–36.02s global)
Three big numbers, each a hard cut on the beat grid, no crossfade: "2,891 real PYQs, verified against the official key" → "6 reasons students lose marks — pinpointed, ranked" → "14 days to close the gap". Added specifically for more dynamism per feedback.
Audio-coupled idea: each number lands on a beat-grid point — 32.02s / 33.53s / 35.02s
Transition mood: clean cut → Scene 9

### Scene 9 — Outro: real logo — 6.00s (36.02s–42.02s global)
The actual `assets/logo.png` (not a hand-drawn wordmark) slams in — the real "Pro/D+stethoscope/JEE+hardhat" mark, medicine + engineering pun, white/red/green as the logo itself defines them. Tagline settles beneath, then a true hard cut (gsap.set, not a crossfade — a v1 bug where two overlapping opacity tweens rendered as garbled overlapping text) swaps it for "prodjee.in", held to the end.
Audio-coupled idea: slam lands essentially at the scene's first frame — 36.03s, a beat-grid point. This is the one reserved big-bell SFX hit in the whole video. // beat-locked: 36.03s
Transition mood: hard cut → end, URL holds 3.7s

**Total duration: 42.02s** (3.00 + 4.00 + 4.00 + 6.02 + 6.00 + 5.00 + 4.00 + 4.00 + 6.00)

**Music mood for this video:** energetic / enthusiastic (upgraded from "cinematic-restrained" in v1)
**Music cue source:** `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3`, real analysis JSON (120.19 BPM) — chosen specifically because it's the catalog's most energetic bundled track, per the request for "more enthusiastic" music.
**Audio summary:** Quiet under the hook (matching the track's own pre-beat intro), then present and driving from 3.0s on, with three real strong-cue-locked hits (17.02s GP payoff, 23.02s plan reveal, 36.03s logo slam) landing on the track's actual detected energy peaks, plus beat-grid-locked accents on the day-14 resolve and each stat-montage number.
