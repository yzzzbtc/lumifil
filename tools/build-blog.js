#!/usr/bin/env node
/* =====================================================================
   build-blog.js — generator wpisów bloga LUMIFIL (katalog /blog)
   Uruchom:  node tools/build-blog.js
   Czyta:    content/blog/*.json  (jeden plik = jeden wpis, 4 języki)
   Pisze:    blog/<slug>.html     (statyczna strona na wpis — widoczna w Google)
             + wstrzykuje kafelki na stronę główną (sekcja #blog)
   Wpisy z "draft": true lub pustą treścią PL są pomijane.
   ===================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'content/blog');
const OUT_DIR = path.join(ROOT, 'blog');
const SITE = 'https://lumifil.org';
const PHONE = '+48663715148';
const PHONE_HUMAN = '+48 663 715 148';
const LANGS = ['pl', 'de', 'en', 'fr'];

const OG_LOCALE = { pl: 'pl_PL', de: 'de_DE', en: 'en_GB', fr: 'fr_FR' };

// Etykiety UI wpisu (4 języki)
const UI = {
  pl: { home: 'Strona główna', blog: 'Blog', backToBlog: '← Wszystkie wpisy', relatedHeading: 'Zobacz też', ctaText: 'Masz pytania? Chętnie doradzimy.', ctaCall: 'Zadzwoń: ' + PHONE_HUMAN, ctaQuote: 'Bezpłatna wycena', published: 'Opublikowano' },
  de: { home: 'Startseite', blog: 'Blog', backToBlog: '← Alle Beiträge', relatedHeading: 'Siehe auch', ctaText: 'Haben Sie Fragen? Wir beraten Sie gerne.', ctaCall: 'Anrufen: ' + PHONE_HUMAN, ctaQuote: 'Kostenloses Angebot', published: 'Veröffentlicht' },
  en: { home: 'Home', blog: 'Blog', backToBlog: '← All posts', relatedHeading: 'See also', ctaText: 'Have questions? We are happy to advise.', ctaCall: 'Call: ' + PHONE_HUMAN, ctaQuote: 'Free quote', published: 'Published' },
  fr: { home: 'Accueil', blog: 'Blog', backToBlog: '← Tous les articles', relatedHeading: 'À voir aussi', ctaText: 'Des questions ? Nous vous conseillons volontiers.', ctaCall: 'Appeler : ' + PHONE_HUMAN, ctaQuote: 'Devis gratuit', published: 'Publié' },
};

const CATEGORY_NAMES = {
  windows:  { pl: 'Okna',   de: 'Fenster',   en: 'Windows', fr: 'Fenêtres' },
  doors:    { pl: 'Drzwi',  de: 'Türen',     en: 'Doors',   fr: 'Portes' },
  shutters: { pl: 'Rolety', de: 'Rollläden', en: 'Blinds',  fr: 'Volets' },
  tips:     { pl: 'Porady', de: 'Tipps',     en: 'Tips',    fr: 'Conseils' },
  trends:   { pl: 'Trendy', de: 'Trends',    en: 'Trends',  fr: 'Tendances' },
};

const DEFAULT_GRADIENT = 'linear-gradient(135deg, #1a5f7a 0%, #2980b9 100%)';

// ---------------------------------------------------------------- helpers
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Minimalny markdown -> HTML. Treść jest najpierw escapowana, więc surowy HTML
   z panelu nie może rozwalić strony. Obsługa: ## / ###, akapity, listy - i 1.,
   **pogrubienie**, *kursywa*, [tekst](url). */
function markdown(src) {
  if (!src) return '';
  const blocks = esc(src).replace(/\r\n/g, '\n').split(/\n{2,}/);
  const inline = (t) => t
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');

  return blocks.map(raw => {
    const b = raw.trim();
    if (!b) return '';
    let m = b.match(/^###\s+(.*)$/s);
    if (m) return `<h3>${inline(m[1].trim())}</h3>`;
    m = b.match(/^##\s+(.*)$/s);
    if (m) return `<h2>${inline(m[1].trim())}</h2>`;
    const lines = b.split('\n');
    if (lines.every(l => /^\s*[-*]\s+/.test(l))) {
      return '<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('') + '</ul>';
    }
    if (lines.every(l => /^\s*\d+[.)]\s+/.test(l))) {
      return '<ol>' + lines.map(l => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>`).join('') + '</ol>';
    }
    return `<p>${inline(b)}</p>`;
  }).filter(Boolean).join('\n');
}

function formatDate(iso, lang) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return iso;
  const locale = { pl: 'pl-PL', de: 'de-DE', en: 'en-GB', fr: 'fr-FR' }[lang] || 'pl-PL';
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function loadPosts() {
  if (!fs.existsSync(SRC_DIR)) return [];
  return fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const p = JSON.parse(fs.readFileSync(path.join(SRC_DIR, f), 'utf8'));
      p.slug = p.slug || f.replace(/\.json$/, '');
      return p;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function isPublished(p) {
  return !p.draft && p.i18n && p.i18n.pl && String(p.i18n.pl.body || '').trim().length > 0;
}

// ---------------------------------------------------------------- fragments
function langSelectorHtml() {
  return `    <div id="language-selector" class="language-selector hidden">
        <div class="language-content">
            <div class="logo-large"><span class="logo-title">LUMIFIL</span><p class="tagline">Okna • Drzwi • Rolety</p></div>
            <div class="language-options">
                <button class="lang-btn" data-lang="pl" onclick="selectLanguage('pl')"><span class="flag">🇵🇱</span><span class="lang-name">Polski</span></button>
                <button class="lang-btn" data-lang="de" onclick="selectLanguage('de')"><span class="flag">🇩🇪</span><span class="lang-name">Deutsch</span></button>
                <button class="lang-btn" data-lang="en" onclick="selectLanguage('en')"><span class="flag">🇬🇧</span><span class="lang-name">English</span></button>
                <button class="lang-btn" data-lang="fr" onclick="selectLanguage('fr')"><span class="flag">🇫🇷</span><span class="lang-name">Français</span></button>
            </div>
        </div>
    </div>`;
}

function footerHtml() {
  return `        <footer class="footer">
            <div class="container">
                <div class="footer-content">
                    <div class="footer-brand">
                        <span class="logo-text">LUMIFIL</span>
                        <p data-i18n="footer.desc">Profesjonalny montaż okien, drzwi i rolet od prawie 30 lat.</p>
                    </div>
                    <div class="footer-links">
                        <a href="../index.html#about" data-i18n="nav.about">O nas</a>
                        <a href="../index.html#offer" data-i18n="nav.offer">Oferta</a>
                        <a href="../index.html#projects" data-i18n="nav.projects">Realizacje</a>
                        <a href="../index.html#blog" data-i18n="nav.blog">Blog</a>
                        <a href="../index.html#contact" data-i18n="nav.contact">Kontakt</a>
                    </div>
                    <div class="footer-social">
                        <a href="https://www.facebook.com/profile.php?id=61586969377612" target="_blank" rel="noopener" title="Facebook" class="social-link">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        </a>
                    </div>
                </div>
                <div class="footer-bottom">
                    <p class="footer-company">
                        Handel-Pośrednictwo-Usługi Lumifil Lucyna Sobacka<br>
                        ul. Wojska Polskiego 66, 86-100 Świecie &middot; NIP: 5591392973 &middot; REGON: 092467829
                    </p>
                    <p>&copy; 2026 LUMIFIL. <span data-i18n="footer.rights">Wszelkie prawa zastrzeżone.</span></p>
                </div>
            </div>
        </footer>`;
}

function jsonLd(post) {
  const pl = post.i18n.pl;
  const url = `${SITE}/blog/${post.slug}.html`;
  const article = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: pl.title,
    description: pl.excerpt,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    inLanguage: 'pl-PL',
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Organization', name: 'LUMIFIL' },
    publisher: {
      '@type': 'Organization', name: 'LUMIFIL',
      logo: { '@type': 'ImageObject', url: `${SITE}/images/logo.png` },
    },
  };
  if (post.image) article.image = `${SITE}/${String(post.image).replace(/^\//, '')}`;
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE}/#blog` },
      { '@type': 'ListItem', position: 3, name: pl.title, item: url },
    ],
  };
  return `    <script type="application/ld+json">\n${JSON.stringify(article)}\n    </script>\n    <script type="application/ld+json">\n${JSON.stringify(breadcrumb)}\n    </script>`;
}

function buildPostContent(post, related) {
  const out = {};
  for (const lang of LANGS) {
    const src = post.i18n[lang] || {};
    const pl = post.i18n.pl || {};
    // Brak tłumaczenia danego pola -> pokazujemy wersję polską zamiast pustki.
    const c = {
      title: src.title || pl.title,
      excerpt: src.excerpt || pl.excerpt,
      body: String(src.body || '').trim() ? src.body : pl.body,
      metaTitle: src.metaTitle || pl.metaTitle,
      metaDesc: src.metaDesc || pl.metaDesc,
    };
    const ui = UI[lang];
    const cat = (CATEGORY_NAMES[post.category] || {})[lang] || post.category || '';
    out[lang] = {
      home: ui.home,
      blog: ui.blog,
      backToBlog: ui.backToBlog,
      category: cat,
      title: c.title,
      excerpt: c.excerpt,
      body: markdown(c.body),
      dateLabel: `${ui.published}: ${formatDate(post.date, lang)}`,
      relatedHeading: ui.relatedHeading,
      ctaText: ui.ctaText,
      ctaCall: ui.ctaCall,
      ctaQuote: ui.ctaQuote,
      metaTitle: c.metaTitle || `${c.title} | LUMIFIL`,
      metaDesc: c.metaDesc || c.excerpt,
    };
    related.forEach((r, i) => {
      out[lang]['related' + i] = (r.i18n[lang] || r.i18n.pl).title;
    });
  }
  return out;
}

function renderPost(post, related) {
  const pl = post.i18n.pl;
  const url = `${SITE}/blog/${post.slug}.html`;
  const content = buildPostContent(post, related);
  const meta = content.pl;
  const heroStyle = post.image
    ? `background-image:url('../${String(post.image).replace(/^\//, '')}');background-size:cover;background-position:center;`
    : `background:${post.gradient || DEFAULT_GRADIENT};`;

  const relatedHtml = related.length ? `            <section class="lp-section">
                <div class="container post-related">
                    <h2 data-i18n="lp.relatedHeading">${esc(UI.pl.relatedHeading)}</h2>
                    <ul>
${related.map((r, i) => `                        <li><a href="${esc(r.slug)}.html" data-i18n="lp.related${i}">${esc(r.i18n.pl.title)}</a></li>`).join('\n')}
                    </ul>
                </div>
            </section>\n` : '';

  return `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(meta.metaTitle)}</title>
    <meta name="description" content="${esc(meta.metaDesc)}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="article">
    <meta property="og:title" content="${esc(meta.metaTitle)}">
    <meta property="og:description" content="${esc(meta.metaDesc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${post.image ? SITE + '/' + String(post.image).replace(/^\//, '') : SITE + '/images/hero/modern-house.jpg'}">
    <meta property="og:locale" content="${OG_LOCALE.pl}">
    <meta property="article:published_time" content="${esc(post.date)}">
${jsonLd(post)}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/offer.css">
    <link rel="stylesheet" href="../css/blog.css">
</head>
<body class="landing-page lp-body">
${langSelectorHtml()}

    <div id="main-site" class="main-site">
        <header class="header">
            <div class="container">
                <div class="nav-wrapper">
                    <a href="../index.html" class="logo">
                        <img src="../images/logo.png" alt="LUMIFIL - Montaż okien i drzwi Świecie" class="logo-img">
                        <span class="logo-text">LUMIFIL</span>
                    </a>
                    <nav class="nav">
                        <a href="../index.html#about" class="nav-link" data-i18n="nav.about">O nas</a>
                        <a href="../index.html#offer" class="nav-link" data-i18n="nav.offer">Oferta</a>
                        <a href="../index.html#projects" class="nav-link" data-i18n="nav.projects">Realizacje</a>
                        <a href="../index.html#blog" class="nav-link" data-i18n="nav.blog">Blog</a>
                        <a href="../index.html#contact" class="nav-link" data-i18n="nav.contact">Kontakt</a>
                    </nav>
                    <div class="nav-right">
                        <button class="lang-switch" onclick="showLanguageSelector()"><span id="current-lang-flag">🇵🇱</span></button>
                        <button class="mobile-menu-btn" onclick="toggleMobileMenu()"><span></span><span></span><span></span></button>
                    </div>
                </div>
            </div>
        </header>

        <div id="mobile-menu" class="mobile-menu">
            <a href="../index.html#about" class="mobile-nav-link" data-i18n="nav.about">O nas</a>
            <a href="../index.html#offer" class="mobile-nav-link" data-i18n="nav.offer">Oferta</a>
            <a href="../index.html#projects" class="mobile-nav-link" data-i18n="nav.projects">Realizacje</a>
            <a href="../index.html#blog" class="mobile-nav-link" data-i18n="nav.blog">Blog</a>
            <a href="../index.html#contact" class="mobile-nav-link" data-i18n="nav.contact">Kontakt</a>
        </div>

        <main class="lp-main">
            <nav class="lp-breadcrumb" aria-label="breadcrumb">
                <div class="container">
                    <ol>
                        <li><a href="../index.html" data-i18n="lp.home">${esc(UI.pl.home)}</a></li>
                        <li><a href="../index.html#blog" data-i18n="lp.blog">${esc(UI.pl.blog)}</a></li>
                        <li data-i18n="lp.title">${esc(pl.title)}</li>
                    </ol>
                </div>
            </nav>

            <article class="post">
                <div class="post-hero" style="${heroStyle}"></div>
                <div class="container post-head">
                    <span class="post-category" data-i18n="lp.category">${esc((CATEGORY_NAMES[post.category] || {}).pl || '')}</span>
                    <h1 data-i18n="lp.title">${esc(pl.title)}</h1>
                    <p class="post-date"><time datetime="${esc(post.date)}" data-i18n="lp.dateLabel">${esc(meta.dateLabel)}</time></p>
                    <p class="post-excerpt" data-i18n="lp.excerpt">${esc(pl.excerpt)}</p>
                </div>
                <div class="container post-body" data-i18n="lp.body">
${markdown(pl.body)}
                </div>
                <div class="container post-back">
                    <a href="../index.html#blog" class="btn btn-outline" data-i18n="lp.backToBlog">${esc(UI.pl.backToBlog)}</a>
                </div>
            </article>

${relatedHtml}            <section class="lp-cta">
                <div class="container">
                    <h2 data-i18n="lp.ctaText">${esc(UI.pl.ctaText)}</h2>
                    <div class="lp-cta-buttons">
                        <a href="tel:${PHONE}" class="btn btn-primary btn-large" data-i18n="lp.ctaCall">${esc(UI.pl.ctaCall)}</a>
                        <a href="../index.html#contact" class="btn btn-outline btn-large" data-i18n="lp.ctaQuote">${esc(UI.pl.ctaQuote)}</a>
                    </div>
                </div>
            </section>
        </main>

${footerHtml()}
    </div>

    <div class="floating-cta">
        <a href="tel:${PHONE}" class="floating-cta-btn phone" title="Zadzwoń teraz">
            <span class="floating-cta-icon">📞</span><span data-i18n="cta.callNow">Zadzwoń teraz</span>
        </a>
        <a href="../index.html#contact" class="floating-cta-btn" title="Bezpłatna wycena">
            <span class="floating-cta-icon">📋</span><span data-i18n="cta.freeQuote">Bezpłatna wycena</span>
        </a>
    </div>

    <script src="../js/translations.js" defer></script>
    <script>window.LP_CONTENT = ${JSON.stringify(content)};</script>
    <script src="../js/main.js" defer></script>
    <script src="../js/offer-page.js" defer></script>
</body>
</html>
`;
}

// ------------------------------------------------ kafelki na stronie głównej
function renderHomeCards(posts) {
  if (!posts.length) {
    return `                            <p class="blog-empty" data-i18n="blog.empty">Wkrótce pojawią się tu pierwsze wpisy.</p>`;
  }
  return posts.map(p => {
    const pl = p.i18n.pl;
    const style = p.image
      ? `background-image:url('${esc(String(p.image).replace(/^\//, ''))}');background-size:cover;background-position:center;`
      : `background: ${esc(p.gradient || DEFAULT_GRADIENT)};`;
    const catKey = 'blog.cat' + (p.category ? p.category[0].toUpperCase() + p.category.slice(1) : '');
    return `                            <article class="blog-card" data-category="${esc(p.category)}">
                                <a class="blog-card-image" href="blog/${esc(p.slug)}.html" style="${style}" aria-label="${esc(pl.title)}"></a>
                                <div class="blog-card-content">
                                    <span class="blog-card-category" data-i18n="${catKey}">${esc((CATEGORY_NAMES[p.category] || {}).pl || '')}</span>
                                    <h4><a href="blog/${esc(p.slug)}.html" data-i18n="blogPosts.${esc(p.slug)}.title">${esc(pl.title)}</a></h4>
                                    <p data-i18n="blogPosts.${esc(p.slug)}.excerpt">${esc(pl.excerpt)}</p>
                                    <a href="blog/${esc(p.slug)}.html" class="blog-read-more" data-i18n="blog.readMore">Czytaj więcej</a>
                                </div>
                            </article>`;
  }).join('\n');
}

/* Wstrzykuje kafelki między znaczniki w index.html oraz tłumaczenia tytułów
   wpisów do js/translations.js pod kluczem blogPosts.<slug>. */
function injectHome(posts) {
  const indexPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const START = '<!-- BLOG:START -->';
  const END = '<!-- BLOG:END -->';
  const i = html.indexOf(START);
  const j = html.indexOf(END);
  if (i < 0 || j < 0) {
    console.warn('! Brak znaczników BLOG:START/BLOG:END w index.html — pomijam wstrzyknięcie kafelków.');
    return false;
  }
  html = html.slice(0, i + START.length) + '\n' + renderHomeCards(posts) + '\n                            ' + html.slice(j);
  fs.writeFileSync(indexPath, html, 'utf8');

  // tłumaczenia tytułów/zajawek kafelków
  const tPath = path.join(ROOT, 'js/translations.js');
  let ts = fs.readFileSync(tPath, 'utf8');
  const blob = {};
  for (const lang of LANGS) {
    blob[lang] = {};
    posts.forEach(p => {
      const c = p.i18n[lang] || p.i18n.pl;
      blob[lang][p.slug] = { title: c.title, excerpt: c.excerpt };
    });
  }
  const marker = '\n// BLOG_POSTS:AUTO — generowane przez tools/build-blog.js, nie edytuj ręcznie\n';
  const injected = marker + LANGS.map(l =>
    `if (typeof translations !== 'undefined' && translations.${l}) translations.${l}.blogPosts = ${JSON.stringify(blob[l])};`
  ).join('\n') + '\n';
  const mi = ts.indexOf('// BLOG_POSTS:AUTO');
  if (mi >= 0) ts = ts.slice(0, mi).replace(/\n+$/, '\n');
  fs.writeFileSync(tPath, ts.replace(/\n+$/, '\n') + injected, 'utf8');
  return true;
}

// ---------------------------------------------------------------- run
const all = loadPosts();
const published = all.filter(isPublished);
const drafts = all.length - published.length;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// usuń pliki wpisów, których już nie ma / są szkicami
const keep = new Set(published.map(p => p.slug + '.html'));
for (const f of fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.html'))) {
  if (!keep.has(f)) { fs.unlinkSync(path.join(OUT_DIR, f)); console.log('  usunięto nieaktualny: blog/' + f); }
}

for (const post of published) {
  const related = published.filter(r => r.category === post.category && r.slug !== post.slug).slice(0, 4);
  fs.writeFileSync(path.join(OUT_DIR, post.slug + '.html'), renderPost(post, related), 'utf8');
}

injectHome(published);

console.log(`✓ Blog: ${published.length} opublikowanych -> /blog/*.html` + (drafts ? `, ${drafts} szkiców pominięto` : ''));
published.forEach(p => console.log(`  ${p.date}  ${p.slug}`));

module.exports = { loadPosts, isPublished, SITE };
