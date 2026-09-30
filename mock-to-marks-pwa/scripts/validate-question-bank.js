const fs = require('fs');
const path = require('path');
const vm = require('vm');

const arena = path.join(__dirname, '..', 'arena');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'subject-chapters.js'), 'utf8'), context, { filename: 'subject-chapters.js' });
['questions.js', 'practice.js', 'pyq.js'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(arena, file), 'utf8'), context, { filename: file });
});

const questions = context.window.QBANK;
const ids = new Set();
const required = ['id', 'exam', 'subject', 'chapter', 'type', 'difficulty', 'q', 'answer', 'hint', 'solution'];
const errors = [];
const requiredSubjects = { JEE: ['Physics', 'Chemistry', 'Mathematics'], NEET: ['Physics', 'Chemistry', 'Biology'] };
Object.entries(requiredSubjects).forEach(([exam, subjects]) => subjects.forEach((subject) => {
  const chapters = context.window.PJ_SUBJECT_CHAPTERS[exam] && context.window.PJ_SUBJECT_CHAPTERS[exam][subject];
  if (!Array.isArray(chapters) || !chapters.length) errors.push(`${exam} / ${subject}: dropdown catalogue is empty`);
  else if (chapters.length !== new Set(chapters).size) errors.push(`${exam} / ${subject}: dropdown catalogue contains duplicates`);
}));

questions.forEach((question, index) => {
  const label = question.id || `question ${index + 1}`;
  required.forEach((field) => {
    if (question[field] === undefined || question[field] === null || question[field] === '') errors.push(`${label}: missing ${field}`);
  });
  if (ids.has(question.id)) errors.push(`${label}: duplicate id`);
  ids.add(question.id);
  if (!Number.isInteger(question.difficulty) || question.difficulty < 0 || question.difficulty > 10) {
    errors.push(`${label}: difficulty must be an integer from 0 to 10`);
  }
  const catalogue = context.window.PJ_SUBJECT_CHAPTERS;
  if (!catalogue[question.exam] || !catalogue[question.exam][question.subject] || !catalogue[question.exam][question.subject].includes(question.chapter)) {
    errors.push(`${label}: ${question.exam} / ${question.subject} / ${question.chapter} is missing from the analysis dropdown catalogue`);
  }
  if (question.type === 'mcq' && (!Array.isArray(question.options) || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length)) {
    errors.push(`${label}: invalid MCQ options or answer`);
  }
});

if (errors.length) {
  console.error(errors.slice(0, 100).join('\n'));
  console.error(`${errors.length} question-bank validation error(s)`);
  process.exit(1);
}
const catalogueCount = Object.values(context.window.PJ_SUBJECT_CHAPTERS).reduce((total, subjects) => total + Object.values(subjects).reduce((sum, chapters) => sum + chapters.length, 0), 0);
console.log(`Validated ${questions.length} questions and ${catalogueCount} exam/subject chapter options: unique ids, complete catalogues, valid answers, difficulty 0–10.`);
