const cors = require('./_cors');
const admin = require('./_firebaseAdmin');
const { verifyAdmin } = require('./_admin');

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  const who = await verifyAdmin(req);
  if (!who) return res.status(403).json({ ok: false, error: 'admin sign-in required' });
  const id = String((req.body || {}).reportId || '').trim();
  const status = String((req.body || {}).status || 'resolved');
  if (!id || !['resolved', 'dismissed', 'open'].includes(status)) return res.status(400).json({ ok: false, error: 'bad report update' });
  try {
    await admin.firestore().collection('questionReports').doc(id).update({
      status, resolution: String((req.body || {}).resolution || '').trim().slice(0, 500),
      resolvedBy: who.email, resolvedAt: status === 'open' ? null : admin.firestore.FieldValue.serverTimestamp()
    });
    res.status(200).json({ ok: true });
  } catch (e) { res.status(502).json({ ok: false, error: 'could not update report' }); }
};
