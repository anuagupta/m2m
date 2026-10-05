/* Daily-nudge web push: opt-in, subscribe, and keep the server's small summary fresh.
 * Server side lives in api/push.js. Nothing here sends a notification itself. */
(function () {
  var VAPID_PUBLIC = 'BHHqbGwwYvbZoFaSfZIwUrVSL_yLIHx6f17fNQOa-_a0yX02Nvoxp8eAqYGt1ijUU88JA_ChJOK-IGHNhob0JCw';
  var API = /(^|\.)prodjee\.in$|\.vercel\.app$/.test(location.hostname) ? '/api' : 'https://m2m-two.vercel.app/api';
  var ON = 'pj.push.on', DISMISSED = 'pj.push.dismissed';
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} return null; }
  function supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function key(b64) {
    var pad = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function call(action, body) {
    var t = window.PJ && PJ.user ? PJ.user.getIdToken() : Promise.resolve(null);
    return t.then(function (token) {
      if (!token) throw new Error('signin');
      return fetch(API + '/push', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(Object.assign({ action: action }, body || {})) }).then(function (r) { return r.json(); });
    });
  }
  function reg() { return navigator.serviceWorker.ready; }
  /** 'unsupported' | 'denied' | 'on' | 'off' */
  function status() {
    if (!supported()) return Promise.resolve('unsupported');
    if (Notification.permission === 'denied') return Promise.resolve('denied');
    return reg().then(function (r) { return r.pushManager.getSubscription(); }).then(function (s) {
      return s && Notification.permission === 'granted' && ls(ON) === '1' ? 'on' : 'off';
    }).catch(function () { return 'off'; });
  }
  function enable(summary) {
    if (!supported()) return Promise.resolve('unsupported');
    return Notification.requestPermission().then(function (p) {
      if (p !== 'granted') return 'denied';
      return reg().then(function (r) {
        return r.pushManager.getSubscription().then(function (s) { return s || r.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID_PUBLIC) }); });
      }).then(function (sub) { return call('subscribe', { subscription: sub.toJSON(), summary: summary }); })
        .then(function (res) { if (!res || !res.ok) throw new Error('subscribe failed'); ls(ON, '1'); return 'on'; });
    });
  }
  function disable() {
    ls(ON, null);
    return reg().then(function (r) { return r.pushManager.getSubscription(); })
      .then(function (s) { return s ? s.unsubscribe() : null; })
      .then(function () { return call('unsubscribe'); }).catch(function () {}).then(function () { return 'off'; });
  }
  function sync(summary) { if (ls(ON) !== '1') return Promise.resolve(); return call('sync', { summary: summary }).catch(function () {}); }
  window.PJPush = {
    supported: supported, status: status, enable: enable, disable: disable, sync: sync,
    dismissedRecently: function () { var t = +ls(DISMISSED) || 0; return Date.now() - t < 7 * 864e5; },
    dismiss: function () { ls(DISMISSED, String(Date.now())); }
  };
})();
