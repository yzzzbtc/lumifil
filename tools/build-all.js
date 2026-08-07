#!/usr/bin/env node
/* =====================================================================
   build-all.js — pełny build strony. Uruchamiany lokalnie i w GitHub Actions.
   Uruchom:  node tools/build-all.js
   Kolejność ma znaczenie:
     1. translate    — uzupełnia DE/EN/FR w plikach content/ (wymaga DEEPL_API_KEY;
                       bez klucza po prostu pomijane)
     2. build-offer  — 29 podstron oferty
     3. build-home   — realizacje, opinie i punkty handlowe na stronie głównej
     4. build-blog   — wpisy bloga + kafelki na stronie głównej
     5. build-sitemap— sitemap.xml z tego, co faktycznie powstało
   ===================================================================== */

const { execFileSync } = require('child_process');
const path = require('path');

const STEPS = [
  ['translate.js',     'Tłumaczenia'],
  ['build-offer.js',   'Podstrony oferty'],
  ['build-home.js',    'Strona główna'],
  ['build-blog.js',    'Blog'],
  ['build-sitemap.js', 'Sitemap'],
];

let failed = false;
for (const [script, label] of STEPS) {
  console.log(`\n── ${label} ${'─'.repeat(Math.max(0, 50 - label.length))}`);
  try {
    execFileSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit' });
  } catch (e) {
    console.error(`✗ Krok "${label}" zakończony błędem.`);
    failed = true;
    break;
  }
}

if (failed) process.exit(1);
console.log('\n✓ Build zakończony.');
