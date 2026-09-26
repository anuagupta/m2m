// node crop.js file.pdf spec.json   spec: [{page, x, y, w, h, out}] in 1.5-scale px; rendered at 3x
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => { const [,, file, specf] = process.argv; const spec = JSON.parse(require('fs').readFileSync(specf));
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8766/render.html'); await p.waitForFunction(() => window.ready);
  await p.evaluate((f) => window.load(f), file); let cur = null;
  for (const s of spec) {
    if (cur !== s.page) { const [w, h] = await p.evaluate((i) => window.renderPage(i, 3), s.page); await p.setViewportSize({ width: Math.ceil(w), height: Math.ceil(h) }); cur = s.page; }
    await p.screenshot({ path: s.out, clip: { x: s.x * 2, y: s.y * 2, width: s.w * 2, height: s.h * 2 } });
  }
  await b.close(); console.log('cropped', spec.length); })();
