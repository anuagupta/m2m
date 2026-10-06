const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const mod = fs.readFileSync(path.join(root, 'assets', 'pj-analytics.js'), 'utf8');
const failures = [];
// Pull the route registry straight out of the module so there is one source of truth.
const pages = {};
mod.replace(/'([^']+)':\s*\{\s*name:\s*'([^']+)',\s*title:\s*'([^']+)'\s*\}/g, (_, p, name, title) => { pages[p] = { name, title }; });
const files = { '/': 'index.html', '/arena/': 'arena/index.html', '/m2m/': 'm2m/index.html', '/coach/': 'coach/index.html', '/news/': 'news/index.html', '/reviews/': 'reviews/index.html', '/privacy.html': 'privacy.html', '/terms.html': 'terms.html', '/disclaimer.html': 'disclaimer.html' };
Object.entries(files).forEach(([route, file]) => {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const page = pages[route];
  if (!page) { failures.push(`${route}: missing from the analytics registry`); return; }
  const titles = html.match(/<title>[^<]*<\/title>/g) || [];
  if (titles.length !== 1) failures.push(`${file}: expected exactly one <title>, found ${titles.length}`);
  else if (titles[0] !== `<title>${page.title}</title>`) failures.push(`${file}: <title> must be exactly "${page.title}"`);
  if ((html.match(/pj-analytics\.js/g) || []).length !== 1) failures.push(`${file}: must load pj-analytics.js exactly once`);
  if (/googletagmanager|G-FD29SH9PJF|gtag\(\s*'config'/.test(html)) failures.push(`${file}: contains its own GA snippet; use assets/pj-analytics.js only`);
  const bodyAt = html.search(/<body[\s>]/);
  if (bodyAt !== -1 && html.indexOf('pj-analytics.js') > bodyAt) failures.push(`${file}: pj-analytics.js must load before <body>`);
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canon || canon[1] !== 'https://prodjee.in' + route) failures.push(`${file}: canonical must be https://prodjee.in${route}`);
});
if (new Set(Object.values(pages).map((p) => p.name)).size !== Object.keys(pages).length) failures.push('page_name slugs must be unique');
if (new Set(Object.values(pages).map((p) => p.title)).size !== Object.keys(pages).length) failures.push('page titles must be unique');
Object.values(pages).forEach((p) => { if (!/ — ProDJEE$/.test(p.title)) failures.push(`"${p.title}" must follow "<Page name> — ProDJEE"`); });
if (!/send_page_view:\s*false/.test(mod)) failures.push('GA config must set send_page_view:false');
if (!/PROD_HOSTS/.test(mod)) failures.push('Production hostname guard missing');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
if (!(vercel.redirects || []).some((r) => r.has && r.has.some((h) => h.type === 'host' && h.value === 'www.prodjee.in') && /^https:\/\/prodjee\.in/.test(r.destination))) failures.push('vercel.json must redirect www.prodjee.in to https://prodjee.in');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
if (!sw.includes("'/assets/pj-analytics.js'")) failures.push('sw.js must precache /assets/pj-analytics.js');
if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log(`Validated analytics: one GA entry point, ${Object.keys(pages).length} routes with unique titles/page_names, canonicals, host redirect.`);
