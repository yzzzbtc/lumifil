#!/usr/bin/env node
/* =====================================================================
   build-home.js — wstrzykuje treści z /content na stronę główną.
   Uruchom:  node tools/build-home.js
   Czyta:    content/projects/*.json, content/testimonials.json,
             content/company.json
   Pisze:    index.html (między znacznikami) + tłumaczenia do
             js/translations.js pod kluczami projectsList / opinions
   Znaczniki w index.html:
     <!-- PROJECTS:START --> ... <!-- PROJECTS:END -->
     <!-- TESTIMONIALS:START --> ... <!-- TESTIMONIALS:END -->
     <!-- LOCATIONS:START --> ... <!-- LOCATIONS:END -->
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const { injectBlock } = require('./lib-inject.js');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const LANGS = ['pl', 'de', 'en', 'fr'];
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #1a5f7a 0%, #2980b9 100%)';

/* Polskie etykiety kafelków realizacji — do statycznego HTML (to widzi Google
   i użytkownik z wyłączonym JS). Klucze muszą istnieć w js/translations.js. */
const TAG_LABELS_PL = (() => {
  try {
    const src = fs.readFileSync(path.join(ROOT, 'js/translations.js'), 'utf8');
    const T = new Function(src + ';return translations;')();
    return T.pl.projects || {};
  } catch {
    return {};
  }
})();

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function readJson(p, fallback) {
  const abs = path.join(ROOT, p);
  if (!fs.existsSync(abs)) return fallback;
  return JSON.parse(fs.readFileSync(abs, 'utf8'));
}

function loadDir(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter(f => f.endsWith('.json')).map(f => {
    const o = JSON.parse(fs.readFileSync(path.join(abs, f), 'utf8'));
    o.slug = o.slug || f.replace(/\.json$/, '');
    return o;
  });
}

/* Podmienia zawartość między znacznikami. Zwraca [nowyHtml, czyPodmieniono]. */
function replaceBlock(html, name, body, indent) {
  const START = `<!-- ${name}:START -->`;
  const END = `<!-- ${name}:END -->`;
  const i = html.indexOf(START);
  const j = html.indexOf(END);
  if (i < 0 || j < 0) {
    console.warn(`! Brak znaczników ${name}:START/END w index.html — pomijam.`);
    return [html, false];
  }
  return [html.slice(0, i + START.length) + '\n' + body + '\n' + indent + html.slice(j), true];
}

// ------------------------------------------------------------- REALIZACJE
function renderProjects(projects) {
  return projects.map(p => {
    const pl = p.i18n.pl;
    const style = p.image
      ? `background-image:url('${esc(String(p.image).replace(/^\//, ''))}');background-size:cover;background-position:center;`
      : `background: ${esc(p.gradient || DEFAULT_GRADIENT)};`;
    const inner = p.image ? '' : `
                            <div class="project-overlay">
                                <span class="project-icon project-dot"></span>
                            </div>`;
    return `                    <div class="project-card" data-category="${esc(p.category)}">
                        <div class="project-image" style="${style}">${inner}
                        </div>
                        <div class="project-info">
                            <h3 data-i18n="projectsList.${esc(p.slug)}.title">${esc(pl.title)}</h3>
                            <p data-i18n="projectsList.${esc(p.slug)}.desc">${esc(pl.desc)}</p>
                            <span class="project-tag" data-i18n="projects.${esc(p.tag)}">${esc(TAG_LABELS_PL[p.tag] || p.tag)}</span>
                        </div>
                    </div>`;
  }).join('\n\n');
}

// ----------------------------------------------------------------- OPINIE
function renderTestimonials(items) {
  return items.map(t => {
    const stars = '★'.repeat(Math.max(1, Math.min(5, t.stars || 5)));
    return `                    <div class="testimonial-card">
                        <div class="testimonial-stars">${stars}</div>
                        <p class="testimonial-text" data-i18n="opinions.${esc(t.id)}.text">${esc(t.i18n.pl.text)}</p>
                        <div class="testimonial-author">
                            <span class="author-name">${esc(t.author)}</span>
                            <span class="author-location">${esc(t.location)}</span>
                        </div>
                    </div>`;
  }).join('\n\n');
}

// ------------------------------------------------------------ PUNKTY HANDL.
function renderLocations(company) {
  return (company.locations || []).map((loc) => {
    const line2 = [loc.postalCode, loc.city].filter(Boolean).join(' ');
    const q = `${loc.street}, ${line2}`.replace(/\s+/g, '+');
    // Jedna etykieta dla siedziby, jedna dla pozostałych — działa dla dowolnej
    // liczby punktów (loc3Label zostaje dla zgodności, ale nie jest wymagany).
    const labelKey = loc.isMain ? 'about.loc1Label' : 'about.loc2Label';
    const labelText = loc.isMain ? 'Siedziba główna' : 'Punkt handlowy';
    return `                        <div class="location-card">
                            <span class="location-icon">📍</span>
                            <span class="location-label" data-i18n="${labelKey}">${esc(labelText)}</span>
                            <p class="location-address">${esc(loc.street)}<br>${esc(line2)}</p>
                            <a href="https://maps.google.com/?q=${q}" target="_blank" rel="noopener" class="location-map" data-i18n="about.locMap">Zobacz na mapie</a>
                        </div>`;
  }).join('\n');
}

// --------------------------------------------------- tłumaczenia do JS
function injectTranslations(projects, testimonials) {
  const tPath = path.join(ROOT, 'js/translations.js');

  const projBlob = {}, opBlob = {};
  for (const lang of LANGS) {
    projBlob[lang] = {};
    projects.forEach(p => {
      const c = p.i18n[lang] || p.i18n.pl;
      projBlob[lang][p.slug] = { title: c.title || p.i18n.pl.title, desc: c.desc || p.i18n.pl.desc };
    });
    opBlob[lang] = {};
    testimonials.forEach(t => {
      const c = t.i18n[lang] || t.i18n.pl;
      opBlob[lang][t.id] = { text: c.text || t.i18n.pl.text };
    });
  }

  const body = LANGS.map(l =>
    `if (typeof translations !== 'undefined' && translations.${l}) {\n` +
    `    translations.${l}.projectsList = ${JSON.stringify(projBlob[l])};\n` +
    `    translations.${l}.opinions = ${JSON.stringify(opBlob[l])};\n` +
    `}`
  ).join('\n');

  injectBlock(tPath, 'HOME_CONTENT', body);
}

// ---------------------------------------------------------------- run
const projects = loadDir('content/projects').sort((a, b) => (a.order || 99) - (b.order || 99));
const testimonials = (readJson('content/testimonials.json', { items: [] }).items) || [];
const company = readJson('content/company.json', { locations: [] });

let html = fs.readFileSync(INDEX, 'utf8');
let ok = 0;
let changed;

[html, changed] = replaceBlock(html, 'PROJECTS', renderProjects(projects), '                ');
ok += changed ? 1 : 0;
[html, changed] = replaceBlock(html, 'TESTIMONIALS', renderTestimonials(testimonials), '                ');
ok += changed ? 1 : 0;
[html, changed] = replaceBlock(html, 'LOCATIONS', renderLocations(company), '                    ');
ok += changed ? 1 : 0;

fs.writeFileSync(INDEX, html, 'utf8');
injectTranslations(projects, testimonials);

console.log(`✓ Strona główna: ${projects.length} realizacji, ${testimonials.length} opinii, ${(company.locations || []).length} punktów (${ok}/3 sekcje podmienione)`);
