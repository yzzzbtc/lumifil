// offer-page.js — integruje treść landing page'a z systemem i18n strony głównej.
// Każda podstrona definiuje window.LP_CONTENT = { pl:{...}, de:{...}, en:{...}, fr:{...} }
// PRZED tym skryptem. Tutaj scalamy tę treść z globalnym obiektem `translations`
// (z translations.js), dzięki czemu data-i18n="lp.*" i przełącznik języka działają tak
// samo jak na stronie głównej. Skrypt ładowany z atrybutem defer PO main.js.

(function () {
    'use strict';

    // 1) Scal treść podstrony pod klucz `lp` w każdym języku.
    if (window.LP_CONTENT && typeof translations !== 'undefined') {
        Object.keys(window.LP_CONTENT).forEach(function (lang) {
            translations[lang] = translations[lang] || {};
            translations[lang].lp = window.LP_CONTENT[lang];
        });
    }

    // 2) Aktualizacja <title> i meta description przy zmianie języka (SEO + UX).
    function applyMeta(lang) {
        var d = (window.LP_CONTENT && window.LP_CONTENT[lang]) || null;
        if (!d) return;
        if (d.metaTitle) document.title = d.metaTitle;
        if (d.metaDesc) {
            var m = document.querySelector('meta[name="description"]');
            if (m) m.setAttribute('content', d.metaDesc);
        }
        document.documentElement.lang = lang;
    }

    if (typeof window.selectLanguage === 'function') {
        var original = window.selectLanguage;
        window.selectLanguage = function (lang) {
            original(lang);
            applyMeta(lang);
        };
    }

    // 3) Akordeon FAQ (wywoływany z onclick w wygenerowanym HTML).
    window.toggleFaq = function (item) {
        item.classList.toggle('open');
    };
})();
