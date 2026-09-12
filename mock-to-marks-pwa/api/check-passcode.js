// Vercel serverless function: verifies a passcode against a server-only
// secret (GATE_PASSCODE, set in the Vercel dashboard, never shipped to the
// client) and, on success, issues a signed access token the client can hold
// onto. The signing key (GATE_PASSCODE itself) never leaves this function,
// so a client cannot forge a token - it can only obtain one by submitting
// the correct passcode here.
//
// ponytail: this proves *possession of the passcode*, not identity, and the
// app's own scoring/plan logic still runs client-side - a determined user
// could call that logic directly from devtools without ever hitting this
// gate. Real protection against that requires moving the computation itself
// server-side, which needs real auth (see the app's Profile page roadmap).
// This is a casual-sharing deterrent, not cryptographic access control.
const crypto = require('crypto');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function sign(expiresAt, secret) {
  return crypto.createHmac('sha256', secret).update(String(expiresAt)).digest('hex');
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method not allowed' }); return; }

  const secret = process.env.GATE_PASSCODE;
  if (!secret) { res.status(500).json({ ok: false, error: 'gate not configured' }); return; }

  const submitted = (req.body && req.body.passcode) || '';
  const a = Buffer.from(String(submitted));
  const b = Buffer.from(String(secret));
  const match = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!match) { res.status(401).json({ ok: false, error: 'wrong passcode' }); return; }

  const expiresAt = Date.now() + THIRTY_DAYS_MS;
  const token = expiresAt + '.' + sign(expiresAt, secret);
  res.status(200).json({ ok: true, token: token, expiresAt: expiresAt });
};
