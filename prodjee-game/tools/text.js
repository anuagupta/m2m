const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => { const [,, file, out] = process.argv; const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8766/render.html'); await p.waitForFunction(() => window.ready);
  const n = await p.evaluate((f) => window.load(f), file); let all = '';
  for (let i = 1; i <= n; i++) all += `\n=== PAGE ${i} ===\n` + await p.evaluate((i) => window.pageText(i), i);
  require('fs').writeFileSync(out, all); console.log(file, 'pages', n, 'chars', all.length); await b.close(); })();
