# PYQ extraction pipeline

1. Put pdf.js next to `render.html`:
   `curl -o pdf.min.mjs https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs`
   `curl -o pdf.worker.min.mjs https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs`
2. Put the official response-sheet PDF and the NTA final-key PDF in the same folder and serve it:
   `python3 -m http.server 8766`
3. `node text.js paper.pdf paper.txt`, then `node text.js key.pdf key.txt`: extracts the text layers (IDs).
4. `python3 match.py paper.txt key.txt <key page>`: gives the correct option position for every question, by option ID.
5. `node render.js paper.pdf pages/p 1.5`: renders page images, so the questions can be read and solved independently.
6. `node crop.js paper.pdf spec.json`: crops figures at 2× (coordinates in 1.5-scale pixels).

Only use **official NTA response sheets** (with Question ID / Option ID). Coaching "memory-based" papers differ from the real exam.

## Verified intake and chapter tagging

The tracked source inventory is `sources-2023-2026.json`. A final answer key by
itself is not enough: every import needs the official question text, options,
Question ID, paper date, official response-sheet URL and final-key URL.

Prepare a JSON array with the ordinary Arena fields plus `year`, `examDate`,
`sourceUrl`, `answerKeyUrl`, `officialQuestionId`, and either an integer
`difficulty` or `difficultyEvidence`. Validate it first:

`node arena/tools/import-verified.js intake.json`

After human review, append it to the bank:

`node arena/tools/import-verified.js intake.json --apply`

The importer rejects duplicate IDs, unofficial hosts, invalid answers, years
outside 2023–2026, and chapters not present in the Mock Test Analysis dropdown.
Always run `npm test` after importing.

## Difficulty rubric (0–10)

- 0–2: direct NCERT/fact recall or one immediate substitution.
- 3–4: one familiar concept and routine working.
- 5–6: linked concepts, several reasoning steps, or material calculation.
- 7–8: non-obvious insight, a strong distractor/trap, or long multi-stage work.
- 9–10: exceptional within-syllabus synthesis; use sparingly.

`difficulty.js` converts recorded features into a reproducible initial score.
After enough Arena attempts, `observedDifficulty` uses a Bayesian correct-rate
estimate plus time and hint signals, preventing a handful of early attempts
from causing large rating swings.
