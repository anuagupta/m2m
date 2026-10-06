const verifyAuth = require('./_verifyAuth');
const cors = require('./_cors');
const admin = require('./_firebaseAdmin');

// Sends a question report straight to the admin inbox via Resend's HTTP API,
// so it lands in prodjeelabs@gmail.com without depending on the student's
// device having a mail app configured (the old mailto: link this replaces).
module.exports = async (req, res) => {
  if (!cors(req, res)) return;

  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }

  const body = req.body || {};
  if (body.kind === 'review') {
    // Student reviews share this endpoint (the project is at its function limit).
    try {
      const reviews = require('./_reviews');
      const out = body.action === 'mine' ? await reviews.mine(uid) : await reviews.submit(uid, body);
      res.status(out.code || 200).json(out);
    } catch (e) { res.status(502).json({ ok: false, error: 'could not save review' }); }
    return;
  }
  const questionId = String(body.questionId || '').slice(0, 100);
  const reason = String(body.reason || '').slice(0, 60);
  if (!questionId || !reason) { res.status(400).json({ ok: false, error: 'missing question or reason' }); return; }
  const exam = String(body.exam || '').slice(0, 20);
  const subject = String(body.subject || '').slice(0, 60);
  const chapter = String(body.chapter || '').slice(0, 80);
  const questionText = String(body.questionText || '').slice(0, 2000);
  const comment = String(body.comment || '').trim().slice(0, 1000);
  let studentEmail = '';
  try { studentEmail = String((await admin.auth().getUser(uid)).email || '').slice(0, 200); } catch (e) { /* uid remains authoritative */ }

  // Persist first: an email provider outage must never lose a student's
  // report. The admin queue is the source of truth; email is notification.
  let reportRef;
  try {
    reportRef = await admin.firestore().collection('questionReports').add({
      questionId, exam, subject, chapter, reason, comment, questionText,
      reporterUid: uid, reporterEmail: studentEmail || null,
      status: 'open', createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'could not save report' }); return;
  }

  const apiKey = process.env.RESEND_API_KEY;

  const lines = [
    `Report ID: ${reportRef.id}`,
    `Question ID: ${questionId}`,
    `Exam: ${exam} | Subject: ${subject} | Chapter: ${chapter}`,
    `Issue: ${reason}`,
    `Reported by: ${studentEmail || uid}`,
    '',
    'Question text:',
    questionText || '(not captured)'
  ];
  if (comment) lines.push('', 'Student comment:', comment);

  let notified = false;
  try {
    if (!apiKey) throw new Error('email not configured');
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        from: process.env.REPORT_FROM_EMAIL || 'ProDJEE Arena <onboarding@resend.dev>',
        to: ['prodjeelabs@gmail.com'],
        subject: `Arena report: ${reason} — ${questionId}`,
        text: lines.concat(['', `Open correction queue: https://prodjee.in/admin/?report=${reportRef.id}&question=${encodeURIComponent(questionId)}`]).join('\n')
      })
    });
    notified = r.ok;
  } catch (e) { /* report remains safely queued */ }
  await reportRef.update({ emailNotified: notified }).catch(() => {});
  res.status(200).json({ ok: true, reportId: reportRef.id, notified });
};
