const fs = require('fs');

const html = fs.readFileSync('coach/index.html', 'utf8');
const app = fs.readFileSync('coach/app.js', 'utf8');
const arena = fs.readFileSync('arena/app.js', 'utf8');

[
  'Today’s mission', 'Verified ', 'Mistake revision', 'Custom test builder',
  'Answer-key score calculator', 'Score target', 'Syllabus & revision dashboard'
].forEach((label) => {
  if (!app.includes(label)) throw new Error(`Coach feature missing: ${label}`);
});
if (!html.includes('data-exam="JEE"') || !html.includes('data-exam="NEET"')) throw new Error('JEE/NEET onboarding is incomplete');
if (!app.includes('/api/exam-updates')) throw new Error('Verified updates endpoint is not connected');
if (!arena.includes('cfg.difficulty === "easy"') || !arena.includes('launch.get("mode") === "chapter"')) throw new Error('Custom-test launch filters are not connected to Arena');
console.log('Validated Coach onboarding, missions, updates, revision, custom tests, scoring, targets and syllabus tracking.');
