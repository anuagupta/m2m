'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'assets', 'subject-chapters.js'), 'utf8'), ctx);
['questions.js', 'practice.js', 'pyq.js'].forEach((name) => {
  vm.runInContext(fs.readFileSync(path.join(root, 'arena', name), 'utf8'), ctx);
});

const years = Array.from({ length: 10 }, (_, i) => 2017 + i);
const subjects = {
  JEE: ['Physics', 'Chemistry', 'Mathematics'],
  NEET: ['Physics', 'Chemistry', 'Biology']
};
const rows = [];

for (const exam of Object.keys(subjects)) {
  for (const year of years) {
    const yearQuestions = ctx.window.QBANK.filter((q) => {
      if (q.exam !== exam || /sample|practice/i.test(q.source || '')) return false;
      return Number(q.year) === year || new RegExp(`\\b${year}\\b`).test(q.source || '');
    });
    const counts = subjects[exam].map((subject) => yearQuestions.filter((q) => q.subject === subject).length);
    rows.push([exam, year, ...counts, counts.reduce((sum, count) => sum + count, 0)]);
  }
}

console.log(['Exam', 'Year', 'Physics', 'Chemistry', 'Maths/Biology', 'Total'].join('\t'));
rows.forEach((row) => console.log(row.join('\t')));
