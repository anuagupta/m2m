/* ProDJEE Arena: gamified JEE Main / NEET practice. Local-first (v1). */
(() => {
  "use strict";

  /* ================================ CONFIG ================================ */
  const RULES = {
    startGP: 200, floorGP: 50,   // countdown 200 → 50 at 1 GP/sec
    graceSec: 15,                // at the floor: auto-skip after this many seconds
    wrong: -50, hint: -50, hintSec: 10, solution: -150,
    bonusEvery: 5, bonusSec: 25, bonusRight: 300, bonusWrong: -100,
    numTolerance: 0.01
  };
  const SUBJECTS = { JEE: ["Physics", "Chemistry", "Mathematics"], NEET: ["Physics", "Chemistry", "Biology"] };
  const RANKS = [
    { name: "Aspirant", gp: 0 }, { name: "Challenger", gp: 2000 }, { name: "Achiever", gp: 6000 },
    { name: "Ranker", gp: 15000 }, { name: "Topper", gp: 30000 }, { name: "AIR-100", gp: 60000 }, { name: "AIR-1", gp: 100000 }
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
  const VAULT_STEPS_DAYS = [1, 3, 7];

  /* ================================ STORAGE =============================== */
  const STORE_KEY = "prodjee.arena.v1";
  const fresh = () => ({
    name: "", exam: "JEE", sound: true, dailyGoal: 1000, pyqOnly: false, lastLength: 10,
    totalGP: 0, ratings: {}, stats: {}, seen: {}, vault: {}, vaultCleared: 0,
    daily: {}, streak: { count: 0, last: "", best: 0 }, badges: {},
    counters: { correct: 0, bonusCorrect: 0, numCorrect: 0, sessions: 0 }, sessions: []
  });
  let S = fresh();
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) S = Object.assign(fresh(), JSON.parse(raw)); } catch (e) {}
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) {} };
  // Shared ProDJEE account: default the report name to the Google name; reload if Drive brings newer progress.
  if (window.PJ) {
    PJ.onChange((u) => { if (u && !S.name && u.displayName) { S.name = u.displayName.trim(); save(); } });
    PJ.onRemoteData((keys) => { if (keys.indexOf(STORE_KEY) >= 0) location.reload(); });
  }

  /* ================================ HELPERS =============================== */
  const $ = (sel) => document.querySelector(sel);
  const app = $("#app"), overlay = $("#overlay"), fx = $("#fx"), layer = $("#layer");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Math.round(n).toLocaleString("en-IN");
  const signed = (n) => (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n));
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const chKey = (q) => `${q.exam}|${q.subject}|${q.chapter}`;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pct = (c, a) => (a ? Math.round((100 * c) / a) : 0);
  const kindOf = (q) => q.kind || (q.source && !/^Sample/.test(q.source) ? "pyq" : "sample");
  const isPYQ = (q) => kindOf(q) === "pyq";
  const byId = Object.fromEntries(window.QBANK.map((q) => [q.id, q]));
  const bank = (exam, pyq = false) => window.QBANK.filter((q) => q.exam === exam && (!pyq || isPYQ(q)));
  const chaptersOf = (exam, subject, pyq) => [...new Set(bank(exam, pyq).filter((q) => q.subject === subject).map((q) => q.chapter))].sort();
  const rankFor = (gp) => {
    let i = 0; RANKS.forEach((r, k) => { if (gp >= r.gp) i = k; });
    const next = RANKS[i + 1];
    return { i, cur: RANKS[i], next, prog: next ? (gp - RANKS[i].gp) / (next.gp - RANKS[i].gp) : 1 };
  };
  const liveStreak = () => { const { last, count } = S.streak; return last === dayKey() || last === dayKey(daysAgo(1)) ? count : 0; };
  const vaultIds = (exam) => Object.keys(S.vault).filter((id) => byId[id] && byId[id].exam === exam);
  const vaultDue = (exam) => vaultIds(exam).filter((id) => S.vault[id].due <= Date.now());
  const dueIn = (t) => { const h = (t - Date.now()) / 36e5; return h < 1 ? "in <1 h" : h < 24 ? `in ~${Math.round(h)} h` : `in ${Math.round(h / 24)} day${Math.round(h / 24) > 1 ? "s" : ""}`; };
  const greeting = () => { const h = new Date().getHours(); return h < 5 ? "Burning the midnight oil" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

  // Maths typesetting ($…$ inline, $$…$$ display) once KaTeX has loaded; plain text still works without it.
  const typeset = (el = app) => {
    pyqHydrate(el);
    if (!window.renderMathInElement || !el) return;
    try { window.renderMathInElement(el, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }], throwOnError: false }); } catch (e) {}
  };
  window.addEventListener("load", () => typeset());

  // Published build only: PYQ figures live in per-shift bundles (pyqfig/<shift>.js) and are loaded on first use.
  const BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
  const pyqData = (k) => (window.PYQFIG || {})[k];
  const imgSrc = (src) => src && src.startsWith("pyqfig:") ? pyqData(src.slice(7)) || BLANK : src;
  const imgAttr = (src) => src.startsWith("pyqfig:") ? `data-pyq="${esc(src.slice(7))}" src="${esc(imgSrc(src))}"` : `src="${esc(src)}"`;
  const pyqLoaded = {};
  const pyqHydrate = (el) => {
    if (!el || !el.querySelectorAll) return;
    el.querySelectorAll("img[data-pyq]").forEach((img) => {
      const k = img.dataset.pyq, d = pyqData(k);
      if (d) { img.src = d; img.removeAttribute("data-pyq"); return; }
      const b = k.split("-").slice(0, 2).join("-");
      if (pyqLoaded[b]) return;
      pyqLoaded[b] = true;
      const sc = document.createElement("script"); sc.src = `pyqfig/${b}.js`; sc.onload = () => pyqHydrate(document.body); document.head.appendChild(sc);
    });
  };

  // Animated number count-up for elements with data-count
  const countUp = (root = app) => root.querySelectorAll("[data-count]").forEach((el) => {
    const to = +el.dataset.count, from = +(el.dataset.from || 0), t0 = performance.now(), dur = 900;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (el.dataset.sign ? signed : fmt)(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });

  /* ================================= SOUND / HAPTICS ================================ */
  let actx = null;
  const tone = (freq, dur = 0.12, type = "sine", vol = 0.12, delay = 0) => {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  };
  const buzz = (p) => { if (S.sound && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };
  const sfx = {
    correct: () => { tone(660, 0.12, "triangle"); tone(880, 0.12, "triangle", 0.12, 0.09); tone(1320, 0.22, "triangle", 0.12, 0.18); buzz(35); },
    wrong: () => { tone(200, 0.28, "sawtooth", 0.07); tone(150, 0.3, "sawtooth", 0.06, 0.1); buzz([60, 50, 60]); },
    tick: () => tone(1100, 0.04, "square", 0.04),
    hint: () => tone(520, 0.18, "sine", 0.1),
    bonus: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "triangle", 0.11, i * 0.08)); buzz([30, 40, 30]); },
    badge: () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, "sine", 0.1, i * 0.1)),
    tap: () => tone(700, 0.03, "sine", 0.05)
  };
  const confetti = (n = 36) => {
    const cols = ["#ffc21a", "#ffe07a", "#e11d3f", "#ff4d6d", "#22e58a", "#ffffff"];
    for (let i = 0; i < n; i++) {
      const c = document.createElement("i"); c.className = "cf";
      const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 260;
      c.style.cssText = `background:${cols[i % cols.length]};--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r + 180}px;--rot:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 0.08}s`;
      fx.appendChild(c); setTimeout(() => c.remove(), 1400);
    }
  };

  /* ================================= ICONS ================================ */
  const svg = (p, sw = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const I = {
    home: svg('<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
    play: svg('<path d="M7 4v16l13-8z" fill="currentColor"/>'),
    vault: svg('<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5V7M12 17v-1.5M15.5 12H17M7 12h1.5"/>'),
    stats: svg('<path d="M3 3v18h18"/><path d="M7 15v3M12 10v8M17 6v12"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'),
    bolt: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
    target: svg('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
    trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
    share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>'),
    back: svg('<path d="M15 18l-6-6 6-6"/>'),
    close: svg('<path d="M18 6 6 18M6 6l12 12"/>'),
    soundOn: svg('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    soundOff: svg('<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m23 9-6 6M17 9l6 6"/>'),
    flame: svg('<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 2-5 5-5 8 0 4 3 7 7 7z"/>'),
    atom: svg('<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>'),
    flask: svg('<path d="M9 3h6M10 3v6L4 19a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-10V3"/><path d="M7 15h10"/>'),
    sigma: svg('<path d="M18 4H6l6 8-6 8h12"/>'),
    leaf: svg('<path d="M11 20A7 7 0 0 1 4 13c0-6 7-10 16-10 0 9-4 16-10 16z"/><path d="M4 21c4-4 8-7 12-9"/>')
  };
  const SUBJ_ICON = { Physics: I.atom, Chemistry: I.flask, Mathematics: I.sigma, Biology: I.leaf };
  const gradDefs = '<defs><linearGradient id="gpg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe07a"/><stop offset=".5" stop-color="#ffc21a"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>';
  const ring = (size, stroke, frac, label) => {
    const r = (size - stroke) / 2, C = 2 * Math.PI * r;
    return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${gradDefs}
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}" fill="none"/>
      <circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="url(#gpg)" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - Math.max(0, Math.min(1, frac)))}"/></svg>
      <div class="ring-label">${label}</div></div>`;
  };
  const animateRings = (root = app) => requestAnimationFrame(() => root.querySelectorAll("circle.fg[data-off]").forEach((c) => { c.style.strokeDashoffset = c.dataset.off; }));

  /* ============================== SHELL / NAV ============================= */
  let tab = "home", view = "home";
  const TABS = [["home", "Home", I.home], ["play", "Play", I.play], ["vault", "Vault", I.vault], ["stats", "Stats", I.stats], ["profile", "Profile", I.user]];
  const brand = () => `<div class="brand"><img src="logo.png" alt="ProDJEE logo" /><div><div class="name">ProDJEE <span>Arena</span></div><div class="sub">Gamified PYQ practice</div></div></div>`;
  function renderNav() {
    const due = vaultDue(S.exam).length;
    $("#tabbar").innerHTML = TABS.map(([id, label, ic]) => id === "play"
      ? `<button class="tab play-tab ${tab === id ? "on" : ""}" data-act="tab" data-v="${id}" aria-label="Play"><span class="play-dot">${ic}</span></button>`
      : `<button class="tab ${tab === id ? "on" : ""}" data-act="tab" data-v="${id}" ${tab === id ? 'aria-current="page"' : ""}>${ic}<span>${label}</span>${id === "vault" && due ? `<span class="dot-badge">${due}</span>` : ""}</button>`).join("");
    $("#sidenav").innerHTML = brand() + TABS.map(([id, label, ic]) => `<button class="side-link ${tab === id ? "on" : ""}" data-act="tab" data-v="${id}">${ic}${label}${id === "vault" && due ? `<span class="dot-badge">${due}</span>` : ""}</button>`).join("") +
      `<div class="side-foot">${window.QBANK.filter(isPYQ).length} verified PYQs · saved on this device + your Google Drive</div>`;
  }
  const appbar = (title) => `
    <header class="appbar">
      ${title ? `<h1 style="font-size:24px">${title}</h1>` : brand()}
      <div class="chips-row">
        <div class="seg" role="tablist" aria-label="Exam">${["JEE", "NEET"].map((e) => `<button role="tab" aria-selected="${S.exam === e}" class="${S.exam === e ? "on" : ""}" data-act="exam" data-v="${e}">${e}</button>`).join("")}</div>
        <button class="icon-btn" data-act="toggle-sound" aria-label="${S.sound ? "Mute" : "Unmute"}">${S.sound ? I.soundOn : I.soundOff}</button>
      </div>
    </header>`;
  function show(html, opts = {}) {
    document.body.classList.toggle("immersive", !!opts.immersive);
    if (!opts.immersive) document.body.classList.remove("bonus");
    app.innerHTML = `<div class="view">${html}</div>`;
    layer.innerHTML = opts.layer || "";
    renderNav(); countUp(); animateRings(); typeset(); typeset(layer);
    if (!opts.keepScroll) window.scrollTo(0, 0);
  }
  const toast = (html, ms = 2600) => {
    let box = $("#toasts"); if (!box) { box = document.createElement("div"); box.id = "toasts"; box.className = "toasts"; document.body.appendChild(box); }
    const t = document.createElement("div"); t.className = "toast pill gold"; t.innerHTML = html; box.appendChild(t); setTimeout(() => t.remove(), ms);
  };
  const modal = (html) => { overlay.innerHTML = `<div class="modal-back" data-act="modal-bg"><div class="modal glass" role="dialog" aria-modal="true">${html}</div></div>`; typeset(overlay); };
  const closeModal = () => { overlay.innerHTML = ""; };
  const note = () => { const n = window.QBANK.filter(isPYQ).length, pr = window.QBANK.filter((q) => kindOf(q) === "practice").length; return `<p class="note">Question bank: ${n} previous-year questions · ${pr} practice questions · ${window.QBANK.length - n - pr} samples.</p>`; };

  /* ================================= HOME ================================= */
  function renderHome() {
    tab = "home"; view = "home";
    const r = rankFor(S.totalGP), today = Math.max(0, S.daily[dayKey()] || 0), goalP = Math.min(1, today / S.dailyGoal);
    const streak = liveStreak(), due = vaultDue(S.exam).length;
    const week = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
    const subj = SUBJECTS[S.exam].map((s) => {
      const rows = Object.entries(S.stats).filter(([k]) => k.startsWith(`${S.exam}|${s}|`));
      const att = rows.reduce((a, [, v]) => a + v.att, 0), cor = rows.reduce((a, [, v]) => a + v.cor, 0);
      return { s, att, cor, n: bank(S.exam).filter((q) => q.subject === s).length };
    });
    const got = BADGES.filter((b) => S.badges[b.id]);
    show(`
      ${appbar()}
      <div class="greet"><div class="eyebrow">${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}</div>
        <h1>Ready for today\u2019s run?</h1></div>
      <section class="hero">
        <div class="glass hero-gp">
          <div class="eyebrow">Total Gyan Points</div>
          <div class="big-gp num gold-text" data-count="${S.totalGP}">0</div>
          <div class="chips-row" style="margin-top:12px;justify-content:space-between">
            <span class="pill accent">${I.trophy.replace("<svg", '<svg width="14" height="14"')} ${r.cur.name}</span>
            <span class="faint">${r.next ? `${fmt(r.next.gp - S.totalGP)} GP to ${r.next.name}` : "Top rank reached"}</span>
          </div>
          <div class="rank-bar"><i style="width:${(r.prog * 100).toFixed(1)}%"></i></div>
        </div>
        <div class="glass">
          <div class="goal">
            ${ring(96, 9, goalP, `<div><b class="num" style="font-size:19px">${Math.round(goalP * 100)}%</b><br><span class="faint">today</span></div>`)}
            <div style="min-width:0">
              <div class="eyebrow">Daily goal</div>
              <div class="num" style="font-size:19px">${fmt(today)} <span class="muted" style="font-size:13px;font-weight:600">/ ${fmt(S.dailyGoal)} GP</span></div>
              <div class="chips-row" style="margin-top:6px"><span class="pill gold">🔥 ${streak}-day streak</span></div>
            </div>
          </div>
          <div class="week-dots">${week.map((d) => { const k = dayKey(d), v = S.daily[k]; return `<span><i class="${v >= S.dailyGoal ? "hit" : v !== undefined ? "played" : ""} ${k === dayKey() ? "today" : ""}">${v >= S.dailyGoal ? "✓" : ""}</i>${d.toLocaleDateString("en-IN", { weekday: "narrow" })}</span>`; }).join("")}</div>
        </div>
      </section>
      <button class="cta" data-act="quick-play">
        <span class="play-ico">${I.play}</span>
        <span><b>Play ${S.exam} Arena</b><small>${S.lastLength} adaptive questions · every 5th is a bonus</small></span>
        <span class="arrow">›</span>
      </button>
      ${due ? `<button class="glass press mode" style="margin-top:12px" data-act="setup" data-v="vault"><span class="ico" style="color:var(--gold)">${I.vault}</span><span><h3>${due} mistake${due > 1 ? "s" : ""} due for revision</h3><p>Master them to clear the vault and earn badges.</p></span><span class="pill crimson count">Revise</span></button>` : ""}
      <div class="section-title"><h3>Your subjects</h3><button class="link" data-act="tab" data-v="stats">Full analysis ›</button></div>
      <div class="subj-grid">${subj.map((x) => `
        <button class="glass press subj" data-act="subject" data-v="${x.s}">
          ${ring(58, 6, x.att ? x.cor / x.att : 0, `<span style="color:var(--text-2)">${SUBJ_ICON[x.s].replace("<svg", '<svg width="20" height="20"')}</span>`)}
          <span class="meta"><b>${x.s}</b><span>${x.att ? `${pct(x.cor, x.att)}% accuracy · ${x.att} attempted` : `${x.n} questions · not started`}</span></span>
        </button>`).join("")}</div>
      <div class="section-title"><h3>Badges</h3><button class="link" data-act="tab" data-v="profile">${got.length}/${BADGES.length} ›</button></div>
      <div class="badge-strip">${BADGES.map((b) => `<div class="medal ${S.badges[b.id] ? "" : "locked"}" title="${b.name}: ${b.desc}">${b.icon}</div>`).join("")}</div>
      ${note()}`);
  }

  /* ================================= PLAY ================================= */
  function renderPlay() {
    tab = "play"; view = "play";
    const due = vaultDue(S.exam).length, all = vaultIds(S.exam).length;
    show(`
      ${appbar("Play")}
      <div class="tile-row">
        <button class="glass press mode" data-act="setup" data-v="mixed"><span class="ico" style="color:var(--gold)">${I.bolt}</span><span><h3>Mixed Arena</h3><p>Adaptive questions across the full ${S.exam} syllabus. Difficulty follows your level in each chapter.</p></span></button>
        <button class="glass press mode" data-act="setup" data-v="chapter"><span class="ico" style="color:var(--gold)">${I.target}</span><span><h3>Chapter Practice</h3><p>Pick a subject and chapters. Drill weak spots until they turn green.</p></span></button>
        <button class="glass press mode" data-act="setup" data-v="vault"><span class="ico" style="color:var(--gold)">${I.vault}</span><span><h3>Mistake Vault</h3><p>${all ? `${all} saved · ${due} due now` : "Wrong, skipped and solution-viewed questions return here."}</p></span>${due ? `<span class="pill crimson count">${due}</span>` : ""}</button>
      </div>
      <div class="section-title"><h3>Rules of the Arena</h3></div>
      <div class="glass">
        <div class="bars" style="gap:10px;font-size:13.5px">
          <div>⏱ GP counts down <b class="gold-text">${RULES.startGP} → ${RULES.floorGP}</b> at 1 per second. Answer right to bank what's on the clock.</div>
          <div>❌ Wrong answer <b class="crimson-text">${RULES.wrong}</b> · 💡 Hint <b class="crimson-text">${RULES.hint}</b> (clock frozen ${RULES.hintSec}s) · 📖 Solution <b class="crimson-text">${RULES.solution}</b></div>
          <div>⚡ Every ${RULES.bonusEvery}th question is a <b class="gold-text">BONUS</b>: ${RULES.bonusSec}s, +${RULES.bonusRight} / ${RULES.bonusWrong}, no hints.</div>
          <div>⌛ At ${RULES.floorGP} GP you get ${RULES.graceSec}s more, then the question is skipped.</div>
        </div>
      </div>
      ${note()}`);
  }

  /* ================================= SETUP ================================ */
  let setup = null;
  function renderSetup(mode, subject) {
    const wasSetup = view === "setup"; view = "setup";
    if (!setup || setup.mode !== mode || setup.exam !== S.exam || subject) setup = { mode, exam: S.exam, subject: subject || SUBJECTS[S.exam][0], chapters: new Set(), length: S.lastLength || 10 };
    const titles = { mixed: "Mixed Arena", chapter: "Chapter Practice", vault: "Mistake Vault" };
    let body = "";
    if (mode === "chapter") {
      const chs = chaptersOf(S.exam, setup.subject, S.pyqOnly);
      body = `
        <div class="eyebrow">Subject</div>
        <div class="chips" style="margin:8px 0 16px">${SUBJECTS[S.exam].map((s) => `<button class="chip ${setup.subject === s ? "on" : ""}" data-act="subj" data-v="${s}">${s}</button>`).join("")}</div>
        <div class="chips-row" style="justify-content:space-between"><div class="eyebrow">Chapters</div><button class="link" data-act="all-ch">${setup.chapters.size === chs.length && chs.length ? "Clear" : "Select all"}</button></div>
        <div class="chips" style="margin:8px 0 16px">${chs.map((c) => {
          const st = S.stats[`${S.exam}|${setup.subject}|${c}`], n = bank(S.exam, S.pyqOnly).filter((q) => q.subject === setup.subject && q.chapter === c).length;
          return `<button class="chip ${setup.chapters.has(c) ? "on" : ""}" data-act="ch" data-v="${esc(c)}">${esc(c)}<small>${st ? pct(st.cor, st.att) + "%" : n + " Q"}</small></button>`;
        }).join("") || '<span class="faint">No chapters with questions yet.</span>'}</div>`;
    } else if (mode === "vault") {
      const all = vaultIds(S.exam).length, due = vaultDue(S.exam).length;
      body = `<p class="muted" style="margin-top:0">${all ? `<b>${all}</b> question${all > 1 ? "s" : ""} in your ${S.exam} vault, <b class="crimson-text">${due}</b> due now. Get each right at every spaced step (1 → 3 → 7 days) to master it.` : "Your vault is empty. Wrong, skipped and solution-viewed questions will appear here."}</p>`;
    } else {
      body = `<p class="muted" style="margin-top:0">Questions across all ${S.exam} subjects, matched to your level in each chapter. Every ${RULES.bonusEvery}th question is a <b class="gold-text">BONUS</b>.</p>`;
    }
    const pool = poolFor(setup);
    show(`
      <div class="narrow">
        <button class="back" data-act="tab" data-v="${tab}">${I.back} Back</button>
        <div class="glass" style="margin-top:12px;padding:22px">
          <div class="eyebrow">${S.exam} · Setup</div>
          <h1 style="margin:4px 0 16px">${titles[mode]}</h1>
          ${body}
          <div class="eyebrow">Session length</div>
          <div class="chips" style="margin:8px 0 6px">${[10, 20, 30].map((n) => `<button class="chip gold ${setup.length === n ? "on" : ""}" data-act="len" data-v="${n}">${n} questions</button>`).join("")}</div>
          ${mode !== "vault" ? `<div class="setting-row"><div><b>Real PYQs only</b><div class="faint">Skip practice samples; play only verified previous-year questions</div></div><button class="toggle ${S.pyqOnly ? "on" : ""}" data-act="pyq" aria-pressed="${S.pyqOnly}" aria-label="PYQs only"></button></div>` : ""}
          <button class="btn primary block" style="margin-top:16px" data-act="start" ${pool.length ? "" : "disabled"}>
            ${pool.length ? `${I.play.replace("<svg", '<svg width="18" height="18"')} Start · ${Math.min(pool.length, setup.length)} questions` : mode === "chapter" ? "Select at least one chapter" : "Nothing to play yet"}
          </button>
          ${pool.length && pool.length < setup.length ? `<p class="faint" style="text-align:center;margin-bottom:0">Only ${pool.length} matching questions in the bank right now.</p>` : ""}
        </div>
      </div>`, { immersive: true, keepScroll: wasSetup });
  }
  function poolFor(cfg) {
    let p = bank(cfg.exam, cfg.mode !== "vault" && S.pyqOnly);
    if (cfg.mode === "chapter") p = p.filter((q) => q.subject === cfg.subject && cfg.chapters.has(q.chapter));
    if (cfg.mode === "vault") { const ids = new Set(vaultIds(cfg.exam)); p = p.filter((q) => ids.has(q.id)); }
    return p;
  }

  /* ============================ ADAPTIVE ENGINE =========================== */
  const qRating = (q) => 800 + 200 * (q.difficulty || 3);
  const sRating = (q) => S.ratings[chKey(q)] || 1200;
  function updateRating(q, score) {
    const s = sRating(q), e = 1 / (1 + Math.pow(10, (qRating(q) - s) / 400));
    S.ratings[chKey(q)] = Math.max(600, Math.min(2400, Math.round(s + 40 * (score - e))));
  }
  // Splits `length` slots as evenly as possible across every chapter that
  // has at least one question in `pool` (round-robin, so nobody's quota
  // depends on draw order), then shuffles the resulting sequence. A soft
  // scoring penalty isn't enough here: some chapters' questions skew hard
  // or easy as a group, so on pure difficulty-match they'd rarely win
  // regardless of penalty. A hard quota guarantees every selected chapter
  // actually shows up close to its fair share.
  function buildChapterQueue(pool, length, chapterList) {
    const remaining = {};
    chapterList.forEach((c) => { remaining[c] = pool.filter((q) => q.chapter === c).length; });
    const active = chapterList.filter((c) => remaining[c] > 0);
    if (!active.length) return null;
    const queue = [];
    while (queue.length < length) {
      let progressed = false;
      for (const c of active) {
        if (queue.length >= length) break;
        if (remaining[c] > 0) { queue.push(c); remaining[c]--; progressed = true; }
      }
      if (!progressed) break; // every chapter's supply exhausted
    }
    return shuffle(queue);
  }
  function pickNext(targetChapter) {
    const isBonus = (G.idx + 1) % RULES.bonusEvery === 0;
    let cands = G.pool.filter((q) => !G.used.has(q.id));
    if (!cands.length) return null;
    if (targetChapter) { const inCh = cands.filter((q) => q.chapter === targetChapter); if (inCh.length) cands = inCh; }
    if (isBonus) { const mcq = cands.filter((q) => q.type === "mcq"); if (mcq.length) cands = mcq; }
    const now = Date.now(); let best = null, bestScore = Infinity;
    cands.forEach((q) => {
      let sc = Math.abs(qRating(q) - (sRating(q) + (isBonus ? -100 : 60))) + Math.random() * 160 + (S.seen[q.id] || 0) * 120;
      const v = S.vault[q.id]; if (v && v.due <= now) sc -= G.mode === "vault" ? 1000 : 120;
      if (sc < bestScore) { bestScore = sc; best = q; }
    });
    return { q: best, isBonus };
  }

  /* ================================= GAME ================================= */
  // Numerical check: absolute ±0.01 by default; `tolPct` allows a relative tolerance for rounded decimal answers.
  const numOk = (x, q) => { const a = Number(q.answer); if (!isFinite(x)) return false; const tol = q.tolPct ? Math.abs(a) * q.tolPct / 100 : RULES.numTolerance; return Math.abs(x - a) <= Math.max(tol, RULES.numTolerance); };
  let G = null, timer = null;
  // A quiz in progress guards the browser/hardware back button: without a
  // history entry of its own, pressing back has nothing Arena-related to
  // consume, so it falls straight through to whatever page opened Arena
  // (e.g. the profile page) with no chance to confirm. armGuard() pushes a
  // sentinel entry when a quiz starts; the popstate listener below
  // intercepts back on that entry and asks before actually leaving.
  // disarmGuard() removes the sentinel once the quiz ends on its own, so a
  // later back press isn't left needing an extra, pointless press.
  let guardActive = false;
  function armGuard() { if (guardActive) return; guardActive = true; history.pushState({ pjArenaGuard: true }, "", location.href); }
  function disarmGuard() { if (!guardActive) return; guardActive = false; history.back(); }
  window.addEventListener("popstate", () => {
    if (!guardActive) return;
    // The browser has already completed the back-navigation past our
    // sentinel by the time this fires (that's what popstate reports).
    // Confirmed: accept it and just fall back to Arena's own home tab -
    // nothing left to undo. Cancelled: push the sentinel straight back on
    // so the next back press is guarded again too.
    if (window.confirm("Leave this test? Your progress on this attempt will be lost.")) {
      guardActive = false;
      clearInterval(timer); document.body.classList.remove("bonus");
      G = null; view = "home"; tab = "home";
      renderTab();
    } else {
      history.pushState({ pjArenaGuard: true }, "", location.href);
    }
  });
  function startGame() {
    const pool = poolFor(setup); if (!pool.length) return;
    S.lastLength = setup.length; save();
    const length = Math.min(setup.length, pool.length);
    G = { exam: setup.exam, mode: setup.mode, pool, length, idx: 0, used: new Set(), records: [], sessionGP: 0, streakRun: 0, bestRun: 0, cur: null, newBadges: [] };
    armGuard();
    // Multi-chapter tests get a fixed per-chapter quota; single-chapter and
    // other modes (mixed/vault) pick purely by difficulty match as before.
    G.chapterQueue = (setup.mode === "chapter" && setup.chapters.size > 1) ? buildChapterQueue(pool, length, [...setup.chapters]) : null;
    nextQuestion();
  }
  function nextQuestion() {
    if (G.idx >= G.length) return finishGame();
    const pick = pickNext(G.chapterQueue ? G.chapterQueue[G.idx] : null); if (!pick) return finishGame();
    G.used.add(pick.q.id);
    G.cur = { q: pick.q, isBonus: pick.isBonus, order: shuffle([0, 1, 2, 3]), gp: RULES.startGP, bonusLeft: RULES.bonusSec, grace: null, time: 0,
      hintUsed: false, hintLeft: 0, solShown: false, selected: null, numVal: "", phase: "play", result: null, delta: 0 };
    document.body.classList.toggle("bonus", pick.isBonus);
    if (pick.isBonus) sfx.bonus();
    view = "game"; renderGame(true);
    clearInterval(timer); timer = setInterval(tick, 1000);
  }
  function tick() {
    const c = G && G.cur; if (!c || c.phase !== "play") return;
    c.time++;
    if (c.isBonus) { c.bonusLeft--; if (c.bonusLeft <= 5 && c.bonusLeft > 0) sfx.tick(); if (c.bonusLeft <= 0) return resolve("timeout"); }
    else if (c.hintLeft > 0) { c.hintLeft--; if (c.hintLeft === 0) { const h = $("#hint-box"); if (h) h.remove(); } }
    else if (c.gp > RULES.floorGP) { c.gp--; if (c.gp === RULES.floorGP) c.grace = RULES.graceSec; }
    else { c.grace--; if (c.grace <= 3 && c.grace > 0) sfx.tick(); if (c.grace <= 0) return resolve("skip"); }
    paintClock();
  }
  function orb() {
    const c = G.cur, C = 2 * Math.PI * 56;
    const frac = c.isBonus ? c.bonusLeft / RULES.bonusSec : (c.gp - RULES.floorGP) / (RULES.startGP - RULES.floorGP);
    const lbl = c.isBonus ? "SECONDS" : c.hintLeft > 0 ? "FROZEN" : "GYAN PTS";
    const low = c.isBonus ? c.bonusLeft <= 5 : c.grace !== null;
    return `<div class="orb ${c.hintLeft > 0 ? "frozen" : ""} ${low && c.phase === "play" ? "low" : ""}" id="orb" role="timer">
      <svg viewBox="0 0 124 124">${gradDefs}<circle cx="62" cy="62" r="56" stroke="rgba(255,255,255,.08)" stroke-width="9" fill="rgba(0,0,0,.3)"/>
        <circle cx="62" cy="62" r="56" stroke="url(#gpg)" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - Math.max(0, frac))}" style="transition:stroke-dashoffset 1s linear"/></svg>
      <div class="val"><div><b class="num ${c.isBonus ? "crimson-text" : "gold-text"}">${c.isBonus ? c.bonusLeft : c.gp}</b><small>${lbl}</small></div></div></div>`;
  }
  function paintClock() {
    const o = $("#orb"); if (o) o.outerHTML = orb();
    const g = $("#grace"); if (g) g.textContent = G.cur.grace !== null && G.cur.phase === "play" ? `Auto-skip in ${G.cur.grace}s` : "";
  }
  const fig = (src, alt) => src ? `<figure class="q-fig" data-act="zoom" data-v="${esc(src)}" data-alt="${esc(alt || "Figure")}" title="Tap to zoom"><img ${imgAttr(src)} alt="${esc(alt || "Figure")}" loading="lazy" /></figure>` : "";
  const optHTML = (o, pos) => typeof o === "string" ? `<span>${esc(o)}</span>`
    : `<span class="opt-body">${o.img ? `<img class="opt-img" ${imgAttr(o.img)} alt="${esc(o.alt || o.text || `Option ${"ABCD"[pos]}`)}" loading="lazy" />` : ""}${o.text ? `<span>${esc(o.text)}</span>` : ""}</span>`;
  const allImgOpts = (q) => q.options && q.options.every((o) => typeof o === "object" && o.img);

  function renderGame(fresh) {
    const c = G.cur, q = c.q, done = c.phase === "done", L = "ABCD";
    const seg = Array.from({ length: G.length }, (_, i) => {
      const r = G.records[i], b = (i + 1) % RULES.bonusEvery === 0 ? " b" : "";
      return `<i class="${r ? (r.result === "correct" ? "c" : r.result === "wrong" ? "w" : "s") : i === G.idx ? "now" : ""}${b}"></i>`;
    }).join("");
    let answerUI;
    if (q.type === "mcq") {
      answerUI = `<div class="options ${allImgOpts(q) && !q.wideOpts ? "img-grid" : ""}" role="radiogroup">${c.order.map((oi, pos) => {
        let cls = "";
        if (done) cls = oi === q.answer ? "right" : oi === c.selected ? "wrong" : "dim";
        else if (oi === c.selected) cls = "sel";
        return `<button class="opt ${cls}" role="radio" aria-checked="${oi === c.selected}" data-act="opt" data-v="${oi}" ${done ? "disabled" : ""}><span class="k">${L[pos]}</span>${optHTML(q.options[oi], pos)}</button>`;
      }).join("")}</div>`;
    } else {
      answerUI = `<input class="num-input ${done ? (c.result === "correct" ? "right" : "wrong") : ""}" id="num" inputmode="decimal" autocomplete="off" placeholder="Type your answer" value="${esc(c.numVal)}" ${done ? "disabled" : ""} aria-label="Numerical answer" />
        ${done ? "" : `<div class="keypad">${["7", "8", "9", "⌫", "4", "5", "6", "−", "1", "2", "3", ".", "0"].map((k) => `<button data-act="key" data-v="${k}" ${k === "0" ? 'style="grid-column:span 4"' : ""}>${k}</button>`).join("")}</div>`}`;
    }
    const canAnswer = q.type === "mcq" ? c.selected !== null : c.numVal.trim() !== "";
    const combo = G.streakRun >= 2 ? `<div class="combo">🔥 ${G.streakRun} in a row</div>` : "";
    const html = `
      <div class="game">
        <div class="game-top">
          <button class="icon-btn" data-act="quit" aria-label="End session">${I.close}</button>
          <div class="segbar" aria-label="Progress">${seg}</div>
          <span class="pill ${G.sessionGP < 0 ? "crimson" : "gold"} num" id="sess-gp">${signed(G.sessionGP)}</span>
        </div>
        <div class="game-mid">
          <div class="l">${G.exam} · Q ${G.idx + 1}/${G.length}<br>${combo}</div>
          ${orb()}
          <div class="r"><span class="pill ${isPYQ(q) ? "mint" : kindOf(q) === "practice" ? "gold" : ""}">${isPYQ(q) ? "PYQ" : kindOf(q) === "practice" ? "Practice" : "Sample"}</span></div>
        </div>
        ${c.isBonus ? `<div class="bonus-banner"><div><div class="num gold-text italic" style="font-size:18px">⚡ BONUS QUESTION</div><div class="faint" style="color:var(--text-2)">+${RULES.bonusRight} right · ${RULES.bonusWrong} wrong or timeout · no hints</div></div><span class="num italic" style="font-size:26px">${RULES.bonusSec}s</span></div>` : ""}
        <article class="glass q-card" id="qcard">
          <div class="q-meta">
            <span class="pill">${SUBJ_ICON[q.subject] ? SUBJ_ICON[q.subject].replace("<svg", '<svg width="13" height="13"') : ""} ${esc(q.subject)}</span>
            <span class="pill">${esc(q.chapter)}</span>
            <span class="pill ${q.type === "num" ? "gold" : ""}">${q.type === "num" ? "Numerical" : "Single correct"}</span>
            <span class="pill" title="Difficulty ${q.difficulty}/5">${"●".repeat(q.difficulty)}${"○".repeat(5 - q.difficulty)}</span>
          </div>
          <p class="q-text">${esc(q.q)}</p>
          ${fig(q.img, q.imgAlt)}
          ${answerUI}
          <div id="grace" class="grace" aria-live="polite">${c.grace !== null && !done ? `Auto-skip in ${c.grace}s` : ""}</div>
          ${c.hintLeft > 0 && !done ? `<div class="reveal hint" id="hint-box"><h4>💡 Hint</h4><p>${esc(q.hint)}</p><div class="hint-bar"><i style="animation-duration:${c.hintLeft}s"></i></div></div>` : ""}
          <p class="q-src">${esc(q.source || "Sample (not PYQ)")}</p>
        </article>
      </div>`;
    const dock = done ? sheetHTML() : `
      <div class="dock"><div class="dock-inner">
        <button class="btn ghost" data-act="hint" ${c.isBonus || c.hintUsed ? "disabled" : ""}>💡 Hint <small>${RULES.hint}</small></button>
        <button class="btn ghost" data-act="solution" ${c.isBonus ? "disabled" : ""}>📖 Sol <small>${RULES.solution}</small></button>
        <button class="btn primary" data-act="lock" ${canAnswer ? "" : "disabled"}>Lock answer</button>
      </div></div>`;
    show(html, { immersive: true, keepScroll: !fresh, layer: dock });
    const inp = $("#num");
    if (inp && !done) {
      inp.addEventListener("input", () => { G.cur.numVal = inp.value; const b = $('[data-act="lock"]'); if (b) b.disabled = !inp.value.trim(); });
      if (window.matchMedia("(pointer:fine)").matches) inp.focus();
    }
  }
  function sheetHTML() {
    const c = G.cur, q = c.q, good = c.result === "correct";
    const head = {
      correct: ["✅", good && c.isBonus ? "Bonus cracked!" : c.gp >= RULES.startGP - 10 ? "Lightning fast!" : "Correct!"],
      wrong: ["❌", "Not quite"], timeout: ["⏰", "Time's up"], skip: ["⌛", "Skipped"], solution: ["📖", "Solution viewed"]
    }[c.result];
    const ansText = q.type === "num" ? String(q.answer) : typeof q.options[q.answer] === "string" ? q.options[q.answer] : `Option ${"ABCD"[c.order.indexOf(q.answer)]}`;
    return `<div class="sheet ${good ? "good" : "bad"}" role="dialog" aria-label="Result"><div class="sheet-inner">
      <div class="grab"></div>
      <div class="res"><span class="emo">${head[0]}</span><div><b>${head[1]}</b>${good ? "" : `<span class="faint">Answer: <b style="color:var(--mint)">${esc(ansText)}</b></span>`}</div>
        <span class="delta num ${c.delta >= 0 ? "gold-text" : "crimson-text"}">${signed(c.delta)}</span></div>
      ${c.solShown ? `<div class="sol"><h4>Solution</h4><div>${esc(q.solution)}</div>${fig(q.solutionImg, "Solution figure")}</div>` : ""}
      <div class="acts">
        ${c.solShown ? `<button class="btn ghost" data-act="vault-note" disabled>${good ? "Nice" : "Saved to vault"}</button>` : `<button class="btn ghost" data-act="see-sol">📖 Solution</button>`}
        <button class="btn ${good ? "mint" : "primary"}" data-act="next">${G.idx + 1 >= G.length ? "Finish" : "Next"} →</button>
      </div></div></div>`;
  }
  function floatGP(delta) {
    const f = document.createElement("div"); f.className = `float-gp ${delta >= 0 ? "plus" : "minus"}`; f.textContent = `${signed(delta)} GP`;
    document.body.appendChild(f); setTimeout(() => f.remove(), 1300);
  }
  function useHint() {
    const c = G.cur; if (c.phase !== "play" || c.isBonus || c.hintUsed) return;
    c.hintUsed = true; c.hintLeft = RULES.hintSec; c.delta += RULES.hint; G.sessionGP += RULES.hint;
    sfx.hint(); floatGP(RULES.hint); renderGame();
  }
  function resolve(outcome) {
    const c = G.cur, q = c.q; if (c.phase !== "play") return;
    let result, add = 0;
    if (outcome === "lock") {
      const ok = q.type === "mcq" ? c.selected === q.answer : numOk(parseFloat(c.numVal.replace("−", "-")), q);
      result = ok ? "correct" : "wrong"; add = ok ? (c.isBonus ? RULES.bonusRight : c.gp) : (c.isBonus ? RULES.bonusWrong : RULES.wrong);
    } else if (outcome === "timeout") { result = "timeout"; add = RULES.bonusWrong; }
    else if (outcome === "skip") { result = "skip"; }
    else { result = "solution"; add = RULES.solution; c.solShown = true; }
    c.phase = "done"; c.result = result; c.delta += add; G.sessionGP += add;
    clearInterval(timer); document.body.classList.remove("bonus");
    const ok = result === "correct";
    G.records.push({ id: q.id, key: chKey(q), subject: q.subject, chapter: q.chapter, type: q.type, result: ok ? "correct" : result === "timeout" ? "wrong" : result, gp: c.delta, time: c.time, hint: c.hintUsed, bonus: c.isBonus, fast: ok && !c.isBonus && c.gp >= RULES.startGP - 10 });
    S.seen[q.id] = (S.seen[q.id] || 0) + 1;
    updateRating(q, ok ? (c.hintUsed ? 0.6 : 1) : 0);
    const v = S.vault[q.id];
    if (ok && v) {
      if (v.due <= Date.now()) { v.box++; if (v.box >= VAULT_STEPS_DAYS.length) { delete S.vault[q.id]; S.vaultCleared++; toast("🗝️ Mastered: removed from the vault"); } else v.due = Date.now() + VAULT_STEPS_DAYS[v.box - 1] * 864e5; }
    } else if (!ok) S.vault[q.id] = { box: 0, due: Date.now() + 36e5, added: (v && v.added) || Date.now() };
    if (ok) { G.streakRun++; G.bestRun = Math.max(G.bestRun, G.streakRun); S.counters.correct++; if (c.isBonus) S.counters.bonusCorrect++; if (q.type === "num") S.counters.numCorrect++; }
    else G.streakRun = 0;
    save();
    if (ok) { sfx.correct(); confetti(c.isBonus ? 60 : G.streakRun >= 3 ? 48 : 32); } else if (result !== "solution" && result !== "skip") sfx.wrong();
    if (add) floatGP(add);
    checkBadges(false);
    renderGame();
    if (!ok && result !== "solution") { const card = $("#qcard"); if (card) card.classList.add("shake"); }
  }

  /* ================================ BADGES ================================ */
  function award(id) {
    if (S.badges[id]) return; S.badges[id] = Date.now();
    const b = BADGES.find((x) => x.id === id); if (G) G.newBadges.push(id);
    sfx.badge(); toast(`${b.icon} Badge unlocked: <b>${b.name}</b>`, 3200);
  }
  function checkBadges(end) {
    const k = S.counters;
    if (k.correct >= 1) award("first_blood");
    if (G && G.bestRun >= 3) award("hat_trick");
    if (G && G.bestRun >= 10) award("perfect_10");
    if (G && G.records.some((r) => r.fast)) award("speed_demon");
    if (k.bonusCorrect >= 5) award("bonus_hunter");
    if (k.numCorrect >= 10) award("num_ninja");
    if (k.correct >= 100) award("century");
    if (S.vaultCleared >= 5) award("vault_cleaner");
    if (end) {
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
      const b = (byChapter[r.key] = byChapter[r.key] || { att: 0, cor: 0 }); b.att++; if (r.result === "correct") b.cor++;
      const st = (S.stats[r.key] = S.stats[r.key] || { att: 0, cor: 0 }); st.att++; if (r.result === "correct") st.cor++;
    });
    const today = dayKey();
    S.daily[today] = (S.daily[today] || 0) + G.sessionGP;
    S.totalGP = Math.max(0, S.totalGP + G.sessionGP);
    if (S.streak.last !== today) { S.streak.count = S.streak.last === dayKey(daysAgo(1)) ? S.streak.count + 1 : 1; S.streak.last = today; S.streak.best = Math.max(S.streak.best, S.streak.count); }
    S.counters.sessions++;
    const sess = { at: Date.now(), exam: G.exam, mode: G.mode, n: G.records.length, correct: G.records.filter((r) => r.result === "correct").length, gp: G.sessionGP,
      time: G.records.reduce((a, r) => a + r.time, 0), hints: G.records.filter((r) => r.hint).length, solutions: G.records.filter((r) => r.result === "solution").length, bestRun: G.bestRun, byChapter };
    S.sessions.push(sess); if (S.sessions.length > 200) S.sessions = S.sessions.slice(-200);
    checkBadges(true); save();
    return sess;
  }
  function finishGame() {
    clearInterval(timer); document.body.classList.remove("bonus");
    disarmGuard();
    const sess = commitSession();
    if (!sess) { G = null; return renderHome(); }
    const nb = G.newBadges.slice(), rec = G.records.slice(), prevTotal = Math.max(0, S.totalGP - sess.gp);
    G = null; renderResults(sess, nb, rec, prevTotal);
  }
  function barsHTML(rows) {
    if (!rows.length) return `<p class="muted">No attempts yet.</p>`;
    return `<div class="bars">${rows.map((r) => { const p = pct(r.cor, r.att), cls = p >= 75 ? "hi" : p >= 45 ? "mid" : "lo";
      return `<div class="bar-row"><div class="top"><span>${esc(r.label)}</span><span>${r.cor}/${r.att} · ${p}%</span></div><div class="bar-track" role="img" aria-label="${esc(r.label)}: ${r.cor} of ${r.att} correct"><i class="${cls}" style="width:${Math.max(p, 2)}%"></i></div></div>`; }).join("")}</div>
      <div class="legend" style="margin-top:12px"><span><i style="background:var(--mint)"></i>Strong ≥75%</span><span><i style="background:var(--gold)"></i>Building 45–74%</span><span><i style="background:var(--crimson)"></i>Weak &lt;45%</span></div>`;
  }
  const chapterRows = (obj) => Object.entries(obj).map(([k, v]) => ({ key: k, label: k.split("|")[2], subject: k.split("|")[1], att: v.att, cor: v.cor }));
  let lastSession = null;
  function renderResults(sess, newBadges, records, prevTotal) {
    view = "results"; lastSession = sess;
    const acc = pct(sess.correct, sess.n), r = rankFor(S.totalGP), prevRank = rankFor(prevTotal);
    const rows = chapterRows(sess.byChapter).sort((a, b) => pct(a.cor, a.att) - pct(b.cor, b.att));
    const count = (res) => records.filter((x) => x.result === res).length;
    const outs = [["correct", "Correct", "var(--mint)"], ["wrong", "Wrong", "var(--crimson)"], ["skip", "Skipped", "#7c7c8a"], ["solution", "Solution", "var(--gold)"]];
    const head = acc >= 80 ? "Outstanding session." : acc >= 60 ? "Solid work. Keep pushing." : acc >= 40 ? "Good effort. The vault will fix the rest." : "Tough round. Revise the vault and come back.";
    show(`
      <div class="narrow">
        <div class="glass res-hero">
          <div class="eyebrow">Session complete · ${sess.exam}</div>
          <div style="display:flex;justify-content:center;margin-top:14px">${ring(150, 12, acc / 100, `<div><b class="num" style="font-size:36px">${acc}%</b><br><span class="faint">accuracy</span></div>`)}</div>
          <div class="big num ${sess.gp < 0 ? "crimson-text" : "gold-text"}" data-count="${sess.gp}" data-sign="1">0</div>
          <div class="muted">Gyan Points · ${head}</div>
          <div class="chips-row" style="justify-content:center;margin-top:12px;flex-wrap:wrap">
            <span class="pill accent">${r.i > prevRank.i ? "⬆ Ranked up: " : ""}${r.cur.name}</span>
            <span class="pill gold">Total <span data-count="${S.totalGP}" data-from="${prevTotal}">${fmt(prevTotal)}</span> GP</span>
            <span class="pill">🔥 ${liveStreak()}-day streak</span>
          </div>
        </div>
        <div class="spacer"></div>
        <div class="stat-grid">
          <div class="stat"><div class="v">${sess.correct}/${sess.n}</div><div class="l">Correct</div></div>
          <div class="stat"><div class="v">${Math.round(sess.time / sess.n)}s</div><div class="l">Avg time</div></div>
          <div class="stat"><div class="v">${sess.bestRun || 0}</div><div class="l">Best combo</div></div>
          <div class="stat"><div class="v">${sess.hints}/${sess.solutions}</div><div class="l">Hints / Sols</div></div>
        </div>
        <div class="spacer"></div>
        <div class="glass">
          <h3 style="margin-bottom:10px">Outcome split</h3>
          <div style="display:flex;height:14px;border-radius:99px;overflow:hidden;background:rgba(255,255,255,.06)" role="img" aria-label="${outs.map(([k, l]) => `${l} ${count(k)}`).join(", ")}">${outs.map(([k, , col]) => count(k) ? `<i style="width:${(100 * count(k)) / sess.n}%;background:${col}"></i>` : "").join("")}</div>
          <div class="legend" style="margin-top:10px">${outs.map(([k, l, col]) => `<span><i style="background:${col}"></i>${l} ${count(k)}</span>`).join("")}</div>
        </div>
        <div class="spacer"></div>
        <div class="glass"><h3>Chapter-wise: correct / attempted</h3><p class="faint" style="margin:4px 0 14px">Weakest first. Target the red ones in Chapter Practice.</p>${barsHTML(rows)}</div>
        ${newBadges.length ? `<div class="spacer"></div><div class="glass"><h3 style="margin-bottom:12px">New badges</h3>
          <div class="badges">${newBadges.map((id) => { const b = BADGES.find((x) => x.id === id); return `<div class="badge-card"><div class="medal">${b.icon}</div><b>${b.name}</b><span>${b.desc}</span></div>`; }).join("")}</div>
          <button class="btn ghost block" style="margin-top:12px" data-act="share-badge" data-v="${newBadges[newBadges.length - 1]}">${I.share.replace("<svg", '<svg width="18" height="18"')} Share achievement</button></div>` : ""}
        <div class="spacer"></div>
        <div class="grid cols-2">
          <button class="btn gold" data-act="parent-session">${I.share.replace("<svg", '<svg width="18" height="18"')} Send to parents</button>
          <button class="btn primary" data-act="again">Play again</button>
        </div>
        <div class="spacer"></div>
        <button class="btn ghost block" data-act="tab" data-v="home">Done</button>
      </div>`, { immersive: true });
    if (acc >= 80) setTimeout(() => confetti(70), 250);
  }

  /* =============================== STATS ================================== */
  function lifetime(exam) {
    const rows = chapterRows(Object.fromEntries(Object.entries(S.stats).filter(([k]) => k.startsWith(exam + "|"))));
    const att = rows.reduce((a, r) => a + r.att, 0), cor = rows.reduce((a, r) => a + r.cor, 0);
    const rated = rows.filter((r) => r.att >= 2);
    const weak = rated.slice().sort((a, b) => pct(a.cor, a.att) - pct(b.cor, b.att)).slice(0, 3);
    const strong = rated.slice().sort((a, b) => pct(b.cor, b.att) - pct(a.cor, a.att)).filter((r) => pct(r.cor, r.att) >= 60 && !weak.includes(r)).slice(0, 3);
    return { rows, att, cor, weak, strong };
  }
  function weekHTML() {
    const days = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i)), vals = days.map((d) => Math.max(0, S.daily[dayKey(d)] || 0)), max = Math.max(S.dailyGoal, ...vals);
    return `<div class="week" role="img" aria-label="GP over the last 7 days: ${vals.join(", ")}">${days.map((d, i) => `<div class="col"><b>${vals[i] ? fmt(vals[i]) : ""}</b><i class="${vals[i] >= S.dailyGoal ? "goal" : ""}" style="height:${(vals[i] / max) * 80}%"></i><span>${d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2)}</span></div>`).join("")}</div>`;
  }
  function renderStats() {
    tab = "stats"; view = "stats";
    const L = lifetime(S.exam);
    const subjects = SUBJECTS[S.exam].map((s) => ({ s, rows: L.rows.filter((r) => r.subject === s).sort((a, b) => pct(a.cor, a.att) - pct(b.cor, b.att)) }));
    const totals = subjects.map(({ s, rows }) => ({ label: s, att: rows.reduce((a, r) => a + r.att, 0), cor: rows.reduce((a, r) => a + r.cor, 0) })).filter((x) => x.att);
    show(`
      ${appbar("Stats")}
      <div class="stat-grid">
        <div class="stat"><div class="v">${L.att}</div><div class="l">Attempted</div></div>
        <div class="stat"><div class="v">${pct(L.cor, L.att)}%</div><div class="l">Accuracy</div></div>
        <div class="stat"><div class="v gold-text">${fmt(S.totalGP)}</div><div class="l">Total GP</div></div>
        <div class="stat"><div class="v">${S.streak.best}</div><div class="l">Best streak</div></div>
      </div>
      <div class="spacer"></div>
      <div class="split">
        <div class="glass"><h3>Last 7 days · GP</h3><p class="faint" style="margin:4px 0 12px">Glowing bars hit your ${fmt(S.dailyGoal)} GP goal.</p>${weekHTML()}</div>
        <div class="glass"><h3 style="margin-bottom:12px">Subject accuracy</h3>${barsHTML(totals)}</div>
      </div>
      <div class="spacer"></div>
      <div class="split">
        <div class="glass"><h3 style="margin-bottom:10px">🔻 Focus on these</h3><div class="chapter-list">${L.weak.length ? L.weak.map((r) => `<div class="it"><span>${esc(r.label)}</span><b class="crimson-text">${pct(r.cor, r.att)}%</b></div>`).join("") : '<p class="faint">Attempt 2+ questions in a chapter to rate it.</p>'}</div></div>
        <div class="glass"><h3 style="margin-bottom:10px">🔺 Strong areas</h3><div class="chapter-list">${L.strong.length ? L.strong.map((r) => `<div class="it"><span>${esc(r.label)}</span><b class="mint-text">${pct(r.cor, r.att)}%</b></div>`).join("") : '<p class="faint">Not enough data yet. Keep playing.</p>'}</div></div>
      </div>
      ${subjects.map(({ s, rows }) => `<div class="spacer"></div><div class="glass"><h3 style="margin-bottom:12px">${s} · chapters</h3>${barsHTML(rows)}</div>`).join("")}
      <div class="spacer"></div>
      <button class="btn gold block" data-act="parent-lifetime">${I.share.replace("<svg", '<svg width="18" height="18"')} Send progress report to parents</button>
      ${note()}`);
  }

  /* =============================== VAULT TAB ============================== */
  function renderVault() {
    tab = "vault"; view = "vault";
    const ids = vaultIds(S.exam).sort((a, b) => S.vault[a].due - S.vault[b].due), due = vaultDue(S.exam).length;
    show(`
      ${appbar("Mistake Vault")}
      <div class="glass" style="display:flex;align-items:center;gap:16px">
        ${ring(84, 8, ids.length ? due / ids.length : 0, `<b class="num" style="font-size:22px">${due}</b>`)}
        <div style="flex:1"><h3>${due ? `${due} due for revision` : ids.length ? "All caught up" : "Vault is empty"}</h3>
          <p class="muted" style="margin:4px 0 0;font-size:13px">${ids.length} saved · ${S.vaultCleared} mastered. Each question returns after 1, 3 and 7 days.</p></div>
      </div>
      ${ids.length ? `<button class="btn primary block" style="margin-top:12px" data-act="setup" data-v="vault">${I.play.replace("<svg", '<svg width="18" height="18"')} Revise now</button>` : ""}
      <div class="section-title"><h3>Saved questions</h3></div>
      <div class="grid">${ids.slice(0, 60).map((id) => { const q = byId[id], v = S.vault[id], isDue = v.due <= Date.now();
        return `<div class="vault-item"><span style="color:var(--text-2)">${SUBJ_ICON[q.subject].replace("<svg", '<svg width="20" height="20"')}</span>
          <div style="min-width:0"><p>${esc(q.q)}</p><span class="faint">${esc(q.chapter)} · ${isDue ? '<b class="crimson-text">due now</b>' : `due ${dueIn(v.due)}`}</span></div>
          <div class="steps" title="Spaced steps">${VAULT_STEPS_DAYS.map((_, i) => `<i class="${v.box > i ? "on" : ""}"></i>`).join("")}</div></div>`; }).join("") || '<p class="faint">Wrong, skipped or solution-viewed questions land here automatically.</p>'}</div>`);
  }

  /* =============================== PROFILE ================================ */
  function renderProfile() {
    tab = "profile"; view = "profile";
    const r = rankFor(S.totalGP);
    show(`
      ${appbar("Profile")}
      <div class="glass" style="display:flex;align-items:center;gap:16px">
        <div class="avatar">${esc((S.name || "P").trim().charAt(0).toUpperCase())}</div>
        <div style="flex:1;min-width:0"><h2>${S.name ? esc(S.name) : '<span class="muted">Add your name below</span>'}</h2><div class="chips-row" style="margin-top:6px;flex-wrap:wrap"><span class="pill accent">${r.cur.name}</span><span class="pill gold">${fmt(S.totalGP)} GP</span></div></div>
      </div>
      <div class="section-title"><h3>Settings</h3></div>
      <div class="glass">
        <div class="field"><label class="eyebrow" for="nm">Your name (for reports)</label><input id="nm" maxlength="40" value="${esc(S.name)}" placeholder="e.g. Aarav" style="margin-top:6px" /></div>
        <div class="setting-row"><div><b>Sound & vibration</b><div class="faint">Chimes, buzzers, fanfare, haptics</div></div><button class="toggle ${S.sound ? "on" : ""}" data-act="toggle-sound-set" aria-pressed="${S.sound}" aria-label="Sound"></button></div>
        <div class="setting-row"><div><b>Real PYQs only</b><div class="faint">Hide practice samples in every mode</div></div><button class="toggle ${S.pyqOnly ? "on" : ""}" data-act="pyq" aria-pressed="${S.pyqOnly}" aria-label="PYQs only"></button></div>
        <div class="setting-row" style="display:block"><b>Daily GP goal</b><div class="chips" style="margin-top:8px">${[500, 1000, 2000, 3000].map((g) => `<button class="chip gold ${S.dailyGoal === g ? "on" : ""}" data-act="goal" data-v="${g}">${fmt(g)}</button>`).join("")}</div></div>
        <div class="setting-row"><div><b>Parent report</b><div class="faint">Share overall progress on WhatsApp</div></div><button class="btn gold sm" data-act="parent-lifetime">Send</button></div>
        <div class="setting-row"><div><b>Account &amp; backup</b><div class="faint">${window.PJ && PJ.user ? esc(PJ.user.email || "") + " · Drive backup " + (PJ.driveStatus() === "on" ? "on" : "off") : "Signed out"}</div></div><a class="btn ghost sm" href="/#profile" style="text-decoration:none">Manage</a></div>
        <div class="setting-row"><div><b>Reset all progress</b><div class="faint">Clears GP, badges, vault and history</div></div><button class="btn ghost sm" data-act="reset">Reset</button></div>
      </div>
      <div class="section-title"><h3>Rank ladder</h3></div>
      <div class="ranks">${RANKS.map((x, i) => `<div class="rank-item ${i === r.i ? "cur" : i < r.i ? "done" : ""}"><b class="num">${i < r.i ? "✓ " : i === r.i ? "▶ " : ""}${x.name}</b><span class="faint">${fmt(x.gp)} GP</span></div>`).join("")}</div>
      <div class="section-title"><h3>Badges · ${Object.keys(S.badges).length}/${BADGES.length}</h3></div>
      <div class="badges">${BADGES.map((b) => `<div class="badge-card ${S.badges[b.id] ? "" : "locked"}"><div class="medal">${b.icon}</div><b>${b.name}</b><span>${b.desc}</span></div>`).join("")}</div>
      ${note()}
      <p class="note">${[["Privacy", "privacy"], ["Terms", "terms"], ["Disclaimer", "disclaimer"], ["Refunds", "refund"]].map(([l, f]) => `<a href="/${f}.html" target="_blank" style="color:var(--text-3);text-decoration:underline">${l}</a>`).join(" · ")}</p>`);
    const nm = $("#nm"); if (nm) nm.addEventListener("change", () => { S.name = nm.value.trim(); save(); });
  }

  /* ============================ WELCOME / REPORT ========================== */
  function welcomeBack() {
    const L = lifetime(S.exam); if (!L.att) return;
    const last = S.sessions[S.sessions.length - 1], due = vaultDue(S.exam).length;
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
      ${due ? `<p class="crimson-text" style="font-weight:600">${due} question(s) in your Mistake Vault are due today.</p>` : ""}
      <button class="btn primary block" data-act="close-modal" style="margin-top:8px">Let's go</button>`);
  }
  function reportText(sess) {
    const L = lifetime(S.exam), r = rankFor(S.totalGP);
    const lines = [`📊 ProDJEE Arena · Progress Report`, `Student: ${S.name || "—"}`, `Date: ${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })} · Exam: ${sess ? sess.exam : S.exam}`];
    if (sess) lines.push("", `Today's session: ${sess.n} questions`, `✅ ${sess.correct} correct (${pct(sess.correct, sess.n)}%) · ⏱ avg ${Math.round(sess.time / sess.n)} s/question`, `GP earned: ${signed(sess.gp)} · Hints: ${sess.hints} · Solutions viewed: ${sess.solutions}`);
    lines.push("", `Overall: ${L.cor}/${L.att} correct (${pct(L.cor, L.att)}%)`, `Total GP: ${fmt(S.totalGP)} · Rank: ${r.cur.name}`, `Streak: ${liveStreak()} day(s) 🔥 · Today's goal: ${Math.round((100 * Math.max(0, S.daily[dayKey()] || 0)) / S.dailyGoal)}%`);
    if (L.strong.length) lines.push(`Strong: ${L.strong.map((x) => x.label).join(", ")}`);
    if (L.weak.length) lines.push(`Needs work: ${L.weak.map((x) => x.label).join(", ")}`);
    return lines.join("\n");
  }
  async function shareText(text) {
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    // Fallback: show the text with Copy + a real WhatsApp link (no pop-ups needed)
    modal(`<h2 style="margin-bottom:10px">Share</h2>
      <textarea id="share-text" readonly style="width:100%;min-height:210px;padding:12px;border-radius:12px;background:rgba(0,0,0,.35);color:var(--text);border:1px solid var(--line);font:13px/1.5 var(--body)">${esc(text)}</textarea>
      <div class="grid cols-2" style="margin-top:12px">
        <button class="btn ghost" data-act="copy-share">Copy text</button>
        <a class="btn gold" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener" style="text-decoration:none">Open WhatsApp</a>
      </div>
      <button class="btn ghost block" data-act="close-modal" style="margin-top:10px">Close</button>`);
  }

  /* ================================ EVENTS ================================ */
  const TAB_RENDER = { home: renderHome, play: renderPlay, vault: renderVault, stats: renderStats, profile: renderProfile };
  const renderTab = (t = tab) => (TAB_RENDER[t] || renderHome)();
  function quitGame() {
    closeModal(); clearInterval(timer);
    if (G && G.records.length) finishGame(); else { disarmGuard(); G = null; renderTab(); }
  }
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]"); if (!el) return;
    const act = el.dataset.act, v = el.dataset.v;
    if (act === "modal-bg" && e.target !== el) return;
    switch (act) {
      case "tab": setup = null; if (G) return; sfx.tap(); renderTab(v); break;
      case "exam": S.exam = v; save(); renderTab(); break;
      case "quick-play": sfx.tap(); setup = { mode: "mixed", exam: S.exam, subject: SUBJECTS[S.exam][0], chapters: new Set(), length: S.lastLength || 10 }; startGame(); break;
      case "setup": sfx.tap(); renderSetup(v); break;
      case "subject": sfx.tap(); renderSetup("chapter", v); setup.chapters = new Set(chaptersOf(S.exam, v, S.pyqOnly)); renderSetup("chapter"); break;
      case "subj": setup.subject = v; setup.chapters = new Set(); renderSetup(setup.mode); break;
      case "ch": setup.chapters.has(v) ? setup.chapters.delete(v) : setup.chapters.add(v); renderSetup(setup.mode); break;
      case "all-ch": { const chs = chaptersOf(S.exam, setup.subject, S.pyqOnly); setup.chapters = setup.chapters.size === chs.length ? new Set() : new Set(chs); renderSetup(setup.mode); break; }
      case "len": setup.length = +v; renderSetup(setup.mode); break;
      case "pyq": S.pyqOnly = !S.pyqOnly; save(); if (view === "setup") { if (setup.mode === "chapter") setup.chapters = new Set([...setup.chapters].filter((c) => chaptersOf(S.exam, setup.subject, S.pyqOnly).includes(c))); renderSetup(setup.mode); } else renderTab(); break;
      case "start": startGame(); break;
      case "opt": if (G && G.cur.phase === "play") { G.cur.selected = +v; sfx.tap(); renderGame(); } break;
      case "key": {
        if (!G || G.cur.phase !== "play") break;
        let s = G.cur.numVal;
        if (v === "⌫") s = s.slice(0, -1); else if (v === "−") s = s.startsWith("-") ? s.slice(1) : "-" + s; else if (v === "." && s.includes(".")) break; else s += v;
        G.cur.numVal = s; renderGame(); break;
      }
      case "lock": if (G) resolve("lock"); break;
      case "hint": if (G) useHint(); break;
      case "solution": if (G) resolve("solution"); break;
      case "see-sol": if (G) { G.cur.solShown = true; renderGame(); } break;
      case "next": if (G) { G.idx++; nextQuestion(); } break;
      case "quit": modal(`<h2>End this session?</h2><p class="muted">Questions answered so far will be saved and analysed.</p><div class="grid cols-2"><button class="btn ghost" data-act="close-modal">Keep playing</button><button class="btn primary" data-act="quit-yes">End session</button></div>`); break;
      case "quit-yes": quitGame(); break;
      case "again": renderSetup(setup ? setup.mode : "mixed"); break;
      case "parent-session": shareText(reportText(lastSession)); break;
      case "parent-lifetime": shareText(reportText(null)); break;
      case "share-badge": { const b = BADGES.find((x) => x.id === v); shareText(`${b.icon} I just unlocked "${b.name}" on ProDJEE Arena. ${fmt(S.totalGP)} Gyan Points and counting. Can you beat me?`); break; }
      case "toggle-sound": S.sound = !S.sound; save(); if (view === "game") renderGame(); else renderTab(); break;
      case "toggle-sound-set": S.sound = !S.sound; save(); el.classList.toggle("on", S.sound); el.setAttribute("aria-pressed", S.sound); break;
      case "goal": S.dailyGoal = +v; save(); renderProfile(); break;
      case "zoom": modal(`<img src="${esc(imgSrc(v))}" alt="${esc(el.dataset.alt || "Figure")}" class="zoom-img" /><button class="btn ghost block" data-act="close-modal" style="margin-top:12px">Close</button>`); break;
      case "reset": modal(`<h2>Reset everything?</h2><p class="muted">This permanently deletes your GP, badges, vault and history on this device.</p><div class="grid cols-2"><button class="btn ghost" data-act="close-modal">Cancel</button><button class="btn primary" data-act="reset-yes">Yes, reset</button></div>`); break;
      case "reset-yes": { const keep = { name: S.name, sound: S.sound, exam: S.exam }; S = Object.assign(fresh(), keep); save(); closeModal(); renderHome(); break; }
      case "copy-share": { const t = $("#share-text"); const done = () => { el.textContent = "Copied ✓"; };
        try { navigator.clipboard.writeText(t.value).then(done, () => { t.select(); el.textContent = "Press Ctrl/⌘+C"; }); } catch (e) { t.select(); el.textContent = "Press Ctrl/⌘+C"; } break; }
      case "close-modal": case "modal-bg": closeModal(); break;
    }
  });
  document.addEventListener("keydown", (e) => {
    if (overlay.innerHTML && e.key === "Escape") return closeModal();
    if (view !== "game" || !G || overlay.innerHTML) return;
    if (e.target && e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
    const c = G.cur, inNum = e.target && e.target.id === "num";
    if (c.phase === "done") { if (e.key === "Enter") { G.idx++; nextQuestion(); } return; }
    if (e.key === "Enter") { const b = $('[data-act="lock"]'); if (b && !b.disabled) resolve("lock"); return; }
    if (inNum) return;
    const map = { 1: 0, 2: 1, 3: 2, 4: 3, a: 0, b: 1, c: 2, d: 3 }, k = e.key.toLowerCase();
    if (c.q.type === "mcq" && k in map) { c.selected = c.order[map[k]]; sfx.tap(); renderGame(); } else if (k === "h") useHint();
  });
  window.addEventListener("pagehide", () => { if (G && G.records.length) commitSession(); });

  /* ================================= BOOT ================================= */
  renderHome();
  welcomeBack();
})();
