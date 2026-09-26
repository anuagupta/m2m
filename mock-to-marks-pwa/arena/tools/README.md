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
