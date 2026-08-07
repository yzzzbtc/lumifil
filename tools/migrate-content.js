#!/usr/bin/env node
/* =====================================================================
   migrate-content.js — jednorazowa migracja treści z js/translations.js
   do plików w /content (blog, realizacje, opinie).
   Uruchom raz:  node tools/migrate-content.js
   ===================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LANGS = ['pl', 'de', 'en', 'fr'];

const T = new Function(
  fs.readFileSync(path.join(ROOT, 'js/translations.js'), 'utf8') + ';return translations;'
)();

function slugify(s) {
  const map = { ą:'a', ć:'c', ę:'e', ł:'l', ń:'n', ó:'o', ś:'s', ź:'z', ż:'z',
                ä:'a', ö:'o', ü:'u', ß:'ss', é:'e', è:'e', ê:'e', à:'a', ç:'c' };
  return String(s).toLowerCase()
    .replace(/[ąćęłńóśźżäöüßéèêàç]/g, ch => map[ch] || ch)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

// ---------------------------------------------------------------- BLOG
// Istniejące post1..post6 to placeholdery (tytuł + zajawka, bez treści).
// Zapisujemy je jako szkice (draft) — właściciel uzupełni treść w panelu.
const BLOG_CATEGORY = {
  post1: 'windows', post2: 'tips', post3: 'doors',
  post4: 'shutters', post5: 'trends', post6: 'windows',
};
const BLOG_GRADIENT = {
  post1: 'linear-gradient(135deg, #1a5f7a 0%, #2980b9 100%)',
  post2: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)',
  post3: 'linear-gradient(135deg, #2c3e50 0%, #5a6c7d 100%)',
  post4: 'linear-gradient(135deg, #1a5f7a 0%, #134b5f 100%)',
  post5: 'linear-gradient(135deg, #8a9299 0%, #5a6268 100%)',
  post6: 'linear-gradient(135deg, #2980b9 0%, #1a5f7a 100%)',
};

let blogCount = 0;
for (const key of Object.keys(BLOG_CATEGORY)) {
  const pl = T.pl.blog[key];
  if (!pl) continue;
  const slug = slugify(pl.title);
  const post = {
    slug,
    date: '2026-01-15',
    category: BLOG_CATEGORY[key],
    gradient: BLOG_GRADIENT[key],
    image: '',
    draft: true,
    i18n: {},
  };
  for (const lang of LANGS) {
    const t = T[lang].blog[key] || pl;
    post.i18n[lang] = { title: t.title, excerpt: t.excerpt, body: '' };
  }
  writeJson(path.join(ROOT, 'content/blog', slug + '.json'), post);
  blogCount++;
}

// ----------------------------------------------------------- REALIZACJE
const PROJECT_META = {
  p1: { category: 'windows',  tag: 'tagWindows', icon: '🏫', gradient: 'linear-gradient(135deg, #1a5f7a 0%, #2980b9 100%)' },
  p2: { category: 'doors',    tag: 'tagDoors',   icon: '🏘️', gradient: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)' },
  p3: { category: 'shutters', tag: 'tagShutters',icon: '🏠', gradient: 'linear-gradient(135deg, #2c3e50 0%, #5a6c7d 100%)' },
  p4: { category: 'windows',  tag: 'tagWindows', icon: '⚖️', gradient: 'linear-gradient(135deg, #1a5f7a 0%, #134b5f 100%)' },
  p5: { category: 'windows',  tag: 'tagWood',    icon: '🏛️', gradient: 'linear-gradient(135deg, #8a9299 0%, #5a6268 100%)' },
  p6: { category: 'windows',  tag: 'tagPVC',     icon: '🏢', gradient: 'linear-gradient(135deg, #2980b9 0%, #1a5f7a 100%)' },
  p7: { category: 'doors',    tag: 'tagDoors',   icon: '🏥', gradient: 'linear-gradient(135deg, #5a6268 0%, #2c3e50 100%)' },
};

let projCount = 0;
for (const key of Object.keys(PROJECT_META)) {
  const pl = T.pl.projects[key];
  if (!pl) continue;
  const slug = slugify(pl.title);
  const proj = { slug, order: projCount + 1, ...PROJECT_META[key], image: '', i18n: {} };
  for (const lang of LANGS) {
    const t = T[lang].projects[key] || pl;
    proj.i18n[lang] = { title: t.title, desc: t.desc };
  }
  writeJson(path.join(ROOT, 'content/projects', slug + '.json'), proj);
  projCount++;
}

// -------------------------------------------------------------- OPINIE
const testimonials = [];
for (let i = 1; i <= 10; i++) {
  const pl = T.pl.testimonials['t' + i];
  if (!pl) break;
  const entry = { id: 't' + i, location: pl.location, i18n: {} };
  for (const lang of LANGS) {
    const t = T[lang].testimonials['t' + i] || pl;
    entry.i18n[lang] = { text: t.text };
  }
  testimonials.push(entry);
}
writeJson(path.join(ROOT, 'content/testimonials.json'), { items: testimonials });

console.log(`✓ blog:         ${blogCount} wpisów -> content/blog/*.json (draft)`);
console.log(`✓ realizacje:   ${projCount} wpisów -> content/projects/*.json`);
console.log(`✓ opinie:       ${testimonials.length} wpisów -> content/testimonials.json`);
