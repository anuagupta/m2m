// Only our own pages may call the API from a browser. Server-to-server
// callers (Razorpay webhooks) don't send an Origin and aren't affected.
const ALLOWED = [
  'https://prodjee.in',
  'https://www.prodjee.in',
  'https://m2m-two.vercel.app'
];
const PREVIEW = /^https:\/\/m2m-[a-z0-9-]+-anuagupta\.vercel\.app$/;

// Sets CORS headers and answers preflight/method checks. Returns true when
// the handler should continue.
module.exports = function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED.includes(origin) || PREVIEW.test(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.status(204).end(); return false; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method not allowed' }); return false; }
  return true;
};
