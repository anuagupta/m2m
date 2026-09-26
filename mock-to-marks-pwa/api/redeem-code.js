const crypto = require('crypto');
const admin = require('./_firebaseAdmin');
const verifyAuth = require('./_verifyAuth');
const cors = require('./_cors');

const MAX_REDEMPTIONS = 3;
// A single shared PROMO_CODE means a script that tries codes rapidly could
// otherwise brute-force it. Cap wrong guesses per account, in a rolling
// window, before making them wait it out.
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

module.exports = async (req, res) => {
  if (!cors(req, res)) return;

  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }

  const promoCode = process.env.PROMO_CODE;
  if (!promoCode) { res.status(500).json({ ok: false, error: 'promo codes not configured yet' }); return; }

  const submitted = String((req.body && req.body.code) || '').trim().toLowerCase();
  if (!submitted) { res.status(400).json({ ok: false, error: 'enter a code' }); return; }

  const userRef = admin.firestore().collection('users').doc(uid);
  const correct = timingSafeEqualStr(submitted, promoCode.trim().toLowerCase());

  const result = await admin.firestore().runTransaction(async (tx) => {
    const doc = await tx.get(userRef);
    const data = doc.exists ? doc.data() : {};
    const now = Date.now();
    const windowStart = data.promoFailWindowStart || 0;
    const inWindow = now - windowStart < FAILURE_WINDOW_MS;
    const failCount = inWindow ? (data.promoFailCount || 0) : 0;

    if (!correct) {
      if (failCount + 1 >= MAX_FAILURES) {
        tx.set(userRef, { promoFailCount: failCount + 1, promoFailWindowStart: inWindow ? windowStart : now }, { merge: true });
        return { ok: false, error: 'Too many incorrect attempts. Try again in 15 minutes.' };
      }
      tx.set(userRef, { promoFailCount: failCount + 1, promoFailWindowStart: inWindow ? windowStart : now }, { merge: true });
      return { ok: false, error: 'That code isn’t valid.' };
    }
    if (inWindow && failCount >= MAX_FAILURES) {
      return { ok: false, error: 'Too many incorrect attempts. Try again in 15 minutes.' };
    }

    const used = data.promoRedemptions || 0;
    if (used >= MAX_REDEMPTIONS) {
      return { ok: false, error: 'This code has already been used the maximum number of times on this account.' };
    }
    tx.set(userRef, {
      entitled: true,
      entitledAt: Date.now(),
      entitledVia: 'promo',
      promoRedemptions: used + 1,
      promoFailCount: 0
    }, { merge: true });
    return { ok: true };
  });

  res.status(result.ok ? 200 : 400).json(result);
};
