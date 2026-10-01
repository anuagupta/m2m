'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const ctx = { window: {} };
vm.createContext(ctx);
['questions.js', 'practice.js', 'pyq.js'].forEach((name) => vm.runInContext(fs.readFileSync(path.join(root, 'arena', name), 'utf8'), ctx));

const years = { JEE: [2023, 2024, 2025, 2026], NEET: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026] };
const pyqs = ctx.window.QBANK.filter((q) => /^(JEE Main|NEET) 20\d\d/.test(q.source || ''));
const rows = [];
for (const [exam, expected] of Object.entries(years)) {
  for (const year of expected) {
    const found = pyqs.filter((q) => q.exam === exam && (q.source || '').includes(String(year)));
    const papers = new Set(found.map((q) => (q.source || '').replace(/ · Q(?:ID)?\s*\d+.*$/, '')));
    rows.push({ exam, year, questions: found.length, papers: papers.size, status: found.length ? 'partial_or_present' : 'missing' });
  }
}
console.table(rows);
console.log(`Verified-format PYQs currently detected: ${pyqs.length}`);
