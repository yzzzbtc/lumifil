#!/usr/bin/env node
/* =====================================================================
   build-sitemap.js — generuje sitemap.xml z faktycznie istniejących stron.
   Uruchom:  node tools/build-sitemap.js
   Źródła:   sekcje strony głównej + oferta/*.html + blog/*.html
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

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

/* lastmod bierzemy z daty ostatniego commita dotykającego pliku, a NIE
   z bieżącej daty ani z mtime. Powody:
   - bieżąca data zmieniałaby sitemap.xml przy każdym buildzie, więc
     GitHub Actions commitowałby zmianę nawet gdy nic się nie zmieniło,
   - mtime w CI to moment checkoutu, czyli też za każdym razem inny.
   Dzięki temu build jest deterministyczny, a lastmod prawdziwy. */
/* Płytki klon (domyślny w actions/checkout) sprawia, że `git log -- <plik>`
   nic nie zwraca i wszystko spada na mtime — sitemap zmieniałby się co build.
   Lepiej głośno ostrzec, niż cicho generować śmieciowe daty. */
(function warnIfShallow() {
  try {
    const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (shallow === 'true') {
      console.warn('! Płytki klon repozytorium — daty lastmod będą niedokładne.');
      console.warn('  W GitHub Actions ustaw: actions/checkout z fetch-depth: 0');
    }
  } catch { /* brak gita — i tak zadziała fallback */ }
})();

const dateCache = new Map();
function gitDate(relPath) {
  if (dateCache.has(relPath)) return dateCache.get(relPath);
  let d;
  try {
    d = execFileSync('git', ['log', '-1', '--format=%cs', '--', relPath],
      { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { d = ''; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    // plik jeszcze niezacommitowany (np. świeżo wygenerowany) — użyj mtime
    const abs = path.join(ROOT, relPath);
    d = fs.existsSync(abs)
      ? fs.statSync(abs).mtime.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  }
  dateCache.set(relPath, d);
  return d;
}

function listHtml(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs)
    .filter(f => f.endsWith('.html'))
    .sort()
    .map(f => ({ loc: `/${dir}/${f}`, lastmod: gitDate(`${dir}/${f}`) }));
}

// Sekcje żyją w index.html — ich lastmod to data ostatniej zmiany tego pliku.
const homeDate = gitDate('index.html');
const urls = [];

for (const s of SECTIONS) {
  urls.push({ loc: s.loc, lastmod: homeDate, changefreq: s.changefreq, priority: s.priority });
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
