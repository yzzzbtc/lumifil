// Admin Panel JavaScript
const ADMIN_PASSWORD = 'wejnereksiusiak123';

// Firebase references
let db = null;
let projectsRef = null;
let blogRef = null;

// State
let projects = [];
let blogPosts = [];

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (localStorage.getItem('lumifil_admin_logged') === 'true') {
        showAdminPanel();
    }

    initLogin();
    initNavigation();
    initForms();
});

// Login functionality
function initLogin() {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;

        if (password === ADMIN_PASSWORD) {
            localStorage.setItem('lumifil_admin_logged', 'true');
            showAdminPanel();
        } else {
            loginError.classList.remove('hidden');
            setTimeout(() => loginError.classList.add('hidden'), 3000);
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('lumifil_admin_logged');
        location.reload();
    });
}

function showAdminPanel() {
    loginScreen.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    initFirebase();
}

// Firebase initialization
function initFirebase() {
    const statusEl = document.getElementById('fb-status');

    if (!isFirebaseConfigured()) {
        statusEl.textContent = 'Nie skonfigurowano - uzupełnij firebase-config.js';
        statusEl.className = 'disconnected';
        return;
    }

    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        projectsRef = db.ref('projects');
        blogRef = db.ref('blog');

        statusEl.textContent = 'Połączono';
        statusEl.className = 'connected';

        // Load data
        loadProjects();
        loadBlog();
    } catch (error) {
        console.error('Firebase error:', error);
        statusEl.textContent = 'Błąd połączenia: ' + error.message;
        statusEl.className = 'disconnected';
    }
}

// Navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;

            // Update active nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show section
            document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(`section-${section}`).classList.add('active');
        });
    });
}

// Load Projects
function loadProjects() {
    if (!projectsRef) return;

    projectsRef.on('value', (snapshot) => {
        projects = [];
        const data = snapshot.val();

        if (data) {
            Object.keys(data).forEach(key => {
                projects.push({ id: key, ...data[key] });
            });
        }

        renderProjectsTable();
        updateStats();
    });
}

function renderProjectsTable() {
    const tbody = document.getElementById('projects-tbody');
    const categoryLabels = {
        windows: 'Okna',
        doors: 'Drzwi',
        shutters: 'Rolety'
    };

    if (projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#666;">Brak realizacji. Dodaj pierwszą!</td></tr>';
        return;
    }

    tbody.innerHTML = projects.map(project => `
        <tr>
            <td><span class="category-badge category-${project.category}">${categoryLabels[project.category] || project.category}</span></td>
            <td>${project.titles?.pl || '-'}</td>
            <td style="font-size:1.5rem;">${project.icon || '🏢'}</td>
            <td class="actions">
                <button class="btn btn-small btn-primary" onclick="editProject('${project.id}')">Edytuj</button>
                <button class="btn btn-small btn-danger" onclick="deleteProject('${project.id}')">Usuń</button>
            </td>
        </tr>
    `).join('');
}

// Load Blog
function loadBlog() {
    if (!blogRef) return;

    blogRef.on('value', (snapshot) => {
        blogPosts = [];
        const data = snapshot.val();

        if (data) {
            Object.keys(data).forEach(key => {
                blogPosts.push({ id: key, ...data[key] });
            });
        }

        renderBlogTable();
        updateStats();
    });
}

function renderBlogTable() {
    const tbody = document.getElementById('blog-tbody');
    const categoryLabels = {
        windows: 'Okna',
        doors: 'Drzwi',
        shutters: 'Rolety',
        tips: 'Porady',
        trends: 'Trendy'
    };

    if (blogPosts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#666;">Brak artykułów. Dodaj pierwszy!</td></tr>';
        return;
    }

    tbody.innerHTML = blogPosts.map(post => `
        <tr>
            <td><span class="category-badge category-${post.category}">${categoryLabels[post.category] || post.category}</span></td>
            <td>${post.titles?.pl || '-'}</td>
            <td class="actions">
                <button class="btn btn-small btn-primary" onclick="editBlogPost('${post.id}')">Edytuj</button>
                <button class="btn btn-small btn-danger" onclick="deleteBlogPost('${post.id}')">Usuń</button>
            </td>
        </tr>
    `).join('');
}

function updateStats() {
    document.getElementById('projects-count').textContent = projects.length;
    document.getElementById('blog-count').textContent = blogPosts.length;
}

// Forms initialization
function initForms() {
    // Project form
    const addProjectBtn = document.getElementById('add-project-btn');
    const projectFormWrapper = document.getElementById('project-form-wrapper');
    const closeProjectForm = document.getElementById('close-project-form');
    const cancelProject = document.getElementById('cancel-project');
    const projectForm = document.getElementById('project-form');

    addProjectBtn.addEventListener('click', () => {
        document.getElementById('project-form-title').textContent = 'Dodaj realizację';
        projectForm.reset();
        document.getElementById('project-id').value = '';
        projectFormWrapper.classList.remove('hidden');
    });

    closeProjectForm.addEventListener('click', () => projectFormWrapper.classList.add('hidden'));
    cancelProject.addEventListener('click', () => projectFormWrapper.classList.add('hidden'));

    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject();
    });

    // Blog form
    const addBlogBtn = document.getElementById('add-blog-btn');
    const blogFormWrapper = document.getElementById('blog-form-wrapper');
    const closeBlogForm = document.getElementById('close-blog-form');
    const cancelBlog = document.getElementById('cancel-blog');
    const blogForm = document.getElementById('blog-form');

    addBlogBtn.addEventListener('click', () => {
        document.getElementById('blog-form-title').textContent = 'Dodaj artykuł';
        blogForm.reset();
        document.getElementById('blog-id').value = '';
        blogFormWrapper.classList.remove('hidden');
    });

    closeBlogForm.addEventListener('click', () => blogFormWrapper.classList.add('hidden'));
    cancelBlog.addEventListener('click', () => blogFormWrapper.classList.add('hidden'));

    blogForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveBlogPost();
    });
}

// Project CRUD
function saveProject() {
    if (!projectsRef) {
        showToast('Firebase nie jest skonfigurowany!', 'error');
        return;
    }

    const id = document.getElementById('project-id').value;
    const projectData = {
        category: document.getElementById('project-category').value,
        icon: document.getElementById('project-icon').value || '🏢',
        tag: document.getElementById('project-tag').value,
        gradient: document.getElementById('project-gradient').value,
        titles: {
            pl: document.getElementById('project-title-pl').value,
            de: document.getElementById('project-title-de').value,
            en: document.getElementById('project-title-en').value,
            fr: document.getElementById('project-title-fr').value
        },
        descriptions: {
            pl: document.getElementById('project-desc-pl').value,
            de: document.getElementById('project-desc-de').value,
            en: document.getElementById('project-desc-en').value,
            fr: document.getElementById('project-desc-fr').value
        }
    };

    if (id) {
        // Update
        projectsRef.child(id).update(projectData)
            .then(() => {
                showToast('Realizacja zaktualizowana!', 'success');
                document.getElementById('project-form-wrapper').classList.add('hidden');
            })
            .catch(err => showToast('Błąd: ' + err.message, 'error'));
    } else {
        // Create
        projectsRef.push(projectData)
            .then(() => {
                showToast('Realizacja dodana!', 'success');
                document.getElementById('project-form-wrapper').classList.add('hidden');
            })
            .catch(err => showToast('Błąd: ' + err.message, 'error'));
    }
}

function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('project-form-title').textContent = 'Edytuj realizację';
    document.getElementById('project-id').value = id;
    document.getElementById('project-category').value = project.category || 'windows';
    document.getElementById('project-icon').value = project.icon || '🏢';
    document.getElementById('project-tag').value = project.tag || 'tagWindows';
    document.getElementById('project-gradient').value = project.gradient || '';

    document.getElementById('project-title-pl').value = project.titles?.pl || '';
    document.getElementById('project-title-de').value = project.titles?.de || '';
    document.getElementById('project-title-en').value = project.titles?.en || '';
    document.getElementById('project-title-fr').value = project.titles?.fr || '';

    document.getElementById('project-desc-pl').value = project.descriptions?.pl || '';
    document.getElementById('project-desc-de').value = project.descriptions?.de || '';
    document.getElementById('project-desc-en').value = project.descriptions?.en || '';
    document.getElementById('project-desc-fr').value = project.descriptions?.fr || '';

    document.getElementById('project-form-wrapper').classList.remove('hidden');
}

function deleteProject(id) {
    if (!confirm('Czy na pewno chcesz usunąć tę realizację?')) return;

    projectsRef.child(id).remove()
        .then(() => showToast('Realizacja usunięta!', 'success'))
        .catch(err => showToast('Błąd: ' + err.message, 'error'));
}

// Blog CRUD
function saveBlogPost() {
    if (!blogRef) {
        showToast('Firebase nie jest skonfigurowany!', 'error');
        return;
    }

    const id = document.getElementById('blog-id').value;
    const blogData = {
        category: document.getElementById('blog-category').value,
        gradient: document.getElementById('blog-gradient').value,
        titles: {
            pl: document.getElementById('blog-title-pl').value,
            de: document.getElementById('blog-title-de').value,
            en: document.getElementById('blog-title-en').value,
            fr: document.getElementById('blog-title-fr').value
        },
        excerpts: {
            pl: document.getElementById('blog-excerpt-pl').value,
            de: document.getElementById('blog-excerpt-de').value,
            en: document.getElementById('blog-excerpt-en').value,
            fr: document.getElementById('blog-excerpt-fr').value
        }
    };

    if (id) {
        // Update
        blogRef.child(id).update(blogData)
            .then(() => {
                showToast('Artykuł zaktualizowany!', 'success');
                document.getElementById('blog-form-wrapper').classList.add('hidden');
            })
            .catch(err => showToast('Błąd: ' + err.message, 'error'));
    } else {
        // Create
        blogRef.push(blogData)
            .then(() => {
                showToast('Artykuł dodany!', 'success');
                document.getElementById('blog-form-wrapper').classList.add('hidden');
            })
            .catch(err => showToast('Błąd: ' + err.message, 'error'));
    }
}

function editBlogPost(id) {
    const post = blogPosts.find(p => p.id === id);
    if (!post) return;

    document.getElementById('blog-form-title').textContent = 'Edytuj artykuł';
    document.getElementById('blog-id').value = id;
    document.getElementById('blog-category').value = post.category || 'windows';
    document.getElementById('blog-gradient').value = post.gradient || '';

    document.getElementById('blog-title-pl').value = post.titles?.pl || '';
    document.getElementById('blog-title-de').value = post.titles?.de || '';
    document.getElementById('blog-title-en').value = post.titles?.en || '';
    document.getElementById('blog-title-fr').value = post.titles?.fr || '';

    document.getElementById('blog-excerpt-pl').value = post.excerpts?.pl || '';
    document.getElementById('blog-excerpt-de').value = post.excerpts?.de || '';
    document.getElementById('blog-excerpt-en').value = post.excerpts?.en || '';
    document.getElementById('blog-excerpt-fr').value = post.excerpts?.fr || '';

    document.getElementById('blog-form-wrapper').classList.remove('hidden');
}

function deleteBlogPost(id) {
    if (!confirm('Czy na pewno chcesz usunąć ten artykuł?')) return;

    blogRef.child(id).remove()
        .then(() => showToast('Artykuł usunięty!', 'success'))
        .catch(err => showToast('Błąd: ' + err.message, 'error'));
}

// Migration - import existing data to Firebase
function migrateData() {
    if (!projectsRef || !blogRef) {
        showToast('Firebase nie jest skonfigurowany!', 'error');
        return;
    }

    const statusEl = document.getElementById('migrate-status');
    const btn = document.getElementById('migrate-btn');
    btn.disabled = true;
    statusEl.textContent = 'Importowanie danych...';

    // Existing projects data
    const projectsData = [
        {
            category: 'windows',
            icon: '🏢',
            tag: 'tagWindows',
            gradient: 'linear-gradient(135deg, #1a5f7a 0%, #2980b9 100%)',
            titles: {
                pl: 'Leysin American School',
                de: 'Leysin American School',
                en: 'Leysin American School',
                fr: 'Leysin American School'
            },
            descriptions: {
                pl: 'Przebudowa Grand Hotelu na budynek Leysin American School w Szwajcarii. Kompleksowa wymiana stolarki okiennej.',
                de: 'Umbau des Grand Hotels zum Gebäude der Leysin American School in der Schweiz. Kompletter Fensteraustausch.',
                en: 'Conversion of Grand Hotel into Leysin American School building in Switzerland. Complete window replacement.',
                fr: 'Transformation du Grand Hôtel en bâtiment de la Leysin American School en Suisse. Remplacement complet des fenêtres.'
            }
        },
        {
            category: 'doors',
            icon: '🏠',
            tag: 'tagDoors',
            gradient: 'linear-gradient(135deg, #2980b9 0%, #5dade2 100%)',
            titles: {
                pl: 'Osiedle w Sulnowie',
                de: 'Wohnsiedlung in Sulnowo',
                en: 'Housing Estate in Sulnowo',
                fr: 'Lotissement à Sulnowo'
            },
            descriptions: {
                pl: 'Montaż drzwi zewnętrznych na osiedlu budowanym przez dewelopera w Sulnowie.',
                de: 'Montage von Außentüren in einer vom Bauträger errichteten Wohnsiedlung in Sulnowo.',
                en: 'Installation of external doors in a housing estate built by a developer in Sulnowo.',
                fr: 'Installation de portes extérieures dans un lotissement construit par un promoteur à Sulnowo.'
            }
        },
        {
            category: 'shutters',
            icon: '🏨',
            tag: 'tagShutters',
            gradient: 'linear-gradient(135deg, #134b5f 0%, #1a5f7a 100%)',
            titles: {
                pl: 'Dom jednorodzinny w Świeciu',
                de: 'Einfamilienhaus in Świecie',
                en: 'Single-family house in Świecie',
                fr: 'Maison individuelle à Świecie'
            },
            descriptions: {
                pl: 'Wymiana rolet zewnętrznych w domu jednorodzinnym w Świeciu.',
                de: 'Austausch von Außenrollläden in einem Einfamilienhaus in Świecie.',
                en: 'Replacement of external blinds in a single-family house in Świecie.',
                fr: 'Remplacement des volets extérieurs dans une maison individuelle à Świecie.'
            }
        },
        {
            category: 'windows',
            icon: '🏫',
            tag: 'tagPVC',
            gradient: 'linear-gradient(135deg, #2980b9 0%, #3498db 100%)',
            titles: {
                pl: 'Sąd w Malborku',
                de: 'Gericht in Malbork',
                en: 'Courthouse in Malbork',
                fr: 'Tribunal de Malbork'
            },
            descriptions: {
                pl: 'Wymiana stolarki okiennej w budynku Sądu w Malborku.',
                de: 'Austausch der Fensterschreinerei im Gerichtsgebäude in Malbork.',
                en: 'Replacement of window joinery in the Courthouse in Malbork.',
                fr: 'Remplacement de la menuiserie des fenêtres dans le bâtiment du Tribunal de Malbork.'
            }
        },
        {
            category: 'windows',
            icon: '🏛️',
            tag: 'tagWood',
            gradient: 'linear-gradient(135deg, #1a5f7a 0%, #2980b9 100%)',
            titles: {
                pl: 'Kompleks apartamentów na Gibraltarze',
                de: 'Apartmentkomplex auf Gibraltar',
                en: 'Apartment Complex in Gibraltar',
                fr: 'Complexe d\'appartements à Gibraltar'
            },
            descriptions: {
                pl: 'Wymiana okien drewnianych w kompleksie apartamentów znajdujących się na słynnej skale na Gibraltarze.',
                de: 'Austausch von Holzfenstern im Apartmentkomplex auf dem berühmten Felsen von Gibraltar.',
                en: 'Replacement of wooden windows in an apartment complex located on the famous rock of Gibraltar.',
                fr: 'Remplacement des fenêtres en bois dans un complexe d\'appartements situé sur le célèbre rocher de Gibraltar.'
            }
        },
        {
            category: 'doors',
            icon: '🏬',
            tag: 'tagDoors',
            gradient: 'linear-gradient(135deg, #134b5f 0%, #1a5f7a 100%)',
            titles: {
                pl: 'Kamienica w Naumburgu',
                de: 'Stadthaus in Naumburg',
                en: 'Townhouse in Naumburg',
                fr: 'Immeuble à Naumburg'
            },
            descriptions: {
                pl: 'Wymiana drzwi zewnętrznych w zabytkowej kamienicy w Naumburgu, Niemcy.',
                de: 'Austausch der Außentüren in einem historischen Stadthaus in Naumburg, Deutschland.',
                en: 'Replacement of external doors in a historic townhouse in Naumburg, Germany.',
                fr: 'Remplacement des portes extérieures dans un immeuble historique à Naumburg, Allemagne.'
            }
        },
        {
            category: 'doors',
            icon: '🏥',
            tag: 'tagDoors',
            gradient: 'linear-gradient(135deg, #2980b9 0%, #5dade2 100%)',
            titles: {
                pl: 'Prosektorium w Świeciu',
                de: 'Leichenhalle in Świecie',
                en: 'Mortuary in Świecie',
                fr: 'Morgue à Świecie'
            },
            descriptions: {
                pl: 'Wymiana drzwi zewnętrznych na drzwi z szybą bezpieczną w starym budynku prosektorium w Świeciu.',
                de: 'Austausch der Außentüren gegen Türen mit Sicherheitsglas im alten Gebäude der Leichenhalle in Świecie.',
                en: 'Replacement of external doors with safety glass doors in the old mortuary building in Świecie.',
                fr: 'Remplacement des portes extérieures par des portes avec vitrage de sécurité dans l\'ancien bâtiment de la morgue à Świecie.'
            }
        }
    ];

    // Existing blog data
    const blogData = [
        {
            category: 'windows',
            gradient: 'linear-gradient(135deg, #1a5f7a 0%, #2980b9 100%)',
            titles: {
                pl: 'Jak wybrać okna energooszczędne?',
                de: 'Wie wählt man energiesparende Fenster?',
                en: 'How to choose energy-efficient windows?',
                fr: 'Comment choisir des fenêtres économes en énergie?'
            },
            excerpts: {
                pl: 'Poznaj kluczowe parametry okien, które wpływają na oszczędność energii w Twoim domu...',
                de: 'Lernen Sie die wichtigsten Fensterparameter kennen, die die Energieeinsparung beeinflussen...',
                en: 'Learn the key window parameters that affect energy savings...',
                fr: 'Découvrez les paramètres clés des fenêtres qui affectent les économies d\'énergie...'
            }
        },
        {
            category: 'tips',
            gradient: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)',
            titles: {
                pl: 'Konserwacja okien PCV - kompletny poradnik',
                de: 'PVC-Fensterpflege - vollständiger Leitfaden',
                en: 'PVC window maintenance - complete guide',
                fr: 'Entretien des fenêtres PVC - guide complet'
            },
            excerpts: {
                pl: 'Dowiedz się, jak prawidłowo dbać o okna PCV, aby służyły przez wiele lat...',
                de: 'Erfahren Sie, wie Sie PVC-Fenster richtig pflegen...',
                en: 'Learn how to properly care for PVC windows...',
                fr: 'Apprenez comment entretenir correctement les fenêtres PVC...'
            }
        },
        {
            category: 'doors',
            gradient: 'linear-gradient(135deg, #134b5f 0%, #1a5f7a 100%)',
            titles: {
                pl: 'Drzwi antywłamaniowe - co warto wiedzieć?',
                de: 'Einbruchsichere Türen - was Sie wissen sollten',
                en: 'Burglar-proof doors - what to know?',
                fr: 'Portes anti-effraction - ce qu\'il faut savoir'
            },
            excerpts: {
                pl: 'Przegląd klas antywłamaniowych i najważniejsze cechy bezpiecznych drzwi...',
                de: 'Überblick über Sicherheitsklassen und die wichtigsten Merkmale...',
                en: 'Overview of security classes and key features...',
                fr: 'Aperçu des classes de sécurité et des caractéristiques principales...'
            }
        },
        {
            category: 'shutters',
            gradient: 'linear-gradient(135deg, #2980b9 0%, #3498db 100%)',
            titles: {
                pl: 'Rolety zewnętrzne vs. wewnętrzne',
                de: 'Außenrollläden vs. Innenrollläden',
                en: 'External vs. internal blinds',
                fr: 'Volets extérieurs vs. intérieurs'
            },
            excerpts: {
                pl: 'Porównanie zalet i wad obu rozwiązań - które wybrać do swojego domu?',
                de: 'Vergleich der Vor- und Nachteile beider Lösungen...',
                en: 'Comparison of pros and cons of both solutions...',
                fr: 'Comparaison des avantages et inconvénients des deux solutions...'
            }
        },
        {
            category: 'trends',
            gradient: 'linear-gradient(135deg, #1a5f7a 0%, #2980b9 100%)',
            titles: {
                pl: 'Trendy w stolarce okiennej 2024',
                de: 'Fenstertrends 2024',
                en: 'Window trends 2024',
                fr: 'Tendances fenêtres 2024'
            },
            excerpts: {
                pl: 'Minimalistyczne ramy, duże przeszklenia i smart home - zobacz co jest modne...',
                de: 'Minimalistische Rahmen, große Verglasungen und Smart Home...',
                en: 'Minimalist frames, large glazings and smart home...',
                fr: 'Cadres minimalistes, grands vitrages et maison intelligente...'
            }
        },
        {
            category: 'windows',
            gradient: 'linear-gradient(135deg, #2980b9 0%, #5dade2 100%)',
            titles: {
                pl: 'Okna aluminiowe czy PCV?',
                de: 'Aluminium- oder PVC-Fenster?',
                en: 'Aluminium or PVC windows?',
                fr: 'Fenêtres aluminium ou PVC?'
            },
            excerpts: {
                pl: 'Szczegółowe porównanie obu materiałów - wady, zalety i zastosowania...',
                de: 'Detaillierter Vergleich beider Materialien...',
                en: 'Detailed comparison of both materials...',
                fr: 'Comparaison détaillée des deux matériaux...'
            }
        }
    ];

    // Import projects
    const projectPromises = projectsData.map(project => projectsRef.push(project));

    // Import blog
    const blogPromises = blogData.map(post => blogRef.push(post));

    Promise.all([...projectPromises, ...blogPromises])
        .then(() => {
            statusEl.textContent = `Zaimportowano ${projectsData.length} realizacji i ${blogData.length} artykułów!`;
            statusEl.style.color = '#27ae60';
            showToast('Dane zaimportowane pomyślnie!', 'success');
            btn.style.display = 'none';
        })
        .catch(err => {
            statusEl.textContent = 'Błąd: ' + err.message;
            statusEl.style.color = '#e74c3c';
            btn.disabled = false;
        });
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}
