// The paid part of Mock-to-Marks: turns a diagnosed mock into the 14-day plan.
// This lives only on the server so the plan can't be built in the browser
// without an entitlement (the free tier gets the diagnosis, not the plan).
const CATEGORY_IDS = ['language', 'situation', 'approach', 'formula', 'silly', 'time'];
const RESULT_IDS = ['correct', 'wrong', 'left', 'slow', 'guessed'];

const WEIGHTS = {
  wrong: { primary: 1.0, secondary: 0.4 },
  left: { primary: 1.2, secondary: 0.5 },
  slow: { primary: 0.6, secondary: 0.25 },
  guessed: { primary: 0.7, secondary: 0.3 }
};

// Accepts only the fields the builder reads, so nothing else from the
// client is echoed back. Returns null when the payload is unusable.
function cleanQuestions(list, max) {
  if (!Array.isArray(list) || list.length === 0 || list.length > max) return null;
  const out = [];
  for (const q of list) {
    if (!q || typeof q !== 'object') return null;
    const result = RESULT_IDS.includes(q.result) ? q.result : null;
    if (!result) return null;
    const cat = (v) => (CATEGORY_IDS.includes(v) ? v : null);
    const chapter = typeof q.chapter === 'string' ? q.chapter.trim().slice(0, 80) : '';
    out.push({ result, primary: cat(q.primary), secondary: cat(q.secondary), chapter });
  }
  return out;
}

// Arena's own per-chapter accuracy (Arena tracks this locally on the
// student's device; the client sends a sanitized snapshot alongside the
// mock so the plan can draw on chapters the mock itself didn't happen to
// test). Shape: { [chapter]: { att, cor } }. Anything malformed is dropped
// rather than rejecting the whole plan request.
function cleanArenaStats(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const out = {};
  let n = 0;
  for (const chapter of Object.keys(obj)) {
    if (n >= 300) break; // generous cap; the whole JEE+NEET syllabus is ~150 chapters
    const v = obj[chapter];
    if (!v || typeof v !== 'object') continue;
    const att = Number(v.att), cor = Number(v.cor);
    if (!Number.isFinite(att) || !Number.isFinite(cor) || att <= 0 || cor < 0 || cor > att) continue;
    out[String(chapter).slice(0, 80)] = { att, cor };
    n++;
  }
  return out;
}

// A chapter counts weak if either signal says so - the mock's own wrong
// answers, or (with enough Arena attempts to trust it) low Arena accuracy -
// so a real gap isn't missed just because this particular mock didn't
// happen to touch that chapter. A chapter the mock got fully right, or
// that Arena shows solid accuracy on, counts strong; Burst Mode draws only
// from that pool, never from a weak one.
const ARENA_MIN_ATTEMPTS = 3;
const ARENA_WEAK_ACC = 0.5;
const ARENA_STRONG_ACC = 0.75;
function classifyChapters(questions, arenaStats) {
  const weak = new Set(), strong = new Set(), mentioned = new Set();
  questions.forEach((q) => {
    if (!q.chapter) return;
    mentioned.add(q.chapter);
    if (q.result !== 'correct') weak.add(q.chapter);
  });
  Object.keys(arenaStats || {}).forEach((chapter) => {
    const { att, cor } = arenaStats[chapter];
    if (att < ARENA_MIN_ATTEMPTS) return;
    const acc = cor / att;
    if (acc < ARENA_WEAK_ACC) weak.add(chapter);
    else if (acc >= ARENA_STRONG_ACC) strong.add(chapter);
  });
  mentioned.forEach((chapter) => { if (!weak.has(chapter)) strong.add(chapter); });
  weak.forEach((chapter) => strong.delete(chapter)); // a mock miss overrules a dated Arena streak
  return { weak, strong };
}

function computeScores(questions) {
  const scores = {};
  CATEGORY_IDS.forEach((id) => { scores[id] = 0; });
  questions.forEach((q) => {
    if (q.result === 'correct') return;
    const w = WEIGHTS[q.result]; if (!w) return;
    if (q.primary) scores[q.primary] += w.primary;
    if (q.secondary) scores[q.secondary] += w.secondary;
  });
  return CATEGORY_IDS.map((id) => ({ id, score: Math.round(scores[id] * 100) / 100 }));
}

function finalizeAllocation(active, raw, base, remaining) {
  const floors = raw.map(Math.floor);
  const used = floors.reduce((a, b) => a + b, 0);
  const leftover = remaining - used;
  const order = raw.map((r, i) => ({ i, rem: r - floors[i] })).sort((a, b) => b.rem - a.rem);
  for (let k = 0; k < leftover; k++) floors[order[k % order.length].i] += 1;
  return active.map((c, i) => Object.assign({}, c, { blocks: base + floors[i] }));
}

function allocateBlocks(catScores, totalBlocks, basePerCat) {
  const active = catScores.filter((c) => c.score > 0);
  if (active.length === 0) return [];
  let base = basePerCat;
  let remaining = totalBlocks - active.length * basePerCat;
  if (remaining < 0) { base = 1; remaining = totalBlocks - active.length; }
  const totalScore = active.reduce((s, c) => s + c.score, 0);
  const raw = active.map((c) => (totalScore > 0 ? remaining * c.score / totalScore : remaining / active.length));
  return finalizeAllocation(active, raw, base, remaining);
}

function scheduleBlocks(allocation, days, slotsPerDay) {
  const pool = [];
  allocation.forEach((a) => { for (let i = 0; i < a.blocks; i++) pool.push(a.id); });
  const totalSlots = days * slotsPerDay;
  while (pool.length < totalSlots) pool.push('mixed');
  const counts = {};
  pool.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
  const schedule = [];
  let prev = null;
  for (let s = 0; s < totalSlots; s++) {
    const candidates = Object.keys(counts).filter((id) => counts[id] > 0);
    candidates.sort((a, b) => counts[b] - counts[a]);
    let choice = candidates.filter((id) => id !== prev)[0];
    if (choice === undefined) choice = candidates[0];
    counts[choice]--; schedule.push(choice); prev = choice;
  }
  return schedule;
}

// The mock's own tagging (chapter + why it went wrong) is the only signal
// that reliably ties a chapter to a mistake REASON - Arena knows accuracy,
// not why. So a category's chapters still come from the mock first;
// Arena's weak list only fills in when the mock itself left that reason
// untagged with any chapter, so a block is never left pointing at nothing.
function chaptersForCategory(questions, catId, weak) {
  const own = questions
    .filter((q) => q.result !== 'correct' && (q.primary === catId || q.secondary === catId) && q.chapter)
    .map((q) => q.chapter);
  if (own.length) return own;
  return weak ? [...weak] : [];
}

function blockContent(catId, chapter, variant) {
  switch (catId) {
    case 'language': return { title: 'Textbook clarity session', time: 30,
      instr: 'Read the NCERT (or your primary textbook) section on ' + (chapter || 'the topic that tripped you up') + ' for at least 30 minutes. Focus only on definitions, stated conditions and exact wording — not problem-solving.',
      checks: ['Wrote 3 key statements or conditions in your own words', 'Underlined every technical term you were unsure of', 'Re-read the original mock question — does it make sense now?'] };
    // Situation trouble is really two separate gaps - not visualising the
    // physical setup, and not having practised turning that setup into
    // maths - so it alternates between a reading/visualising block and a
    // practice block instead of one drill trying to cover both.
    case 'situation': return variant === 'reading'
      ? { title: 'Situation visualisation session', time: 30,
          instr: 'Before solving anything, work through 6-8 unfamiliar situation-based questions' + (chapter ? (' from ' + chapter) : '') + ' for setup only: sketch the physical picture, label knowns/unknowns, and name the applicable principle. Include 2-3 comprehension-style questions (read a described setup and answer without heavy calculation) to build interpretation before speed.',
          checks: ['Sketched or described the situation before any calculation', 'Named the applicable principle for each, before solving', 'Attempted the comprehension-style questions untimed'] }
      : { title: 'Situation decoding drill', time: 35,
          instr: 'Solve 10 unfamiliar situation-based questions' + (chapter ? (' from ' + chapter) : '') + ' end to end. Before attempting each, write down: known information, unknown quantity, a quick diagram, and the applicable principle — in that order.',
          checks: ['Identified known vs unknown before solving', 'Sketched or visualised the situation first', 'Named the applicable principle before calculating anything'] };
    case 'approach': return { title: 'Approach-building drill', time: 35,
      instr: 'Attempt 10 unfamiliar questions' + (chapter ? (' from ' + chapter) : '') + '. Spend at least 15 minutes on each before looking at any hint or solution.',
      checks: ['Recorded your first attempted step', 'Recorded the actual first useful step, after checking', 'Noted the method that was ultimately needed'] };
    case 'formula': return { title: 'Formula recall & derivation', time: 30,
      instr: 'Revise the formula or law you missed' + (chapter ? (' in ' + chapter) : '') + '. Derive it from first principles where possible, then close your notes and test recall from memory alone.',
      checks: ['Built a formula card: formula, meaning, conditions, derivation cue', 'Recalled it once with notes fully closed', 'Reapplied it to the original mock question'] };
    case 'silly': return { title: 'Burst Mode', time: 30,
      instr: 'Solve 12 questions from ' + (chapter ? chapter : 'a chapter whose concepts you’re already confident in — not a weak one') + ' in one uninterrupted sitting, 30 minutes flat: no notes, no hints, no looking at the solution. Write every answer on paper as you go, then check all 12 against the answer key only after you’ve finished the set.',
      checks: [(chapter ? 'Solved all 12 from ' + chapter : 'Picked a chapter you’re genuinely confident in') + ', answers written on paper first', 'Checked every answer only after finishing all 12 — not mid-way', 'Noted how many you got right without losing focus'] };
    case 'time': return { title: 'Search-and-Destroy time drill', time: 40,
      instr: 'Run one timed set under exam conditions. First pass: classify every question A (fast), B (solvable, slower) or C (unclear). Solve all A questions first, then B in order of expected marks per minute. Leave C for last, and reserve the final 5–10 minutes only for checking.',
      checks: ['Classified every question before solving any of them', 'Solved A questions first, then B by marks-per-minute', 'Reserved at least 5 minutes purely for checking'] };
    default: return { title: 'Mixed spaced-revision block', time: 30,
      instr: 'No single category dominated here — use this block for a short mixed-topic revision set covering whatever feels least fresh in your notes.',
      checks: ['Reviewed at least two different chapters', 'Flagged anything that needs a longer look later'] };
  }
}

// Blocks carry day/slot/content only; the client adds ids, dates and
// completion state, since those belong to the student's device.
function blocksFor(schedule, firstDay, questions, chapterInfo) {
  const weak = (chapterInfo && chapterInfo.weak) || new Set();
  const strong = chapterInfo && chapterInfo.strong ? [...chapterInfo.strong] : [];
  const perCatIndex = {};
  return schedule.map((catId, i) => {
    perCatIndex[catId] = perCatIndex[catId] || 0;
    const idx = perCatIndex[catId];
    perCatIndex[catId]++;
    let chapter = null, variant;
    if (catId === 'silly') {
      // Burst Mode wants a chapter the student is already confident in, so
      // it's drawn only from the strong pool - a random pick each time, per
      // spec, rather than trying to spread across the whole plan.
      chapter = strong.length ? strong[Math.floor(Math.random() * strong.length)] : null;
    } else if (catId !== 'mixed') {
      const chapters = chaptersForCategory(questions, catId, weak);
      chapter = chapters.length ? chapters[idx % chapters.length] : null;
      if (catId === 'situation') variant = idx % 2 === 0 ? 'reading' : 'practice';
    }
    const c = blockContent(catId, chapter, variant);
    return { day: firstDay + Math.floor(i / 2), slot: i % 2, catId, title: c.title, timeMin: c.time, instr: c.instr, checks: c.checks, chapter };
  });
}

// Full plan: 2 blocks/day, days 2..(days-1). Day 1 is the mock itself and
// day `days` is reserved for the next mock, so a "14-day plan" practises
// on days 2..13 (12 days, 24 blocks - the original behaviour) and a
// "7-day plan" on days 2..6 (5 days, 10 blocks). The day-7 checkpoint
// only exists for the 14-day version - it never lands inside a 7-day
// plan's practice range, and a plan that short is anyway too tight for a
// mid-course reallocation to leave enough days to act on it.
function buildPlanBlocks(questions, days = 14, arenaStats) {
  const practiceDays = Math.max(1, days - 2);
  const schedule = scheduleBlocks(allocateBlocks(computeScores(questions), practiceDays * 2, 2), practiceDays, 2);
  return blocksFor(schedule, 2, questions, classifyChapters(questions, arenaStats));
}

// Day-7 checkpoint: rebuilds days 8..13 from the checkpoint results, still
// drawing chapter names (and Arena-informed strong/weak classification)
// from the original mock.
function checkpointBlocks(mockQuestions, checkpointQuestions, arenaStats) {
  const scores = computeScores(checkpointQuestions.map((q) => ({ result: q.result, primary: q.primary, secondary: null })));
  const schedule = scheduleBlocks(allocateBlocks(scores, 12, 1), 6, 2);
  return blocksFor(schedule, 8, mockQuestions, classifyChapters(mockQuestions, arenaStats));
}

module.exports = { cleanQuestions, cleanArenaStats, buildPlanBlocks, checkpointBlocks };
