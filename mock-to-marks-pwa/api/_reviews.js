const admin = require('./_firebaseAdmin');

// Student reviews live in the server-only `reviews` collection, one document
// per student (the doc id is their uid). A review is public only once an
// admin sets status to "approved"; editing one sends it back to "pending".
// This file is a helper, not a function: Vercel's plan caps the number of
// serverless functions, so the endpoints are routed through existing ones.
const COL = 'reviews';
const MIN = 20;
const MAX = 500;

function cleanName(n) {
  const first = String(n || '').trim().split(/\s+/)[0] || '';
  return first.replace(/[^\p{L}\p{N}'.-]/gu, '').slice(0, 24);
}
function cleanPhoto(u) {
  try {
    const x = new URL(String(u || ''));
    if (x.protocol === 'https:' && /(^|\.)googleusercontent\.com$/.test(x.hostname)) return x.href.slice(0, 500);
  } catch (e) { /* no usable photo */ }
  return '';
}
const ms = (t) => (t && t.toMillis ? t.toMillis() : 0);

async function publicList() {
  const snap = await admin.firestore().collection(COL).where('status', '==', 'approved').limit(100).get();
  const rows = snap.docs.map((d) => d.data()).sort((a, b) => (ms(b.updatedAt) || 0) - (ms(a.updatedAt) || 0));
  const count = rows.length;
  const avg = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  return {
    ok: true, count, average: avg,
    reviews: rows.slice(0, 50).map((r) => ({ name: r.name || '', photo: r.photo || '', rating: r.rating, text: r.text, exam: r.exam || '', at: ms(r.updatedAt) }))
  };
}

async function mine(uid) {
  const doc = await admin.firestore().collection(COL).doc(uid).get();
  if (!doc.exists) return { ok: true, review: null };
  const d = doc.data();
  return { ok: true, review: { rating: d.rating, text: d.text, exam: d.exam, status: d.status } };
}

async function submit(uid, body) {
  const rating = Number(body.rating);
  const text = String(body.text || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { code: 400, ok: false, error: 'choose a rating from 1 to 5' };
  if (text.length < MIN || text.length > MAX) return { code: 400, ok: false, error: `write between ${MIN} and ${MAX} characters` };
  const exam = String(body.exam || '').toUpperCase() === 'NEET' ? 'NEET' : 'JEE';
  let user = {};
  try { user = await admin.auth().getUser(uid); } catch (e) { /* fall back to anonymous display */ }
  const ref = admin.firestore().collection(COL).doc(uid);
  const prior = await ref.get();
  const now = admin.firestore.FieldValue.serverTimestamp();
  await ref.set({
    rating, text, exam,
    name: cleanName(user.displayName) || 'A ProDJEE student',
    photo: cleanPhoto(user.photoURL),
    email: String(user.email || '').slice(0, 200) || null,
    status: 'pending',
    createdAt: prior.exists && prior.data().createdAt ? prior.data().createdAt : now,
    updatedAt: now
  });
  return { ok: true, status: 'pending' };
}

async function adminList() {
  const snap = await admin.firestore().collection(COL).limit(300).get();
  const rank = { pending: 0, approved: 1, hidden: 2 };
  const reviews = snap.docs.map((d) => {
    const r = d.data();
    return { id: d.id, name: r.name, email: r.email, exam: r.exam, rating: r.rating, text: r.text, status: r.status, updatedAt: ms(r.updatedAt) };
  }).sort((a, b) => (rank[a.status] - rank[b.status]) || (b.updatedAt - a.updatedAt));
  return { ok: true, reviews };
}

async function adminSet(who, id, status) {
  id = String(id || '').trim();
  if (!id || ['approved', 'hidden', 'pending'].indexOf(status) < 0) return { code: 400, ok: false, error: 'bad review update' };
  const ref = admin.firestore().collection(COL).doc(id);
  if (!(await ref.get()).exists) return { code: 404, ok: false, error: 'review not found' };
  await ref.update({ status, moderatedBy: who.email, moderatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
}

module.exports = { publicList, mine, submit, adminList, adminSet, MIN, MAX };
