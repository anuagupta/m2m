const admin = require('./_firebaseAdmin');
const verifyAuth = require('./_verifyAuth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method not allowed' }); return; }

  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }

  const raw = String((req.body && req.body.source) || '');
  const source = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
  if (!source) { res.status(200).json({ ok: true }); return; }

  // First-touch attribution: only record the very first channel we ever see
  // for this user, so a later sign-in from a different link (or just a
  // repeat visit) doesn't overwrite who actually brought them in.
  const userRef = admin.firestore().collection('users').doc(uid);
  await admin.firestore().runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    if (doc.exists && doc.data().source) return;
    tx.set(userRef, { source: source, sourceCapturedAt: Date.now() }, { merge: true });
  });

  res.status(200).json({ ok: true });
};
