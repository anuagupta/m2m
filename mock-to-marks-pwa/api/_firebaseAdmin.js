// Shared Firebase Admin instance for serverless functions. This holds the
// one credential in the whole system that can write entitlement status -
// the client SDK's Firestore rules deny writes to /users/{uid} entirely,
// so "paid" can only ever be set from here, after a verified payment.
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    })
  });
}

module.exports = admin;
