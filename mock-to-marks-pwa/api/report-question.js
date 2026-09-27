const verifyAuth = require('./_verifyAuth');
const cors = require('./_cors');

// Sends a question report straight to the admin inbox via Resend's HTTP API,
// so it lands in prodjeelabs@gmail.com without depending on the student's
// device having a mail app configured (the old mailto: link this replaces).
module.exports = async (req, res) => {
  if (!cors(req, res)) return;

  const uid = await verifyAuth(req);
  if (!uid) { res.status(401).json({ ok: false, error: 'sign in required' }); return; }

  const body = req.body || {};
  const questionId = String(body.questionId || '').slice(0, 100);
  const reason = String(body.reason || '').slice(0, 60);
  if (!questionId || !reason) { res.status(400).json({ ok: false, error: 'missing question or reason' }); return; }
  const exam = String(body.exam || '').slice(0, 20);
  const subject = String(body.subject || '').slice(0, 60);
  const chapter = String(body.chapter || '').slice(0, 80);
  const questionText = String(body.questionText || '').slice(0, 2000);
  const comment = String(body.comment || '').trim().slice(0, 1000);
  const studentEmail = String(body.studentEmail || '').slice(0, 200);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { res.status(500).json({ ok: false, error: 'reporting is not configured' }); return; }

  const lines = [
    `Question ID: ${questionId}`,
    `Exam: ${exam} | Subject: ${subject} | Chapter: ${chapter}`,
    `Issue: ${reason}`,
    `Reported by: ${studentEmail || uid}`,
    '',
    'Question text:',
    questionText || '(not captured)'
  ];
  if (comment) lines.push('', 'Student comment:', comment);

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        from: process.env.REPORT_FROM_EMAIL || 'ProDJEE Arena <onboarding@resend.dev>',
        to: ['prodjeelabs@gmail.com'],
        subject: `Arena report: ${reason} — ${questionId}`,
        text: lines.join('\n')
      })
    });
    if (!r.ok) { res.status(502).json({ ok: false, error: 'send failed' }); return; }
  } catch (e) {
    res.status(502).json({ ok: false, error: 'send failed' });
    return;
  }
  res.status(200).json({ ok: true });
};
