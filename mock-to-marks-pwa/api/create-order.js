const admin = require('./_firebaseAdmin');
const verifyAuth = require('./_verifyAuth');
const cors = require('./_cors');
const { PLAN_PRICE_PAISE } = require('./_subscription');

module.exports = async (req, res) => {
  if (!cors(req, res)) return;

  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }

  const body = req.body || {};
  const plan = body.plan === 'yearly' ? 'yearly' : body.plan === 'monthly' ? 'monthly' : null;
  if (!plan) { res.status(400).json({ ok: false, error: 'choose a plan' }); return; }
  const amount = PLAN_PRICE_PAISE[plan];

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) { res.status(500).json({ ok: false, error: 'payments not configured yet' }); return; }

  try {
    const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth },
      body: JSON.stringify({
        amount: amount,
        currency: 'INR',
        receipt: uid.slice(0, 30) + '-' + Date.now(),
        notes: { uid: uid, plan: plan }
      })
    });
    const order = await orderRes.json();
    if (!orderRes.ok) {
      res.status(502).json({ ok: false, error: (order.error && order.error.description) || 'razorpay order failed' });
      return;
    }
    // Record who this order was created for, so verify-payment can confirm
    // the person redeeming it is the same person who paid - otherwise anyone
    // handed a completed payment's orderId/paymentId/signature (e.g. shared
    // by a friend) could redeem it for their own account too. The plan is
    // recorded here too, server-side, so a client can't request a monthly
    // order but claim a yearly entitlement at verify time.
    await admin.firestore().collection('orders').doc(order.id).set({
      uid: uid,
      plan: plan,
      amount: amount,
      createdAt: Date.now(),
      consumed: false
    });
    res.status(200).json({ ok: true, orderId: order.id, amount: order.amount });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'could not create order' });
  }
};
