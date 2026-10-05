// Web push for the daily nudge. One function on purpose (the free Vercel plan
// caps how many functions a project may have).
//   POST {action:'subscribe'|'sync'|'unsubscribe'}  - signed-in student
//   GET  (Vercel cron, Authorization: Bearer CRON_SECRET) - the daily send
// Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
const admin = require('./_firebaseAdmin');
const verifyAuth = require('./_verifyAuth');
const cors = require('./_cors');
const { pickMessage, cleanSummary, dayIST } = require('./_pushMessage');

const COLLECTION = 'pushSubs';
const SILENT_DAYS = 30;     // drop subscriptions that never reopen the app
const MAX_UNENGAGED = 2;    // stop after this many pushes in a row with no app visit

function validSubscription(s) {
  return !!(s && typeof s.endpoint === 'string' && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 600 &&
    s.keys && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string');
}

async function runDailySend() {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return { ok: false, reason: 'push not configured' };
  const webpush = require('web-push');
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@prodjee.in', pub, priv);
  const db = admin.firestore();
  const now = Date.now();
  const snap = await db.collection(COLLECTION).limit(1000).get();
  const stats = { checked: snap.size, sent: 0, skipped: 0, removed: 0, failed: 0 };
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += 20) {
    await Promise.all(docs.slice(i, i + 20).map(async (doc) => {
      const d = doc.data();
      if (now - (d.lastSeenAt || 0) > SILENT_DAYS * 864e5) { await doc.ref.delete(); stats.removed++; return; }
      if ((d.unengaged || 0) >= MAX_UNENGAGED) { stats.skipped++; return; }
      if (d.lastSentAt && dayIST(d.lastSentAt) === dayIST(now)) { stats.skipped++; return; }
      const msg = pickMessage(d, now);
      if (!msg) { stats.skipped++; return; }
      try {
        await webpush.sendNotification(d.subscription, JSON.stringify({ title: msg.title, body: msg.body, url: msg.url, tag: 'prodjee-daily' }), { TTL: 6 * 3600 });
        await doc.ref.update({ lastSentAt: now, unengaged: (d.unengaged || 0) + 1, lastType: msg.type });
        stats.sent++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) { await doc.ref.delete(); stats.removed++; }
        else stats.failed++;
      }
    }));
  }
  return Object.assign({ ok: true }, stats);
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const secret = process.env.CRON_SECRET;
    if (!secret || (req.headers.authorization || '') !== 'Bearer ' + secret) { res.status(401).json({ ok: false }); return; }
    try { res.status(200).json(await runDailySend()); } catch (e) { res.status(500).json({ ok: false, error: 'send failed' }); }
    return;
  }
  if (!cors(req, res)) return;
  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }
  const body = req.body || {};
  const ref = admin.firestore().collection(COLLECTION).doc(uid);
  const now = Date.now();
  try {
    if (body.action === 'subscribe') {
      if (!validSubscription(body.subscription)) { res.status(400).json({ ok: false, error: 'bad subscription' }); return; }
      await ref.set(Object.assign({ subscription: body.subscription, lastSeenAt: now, unengaged: 0, createdAt: now }, cleanSummary(body.summary)), { merge: true });
      res.status(200).json({ ok: true });
    } else if (body.action === 'sync') {
      const doc = await ref.get();
      if (!doc.exists) { res.status(200).json({ ok: true, subscribed: false }); return; }
      // Opening the app counts as engagement, so the back-off counter resets.
      await ref.update(Object.assign({ lastSeenAt: now, unengaged: 0 }, cleanSummary(body.summary)));
      res.status(200).json({ ok: true, subscribed: true });
    } else if (body.action === 'unsubscribe') {
      await ref.delete();
      res.status(200).json({ ok: true });
    } else {
      res.status(400).json({ ok: false, error: 'unknown action' });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: 'server error' });
  }
};
