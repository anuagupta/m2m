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
