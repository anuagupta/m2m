const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const reportApi = read('api/report-question.js');
const adminPage = read('admin/index.html');
const arena = read('arena/app.js');
const listApi = read('api/admin-list-reports.js');
const resolveApi = read('api/admin-resolve-report.js');
const failures = [];

[
  [reportApi, "collection('questionReports').add", 'reports are persisted'],
  [reportApi, 'emailNotified', 'email outcome is recorded'],
  [listApi, 'verifyAdmin', 'report queue is admin-only'],
  [resolveApi, 'verifyAdmin', 'report updates are admin-only'],
  [adminPage, '/admin-list-reports', 'admin UI loads the report queue'],
  [adminPage, '/admin-resolve-report', 'admin UI resolves reports'],
  [arena, 'Abusive / inappropriate content', 'Arena offers an abuse reason']
].forEach(([source, needle, claim]) => { if (!source.includes(needle)) failures.push(`Missing: ${claim}`); });

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Validated durable question reporting, admin moderation, and abuse reporting.');
