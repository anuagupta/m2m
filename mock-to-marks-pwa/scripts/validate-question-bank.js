const fs = require('fs');
const path = require('path');
const vm = require('vm');

const arena = path.join(__dirname, '..', 'arena');
const context = { window: {} };
vm.createContext(context);
['questions.js', 'practice.js', 'pyq.js'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(arena, file), 'utf8'), context, { filename: file });
});

const questions = context.window.QBANK;
const ids = new Set();
const required = ['id', 'exam', 'subject', 'chapter', 'type', 'difficulty', 'q', 'answer', 'hint', 'solution'];
const errors = [];

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
  if (question.type === 'mcq' && (!Array.isArray(question.options) || !Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length)) {
    errors.push(`${label}: invalid MCQ options or answer`);
  }
});

if (errors.length) {
  console.error(errors.slice(0, 100).join('\n'));
  console.error(`${errors.length} question-bank validation error(s)`);
  process.exit(1);
}
console.log(`Validated ${questions.length} questions: unique ids, required fields, valid answers, difficulty 0–10.`);
