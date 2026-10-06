// Validates the Reviews tab: server rules (in-memory Firestore stub) and wiring.
const fs = require('fs');
const path = require('path');
const Module = require('module');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

// ---- in-memory stand-in for the Admin SDK ----
const store = {};
const ts = (n) => ({ toMillis: () => n });
let clock = 1000;
const FV = { serverTimestamp: () => ts(++clock) };
function col(name) {
  store[name] = store[name] || {};
  const docRef = (id) => ({
    get: async () => ({ exists: !!store[name][id], id, data: () => store[name][id] }),
    set: async (d) => { store[name][id] = Object.assign({}, d); },
    update: async (d) => { Object.assign(store[name][id], d); }
  });
  return {
    doc: docRef,
    where: (f, op, v) => ({ limit: () => ({ get: async () => ({ docs: Object.keys(store[name]).filter((k) => store[name][k][f] === v).map((k) => ({ id: k, data: () => store[name][k] })) }) }) }),
    limit: () => ({ get: async () => ({ docs: Object.keys(store[name]).map((k) => ({ id: k, data: () => store[name][k] })) }) })
  };
}
const fake = {
  firestore: Object.assign(() => ({ collection: col }), { FieldValue: FV }),
  auth: () => ({ getUser: async (uid) => ({ displayName: uid === 'u1' ? 'Riya Sharma' : '', photoURL: uid === 'u1' ? 'https://lh3.googleusercontent.com/a/x=s96' : 'http://evil.example/p.png', email: uid + '@x.in' }) })
};
const orig = Module._load;
Module._load = function (request, ...rest) { if (request === './_firebaseAdmin') return fake; return orig.call(this, request, ...rest); };
const R = require(path.join(root, 'api', '_reviews.js'));

(async () => {
  const long = 'ProDJEE helped me find my weak chapters and fix them fast.';
  check((await R.submit('u1', { rating: 0, text: long })).code === 400, 'rating 0 must be rejected');
  check((await R.submit('u1', { rating: 6, text: long })).code === 400, 'rating 6 must be rejected');
  check((await R.submit('u1', { rating: 4.5, text: long })).code === 400, 'fractional rating must be rejected');
  check((await R.submit('u1', { rating: 5, text: 'too short' })).code === 400, 'short text must be rejected');
  check((await R.submit('u1', { rating: 5, text: 'x'.repeat(501) })).code === 400, 'long text must be rejected');
  check((await R.submit('u1', { rating: 5, text: long, exam: 'neet' })).ok, 'valid review must save');
  check(store.reviews.u1.status === 'pending' && store.reviews.u1.name === 'Riya' && store.reviews.u1.exam === 'NEET', 'review saved pending with first name only');
  check(store.reviews.u1.photo.startsWith('https://lh3.googleusercontent.com/'), 'google photo kept');
  check((await R.submit('u2', { rating: 3, text: long })).ok && store.reviews.u2.photo === '' && store.reviews.u2.name === 'A ProDJEE student', 'non-google photo dropped, missing name falls back');
  check((await R.publicList()).count === 0, 'pending reviews must not be public');
  check((await R.adminSet({ email: 'a@x.in' }, 'u1', 'bogus')).code === 400, 'bad status rejected');
  check((await R.adminSet({ email: 'a@x.in' }, 'nope', 'approved')).code === 404, 'unknown review rejected');
  check((await R.adminSet({ email: 'a@x.in' }, 'u1', 'approved')).ok, 'admin approve');
  const pub = await R.publicList();
  check(pub.count === 1 && pub.average === 5 && pub.reviews[0].name === 'Riya' && !('email' in pub.reviews[0]) && !('uid' in pub.reviews[0]) && !('id' in pub.reviews[0]), 'public list exposes only approved, safe fields');
  await R.submit('u1', { rating: 4, text: long + ' Edited.' });
  check(store.reviews.u1.status === 'pending' && (await R.publicList()).count === 0, 'editing sends a review back to approval');
  check((await R.mine('u1')).review.status === 'pending' && (await R.mine('zz')).review === null, 'mine returns own review only');
  const list = (await R.adminList()).reviews;
  check(list.length === 2 && list.every((x) => x.status === 'pending'), 'admin list includes pending reviews');

  // ---- wiring ----
  const rq = read('api/report-question.js'), el = read('api/exam-updates.js');
  check(rq.indexOf("kind === 'review'") > rq.indexOf('verifyAuth(req)'), 'review submit must require sign-in');
  check(el.includes("type === 'reviews'") && el.includes('s-maxage=60'), 'public list route with short cache');
  check(read('api/admin-list-reports.js').includes("kind === 'reviews'") && read('api/admin-list-reports.js').indexOf('verifyAdmin') < read('api/admin-list-reports.js').indexOf("kind === 'reviews'"), 'admin list must verify admin first');
  check(read('api/admin-resolve-report.js').indexOf('verifyAdmin') < read('api/admin-resolve-report.js').indexOf("kind === 'review'"), 'admin moderation must verify admin first');
  const fns = fs.readdirSync(path.join(root, 'api')).filter((f) => !f.startsWith('_') && f.endsWith('.js')).length;
  check(fns <= 12, 'serverless function count must stay at or below 12 (found ' + fns + ')');
  const page = read('reviews/index.html');
  check(page.includes('<title>Student Reviews — ProDJEE</title>') && page.includes('MAX=500') && page.includes('MIN=20') && page.includes('referrerpolicy="no-referrer"'), 'reviews page basics');
  ['index.html', 'arena/index.html', 'm2m/index.html', 'coach/index.html', 'news/index.html', 'reviews/index.html'].forEach((f) => check(read(f).includes('<a href="/reviews/"'), f + ' needs the Reviews menu link'));
  check(read('assets/pj-core.js').includes("id: 'reviews'"), 'Reviews must be a section after News');
  check(read('sw.js').includes("'/reviews/'") && read('sitemap.xml').includes('/reviews/') && read('vercel.json').includes('"/reviews"'), 'sw, sitemap and redirect entries');
  check(read('admin/index.html').includes('data-rv="approved"') && read('privacy.html').includes('Reviews (optional'), 'admin moderation UI and privacy text');

  if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
  console.log('Validated reviews: server rules, moderation, public fields, menu wiring and privacy text.');
})();
