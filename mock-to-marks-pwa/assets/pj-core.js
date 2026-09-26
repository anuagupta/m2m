/* ProDJEE shared core: Google sign-in, consent, greeting, avatar,
   and device + Google Drive (appDataFolder) sync of study data.
   Loaded on every section (hub, /arena, /m2m) after the Firebase compat SDKs.

   Data model
   - Study data lives in localStorage under TRACKED keys.
   - Each tracked key has a last-modified time in "pj.meta" so two copies
     (this device vs Drive) can be merged key by key, newest wins.
   - The Drive copy is a single JSON file "prodjee-data.json" in the hidden
     appDataFolder (scope drive.appdata: the app can only see its own files).
   - Nothing about study data is sent to ProDJEE's servers. */
(function () {
  'use strict';

  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyB_Qs-S_PjdzW33Jk-7JG0-lgr7_gVcltQ',
    authDomain: 'prodjee-m2m.firebaseapp.com',
    projectId: 'prodjee-m2m',
    storageBucket: 'prodjee-m2m.firebasestorage.app',
    messagingSenderId: '602452550958',
    appId: '1:602452550958:web:802886f8a07658b9df06bf'
  };
  var OAUTH_CLIENT_ID = '602452550958-j47q5bm6ghhii4564dtdg8jv0jj62jfk.apps.googleusercontent.com';
  var DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  var DRIVE_FILE = 'prodjee-data.json';
  var CONSENT_VERSION = '2026-09-26b'; // bumped: consent mechanism changed from two checkboxes to a single Continue + Terms link
  var TRACKED = ['mtm_state_v1', 'prodjee.arena.v1', 'pj.consent', 'pj.nameOverride'];

  var LS = window.localStorage;
  var rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem, rawGet = Storage.prototype.getItem;
  function lsGet(k) { try { return LS.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { rawSet.call(LS, k, v); } catch (e) {} }
  function lsDel(k) { try { rawRemove.call(LS, k); } catch (e) {} }
  function jget(k, d) { try { var v = JSON.parse(lsGet(k)); return v == null ? d : v; } catch (e) { return d; } }
  function jset(k, v) { lsSet(k, JSON.stringify(v)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------- change tracking: every write to a tracked key is timestamped ---------- */
  var applyingRemote = false;
  function touch(k) {
    if (applyingRemote || TRACKED.indexOf(k) < 0) return;
    var meta = jget('pj.meta', {}); meta[k] = Date.now(); jset('pj.meta', meta);
    scheduleSync();
  }
  // Every localStorage write goes through here (M2M and Arena save on nearly
  // every interaction), so skip the timestamp bump - and the sync it queues -
  // when a key is set to the value it already had.
  Storage.prototype.setItem = function (k, v) {
    if (this === LS && TRACKED.indexOf(k) >= 0 && rawGet.call(this, k) === v) return;
    rawSet.call(this, k, v); if (this === LS) touch(k);
  };
  Storage.prototype.removeItem = function (k) { rawRemove.call(this, k); if (this === LS) touch(k); };

  /* ---------- Firebase ---------- */
  var fb = window.firebase;
  if (!fb.apps.length) fb.initializeApp(FIREBASE_CONFIG);
  var auth = fb.auth();

  var user = null, ready = false, listeners = [];
  var token = null, tokenExp = 0;
  try { var t = JSON.parse(sessionStorage.getItem('pj.tok') || 'null'); if (t && t.exp > Date.now()) { token = t.v; tokenExp = t.exp; } } catch (e) {}
  function setToken(v, secs) {
    token = v; tokenExp = Date.now() + (secs || 3500) * 1000 - 60000;
    try { sessionStorage.setItem('pj.tok', JSON.stringify({ v: token, exp: tokenExp })); } catch (e) {}
  }
  function tokenOk() { return token && Date.now() < tokenExp; }
  function driveKey() { return user ? 'pj.drive.' + user.uid : 'pj.drive.none'; }
  function driveStatus() { return lsGet(driveKey()) || 'unknown'; } // on | off | unknown

  /* ---------- greetings (Gen Z, classroom-safe) ---------- */
  var GREETS = [
    'yo {n}, let’s cook 🔥', '{n} is so back 💅', 'locked in, {n}? 🎯',
    'ayy {n}, main character energy today ✨', '{n}, it’s giving topper 📈',
    'hey {n}, one more question = one step closer 🚀', 'we move, {n} 💪',
    '{n} understood the assignment ✅', 'no days off, {n} 😤', 'slay the syllabus, {n} 📚'
  ];
  var SUBS = ['Small wins stack up. Let’s get one now.', 'Consistency beats cramming. Every single time.',
    'Your future rank says thanks.', 'Pick a section and start the streak.'];
  // The name shown across the hub, Arena and Mock-to-Marks: the Google
  // account name, unless the student set their own nickname (only doable
  // from the top-bar profile page) - one value, so it can't drift into
  // three different "your name" fields with three different answers.
  function getName() {
    var o = jget('pj.nameOverride', '');
    return (o && o.trim()) || (user && user.displayName) || '';
  }
  function setName(v) { jset('pj.nameOverride', String(v || '').trim()); touch('pj.nameOverride'); emit(); }
  function hasNameOverride() { return !!(jget('pj.nameOverride', '') || '').trim(); }
  function firstName() {
    var n = getName().trim().split(/\s+/)[0] || 'legend';
    return n;
  }
  function greeting() {
    var d = new Date(), i = (d.getDate() * 7 + d.getHours()) % GREETS.length;
    return { line: GREETS[i].replace('{n}', firstName()), sub: SUBS[d.getDate() % SUBS.length] };
  }

  /* ---------- avatar + greeting rendering ---------- */
  var SILHOUETTE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';
  function avatarHTML() {
    if (user && user.photoURL) return '<img src="' + esc(user.photoURL) + '" alt="" referrerpolicy="no-referrer">';
    return SILHOUETTE;
  }
  function paint() {
    var els = document.querySelectorAll('[data-pj-avatar]');
    for (var i = 0; i < els.length; i++) {
      els[i].innerHTML = avatarHTML();
      els[i].setAttribute('title', user ? (getName() || 'Profile') + ' — profile' : 'Sign in');
      els[i].setAttribute('aria-label', user ? 'Open profile' : 'Sign in');
    }
    var g = document.querySelectorAll('[data-pj-greet]');
    for (var j = 0; j < g.length; j++) {
      if (!user) { g[j].innerHTML = ''; continue; }
      var gr = greeting();
      g[j].innerHTML = esc(gr.line) + (g[j].hasAttribute('data-pj-sub') ? '<small>' + esc(gr.sub) + '</small>' : '');
    }
    paintBanner();
  }
  function bannerDismissKey() { return 'pj.bannerDismiss.' + (user ? user.uid : ''); }
  function paintBanner() {
    var b = document.querySelectorAll('[data-pj-banner]');
    var html = '';
    if (user && driveNeedsResume) {
      // The Drive token expired. Rather than popping a Google consent window
      // on the user's very next tap anywhere on the page, ask first.
      html = '<div><span>🔁 Backup paused — reconnect Google Drive to keep syncing.</span>' +
        '<button class="pj-btn pj-btn-primary pj-btn-sm" data-pj-act="resume-drive">Resume backup</button></div>';
    } else if (user && driveStatus() === 'off' && sessionStorage.getItem(bannerDismissKey()) !== '1') {
      html = '<div><span>📱 Your progress is saved only on this device. Turn on Google Drive backup so you never lose it.</span>' +
        '<span style="display:flex;gap:8px;">' +
        '<button class="pj-btn pj-btn-ghost pj-btn-sm" data-pj-act="dismiss-banner">Not now</button>' +
        '<button class="pj-btn pj-btn-primary pj-btn-sm" data-pj-act="enable-drive">Enable backup</button></span></div>';
    }
    for (var i = 0; i < b.length; i++) b[i].innerHTML = html;
  }

  /* ---------- UI helpers ---------- */
  function toast(msg, ms) {
    var t = document.createElement('div'); t.className = 'pj-toast'; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, ms || 2800);
  }
  function scrim(html, id) {
    var old = document.getElementById(id); if (old) old.remove();
    var s = document.createElement('div'); s.className = 'pj-scrim'; s.id = id; s.innerHTML = '<div class="pj-card" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(s); return s;
  }
  var GOOGLE_ICON = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/></svg>';

  /* ---------- sign-in gate ---------- */
  function showSignInGate(message) {
    scrim(
      '<img class="pj-logo" src="/assets/logo-192.png" alt="ProDJEE logo">' +
      '<h2>Sign in to ProDJEE</h2>' +
      '<p>' + esc(message || 'One Google sign-in unlocks Arena and Mock-to-Marks. Your study data stays on this phone and in a private app folder in your own Google Drive.') + '</p>' +
      '<p>On the Google screen we’ll ask for your <b>name, email, profile photo</b> and permission to <b>store ProDJEE’s own backup file in your Google Drive</b>. We can’t see any of your other Drive files.</p>' +
      '<button class="pj-btn pj-btn-primary" style="width:100%;margin-top:8px" data-pj-act="sign-in">' + GOOGLE_ICON + ' Continue with Google</button>' +
      '<div class="pj-err" id="pj-gate-err" hidden></div>' +
      '<p class="pj-fine">By continuing you agree to our <a href="/terms.html" target="_blank">Terms</a>, <a href="/privacy.html" target="_blank">Privacy Policy</a> and <a href="/disclaimer.html" target="_blank">Disclaimer</a>.</p>',
      'pj-gate');
  }
  function hideGate() { var g = document.getElementById('pj-gate'); if (g) g.remove(); }

  function signIn() {
    signingIn = true;
    var provider = new fb.auth.GoogleAuthProvider();
    provider.addScope(DRIVE_SCOPE);
    provider.setCustomParameters({ prompt: 'select_account', include_granted_scopes: 'true' });
    return auth.signInWithPopup(provider).then(function (res) {
      var cred = res.credential;
      if (cred && cred.accessToken) {
        setToken(cred.accessToken, 3500);
        return checkGranted().then(function (ok) {
          lsSet('pj.drive.' + res.user.uid, ok ? 'on' : 'off');
          return res.user;
        });
      }
      return res.user;
    }).then(function (u) {
      signingIn = false; startSession(u); return u;
    }).catch(function (err) {
      signingIn = false;
      var el = document.getElementById('pj-gate-err');
      if (el && err && err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        el.hidden = false;
        el.textContent = err.code === 'auth/popup-blocked' ? 'Your browser blocked the Google pop-up. Allow pop-ups for prodjee.in and try again.' : 'Sign-in failed. Please try again.';
      }
      throw err;
    });
  }
  function checkGranted() {
    if (!tokenOk()) return Promise.resolve(false);
    return fetch('https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + encodeURIComponent(token))
      .then(function (r) { return r.json(); })
      .then(function (j) { return !!(j && j.scope && j.scope.indexOf(DRIVE_SCOPE) >= 0); })
      .catch(function () { return false; });
  }

  /* ---------- Drive token refresh (Google Identity Services) ---------- */
  var gisLoading = null;
  function loadGIS() {
    if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
    if (gisLoading) return gisLoading;
    gisLoading = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true;
      s.onload = function () { res(); }; s.onerror = rej; document.head.appendChild(s);
    });
    return gisLoading;
  }
  // Must be called from a user gesture (click) because it may open a pop-up.
  function requestDriveToken(forceConsent) {
    return loadGIS().then(function () {
      return new Promise(function (res, rej) {
        var client = google.accounts.oauth2.initTokenClient({
          client_id: OAUTH_CLIENT_ID, scope: DRIVE_SCOPE,
          hint: user && user.email ? user.email : undefined,
          callback: function (r) {
            if (r && r.access_token && google.accounts.oauth2.hasGrantedAllScopes(r, DRIVE_SCOPE)) {
              setToken(r.access_token, r.expires_in); lsSet(driveKey(), 'on'); res(true);
            } else { lsSet(driveKey(), 'off'); res(false); }
          },
          error_callback: function (e) { rej(e); }
        });
        client.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
      });
    });
  }
  // When the token has expired, surface a banner rather than intercepting the
  // user's next tap anywhere on the page with a surprise Google pop-up.
  var driveNeedsResume = false;
  function armRefreshOnTap() {
    if (driveStatus() !== 'on' || driveNeedsResume) return;
    driveNeedsResume = true; paintBanner();
  }
  function resumeDrive() {
    requestDriveToken(false).then(function (ok) {
      if (ok) { driveNeedsResume = false; syncNow(); }
      else toast('Couldn’t reconnect. Try again from your profile.');
      paintBanner();
    }).catch(function () { toast('Couldn’t reach Google. Try again.'); });
  }

  /* ---------- Drive REST ---------- */
  function dfetch(url, opt) {
    opt = opt || {}; opt.headers = opt.headers || {}; opt.headers.Authorization = 'Bearer ' + token;
    return fetch(url, opt).then(function (r) {
      if (r.status === 401) { token = null; tokenExp = 0; armRefreshOnTap(); throw new Error('drive-auth'); }
      if (!r.ok) throw new Error('drive-' + r.status);
      return r;
    });
  }
  function findFile() {
    var q = encodeURIComponent("name='" + DRIVE_FILE + "'");
    return dfetch('https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&fields=files(id,modifiedTime)&q=' + q)
      .then(function (r) { return r.json(); }).then(function (j) { return j.files && j.files[0] ? j.files[0].id : null; });
  }
  function readFile(id) { return dfetch('https://www.googleapis.com/drive/v3/files/' + id + '?alt=media').then(function (r) { return r.json(); }); }
  function writeFile(id, doc) {
    var body = JSON.stringify(doc);
    if (id) return dfetch('https://www.googleapis.com/upload/drive/v3/files/' + id + '?uploadType=media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: body }).then(function () { return id; });
    var boundary = 'pj' + Date.now();
    var multi = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify({ name: DRIVE_FILE, parents: ['appDataFolder'] }) + '\r\n--' + boundary +
      '\r\nContent-Type: application/json\r\n\r\n' + body + '\r\n--' + boundary + '--';
    return dfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + boundary }, body: multi })
      .then(function (r) { return r.json(); }).then(function (j) { return j.id; });
  }
  function deleteDriveFile() {
    if (!tokenOk()) return Promise.resolve(false);
    return findFile().then(function (id) { return id ? dfetch('https://www.googleapis.com/drive/v3/files/' + id, { method: 'DELETE' }).then(function () { return true; }) : true; });
  }

  /* ---------- sync ---------- */
  var syncTimer = null, syncing = null, lastSync = +lsGet('pj.lastSync') || 0, onRemote = null;
  function scheduleSync() {
    if (!user || driveStatus() !== 'on') return;
    clearTimeout(syncTimer); syncTimer = setTimeout(function () { syncNow(); }, 4000);
  }
  function localDoc() {
    var meta = jget('pj.meta', {}), keys = {};
    TRACKED.forEach(function (k) { var v = lsGet(k); if (v != null || meta[k]) keys[k] = { t: meta[k] || 1, v: v }; });
    return { v: 1, uid: user.uid, updatedAt: Date.now(), keys: keys };
  }
  function syncNow() {
    if (!user || driveStatus() !== 'on') return Promise.resolve(false);
    if (!tokenOk()) { armRefreshOnTap(); return Promise.resolve(false); }
    if (syncing) return syncing;
    var changed = [];
    syncing = findFile().then(function (id) {
      return (id ? readFile(id) : Promise.resolve(null)).then(function (remote) {
        var local = localDoc(), meta = jget('pj.meta', {}), push = !remote;
        var rk = (remote && remote.uid === user.uid && remote.keys) || {};
        applyingRemote = true;
        Object.keys(rk).forEach(function (k) {
          if (TRACKED.indexOf(k) < 0) return;
          var l = local.keys[k];
          if (!l || rk[k].t > l.t) {
            if (rk[k].v == null) lsDel(k); else lsSet(k, rk[k].v);
            meta[k] = rk[k].t; changed.push(k);
          }
        });
        applyingRemote = false;
        jset('pj.meta', meta);
        Object.keys(local.keys).forEach(function (k) { if (!rk[k] || local.keys[k].t > rk[k].t) push = true; });
        return push ? writeFile(id, localDoc()) : id;
      });
    }).then(function () {
      lastSync = Date.now(); lsSet('pj.lastSync', String(lastSync));
      syncing = null;
      if (changed.length && onRemote) onRemote(changed);
      emit();
      return true;
    }).catch(function () { applyingRemote = false; syncing = null; return false; });
    return syncing;
  }

  /* ---------- consent (18+/parent permission + Terms/Privacy/Disclaimer) ---------- */
  function hasConsent() {
    var c = jget('pj.consent', null);
    return !!(c && user && c.uid === user.uid && c.ver === CONSENT_VERSION);
  }
  function askConsent() {
    return new Promise(function (resolve) {
      // No checkbox: continuing itself is the agreement, stated plainly
      // below the button. The 18-or-parental-permission requirement lives
      // in the Terms of Use itself (section 2) rather than as a separate
      // tick here.
      var s = scrim(
        '<img class="pj-logo" src="/assets/logo-192.png" alt="">' +
        '<h2>Quick check before you start</h2>' +
        '<p>Hi ' + esc(firstName()) + '! One thing before you dive in.</p>' +
        '<button class="pj-btn pj-btn-primary" style="width:100%;margin-top:6px" id="pj-cok">Continue</button>' +
        '<p class="pj-fine">By tapping Continue, you confirm you’ve read and agree to our <a href="/terms.html" target="_blank">Terms of Use</a> (which cover who may use ProDJEE), <a href="/privacy.html" target="_blank">Privacy Policy</a> and <a href="/disclaimer.html" target="_blank">Disclaimer</a>.</p>' +
        '<button class="pj-btn pj-btn-ghost" style="width:100%;margin-top:8px" id="pj-cno">Sign out</button>',
        'pj-consent');
      s.querySelector('#pj-cok').onclick = function () {
        localStorage.setItem('pj.consent', JSON.stringify({ uid: user.uid, ver: CONSENT_VERSION, at: new Date().toISOString(), adultOrParent: true }));
        s.remove(); resolve(true);
      };
      s.querySelector('#pj-cno').onclick = function () { s.remove(); auth.signOut(); resolve(false); };
    });
  }

  /* ---------- account switching on a shared phone ----------
     A different Google account can sign in on the same device (siblings
     sharing a phone). Local data must stay apart per account, but switching
     back and forth shouldn't delete anyone's work - so the outgoing
     account's local keys are stashed under its uid and restored if it
     signs back in, instead of being wiped. */
  function ensureOwner(u) {
    var owner = lsGet('pj.owner');
    if (owner && owner !== u.uid) {
      var stash = {}; TRACKED.forEach(function (k) { stash[k] = lsGet(k); });
      jset('pj.stash.' + owner, { data: stash, meta: jget('pj.meta', {}) });
      TRACKED.forEach(function (k) { lsDel(k); });
      lsDel('pj.meta'); lsDel('pj.lastSync');
      var incoming = jget('pj.stash.' + u.uid, null);
      if (incoming) {
        Object.keys(incoming.data || {}).forEach(function (k) { if (incoming.data[k] != null) lsSet(k, incoming.data[k]); });
        if (incoming.meta) jset('pj.meta', incoming.meta);
        lsDel('pj.stash.' + u.uid);
      }
    }
    lsSet('pj.owner', u.uid);
  }

  /* ---------- export / delete ---------- */
  function exportData() {
    var out = { exportedAt: new Date().toISOString(), account: user ? { name: user.displayName, email: user.email } : null, data: {} };
    TRACKED.forEach(function (k) { var v = lsGet(k); if (v != null) { try { out.data[k] = JSON.parse(v); } catch (e) { out.data[k] = v; } } });
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'prodjee-my-data.json';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function deleteAll() {
    var p = tokenOk() ? deleteDriveFile() : (driveStatus() === 'on' ? requestDriveToken(false).then(function (ok) { return ok ? deleteDriveFile() : false; }) : Promise.resolve(true));
    return p.catch(function () { return false; }).then(function (driveOk) {
      TRACKED.forEach(function (k) { lsDel(k); });
      ['pj.meta', 'pj.lastSync', 'pj.owner', driveKey()].forEach(lsDel);
      try { sessionStorage.removeItem('pj.tok'); } catch (e) {}
      return auth.signOut().then(function () { return driveOk; });
    });
  }

  /* ---------- events ---------- */
  function emit() { paint(); listeners.forEach(function (f) { try { f(user); } catch (e) {} }); }
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-pj-act]'); if (!el) return;
    var act = el.getAttribute('data-pj-act');
    if (act === 'sign-in') { e.preventDefault(); signIn().catch(function () {}); }
    else if (act === 'enable-drive') {
      e.preventDefault();
      requestDriveToken(true).then(function (ok) { toast(ok ? 'Drive backup is on ✅' : 'Drive permission wasn’t granted. Data stays on this device.'); paint(); if (ok) syncNow(); }).catch(function () { toast('Couldn’t reach Google. Try again.'); });
    }
    else if (act === 'profile') { e.preventDefault(); if (!user) { showSignInGate(); return; } location.href = '/#profile'; }
    else if (act === 'resume-drive') { e.preventDefault(); resumeDrive(); }
    else if (act === 'dismiss-banner') { e.preventDefault(); try { sessionStorage.setItem(bannerDismissKey(), '1'); } catch (e2) {} paintBanner(); }
  });

  var requireAuth = false, consentShown = false, signingIn = false;
  function startSession(u) {
    var afterConsent = function () {
      if (driveStatus() === 'on') { if (tokenOk()) syncNow(); else armRefreshOnTap(); }
      emit();
    };
    if (hasConsent()) { afterConsent(); return; }
    // Drive may already hold this user's consent + data (e.g. a new phone): pull it first.
    var pre = (driveStatus() === 'on' && tokenOk()) ? syncNow() : Promise.resolve();
    pre.then(function () {
      if (hasConsent()) { afterConsent(); return; }
      if (consentShown) return; consentShown = true;
      askConsent().then(function (ok) { consentShown = false; if (ok) afterConsent(); });
    });
  }
  auth.onAuthStateChanged(function (u) {
    user = u; ready = true;
    if (!u) {
      if (requireAuth) showSignInGate();
      emit(); return;
    }
    hideGate(); ensureOwner(u); paint();
    if (!signingIn) startSession(u); // a fresh sign-in starts the session once its Drive token is known
  });

  window.PJ = {
    auth: auth,
    get user() { return user; },
    get ready() { return ready; },
    driveStatus: driveStatus,
    get lastSync() { return lastSync; },
    signIn: signIn,
    signOut: function () { try { sessionStorage.removeItem('pj.tok'); } catch (e) {} return auth.signOut(); },
    requireSignIn: function () { requireAuth = true; if (ready && !user) showSignInGate(); },
    onChange: function (f) { listeners.push(f); if (ready) f(user); },
    onRemoteData: function (f) { onRemote = f; },
    syncNow: function () {
      if (tokenOk()) return syncNow();
      return requestDriveToken(false).then(function (ok) { return ok ? syncNow() : false; });
    },
    enableDrive: function () { return requestDriveToken(true); },
    exportData: exportData,
    deleteAll: deleteAll,
    greeting: greeting,
    firstName: firstName,
    getName: getName,
    setName: setName,
    hasNameOverride: hasNameOverride,
    avatarHTML: avatarHTML,
    toast: toast,
    paint: paint,
    hasConsent: hasConsent
  };
})();
