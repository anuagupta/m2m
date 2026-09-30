const cors = require('./_cors');
const { verifyAdmin, QBANK_FILES, EDITABLE_FIELDS, getFile, putFile, findLine } = require('./_admin');

module.exports = async (req, res) => {
  if (!cors(req, res)) return;

  const who = await verifyAdmin(req);
  if (!who) { res.status(403).json({ ok: false, error: 'admin sign-in required' }); return; }

  const body = req.body || {};
  const id = String(body.id || '').trim();
  const file = String(body.file || '');
  const edits = body.question;
  if (!id || QBANK_FILES.indexOf(file) < 0 || !edits || typeof edits !== 'object') {
    res.status(400).json({ ok: false, error: 'bad request' }); return;
  }

  let content, sha;
  try { ({ content, sha } = await getFile(file)); } catch (e) { res.status(502).json({ ok: false, error: 'could not read the source file' }); return; }
  const found = findLine(content, id);
  if (!found) { res.status(404).json({ ok: false, error: 'question not found' }); return; }

  const updated = Object.assign({}, found.obj);
  EDITABLE_FIELDS.forEach((key) => { if (Object.prototype.hasOwnProperty.call(edits, key)) updated[key] = edits[key]; });

  if (!updated.q || typeof updated.q !== 'string' || !updated.q.trim()) { res.status(400).json({ ok: false, error: 'question text is required' }); return; }
  if (!Number.isInteger(updated.difficulty) || updated.difficulty < 0 || updated.difficulty > 10) {
    res.status(400).json({ ok: false, error: 'difficulty must be an integer from 0 to 10' }); return;
  }
  if (updated.type === 'mcq') {
    if (!Array.isArray(updated.options) || updated.options.length < 2 || updated.options.some((o) => typeof o !== 'string' || !o.trim())) {
      res.status(400).json({ ok: false, error: 'mcq needs at least 2 non-empty options' }); return;
    }
    if (!Number.isInteger(updated.answer) || updated.answer < 0 || updated.answer >= updated.options.length) {
      res.status(400).json({ ok: false, error: 'answer must be a valid option index' }); return;
    }
  } else if (typeof updated.answer !== 'number' || Number.isNaN(updated.answer)) {
    res.status(400).json({ ok: false, error: 'answer must be a number' }); return;
  }

  found.lines[found.idx] = found.indent + JSON.stringify(updated) + found.commaSuffix;
  const newContent = found.lines.join('\n');

  try {
    const commit = await putFile(file, newContent, sha, `Admin edit: ${id}`);
    res.status(200).json({ ok: true, commitUrl: (commit.commit && commit.commit.html_url) || null });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message || 'commit failed' });
  }
};
