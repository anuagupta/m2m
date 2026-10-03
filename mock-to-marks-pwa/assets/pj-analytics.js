/* ProDJEE analytics: the ONLY place GA4 is initialised.
 * - one stable title + page_name per route, set before the single page_view
 * - clean canonical page_location (no utm/fbclid/gclid/ref/hash)
 * - production hostname only; internal traffic is tagged, never mixed in
 * - first-touch acquisition is stored once and replayed as user properties
 * See docs/analytics.md for the event schema. */
(function () {
  if (window.pjTrack) return; // never initialise twice
  var GA_ID = 'G-FD29SH9PJF';
  var PROD_HOSTS = { 'prodjee.in': 1 };

  // Canonical path -> stable analytics identity. Keep in sync with each
  // page's <title> (scripts/validate-analytics.js enforces this).
  var PAGES = {
    '/': { name: 'home', title: 'Home — ProDJEE' },
    '/arena/': { name: 'arena', title: 'Arena Practice — ProDJEE' },
    '/m2m/': { name: 'scoregps', title: 'ScoreGPS Mock Analysis — ProDJEE' },
    '/coach/': { name: 'coach', title: 'My Coach — ProDJEE' },
    '/news/': { name: 'news', title: 'Exam News — ProDJEE' },
    '/privacy.html': { name: 'legal_privacy', title: 'Privacy Policy — ProDJEE' },
    '/terms.html': { name: 'legal_terms', title: 'Terms of Use — ProDJEE' },
    '/disclaimer.html': { name: 'legal_disclaimer', title: 'Disclaimer — ProDJEE' }
  };

  function canonicalPath(p) {
    p = String(p || '/').toLowerCase().replace(/\/index\.html$/, '/').replace(/\/{2,}/g, '/');
    if (p.charAt(0) !== '/') p = '/' + p;
    if (!/\.[a-z0-9]+$/.test(p) && p.slice(-1) !== '/') p += '/';
    return p;
  }

  var ls = (function () { try { var k = '__pj'; localStorage.setItem(k, 1); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
  function lsGet(k) { try { return ls && ls.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (ls) ls.setItem(k, v); } catch (e) {} }

  var qs = new URLSearchParams(location.search);
  // ?pj_internal=1 marks this browser as internal (owner/dev); =0 clears it.
  if (qs.get('pj_internal') === '1') lsSet('pj.internal', '1');
  if (qs.get('pj_internal') === '0') { try { ls.removeItem('pj.internal'); } catch (e) {} }
  if (qs.get('pj_debug') === '1') lsSet('pj.debug', '1');
  if (qs.get('pj_debug') === '0') { try { ls.removeItem('pj.debug'); } catch (e) {} }
  var internal = lsGet('pj.internal') === '1';
  var debug = lsGet('pj.debug') === '1';
  var isProd = !!PROD_HOSTS[location.hostname];

  var path = canonicalPath(location.pathname);
  var page = PAGES[path] || { name: 'other', title: document.title };
  var pageLocation = location.origin + path;

  // 1. Title is set synchronously, before any hit can be sent.
  if (PAGES[path]) document.title = page.title;
  // 2. Every public page gets a canonical link pointing at the clean URL.
  if (PAGES[path] && !document.querySelector('link[rel="canonical"]')) {
    var link = document.createElement('link'); link.rel = 'canonical'; link.href = 'https://prodjee.in' + path;
    document.head.appendChild(link);
  }

  // ---- first-touch acquisition (stored once per browser) ----
  var CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];
  function fromUrl() {
    var o = {}, any = false;
    CAMPAIGN_KEYS.concat(['gclid', 'fbclid', 'ref', 'source']).forEach(function (k) { var v = qs.get(k); if (v) { o[k] = String(v).slice(0, 100); any = true; } });
    return any ? o : null;
  }
  var urlTouch = fromUrl();
  var firstTouch = null;
  try { firstTouch = JSON.parse(lsGet('pj.ft') || 'null'); } catch (e) {}
  if (!firstTouch) {
    var refHost = '';
    try { refHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (e) {}
    var src = (urlTouch && (urlTouch.utm_source || urlTouch.ref || urlTouch.source)) || (refHost && refHost !== location.hostname ? refHost : '(direct)');
    var med = (urlTouch && urlTouch.utm_medium) || (urlTouch && (urlTouch.gclid ? 'cpc' : urlTouch.fbclid ? 'paid_social' : '')) || (refHost && refHost !== location.hostname ? 'referral' : '(none)');
    firstTouch = { source: src, medium: med, campaign: (urlTouch && urlTouch.utm_campaign) || '(not set)', landing: page.name, at: Date.now() };
    lsSet('pj.ft', JSON.stringify(firstTouch));
  }

  // ---- gtag bootstrap (defined here so no page needs its own snippet) ----
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  var enabled = isProd;
  if (enabled) {
    var cfg = { send_page_view: false, page_title: page.title, page_location: pageLocation, page_path: path, page_name: page.name };
    if (internal) cfg.traffic_type = 'internal';
    if (debug) cfg.debug_mode = true;
    gtag('js', new Date());
    gtag('config', GA_ID, cfg);
    gtag('set', 'user_properties', { first_touch_source: firstTouch.source, first_touch_medium: firstTouch.medium, first_touch_campaign: firstTouch.campaign, first_touch_page: firstTouch.landing });
    var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
  }

  function base() { return { page_name: page.name, page_title: page.title, page_location: pageLocation, page_path: path }; }

  /** Send any event; page_name is always attached. */
  window.pjTrack = function (name, params) {
    var p = base();
    if (params) for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) p[k] = params[k];
    if (internal) p.traffic_type = 'internal';
    if (debug) p.debug_mode = true;
    if (enabled) gtag('event', name, p);
    else if (debug && window.console) console.info('[pjTrack skipped: non-production host]', name, p);
  };
  window.pjAnalytics = { page: page, path: path, enabled: enabled, internal: internal, firstTouch: firstTouch };

  // ---- exactly one page_view per route entry ----
  var sentFor = -1, navId = 0;
  function sendPageView(extra) {
    if (sentFor === navId) return;
    sentFor = navId;
    var p = {};
    // Campaign params are removed from page_location, so hand them to GA explicitly on landing.
    if (urlTouch && !extra) {
      if (urlTouch.utm_source) p.campaign_source = urlTouch.utm_source;
      if (urlTouch.utm_medium) p.campaign_medium = urlTouch.utm_medium;
      if (urlTouch.utm_campaign) p.campaign_name = urlTouch.utm_campaign;
      if (urlTouch.utm_term) p.campaign_term = urlTouch.utm_term;
      if (urlTouch.utm_content) p.campaign_content = urlTouch.utm_content;
      if (urlTouch.ref) p.referral_code = urlTouch.ref;
    }
    window.pjTrack('page_view', p);
  }
  sendPageView();
  // Back/forward restored from the browser's page cache: no reload happens, but it is a real route view.
  window.addEventListener('pageshow', function (e) { if (e.persisted) { navId++; sendPageView(true); } });

  /** In-app screens (Arena tabs, ScoreGPS steps) are NOT page_views: URL never changes there. */
  window.pjScreen = function (screenName) {
    if (window.pjAnalytics.lastScreen === screenName) return;
    window.pjAnalytics.lastScreen = screenName;
    window.pjTrack('app_screen', { screen_name: screenName });
  };
})();
