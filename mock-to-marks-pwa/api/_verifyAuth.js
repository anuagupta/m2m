const admin = require('./_firebaseAdmin');

// Returns the caller's Firebase uid if the Authorization header carries a
// valid ID token, or null otherwise. Every payment endpoint needs this -
// without it, anyone could claim to be any user.
module.exports = async function verifyAuth(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid;
  } catch (e) {
    return null;
  }
};
