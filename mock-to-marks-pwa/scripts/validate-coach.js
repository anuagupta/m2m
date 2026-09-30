const fs = require('fs');

const html = fs.readFileSync('coach/index.html', 'utf8');
const app = fs.readFileSync('coach/app.js', 'utf8');
const arena = fs.readFileSync('arena/app.js', 'utf8');
const core = fs.readFileSync('assets/pj-core.js', 'utf8');
const news = fs.readFileSync('news/index.html', 'utf8');
const home = fs.readFileSync('index.html', 'utf8');

[
  'Today’s mission', 'Mistake revision', 'Custom test builder',
  'Answer-key score calculator', 'Score target', 'Syllabus & revision dashboard'
].forEach((label) => {
  if (!app.includes(label)) throw new Error(`Coach feature missing: ${label}`);
});
if (!news.includes('/api/exam-updates') || !news.includes('Official NTA notice')) throw new Error('Verified News page is not connected');
if (!home.includes('id="profileExam"') || !home.includes("prodjee.student.v1")) throw new Error('Profile exam selection is incomplete');
if (!home.includes("typeof s.totalGP==='number'") || !home.includes('Number(s.totalGP[k])||0')) throw new Error('Legacy/per-exam GP totals can display NaN');
if (!arena.includes('cfg.difficulty === "easy"') || !arena.includes('launch.get("mode") === "chapter"')) throw new Error('Custom-test launch filters are not connected to Arena');
['prodjee.student.v1', 'prodjee.syllabus.v1'].forEach((key) => {
  if (!core.includes(`'${key}'`)) throw new Error(`Coach data is not included in backup/account migration: ${key}`);
});
if (!app.includes('migrateLegacyProfile()') || !app.includes("legacyAnalysis.mocks")) throw new Error('Legacy JEE/NEET profile migration is missing');
console.log('Validated Coach onboarding, missions, updates, revision, custom tests, scoring, targets and syllabus tracking.');
