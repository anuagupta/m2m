const crypto = require('crypto');
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

  const body = req.body || {};
  const orderId = body.razorpay_order_id;
  const paymentId = body.razorpay_payment_id;
  const signature = body.razorpay_signature;
  if (!orderId || !paymentId || !signature) {
    res.status(400).json({ ok: false, error: 'missing payment details' });
    return;
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) { res.status(500).json({ ok: false, error: 'payments not configured yet' }); return; }

  // Razorpay's own recipe: HMAC-SHA256 of "order_id|payment_id" using the
  // key secret. No API call needed - this signature alone proves Razorpay
  // issued this payment for this exact order.
  const expected = crypto.createHmac('sha256', keySecret)
    .update(orderId + '|' + paymentId)
    .digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) { res.status(400).json({ ok: false, error: 'signature mismatch' }); return; }

  // The signature alone only proves Razorpay issued this payment for this
  // order - it says nothing about who the order was for. Without this check,
  // anyone handed a completed payment's orderId/paymentId/signature (shared
  // by a friend, or intercepted) could redeem it again under their own
  // account. The order record from create-order.js ties it to a uid, and
  // marking it consumed here stops the same order being redeemed twice.
  const orderRef = admin.firestore().collection('orders').doc(orderId);
  const result = await admin.firestore().runTransaction(async (tx) => {
    const orderDoc = await tx.get(orderRef);
    if (!orderDoc.exists) {
      return { ok: false, status: 400, error: 'This payment could not be matched to an order. Email prodjeelabs@gmail.com with payment ID: ' + paymentId };
    }
    const order = orderDoc.data();
    if (order.uid !== uid) {
      return { ok: false, status: 403, error: 'This payment was made from a different account.' };
    }
    if (order.consumed) {
      return { ok: false, status: 400, error: 'This payment has already been used to unlock an account.' };
    }
    tx.update(orderRef, { consumed: true, consumedAt: Date.now() });
    tx.set(admin.firestore().collection('users').doc(uid), {
      entitled: true,
      entitledAt: Date.now(),
      lastPaymentId: paymentId
    }, { merge: true });
    return { ok: true };
  });

  res.status(result.ok ? 200 : result.status).json({ ok: result.ok, error: result.error });
};
