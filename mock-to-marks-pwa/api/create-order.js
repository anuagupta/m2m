const admin = require('./_firebaseAdmin');
const verifyAuth = require('./_verifyAuth');

const PLAN_PRICE_PAISE = 49900; // ₹499, one-time, lifetime unlock

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method not allowed' }); return; }

  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) { res.status(500).json({ ok: false, error: 'payments not configured yet' }); return; }

  try {
    const auth = Buffer.from(keyId + ':' + keySecret).toString('base64');
    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + auth },
      body: JSON.stringify({
        amount: PLAN_PRICE_PAISE,
        currency: 'INR',
        receipt: uid.slice(0, 30) + '-' + Date.now(),
        notes: { uid: uid }
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
    // by a friend) could redeem it for their own account too.
    await admin.firestore().collection('orders').doc(order.id).set({
      uid: uid,
      amount: PLAN_PRICE_PAISE,
      createdAt: Date.now(),
      consumed: false
    });
    res.status(200).json({ ok: true, orderId: order.id, amount: order.amount });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'could not create order' });
  }
};
