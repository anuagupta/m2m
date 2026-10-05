const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const { pickMessage, cleanSummary, dayIST } = require('../api/_pushMessage');
const failures = [];
const ist = (iso) => Date.parse(iso + '+05:30');
const NOW = ist('2026-10-05T19:30:00');              // the nightly send
const base = { exam: 'JEE', vaultDue: 0, streak: 0, weakChapter: '', weakSubject: '', lastActiveAt: ist('2026-10-03T18:00:00') };
const t = (name, ok) => { if (!ok) failures.push('message logic: ' + name); };

t('already studied today gets nothing', pickMessage(Object.assign({}, base, { vaultDue: 5, lastActiveAt: ist('2026-10-05T09:00:00') }), NOW) === null);
t('vault due wins over streak and weak chapter', (pickMessage(Object.assign({}, base, { vaultDue: 3, streak: 4, lastActiveAt: ist('2026-10-04T20:00:00'), weakChapter: 'Optics', weakSubject: 'Physics' }), NOW) || {}).type === 'vault');
t('singular wording', /^1 question you got wrong is due/.test(pickMessage(Object.assign({}, base, { vaultDue: 1 }), NOW).body));
t('streak shown only if practised yesterday', (pickMessage(Object.assign({}, base, { streak: 5, lastActiveAt: ist('2026-10-04T20:00:00') }), NOW) || {}).type === 'streak');
t('stale streak is not mentioned', (pickMessage(Object.assign({}, base, { streak: 5, lastActiveAt: ist('2026-10-02T20:00:00') }), NOW) || {}).type !== 'streak');
t('streak of 1 is not mentioned', (pickMessage(Object.assign({}, base, { streak: 1, lastActiveAt: ist('2026-10-04T20:00:00') }), NOW) || {}).type !== 'streak');
const weak = pickMessage(Object.assign({}, base, { weakChapter: 'Rotational Motion', weakSubject: 'Physics' }), NOW);
t('weak chapter message + deep link', weak && weak.type === 'weak' && weak.url.includes('mode=chapter') && weak.url.includes('chapters=Rotational%20Motion') && weak.url.includes('utm_source=push'));
t('nothing to say gets nothing', pickMessage(base, NOW) === null);
t('IST day boundary', dayIST(ist('2026-10-05T00:10:00')) === '2026-10-05' && dayIST(ist('2026-10-04T23:50:00')) === '2026-10-04');
const c = cleanSummary({ exam: 'x', vaultDue: -4, streak: 1e9, weakChapter: 'a'.repeat(500), junk: 'secret', lastActiveAt: 'nope' });
t('cleanSummary keeps only the promised fields and caps them', Object.keys(c).sort().join() === 'exam,lastActiveAt,streak,vaultDue,weakChapter,weakSubject' && c.exam === 'JEE' && c.vaultDue === 0 && c.streak === 9999 && c.weakChapter.length === 80 && c.lastActiveAt === 0);
for (const m of [pickMessage(Object.assign({}, base, { vaultDue: 9 }), NOW), weak]) { if (m.title.length > 40 || m.body.length > 90) failures.push('message too long: ' + m.title + ' / ' + m.body); }

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
if (!(vercel.crons || []).some((x) => x.path === '/api/push' && x.schedule === '0 14 * * *')) failures.push('vercel.json must schedule /api/push at 0 14 * * * (7:30 PM IST)');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (!/addEventListener\('push'/.test(sw) || !/addEventListener\('notificationclick'/.test(sw)) failures.push('sw.js needs push and notificationclick handlers');
if (!sw.includes("'/assets/pj-push.js'")) failures.push('sw.js must precache /assets/pj-push.js');
if (!/pj-push\.js/.test(fs.readFileSync(path.join(root, 'arena', 'index.html'), 'utf8'))) failures.push('arena/index.html must load pj-push.js');
const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
if (!/Notification data/.test(privacy)) failures.push('privacy.html must describe the notification data');
const api = fs.readFileSync(path.join(root, 'api', 'push.js'), 'utf8');
if (!/CRON_SECRET/.test(api) || !/verifyAuth/.test(api)) failures.push('api/push.js must authenticate both the cron and student calls');
// A private key must never be committed.
const jsFiles = ['assets/pj-push.js', 'api/push.js', 'api/_pushMessage.js', 'sw.js'];
jsFiles.forEach((f) => { if (/VAPID_PRIVATE_KEY\s*=\s*['"]/.test(fs.readFileSync(path.join(root, f), 'utf8'))) failures.push(f + ' must not contain a private key'); });
const arenaApp = fs.readFileSync(path.join(root, 'arena', 'app.js'), 'utf8');
if (!/push-on/.test(arenaApp) || !/push-toggle/.test(arenaApp) || !/id="push-card"/.test(arenaApp) || !/id="push-row"/.test(arenaApp)) failures.push('Arena needs the results opt-in card and the profile switch');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Validated daily-nudge push: message priority and limits, IST day logic, stored-field whitelist, schedule, service-worker handlers, opt-in UI and privacy text.');
