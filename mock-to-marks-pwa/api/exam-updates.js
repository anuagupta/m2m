const SOURCES = {
  JEE: 'https://jeemain.nta.nic.in/public-notices/',
  NEET: 'https://neet.nta.nic.in/document-category/public-notices/'
};

function clean(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&ndash;|&mdash;/g, '—')
    .replace(/&#8211;|&#8212;/g, '—').replace(/&#038;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function absolute(href, base) {
  try { return new URL(href, base).href; } catch (_) { return base; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const exam = String(req.query.exam || '').toUpperCase() === 'NEET' ? 'NEET' : 'JEE';
  const source = SOURCES[exam];
  try {
    const response = await fetch(source, { headers: { 'User-Agent': 'ProDJEE/1.0 exam-updates' } });
    if (!response.ok) throw new Error('Official source returned ' + response.status);
    const html = await response.text();
    const links = [];
    const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = re.exec(html)) && links.length < 6) {
      const title = clean(match[2]);
      const url = absolute(match[1], source);
      if (title.length < 18 || /share on|skip to|read more|view\(|click here|home/i.test(title)) continue;
      if (!/nta\.nic\.in|s3waas\.gov\.in/i.test(url)) continue;
      if (links.some((item) => item.url === url || item.title === title)) continue;
      links.push({ title, url });
    }
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=86400');
    return res.status(200).json({ exam, source, fetchedAt: new Date().toISOString(), updates: links });
  } catch (error) {
    return res.status(502).json({ exam, source, updates: [], error: 'Official updates are temporarily unavailable' });
  }
};
