/* =====================================================================
   lib-inject.js — wspólny helper do dopisywania wygenerowanych bloków
   na końcu js/translations.js.

   Każdy generator zarządza WYŁĄCZNIE swoim blokiem, ograniczonym parą
   znaczników START/END. Dzięki temu build-home.js i build-blog.js mogą
   pisać do tego samego pliku, nie kasując sobie nawzajem wyników
   (bez tego drugi skrypt ucinał plik na swoim znaczniku i gubił cudzy blok).
   ===================================================================== */

const fs = require('fs');

/**
 * Wstawia lub podmienia nazwany blok w pliku.
 * @param {string} file  ścieżka do pliku
 * @param {string} name  nazwa bloku, np. 'BLOG_POSTS'
 * @param {string} body  treść bloku (bez znaczników)
 */
function injectBlock(file, name, body) {
  const START = `// ${name}:AUTO:START — generowane automatycznie, nie edytuj ręcznie`;
  const END = `// ${name}:AUTO:END`;
  let src = fs.readFileSync(file, 'utf8');

  const i = src.indexOf(START);
  const j = src.indexOf(END);
  const block = `${START}\n${body}\n${END}`;

  if (i >= 0 && j > i) {
    src = src.slice(0, i) + block + src.slice(j + END.length);
  } else {
    src = src.replace(/\n+$/, '\n') + '\n' + block + '\n';
  }
  fs.writeFileSync(file, src, 'utf8');
}

module.exports = { injectBlock };
