// Rewrites the exact question-bank total shown on the home page's Arena tile.
// Runs automatically before `npm test` (pretest) so the figure never drifts.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
['questions.js', 'practice.js', 'pyq.js'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, 'arena', file), 'utf8'), context, { filename: file });
});
const total = context.window.QBANK.length.toLocaleString('en-IN');
const file = path.join(root, 'index.html');
const html = fs.readFileSync(file, 'utf8');
const next = html.replace(/(<!--BANK_COUNT-->)[^<]*(<!--\/BANK_COUNT-->)/, `$1${total}$2`);
if (next === html) { if (!html.includes('<!--BANK_COUNT-->')) { console.error('BANK_COUNT marker missing from index.html'); process.exit(1); } }
else { fs.writeFileSync(file, next); console.log(`Updated home-page question count to ${total}`); }
