// Manual browser check (not part of npm test): proves each route sends exactly
// ONE page_view with the right title and a clean URL.
//   node scripts/verify-analytics.js      (needs playwright + chromium)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const stub = "window.firebase={apps:[],initializeApp:function(){this.apps.push(1)},auth:function(){return{onAuthStateChanged:function(cb){setTimeout(function(){cb(null)},0)},currentUser:null,getRedirectResult:function(){return Promise.resolve({})},setPersistence:function(){return Promise.resolve()}}},firestore:function(){return{collection:function(){return{doc:function(){return{get:function(){return Promise.resolve({exists:false})},onSnapshot:function(){return function(){}}}}}}}}};window.firebase.auth.GoogleAuthProvider=function(){};";
const events = (page) => page.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'event').map((a) => ({ name: a[1], ...a[2] })));
(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  const browser = await chromium.launch({ args: ['--no-sandbox', `--host-resolver-rules=MAP prodjee.in 127.0.0.1`], executablePath: process.env.CHROME_PATH });
  let bad = 0;
  const check = (label, ok, extra) => { if (!ok) bad++; console.log((ok ? 'PASS ' : 'FAIL ') + label + (extra ? '  ' + extra : '')); };
  const newPage = async (ctx) => { const p = await ctx.newPage(); await p.route(/gstatic\.com|googletagmanager|_vercel/, (r) => r.fulfill({ contentType: 'application/javascript', body: /gstatic/.test(r.request().url()) ? stub : '' })); return p; };
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const routes = [['/', 'home', 'Home — ProDJEE'], ['/arena/', 'arena', 'Arena Practice — ProDJEE'], ['/m2m/', 'scoregps', 'ScoreGPS Mock Analysis — ProDJEE'], ['/coach/', 'coach', 'My Coach — ProDJEE'], ['/news/', 'news', 'Exam News — ProDJEE'], ['/privacy.html', 'legal_privacy', 'Privacy Policy — ProDJEE'], ['/terms.html', 'legal_terms', 'Terms of Use — ProDJEE'], ['/disclaimer.html', 'legal_disclaimer', 'Disclaimer — ProDJEE']];
  for (const [route, name, title] of routes) {
    const page = await newPage(ctx);
    await page.goto(`http://prodjee.in:${port}${route}?utm_source=wa&utm_medium=share&fbclid=XYZ#frag`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    const pv = (await events(page)).filter((e) => e.name === 'page_view');
    const ok = pv.length === 1 && pv[0].page_name === name && pv[0].page_title === title && page.url() && pv[0].page_location === `http://prodjee.in:${port}${route}` && (await page.title()) === title;
    check(`${route} -> exactly one page_view, title + clean URL`, ok, ok ? '' : JSON.stringify(pv));
    check(`${route} campaign params forwarded, stripped from page_location`, pv[0] && pv[0].campaign_source === 'wa' && !/utm_|fbclid/.test(pv[0].page_location));
    await page.close();
  }
  // refresh + back/forward on one page
  const page = await newPage(ctx);
  await page.goto(`http://prodjee.in:${port}/arena/`, { waitUntil: 'load' }); await page.waitForTimeout(800);
  await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800);
  check('refresh -> one page_view for the new load', (await events(page)).filter((e) => e.name === 'page_view').length === 1);
  await page.goto(`http://prodjee.in:${port}/news/`, { waitUntil: 'load' }); await page.waitForTimeout(500);
  await page.goBack({ waitUntil: 'load' }); await page.waitForTimeout(800);
  const back = (await events(page)).filter((e) => e.name === 'page_view');
  check('back navigation -> exactly one page_view, correct page', back.length === 1 && back[0].page_name === 'arena', JSON.stringify(back.map((b) => b.page_name)));
  await page.close();
  // localhost must stay silent
  const lp = await newPage(ctx);
  await lp.goto(`http://localhost:${port}/`, { waitUntil: 'load' }); await lp.waitForTimeout(800);
  check('localhost sends nothing', (await events(lp)).length === 0);
  // internal flag
  const ip = await newPage(await browser.newContext());
  await ip.goto(`http://prodjee.in:${port}/?pj_internal=1`, { waitUntil: 'load' }); await ip.waitForTimeout(800);
  check('internal traffic tagged traffic_type=internal', (await events(ip)).every((e) => e.traffic_type === 'internal') && (await events(ip)).length > 0);
  await browser.close(); server.close();
  process.exit(bad ? 1 : 0);
})();
