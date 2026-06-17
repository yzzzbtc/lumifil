#!/usr/bin/env node
/* =====================================================================
   build-offer.js — generator landing page'ów LUMIFIL (katalog /oferta)
   Uruchom:  node tools/build-offer.js
   Czyta:    CATEGORIES + PAGES (poniżej; treść z dok. lumifil_landing_pages.pdf)
   Pisze:    oferta/<slug>.html   (jeden statyczny plik na produkt, 4 języki)
   Każda strona reużywa css/style.css + js/translations.js + js/main.js
   (header/nav/stopka/przełącznik języków = ten sam mechanizm co strona główna).
   ===================================================================== */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'oferta');
const SITE = 'https://yzzzbtc.github.io/lumifil';
const PHONE = '+48663715148';
const PHONE_HUMAN = '+48 663 715 148';

// Ikony SVG (spójne z kafelkami Oferty na stronie głównej)
const ICONS = {
  okna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>',
  drzwi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="2" width="14" height="20" rx="1"/><circle cx="15" cy="12" r="1.5"/></svg>',
  bramy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="4" width="20" height="16" rx="1"/><line x1="2" y1="8" x2="22" y2="8"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="16" x2="22" y2="16"/></svg>',
  roletyZ: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="6" width="18" height="14" rx="1"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/></svg>',
  roletyW: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="13" x2="21" y2="13"/></svg>',
  moskitiery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 3l18 18M21 3l-18 18"/></svg>',
  parapety: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="18" width="20" height="3" rx="0.5"/><rect x="2" y="14" width="16" height="3" rx="0.5"/></svg>',
  montaz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
};

// Kategorie -> nazwa (4 języki) dla okruszków i sekcji "Zobacz też"
const CATEGORIES = {
  okna:       { icon: ICONS.okna,       name: { pl: 'Okna', de: 'Fenster', en: 'Windows', fr: 'Fenêtres' } },
  drzwi:      { icon: ICONS.drzwi,      name: { pl: 'Drzwi i bramy', de: 'Türen und Tore', en: 'Doors & gates', fr: 'Portes et portails' } },
  rolety_zew: { icon: ICONS.roletyZ,    name: { pl: 'Rolety zewnętrzne', de: 'Außenrollläden', en: 'External blinds', fr: 'Volets extérieurs' } },
  oslony:     { icon: ICONS.roletyW,    name: { pl: 'Osłony wewnętrzne', de: 'Innenbeschattung', en: 'Internal blinds', fr: 'Stores intérieurs' } },
  moskitiery: { icon: ICONS.moskitiery, name: { pl: 'Moskitiery', de: 'Insektenschutz', en: 'Insect screens', fr: 'Moustiquaires' } },
  parapety:   { icon: ICONS.parapety,   name: { pl: 'Parapety', de: 'Fensterbänke', en: 'Window sills', fr: 'Appuis de fenêtre' } },
  montaz:     { icon: ICONS.montaz,     name: { pl: 'Montaż i obróbki', de: 'Montage', en: 'Installation', fr: 'Montage' } },
};

// Wspólne etykiety UI (4 języki) wstrzykiwane do każdej strony jako lp.*
const UI = {
  pl: { home: 'Strona główna', featuresHeading: 'Dlaczego warto wybrać to rozwiązanie?', brandsLabel: 'Producenci i systemy', faqHeading: 'Najczęściej zadawane pytania', relatedHeading: 'Zobacz też w tej kategorii', ctaCall: 'Zadzwoń: ' + PHONE_HUMAN, ctaQuote: 'Bezpłatna wycena' },
  de: { home: 'Startseite', featuresHeading: 'Warum diese Lösung wählen?', brandsLabel: 'Hersteller und Systeme', faqHeading: 'Häufig gestellte Fragen', relatedHeading: 'Mehr aus dieser Kategorie', ctaCall: 'Anrufen: ' + PHONE_HUMAN, ctaQuote: 'Kostenloses Angebot' },
  en: { home: 'Home', featuresHeading: 'Why choose this solution?', brandsLabel: 'Manufacturers and systems', faqHeading: 'Frequently asked questions', relatedHeading: 'See also in this category', ctaCall: 'Call: ' + PHONE_HUMAN, ctaQuote: 'Free quote' },
  fr: { home: 'Accueil', featuresHeading: 'Pourquoi choisir cette solution ?', brandsLabel: 'Fabricants et systèmes', faqHeading: 'Questions fréquentes', relatedHeading: 'À voir aussi dans cette catégorie', ctaCall: 'Appeler : ' + PHONE_HUMAN, ctaQuote: 'Devis gratuit' },
};

const LANGS = ['pl', 'de', 'en', 'fr'];

// ----------------------------------------------------------------------
// TREŚĆ STRON  (rozszerzana kolejno o pozostałe kategorie)
// ----------------------------------------------------------------------
const PAGES = require('./offer-content.js');

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(s) { return esc(s); }

function siblings(page) {
  return PAGES.filter(p => p.category === page.category && p.slug !== page.slug);
}

function buildLpContent(page) {
  const out = {};
  for (const lang of LANGS) {
    const c = page.i18n[lang];
    const ui = UI[lang];
    const lp = {
      home: ui.home,
      breadcrumbCat: CATEGORIES[page.category].name[lang],
      breadcrumb: c.breadcrumb,
      h1: c.h1,
      subtitle: c.subtitle,
      lead: c.lead,
      featuresHeading: ui.featuresHeading,
      brandsLabel: ui.brandsLabel,
      brands: c.brands,
      faqHeading: ui.faqHeading,
      relatedHeading: ui.relatedHeading,
      ctaText: c.ctaText,
      ctaCall: ui.ctaCall,
      ctaQuote: ui.ctaQuote,
      metaTitle: c.metaTitle,
      metaDesc: c.metaDesc,
    };
    c.features.forEach((f, i) => { lp['feature' + i] = f; });
    c.faq.forEach((qa, i) => { lp['faqQ' + i] = qa.q; lp['faqA' + i] = qa.a; });
    out[lang] = lp;
  }
  return out;
}

function navHtml() {
  return `                    <nav class="nav">
                        <a href="../index.html#about" class="nav-link" data-i18n="nav.about">O nas</a>
                        <a href="../index.html#offer" class="nav-link" data-i18n="nav.offer">Oferta</a>
                        <a href="../index.html#projects" class="nav-link" data-i18n="nav.projects">Realizacje</a>
                        <a href="../index.html#blog" class="nav-link" data-i18n="nav.blog">Blog</a>
                        <a href="../index.html#contact" class="nav-link" data-i18n="nav.contact">Kontakt</a>
                    </nav>`;
}

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

function floatingCtaHtml() {
  return `    <div class="floating-cta">
        <a href="tel:${PHONE}" class="floating-cta-btn phone" title="Zadzwoń teraz">
            <span class="floating-cta-icon">📞</span><span data-i18n="cta.callNow">Zadzwoń teraz</span>
        </a>
        <a href="../index.html#contact" class="floating-cta-btn" title="Bezpłatna wycena">
            <span class="floating-cta-icon">📋</span><span data-i18n="cta.freeQuote">Bezpłatna wycena</span>
        </a>
    </div>`;
}

function jsonLd(page) {
  const pl = page.i18n.pl;
  const url = `${SITE}/oferta/${page.slug}.html`;
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Strona główna', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Oferta', item: `${SITE}/#offer` },
      { '@type': 'ListItem', position: 3, name: pl.breadcrumb, item: url },
    ],
  };
  const faq = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: pl.faq.map(qa => ({ '@type': 'Question', name: qa.q, acceptedAnswer: { '@type': 'Answer', text: qa.a } })),
  };
  return `    <script type="application/ld+json">\n${JSON.stringify(breadcrumb)}\n    </script>\n    <script type="application/ld+json">\n${JSON.stringify(faq)}\n    </script>`;
}

function renderPage(page) {
  const pl = page.i18n.pl;
  const url = `${SITE}/oferta/${page.slug}.html`;
  const icon = CATEGORIES[page.category].icon;
  const lpContent = buildLpContent(page);

  const features = pl.features.map((f, i) =>
    `                    <li data-i18n="lp.feature${i}">${esc(f)}</li>`).join('\n');

  const faqItems = pl.faq.map((qa, i) =>
    `                    <div class="lp-faq-item">
                        <div class="lp-faq-q" onclick="toggleFaq(this.parentElement)" data-i18n="lp.faqQ${i}">${esc(qa.q)}</div>
                        <div class="lp-faq-a" data-i18n="lp.faqA${i}">${esc(qa.a)}</div>
                    </div>`).join('\n');

  const sibs = siblings(page);
  const related = sibs.length ? `        <section class="lp-section">
            <div class="container lp-related">
                <h2 data-i18n="lp.relatedHeading">${esc(UI.pl.relatedHeading)}</h2>
                <ul>
${sibs.map(s => `                    <li><a href="${s.slug}.html">${esc(s.i18n.pl.breadcrumb)}</a></li>`).join('\n')}
                </ul>
            </div>
        </section>\n` : '';

  return `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(pl.metaTitle)}</title>
    <meta name="description" content="${escAttr(pl.metaDesc)}">
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escAttr(pl.metaTitle)}">
    <meta property="og:description" content="${escAttr(pl.metaDesc)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${SITE}/images/hero/modern-house.jpg">
    <meta property="og:locale" content="pl_PL">
${jsonLd(page)}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Montserrat:wght@600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/offer.css">
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
${navHtml()}
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
                        <li><a href="../index.html#offer" data-i18n="nav.offer">Oferta</a></li>
                        <li data-i18n="lp.breadcrumb">${esc(pl.breadcrumb)}</li>
                    </ol>
                </div>
            </nav>

            <section class="lp-hero">
                <div class="container">
                    <div class="lp-hero-icon">${icon}</div>
                    <h1 data-i18n="lp.h1">${esc(pl.h1)}</h1>
                    <p class="lp-subtitle" data-i18n="lp.subtitle">${esc(pl.subtitle)}</p>
                </div>
            </section>

            <section class="lp-section">
                <div class="container">
                    <p class="lp-lead" data-i18n="lp.lead">${esc(pl.lead)}</p>
                </div>
            </section>

            <section class="lp-section">
                <div class="container">
                    <h2 data-i18n="lp.featuresHeading">${esc(UI.pl.featuresHeading)}</h2>
                    <ul class="lp-features">
${features}
                    </ul>
                    <div class="lp-brands" style="margin-top:28px">
                        <strong data-i18n="lp.brandsLabel">${esc(UI.pl.brandsLabel)}</strong>
                        <span data-i18n="lp.brands">${esc(pl.brands)}</span>
                    </div>
                </div>
            </section>

            <section class="lp-section">
                <div class="container">
                    <h2 data-i18n="lp.faqHeading">${esc(UI.pl.faqHeading)}</h2>
                    <div class="lp-faq-list">
${faqItems}
                    </div>
                </div>
            </section>

${related}            <section class="lp-cta">
                <div class="container">
                    <h2 data-i18n="lp.ctaText">${esc(pl.ctaText)}</h2>
                    <div class="lp-cta-buttons">
                        <a href="tel:${PHONE}" class="btn btn-primary btn-large" data-i18n="lp.ctaCall">${esc(UI.pl.ctaCall)}</a>
                        <a href="../index.html#contact" class="btn btn-outline btn-large" data-i18n="lp.ctaQuote">${esc(UI.pl.ctaQuote)}</a>
                    </div>
                </div>
            </section>
        </main>

${footerHtml()}
    </div>

${floatingCtaHtml()}

    <script src="../js/translations.js" defer></script>
    <script>window.LP_CONTENT = ${JSON.stringify(lpContent)};</script>
    <script src="../js/main.js" defer></script>
    <script src="../js/offer-page.js" defer></script>
</body>
</html>
`;
}

// ----------------------------------------------------------------------
// Run
// ----------------------------------------------------------------------
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

let count = 0;
for (const page of PAGES) {
  const html = renderPage(page);
  fs.writeFileSync(path.join(OUT_DIR, page.slug + '.html'), html, 'utf8');
  count++;
}

// Wypisz mapę slugów dla aktualizacji sitemap / linków w kafelkach
const byCat = {};
for (const p of PAGES) (byCat[p.category] ||= []).push(p.slug);

console.log(`✓ Wygenerowano ${count} landing page'ów w /oferta`);
console.log('Slugi wg kategorii:');
for (const cat of Object.keys(byCat)) console.log(`  ${cat}: ${byCat[cat].join(', ')}`);

module.exports = { PAGES, CATEGORIES };
