const admin = require('./_firebaseAdmin');
const { extendEntitlement } = require('./_subscription');

// Razorpay webhook (events: payment.captured, refund.processed).
// The payload is treated only as a hint: every decision is made from the
// payment as Razorpay's API reports it, fetched with our key, so a forged
// call can at most make us re-check a real payment.
//   - captured: unlock the account the order was created for, in case the
//     browser closed before verify-payment ran.
//   - fully refunded: lock the plan again for the account it unlocked.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) { res.status(500).json({ ok: false }); return; }

  const payload = (req.body && req.body.payload) || {};
  const paymentId = (payload.payment && payload.payment.entity && payload.payment.entity.id) ||
    (payload.refund && payload.refund.entity && payload.refund.entity.payment_id) || '';
  if (!/^pay_[A-Za-z0-9]{8,30}$/.test(paymentId)) { res.status(200).json({ ok: true, ignored: true }); return; }

  try {
    const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');
    const r = await fetch('https://api.razorpay.com/v1/payments/' + paymentId, { headers: { Authorization: 'Basic ' + auth } });
    if (!r.ok) { res.status(200).json({ ok: true, ignored: true }); return; }
    const payment = await r.json();
    if (!payment.order_id) { res.status(200).json({ ok: true, ignored: true }); return; }

    const db = admin.firestore();
    const orderRef = db.collection('orders').doc(payment.order_id);
    const refunded = payment.status === 'refunded' || (payment.amount_refunded || 0) >= payment.amount;

    await db.runTransaction(async (tx) => {
      const orderDoc = await tx.get(orderRef);
      if (!orderDoc.exists) return;
      const order = orderDoc.data();
      const userRef = db.collection('users').doc(order.uid);
      const userDoc = await tx.get(userRef);
      const user = userDoc.exists ? userDoc.data() : {};

      if (refunded) {
        tx.update(orderRef, { refunded: true, refundedAt: Date.now() });
        // Only revoke what this payment granted; a later payment or promo stays.
        if (user.entitled && (user.lastPaymentId === paymentId || !user.lastPaymentId) && user.entitledVia !== 'promo') {
          tx.set(userRef, { entitled: false, revokedAt: Date.now(), revokedReason: 'refund', revokedPaymentId: paymentId }, { merge: true });
        }
        return;
      }
      if (payment.status === 'captured' && payment.amount === order.amount && !order.consumed) {
        tx.update(orderRef, { consumed: true, consumedAt: Date.now(), consumedBy: 'webhook' });
        tx.set(userRef, {
          entitled: true,
          entitledAt: Date.now(),
          entitledUntil: extendEntitlement(user.entitledUntil, order.plan),
          plan: order.plan,
          lastPaymentId: paymentId
        }, { merge: true });
      }
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    // 500 makes Razorpay retry later.
    res.status(500).json({ ok: false });
  }
};
