#!/usr/bin/env node
/* =====================================================================
   build-sitemap.js — generuje sitemap.xml z faktycznie istniejących stron.
   Uruchom:  node tools/build-sitemap.js
   Źródła:   sekcje strony głównej + oferta/*.html + blog/*.html
   ===================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://lumifil.org';

const SECTIONS = [
  { loc: '/',          priority: '1.0', changefreq: 'weekly' },
  { loc: '/#about',    priority: '0.8', changefreq: 'monthly' },
  { loc: '/#offer',    priority: '0.9', changefreq: 'monthly' },
  { loc: '/#projects', priority: '0.8', changefreq: 'monthly' },
  { loc: '/#blog',     priority: '0.7', changefreq: 'weekly' },
  { loc: '/#contact',  priority: '0.8', changefreq: 'monthly' },
];

function today() {
  // data pliku najświeższej zmiany zamiast Date.now() — stabilne między buildami
  return new Date().toISOString().slice(0, 10);
}

function listHtml(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter(f => f.endsWith('.html'))
    .sort()
    .map(f => ({
      loc: `/${dir}/${f}`,
      lastmod: fs.statSync(path.join(abs, f)).mtime.toISOString().slice(0, 10),
    }));
}

const stamp = today();
const urls = [];

for (const s of SECTIONS) {
  urls.push({ loc: s.loc, lastmod: stamp, changefreq: s.changefreq, priority: s.priority });
}
for (const p of listHtml('oferta')) {
  urls.push({ ...p, changefreq: 'monthly', priority: '0.8' });
}
for (const p of listHtml('blog')) {
  urls.push({ ...p, changefreq: 'monthly', priority: '0.6' });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `    <url>
        <loc>${SITE}${u.loc}</loc>
        <lastmod>${u.lastmod}</lastmod>
        <changefreq>${u.changefreq}</changefreq>
        <priority>${u.priority}</priority>
    </url>`).join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`✓ sitemap.xml: ${urls.length} URL-i (${SECTIONS.length} sekcji, ${listHtml('oferta').length} oferta, ${listHtml('blog').length} blog)`);
