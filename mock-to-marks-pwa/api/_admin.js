const admin = require('./_firebaseAdmin');

const REPO_OWNER = 'anuagupta';
const REPO_NAME = 'm2m';
const REPO_BRANCH = 'master';
// Repo-relative paths of every question source Arena's report button can
// point at - checked in this order (real PYQs are reported far more often
// than practice/sample ones).
const QBANK_FILES = [
  'mock-to-marks-pwa/arena/pyq.js',
  'mock-to-marks-pwa/arena/questions.js',
  'mock-to-marks-pwa/arena/practice.js'
];
// Fields an admin edit may change. id/exam/type/source are left alone: id
// and exam are referenced elsewhere (stats keys, the mistake vault), and
// type controls which UI (mcq vs numeric) the question renders with.
const EDITABLE_FIELDS = ['q', 'options', 'answer', 'hint', 'solution', 'subject', 'chapter', 'difficulty', 'img', 'imgAlt'];

// Verifies the caller's Firebase ID token AND that their (verified) email is
// on the admin allowlist (ADMIN_EMAILS env var, comma-separated). Returns
// {uid, email} or null - null covers "not signed in" and "signed in but not
// an admin" alike, since callers only need to know whether to proceed.
async function verifyAdmin(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  let decoded;
  try { decoded = await admin.auth().verifyIdToken(token); } catch (e) { return null; }
  const allow = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  const email = String(decoded.email || '').toLowerCase();
  if (!email || !decoded.email_verified || allow.indexOf(email) < 0) return null;
  return { uid: decoded.uid, email };
}

function ghHeaders() {
  return {
    Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'prodjee-admin'
  };
}

async function getFile(path) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${REPO_BRANCH}`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`GitHub read failed for ${path}: ${r.status}`);
  const data = await r.json();
  return { sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf8') };
}

async function putFile(path, content, sha, message) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const r = await fetch(url, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, ghHeaders()),
    body: JSON.stringify({ message, content: Buffer.from(content, 'utf8').toString('base64'), sha, branch: REPO_BRANCH })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data && data.message) || `GitHub write failed: ${r.status}`);
  return data;
}

// Every question in every QBANK file sits on exactly one line, formatted
// `  {"id": ...},` (verified against all three files - no question's text
// contains a literal newline, they're all JSON-escaped `\n`). That makes a
// precise single-line find/replace safe: it can never touch a neighbouring
// question, however long or LaTeX-heavy the edited one's fields are.
function findLine(content, id) {
  const lines = content.split('\n');
  // Spacing-agnostic: an edited line is re-serialized with JSON.stringify,
  // which drops the space after "id": that the untouched lines still have,
  // so a plain `"id": "..."` substring match would stop finding it on the
  // next edit.
  const needle = new RegExp('"id"\\s*:\\s*"' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"');
  const idx = lines.findIndex((l) => needle.test(l));
  if (idx < 0) return null;
  const m = lines[idx].match(/^(\s*)(\{.*\})(,?)\s*$/);
  if (!m) return null;
  let obj;
  try { obj = JSON.parse(m[2]); } catch (e) { return null; }
  return { lines, idx, obj, indent: m[1], commaSuffix: m[3] };
}

module.exports = { REPO_OWNER, REPO_NAME, REPO_BRANCH, QBANK_FILES, EDITABLE_FIELDS, verifyAdmin, getFile, putFile, findLine };
