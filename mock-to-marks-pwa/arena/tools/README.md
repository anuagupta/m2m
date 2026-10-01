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

Use official NTA or CBSE papers wherever they are retained. A third-party archive
may recover missing question text, but must never decide the answer. Any recovered
text is checked against a second independent archive and the official final key.
Memory-based questions, watermarked images and uncertain diagrams are rejected.

## Verified intake and chapter tagging

The tracked source inventory is `sources-2023-2026.json` (the filename is retained
for compatibility; its active scope is 2017–2026). A final answer key by
itself is not enough: every import needs the official question text, options,
Question ID, paper date, official response-sheet URL and final-key URL.

Prepare a JSON array with the ordinary Arena fields plus `year`, `examDate`,
`sourceUrl`, `answerKeyUrl`, `officialQuestionId`, and either an integer
`difficulty` or `difficultyEvidence`. NEET Biology rows also require
`biologyBranch: "Botany" | "Zoology"`. If an approved independent archive was
needed to recover text, record it as `recoverySourceUrl`. Validate it first:

`node arena/tools/import-verified.js intake.json`

After human review, append it to the bank:

`node arena/tools/import-verified.js intake.json --apply`

The importer prohibits the excluded transcription services in every intake field.
It rejects duplicate IDs, unofficial authority hosts, unapproved recovery hosts,
invalid answers, exam years outside 2017–2026,
and chapters not present in the Mock Test Analysis dropdown. Every intake row
must explicitly confirm `answerKeyMatch: true`, `independentSolution: true`, and
`diagramStatus: "not_required" | "redrawn"`. Ambiguous, dropped and bonus
questions are rejected rather than silently included.
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
