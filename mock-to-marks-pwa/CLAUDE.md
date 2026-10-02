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
