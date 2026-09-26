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

function chaptersForCategory(questions, catId) {
  return questions
    .filter((q) => q.result !== 'correct' && (q.primary === catId || q.secondary === catId) && q.chapter)
    .map((q) => q.chapter);
}

function blockContent(catId, chapter) {
  switch (catId) {
    case 'language': return { title: 'Textbook clarity session', time: 30,
      instr: 'Read the NCERT (or your primary textbook) section on ' + (chapter || 'the topic that tripped you up') + ' for at least 30 minutes. Focus only on definitions, stated conditions and exact wording — not problem-solving.',
      checks: ['Wrote 3 key statements or conditions in your own words', 'Underlined every technical term you were unsure of', 'Re-read the original mock question — does it make sense now?'] };
    case 'situation': return { title: 'Situation decoding drill', time: 35,
      instr: 'Solve 10 unfamiliar situation-based questions' + (chapter ? (' from ' + chapter) : '') + '. Before attempting each, write down: known information, unknown quantity, a quick diagram, and the applicable principle — in that order.',
      checks: ['Identified known vs unknown before solving', 'Sketched or visualised the situation first', 'Named the applicable principle before calculating anything'] };
    case 'approach': return { title: 'Approach-building drill', time: 35,
      instr: 'Attempt 10 unfamiliar questions' + (chapter ? (' from ' + chapter) : '') + '. Spend at least 15 minutes on each before looking at any hint or solution.',
      checks: ['Recorded your first attempted step', 'Recorded the actual first useful step, after checking', 'Noted the method that was ultimately needed'] };
    case 'formula': return { title: 'Formula recall & derivation', time: 30,
      instr: 'Revise the formula or law you missed' + (chapter ? (' in ' + chapter) : '') + '. Derive it from first principles where possible, then close your notes and test recall from memory alone.',
      checks: ['Built a formula card: formula, meaning, conditions, derivation cue', 'Recalled it once with notes fully closed', 'Reapplied it to the original mock question'] };
    case 'silly': return { title: 'Burst Mode', time: 30,
      instr: 'Pick a chapter whose concepts you’re already confident in — not a weak one. Solve 12 questions from it in one uninterrupted sitting, 30 minutes flat: no notes, no hints, no looking at the solution. Write every answer on paper as you go, then check all 12 against the answer key only after you’ve finished the set.',
      checks: ['Picked a chapter you’re genuinely confident in', 'Solved all 12 in one sitting, answers written on paper first', 'Checked every answer only after finishing all 12 — not mid-way', 'Noted how many you got right without losing focus'] };
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
function blocksFor(schedule, firstDay, questions) {
  const perCatIndex = {};
  return schedule.map((catId, i) => {
    perCatIndex[catId] = perCatIndex[catId] || 0;
    // Burst Mode (silly/calculation) deliberately wants a chapter the student is
    // already confident in, so it's never auto-assigned one of the weak chapters.
    const chapters = (catId === 'mixed' || catId === 'silly') ? [] : chaptersForCategory(questions, catId);
    const chapter = chapters.length ? chapters[perCatIndex[catId] % chapters.length] : null;
    perCatIndex[catId]++;
    const c = blockContent(catId, chapter);
    return { day: firstDay + Math.floor(i / 2), slot: i % 2, catId, title: c.title, timeMin: c.time, instr: c.instr, checks: c.checks, chapter };
  });
}

// Full plan: 24 blocks over days 2..13.
function buildPlanBlocks(questions) {
  const schedule = scheduleBlocks(allocateBlocks(computeScores(questions), 24, 2), 12, 2);
  return blocksFor(schedule, 2, questions);
}

// Day-7 checkpoint: rebuilds days 8..13 from the checkpoint results, still
// drawing chapter names from the original mock.
function checkpointBlocks(mockQuestions, checkpointQuestions) {
  const scores = computeScores(checkpointQuestions.map((q) => ({ result: q.result, primary: q.primary, secondary: null })));
  const schedule = scheduleBlocks(allocateBlocks(scores, 12, 1), 6, 2);
  return blocksFor(schedule, 8, mockQuestions);
}

module.exports = { cleanQuestions, buildPlanBlocks, checkpointBlocks };
