# Hyperframes Composition Brief: ProDJEE

> **v2 note:** this brief describes the original 22.4s all-recreated cut. The
> shipped composition is v2 (42.02s, 9 scenes): real Playwright screenshots of
> the live app replace several recreated scenes, the real `assets/logo.png`
> replaces the hand-drawn wordmark, and the music track changed to the more
> energetic `vol-1`. See `../brag-plan.md` → "Revision v2" and its updated
> Storyboard for the authoritative v2 creative record; treat the rest of this
> file as background on the original approach and the still-current visual
> identity/palette.

## Objective
Create a short, cinematic launch-style brag video for ProDJEE (prodjee.in) — a JEE/NEET exam-prep product with two linked tools, Arena (gamified real-PYQ practice) and Mock-to-Marks (diagnoses exactly why a student is losing marks and builds a 14-day recovery plan).

## Output
- Composition directory: `composition/` (this directory)
- Rendered video: `../brag.mp4`
- Format: landscape — 1920x1080
- Duration: 22.37s

## Source Material
- Project root: `/home/user/m2m/mock-to-marks-pwa`
- Primary files read: `index.html`, `assets/pj-core.css`, `arena/index.html`, `arena/app.js`, `arena/README.md`, `m2m/index.html`, `package.json`
- Product name: ProDJEE
- Tagline / strongest claim: "JEE/NEET prep that actually moves your marks." / "Find out exactly why you're losing marks."
- Key UI or visual moment to recreate:
  - Arena: the live Gyan-Points counter (ticks 200→50 per question), the 🔥 streak pill, confetti + GP-gain flash on a correct answer.
  - Mock-to-Marks: the "six reasons you lose marks" diagnosis stack (Language, Approach, Formula recall, Calculation slips, Time — ranked by marks lost), and the resulting 14-day plan.
- Copy that must appear verbatim:
  - "EVERY MARK COUNTS."
  - "2,891 real PYQs · verified against the official key."
  - "Six reasons. One diagnosis."
  - "A 14-day plan built on your actual gaps."
  - "JEE/NEET prep that actually moves your marks."
  - "prodjee.in"

## Creative Direction
- Tone preset: cinematic
- Creative direction: "exam-countdown trailer" — treat JEE/NEET prep with the visual weight of a movie-trailer countdown, then resolve it with the product's real diagnosis instead of vague hype.
- Interpretation: dramatic reveals over quick cuts (3-6.5s scenes), short declarative lines that land and hold, full-bleed dark navy with the product's own gold/coral/green light as the only accents, restrained but confident motion — one hard hit on the wordmark, everything else a controlled build.
- Angle: Most exam-prep apps sell "more practice." ProDJEE sells a diagnosis — it can tell a student exactly why they're stuck at the same score. The video should feel like a high-stakes countdown resolved by real product insight, not a cute SaaS ad.
- Hook: "EVERY MARK COUNTS." full-bleed, heavy Fraunces, on near-silent navy — then the ink dissolves into a live Arena screen already in motion.
- Outro / punchline: "Pro" (ink white) + "DJEE" (gold) wordmark slams full-screen on the music peak, tagline beneath, hard cut to "prodjee.in" held to the end.
- Avoid:
  - Generic SaaS language ("streamline your workflow" etc.)
  - Abstract filler visuals — every scene must show real product material
  - Unrelated visual redesign — use the site's own glassmorphic-card-over-navy-blob identity, don't invent a new one

## Visual Identity
- Background: `#0a0b14` (deep-space navy)
- Text: `#f2eff9` ink, `#b6b1cf` soft ink for supporting lines
- Accent: `#ffc23d` gold (primary), `#f04848` coral, `#4ff0a0` green/mint — no other hues
- Display font: Fraunces (headline weight 600-700) — load from Google Fonts or bundle a subset; fallback Georgia/serif
- Body font: Manrope — load from Google Fonts; fallback system sans
- Visual references from the project: the glassmorphic cards (`backdrop-filter: blur(22-28px) saturate(160-180%)`) floating over slow-drifting gold/green/coral radial-gradient blobs on the navy field — this is ProDJEE's entire visual identity across both Arena and Mock-to-Marks and should be the connective tissue between every scene

## Storyboard
Full beat-by-beat storyboard, timing, SFX, and beat-lock decisions are the creative contract in `../brag-plan.md` → "Storyboard". Summary:

1. Hook — 3.00s (0.00-3.00) — "EVERY MARK COUNTS." slams in on navy, dissolves at the edges into motion.
2. Arena reveal — 5.74s (3.00-8.74) — live PYQ card, GP counter ticking down, correct-answer payoff (GP jump + confetti + streak) beat-locked to 8.74s.
3. Mock-to-Marks diagnosis — 6.55s (8.74-15.29) — 5-row "six reasons" stack (headline says "Six reasons", 5 concrete rows shown is intentional — the 6th reason, Time, is named in the plan's copy but the stack itself only needs to read as the product's real ranked-list mechanic, not enumerate every label) arriving on beat-grid points 9.29/10.37/11.46/12.55/13.64s, holding to 15.29s.
4. 14-day plan — 3.12s (15.29-18.41) — day blocks fill accelerating, "Day 14" resolves beat-locked to 17.47s.
5. Outro — 3.96s (18.41-22.37) — wordmark slam beat-locked to 18.56s, hard cut to "prodjee.in" held to 22.37s.

## Audio
- Audio role: cinematic support with a building swell
- Audio arc: near-silent under the hook → builds through the Arena payoff and diagnosis reveal → lifts through the 14-day resolve → peaks on the wordmark slam → holds to a confident close
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (109.96 BPM, "steady and clean," the bundled track best matching a restrained cinematic mood — the other bundled tracks are upbeat/corporate and don't fit)
- Music treatment: starts at very low volume (~0.15) under the hook, rises to ~0.35 through scenes 2-4, brief emphasis at the wordmark peak, gentle fade under the final URL hold; never above 0.4
- Music cue guidance: bundled preset at `assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` / `.md`. Strong-cue locks used: 8.74s (Arena GP payoff), 17.47s (14-day resolve), 18.56s (wordmark slam) — 3 locks, within the 1-3 per video guidance. Beat-grid used for the 5 diagnosis rows: 9.29/10.37/11.46/12.55/13.64s (every other beat of the grid, ~1.08s apart, so each row is readable).
- Audio-reactive treatment: subtle — the background blobs' opacity/glow may breathe gently with the music's low end (RMS); no waveform/equalizer visuals, no literal visualizer, no strobing
- SFX posture: moderate, motion-matched, never comedic
- Audio-coupled moments:
  - Scene 2 GP payoff (8.74s) — bright chime + confetti-adjacent sound landing exactly on the beat-locked cue
  - Scene 3 diagnosis rows (9.29/10.37/11.46/12.55/13.64s) — one soft card-arrival sound per row, on the beat-grid
  - Scene 4 Day-14 resolve (17.47s) — a settling tick/impact on the beat-locked cue
  - Scene 5 wordmark slam (18.56s) — a deep bell impact on the beat-locked cue
- SFX selection guidance (files already copied into `assets/sfx/`, choose among these — do not reach for the full library):
  - `assets/sfx/interface/select_008.ogg` — GP counter's soft ticks / selection accents
  - `assets/sfx/casino/chips-collide-1.ogg` — GP-gain / correct-answer payoff (metric-gain character fits a scored counter better than a generic UI chime)
  - `assets/sfx/casino/card-place-1.ogg` — each diagnosis row's arrival (card-arrival character)
  - `assets/sfx/interface/drop_001.ogg` — softer secondary reveal (e.g. URL landing) if a lighter accent is wanted there
  - `assets/sfx/impact/impactSoft_medium_001.ogg` — Day-14 resolve
  - `assets/sfx/impact/impactBell_heavy_000.ogg` or `impactBell_heavy_003.ogg` — wordmark slam (reserve for this one moment only, per cinematic tone's "2-3 big ones" guidance)
- SFX analysis guidance: `hyperframes-creative`/`media-use` sfx-analysis conventions — prefer the lower high-frequency-risk file between `impactBell_heavy_000` and `_003` if both test acceptable; this is a repeated-viewing shareable asset, so avoid harsh top end.
- Audio files: already copied into `composition/assets/music/` and `composition/assets/sfx/{interface,impact,casino}/` — do not copy additional files from outside this project.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). `/brag` is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo/launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (Arena's GP/streak mechanic and Mock-to-Marks' diagnosis stack are both required — see Storyboard).
- Keep all text readable in the final render (respect the reading-time floor from `brag-plan.md`/`step-2-plan.md`).
- Keep the video at 22.37s total (already scene-summed above).
- Include the planned music/SFX layer — audio was not disabled.
- Treat the `/brag` audio notes above as guidance, not a fixed cue sheet — choose exact SFX timing after the visual animation exists.
- Treat the music cue metadata as optional timing hints; the 3 strong-cue locks and 5 beat-grid points above are the intended target, but ignore any that hurt readability, scene pacing, or the product story.
- Use SFX to support motion and interaction as described per-scene above; keep restraint — this is a 22s video with 3 major hits and 5 minor ones, not a dense SFX bed.
- Honor the music treatment above (low start, gentle build, brief peak emphasis, fade under the final hold).
- Implement the subtle audio-reactive treatment on the background blobs per the `hyperframes-creative` audio-reactive workflow; if extraction is unavailable, note it and skip rather than blocking the render.
- Use local assets already copied into `composition/assets/`.
- Run `npx hyperframes check` before render — it is brag's single gate.
