const cors = require('./_cors');
const { verifyAdmin, QBANK_FILES, getFile, findLine } = require('./_admin');

module.exports = async (req, res) => {
  if (!cors(req, res)) return;

  const who = await verifyAdmin(req);
  if (!who) { res.status(403).json({ ok: false, error: 'admin sign-in required' }); return; }

  const id = String((req.body && req.body.id) || '').trim();
  if (!id) { res.status(400).json({ ok: false, error: 'missing id' }); return; }

  for (const file of QBANK_FILES) {
    let content;
    try { ({ content } = await getFile(file)); } catch (e) { continue; }
    const found = findLine(content, id);
    if (found) { res.status(200).json({ ok: true, file, question: found.obj }); return; }
  }
  res.status(404).json({ ok: false, error: 'question not found in any question bank' });
};
