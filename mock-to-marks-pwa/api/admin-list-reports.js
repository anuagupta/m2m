const cors = require('./_cors');
const admin = require('./_firebaseAdmin');
const { verifyAdmin } = require('./_admin');

module.exports = async (req, res) => {
  if (!cors(req, res)) return;
  const who = await verifyAdmin(req);
  if (!who) return res.status(403).json({ ok: false, error: 'admin sign-in required' });
  if ((req.body || {}).kind === 'reviews') {
    try { return res.status(200).json(await require('./_reviews').adminList()); }
    catch (e) { return res.status(502).json({ ok: false, error: 'could not load reviews' }); }
  }
  try {
    const snap = await admin.firestore().collection('questionReports').orderBy('createdAt', 'desc').limit(100).get();
    const reports = snap.docs.map((doc) => {
      const d = doc.data();
      return Object.assign({ id: doc.id }, d, {
        createdAt: d.createdAt && d.createdAt.toDate ? d.createdAt.toDate().toISOString() : null,
        resolvedAt: d.resolvedAt && d.resolvedAt.toDate ? d.resolvedAt.toDate().toISOString() : null
      });
    });
    res.status(200).json({ ok: true, reports });
  } catch (e) { res.status(502).json({ ok: false, error: 'could not load report queue' }); }
};
