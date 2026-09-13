const crypto = require('crypto');
const admin = require('./_firebaseAdmin');
const verifyAuth = require('./_verifyAuth');

const MAX_REDEMPTIONS = 3;

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method not allowed' }); return; }

  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }

  const promoCode = process.env.PROMO_CODE;
  if (!promoCode) { res.status(500).json({ ok: false, error: 'promo codes not configured yet' }); return; }

  const submitted = String((req.body && req.body.code) || '').trim().toLowerCase();
  if (!submitted) { res.status(400).json({ ok: false, error: 'enter a code' }); return; }

  if (!timingSafeEqualStr(submitted, promoCode.trim().toLowerCase())) {
    res.status(400).json({ ok: false, error: 'That code isn’t valid.' });
    return;
  }

  const userRef = admin.firestore().collection('users').doc(uid);
  const result = await admin.firestore().runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    const used = (doc.exists && doc.data().promoRedemptions) || 0;
    if (used >= MAX_REDEMPTIONS) {
      return { ok: false, error: 'This code has already been used the maximum number of times on this account.' };
    }
    tx.set(userRef, {
      entitled: true,
      entitledAt: Date.now(),
      entitledVia: 'promo',
      promoRedemptions: used + 1
    }, { merge: true });
    return { ok: true };
  });

  res.status(result.ok ? 200 : 400).json(result);
};
