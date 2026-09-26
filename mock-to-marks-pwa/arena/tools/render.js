// usage: node render.js file.pdf outprefix [scale] [from] [to]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const [,, file, out, scale = '1.6', from = '1', to = '999'] = process.argv;
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8766/render.html'); await p.waitForFunction(() => window.ready);
  const n = await p.evaluate((f) => window.load(f), file);
  for (let i = +from; i <= Math.min(n, +to); i++) {
    const [w, h] = await p.evaluate(([i, s]) => window.renderPage(i, s), [i, +scale]);
    await p.setViewportSize({ width: Math.ceil(w), height: Math.ceil(h) });
    await p.locator('#c').screenshot({ path: `${out}-${String(i).padStart(2, '0')}.png` });
  }
  console.log('pages', n); await b.close();
})();
