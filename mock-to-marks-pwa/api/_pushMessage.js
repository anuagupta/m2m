// Decides what (if anything) a student gets in tonight's single daily push.
// Pure function so it can be unit-tested (scripts/validate-push.js).
const IST_MS = 5.5 * 3600 * 1000;
const dayIST = (ms) => new Date(ms + IST_MS).toISOString().slice(0, 10);
const enc = encodeURIComponent;

// Priority: mistakes due > streak still alive > weakest chapter.
// Students who already studied today (IST) get nothing.
function pickMessage(s, now) {
  if (!s) return null;
  if (s.lastActiveAt && dayIST(s.lastActiveAt) === dayIST(now)) return null;
  const exam = s.exam === 'NEET' ? 'NEET' : 'JEE';
  const utm = (c) => `utm_source=push&utm_medium=notification&utm_campaign=${c}`;
  const n = Number(s.vaultDue) || 0;
  if (n > 0) {
    return {
      type: 'vault',
      title: 'Mistakes to revise',
      body: `${n} question${n === 1 ? '' : 's'} you got wrong ${n === 1 ? 'is' : 'are'} due for revision today.`,
      url: `/arena/?mode=vault&exam=${exam}&${utm('vault')}`
    };
  }
  const yesterday = dayIST(now - 864e5);
  const streakAlive = s.lastActiveAt && dayIST(s.lastActiveAt) === yesterday;
  const streak = Number(s.streak) || 0;
  if (streak >= 2 && streakAlive) {
    return {
      type: 'streak',
      title: `${streak}-day streak`,
      body: 'Answer 5 questions today to keep it going.',
      url: `/arena/?mission=1&exam=${exam}&${utm('streak')}`
    };
  }
  if (s.weakChapter && s.weakSubject) {
    return {
      type: 'weak',
      title: 'Your weakest chapter',
      body: `${s.weakChapter} has your lowest accuracy. Try a 10-question drill.`,
      url: `/arena/?mode=chapter&exam=${exam}&subject=${enc(s.weakSubject)}&chapters=${enc(s.weakChapter)}&${utm('weak')}`
    };
  }
  return null;
}

// Keep only the few fields we promised to store, with hard limits.
function cleanSummary(x) {
  x = x || {};
  const int = (v, max) => Math.max(0, Math.min(max, Math.floor(Number(v) || 0)));
  const str = (v, max) => String(v == null ? '' : v).slice(0, max);
  return {
    exam: x.exam === 'NEET' ? 'NEET' : 'JEE',
    vaultDue: int(x.vaultDue, 999),
    streak: int(x.streak, 9999),
    weakChapter: str(x.weakChapter, 80),
    weakSubject: str(x.weakSubject, 30),
    lastActiveAt: int(x.lastActiveAt, 4e12)
  };
}

module.exports = { pickMessage, cleanSummary, dayIST };
