/* ProDJEE Arena — gamified JEE Main / NEET practice. Local-first (v1). */
(() => {
  "use strict";

  /* ================================ CONFIG ================================ */
  const RULES = {
    startGP: 200,        // countdown starts here
    floorGP: 50,         // ... and stops here, dropping 1 GP/sec
    graceSec: 15,        // after hitting the floor, auto-skip after this many seconds
    wrong: -50,
    hint: -50,
    hintSec: 10,         // hint visible (and GP timer frozen) for this long
    solution: -150,
    bonusEvery: 5,
    bonusSec: 25,
    bonusRight: 300,
    bonusWrong: -100,
    numTolerance: 0.01
  };
  const SUBJECTS = { JEE: ["Physics", "Chemistry", "Mathematics"], NEET: ["Physics", "Chemistry", "Biology"] };
  const RANKS = [
    { name: "Aspirant", gp: 0 },
    { name: "Challenger", gp: 2000 },
    { name: "Achiever", gp: 6000 },
    { name: "Ranker", gp: 15000 },
    { name: "Topper", gp: 30000 },
    { name: "AIR-100", gp: 60000 },
    { name: "AIR-1", gp: 100000 }
  ];
  const BADGES = [
    { id: "first_blood", icon: "🎯", name: "First Blood", desc: "First correct answer" },
    { id: "hat_trick", icon: "🔥", name: "Hat-trick", desc: "3 correct in a row" },
    { id: "perfect_10", icon: "⚡", name: "Unstoppable", desc: "10 correct in a row" },
    { id: "speed_demon", icon: "🚀", name: "Speed Demon", desc: "Correct within 10 seconds" },
    { id: "bonus_hunter", icon: "👑", name: "Bonus Hunter", desc: "Crack 5 bonus questions" },
    { id: "clean_sweep", icon: "💎", name: "Clean Sweep", desc: "10+ Q session, 100%, no hints" },
    { id: "streak_3", icon: "📅", name: "Habit Forming", desc: "3-day streak" },
    { id: "streak_7", icon: "🗓️", name: "Iron Discipline", desc: "7-day streak" },
    { id: "vault_cleaner", icon: "🗝️", name: "Vault Cleaner", desc: "Master 5 questions from the Mistake Vault" },
    { id: "num_ninja", icon: "🔢", name: "Numerical Ninja", desc: "10 numerical answers correct" },
    { id: "century", icon: "💯", name: "Century", desc: "100 correct answers" },
    { id: "grinder", icon: "🏋️", name: "Grinder", desc: "Complete 10 sessions" }
  ];
  const VAULT_STEPS_DAYS = [1, 3, 7]; // spaced-revision intervals; mastered after the last one

  /* ================================ STORAGE =============================== */
  const STORE_KEY = "prodjee.arena.v1";
  const fresh = () => ({
    name: "", exam: "JEE", sound: true, dailyGoal: 1000,
    totalGP: 0, ratings: {}, stats: {}, seen: {}, vault: {}, vaultCleared: 0,
    daily: {}, streak: { count: 0, last: "", best: 0 }, badges: {},
    counters: { correct: 0, bonusCorrect: 0, numCorrect: 0, sessions: 0 },
    sessions: []
  });
  let S = fresh();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) S = Object.assign(fresh(), JSON.parse(raw));
  } catch (e) { /* private mode / blocked storage: play without persistence */ }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} };

  /* ================================ HELPERS =============================== */
  const $ = (sel) => document.querySelector(sel);
  const app = $("#app");
  const overlay = $("#overlay");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Math.round(n).toLocaleString("en-IN");
  const signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const chKey = (q) => `${q.exam}|${q.subject}|${q.chapter}`;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (c, a) => (a ? Math.round((100 * c) / a) : 0);
  const byId = Object.fromEntries(window.QBANK.map((q) => [q.id, q]));
  const bank = (exam) => window.QBANK.filter((q) => q.exam === exam);
  const chaptersOf = (exam, subject) => [...new Set(bank(exam).filter((q) => q.subject === subject).map((q) => q.chapter))];

  const rankFor = (gp) => {
    let i = 0;
    RANKS.forEach((r, k) => { if (gp >= r.gp) i = k; });
    const next = RANKS[i + 1];
    return { i, cur: RANKS[i], next, prog: next ? (gp - RANKS[i].gp) / (next.gp - RANKS[i].gp) : 1 };
  };
  const liveStreak = () => {
    const { last, count } = S.streak;
    return last === dayKey() || last === dayKey(daysAgo(1)) ? count : 0;
  };
  const vaultIds = (exam) => Object.keys(S.vault).filter((id) => byId[id] && byId[id].exam === exam);
  const vaultDue = (exam) => vaultIds(exam).filter((id) => S.vault[id].due <= Date.now());

  /* ================================= SOUND ================================ */
  let actx = null;
  const tone = (freq, dur = 0.12, type = "sine", vol = 0.12, delay = 0) => {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + delay;
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  };
  const sfx = {
    correct: () => { tone(660, 0.12, "triangle"); tone(880, 0.12, "triangle", 0.12, 0.09); tone(1320, 0.22, "triangle", 0.12, 0.18); },
    wrong: () => { tone(200, 0.28, "sawtooth", 0.07); tone(150, 0.3, "sawtooth", 0.06, 0.1); },
    tick: () => tone(1100, 0.04, "square", 0.04),
    hint: () => tone(520, 0.18, "sine", 0.1),
    bonus: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.11, i * 0.08)),
    badge: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, "sine", 0.1, i * 0.1)),
    tap: () => tone(700, 0.03, "sine", 0.05)
  };

  /* ================================= ICONS ================================ */
  const I = {
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffc21a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    vault: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffc21a" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5V7M12 17v-1.5M15.5 12H17M7 12h1.5"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="#ffc21a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="#ff4d6d" stroke-width="2" stroke-linecap="round"><path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/></svg>',
    gear: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68 1.65 1.65 0 0 0 10 3.17V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    soundOn: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>',
    soundOff: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/></svg>',
    share: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>'
  };
  const gradDefs = '<defs><linearGradient id="gpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe07a"/><stop offset=".5" stop-color="#ffc21a"/><stop offset="1" stop-color="#e11d3f"/></linearGradient></defs>';

  /* =============================== UI SHELL =============================== */
  const brand = () => `
    <div class="brand">
      <img src="logo.png" alt="ProDJEE logo" />
      <div><div class="name">ProDJEE <span>Arena</span></div><div class="sub">Gamified PYQ practice</div></div>
    </div>`;
  const topbar = () => `
    <header class="topbar">
      ${brand()}
      <div class="row">
        <button class="icon-btn" data-act="toggle-sound" aria-label="${S.sound ? "Mute" : "Unmute"} sounds">${S.sound ? I.soundOn : I.soundOff}</button>
        <button class="icon-btn" data-act="settings" aria-label="Settings">${I.gear}</button>
      </div>
    </header>`;
  const backBtn = (to = "home") => `<button class="back" data-act="${to}">${I.back} Back</button>`;
  // Figures: `img` on the question, options as "text" or { text?, img? }, `solutionImg` on the solution.
  const fig = (src, alt) => src ? `<figure class="q-fig" data-act="zoom" data-v="${esc(src)}" data-alt="${esc(alt || "Figure")}" title="Tap to zoom"><img src="${esc(src)}" alt="${esc(alt || "Figure")}" loading="lazy" /></figure>` : "";
  const optHTML = (o, pos) => {
    if (typeof o === "string") return `<span>${esc(o)}</span>`;
    return `<span class="opt-body">${o.img ? `<img class="opt-img" src="${esc(o.img)}" alt="${esc(o.alt || o.text || `Option ${"ABCD"[pos]}`)}" loading="lazy" />` : ""}${o.text ? `<span>${esc(o.text)}</span>` : ""}</span>`;
  };
  const allImgOpts = (q) => q.options && q.options.every((o) => typeof o === "object" && o.img);
  const isPYQ = (q) => q.source && !/^Sample/.test(q.source);
  const sampleNote = () => { const n = window.QBANK.filter(isPYQ).length; return `<p class="sample-note">Question bank: ${n} previous-year questions + ${window.QBANK.length - n} original practice samples (marked "Sample").</p>`; };

  const toast = (html, ms = 2600) => {
    let box = $("#toasts");
    if (!box) { box = document.createElement("div"); box.id = "toasts"; box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div");
    t.className = "toast pill gold"; t.innerHTML = html;
    box.appendChild(t); setTimeout(() => t.remove(), ms);
  };
  const modal = (html) => { overlay.innerHTML = `<div class="modal-back" data-act="modal-bg"><div class="modal glass" role="dialog" aria-modal="true">${html}</div></div>`; };
  const closeModal = () => { overlay.innerHTML = ""; };

  /* ================================= HOME ================================= */
  function renderHome() {
    window.scrollTo(0, 0);
    view = "home";
    document.body.classList.remove("bonus-mode");
    const r = rankFor(S.totalGP);
    const today = Math.max(0, S.daily[dayKey()] || 0);
    const goalP = Math.min(1, today / S.dailyGoal);
    const C = 2 * Math.PI * 42;
    const streak = liveStreak();
    const vCount = vaultIds(S.exam).length, vDue = vaultDue(S.exam).length;
    app.innerHTML = `
      ${topbar()}
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div>
          <div class="eyebrow">Choose your battlefield</div>
          <h1 style="margin-top:4px">${S.name ? `Welcome, ${esc(S.name)}.` : "Every second is <span class='gold-text'>Gyan</span>."}</h1>
        </div>
        <div class="seg" role="tablist" aria-label="Exam">
          ${["JEE", "NEET"].map((e) => `<button role="tab" aria-selected="${S.exam === e}" class="${S.exam === e ? "on" : ""}" data-act="exam" data-v="${e}">${e}</button>`).join("")}
        </div>
      </div>

      <section class="hero">
        <div class="glass hero-main">
          <div class="eyebrow">Total Gyan Points</div>
          <div class="big-gp num gold-text">${fmt(S.totalGP)}</div>
          <div class="row" style="margin-top:14px;justify-content:space-between">
            <span class="pill crimson">Rank · ${r.cur.name}</span>
            <span class="faint">${r.next ? `${fmt(r.next.gp - S.totalGP)} GP to ${r.next.name}` : "Top rank reached"}</span>
          </div>
          <div class="rank-bar"><i style="width:${(r.prog * 100).toFixed(1)}%"></i></div>
        </div>
        <div class="glass">
          <div class="goal-wrap">
            <div class="ring">
              <svg width="96" height="96" viewBox="0 0 96 96">${gradDefs}
                <circle cx="48" cy="48" r="42" stroke="rgba(255,255,255,.08)" stroke-width="8" fill="none"/>
                <circle cx="48" cy="48" r="42" stroke="url(#gpg)" stroke-width="8" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - goalP)}"/>
              </svg>
              <div class="ring-label"><div><b class="num" style="font-size:18px">${Math.round(goalP * 100)}%</b><br><span class="faint">today</span></div></div>
            </div>
            <div>
              <div class="eyebrow">Daily goal</div>
              <div class="num" style="font-size:20px">${fmt(today)} <span class="muted" style="font-size:14px;font-weight:600">/ ${fmt(S.dailyGoal)} GP</span></div>
              <div class="row" style="margin-top:8px">
                <span class="streak flame" aria-hidden="true">🔥</span>
                <div><div class="num" style="font-size:20px">${streak} day${streak === 1 ? "" : "s"}</div><div class="faint">streak · best ${S.streak.best}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="spacer"></div>
      <section class="grid cols-3">
        <button class="glass hover tile" data-act="setup" data-v="mixed">
          <div class="tile-ico">${I.bolt}</div>
          <h3>Mixed Arena</h3>
          <p>Adaptive questions across the full ${S.exam} syllabus. Difficulty follows your level in each chapter.</p>
        </button>
        <button class="glass hover tile" data-act="setup" data-v="chapter">
          <div class="tile-ico">${I.target}</div>
          <h3>Chapter Practice</h3>
          <p>Pick a subject and chapters. Drill your weak spots until they turn green.</p>
        </button>
        <button class="glass hover tile" data-act="setup" data-v="vault">
          ${vCount ? `<span class="pill ${vDue ? "crimson" : "gold"} badge-count">${vDue ? `${vDue} due` : vCount}</span>` : ""}
          <div class="tile-ico">${I.vault}</div>
          <h3>Mistake Vault</h3>
          <p>Every wrong, skipped or solution-viewed question comes back on day 1, 3 and 7 until you master it.</p>
        </button>
        <button class="glass hover tile" data-act="analysis">
          <div class="tile-ico">${I.chart}</div>
          <h3>Performance Analysis</h3>
          <p>Chapter-wise accuracy and your last 7 days of GP. Find your weak and strong chapters.</p>
        </button>
        <button class="glass hover tile" data-act="badges">
          <div class="tile-ico">${I.trophy}</div>
          <h3>Ranks & Badges</h3>
          <p>${Object.keys(S.badges).length}/${BADGES.length} badges unlocked. Climb from Aspirant to AIR-1.</p>
        </button>
        <button class="glass hover tile" data-act="parent-lifetime">
          <div class="tile-ico" style="color:#ffc21a">${I.share}</div>
          <h3>Parent Report</h3>
          <p>Send your overall progress to your parents on WhatsApp in one tap.</p>
        </button>
      </section>
      ${sampleNote()}`;
  }

  /* ================================= SETUP ================================ */
  let setup = null;
  function renderSetup(mode) {
    view = "setup";
    setup = setup && setup.mode === mode && setup.exam === S.exam ? setup : { mode, exam: S.exam, subject: SUBJECTS[S.exam][0], chapters: new Set(), length: 10 };
    const titles = { mixed: "Mixed Arena", chapter: "Chapter Practice", vault: "Mistake Vault" };
    let body = "";
    if (mode === "chapter") {
      const chs = chaptersOf(S.exam, setup.subject);
      body = `
        <div class="eyebrow">Subject</div>
        <div class="chips" style="margin:8px 0 16px">
          ${SUBJECTS[S.exam].map((s) => `<button class="chip ${setup.subject === s ? "on" : ""}" data-act="subj" data-v="${s}">${s}</button>`).join("")}
        </div>
        <div class="row" style="justify-content:space-between"><div class="eyebrow">Chapters</div>
          <button class="faint" data-act="all-ch" style="text-decoration:underline">${setup.chapters.size === chs.length ? "Clear" : "Select all"}</button></div>
        <div class="chips" style="margin:8px 0 16px">
          ${chs.map((c) => {
            const st = S.stats[`${S.exam}|${setup.subject}|${c}`];
            const n = bank(S.exam).filter((q) => q.subject === setup.subject && q.chapter === c).length;
            return `<button class="chip ${setup.chapters.has(c) ? "on" : ""}" data-act="ch" data-v="${esc(c)}">${esc(c)}<small>${st ? pct(st.cor, st.att) + "%" : n + " Q"}</small></button>`;
          }).join("")}
        </div>`;
    } else if (mode === "vault") {
      const all = vaultIds(S.exam).length, due = vaultDue(S.exam).length;
      body = `<p class="muted" style="margin-top:0">${all ? `<b>${all}</b> question${all > 1 ? "s" : ""} in your ${S.exam} vault, <b class="crimson-text">${due}</b> due for revision now. Get a question right at each spaced step (1 → 3 → 7 days) to master it.` : "Your vault is empty. Wrong, skipped and solution-viewed questions will appear here."}</p>`;
    } else {
      body = `<p class="muted" style="margin-top:0">Questions are picked across all ${S.exam} subjects and matched to your level in each chapter. Get them right and they get harder. Every ${RULES.bonusEvery}th question is a <b class="gold-text">BONUS</b>: ${RULES.bonusSec} seconds, +${RULES.bonusRight} / ${RULES.bonusWrong} GP, no hints.</p>`;
    }
    const pool = poolFor(setup);
    app.innerHTML = `
      ${topbar()}
      <div class="narrow">
        ${backBtn()}
        <div class="glass" style="margin-top:12px;padding:22px">
          <div class="eyebrow">${S.exam} · Setup</div>
          <h1 style="margin:4px 0 16px">${titles[mode]}</h1>
          ${body}
          <div class="eyebrow">Session length</div>
          <div class="chips" style="margin:8px 0 20px">
            ${[10, 20, 30].map((n) => `<button class="chip gold ${setup.length === n ? "on" : ""}" data-act="len" data-v="${n}">${n} questions</button>`).join("")}
          </div>
          <div class="glass tight" style="background:rgba(0,0,0,.25);margin-bottom:18px">
            <div class="eyebrow" style="margin-bottom:6px">Scoring</div>
            <div class="faint" style="font-size:13px;line-height:1.7">
              GP counts down <b class="gold-text">${RULES.startGP} → ${RULES.floorGP}</b> at 1 GP/sec. Correct = GP on the clock · Wrong ${RULES.wrong} · Hint ${RULES.hint} (clock frozen ${RULES.hintSec}s) · Solution ${RULES.solution}, no GP · At ${RULES.floorGP} GP you get ${RULES.graceSec}s more, then the question is skipped.
            </div>
          </div>
          <button class="btn primary block" data-act="start" ${pool.length ? "" : "disabled"}>
            ${pool.length ? `Start · ${Math.min(pool.length, setup.length)} questions` : mode === "chapter" ? "Select at least one chapter" : "Nothing to play yet"}
          </button>
          ${pool.length && pool.length < setup.length ? `<p class="faint" style="text-align:center;margin-bottom:0">Only ${pool.length} matching questions in the bank right now.</p>` : ""}
        </div>
      </div>`;
  }
  function poolFor(cfg) {
    let p = bank(cfg.exam);
    if (cfg.mode === "chapter") p = p.filter((q) => q.subject === cfg.subject && cfg.chapters.has(q.chapter));
    if (cfg.mode === "vault") { const ids = new Set(vaultIds(cfg.exam)); p = p.filter((q) => ids.has(q.id)); }
    return p;
  }

  /* ============================ ADAPTIVE ENGINE =========================== */
  // Elo-style: each student has a rating per chapter; each question has a rating from its difficulty.
  const qRating = (q) => 800 + 200 * (q.difficulty || 3);
  const sRating = (q) => S.ratings[chKey(q)] || 1200;
  function updateRating(q, score) {
    const s = sRating(q), expct = 1 / (1 + Math.pow(10, (qRating(q) - s) / 400));
    S.ratings[chKey(q)] = Math.max(600, Math.min(2400, Math.round(s + 40 * (score - expct))));
  }
  function pickNext() {
    const isBonus = (G.idx + 1) % RULES.bonusEvery === 0;
    let cands = G.pool.filter((q) => !G.used.has(q.id));
    if (!cands.length) return null;
    if (isBonus) { const mcq = cands.filter((q) => q.type === "mcq"); if (mcq.length) cands = mcq; }
    const now = Date.now();
    let best = null, bestScore = Infinity;
    cands.forEach((q) => {
      const target = sRating(q) + (isBonus ? -100 : 60); // bonus: slightly easier, 25 s is tight
      let sc = Math.abs(qRating(q) - target) + Math.random() * 160 + (S.seen[q.id] || 0) * 120;
      const v = S.vault[q.id];
      if (v && v.due <= now) sc -= G.mode === "vault" ? 1000 : 120;
      if (sc < bestScore) { bestScore = sc; best = q; }
    });
    return { q: best, isBonus };
  }

  /* ================================= GAME ================================= */
  let G = null, view = "home", timer = null;

  function startGame() {
    const pool = poolFor(setup);
    if (!pool.length) return;
    G = {
      exam: setup.exam, mode: setup.mode, pool, length: Math.min(setup.length, pool.length),
      idx: 0, used: new Set(), records: [], sessionGP: 0, streakRun: 0, bestRun: 0, cur: null, newBadges: []
    };
    nextQuestion();
  }

  function nextQuestion() {
    if (G.idx >= G.length) return finishGame();
    const pick = pickNext();
    if (!pick) return finishGame();
    G.used.add(pick.q.id);
    G.cur = {
      q: pick.q, isBonus: pick.isBonus, order: shuffle([0, 1, 2, 3]),
      gp: RULES.startGP, bonusLeft: RULES.bonusSec, grace: null, time: 0,
      hintUsed: false, hintLeft: 0, solShown: false, selected: null, numVal: "",
      phase: "play", result: null, delta: 0
    };
    document.body.classList.toggle("bonus-mode", pick.isBonus);
    if (pick.isBonus) sfx.bonus();
    renderGame();
    window.scrollTo(0, 0);
    clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  function tick() {
    const c = G && G.cur;
    if (!c || c.phase !== "play") return;
    c.time++;
    if (c.isBonus) {
      c.bonusLeft--;
      if (c.bonusLeft <= 5 && c.bonusLeft > 0) sfx.tick();
      if (c.bonusLeft <= 0) return resolve("timeout");
    } else if (c.hintLeft > 0) {
      c.hintLeft--;
      if (c.hintLeft === 0) { const h = $("#hint-box"); if (h) h.remove(); }
    } else if (c.gp > RULES.floorGP) {
      c.gp--;
      if (c.gp === RULES.floorGP) c.grace = RULES.graceSec;
    } else {
      c.grace--;
      if (c.grace <= 3 && c.grace > 0) sfx.tick();
      if (c.grace <= 0) return resolve("skip");
    }
    paintClock();
  }

  function orb() {
    const c = G.cur, C = 2 * Math.PI * 58;
    const frac = c.isBonus ? c.bonusLeft / RULES.bonusSec : (c.gp - RULES.floorGP) / (RULES.startGP - RULES.floorGP);
    const val = c.isBonus ? c.bonusLeft : c.gp;
    const lbl = c.isBonus ? "SECONDS" : c.hintLeft > 0 ? "FROZEN" : "GYAN PTS";
    const low = c.isBonus ? c.bonusLeft <= 5 : c.grace !== null;
    return `
      <div class="gp-orb ${c.hintLeft > 0 ? "paused" : ""} ${low && c.phase === "play" ? "low" : ""}" id="orb" role="timer" aria-live="off">
        <svg width="132" height="132" viewBox="0 0 132 132">${gradDefs}
          <circle cx="66" cy="66" r="58" stroke="rgba(255,255,255,.08)" stroke-width="9" fill="rgba(0,0,0,.25)"/>
          <circle cx="66" cy="66" r="58" stroke="url(#gpg)" stroke-width="9" fill="none" stroke-linecap="round"
            stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.max(0, frac))}" style="transition:stroke-dashoffset 1s linear"/>
        </svg>
        <div class="val"><div><b class="num ${c.isBonus ? "crimson-text" : "gold-text"}">${val}</b><small>${lbl}</small></div></div>
      </div>`;
  }
  function paintClock() {
    const o = $("#orb"); if (o) o.outerHTML = orb();
    const g = $("#grace");
    if (g) g.textContent = G.cur.grace !== null && G.cur.phase === "play" ? `Auto-skip in ${G.cur.grace}s` : "";
  }

  function renderGame() {
    view = "game";
    const c = G.cur, q = c.q, done = c.phase === "done";
    const dots = Array.from({ length: G.length }, (_, i) => {
      const r = G.records[i];
      const bonus = (i + 1) % RULES.bonusEvery === 0 ? " b" : "";
      if (r) return `<i class="${r.result === "correct" ? "c" : r.result === "wrong" ? "w" : "s"}${bonus}"></i>`;
      return `<i class="${i === G.idx ? "now" : ""}${bonus}"></i>`;
    }).join("");
    const L = "ABCD";
    let answerUI;
    if (q.type === "mcq") {
      answerUI = `<div class="options ${allImgOpts(q) ? "img-grid" : ""}" role="radiogroup">${c.order.map((oi, pos) => {
        let cls = "";
        if (done) { if (oi === q.answer) cls = "right"; else if (oi === c.selected) cls = "wrong"; }
        else if (oi === c.selected) cls = "sel";
        return `<button class="opt ${cls}" role="radio" aria-checked="${oi === c.selected}" data-act="opt" data-v="${oi}" ${done ? "disabled" : ""}><span class="k">${L[pos]}</span>${optHTML(q.options[oi], pos)}</button>`;
      }).join("")}</div>`;
    } else {
      const cls = done ? (c.result === "correct" ? "right" : "wrong") : "";
      answerUI = `
        <input class="num-input ${cls}" id="num" inputmode="decimal" autocomplete="off" placeholder="Type your answer" value="${esc(c.numVal)}" ${done ? "disabled" : ""} aria-label="Numerical answer" />
        ${done ? "" : `<div class="keypad">${["7", "8", "9", "⌫", "4", "5", "6", "−", "1", "2", "3", ".", "0"].map((k) => `<button data-act="key" data-v="${k}" ${k === "0" ? 'style="grid-column:span 4"' : ""}>${k}</button>`).join("")}</div>`}
        ${done && c.result !== "correct" ? `<p class="muted" style="text-align:center;margin:10px 0 0">Correct answer: <b class="gold-text num" style="font-size:18px">${esc(q.answer)}</b></p>` : ""}`;
    }
    const resultPill = done ? {
      correct: `<span class="pill mint">Correct · ${signed(c.delta)} GP</span>`,
      wrong: `<span class="pill crimson">Wrong · ${signed(c.delta)} GP</span>`,
      timeout: `<span class="pill crimson">Time up · ${signed(c.delta)} GP</span>`,
      skip: `<span class="pill">Skipped · ${signed(c.delta)} GP</span>`,
      solution: `<span class="pill gold">Solution viewed · ${signed(c.delta)} GP</span>`
    }[c.result] : "";
    const canAnswer = q.type === "mcq" ? c.selected !== null : c.numVal.trim() !== "";
    app.innerHTML = `
      <div class="narrow">
        <div class="game-head">
          <div>
            <div class="eyebrow">${G.exam} · Q ${G.idx + 1}/${G.length}</div>
            <div class="progress-dots" style="margin-top:6px">${dots}</div>
          </div>
          ${orb()}
          <div class="right" style="text-align:right">
            <div class="eyebrow">Session</div>
            <div class="num ${G.sessionGP < 0 ? "crimson-text" : "gold-text"}" style="font-size:24px" id="sess-gp">${signed(G.sessionGP)}</div>
            <button class="faint" data-act="quit" style="text-decoration:underline;margin-top:2px">End session</button>
          </div>
        </div>
        ${c.isBonus ? `<div class="bonus-banner"><div><div class="num gold-text" style="font-size:18px">⚡ BONUS QUESTION</div><div class="faint" style="color:var(--text-2)">+${RULES.bonusRight} if right · ${RULES.bonusWrong} if wrong or time runs out · no hints</div></div><span class="num" style="font-size:26px">${RULES.bonusSec}s</span></div>` : ""}
        <article class="glass q-card" id="qcard">
          <div class="q-meta">
            <span class="pill">${esc(q.subject)}</span>
            <span class="pill">${esc(q.chapter)}</span>
            <span class="pill ${q.type === "num" ? "gold" : ""}">${q.type === "num" ? "Numerical" : "Single correct"}</span>
            ${isPYQ(q) ? '<span class="pill mint">PYQ</span>' : '<span class="pill">Sample</span>'}
            <span class="pill" title="Difficulty">${"●".repeat(q.difficulty)}${"○".repeat(5 - q.difficulty)}</span>
          </div>
          <p class="q-text">${esc(q.q)}</p>
          ${fig(q.img, q.imgAlt)}
          ${answerUI}
          <div id="grace" class="grace" aria-live="polite">${c.grace !== null && !done ? `Auto-skip in ${c.grace}s` : ""}</div>
          ${c.hintLeft > 0 && !done ? `<div class="reveal hint" id="hint-box"><h4>Hint</h4><p>${esc(q.hint)}</p><div class="hint-bar"><i style="animation-duration:${c.hintLeft}s"></i></div></div>` : ""}
          ${done && c.solShown ? `<div class="reveal sol"><h4>Solution</h4><p>${esc(q.solution)}</p>${fig(q.solutionImg, "Solution figure")}</div>` : ""}
          ${done ? `
            <div class="row" style="justify-content:space-between;margin-top:16px;flex-wrap:wrap">
              ${resultPill}
              <div class="row">
                ${c.solShown ? "" : `<button class="btn ghost sm" data-act="see-sol">See solution</button>`}
                <button class="btn primary" data-act="next">${G.idx + 1 >= G.length ? "Finish" : "Next"} →</button>
              </div>
            </div>` : `
            <div class="actions">
              <button class="btn ghost" data-act="hint" ${c.isBonus || c.hintUsed ? "disabled" : ""}>Hint <small>${RULES.hint}</small></button>
              <button class="btn ghost" data-act="solution" ${c.isBonus ? "disabled" : ""}>Solution <small>${RULES.solution}</small></button>
              <button class="btn ${c.isBonus ? "gold" : "primary"} lock" data-act="lock" ${canAnswer ? "" : "disabled"}>Lock answer</button>
            </div>`}
          <p class="faint" style="margin:14px 0 0;text-align:right">${esc(q.source || "Sample (not PYQ)")}</p>
        </article>
      </div>`;
    const inp = $("#num");
    if (inp && !done) {
      inp.addEventListener("input", () => { G.cur.numVal = inp.value; const b = $('[data-act="lock"]'); if (b) b.disabled = !inp.value.trim(); });
      if (window.matchMedia("(pointer:fine)").matches) inp.focus();
    }
  }

  function floatGP(delta) {
    const f = document.createElement("div");
    f.className = `float-gp ${delta >= 0 ? "plus" : "minus"}`;
    f.textContent = `${signed(delta)} GP`;
    document.body.appendChild(f); setTimeout(() => f.remove(), 1300);
  }

  function useHint() {
    const c = G.cur;
    if (c.phase !== "play" || c.isBonus || c.hintUsed) return;
    c.hintUsed = true; c.hintLeft = RULES.hintSec; c.delta += RULES.hint; G.sessionGP += RULES.hint;
    sfx.hint(); floatGP(RULES.hint); renderGame();
  }

  // outcome: "lock" | "timeout" | "skip" | "solution"
  function resolve(outcome) {
    const c = G.cur, q = c.q;
    if (c.phase !== "play") return;
    let result, add = 0;
    if (outcome === "lock") {
      const ok = q.type === "mcq"
        ? c.selected === q.answer
        : Math.abs(parseFloat(c.numVal.replace("−", "-")) - Number(q.answer)) <= RULES.numTolerance;
      result = ok ? "correct" : "wrong";
      add = ok ? (c.isBonus ? RULES.bonusRight : c.gp) : (c.isBonus ? RULES.bonusWrong : RULES.wrong);
    } else if (outcome === "timeout") { result = "timeout"; add = RULES.bonusWrong; }
    else if (outcome === "skip") { result = "skip"; add = 0; }
    else { result = "solution"; add = RULES.solution; c.solShown = true; }

    c.phase = "done"; c.result = result; c.delta += add; G.sessionGP += add;
    clearInterval(timer);
    document.body.classList.remove("bonus-mode");

    const ok = result === "correct";
    // record + learning model
    G.records.push({ id: q.id, key: chKey(q), subject: q.subject, chapter: q.chapter, type: q.type, result: ok ? "correct" : result === "timeout" ? "wrong" : result, gp: c.delta, time: c.time, hint: c.hintUsed, bonus: c.isBonus, fast: ok && !c.isBonus && c.gp >= RULES.startGP - 10 });
    S.seen[q.id] = (S.seen[q.id] || 0) + 1;
    updateRating(q, ok ? (c.hintUsed ? 0.6 : 1) : 0);
    const v = S.vault[q.id];
    if (ok && v) {
      if (v.due <= Date.now()) {
        v.box++;
        if (v.box >= VAULT_STEPS_DAYS.length) { delete S.vault[q.id]; S.vaultCleared++; toast("🗝️ Mastered and removed from the vault"); }
        else v.due = Date.now() + VAULT_STEPS_DAYS[v.box - 1] * 864e5;
      }
    } else if (!ok) {
      S.vault[q.id] = { box: 0, due: Date.now() + 36e5, added: (v && v.added) || Date.now() }; // back in 1 hour
    }
    if (ok) { G.streakRun++; G.bestRun = Math.max(G.bestRun, G.streakRun); S.counters.correct++; if (c.isBonus) S.counters.bonusCorrect++; if (q.type === "num") S.counters.numCorrect++; }
    else G.streakRun = 0;
    save();

    if (ok) sfx.correct(); else if (result !== "solution" && result !== "skip") sfx.wrong();
    if (add) floatGP(add);
    checkBadges(false);
    renderGame();
    if (!ok && result !== "solution") { const card = $("#qcard"); if (card) card.classList.add("shake"); }
  }

  /* ================================ BADGES ================================ */
  function award(id) {
    if (S.badges[id]) return;
    S.badges[id] = Date.now();
    const b = BADGES.find((x) => x.id === id);
    if (G) G.newBadges.push(id);
    sfx.badge();
    toast(`${b.icon} Badge unlocked: <b>${b.name}</b>`, 3200);
  }
  function checkBadges(sessionEnd) {
    const k = S.counters;
    if (k.correct >= 1) award("first_blood");
    if (G && G.bestRun >= 3) award("hat_trick");
    if (G && G.bestRun >= 10) award("perfect_10");
    if (G && G.records.some((r) => r.fast)) award("speed_demon");
    if (k.bonusCorrect >= 5) award("bonus_hunter");
    if (k.numCorrect >= 10) award("num_ninja");
    if (k.correct >= 100) award("century");
    if (S.vaultCleared >= 5) award("vault_cleaner");
    if (sessionEnd) {
      if (G && G.records.length >= 10 && G.records.every((r) => r.result === "correct" && !r.hint)) award("clean_sweep");
      if (S.streak.count >= 3) award("streak_3");
      if (S.streak.count >= 7) award("streak_7");
      if (k.sessions >= 10) award("grinder");
    }
    save();
  }

  /* ============================== END SESSION ============================= */
  function commitSession() {
    if (!G || !G.records.length || G.committed) return null;
    G.committed = true;
    const byChapter = {};
    G.records.forEach((r) => {
      const b = (byChapter[r.key] = byChapter[r.key] || { att: 0, cor: 0 });
      b.att++; if (r.result === "correct") b.cor++;
      const st = (S.stats[r.key] = S.stats[r.key] || { att: 0, cor: 0 });
      st.att++; if (r.result === "correct") st.cor++;
    });
    const today = dayKey();
    S.daily[today] = (S.daily[today] || 0) + G.sessionGP;
    S.totalGP = Math.max(0, S.totalGP + G.sessionGP);
    if (S.streak.last !== today) {
      S.streak.count = S.streak.last === dayKey(daysAgo(1)) ? S.streak.count + 1 : 1;
      S.streak.last = today;
      S.streak.best = Math.max(S.streak.best, S.streak.count);
    }
    S.counters.sessions++;
    const sess = {
      at: Date.now(), exam: G.exam, mode: G.mode, n: G.records.length,
      correct: G.records.filter((r) => r.result === "correct").length,
      gp: G.sessionGP, time: G.records.reduce((a, r) => a + r.time, 0),
      hints: G.records.filter((r) => r.hint).length,
      solutions: G.records.filter((r) => r.result === "solution").length,
      byChapter
    };
    S.sessions.push(sess);
    if (S.sessions.length > 200) S.sessions = S.sessions.slice(-200);
    checkBadges(true);
    save();
    return sess;
  }

  function finishGame() {
    clearInterval(timer);
    document.body.classList.remove("bonus-mode");
    const sess = commitSession();
    if (!sess) { G = null; return renderHome(); }
    renderResults(sess, G.newBadges.slice(), G.records.slice());
    G = null;
  }

  function barsHTML(rows) {
    if (!rows.length) return `<p class="muted">No attempts yet.</p>`;
    return `<div class="bars">${rows.map((r) => {
      const p = pct(r.cor, r.att), cls = p >= 75 ? "hi" : p >= 45 ? "mid" : "lo";
      return `<div class="bar-row"><div class="top"><span>${esc(r.label)}</span><span>${r.cor}/${r.att} · ${p}%</span></div>
        <div class="bar-track" role="img" aria-label="${esc(r.label)}: ${r.cor} of ${r.att} correct"><i class="${cls}" style="width:${Math.max(p, 2)}%"></i></div></div>`;
    }).join("")}</div>
    <div class="legend" style="margin-top:12px"><span><i style="background:var(--mint)"></i>Strong ≥75%</span><span><i style="background:var(--gold)"></i>Building 45–74%</span><span><i style="background:var(--crimson)"></i>Weak &lt;45%</span></div>`;
  }
  const chapterRows = (obj) => Object.entries(obj).map(([k, v]) => ({ key: k, label: k.split("|")[2], subject: k.split("|")[1], att: v.att, cor: v.cor }));

  function renderResults(sess, newBadges, records) {
    window.scrollTo(0, 0);
    view = "results";
    const acc = pct(sess.correct, sess.n);
    const rows = chapterRows(sess.byChapter).sort((a, b) => pct(a.cor, a.att) - pct(b.cor, b.att));
    const count = (res) => records.filter((r) => r.result === res).length;
    const outcomes = [["correct", "Correct", "var(--mint)"], ["wrong", "Wrong", "var(--crimson)"], ["skip", "Skipped", "#8a8a99"], ["solution", "Solution", "var(--gold)"]];
    const r = rankFor(S.totalGP);
    const headline = acc >= 80 ? "Outstanding session." : acc >= 60 ? "Solid work. Keep pushing." : acc >= 40 ? "Good effort. The vault will fix the rest." : "Tough round. Revise the vault and come back.";
    app.innerHTML = `
      ${topbar()}
      <div class="narrow">
        <div class="glass" style="padding:24px;text-align:center">
          <div class="eyebrow">Session complete · ${sess.exam}</div>
          <div class="num ${sess.gp < 0 ? "crimson-text" : "gold-text"}" style="font-size:60px;line-height:1.1;margin-top:6px">${signed(sess.gp)}</div>
          <div class="muted">Gyan Points · ${headline}</div>
          <div class="row" style="justify-content:center;margin-top:12px;flex-wrap:wrap">
            <span class="pill crimson">Rank · ${r.cur.name}</span>
            <span class="pill gold">Total ${fmt(S.totalGP)} GP</span>
            <span class="pill">🔥 ${liveStreak()}-day streak</span>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="stat-grid">
          <div class="stat"><div class="v">${sess.correct}/${sess.n}</div><div class="l">Correct</div></div>
          <div class="stat"><div class="v">${acc}%</div><div class="l">Accuracy</div></div>
          <div class="stat"><div class="v">${Math.round(sess.time / sess.n)}s</div><div class="l">Avg time</div></div>
          <div class="stat"><div class="v">${sess.hints}/${sess.solutions}</div><div class="l">Hints / Sols</div></div>
        </div>
        <div class="spacer"></div>
        <div class="glass">
          <h3 style="margin-bottom:10px">Outcome split</h3>
          <div style="display:flex;height:14px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.06)" role="img" aria-label="${outcomes.map(([k, l]) => `${l} ${count(k)}`).join(", ")}">
            ${outcomes.map(([k, , col]) => count(k) ? `<i style="width:${(100 * count(k)) / sess.n}%;background:${col}"></i>` : "").join("")}
          </div>
          <div class="legend" style="margin-top:10px">${outcomes.map(([k, l, col]) => `<span><i style="background:${col}"></i>${l} ${count(k)}</span>`).join("")}</div>
        </div>
        <div class="spacer"></div>
        <div class="glass">
          <h3>Chapter-wise: correct / attempted</h3>
          <p class="faint" style="margin:4px 0 14px">Weakest first. Target the red ones in Chapter Practice.</p>
          ${barsHTML(rows)}
        </div>
        ${newBadges.length ? `
          <div class="spacer"></div>
          <div class="glass">
            <h3 style="margin-bottom:12px">New badges</h3>
            <div class="badges">${newBadges.map((id) => { const b = BADGES.find((x) => x.id === id); return `<div class="badge-card"><div class="medal">${b.icon}</div><b>${b.name}</b><span>${b.desc}</span></div>`; }).join("")}</div>
            <button class="btn ghost block" style="margin-top:12px" data-act="share-badge" data-v="${newBadges[newBadges.length - 1]}">${I.share} Share achievement</button>
          </div>` : ""}
        <div class="spacer"></div>
        <div class="grid cols-2">
          <button class="btn gold" data-act="parent-session">${I.share} Send report to parents</button>
          <button class="btn primary" data-act="again">Play again</button>
        </div>
        <div class="spacer"></div>
        <button class="btn ghost block" data-act="home">Home</button>
      </div>`;
    lastSession = sess;
  }
  let lastSession = null;

  /* =============================== ANALYSIS =============================== */
  function lifetime(exam) {
    const rows = chapterRows(Object.fromEntries(Object.entries(S.stats).filter(([k]) => k.startsWith(exam + "|"))));
    const att = rows.reduce((a, r) => a + r.att, 0), cor = rows.reduce((a, r) => a + r.cor, 0);
    const rated = rows.filter((r) => r.att >= 2);
    const weak = rated.slice().sort((a, b) => pct(a.cor, a.att) - pct(b.cor, b.att)).slice(0, 3);
    const strong = rated.slice().sort((a, b) => pct(b.cor, b.att) - pct(a.cor, a.att)).filter((r) => pct(r.cor, r.att) >= 60).slice(0, 3);
    return { rows, att, cor, weak, strong: strong.filter((s) => !weak.includes(s)) };
  }
  function weekHTML() {
    const days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
    const vals = days.map((d) => Math.max(0, S.daily[dayKey(d)] || 0));
    const max = Math.max(S.dailyGoal, ...vals);
    return `<div class="week" role="img" aria-label="GP over the last 7 days: ${vals.join(", ")}">${days.map((d, i) => `
      <div class="col"><b>${vals[i] ? fmt(vals[i]) : ""}</b><i class="${vals[i] >= S.dailyGoal ? "goal" : ""}" style="height:${(vals[i] / max) * 80}%"></i><span>${d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2)}</span></div>`).join("")}</div>`;
  }
  function renderAnalysis() {
    window.scrollTo(0, 0);
    view = "analysis";
    const L = lifetime(S.exam);
    const subjects = SUBJECTS[S.exam].map((s) => ({ s, rows: L.rows.filter((r) => r.subject === s).sort((a, b) => pct(a.cor, a.att) - pct(b.cor, b.att)) }));
    const subjTotals = subjects.map(({ s, rows }) => ({ label: s, att: rows.reduce((a, r) => a + r.att, 0), cor: rows.reduce((a, r) => a + r.cor, 0) })).filter((x) => x.att);
    app.innerHTML = `
      ${topbar()}
      ${backBtn()}
      <div class="row" style="justify-content:space-between;margin:12px 0 16px;flex-wrap:wrap">
        <h1>Performance · ${S.exam}</h1>
        <div class="seg">${["JEE", "NEET"].map((e) => `<button class="${S.exam === e ? "on" : ""}" data-act="exam-an" data-v="${e}">${e}</button>`).join("")}</div>
      </div>
      <div class="stat-grid">
        <div class="stat"><div class="v">${L.att}</div><div class="l">Attempted</div></div>
        <div class="stat"><div class="v">${pct(L.cor, L.att)}%</div><div class="l">Accuracy</div></div>
        <div class="stat"><div class="v gold-text">${fmt(S.totalGP)}</div><div class="l">Total GP</div></div>
        <div class="stat"><div class="v">${S.streak.best}</div><div class="l">Best streak</div></div>
      </div>
      <div class="spacer"></div>
      <div class="split">
        <div class="glass"><h3>Last 7 days · GP</h3><p class="faint" style="margin:4px 0 12px">Glowing bars hit the daily goal of ${fmt(S.dailyGoal)} GP.</p>${weekHTML()}</div>
        <div class="glass"><h3 style="margin-bottom:12px">Subject accuracy</h3>${barsHTML(subjTotals)}</div>
      </div>
      <div class="spacer"></div>
      <div class="split">
        <div class="glass"><h3 style="margin-bottom:10px">🔻 Focus on these</h3><div class="chapter-list">${L.weak.length ? L.weak.map((r) => `<div class="it"><span>${esc(r.label)}</span><b class="crimson-text">${pct(r.cor, r.att)}%</b></div>`).join("") : '<p class="faint">Attempt at least 2 questions in a chapter to rate it.</p>'}</div></div>
        <div class="glass"><h3 style="margin-bottom:10px">🔺 Your strong areas</h3><div class="chapter-list">${L.strong.length ? L.strong.map((r) => `<div class="it"><span>${esc(r.label)}</span><b style="color:var(--mint)">${pct(r.cor, r.att)}%</b></div>`).join("") : '<p class="faint">Not enough data yet. Keep playing.</p>'}</div></div>
      </div>
      ${subjects.map(({ s, rows }) => `<div class="spacer"></div><div class="glass"><h3 style="margin-bottom:12px">${s} · chapters</h3>${barsHTML(rows)}</div>`).join("")}
      ${sampleNote()}`;
  }

  /* ================================ BADGES ================================ */
  function renderBadges() {
    window.scrollTo(0, 0);
    view = "badges";
    const r = rankFor(S.totalGP);
    app.innerHTML = `
      ${topbar()}
      ${backBtn()}
      <h1 style="margin:12px 0 16px">Ranks & Badges</h1>
      <div class="split">
        <div class="glass">
          <h3 style="margin-bottom:12px">Rank ladder</h3>
          <div class="ranks">${RANKS.map((x, i) => `<div class="rank-item ${i === r.i ? "cur" : i < r.i ? "done" : ""}"><b class="num">${i < r.i ? "✓ " : ""}${x.name}</b><span class="faint">${fmt(x.gp)} GP</span></div>`).join("")}</div>
        </div>
        <div class="glass">
          <h3 style="margin-bottom:12px">Badges · ${Object.keys(S.badges).length}/${BADGES.length}</h3>
          <div class="badges">${BADGES.map((b) => `<div class="badge-card ${S.badges[b.id] ? "" : "locked"}"><div class="medal">${b.icon}</div><b>${b.name}</b><span>${b.desc}</span></div>`).join("")}</div>
        </div>
      </div>`;
  }

  /* ============================ WELCOME / REPORT ========================== */
  function welcomeBack() {
    const L = lifetime(S.exam);
    if (!L.att) return;
    const last = S.sessions[S.sessions.length - 1];
    modal(`
      <div class="eyebrow">Welcome back${S.name ? ", " + esc(S.name) : ""}</div>
      <h2 style="margin:4px 0 14px">Your ${S.exam} report card</h2>
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr)">
        <div class="stat"><div class="v">${pct(L.cor, L.att)}%</div><div class="l">Accuracy</div></div>
        <div class="stat"><div class="v">${L.cor}/${L.att}</div><div class="l">Correct</div></div>
        <div class="stat"><div class="v">🔥${liveStreak()}</div><div class="l">Streak</div></div>
      </div>
      <div class="spacer"></div>
      <h3 style="margin-bottom:10px">Chapter-wise (all time)</h3>
      ${barsHTML(L.rows.sort((a, b) => pct(a.cor, a.att) - pct(b.cor, b.att)).slice(0, 6))}
      ${last ? `<p class="faint" style="margin-top:12px">Last session: ${new Date(last.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · ${last.correct}/${last.n} correct · ${signed(last.gp)} GP</p>` : ""}
      ${vaultDue(S.exam).length ? `<p class="crimson-text" style="font-weight:600">${vaultDue(S.exam).length} question(s) in your Mistake Vault are due today.</p>` : ""}
      <button class="btn primary block" data-act="close-modal" style="margin-top:8px">Let's go</button>`);
  }

  function reportText(sess) {
    const L = lifetime(S.exam), r = rankFor(S.totalGP);
    const lines = [`📊 ProDJEE Arena · Progress Report`, `Student: ${S.name || "—"}`, `Date: ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })} · Exam: ${sess ? sess.exam : S.exam}`];
    if (sess) {
      lines.push("", `Today's session: ${sess.n} questions`, `✅ ${sess.correct} correct (${pct(sess.correct, sess.n)}%) · ⏱ avg ${Math.round(sess.time / sess.n)} s/question`, `GP earned: ${signed(sess.gp)} · Hints: ${sess.hints} · Solutions viewed: ${sess.solutions}`);
    }
    lines.push("", `Overall: ${L.cor}/${L.att} correct (${pct(L.cor, L.att)}%)`, `Total GP: ${fmt(S.totalGP)} · Rank: ${r.cur.name}`, `Streak: ${liveStreak()} day(s) 🔥 · Today's goal: ${Math.round((100 * Math.max(0, S.daily[dayKey()] || 0)) / S.dailyGoal)}%`);
    if (L.strong.length) lines.push(`Strong: ${L.strong.map((x) => x.label).join(", ")}`);
    if (L.weak.length) lines.push(`Needs work: ${L.weak.map((x) => x.label).join(", ")}`);
    return lines.join("\n");
  }
  async function shareText(text) {
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
  }

  /* =============================== SETTINGS =============================== */
  function renderSettings() {
    modal(`
      <h2 style="margin-bottom:10px">Settings</h2>
      <div class="field" style="margin-bottom:6px"><label class="eyebrow" for="nm">Your name (for reports)</label><input id="nm" maxlength="40" value="${esc(S.name)}" placeholder="e.g. Aarav" /></div>
      <div class="setting-row"><div><b>Sound effects</b><div class="faint">Chimes, buzzers, bonus fanfare</div></div><button class="toggle ${S.sound ? "on" : ""}" data-act="toggle-sound-set" aria-pressed="${S.sound}" aria-label="Sound"></button></div>
      <div class="setting-row" style="display:block"><b>Daily GP goal</b>
        <div class="chips" style="margin-top:8px">${[500, 1000, 2000, 3000].map((g) => `<button class="chip gold ${S.dailyGoal === g ? "on" : ""}" data-act="goal" data-v="${g}">${fmt(g)}</button>`).join("")}</div></div>
      <div class="setting-row"><div><b>Google / Facebook sign-in, global leaderboard, parent app</b><div class="faint">Coming in phase 2. Right now your progress is saved on this device only.</div></div><span class="pill">Soon</span></div>
      <div class="setting-row"><div><b>Reset all progress</b><div class="faint">Clears GP, badges, vault and history on this device</div></div><button class="btn ghost sm" data-act="reset">Reset</button></div>
      <button class="btn primary block" data-act="save-settings" style="margin-top:14px">Done</button>`);
  }

  /* ================================ EVENTS ================================ */
  function renderView() {
    ({ home: renderHome, analysis: renderAnalysis, badges: renderBadges }[view] || renderHome)();
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const act = el.dataset.act, v = el.dataset.v;
    if (act === "modal-bg" && e.target !== el) return; // clicks inside the modal box
    switch (act) {
      case "home": setup = null; renderHome(); break;
      case "exam": S.exam = v; save(); renderHome(); break;
      case "exam-an": S.exam = v; save(); renderAnalysis(); break;
      case "setup": sfx.tap(); renderSetup(v); window.scrollTo(0, 0); break;
      case "subj": setup.subject = v; setup.chapters = new Set(); renderSetup(setup.mode); break;
      case "ch": setup.chapters.has(v) ? setup.chapters.delete(v) : setup.chapters.add(v); renderSetup(setup.mode); break;
      case "all-ch": { const chs = chaptersOf(S.exam, setup.subject); setup.chapters = setup.chapters.size === chs.length ? new Set() : new Set(chs); renderSetup(setup.mode); break; }
      case "len": setup.length = +v; renderSetup(setup.mode); break;
      case "start": startGame(); break;
      case "opt": if (G && G.cur.phase === "play") { G.cur.selected = +v; sfx.tap(); renderGame(); } break;
      case "key": {
        if (!G || G.cur.phase !== "play") break;
        let s = G.cur.numVal;
        if (v === "⌫") s = s.slice(0, -1);
        else if (v === "−") s = s.startsWith("-") ? s.slice(1) : "-" + s;
        else if (v === "." && s.includes(".")) break;
        else s += v;
        G.cur.numVal = s; renderGame(); break;
      }
      case "lock": if (G) resolve("lock"); break;
      case "hint": if (G) useHint(); break;
      case "solution": if (G) resolve("solution"); break;
      case "zoom": modal(`<img src="${esc(v)}" alt="${esc(el.dataset.alt || "Figure")}" class="zoom-img" /><button class="btn ghost block" data-act="close-modal" style="margin-top:12px">Close</button>`); break;
      case "see-sol": if (G) { G.cur.solShown = true; renderGame(); } break;
      case "next": if (G) { G.idx++; nextQuestion(); } break;
      case "quit":
        modal(`<h2>End this session?</h2><p class="muted">Questions answered so far will be saved and analysed.</p><div class="grid cols-2"><button class="btn ghost" data-act="close-modal">Keep playing</button><button class="btn primary" data-act="quit-yes">End session</button></div>`);
        break;
      case "quit-yes":
        closeModal();
        if (G) { if (G.cur && G.cur.phase === "play") { clearInterval(timer); } G.records.length ? finishGame() : (G = null, clearInterval(timer), renderHome()); }
        break;
      case "again": renderSetup(setup ? setup.mode : "mixed"); break;
      case "analysis": renderAnalysis(); break;
      case "badges": renderBadges(); break;
      case "parent-session": shareText(reportText(lastSession)); break;
      case "parent-lifetime": shareText(reportText(null)); break;
      case "share-badge": { const b = BADGES.find((x) => x.id === v); shareText(`${b.icon} I just unlocked "${b.name}" on ProDJEE Arena. ${fmt(S.totalGP)} Gyan Points and counting. Can you beat me?`); break; }
      case "toggle-sound": S.sound = !S.sound; save(); if (view === "game") renderGame(); else renderView(); break;
      case "toggle-sound-set": S.sound = !S.sound; save(); el.classList.toggle("on", S.sound); el.setAttribute("aria-pressed", S.sound); break;
      case "settings": renderSettings(); break;
      case "goal": S.dailyGoal = +v; save(); renderSettings(); break;
      case "save-settings": { const n = $("#nm"); if (n) S.name = n.value.trim(); save(); closeModal(); if (view !== "game") renderView(); break; }
      case "reset":
        modal(`<h2>Reset everything?</h2><p class="muted">This permanently deletes your GP, badges, vault and history on this device.</p><div class="grid cols-2"><button class="btn ghost" data-act="settings">Cancel</button><button class="btn primary" data-act="reset-yes">Yes, reset</button></div>`);
        break;
      case "reset-yes": { const keep = { name: S.name, sound: S.sound }; S = Object.assign(fresh(), keep); save(); closeModal(); renderHome(); break; }
      case "close-modal": case "modal-bg": closeModal(); break;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (overlay.innerHTML && e.key === "Escape") return closeModal();
    if (view !== "game" || !G || overlay.innerHTML) return;
    if (e.target && e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return; // native click handles it
    const c = G.cur, inNum = e.target && e.target.id === "num";
    if (c.phase === "done") { if (e.key === "Enter") { G.idx++; nextQuestion(); } return; }
    if (e.key === "Enter") { const b = $('[data-act="lock"]'); if (b && !b.disabled) resolve("lock"); return; }
    if (inNum) return;
    const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 };
    const k = e.key.toLowerCase();
    if (c.q.type === "mcq" && k in map) { c.selected = c.order[map[k]]; sfx.tap(); renderGame(); }
    else if (k === "h") useHint();
  });

  // Closing the tab mid-session still saves what was played, so the next open shows the full history.
  window.addEventListener("pagehide", () => { if (G && G.records.length) commitSession(); });

  /* ================================= BOOT ================================= */
  renderHome();
  welcomeBack();
})();
