const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'assets', 'pj-core.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'pj-core.css'), 'utf8');
const checks = [
  [js, 'data-pj-act="dismiss-sign-in"', 'dismiss buttons'],
  [js, "e.target.id === 'pj-gate'", 'backdrop dismissal'],
  [js, "e.key === 'Escape'", 'keyboard dismissal'],
  [js, 'requireAuth = false; hideGate()', 'dismissal state reset'],
  [css, '.pj-gate-close', 'close button styling']
];
const missing = checks.filter(([source, needle]) => !source.includes(needle)).map((x) => x[2]);
if (missing.length) { console.error('Missing sign-in escape behavior: ' + missing.join(', ')); process.exit(1); }
console.log('Validated sign-in dismissal by backdrop, close button, Not now, and Escape.');
