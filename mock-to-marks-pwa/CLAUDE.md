# ProDJEE — project notes for Claude

## Question-bank growth workflow

When adding new questions to the Arena question bank (`arena/pyq.js` /
`arena/questions.js` / `arena/practice.js`):

- Add **no more than 100 new questions per batch/session**. Once a batch
  reaches 100, stop — don't keep going in the same session.
- Each batch is meant to run as part of a recurring cycle (every 2 hours),
  not as one continuous push to finish everything at once.
- Every new question must be solved independently (never copy a
  coaching site's worked solution), phrased in original wording (never
  copy a coaching site's transcription verbatim), and any diagram must be
  redrawn as an original SVG (never copy an image). Skip anything
  ambiguous rather than guessing.
- Dedupe against existing `"id"` values across all three files before
  appending, and run `npm test` before committing.

### Question schema (adopted standard, use for every new question)

Base fields every question already had: `id`, `exam`, `subject`, `chapter`,
`type`, `difficulty`, `q`, `options` (mcq only), `answer`, `hint`,
`solution`, `source`, `img`/`imgAlt` (only if a diagram applies).

On top of that, a provenance block - first used for a JEE Main 2020 / NEET
2020 batch and now the standard for every new question - records how each
question and its answer were verified:

- `year` (number) and `examDate` (short string, e.g. `"8 Jan · Shift 1"`
  or `"13 Sep"`) — split out from the human-readable `source` string.
- `sourceUrl` — the official NTA exam-paper PDF this question came from.
- `officialQuestionId` — the question's own number in that official paper
  (e.g. `"8Jan-S1-P03"`, `"F3-26"`), so it can be cross-checked later.
- `answerKeyUrl` — the official NTA answer-key notice PDF, **when one
  could be found**.
- If no official answer-key notice could be found instead add
  `"officialAnswerKeyUnavailable": true` and `answerKeyRecoveryUrls`
  (an array of the independent sources used to cross-check the answer
  instead - never the single source the question itself was transcribed
  from). `answerKeyUrl` and `officialAnswerKeyUnavailable` are mutually
  exclusive - a question has exactly one of the two.
- `answerKeyMatch: true` — confirms the independently-derived answer
  matches the official key (or, when unavailable, the cross-checked
  recovery sources).
- `independentSolution: true` — confirms the `solution` field is your own
  derivation, not copied from any source.
- `diagramStatus` — `"not_required"` when the question has no figure, or
  `"redrawn"` when it does and `img` points at an original SVG you drew
  (never a copied image).

## Volume target: 20,000 Physics+Chemistry+Maths, 7,000 Biology

Current counts (check `npm test`'s output line for the live number -
this is a snapshot): Physics 2,726 · Chemistry 1,247 · Mathematics 1,220 ·
Biology 702. Target is roughly 6-7x growth.

**Real PYQs alone cannot reach this.** JEE Main (2020-2026, fully
harvested) tops out well short of 20,000 across P/C/M. NEET supplies
Biology at only ~90 questions/year, so even every NEET year available
tops out in the low thousands, nowhere near 7,000. Do not try to stretch
the PYQ-verification pipeline to hit these numbers by lowering the bar
on what counts as "genuinely previously asked" - keep that pipeline
exactly as rigorous as it already is (see above), running at whatever
pace real, verifiable PYQs allow.

**The volume comes from original practice questions instead** - a
second track, going into `arena/practice.js` (or `questions.js`'s
pattern), never into `pyq.js`. These are not claimed to be past exam
questions:

- Set `"kind": "practice"` explicitly on every one (the app's `kindOf()`
  checks this field first, so it's never misclassified as a PYQ
  regardless of what the `source` string says).
- `source` should read something honest like `"ProDJEE Practice"` or
  name the chapter/topic - never attribute it to a coaching institute or
  any other real entity it didn't come from.
- Still solve every question yourself and verify your own answer is
  actually correct before adding it - there's no external key to check
  against here, which makes getting it right yourself even more
  important, not less.
- Still rate difficulty 0-10 and use only chapters already listed in
  `assets/subject-chapters.js`.
- Aim for balanced coverage: spread new questions across chapters
  roughly proportional to each chapter's weight in the real exam
  (don't dump 500 questions into one easy chapter to hit a count).
  Biology needs the most new chapters covered from scratch (currently
  only 10 questions total).
- No diagram-redrawing constraint applies here (there's no source image
  to redraw from) - if a question needs a figure, just draw an original
  one appropriate to the question.

**Pace**: same 100-questions-per-cycle cap applies to this track too -
it isn't a separate allowance on top of the PYQ cycle's 100, and a cycle
can mix both kinds of question up to that combined total.

**Quality control**: no separate review gate for this track - ship each
verified batch the same way as the PYQ pipeline (commit, PR, merge).
Rely on the in-app "report a question" flow (admin inbox + `/admin/`
editor) to catch anything wrong after the fact, the same safety net the
PYQ content already relies on.
