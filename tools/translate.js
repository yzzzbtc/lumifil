#!/usr/bin/env node
/* =====================================================================
   translate.js — automatyczne tłumaczenie treści z polskiego na DE/EN/FR.
   Uruchom:  DEEPL_API_KEY=xxx node tools/translate.js
   Czyta i NADPISUJE: content/blog/*.json, content/projects/*.json,
                      content/testimonials.json

   Zasady:
   - tłumaczymy tylko pola PUSTE albo takie, które wcześniej sami
     wygenerowaliśmy, a polskie źródło się od tego czasu zmieniło,
   - pole wypełnione ręcznie (bez wpisu w `_auto`) NIE jest nadpisywane,
   - bez klucza API skrypt kończy się bez błędu (build lokalny działa dalej).

   Znacznik `_auto` w pliku treści przechowuje skrót polskiego źródła,
   z którego powstało dane tłumaczenie.
   ===================================================================== */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const KEY = process.env.DEEPL_API_KEY || '';
const SOURCE_LANG = 'PL';
const TARGETS = { de: 'DE', en: 'EN-GB', fr: 'FR' };

// Pola tłumaczone w poszczególnych typach treści
const FIELDS = {
  blog: ['title', 'excerpt', 'body', 'metaTitle', 'metaDesc'],
  projects: ['title', 'desc'],
  testimonials: ['text'],
};

const sha1 = (s) => crypto.createHash('sha1').update(String(s), 'utf8').digest('hex').slice(0, 12);

// DeepL: klucze free kończą się na ":fx"
const ENDPOINT = KEY.endsWith(':fx')
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';

let apiCalls = 0;
let charsSent = 0;

async function deepl(text, targetLang) {
  const body = new URLSearchParams();
  body.append('text', text);
  body.append('source_lang', SOURCE_LANG);
  body.append('target_lang', targetLang);
  body.append('preserve_formatting', '1');

  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'DeepL-Auth-Key ' + KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (res.ok) {
      const json = await res.json();
      apiCalls++;
      charsSent += text.length;
      return json.translations[0].text;
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = 1500 * Math.pow(2, attempt);
      console.warn(`  ! DeepL ${res.status}, ponawiam za ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
      continue;
    }
    if (res.status === 456) throw new Error('DeepL: wyczerpany limit znaków na ten miesiąc.');
    if (res.status === 403) throw new Error('DeepL: nieprawidłowy klucz API (403).');
    throw new Error(`DeepL HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error('DeepL: przekroczono liczbę prób.');
}

/* Zwraca true, jeśli pole trzeba (prze)tłumaczyć. */
function needsTranslation(target, field, plHash) {
  const current = String(target[field] || '').trim();
  const auto = (target._auto || {})[field];
  if (!current) return true;                 // puste -> tłumacz
  if (auto && auto !== plHash) return true;  // nasze tłumaczenie, ale PL się zmienił
  return false;                              // ręcznie wpisane albo aktualne
}

async function translateEntry(entry, fields, label) {
  const pl = entry.i18n && entry.i18n.pl;
  if (!pl) return 0;
  let changed = 0;

  for (const [lang, deeplCode] of Object.entries(TARGETS)) {
    entry.i18n[lang] = entry.i18n[lang] || {};
    const target = entry.i18n[lang];

    for (const field of fields) {
      const source = String(pl[field] || '').trim();
      if (!source) continue;
      const plHash = sha1(source);
      if (!needsTranslation(target, field, plHash)) continue;

      const translated = await deepl(source, deeplCode);
      target[field] = translated;
      target._auto = target._auto || {};
      target._auto[field] = plHash;
      changed++;
      console.log(`  ${label} [${lang}.${field}] ${source.length} zn.`);
    }
  }
  return changed;
}

async function processDir(dir, fields) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return 0;
  let total = 0;
  for (const file of fs.readdirSync(abs).filter(f => f.endsWith('.json'))) {
    const p = path.join(abs, file);
    const entry = JSON.parse(fs.readFileSync(p, 'utf8'));
    const n = await translateEntry(entry, fields, file.replace(/\.json$/, ''));
    if (n) { fs.writeFileSync(p, JSON.stringify(entry, null, 2) + '\n', 'utf8'); total += n; }
  }
  return total;
}

async function processTestimonials() {
  const p = path.join(ROOT, 'content/testimonials.json');
  if (!fs.existsSync(p)) return 0;
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  let total = 0;
  for (const item of data.items || []) {
    total += await translateEntry(item, FIELDS.testimonials, item.id || 'opinia');
  }
  if (total) fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return total;
}

(async () => {
  if (!KEY) {
    console.log('· Brak DEEPL_API_KEY — pomijam tłumaczenie (treści zostają bez zmian).');
    process.exit(0);
  }

  let total = 0;
  total += await processDir('content/blog', FIELDS.blog);
  total += await processDir('content/projects', FIELDS.projects);
  total += await processTestimonials();

  if (total === 0) {
    console.log('✓ Tłumaczenia aktualne — nic do zrobienia.');
  } else {
    console.log(`✓ Przetłumaczono ${total} pól (${apiCalls} zapytań, ${charsSent} znaków).`);
  }
})().catch(e => {
  console.error('✗ ' + e.message);
  process.exit(1);
});
