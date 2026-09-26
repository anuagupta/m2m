const admin = require('./_firebaseAdmin');
const verifyAuth = require('./_verifyAuth');
const cors = require('./_cors');
const { cleanQuestions, buildPlanBlocks, checkpointBlocks } = require('./_plan');

// Builds the paid 14-day plan (or its day-7 rebuild) for entitled accounts only.
module.exports = async (req, res) => {
  if (!cors(req, res)) return;

  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }

  const doc = await admin.firestore().collection('users').doc(uid).get();
  if (!doc.exists || doc.data().entitled !== true) {
    res.status(402).json({ ok: false, error: 'not_entitled' });
    return;
  }

  const body = req.body || {};
  const questions = cleanQuestions(body.questions, 200);
  if (!questions) { res.status(400).json({ ok: false, error: 'Mock data looks incomplete. Fill every question and try again.' }); return; }

  if (body.mode === 'checkpoint') {
    const cp = cleanQuestions(body.checkpoint, 40);
    if (!cp) { res.status(400).json({ ok: false, error: 'Checkpoint looks incomplete.' }); return; }
    res.status(200).json({ ok: true, blocks: checkpointBlocks(questions, cp) });
    return;
  }
  res.status(200).json({ ok: true, blocks: buildPlanBlocks(questions) });
};
