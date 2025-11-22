// Main JavaScript for Filipex website

let currentLang = 'pl';

// Language Selection
function selectLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('filipex-lang', lang);

    // Update current language flag
    document.getElementById('current-lang-flag').textContent = flags[lang];

    // Apply translations
    applyTranslations(lang);

    // Hide language selector, show main site
    document.getElementById('language-selector').classList.add('hidden');
    document.getElementById('main-site').classList.remove('hidden');

    // Scroll to top
    window.scrollTo(0, 0);
}

function showLanguageSelector() {
    document.getElementById('main-site').classList.add('hidden');
    document.getElementById('language-selector').classList.remove('hidden');
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations(lang) {
    const elements = document.querySelectorAll('[data-i18n]');

    elements.forEach(el => {
        const key = el.getAttribute('data-i18n');
        const translation = getNestedTranslation(translations[lang], key);

        if (translation) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translation;
            } else if (el.tagName === 'OPTION') {
                el.textContent = translation;
            } else {
                el.innerHTML = translation;
            }
        }
    });
}

// Get nested translation value from object using dot notation
function getNestedTranslation(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

// Mobile Menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuBtn = document.querySelector('.mobile-menu-btn');

    mobileMenu.classList.toggle('active');
    menuBtn.classList.toggle('active');
}

function navigateTo(section) {
    // Close mobile menu
    document.getElementById('mobile-menu').classList.remove('active');
    document.querySelector('.mobile-menu-btn').classList.remove('active');

    // Scroll to section
    const target = document.getElementById(section);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
    }
}

// Show Section (for navigation)
function showSection(sectionId) {
    const target = document.getElementById(sectionId);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
    }
}

// Offer Cards Toggle
function toggleOfferDetails(card) {
    // Close other open cards
    document.querySelectorAll('.offer-card.active').forEach(c => {
        if (c !== card) {
            c.classList.remove('active');
        }
    });

    // Toggle current card
    card.classList.toggle('active');
}

// Project Filter
function initProjectFilter() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter projects
            const filter = btn.getAttribute('data-filter');

            projectCards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-category') === filter) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

// Contact Form Handler
function initContactForm() {
    const form = document.getElementById('contact-form');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Simple validation
        if (!data.name || !data.email || !data.message) {
            alert(currentLang === 'pl' ? 'Proszę wypełnić wszystkie wymagane pola.' :
                  currentLang === 'de' ? 'Bitte füllen Sie alle erforderlichen Felder aus.' :
                  currentLang === 'fr' ? 'Veuillez remplir tous les champs obligatoires.' :
                  'Please fill in all required fields.');
            return;
        }

        // Simulate form submission
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.textContent = currentLang === 'pl' ? 'Wysyłanie...' :
                          currentLang === 'de' ? 'Senden...' :
                          currentLang === 'fr' ? 'Envoi...' :
                          'Sending...';
        btn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            alert(currentLang === 'pl' ? 'Dziękujemy! Wiadomość została wysłana.' :
                  currentLang === 'de' ? 'Vielen Dank! Ihre Nachricht wurde gesendet.' :
                  currentLang === 'fr' ? 'Merci! Votre message a été envoyé.' :
                  'Thank you! Your message has been sent.');

            form.reset();
            btn.textContent = originalText;
            btn.disabled = false;
        }, 1500);
    });
}

// Header scroll effect
function initHeaderScroll() {
    const header = document.querySelector('.header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
}

// Active nav link based on scroll position
function initActiveNavLink() {
    const sections = document.querySelectorAll('.section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;

            if (window.scrollY >= sectionTop - 200) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

// Smooth scroll for anchor links
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Add transition styles for project cards
function initProjectCardStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .project-card {
            transition: opacity 0.3s ease, transform 0.3s ease;
        }
    `;
    document.head.appendChild(style);
}

// Blog Category Filter
function initBlogFilter() {
    const categoryLinks = document.querySelectorAll('.blog-cat-link');
    const blogCards = document.querySelectorAll('.blog-card');

    categoryLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Update active link
            categoryLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Filter blog posts
            const category = link.getAttribute('data-category');

            blogCards.forEach(card => {
                if (category === 'all' || card.getAttribute('data-category') === category) {
                    card.style.display = 'block';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        card.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved language preference
    const savedLang = localStorage.getItem('filipex-lang');

    if (savedLang) {
        // Auto-select saved language
        selectLanguage(savedLang);
    }

    // Initialize all features
    initProjectFilter();
    initBlogFilter();
    initContactForm();
    initHeaderScroll();
    initActiveNavLink();
    initSmoothScroll();
    initProjectCardStyles();
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const mobileMenu = document.getElementById('mobile-menu');
    const menuBtn = document.querySelector('.mobile-menu-btn');

    if (!mobileMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        mobileMenu.classList.remove('active');
        menuBtn.classList.remove('active');
    }
});
